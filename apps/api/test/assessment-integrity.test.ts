import { env } from 'cloudflare:test'
import { INSTRUMENTS, computeAssessment } from '@pjok/shared'
import { describe, expect, it } from 'vitest'
import { api, createTeacher, insertClass, insertInstrument, insertStudent, json } from './helpers'

const instrument = INSTRUMENTS.find((item) => item.slug === 'tksi-kekuatan')

async function fixture() {
  if (!instrument) throw new Error('Instrumen tidak tersedia')
  const suffix = crypto.randomUUID()
  const teacher = await createTeacher({ id: `teacher-${suffix}`, email: `${suffix}@test.local` })
  const classId = `class-${suffix}`
  const studentId = `student-${suffix}`
  await insertClass(teacher.id, classId)
  await insertStudent({ id: studentId, teacherId: teacher.id, classId, nis: '1' })
  await insertInstrument(instrument, instrument.slug)
  const created = await api('/assessments', teacher.token, {
    method: 'POST',
    body: JSON.stringify({
      classId,
      instrumentId: instrument.id,
      date: '2026-10-01',
      participantIds: [studentId],
    }),
  })
  const { data } = await json<{ data: { id: string } }>(created)
  const save = (rawValue: number) =>
    api(`/assessments/${data.id}/scores`, teacher.token, {
      method: 'PUT',
      body: JSON.stringify({ scores: [{ studentId, indicatorId: 'situp-60s', rawValue }] }),
    })
  const finalize = () => api(`/assessments/${data.id}/finalize`, teacher.token, { method: 'POST' })
  expect((await save(30)).status).toBe(200)
  return { teacher, classId, studentId, assessmentId: data.id, save, finalize }
}

describe('konsistensi asesmen', () => {
  it('dua finalisasi serentak hanya mengubah status sekali', async () => {
    const item = await fixture()
    const responses = await Promise.all([item.finalize(), item.finalize()])
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM assessment_results WHERE assessment_id = ?',
    )
      .bind(item.assessmentId)
      .first<{ total: number }>()
    expect(count?.total).toBe(1)
  })

  it('simpan serentak dengan finalisasi menghasilkan nilai yang sesuai skor tersimpan', async () => {
    if (!instrument) throw new Error('Instrumen tidak tersedia')
    const item = await fixture()
    const [saved, finalized] = await Promise.all([item.save(55), item.finalize()])
    expect([200, 409]).toContain(saved.status)
    expect([200, 409]).toContain(finalized.status)
    if (finalized.status === 409) expect((await item.finalize()).status).toBe(200)
    const row = await env.DB.prepare(`SELECT s.raw_value AS raw, r.final_score AS score
      FROM assessment_scores s JOIN assessment_results r ON r.assessment_id = s.assessment_id AND r.student_id = s.student_id
      WHERE s.assessment_id = ?`)
      .bind(item.assessmentId)
      .first<{ raw: number; score: number }>()
    expect(row).toBeTruthy()
    const computed = computeAssessment(instrument, [
      { indicatorId: 'situp-60s', rawValue: row?.raw ?? 0, sex: 'L', age: 14 },
    ])
    expect(row?.score).toBe(computed.finalScore)
    expect((await item.save(10)).status).toBe(409)
  })

  it('database menolak perubahan nilai final dan reopen serentak hanya mencatat satu audit', async () => {
    const item = await fixture()
    expect((await item.finalize()).status).toBe(200)
    await expect(
      env.DB.prepare('UPDATE assessment_scores SET raw_value = 1 WHERE assessment_id = ?')
        .bind(item.assessmentId)
        .run(),
    ).rejects.toThrow('ASSESSMENT_FINALIZED')
    const reopen = () =>
      api(`/assessments/${item.assessmentId}/reopen`, item.teacher.token, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Pengukuran ulang' }),
      })
    const responses = await Promise.all([reopen(), reopen()])
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409])
    const audit = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM audit_logs WHERE entity_id = ?',
    )
      .bind(item.assessmentId)
      .first<{ total: number }>()
    expect(audit?.total).toBe(1)
    expect((await item.save(45)).status).toBe(200)
    expect(
      (await api(`/classes/${item.classId}`, item.teacher.token, { method: 'DELETE' })).status,
    ).toBe(409)
  })

  it('melindungi peserta draf dan tetap mengizinkan penghapusan kelas yang hanya berisi draf', async () => {
    const item = await fixture()
    expect(
      (await api(`/students/${item.studentId}`, item.teacher.token, { method: 'DELETE' })).status,
    ).toBe(409)
    expect(
      (await api(`/classes/${item.classId}`, item.teacher.token, { method: 'DELETE' })).status,
    ).toBe(204)
  })
})
