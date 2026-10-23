import { z } from 'zod'
import type {
  CategoryThreshold,
  Indicator,
  Instrument,
  NormTable,
  RubricBand,
  ScoringFormula,
} from '../types'

const EPSILON = 0.011

export const rubricBandSchema = z.object({
  min: z.number().finite(),
  max: z.number().finite(),
  points: z.number().min(0).max(100),
  label: z.string().min(1),
  description: z.string().min(1),
})

export const normPointSchema = z.object({
  raw: z.number().finite(),
  score: z.number().min(0).max(100),
})

export const normTableSchema = z.object({
  sex: z.enum(['L', 'P']),
  ageMin: z.number().int().min(5).max(30),
  ageMax: z.number().int().min(5).max(30),
  points: z.array(normPointSchema).min(2),
})

export const categoryThresholdSchema = z.object({
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  category: z.enum(['sangat_baik', 'baik', 'cukup', 'perlu_bimbingan']),
  label: z.string().min(1),
})

export const scoringFormulaSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('weighted_sum') }),
  z.object({
    type: z.literal('process_product'),
    processWeight: z.number().min(0).max(1),
    productWeight: z.number().min(0).max(1),
  }),
])

export const instrumentSourceSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  publisher: z.string().optional(),
  url: z.string().url().optional(),
  doi: z.string().optional(),
  note: z.string().optional(),
})

export const indicatorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  kind: z.enum(['process', 'product']),
  weight: z.number().min(0).max(1),
  higherIsBetter: z.boolean(),
  required: z.boolean(),
  normTable: z.array(normTableSchema).optional(),
  rubricBands: z.array(rubricBandSchema).optional(),
})

export const instrumentSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug harus kebab-case'),
  version: z.number().int().min(1),
  group: z.enum(['bola_besar', 'atletik', 'kebugaran_jasmani', 'tksi']),
  name: z.string().min(1),
  description: z.string().min(1),
  purpose: z.string().min(1),
  procedure: z.array(z.string().min(1)).min(1),
  indicators: z.array(indicatorSchema).min(1),
  categoryThresholds: z.array(categoryThresholdSchema).min(1),
  sources: z.array(instrumentSourceSchema).min(1),
  assessesProcess: z.boolean(),
  assessesProduct: z.boolean(),
  scoringFormula: scoringFormulaSchema,
})

export function validateRubricBands(bands: RubricBand[], indicatorId: string): string[] {
  const errors: string[] = []
  if (bands.length === 0) {
    return [`Rubrik ${indicatorId} kosong`]
  }
  const sorted = [...bands].sort((a, b) => a.min - b.min)
  const first = sorted[0]
  if (!first || first.min < 0) {
    errors.push(`Rubrik ${indicatorId} memiliki batas bawah negatif`)
  }
  for (let index = 0; index < sorted.length; index += 1) {
    const band = sorted[index]
    if (!band) continue
    if (band.max < band.min) {
      errors.push(`Rubrik ${indicatorId} band ${band.label} memiliki max < min`)
    }
    if (index > 0) {
      const previous = sorted[index - 1]
      if (!previous) continue
      if (band.min > previous.max + EPSILON) {
        errors.push(
          `Rubrik ${indicatorId} memiliki celah antara ${previous.label} dan ${band.label}`,
        )
      }
      if (band.min < previous.max - EPSILON) {
        errors.push(`Rubrik ${indicatorId} memiliki tumpang tindih antar band`)
      }
    }
  }
  return errors
}

export function validateNormTable(
  table: NormTable,
  indicator: Pick<Indicator, 'id' | 'higherIsBetter'>,
): string[] {
  const errors: string[] = []
  if (table.ageMin > table.ageMax) {
    errors.push(`Norma ${indicator.id} memiliki ageMin > ageMax`)
  }
  if (table.points.length < 2) {
    errors.push(`Norma ${indicator.id} membutuhkan minimal 2 titik`)
    return errors
  }
  const sorted = [...table.points].sort((a, b) => a.raw - b.raw)
  for (let index = 0; index < sorted.length; index += 1) {
    const point = sorted[index]
    if (!point) continue
    if (index > 0) {
      const previous = sorted[index - 1]
      if (!previous) continue
      if (point.raw === previous.raw) {
        errors.push(`Norma ${indicator.id} memiliki nilai mentah duplikat (${point.raw})`)
      }
      const rising = point.score > previous.score
      const falling = point.score < previous.score
      if (indicator.higherIsBetter && falling) {
        errors.push(`Norma ${indicator.id} harus naik seiring nilai mentah`)
      }
      if (!indicator.higherIsBetter && rising) {
        errors.push(`Norma ${indicator.id} harus turun seiring nilai mentah`)
      }
    }
  }
  return errors
}

