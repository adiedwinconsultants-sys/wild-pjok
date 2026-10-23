import type { Instrument } from '../types'
import { DEFAULT_THRESHOLDS, SOURCES, productIndicator } from './builders'
import type { NormSeed } from './builders'

function atletikInstrument(config: {
  id: string
  name: string
  description: string
  purpose: string
  procedure: string[]
  indicatorId: string
  indicatorName: string
  indicatorDescription: string
  unit: string
  higherIsBetter: boolean
  seed: NormSeed
}): Instrument {
  return {
    id: config.id,
    slug: config.id,
    version: 1,
    group: 'atletik',
    name: config.name,
    description: config.description,
    purpose: config.purpose,
    procedure: [
      'Siapkan lintasan/lapangan, alat ukur, dan alat pencatat waktu.',
      'Lakukan pemanasan menyeluruh sebelum pelaksanaan tes.',
      'Jelaskan teknik dan aturan nomor atletik yang diuji.',
      ...config.procedure,
      'Catat hasil terbaik dari percobaan yang sah.',
    ],
    indicators: [
      productIndicator(
        config.indicatorId,
        config.indicatorName,
        config.indicatorDescription,
        config.unit,
        config.higherIsBetter,
        config.seed,
      ),
    ],
    categoryThresholds: DEFAULT_THRESHOLDS,
    sources: [SOURCES.atletik, SOURCES.penilaianPjok],
    assessesProcess: false,
    assessesProduct: true,
    scoringFormula: { type: 'weighted_sum' },
  }
}

