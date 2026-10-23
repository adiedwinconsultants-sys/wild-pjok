import type { Instrument } from '../types'
import { DEFAULT_THRESHOLDS, SOURCES, processIndicator } from './builders'

const processProcedure = (sport: string) => [
  `Siapkan lapangan dan bola yang sesuai untuk ${sport}.`,
  'Lakukan pemanasan dan jelaskan kriteria penilaian kepada peserta didik.',
  'Amati setiap indikator teknik saat peserta melakukan gerak dasar dalam situasi permainan.',
  'Beri skor 0–100 untuk setiap indikator sesuai rubrik, bukan berdasarkan hasil akhir pertandingan.',
]

export const bolaBesarInstruments: Instrument[] = [
  {
    id: 'sepak-bola',
    slug: 'sepak-bola',
    version: 1,
    group: 'bola_besar',
    name: 'Sepak Bola — Teknik Dasar',
    description:
      'Instrumen penilaian proses keterampilan teknik dasar sepak bola: passing, dribbling, shooting, dan sikap.',
    purpose:
      'Menilai kualitas proses keterampilan bermain sepak bola secara terstruktur dan berbasis rubrik.',
    procedure: [
      ...processProcedure('sepak bola'),
      'Uji passing: peserta melakukan passing dari jarak 5 meter sebanyak 5 kali.',
      'Uji dribbling: peserta menggiring bola melewati 5 cone sejauh 20 meter.',
      'Uji shooting: peserta melakukan tembakan ke gawang dari jarak 10 meter sebanyak 3 kali.',
    ],
    indicators: [
      processIndicator(
        'passing',
        'Passing',
        'Ketepatan, kekuatan, dan sikap tubuh saat mengumpan bola.',
        0.3,
      ),
      processIndicator(
        'dribbling',
        'Dribbling',
        'Kontrol bola, perubahan arah, dan kecepatan menggiring bola.',
        0.25,
      ),
      processIndicator(
        'shooting',
        'Shooting',
        'Akurasi, kekuatan, dan teknik menendang ke arah gawang.',
        0.25,
      ),
      processIndicator(
        'sikap',
        'Sikap dan Sportivitas',
        'Kedisiplinan, kerja sama, dan sportivitas selama asesmen.',
        0.2,
      ),
    ],
    categoryThresholds: DEFAULT_THRESHOLDS,
    sources: [SOURCES.penilaianPjok, SOURCES.atletik],
    assessesProcess: true,
    assessesProduct: false,
    scoringFormula: { type: 'weighted_sum' },
  },
  {
    id: 'bola-basket',
    slug: 'bola-basket',
    version: 1,
    group: 'bola_besar',
    name: 'Bola Basket — Teknik Dasar',
    description:
      'Instrumen penilaian proses keterampilan teknik dasar bola basket: dribbling, passing, shooting, dan sikap.',
    purpose:
      'Menilai kualitas proses keterampilan bermain bola basket melalui rubrik teknik dasar.',
    procedure: [
      ...processProcedure('bola basket'),
      'Uji dribbling: peserta melakukan dribble zig-zag melewati 5 cone.',
      'Uji passing: peserta melakukan chest pass dan bounce pass dari jarak 4 meter.',
      'Uji shooting: peserta melakukan 5 tembakan dari area free throw.',
    ],
    indicators: [
      processIndicator(
        'dribbling',
        'Dribbling',
        'Kontrol bola, posisi tubuh rendah, dan pandangan ke lapangan.',
        0.3,
      ),
      processIndicator(
        'passing',
        'Passing',
        'Ketepatan chest pass dan bounce pass serta koordinasi gerak.',
        0.25,
      ),
      processIndicator(
        'shooting',
        'Shooting',
        'Rangkaian gerak tembakan, akurasi, dan konsistensi.',
        0.25,
      ),
      processIndicator(
        'sikap',
        'Sikap dan Sportivitas',
        'Kedisiplinan, kerja sama, dan sportivitas selama asesmen.',
        0.2,
      ),
    ],
    categoryThresholds: DEFAULT_THRESHOLDS,
    sources: [SOURCES.penilaianPjok, SOURCES.atletik],
    assessesProcess: true,
    assessesProduct: false,
    scoringFormula: { type: 'weighted_sum' },
  },
  {
    id: 'bola-voli',
    slug: 'bola-voli',
    version: 1,
    group: 'bola_besar',
    name: 'Bola Voli — Teknik Dasar',
    description:
      'Instrumen penilaian proses keterampilan dasar bola voli: passing atas, passing bawah, servis, dan sikap.',
    purpose: 'Menilai kualitas proses keterampilan bola voli melalui rubrik teknik dasar.',
    procedure: [
      ...processProcedure('bola voli'),
      'Uji passing atas: peserta melakukan 10 passing atas berurutan ke dinding.',
      'Uji passing bawah: peserta melakukan 10 passing bawah berurutan ke dinding.',
      'Uji servis: peserta melakukan 5 servis bawah atau atas melewati net.',
    ],
    indicators: [
      processIndicator(
        'passing-atas',
        'Passing Atas',
        'Posisi tangan, perkenaan bola, dan ketinggian umpan.',
        0.25,
      ),
      processIndicator(
        'passing-bawah',
        'Passing Bawah',
        'Sikap tubuh, perkenaan lengan, dan arah bola.',
        0.25,
      ),
      processIndicator(
        'servis',
        'Servis',
        'Konsistensi, arah, dan teknik servis yang digunakan.',
        0.3,
      ),
      processIndicator(
        'sikap',
        'Sikap dan Sportivitas',
        'Kedisiplinan, kerja sama, dan sportivitas selama asesmen.',
        0.2,
      ),
    ],
    categoryThresholds: DEFAULT_THRESHOLDS,
    sources: [SOURCES.penilaianPjok, SOURCES.atletik],
    assessesProcess: true,
    assessesProduct: false,
    scoringFormula: { type: 'weighted_sum' },
  },
]
