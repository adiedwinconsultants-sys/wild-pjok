import type { ReportData, ScoreCategory } from '@pjok/shared'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildPdf } from '../src/reports/pdf'
import { reportFileName } from '../src/reports/report-data'
import { buildXlsx } from '../src/reports/xlsx'

function makeReport(studentCount: number): ReportData {
  const categories: ScoreCategory[] = ['sangat_baik', 'baik', 'cukup', 'perlu_bimbingan']
  const students = Array.from({ length: studentCount }, (_, index) => {
    const category = categories[index % categories.length] ?? 'baik'
    return {
      id: `student-${index + 1}`,
      fullName: `Siswa Demo ${index + 1}`,
      nis: `2026${String(index + 1).padStart(3, '0')}`,
      sex: index % 2 === 0 ? ('L' as const) : ('P' as const),
      scores: [{ indicatorId: 'ind-1', rawValue: 30 + index, normalizedValue: 70 + (index % 20) }],
      processScore: null,
      productScore: 70 + (index % 20),
      finalScore: 70 + (index % 20),
      category,
      categoryLabel: category,
      feedback: index % 2 === 0 ? 'Tingkatkan latihan secara rutin.' : null,
    }
  })

  return {
    teacher: { name: 'Budi Santoso', nip: '198001012005011001', school: 'SMP Negeri 1 Demo' },
    class: { name: 'VII A', gradeLevel: 7, academicYear: '2025/2026' },
    instrument: {
      slug: 'tksi-kekuatan',
      name: 'TKSI - Kekuatan',
      group: 'tksi',
      version: 1,
    },
    date: '2026-10-01',
    generatedAt: '2026-10-01T08:00:00.000Z',
    indicators: [
      {
        id: 'ind-1',
        name: 'Sit-up 60 Detik',
        unit: 'repetisi',
        kind: 'product',
        weight: 1,
      },
    ],
    students,
    summary: {
      average: 79,
      min: 70,
      max: 89,
      distribution: { sangat_baik: 1, baik: 1, cukup: 1, perlu_bimbingan: 1 },
    },
  }
}

describe('laporan', () => {
  it('menghasilkan XLSX yang dapat dibaca ulang dengan N baris siswa', () => {
    const report = makeReport(30)
    const bytes = buildXlsx(report)
    const workbook = XLSX.read(bytes, { type: 'array' })
    expect(workbook.SheetNames).toEqual(['Rekap', 'Detail Indikator', 'Umpan Balik'])
    const sheet = workbook.Sheets.Rekap
    expect(sheet).toBeTruthy()
    if (!sheet) throw new Error('sheet Rekap kosong')
    const rows = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, {
      header: 1,
      range: 9,
    })
    const studentRows = rows.slice(1).filter((row) => typeof row[0] === 'number')
    expect(studentRows).toHaveLength(30)
  })

  it('menghasilkan PDF valid dengan lebih dari satu halaman', async () => {
    const report = makeReport(30)
    const bytes = await buildPdf(report)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    const document = await PDFDocument.load(bytes)
    expect(document.getPageCount()).toBeGreaterThan(1)
  })

  it('memberi nama berkas sesuai format', () => {
    const report = makeReport(1)
    expect(reportFileName(report, 'xlsx')).toBe('rekap-vii-a-tksi-kekuatan-2026-10-01.xlsx')
    expect(reportFileName(report, 'pdf')).toBe('rekap-vii-a-tksi-kekuatan-2026-10-01.pdf')
  })
})
