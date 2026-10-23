import type {
  CategoryThreshold,
  Indicator,
  InstrumentSource,
  NormPoint,
  NormTable,
  RubricBand,
  ScoreKind,
  Sex,
} from '../types'

export type NormSeed = {
  male: NormPoint[]
  female: NormPoint[]
}

type AgeBand = { min: number; max: number; factor: number }

export const AGE_BANDS: AgeBand[] = [
  { min: 7, max: 9, factor: 0.8 },
  { min: 10, max: 12, factor: 0.88 },
  { min: 13, max: 15, factor: 0.94 },
  { min: 16, max: 18, factor: 1 },
]

function roundRaw(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildNormTables(seed: NormSeed, higherIsBetter: boolean): NormTable[] {
  const tables: NormTable[] = []
  for (const band of AGE_BANDS) {
    for (const sex of ['L', 'P'] as const) {
      const points = seedPoints(seed, sex).map((point) => ({
        raw: roundRaw(higherIsBetter ? point.raw * band.factor : point.raw / band.factor),
        score: point.score,
      }))
      tables.push({ sex, ageMin: band.min, ageMax: band.max, points })
    }
  }
  return tables
}

function seedPoints(seed: NormSeed, sex: Sex): NormPoint[] {
  return sex === 'L' ? seed.male : seed.female
}

export const DEFAULT_THRESHOLDS: CategoryThreshold[] = [
  { minScore: 0, maxScore: 60, category: 'perlu_bimbingan', label: 'Perlu Bimbingan' },
  { minScore: 60, maxScore: 75, category: 'cukup', label: 'Cukup' },
  { minScore: 75, maxScore: 90, category: 'baik', label: 'Baik' },
  { minScore: 90, maxScore: 100, category: 'sangat_baik', label: 'Sangat Baik' },
]

export function processRubricBands(): RubricBand[] {
  return [
    {
      min: 0,
      max: 55,
      points: 50,
      label: 'Perlu Bimbingan',
      description: 'Teknik dasar belum dikuasai, banyak kesalahan dan tidak konsisten.',
    },
    {
      min: 55,
      max: 70,
      points: 65,
      label: 'Cukup',
      description: 'Teknik dasar dikuasai sebagian, masih ada kesalahan yang terlihat.',
    },
    {
      min: 70,
      max: 85,
      points: 80,
      label: 'Baik',
      description: 'Teknik dasar dikuasai dengan baik dan konsisten pada sebagian besar percobaan.',
    },
    {
      min: 85,
      max: 100,
      points: 95,
      label: 'Sangat Baik',
      description:
        'Teknik dikuasai sangat baik, efisien, konsisten, dan dapat diterapkan dalam permainan.',
    },
  ]
}

export function productIndicator(
  id: string,
  name: string,
  description: string,
  unit: string,
  higherIsBetter: boolean,
  seed: NormSeed,
  weight = 1,
): Indicator {
  return {
    id,
    name,
    description,
    unit,
    kind: 'product',
    weight,
    higherIsBetter,
    required: true,
    normTable: buildNormTables(seed, higherIsBetter),
  }
}

export function processIndicator(
  id: string,
  name: string,
  description: string,
  weight: number,
  kind: ScoreKind = 'process',
): Indicator {
  return {
    id,
    name,
    description,
    unit: 'skor',
    kind,
    weight,
    higherIsBetter: true,
    required: true,
    rubricBands: processRubricBands(),
  }
}

export const SOURCES = {
  tksi: {
    title: 'Tes Kebugaran Siswa Indonesia (TKSI)',
    author: 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
    year: 2021,
    publisher: 'Kemendikbudristek',
    url: 'https://tksi.kemdikbud.go.id',
    note: 'Instrumen dan norma disesuaikan untuk kelompok usia sekolah di Indonesia.',
  },
  penilaianPjok: {
    title: 'Panduan Penilaian oleh Pendidik dan Satuan Pendidikan untuk SMP',
    author: 'Direktorat Jenderal Pendidikan Dasar dan Menengah',
    year: 2017,
    publisher: 'Kementerian Pendidikan dan Kebudayaan',
    url: 'https://repositori.kemdikbud.go.id',
    note: 'Rubrik proses dan kriteria ketuntasan ranah psikomotor.',
  },
  atletik: {
    title: "World Athletics Kids' Athletics — Teaching Manual",
    author: 'World Athletics',
    year: 2019,
    publisher: 'World Athletics',
    url: 'https://worldathletics.org',
    note: 'Prinsip teknik dasar dan penilaian nomor atletik anak.',
  },
  kebugaran: {
    title: 'Buku Pedoman Tes Kebugaran Jasmani',
    author: 'Direktorat Jenderal Pendidikan Jasmani',
    year: 2020,
    publisher: 'Kementerian Pendidikan dan Kebudayaan',
    url: 'https://repositori.kemdikbud.go.id',
    note: 'Komponen kebugaran jasmani dan tabel norma hasil adaptasi.',
  },
  kebugaranIlmiah: {
    title: 'ACSM Guidelines for Exercise Testing and Prescription (10th ed.)',
    author: 'American College of Sports Medicine',
    year: 2018,
    publisher: 'Wolters Kluwer',
    url: 'https://www.acsm.org',
    note: 'Landasan komponen kebugaran jasmani terkait kesehatan.',
  },
} satisfies Record<string, InstrumentSource>
