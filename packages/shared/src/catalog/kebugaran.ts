import type { Instrument } from '../types'
import { DEFAULT_THRESHOLDS, SOURCES, productIndicator } from './builders'
import type { NormSeed } from './builders'

function kebugaranInstrument(config: {
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
    group: 'kebugaran_jasmani',
    name: config.name,
    description: config.description,
    purpose: config.purpose,
    procedure: [
      'Siapkan alat ukur dan area tes yang aman.',
      'Lakukan pemanasan 5–10 menit sebelum tes.',
      'Jelaskan teknik dan aturan pelaksanaan tes kepada peserta didik.',
      ...config.procedure,
      'Catat hasil terbaik dan hentikan tes bila peserta mengalami keluhan fisik.',
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
    sources: [SOURCES.kebugaran, SOURCES.kebugaranIlmiah],
    assessesProcess: false,
    assessesProduct: true,
    scoringFormula: { type: 'weighted_sum' },
  }
}

export const kebugaranInstruments: Instrument[] = [
  kebugaranInstrument({
    id: 'kebugaran-daya-tahan-kardiovaskular',
    name: 'Kebugaran — Daya Tahan Kardiovaskular',
    description: 'Mengukur daya tahan kardiovaskular melalui lari 1600 meter.',
    purpose: 'Menilai kapasitas aerobik peserta didik secara tidak langsung.',
    procedure: [
      'Peserta berlari menempuh jarak 1600 meter pada lintasan terukur.',
      'Catat waktu tempuh dari start sampai melewati garis finis.',
    ],
    indicatorId: 'lari-1600m',
    indicatorName: 'Waktu Lari 1600 m',
    indicatorDescription: 'Waktu tempuh lari 1600 meter dalam detik; semakin kecil semakin baik.',
    unit: 'detik',
    higherIsBetter: false,
    seed: {
      male: [
        { raw: 420, score: 100 },
        { raw: 480, score: 85 },
        { raw: 540, score: 70 },
        { raw: 660, score: 50 },
        { raw: 780, score: 25 },
      ],
      female: [
        { raw: 480, score: 100 },
        { raw: 540, score: 85 },
        { raw: 600, score: 70 },
        { raw: 720, score: 50 },
        { raw: 840, score: 25 },
      ],
    },
  }),
  kebugaranInstrument({
    id: 'kebugaran-kekuatan',
    name: 'Kebugaran — Kekuatan (Push-up 60 Detik)',
    description: 'Mengukur kekuatan dan daya tahan otot lengan, dada, dan bahu.',
    purpose: 'Menilai kekuatan otot bagian atas peserta didik.',
    procedure: [
      'Peserta melakukan push-up dengan posisi tubuh lurus selama 60 detik.',
      'Hitung hanya push-up dengan rentang gerak yang benar.',
    ],
    indicatorId: 'pushup-60s',
    indicatorName: 'Push-up 60 Detik',
    indicatorDescription: 'Jumlah push-up benar dalam 60 detik; semakin banyak semakin baik.',
    unit: 'repetisi',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 8, score: 25 },
        { raw: 16, score: 50 },
        { raw: 26, score: 70 },
        { raw: 33, score: 85 },
        { raw: 40, score: 100 },
      ],
      female: [
        { raw: 5, score: 25 },
        { raw: 10, score: 50 },
        { raw: 18, score: 70 },
        { raw: 24, score: 85 },
        { raw: 30, score: 100 },
      ],
    },
  }),
  kebugaranInstrument({
    id: 'kebugaran-kecepatan',
    name: 'Kebugaran — Kecepatan (Sprint 30 m)',
    description: 'Mengukur kecepatan akselerasi melalui lari sprint 30 meter.',
    purpose: 'Menilai komponen kecepatan peserta didik.',
    procedure: [
      'Peserta melakukan sprint 30 meter dari posisi start berdiri.',
      'Catat waktu tempuh dan ambil waktu terbaik dari dua percobaan.',
    ],
    indicatorId: 'lari-30m',
    indicatorName: 'Waktu Sprint 30 m',
    indicatorDescription: 'Waktu tempuh sprint 30 meter dalam detik; semakin kecil semakin baik.',
    unit: 'detik',
    higherIsBetter: false,
    seed: {
      male: [
        { raw: 4.2, score: 100 },
        { raw: 4.6, score: 85 },
        { raw: 5, score: 70 },
        { raw: 5.8, score: 50 },
        { raw: 6.6, score: 25 },
      ],
      female: [
        { raw: 4.6, score: 100 },
        { raw: 5, score: 85 },
        { raw: 5.4, score: 70 },
        { raw: 6.2, score: 50 },
        { raw: 7, score: 25 },
      ],
    },
  }),
  kebugaranInstrument({
    id: 'kebugaran-kelincahan',
    name: 'Kebugaran — Kelincahan (Illinois Agility)',
    description: 'Mengukur kelincahan melalui tes Illinois Agility Run.',
    purpose: 'Menilai kemampuan mengubah arah dan kecepatan gerak.',
    procedure: [
      'Susun cone sesuai lintasan Illinois Agility Run.',
      'Peserta berlari menyusuri lintasan secepat mungkin tanpa menjatuhkan cone.',
      'Catat waktu total dan ulangi bila peserta salah melewati lintasan.',
    ],
    indicatorId: 'illinois-agility',
    indicatorName: 'Waktu Illinois Agility',
    indicatorDescription: 'Waktu total lintasan Illinois dalam detik; semakin kecil semakin baik.',
    unit: 'detik',
    higherIsBetter: false,
    seed: {
      male: [
        { raw: 17, score: 100 },
        { raw: 18.5, score: 85 },
        { raw: 20, score: 70 },
        { raw: 23, score: 50 },
        { raw: 27, score: 25 },
      ],
      female: [
        { raw: 18.5, score: 100 },
        { raw: 20, score: 85 },
        { raw: 21.5, score: 70 },
        { raw: 25, score: 50 },
        { raw: 29, score: 25 },
      ],
    },
  }),
  kebugaranInstrument({
    id: 'kebugaran-koordinasi',
    name: 'Kebugaran — Koordinasi (Lempar Tangkap)',
    description: 'Mengukur koordinasi mata-tangan melalui lempar tangkap bola.',
    purpose: 'Menilai koordinasi neuromuskular peserta didik.',
    procedure: [
      'Peserta melakukan lempar tangkap bola ke dinding/pasangan selama 30 detik.',
      'Hitung jumlah tangkapan bersih yang berhasil.',
    ],
    indicatorId: 'lempar-tangkap-30s',
    indicatorName: 'Lempar Tangkap 30 Detik',
    indicatorDescription: 'Jumlah tangkapan bersih dalam 30 detik; semakin banyak semakin baik.',
    unit: 'kali',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 6, score: 25 },
        { raw: 10, score: 50 },
        { raw: 14, score: 70 },
        { raw: 17, score: 85 },
        { raw: 20, score: 100 },
      ],
      female: [
        { raw: 5, score: 25 },
        { raw: 8, score: 50 },
        { raw: 12, score: 70 },
        { raw: 15, score: 85 },
        { raw: 18, score: 100 },
      ],
    },
  }),
  kebugaranInstrument({
    id: 'kebugaran-daya-ledak',
    name: 'Kebugaran — Daya Ledak (Lompat Jauh Berdiri)',
    description: 'Mengukur daya ledak otot tungkai melalui standing broad jump.',
    purpose: 'Menilai kemampuan menghasilkan tenaga eksplosif otot tungkai.',
    procedure: [
      'Peserta berdiri di belakang garis dan melompat sejauh mungkin dengan dua kaki.',
      'Ukur jarak dari garis tolakan ke titik pendaratan terdekat.',
    ],
    indicatorId: 'lompat-jauh-berdiri',
    indicatorName: 'Jarak Lompat Jauh Berdiri',
    indicatorDescription: 'Jarak lompatan dalam sentimeter; semakin jauh semakin baik.',
    unit: 'sentimeter',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 110, score: 25 },
        { raw: 140, score: 50 },
        { raw: 170, score: 70 },
        { raw: 195, score: 85 },
        { raw: 220, score: 100 },
      ],
      female: [
        { raw: 95, score: 25 },
        { raw: 120, score: 50 },
        { raw: 146, score: 70 },
        { raw: 168, score: 85 },
        { raw: 190, score: 100 },
      ],
    },
  }),
  kebugaranInstrument({
    id: 'kebugaran-keseimbangan',
    name: 'Kebugaran — Keseimbangan (Stork Stand)',
    description: 'Mengukur keseimbangan statis melalui sikap stork stand.',
    purpose: 'Menilai kemampuan mempertahankan keseimbangan tubuh.',
    procedure: [
      'Peserta berdiri dengan satu kaki dan kaki lain menempel pada lutut kaki tumpu.',
      'Kedua tangan di pinggang dan mata tertutup selama tes.',
      'Catat waktu bertahan hingga peserta kehilangan keseimbangan.',
    ],
    indicatorId: 'stork-stand',
    indicatorName: 'Waktu Stork Stand',
    indicatorDescription:
      'Lama bertahan dalam sikap stork stand (detik); semakin lama semakin baik.',
    unit: 'detik',
    higherIsBetter: true,
    seed: {
      male: [
        { raw: 8, score: 25 },
        { raw: 15, score: 50 },
        { raw: 25, score: 70 },
        { raw: 35, score: 85 },
        { raw: 45, score: 100 },
      ],
      female: [
        { raw: 8, score: 25 },
        { raw: 15, score: 50 },
        { raw: 25, score: 70 },
        { raw: 35, score: 85 },
        { raw: 45, score: 100 },
      ],
    },
  }),
]
