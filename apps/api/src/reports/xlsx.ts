import type { ReportData } from '@pjok/shared'
import * as XLSX from 'xlsx'

export function buildXlsx(report: ReportData): Uint8Array {
  const workbook = XLSX.utils.book_new()

  const identity: Array<Array<string | number>> = [
    ['REKAP PENILAIAN PJOK'],
    ['Guru', report.teacher.name],
    ['NIP', report.teacher.nip ?? '-'],
    ['Sekolah', report.teacher.school ?? '-'],
    ['Kelas', `${report.class.name} (Tingkat ${report.class.gradeLevel})`],
    ['Tahun Ajaran', report.class.academicYear],
    ['Materi', report.instrument.name],
    ['Tanggal', report.date],
    [],
    [
      'No',
      'Nama',
      'NIS',
      'L/P',
      'Nilai Proses',
      'Nilai Produk',
      'Nilai Akhir',
      'Kategori',
      'Umpan Balik',
    ],
  ]

  const rekapRows = [...identity]
  report.students.forEach((student, index) => {
    rekapRows.push([
      index + 1,
      student.fullName,
      student.nis,
      student.sex,
      student.processScore ?? '-',
      student.productScore ?? '-',
      student.finalScore,
      student.categoryLabel,
      student.feedback ?? '',
    ])
  })
  rekapRows.push([])
  rekapRows.push(['Rata-rata', '', '', '', '', '', report.summary.average, '', ''])
  rekapRows.push(['Nilai Terendah', '', '', '', '', '', report.summary.min, '', ''])
  rekapRows.push(['Nilai Tertinggi', '', '', '', '', '', report.summary.max, '', ''])

  const rekap = XLSX.utils.aoa_to_sheet(rekapRows)
  rekap['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 16 },
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 45 },
  ]
  rekap['!autofilter'] = { ref: `A10:I${10 + report.students.length}` }
  applyNumberFormat(rekap, identity.length, report.students.length)
  XLSX.utils.book_append_sheet(workbook, rekap, 'Rekap')

  const detailHeader = [
    'No',
    'Nama',
    'NIS',
    ...report.indicators.map((indicator) => `${indicator.name} (${indicator.unit})`),
    'Nilai Akhir',
    'Kategori',
  ]
  const detailRows: Array<Array<string | number>> = [
    [`DETAIL INDIKATOR - ${report.instrument.name}`],
    [`Kelas ${report.class.name} - ${report.date}`],
    [],
    detailHeader,
  ]
  report.students.forEach((student, index) => {
    const scoreByIndicator = new Map(
      student.scores.map((score) => [score.indicatorId, score.normalizedValue]),
    )
    detailRows.push([
      index + 1,
      student.fullName,
      student.nis,
      ...report.indicators.map((indicator) => scoreByIndicator.get(indicator.id) ?? '-'),
      student.finalScore,
      student.categoryLabel,
    ])
  })
  const detail = XLSX.utils.aoa_to_sheet(detailRows)
  detail['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 16 },
    ...report.indicators.map(() => ({ wch: 20 })),
    { wch: 12 },
    { wch: 18 },
  ]
  applyNumberFormat(detail, 4, report.students.length, 3, detailHeader.length)
  XLSX.utils.book_append_sheet(workbook, detail, 'Detail Indikator')

  const feedbackRows: Array<Array<string | number>> = [
    ['UMPAN BALIK SISWA'],
    [`Kelas ${report.class.name} - ${report.instrument.name} - ${report.date}`],
    [],
    ['No', 'Nama', 'NIS', 'Kategori', 'Umpan Balik'],
  ]
  report.students.forEach((student, index) => {
    feedbackRows.push([
      index + 1,
      student.fullName,
      student.nis,
      student.categoryLabel,
      student.feedback ?? '',
    ])
  })
  const feedback = XLSX.utils.aoa_to_sheet(feedbackRows)
  feedback['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(workbook, feedback, 'Umpan Balik')

  const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(output as ArrayBuffer)
}

function applyNumberFormat(
  sheet: XLSX.WorkSheet,
  headerRow: number,
  rowCount: number,
  startColumn = 4,
  endColumn = 8,
): void {
  for (let row = headerRow + 1; row <= headerRow + rowCount; row += 1) {
    for (let column = startColumn; column < endColumn; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row - 1, c: column })
      const cell = sheet[address]
      if (cell && cell.t === 'n') {
        cell.z = '0.00'
      }
    }
  }
}