export function validateCategoryThresholds(thresholds: CategoryThreshold[]): string[] {
  const errors: string[] = []
  if (thresholds.length === 0) return ['Ambang kategori kosong']
  const sorted = [...thresholds].sort((a, b) => a.minScore - b.minScore)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (!first || Math.abs(first.minScore - 0) > EPSILON) {
    errors.push('Ambang kategori harus dimulai dari 0')
  }
  if (!last || Math.abs(last.maxScore - 100) > EPSILON) {
    errors.push('Ambang kategori harus berakhir di 100')
  }
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]
    if (!current) continue
    if (current.minScore > current.maxScore) {
      errors.push(`Ambang ${current.category} memiliki min > max`)
    }
    if (index > 0) {
      const previous = sorted[index - 1]
      if (!previous) continue
      if (Math.abs(current.minScore - previous.maxScore) > EPSILON) {
        errors.push(`Ambang kategori memiliki celah/tumpang tindih di ${current.minScore}`)
      }
    }
  }
  const categories = new Set(thresholds.map((threshold) => threshold.category))
  if (categories.size !== thresholds.length) {
    errors.push('Kategori pada ambang tidak boleh duplikat')
  }
  return errors
}

export function validateInstrument(instrument: Instrument): string[] {
  const errors: string[] = []
  const parsed = instrumentSchema.safeParse(instrument)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${instrument.slug}: ${issue.path.join('.')} — ${issue.message}`)
    }
  }

  const ids = new Set<string>()
  for (const indicator of instrument.indicators) {
    if (ids.has(indicator.id)) {
      errors.push(`Indikator ${indicator.id} duplikat pada ${instrument.slug}`)
    }
    ids.add(indicator.id)
    if (indicator.normTable && indicator.normTable.length > 0) {
      for (const table of indicator.normTable) {
        errors.push(...validateNormTable(table, indicator))
      }
    } else if (indicator.rubricBands && indicator.rubricBands.length > 0) {
      errors.push(...validateRubricBands(indicator.rubricBands, indicator.id))
    } else {
      errors.push(`Indikator ${indicator.id} tidak memiliki norma atau rubrik`)
    }
  }

  const totalWeight = instrument.indicators.reduce((sum, indicator) => sum + indicator.weight, 0)
  if (Math.abs(totalWeight - 1) > 0.0001) {
    errors.push(`Bobot indikator ${instrument.slug} berjumlah ${totalWeight}, harus 1.0`)
  }

  errors.push(
    ...validateCategoryThresholds(instrument.categoryThresholds).map(
      (error) => `${instrument.slug}: ${error}`,
    ),
  )

  if (instrument.sources.length === 0) {
    errors.push(`Instrumen ${instrument.slug} tidak memiliki sumber`)
  }

  const hasProcess = instrument.indicators.some((indicator) => indicator.kind === 'process')
  const hasProduct = instrument.indicators.some((indicator) => indicator.kind === 'product')
  if (hasProcess !== instrument.assessesProcess) {
    errors.push(`Flag assessesProcess ${instrument.slug} tidak konsisten`)
  }
  if (hasProduct !== instrument.assessesProduct) {
    errors.push(`Flag assessesProduct ${instrument.slug} tidak konsisten`)
  }

  if (instrument.scoringFormula.type === 'process_product') {
    const formula: Extract<ScoringFormula, { type: 'process_product' }> = instrument.scoringFormula
    if (Math.abs(formula.processWeight + formula.productWeight - 1) > 0.0001) {
      errors.push(`Bobot proses+produk ${instrument.slug} harus 1.0`)
    }
    if (hasProcess && !hasProduct) {
      errors.push(`Formula process_product ${instrument.slug} butuh indikator produk`)
    }
  }

  return errors
}

export function validateCatalog(instruments: Instrument[]): string[] {
  const errors: string[] = []
  const slugs = new Set<string>()
  const ids = new Set<string>()
  for (const instrument of instruments) {
    if (slugs.has(instrument.slug)) {
      errors.push(`Slug instrumen duplikat: ${instrument.slug}`)
    }
    slugs.add(instrument.slug)
    if (ids.has(instrument.id)) {
      errors.push(`ID instrumen duplikat: ${instrument.id}`)
    }
    ids.add(instrument.id)
    errors.push(...validateInstrument(instrument))
  }
  return errors
}
