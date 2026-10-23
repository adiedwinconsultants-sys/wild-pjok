import type { Instrument } from '../types'
import { atletikInstruments } from './atletik'
import { bolaBesarInstruments } from './bola-besar'
import { kebugaranInstruments } from './kebugaran'
import { tksiInstruments } from './tksi'

export const INSTRUMENTS: Instrument[] = [
  ...tksiInstruments,
  ...bolaBesarInstruments,
  ...atletikInstruments,
  ...kebugaranInstruments,
]

const bySlug = new Map(INSTRUMENTS.map((instrument) => [instrument.slug, instrument]))
const byId = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]))

export function findInstrument(identifier: string): Instrument | undefined {
  return bySlug.get(identifier) ?? byId.get(identifier)
}

export function getInstrument(identifier: string): Instrument {
  const instrument = findInstrument(identifier)
  if (!instrument) {
    throw new Error(`Instrumen ${identifier} tidak ditemukan`)
  }
  return instrument
}

export {
  categoryThresholdSchema,
  indicatorSchema,
  instrumentSchema,
  instrumentSourceSchema,
  normTableSchema,
  rubricBandSchema,
  scoringFormulaSchema,
  validateCatalog,
  validateCategoryThresholds,
  validateInstrument,
  validateNormTable,
  validateRubricBands,
} from './validators'
