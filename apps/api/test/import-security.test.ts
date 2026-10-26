import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { validateXlsxArchive } from '../src/lib/xlsx-archive'
import { createTeacher, insertClass } from './helpers'

function workbook(sheet: XLSX.WorkSheet): Uint8Array {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Siswa')
  return new Uint8Array(
    XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer,
  )
}

async function upload(bytes: Uint8Array) {
  const teacher = await createTeacher({ id: 'secure-import', email: 'secure-import@test.local' })
  await insertClass(teacher.id, 'secure-import-class')
  const form = new FormData()
  form.append('file', new File([bytes], 'siswa.xlsx'))
  return SELF.fetch('http://example.com/v1/classes/secure-import-class/students/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacher.token}` },
    body: form,
  })
}

describe('batas resource impor XLSX', () => {
  it('menerima arsip terkompresi valid dan menolak teks yang diberi nama xlsx', async () => {
    const valid = workbook(
      XLSX.utils.aoa_to_sheet([
        ['Nama', 'NIS', 'Jenis Kelamin', 'Tanggal Lahir'],
        ['Siswa Uji', '00123', 'L', '2012-01-31'],
      ]),
    )
    expect(() => validateXlsxArchive(valid)).not.toThrow()
    expect((await upload(new TextEncoder().encode('Nama,NIS\nSiswa,123'))).status).toBe(422)
  })

  it('menolak zip bomb sebelum parsing termasuk ukuran dekompresi yang dipalsukan', () => {
    const bomb = workbook(
      XLSX.utils.aoa_to_sheet(Array.from({ length: 300 }, () => ['x'.repeat(32767)])),
    )
    expect(bomb.length).toBeLessThan(2 * 1024 * 1024)
    expect(() => validateXlsxArchive(bomb)).toThrow('maksimal 8 MB')
    const view = new DataView(bomb.buffer)
    for (let i = 0; i + 46 < bomb.length; i += 1) {
      if (view.getUint32(i, true) !== 0x02014b50) continue
      const length = view.getUint16(i + 28, true)
      const name = new TextDecoder().decode(bomb.subarray(i + 46, i + 46 + length))
      if (name === 'xl/worksheets/sheet1.xml') {
        view.setUint32(i + 24, 1, true)
        const local = view.getUint32(i + 42, true)
        view.setUint32(local + 22, 1, true)
        break
      }
    }
    expect(() => validateXlsxArchive(bomb)).toThrow('Arsip XLSX rusak')
  })

  it('menolak dimensi lembar berlebihan tanpa mengiterasi seluruh rentang', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([['Nama', 'NIS', 'Jenis Kelamin', 'Tanggal Lahir']])
    sheet.A1002 = { t: 's', v: 'Siswa Uji' }
    sheet['!ref'] = 'A1:D1002'
    expect((await upload(workbook(sheet))).status).toBe(422)
  })

  it('menolak formula dan tidak mengembalikan nilainya pada pesan error', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Nama', 'NIS', 'Jenis Kelamin', 'Tanggal Lahir'],
      ['Siswa Uji', '00123', 'L', '2012-01-31'],
    ])
    sheet.A2 = { t: 's', f: 'CONCAT("PII_SENTINEL")', v: 'PII_SENTINEL' }
    const response = await upload(workbook(sheet))
    expect(response.status).toBe(422)
    expect(await response.text()).not.toContain('PII_SENTINEL')
  })

  it('menolak field terlalu panjang', async () => {
    const response = await upload(
      workbook(
        XLSX.utils.aoa_to_sheet([
          ['Nama', 'NIS', 'Jenis Kelamin', 'Tanggal Lahir'],
          ['x'.repeat(121), '1', 'L', '2012-01-31'],
        ]),
      ),
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { data: { valid: unknown[]; errors: unknown[] } }
    expect(payload.data.valid).toHaveLength(0)
    expect(payload.data.errors).toHaveLength(1)
  })
})
