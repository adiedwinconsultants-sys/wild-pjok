import { SELF, env } from 'cloudflare:test'
import { INSTRUMENTS } from '@pjok/shared'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { api, createTeacher, insertClass, insertInstrument, insertStudent, json } from './helpers'

type CreatedAssessment = { data: { id: string } }
type Results = {
  data: {
    results: Array<{
      studentId: string
      finalScore: number
      category: string
      feedback: string | null
    }>
  }
}

const slug = 'tksi-kekuatan'
const instrument = INSTRUMENTS.find((item) => item.slug === slug)
if (!instrument) throw new Error('instrumen uji tidak ada')

describe('asesmen', () => {
  it('menghitung nilai di server, menolak finalisasi tidak lengkap, dan mencatat reopen', async () => {
    const teacher = await createTeacher({ id: 'assessment-teacher', email: 'asesmen@test.local' })
    await insertClass(teacher.id, 'assessment-class', 'VII A')
    await insertStudent({
      id: 'assessment-student',
      teacherId: teacher.id,
      classId: 'assessment-class',
      nis: '7001',
      sex: 'L',
      birthDate: '2012-01-31',
    })
    await insertInstrument(instrument, slug)

    const create = await api('/assessments', teacher.token, {
      method: 'POST',
      body: JSON.stringify({
        classId: 'assessment-class',
        instrumentId: slug,
        date: '2026-10-01',
        participantIds: ['assessment-student'],
      }),
    })
    expect(create.status).toBe(200)
    const created = await json<CreatedAssessment>(create)
    const assessmentId = created.data.id

    const draftExport = await api('/exports', teacher.token, {
      method: 'POST',
      body: JSON.stringify({ assessmentId, format: 'pdf' }),
    })
    expect(draftExport.status).toBe(409)

    const score = await api(`/assessments/${assessmentId}/scores`, teacher.token, {
      method: 'PUT',
      body: JSON.stringify({
        scores: [{ studentId: 'assessment-student', indicatorId: 'situp-60s', rawValue: 55 }],
        finalScore: 1,
        category: 'perlu_bimbingan',
      }),
    })
    expect(score.status).toBe(200)

    const finalize = await api(`/assessments/${assessmentId}/finalize`, teacher.token, {
      method: 'POST',
    })
    expect(finalize.status).toBe(200)
    const finalized = await json<Results>(finalize)
    expect(finalized.data.results).toHaveLength(1)
    expect(finalized.data.results[0]?.finalScore).toBe(100)
    expect(finalized.data.results[0]?.category).toBe('sangat_baik')

    const editAfterFinal = await api(`/assessments/${assessmentId}/scores`, teacher.token, {
      method: 'PUT',
      body: JSON.stringify({
        scores: [{ studentId: 'assessment-student', indicatorId: 'situp-60s', rawValue: 10 }],
      }),
    })
    expect(editAfterFinal.status).toBe(409)

    const reopen = await api(`/assessments/${assessmentId}/reopen`, teacher.token, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Koreksi hasil pengukuran ulang' }),
    })
    expect(reopen.status).toBe(200)

    const editAfterReopen = await api(`/assessments/${assessmentId}/scores`, teacher.token, {
      method: 'PUT',
      body: JSON.stringify({
        scores: [{ studentId: 'assessment-student', indicatorId: 'situp-60s', rawValue: 45 }],
      }),
    })
    expect(editAfterReopen.status).toBe(200)

    const audit = await env.DB.prepare(
      'SELECT action, payload_json FROM audit_logs WHERE entity_id = ?',
    )
      .bind(assessmentId)
      .first<{ action: string; payload_json: string }>()
    expect(audit?.action).toBe('assessment.reopen')
    expect(audit?.payload_json).toContain('Koreksi')
  })

  it('menolak finalisasi dengan indikator kosong', async () => {
    const teacher = await createTeacher({ id: 'incomplete-teacher', email: 'lengkap@test.local' })
    await insertClass(teacher.id, 'incomplete-class', 'VIII A')
    await insertStudent({
      id: 'incomplete-student',
      teacherId: teacher.id,
      classId: 'incomplete-class',
      nis: '8001',
    })
    await insertInstrument(instrument, slug)

    const create = await api('/assessments', teacher.token, {
      method: 'POST',
      body: JSON.stringify({
        classId: 'incomplete-class',
        instrumentId: slug,
        date: '2026-10-02',
        participantIds: ['incomplete-student'],
      }),
    })
    const created = await json<CreatedAssessment>(create)
    const response = await api(`/assessments/${created.data.id}/finalize`, teacher.token, {
      method: 'POST',
    })
    expect(response.status).toBe(422)
    const payload = await json<{
      error: { code: string; details: { students: Array<{ missing: string[] }> } }
    }>(response)
    expect(payload.error.code).toBe('INCOMPLETE_SCORES')
    expect(payload.error.details.students[0]?.missing).toContain('situp-60s')
  })

  it('menerapkan pagination, filter, dan otorisasi kepemilikan', async () => {
    const owner = await createTeacher({ id: 'owner-teacher', email: 'owner@test.local' })
    const other = await createTeacher({ id: 'other-teacher', email: 'other@test.local' })
    await insertClass(owner.id, 'owned-class', 'IX A')
    await insertClass(other.id, 'other-class', 'IX B')
    await insertStudent({
      id: 'owned-student',
      teacherId: owner.id,
      classId: 'owned-class',
      nis: '9001',
    })
    await insertStudent({
      id: 'foreign-student',
      teacherId: other.id,
      classId: 'other-class',
      nis: '9002',
      fullName: 'Siswa Rahasia Lintas Guru',
    })
    await insertInstrument(instrument, slug)

    const ids: string[] = []
    for (let index = 0; index < 3; index += 1) {
      const create = await api('/assessments', owner.token, {
        method: 'POST',
        body: JSON.stringify({
          classId: 'owned-class',
          instrumentId: slug,
          date: `2026-09-0${index + 1}`,
          participantIds: ['owned-student'],
        }),
      })
      const created = await json<CreatedAssessment>(create)
      ids.push(created.data.id)
    }

    const list = await api('/assessments?perPage=2&page=1', owner.token)
    const payload = await json<{
      data: Array<{ id: string }>
      meta: { total: number; totalPages: number }
    }>(list)
    expect(payload.data).toHaveLength(2)
    expect(payload.meta.total).toBe(3)
    expect(payload.meta.totalPages).toBe(2)

    const filtered = await api('/assessments?from=2026-09-02&to=2026-09-03', owner.token)
    const filteredPayload = await json<{ meta: { total: number } }>(filtered)
    expect(filteredPayload.meta.total).toBe(2)

    const searched = await api('/assessments?q=kekuatan&perPage=1', owner.token)
    const searchedPayload = await json<{ data: unknown[]; meta: { total: number } }>(searched)
    expect(searchedPayload.data).toHaveLength(1)
    expect(searchedPayload.meta.total).toBe(3)

    const emptySearch = await api('/assessments?q=tidak-ada', owner.token)
    const emptyPayload = await json<{ data: unknown[]; meta: { total: number } }>(emptySearch)
    expect(emptyPayload.data).toHaveLength(0)
    expect(emptyPayload.meta.total).toBe(0)

    const forbiddenClass = await api('/classes/owned-class', other.token)
    expect(forbiddenClass.status).toBe(403)

    const forbiddenAssessment = await api(`/assessments/${ids[0]}`, other.token)
    expect(forbiddenAssessment.status).toBe(403)

    const scores = await api(`/assessments/${ids[0]}/scores`, owner.token, {
      method: 'PUT',
      body: JSON.stringify({
        scores: [{ studentId: 'owned-student', indicatorId: 'situp-60s', rawValue: 55 }],
      }),
    })
    expect(scores.status).toBe(200)
    const finalized = await api(`/assessments/${ids[0]}/finalize`, owner.token, {
      method: 'POST',
    })
    expect(finalized.status).toBe(200)
    await env.DB.prepare('UPDATE assessments SET participant_ids_json = ? WHERE id = ?')
      .bind(JSON.stringify(['owned-student', 'foreign-student']), ids[0])
      .run()

    const exportResponse = await SELF.fetch('http://example.com/v1/exports', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${owner.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assessmentId: ids[0], format: 'xlsx' }),
    })
    expect(exportResponse.status).toBe(200)
    const exportPayload = await json<{ data: { id: string } }>(exportResponse)

    const ownerDownload = await api(`/exports/${exportPayload.data.id}/download`, owner.token)
    expect(ownerDownload.status).toBe(200)
    expect(ownerDownload.headers.get('Cache-Control')).toBe('private, no-store')
    expect(ownerDownload.headers.get('X-Content-Type-Options')).toBe('nosniff')
    const workbook = XLSX.read(new Uint8Array(await ownerDownload.arrayBuffer()), { type: 'array' })
    const reportSheet = workbook.Sheets.Rekap
    expect(reportSheet).toBeTruthy()
    if (!reportSheet) throw new Error('sheet Rekap kosong')
    const reportRows = XLSX.utils.sheet_to_json<Array<string | number>>(reportSheet, { header: 1 })
    expect(JSON.stringify(reportRows)).not.toContain('Siswa Rahasia Lintas Guru')

    const otherGet = await api(`/exports/${exportPayload.data.id}`, other.token)
    expect(otherGet.status).toBe(403)
    const otherDownload = await api(`/exports/${exportPayload.data.id}/download`, other.token)
    expect(otherDownload.status).toBe(403)

    for (let index = 0; index < 4; index += 1) {
      const repeatedExport = await api('/exports', owner.token, {
        method: 'POST',
        body: JSON.stringify({ assessmentId: ids[0], format: 'xlsx' }),
      })
      expect(repeatedExport.status).toBe(200)
    }
    const rateLimitedExport = await api('/exports', owner.token, {
      method: 'POST',
      body: JSON.stringify({ assessmentId: ids[0], format: 'xlsx' }),
    })
    expect(rateLimitedExport.status).toBe(429)
  })

  it('menyimpan umpan balik hanya setelah final', async () => {
    const teacher = await createTeacher({ id: 'feedback-teacher', email: 'feedback@test.local' })
    await insertClass(teacher.id, 'feedback-class', 'X A')
    await insertStudent({
      id: 'feedback-student',
      teacherId: teacher.id,
      classId: 'feedback-class',
      nis: '10001',
    })
    await insertInstrument(instrument, slug)
    const create = await api('/assessments', teacher.token, {
      method: 'POST',
      body: JSON.stringify({
        classId: 'feedback-class',
        instrumentId: slug,
        date: '2026-10-03',
        participantIds: ['feedback-student'],
      }),
    })
    const created = await json<CreatedAssessment>(create)

    await api(`/assessments/${created.data.id}/scores`, teacher.token, {
      method: 'PUT',
      body: JSON.stringify({
        scores: [{ studentId: 'feedback-student', indicatorId: 'situp-60s', rawValue: 35 }],
      }),
    })
    const finalize = await api(`/assessments/${created.data.id}/finalize`, teacher.token, {
      method: 'POST',
    })
    const finalized = await json<Results>(finalize)
    const resultRows = await env.DB.prepare(
      'SELECT id FROM assessment_results WHERE assessment_id = ?',
    )
      .bind(created.data.id)
      .all<{ id: string }>()
    const resultId = resultRows.results[0]?.id
    expect(resultId).toBeTruthy()
    if (!resultId) throw new Error('result id kosong')

    const feedback = await api(`/results/${resultId}/feedback`, teacher.token, {
      method: 'PUT',
      body: JSON.stringify({ note: 'Tingkatkan daya tahan otot perut.' }),
    })
    expect(feedback.status).toBe(200)

    const results = await api(`/assessments/${created.data.id}/results`, teacher.token)
    const payload = await json<Results>(results)
    expect(payload.data.results[0]?.feedback).toBe('Tingkatkan daya tahan otot perut.')
    expect(finalized.data.results[0]?.finalScore).toBeGreaterThan(0)
  })
})
