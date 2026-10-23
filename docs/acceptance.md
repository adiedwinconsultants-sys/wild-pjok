# Matriks penerimaan

Status per 2026-10-23. “Otomatis” berarti dicakup test yang lulus; “manual lokal” berarti diverifikasi lewat `wrangler dev`/seed demo.

| Req | Skenario | Bukti | Status |
| --- | --- | --- | --- |
| 1 | Login valid, password salah, refresh rotasi + reuse ditolak, logout, reset password sekali pakai, rate limit ke-11 | `apps/api/test/auth.test.ts` (7 test) | Lulus otomatis |
| 1 | Login mobile valid memanggil `signIn`; input invalid menampilkan pesan | `apps/mobile/__tests__/login.test.tsx` | Lulus otomatis |
| 2 | CRUD kelas, pencarian, pagination, otorisasi 403 | `apps/api/test/assessments.test.ts`, manual lokal | Lulus otomatis |
| 2 | Impor Excel valid, duplikat, NIS kosong, bukan xlsx, > 2 MB | `apps/api/test/import.test.ts` (3 test) | Lulus otomatis |
| 2 | Mobile: daftar/form kelas, detail siswa, impor pratinjau + commit | Implementasi + typecheck | Lulus build |
| 3 | Katalog 4 grup, 23 instrumen, sumber valid, bobot 1.0, ambang menutup 0–100 | `packages/shared/src/catalog/catalog.test.ts` | Lulus otomatis |
| 4 | Detail instrumen: tujuan, prosedur, indikator, rubrik/norma, ambang, sumber, proses/produk | `GET /instruments/:slug`, layar katalog | Lulus manual lokal |
| 5 | Normalisasi, bobot, proses/produk, kategori, indikator hilang, clamp | `packages/shared/src/scoring/*.test.ts` (21 test) | Lulus otomatis |
| 5 | Server mengabaikan `finalScore` palsu; finalisasi tidak lengkap 422; edit final 409; reopen 200 + audit | `apps/api/test/assessments.test.ts` | Lulus otomatis |
| 5 | Wizard membuat draft dengan payload schema; input skor menampilkan preview + validasi wajib | `apps/mobile/__tests__/assessment-wizard.test.tsx`, `score-preview.test.tsx` | Lulus otomatis |
| 6 | Hasil per siswa, feedback hanya setelah final, rekap, riwayat + filter/pagination | `apps/api/test/assessments.test.ts`, manual lokal | Lulus otomatis |
| 6 | Mobile: layar hasil, umpan balik, rekap kelas, riwayat, reopen | Implementasi + typecheck | Lulus build |
| 7 | XLSX dibaca ulang berisi N siswa; PDF `%PDF-` dan > 1 halaman; nama file slug | `apps/api/test/reports.test.ts` | Lulus otomatis |
| 7 | Guru lain tidak bisa mengunduh ekspor (403) | `apps/api/test/assessments.test.ts` | Lulus otomatis |
| 7 | Identitas guru/NIP/sekolah di kop laporan | `apps/api/src/reports/*`, manual lokal | Lulus manual lokal |

## Belum diverifikasi

- Uji di perangkat fisik (Android/iOS) dan build EAS.
- TalkBack/VoiceOver pada alur input nilai.
- Deploy staging/production (menunggu kredensial Cloudflare).
- Backup harian otomatis D1.
- Cache offline penuh untuk katalog/rekap (saat ini mengandalkan cache TanStack Query dalam sesi).
