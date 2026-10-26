import * as XLSX from 'xlsx'
import { validationError } from './errors'
import { validateXlsxArchive } from './xlsx-archive'

const MAX_IMPORT_ROWS = 1000

type RawImportRow = { rowNumber: number; data: unknown }

export function parseStudentWorkbook(bytes: Uint8Array): RawImportRow[] {
  validateXlsxArchive(bytes)
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(bytes, {
      type: 'array',
      cellDates: true,
      sheets: 0,
      sheetRows: MAX_IMPORT_ROWS + 2,
      cellHTML: false,
      cellText: false,
    })
  } catch {
    throw validationError('File Excel tidak dapat dibaca')
  }
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet) {
    throw validationError('File Excel tidak memiliki lembar kerja')
  }

  const range = XLSX.utils.decode_range(sheet['!fullref'] ?? sheet['!ref'] ?? 'A1')
  if (range.e.r > MAX_IMPORT_ROWS || range.e.c > 3) {
    throw validationError('Impor maksimal 1.000 siswa dan 4 kolom sesuai template')
  }
  for (const [address, cell] of Object.entries(sheet)) {
    if (!address.startsWith('!') && cell && typeof cell === 'object' && 'f' in cell) {
      throw validationError('Sel formula tidak diperbolehkan. Ganti dengan nilai teks atau angka.')
    }
  }
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: { s: { r: 0, c: 0 }, e: { r: range.e.r, c: 3 } },
    raw: true,
    defval: '',
  })

  const result: RawImportRow[] = []
  for (let index = 0; index < rawRows.length; index += 1) {
    const row = rawRows[index]
    if (!row) continue
    if (
      index === 0 &&
      String(row[0] ?? '')
        .trim()
        .toLowerCase() === 'nama'
    )
      continue
    if (row.every((cell) => String(cell ?? '').trim() === '')) continue
    result.push({
      rowNumber: index + 1,
      data: {
        fullName: String(row[0] ?? '').trim(),
        nis: normalizeNis(row[1]),
        sex: normalizeSex(row[2]),
        birthDate: normalizeBirthDate(row[3]),
      },
    })
  }
  if (result.length > MAX_IMPORT_ROWS) throw validationError('Impor maksimal 1.000 siswa')
  if (result.length === 0) throw validationError('File Excel tidak berisi data siswa')
  return result
}

function normalizeNis(value: unknown): string {
  if (typeof value === 'number') return String(Math.trunc(value))
  return String(value ?? '').trim()
}

function normalizeSex(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'l' || raw === 'laki-laki' || raw === 'laki laki' || raw === 'male') return 'L'
  if (raw === 'p' || raw === 'perempuan' || raw === 'female') return 'P'
  return String(value ?? '').trim()
}

function normalizeBirthDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0')
      const day = String(parsed.d).padStart(2, '0')
      return `${parsed.y}-${month}-${day}`
    }
  }
  const raw = String(value ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parts = raw.split(/[/.-]/)
  if (parts.length === 3) {
    const [day, month, year] = parts
    if (day && month && year && year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }
  return raw
}
