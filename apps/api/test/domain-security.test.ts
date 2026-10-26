import { SELF, env } from 'cloudflare:test'
import { INSTRUMENTS } from '@pjok/shared'
import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../src/middleware/error-handler'
import type { AppBindings } from '../src/types'
import { api, createTeacher, insertClass, insertInstrument, insertStudent, json } from './helpers'

describe('otorisasi resource dan PII', () => {
  it('menolak baca dan mutasi kelas, siswa, impor, rekap, dan asesmen guru lain', async () => {
    const owner = await createTeacher({ id: 'owner', email: 'owner@test.local' })
    const stranger = await createTeacher({ id: 'stranger', email: 'stranger@test.local' })
    await insertClass(owner.id, 'private-class')
    await insertStudent({
      id: 'private-student',
      teacherId: owner.id,
      classId: 'private-class',
      nis: '123',
    })
    const instrument = INSTRUMENTS[0]
    if (!instrument) throw new Error('Katalog kosong')
    await insertInstrument(instrument, instrument.slug)
    const created = await api('/assessments', owner.token, {
      method: 'POST',
      body: JSON.stringify({
        classId: 'private-class',
        instrumentId: instrument.id,
        date: '2026-10-26',
        participantIds: ['private-student'],
      }),
    })
    expect(created.status).toBe(200)
    const assessment = await json<{ data: { id: string } }>(created)
    const paths: Array<[string, string, unknown?]> = [
      ['/classes/private-class', 'GET'],
      ['/classes/private-class', 'PATCH', { name: 'Changed' }],
      ['/classes/private-class', 'DELETE'],
      ['/classes/private-class/students', 'GET'],
      ['/classes/private-class/recap', 'GET'],
      ['/students/private-student', 'DELETE'],
      ['/students/private-student', 'PATCH', { fullName: 'Changed' }],
      ['/classes/private-class/students/import', 'POST'],
      [`/assessments/${assessment.data.id}`, 'GET'],
      [`/assessments/${assessment.data.id}/results`, 'GET'],
      [`/assessments/${assessment.data.id}/scores`, 'PUT', { scores: [] }],
      [`/assessments/${assessment.data.id}/finalize`, 'POST'],
      [`/assessments/${assessment.data.id}/reopen`, 'POST', { reason: 'Test' }],
    ]
    for (const [path, method, body] of paths) {
      const response = await api(path, stranger.token, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      expect(response.status, path).toBe(403)
      expect(await response.text()).not.toContain('Siswa Uji')
    }
  })

  it('admin menambahkan siswa dengan kepemilikan guru kelas dan snapshot asing ditolak', async () => {
    const owner = await createTeacher({ id: 'class-owner', email: 'class-owner@test.local' })
    const admin = await createTeacher({
      id: 'domain-admin',
      email: 'domain-admin@test.local',
      role: 'admin',
    })
    await insertClass(owner.id, 'admin-class')
    const response = await api('/classes/admin-class/students', admin.token, {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Siswa Uji',
        nis: '123',
        sex: 'L',
        birthDate: '2012-01-31',
      }),
    })
    expect(response.status).toBe(200)
    const student = await json<{ data: { id: string; teacherId: string } }>(response)
    expect(student.data.teacherId).toBe(owner.id)
    expect(
      (
        await api(`/students/${student.data.id}`, owner.token, {
          method: 'PATCH',
          body: JSON.stringify({ sex: 'P' }),
        })
      ).status,
    ).toBe(200)
    await insertClass(admin.id, 'foreign-class')
    await insertStudent({
      id: 'foreign-student',
      teacherId: admin.id,
      classId: 'foreign-class',
      nis: '456',
    })
    const instrument = INSTRUMENTS[0]
    if (!instrument) throw new Error('Katalog kosong')
    await insertInstrument(instrument, instrument.slug)
    const created = await json<{ data: { id: string } }>(
      await api('/assessments', owner.token, {
        method: 'POST',
        body: JSON.stringify({
          classId: 'admin-class',
          instrumentId: instrument.id,
          date: '2026-10-26',
          participantIds: [student.data.id],
        }),
      }),
    )
    await env.DB.prepare('UPDATE assessments SET participant_ids_json = ? WHERE id = ?')
      .bind(JSON.stringify(['foreign-student']), created.data.id)
      .run()
    const invalid = await api(`/assessments/${created.data.id}`, owner.token)
    expect(invalid.status).toBe(409)
    expect(await invalid.text()).not.toContain('Siswa Uji')
  })

  it('error internal tidak menulis detail query atau PII ke log', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const probe = new Hono<AppBindings>()
      probe.onError(errorHandler)
      probe.get('/probe/:id', () => {
        throw new Error('PII_SENTINEL: query parameters and student name')
      })
      const response = await probe.request('/probe/PII_SENTINEL')
      expect(response.status).toBe(500)
      expect(JSON.stringify(logger.mock.calls)).not.toContain('PII_SENTINEL')
      expect(await response.text()).not.toContain('PII_SENTINEL')
    } finally {
      logger.mockRestore()
    }
  })

  it('request id ditentukan server dan respons pribadi tidak boleh di-cache', async () => {
    const teacher = await createTeacher({ id: 'cache-private', email: 'cache-private@test.local' })
    const response = await SELF.fetch('http://example.com/v1/auth/me', {
      headers: { Authorization: `Bearer ${teacher.token}`, 'x-request-id': 'PII_SENTINEL' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).not.toBe('PII_SENTINEL')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
