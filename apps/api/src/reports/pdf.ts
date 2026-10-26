import type { ReportData } from '@pjok/shared'
import { roundScore } from '@pjok/shared'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 42
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_Y = 24
const numberFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export async function buildPdf(report: ReportData): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.setTitle(`Rekap ${report.class.name} - ${report.instrument.name}`)
  document.setAuthor(report.teacher.name)
  document.setSubject('Laporan hasil asesmen PJOK')

  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const state = { page: document.addPage(), y: PAGE_HEIGHT - MARGIN }

  const startPage = () => {
    state.page = document.addPage()
    state.y = PAGE_HEIGHT - MARGIN
  }

  const ensureSpace = (needed: number) => {
    if (state.y - needed < MARGIN + 30) {
      startPage()
      drawPageHeader(state, regular, bold, report)
    }
  }

  const drawLine = (
    text: string,
    options: { size?: number; bold?: boolean; gap?: number } = {},
  ) => {
    const size = options.size ?? 10
    const font = options.bold ? bold : regular
    const lines = wrapText(sanitize(text), font, size, CONTENT_WIDTH)
    for (const line of lines) {
      ensureSpace(size + 4)
      state.page.drawText(line, {
        x: MARGIN,
        y: state.y,
        size,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
      state.y -= size + 3
    }
    state.y -= options.gap ?? 2
  }

  const drawKeyValue = (label: string, value: string) => {
    ensureSpace(14)
    state.page.drawText(sanitize(label), {
      x: MARGIN,
      y: state.y,
      size: 10,
      font: bold,
    })
    state.page.drawText(sanitize(value), {
      x: MARGIN + 95,
      y: state.y,
      size: 10,
      font: regular,
    })
    state.y -= 14
  }

  drawLine('LAPORAN HASIL ASESMEN PENDIDIKAN JASMANI', { size: 14, bold: true, gap: 8 })
  drawLine('Rekapitulasi Nilai Peserta Didik', { size: 11, bold: true, gap: 10 })
  drawKeyValue('Guru', report.teacher.name)
  drawKeyValue('NIP', report.teacher.nip ?? '-')
  drawKeyValue('Sekolah', report.teacher.school ?? '-')
  drawKeyValue('Kelas', `${report.class.name} (Tingkat ${report.class.gradeLevel})`)
  drawKeyValue('Tahun Ajaran', report.class.academicYear)
  drawKeyValue('Materi', report.instrument.name)
  drawKeyValue('Tanggal Asesmen', report.date)
  state.y -= 8

  report.students.forEach((student, index) => {
    ensureSpace(90)
    const scoresByIndicator = new Map(student.scores.map((score) => [score.indicatorId, score]))
    drawLine(`${index + 1}. ${student.fullName} (NIS ${student.nis} / ${student.sex})`, {
      size: 10,
      bold: true,
      gap: 2,
    })
    for (const indicator of report.indicators) {
      const score = scoresByIndicator.get(indicator.id)
      const raw = score?.rawValue ?? null
      const normalized = score?.normalizedValue ?? null
      const rawText = raw === null ? '-' : `${formatNumber(raw)} ${indicator.unit}`
      const normalizedText = normalized === null ? '-' : formatNumber(normalized)
      drawLine(`   ${indicator.name}: ${rawText} | nilai ${normalizedText}`, { size: 9, gap: 0 })
    }
    const process = student.processScore === null ? '-' : formatNumber(student.processScore)
    const product = student.productScore === null ? '-' : formatNumber(student.productScore)
    drawLine(
      `   Proses: ${process} | Produk: ${product} | Nilai Akhir: ${formatNumber(student.finalScore)} | Kategori: ${student.categoryLabel}`,
      { size: 9, bold: true, gap: 1 },
    )
    drawLine(`   Umpan balik: ${student.feedback ?? '-'}`, { size: 9, gap: 8 })
  })

  drawLine('Ringkasan Kelas', { size: 11, bold: true, gap: 3 })
  drawLine(
    `Rata-rata: ${formatNumber(report.summary.average)} | Terendah: ${formatNumber(report.summary.min)} | Tertinggi: ${formatNumber(report.summary.max)}`,
    { size: 9 },
  )
  drawLine(
    `Sangat Baik: ${report.summary.distribution.sangat_baik} | Baik: ${report.summary.distribution.baik} | Cukup: ${report.summary.distribution.cukup} | Perlu Bimbingan: ${report.summary.distribution.perlu_bimbingan}`,
    { size: 9, gap: 18 },
  )

  ensureSpace(70)
  state.page.drawText(sanitize('Guru Mata Pelajaran'), {
    x: PAGE_WIDTH - MARGIN - 170,
    y: state.y,
    size: 10,
    font: regular,
  })
  state.page.drawText(sanitize(report.teacher.name), {
    x: PAGE_WIDTH - MARGIN - 170,
    y: state.y - 48,
    size: 10,
    font: bold,
  })
  state.page.drawText(sanitize(`NIP ${report.teacher.nip ?? '-'}`), {
    x: PAGE_WIDTH - MARGIN - 170,
    y: state.y - 62,
    size: 9,
    font: regular,
  })

  const pages = document.getPages()
  pages.forEach((page, index) => {
    const label = `Halaman ${index + 1} dari ${pages.length}`
    page.drawText(label, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 8),
      y: FOOTER_Y,
      size: 8,
      font: regular,
      color: rgb(0.4, 0.4, 0.4),
    })
    page.drawText(sanitize(`Dibuat ${report.generatedAt.slice(0, 10)}`), {
      x: MARGIN,
      y: FOOTER_Y,
      size: 8,
      font: regular,
      color: rgb(0.4, 0.4, 0.4),
    })
  })

  return document.save()
}

function drawPageHeader(
  state: { page: ReturnType<PDFDocument['addPage']>; y: number },
  regular: Awaited<ReturnType<PDFDocument['embedFont']>>,
  bold: Awaited<ReturnType<PDFDocument['embedFont']>>,
  report: ReportData,
): void {
  state.page.drawText(sanitize(`Rekap ${report.class.name} - ${report.instrument.name}`), {
    x: MARGIN,
    y: state.y,
    size: 9,
    font: bold,
  })
  state.page.drawText(sanitize(`${report.date}`), {
    x: PAGE_WIDTH - MARGIN - 60,
    y: state.y,
    size: 9,
    font: regular,
  })
  state.y -= 16
  state.page.drawLine({
    start: { x: MARGIN, y: state.y },
    end: { x: PAGE_WIDTH - MARGIN, y: state.y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
  state.y -= 14
}

function formatNumber(value: number): string {
  return numberFormatter.format(roundScore(value))
}

function sanitize(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?')
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word
      continue
    }
    let segment = ''
    for (const char of word) {
      if (font.widthOfTextAtSize(segment + char, size) > maxWidth) {
        lines.push(segment)
        segment = char
      } else {
        segment += char
      }
    }
    current = segment
  }
  if (current) lines.push(current)
  return lines
}
