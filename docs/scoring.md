# Skoring & laporan

Semua matematika nilai berada di `packages/shared/src/scoring`, fungsi murni tanpa I/O dan tanpa `Date.now()`. API menghitung ulang nilai saat finalisasi; nilai final dari client tidak pernah dipercaya.

## Alur nilai

1. Guru mengisi `rawValue` per indikator (detik, cm, meter, repetisi, atau poin rubrik).
2. `normalizeRawValue()` mengubahnya menjadi nilai 0–100 memakai tabel norma atau rubrik instrumen.
3. `computeProcessProduct()` menghitung rata-rata berbobot indikator proses dan produk.
4. `computeFinalScore()` menggabungkan proses/produk sesuai `scoringFormula` instrumen.
5. `resolveCategory()` memilih ambang kategori dari snapshot instrumen.

## Pembulatan

`roundScore(value)` membulatkan 2 desimal half-up dan menolak NaN/Infinity. Hanya helper ini yang dipakai; `toFixed` liar tidak diizinkan.

## Normalisasi norma

- Pilih tabel berdasarkan jenis kelamin dan rentang usia. Jika usia di luar rentang, tabel terdekat dipakai dan hasil ditandai `clamped`.
- Nilai mentah di bawah titik pertama memakai skor titik pertama; di atas titik terakhir memakai skor titik terakhir; di antaranya interpolasi linear.
- `higherIsBetter=false` ditangani oleh urutan titik norma (mis. waktu lari: makin kecil makin baik).
- Hasil di-clamp ke 0–100 dan dibulatkan 2 desimal.

## Rubrik

Indikator proses memakai `rubricBands` (`min`, `max`, `points`, `label`, `description`). Skor adalah `points` band yang memuat nilai mentah. Nilai di luar rentang memakai band terdekat dan ditandai `clamped`. Band wajib kontinu menutup 0–100 tanpa celah/overlap.

## Agregasi

- Bobot seluruh indikator harus berjumlah 1.0 (toleransi 0.0001).
- `weighted_sum`: nilai akhir = Σ(nilai indikator × bobot) / Σbobot.
- `process_product`: proses = rata-rata berbobot indikator `process`; produk = rata-rata berbobot indikator `product`; final = proses × `processWeight` + produk × `productWeight` (bobot proses + produk = 1.0).
- Jika salah satu komponen tidak ada, komponen yang tersedia dipakai.
- Indikator `required` yang kosong menghasilkan `ScoringError('MISSING_INDICATOR')`; API memetakannya menjadi 422 `INCOMPLETE_SCORES`.

## Kategori

Ambang disimpan per instrumen (`categoryThresholds`) dan disalin ke snapshot asesmen. Default katalog:

| Kategori | Label | Rentang |
| --- | --- | --- |
| `sangat_baik` | Sangat Baik | 90–100 |
| `baik` | Baik | 75–<90 |
| `cukup` | Cukup | 60–<75 |
| `perlu_bimbingan` | Perlu Bimbingan | 0–<60 |

`resolveCategory()` memilih ambang dengan `minScore` tertinggi yang cocok, sehingga batas atas bersama tidak menimbulkan ambiguitas.

## Katalog

23 instrumen di empat grup:

- **Bola besar**: sepak bola, bola basket, bola voli (rubrik proses + produk).
- **Atletik**: lari, lompat jauh, lompat tinggi, tolak peluru, lempar lembing, lempar cakram.
- **Kebugaran jasmani**: daya tahan kardiovaskular, kekuatan, kecepatan, kelincahan, koordinasi, daya ledak, keseimbangan.
- **TKSI**: daya tahan, kekuatan, kecepatan, kelincahan, koordinasi/daya ledak.

Setiap instrumen wajib punya `sources[]`, `assessesProcess`, dan `assessesProduct`. Norma TKSI mengikuti dokumen TKSI; kelompok usia dewasa muda diskalakan dengan faktor `[7–9: 0.8, 10–12: 0.88, 13–15: 0.94, 16–18: 1.0]` terhadap norma acuan. Rubrik proses memakai band 0–55→50, 55–70→65, 70–85→80, 85–100→95.

## Laporan Excel

Nama berkas: `rekap-<kelas>-<materi>-<YYYY-MM-DD>.xlsx` (slug, tanpa spasi).

1. **Rekap** — identitas guru/NIP/sekolah/kelas/tahun/materi/tanggal, lalu tabel: No, Nama, NIS, L/P, Nilai Proses, Nilai Produk, Nilai Akhir, Kategori, Umpan Balik. Diakhiri rata-rata, minimum, maksimum. Header tebal, autofilter, angka 2 desimal, lebar kolom tetap.
2. **Detail Indikator** — No, Nama, NIS, satu kolom per indikator (nama + satuan), Nilai Akhir, Kategori. Nilai yang ditampilkan adalah nilai ternormalisasi.
3. **Umpan Balik** — No, Nama, NIS, Kategori, teks umpan balik penuh.

## Laporan PDF

- Ukuran A4 (595.28 × 841.89 pt), margin 42 pt, konten 511.28 pt.
- Halaman pertama: kop “LAPORAN HASIL ASESMEN PENDIDIKAN JASMANI”, identitas guru, NIP, sekolah, kelas, tahun ajaran, materi, tanggal.
- Per siswa: nama/NIS/jenis kelamin, baris nilai mentah + nilai ternormalisasi per indikator, ringkasan proses/produk/final/kategori, umpan balik.
- Ringkasan kelas: rata-rata, minimum, maksimum, distribusi kategori.
- Footer setiap halaman: nomor halaman. Tanda tangan guru di akhir dokumen.
- Font standar Helvetica; karakter non-Latin disanitasi agar render aman. Berkas diawali `%PDF-`.

## Kontrak `ReportData`

Didefinisikan di `packages/shared/src/types/report.ts`: `teacher`, `class`, `instrument`, `date`, `generatedAt`, `indicators[]`, `students[]` (skor per indikator, proses, produk, final, kategori, feedback), dan `summary` (average/min/max/distribution).