export const atletikInstruments: Instrument[] = [
  atletikInstrument({
    id: 'atletik-lari',
    name: 'Atletik — Lari 60 m',
    description: 'Mengukur kecepatan lari sprint 60 meter.',
    purpose: 'Menilai kemampuan lari cepat peserta didik pada nomor lari jarak pendek.',
    procedure: [
      'Peserta melakukan start jongkok di belakang garis start.',
      'Waktu dicatat dari aba-aba sampai peserta melewati garis finis 60 meter.',
      'Berikan dua kesempatan dan ambil waktu terbaik.',
    ],
    indicatorId: 'lari-60m',
    indicatorName: 'Waktu Lari 60 m',
    indicatorDescription: 'Waktu tempuh lari 60 meter dalam detik; semakin kecil semakin baik.',
    unit: 'detik',
    higherIsBetter: false,
    seed: {
      male: [
        { raw: 7.5, score: 100 },
        { raw: 8.2, score: 85 },
        { raw: 8.9, score: 70 },
        { raw: 10, score: 50 },
        { raw: 12, score: 25 },
      ],
      female: [
        { raw: 8.5, score: 100 },
        { raw: 9.2, score: 85 },
        { raw: 9.9, score: 70 },
        { raw: 11, score: 50 },
        { raw: 13, score: 25 },
      ],
    },
  }),
  atletikInstrument({
    id: 'atletik-lompat-jauh',
    name: 'Atletik — Lompat Jauh',
    description: 'Mengukur jarak lompat jauh awalan berjalan/berlari.',
    purpose: 'Menilai kemampuan lompat jauh peserta didik secara terukur.',
    procedure: [
      'Peserta melakukan awalan, tolakan dengan satu kaki, dan mendarat dengan dua kaki.',
      'Ukur jarak dari titik pendaratan terdekat ke garis tolakan.',
      'Lompatan dinyatakan sah bila tidak menyentuh garis tolakan.',
    ],
    indicatorId: 'jarak-lompat-jauh',
    indicatorName: 'Jarak Lompat Jauh',
    indicatorDescription: 'Jarak lompatan dalam sentimeter; semakin jauh semakin baik.',
    unit: 'sentimeter',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 240, score: 25 },
        { raw: 320, score: 50 },
        { raw: 400, score: 70 },
        { raw: 450, score: 85 },
        { raw: 500, score: 100 },
      ],
      female: [
        { raw: 200, score: 25 },
        { raw: 270, score: 50 },
        { raw: 340, score: 70 },
        { raw: 380, score: 85 },
        { raw: 420, score: 100 },
      ],
    },
  }),
  atletikInstrument({
    id: 'atletik-lompat-tinggi',
    name: 'Atletik — Lompat Tinggi',
    description: 'Mengukur tinggi lompatan dengan gaya gunting atau straddle.',
    purpose: 'Menilai kemampuan lompat tinggi peserta didik secara terukur.',
    procedure: [
      'Peserta melakukan awalan dan tolakan satu kaki melewati mistar.',
      'Tinggi mistar dinaikkan bertahap setelah lompatan sah.',
      'Catat tinggi tertinggi yang berhasil dilewati.',
    ],
    indicatorId: 'tinggi-lompatan',
    indicatorName: 'Tinggi Lompatan',
    indicatorDescription: 'Tinggi mistar tertinggi yang dilewati dalam sentimeter.',
    unit: 'sentimeter',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 90, score: 25 },
        { raw: 110, score: 50 },
        { raw: 130, score: 70 },
        { raw: 145, score: 85 },
        { raw: 160, score: 100 },
      ],
      female: [
        { raw: 80, score: 25 },
        { raw: 98, score: 50 },
        { raw: 116, score: 70 },
        { raw: 128, score: 85 },
        { raw: 140, score: 100 },
      ],
    },
  }),
  atletikInstrument({
    id: 'atletik-tolak-peluru',
    name: 'Atletik — Tolak Peluru',
    description: 'Mengukur jarak tolakan peluru dengan teknik dasar.',
    purpose: 'Menilai kemampuan tolak peluru peserta didik secara terukur.',
    procedure: [
      'Peserta memegang peluru sesuai aturan dan melakukan tolakan dari lingkaran.',
      'Ukur jarak dari lingkaran ke bekas jatuh peluru.',
      'Tolakan dinyatakan sah bila peserta tidak keluar lingkaran sebelum peluru mendarat.',
    ],
    indicatorId: 'jarak-tolak-peluru',
    indicatorName: 'Jarak Tolak Peluru',
    indicatorDescription: 'Jarak tolakan peluru dalam meter; semakin jauh semakin baik.',
    unit: 'meter',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 5, score: 25 },
        { raw: 6.5, score: 50 },
        { raw: 8, score: 70 },
        { raw: 9, score: 85 },
        { raw: 10, score: 100 },
      ],
      female: [
        { raw: 4, score: 25 },
        { raw: 5.2, score: 50 },
        { raw: 6.4, score: 70 },
        { raw: 7.2, score: 85 },
        { raw: 8, score: 100 },
      ],
    },
  }),
  atletikInstrument({
    id: 'atletik-lempar-lembing',
    name: 'Atletik — Lempar Lembing',
    description: 'Mengukur jarak lemparan lembing dengan teknik dasar.',
    purpose: 'Menilai kemampuan lempar lembing peserta didik secara terukur.',
    procedure: [
      'Peserta melakukan awalan dan melempar lembing dari area yang ditentukan.',
      'Ukur jarak dari garis lempar ke titik jatuh lembing.',
      'Lemparan dinyatakan sah bila ujung lembing menancap lebih dulu.',
    ],
    indicatorId: 'jarak-lempar-lembing',
    indicatorName: 'Jarak Lempar Lembing',
    indicatorDescription: 'Jarak lemparan lembing dalam meter; semakin jauh semakin baik.',
    unit: 'meter',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 15, score: 25 },
        { raw: 22, score: 50 },
        { raw: 30, score: 70 },
        { raw: 35, score: 85 },
        { raw: 40, score: 100 },
      ],
      female: [
        { raw: 10, score: 25 },
        { raw: 15, score: 50 },
        { raw: 20, score: 70 },
        { raw: 24, score: 85 },
        { raw: 28, score: 100 },
      ],
    },
  }),
  atletikInstrument({
    id: 'atletik-lempar-cakram',
    name: 'Atletik — Lempar Cakram',
    description: 'Mengukur jarak lemparan cakram dengan teknik dasar.',
    purpose: 'Menilai kemampuan lempar cakram peserta didik secara terukur.',
    procedure: [
      'Peserta melakukan awalan putaran dan melempar cakram dari lingkaran.',
      'Ukur jarak dari lingkaran ke titik jatuh cakram.',
      'Lemparan dinyatakan sah bila peserta tidak keluar lingkaran sebelum cakram mendarat.',
    ],
    indicatorId: 'jarak-lempar-cakram',
    indicatorName: 'Jarak Lempar Cakram',
    indicatorDescription: 'Jarak lemparan cakram dalam meter; semakin jauh semakin baik.',
    unit: 'meter',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 12, score: 25 },
        { raw: 18, score: 50 },
        { raw: 25, score: 70 },
        { raw: 30, score: 85 },
        { raw: 35, score: 100 },
      ],
      female: [
        { raw: 8, score: 25 },
        { raw: 12, score: 50 },
        { raw: 17, score: 70 },
        { raw: 21, score: 85 },
        { raw: 25, score: 100 },
      ],
    },
  }),
]
