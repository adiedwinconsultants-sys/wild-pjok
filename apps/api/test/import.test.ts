import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { createTeacher, insertClass, insertStudent, json } from './helpers'

type ImportResponse = {
  data: {
    dryRun: boolean
    valid: Array<{ rowNumber: number }>
    duplicates: Array<{ rowNumber: number }>
    errors: Array<{ rowNumber: number; message: string }>
    inserted: number
  }
}

const BASE = 'http://example.com/v1'

function workbookFile(rows: Array<Array<string | number>>, name = 'siswa.xlsx'): File {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Nama', 'NIS', 'Jenis Kelamin', 'Tanggal Lahir'],
    ...rows,
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Siswa')
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([bytes], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

async function upload(
  token: string,
  classId: string,
  file: File,
  dryRun: boolean,
): Promise<Response> {
  const form = new FormData()
  form.append('file', file)
  return SELF.fetch(`${BASE}/classes/${classId}/students/import?dryRun=${dryRun}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
}

describe('impor siswa dari Excel', () => {
  it('memvalidasi, mendeteksi duplikat, dan menyimpan baris valid', async () => {
    const teacher = await createTeacher({ id: 'import-teacher', email: 'impor@test.local' })
    await insertClass(teacher.id, 'import-class', 'VII B')
    await insertStudent({
      id: 'import-existing',
      teacherId: teacher.id,
      classId: 'import-class',
      nis: '1111',
      fullName: 'Siswa Lama',
    })

    const file = workbookFile([
      ['Siswa Baru Satu', '2222', 'L', '2012-02-01'],
      ['Siswa Baru Dua', '3333', 'P', '2012-03-04'],
      ['Siswa Duplikat', '1111', 'L', '2012-04-05'],
      ['Siswa NIS Ganda', '2222', 'P', '2012-05-06'],
      ['Siswa Tanpa NIS', '', 'L', '2012-06-07'],
    ])

    const preview = await upload(teacher.token, 'import-class', file, true)
    expect(preview.status).toBe(200)
    const previewPayload = await json<ImportResponse>(preview)
    expect(previewPayload.data.dryRun).toBe(true)
    expect(previewPayload.data.valid).toHaveLength(2)
    expect(previewPayload.data.duplicates).toHaveLength(2)
    expect(previewPayload.data.errors).toHaveLength(1)
    expect(previewPayload.data.inserted).toBe(0)

    const commit = await upload(teacher.token, 'import-class', file, false)
    expect(commit.status).toBe(200)
    const commitPayload = await json<ImportResponse>(commit)
    expect(commitPayload.data.inserted).toBe(2)

    const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM students WHERE class_id = ?')
      .bind('import-class')
      .first<{ total: number }>()
    expect(count?.total).toBe(3)
  })

  it('menolak file bukan xlsx dan file lebih dari 2 MB', async () => {
    const teacher = await createTeacher({
      id: 'import-file-teacher',
      email: 'imporfile@test.local',
    })
    await insertClass(teacher.id, 'import-file-class', 'VIII C')

    const wrongExtension = await upload(
      teacher.token,
      'import-file-class',
      new File(['bukan excel'], 'siswa.csv', { type: 'text/csv' }),
      true,
    )
    expect(wrongExtension.status).toBe(422)

    const oversized = new Uint8Array(2 * 1024 * 1024 + 10)
    const tooBig = await upload(
      teacher.token,
      'import-file-class',
      new File([oversized], 'besar.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      true,
    )
    expect(tooBig.status).toBe(413)
  })

  it('menyediakan template impor', async () => {
    const teacher = await createTeacher({ id: 'template-teacher', email: 'template@test.local' })
    const response = await SELF.fetch(`${BASE}/students/import-template`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('spreadsheetml')
    const buffer = await response.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    expect(workbook.SheetNames).toContain('Siswa')
  })
})
