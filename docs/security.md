# Checklist keamanan

Diperiksa 2026-10-26.

- [x] Password PBKDF2-SHA256 100.000 iterasi (batas WebCrypto Cloudflare Workers), salt 16 byte acak, perbandingan constant-time.
- [x] Access token HS256 15 menit; refresh token opaque 30 hari, disimpan sebagai hash, dirotasi, reuse mencabut semua sesi.
- [x] Logout mencabut sesi; reset password mencabut semua sesi dan token sekali pakai.
- [x] Rate limit login 10/menit dan forgot-password 3/15 menit; key memakai hash identifier.
- [x] Semua route domain memakai `requireAuth`; kepemilikan dicek lewat helper (`requireOwnedClass`, `requireOwnedStudent`, `requireOwnedAssessment`).
- [x] IDOR diuji: guru A tidak bisa membaca/mengubah kelas, asesmen, atau ekspor guru B (403).
- [x] Validasi Zod pada body/query/param; error tidak membocorkan stack.
- [x] Secret tidak ada di repo; `.dev.vars` dan `.env` di-ignore; `.env.example` hanya placeholder.
- [x] Log tidak memuat nama/NIS/email/token; hanya requestId, method, path, status, durasi, env.
- [x] CORS dibatasi `CORS_ORIGIN`; Bearer token, tanpa credentials.
- [x] Ekspor hanya dapat diunduh pemilik; R2 key tidak diekspos.
- [x] Unduhan laporan memakai `private, no-store`; mobile menolak URL di luar endpoint API dan nama berkas yang tidak aman sebelum mengirim token.
- [x] Ekspor dibatasi 5 kali per guru per menit; asesmen draf tidak dapat diekspor.
- [x] Nilai XLSX yang diawali `=` tetap ditulis sebagai teks, bukan formula.
- [x] Query laporan memilih kolom minimum dan membatasi siswa ke guru serta kelas asesmen.
- [x] SheetJS diperbarui ke rilis resmi 0.20.3 untuk memperbaiki advisory parser XLSX.
- [x] Drizzle ORM 0.45.4 dan Zod 4.6.7 digunakan pada runtime API/shared/mobile; seluruh consumer lolos verifikasi kompatibilitas.
- [x] Upload impor dibatasi `.xlsx` dan 2 MB; file diparse di server.
- [x] SQL memakai Drizzle/parameter binding; filter `q` memakai `like`/`json_extract` dengan nilai terikat.
- [x] Triage dependency 2026-10-26: ws rentan sudah diganti, node-forge dipatch lokal; risiko Zod 3 Expo CLI dicatat pada 8.21, tanpa memaksa upgrade major yang tidak didukung.

## Tindak lanjut sebelum produksi

- Aktifkan alert error rate dan uptime di dashboard Cloudflare.
- Rotasi `JWT_SECRET` awal dan simpan di secret manager.
- Tinjau akses akun Cloudflare (least privilege) dan aktifkan MFA.
- Jalankan `pnpm audit` serta review dependabot.

## Audit autentikasi 8.18b2b

Sesi JWT diperiksa terhadap D1 pada setiap permintaan dan peran diambil dari akun terbaru. Rotasi refresh memakai batch bersyarat agar satu token hanya memiliki satu penerus. Reset sandi mengubah sandi, mencabut sesi, dan membatalkan semua token reset dalam satu batch. Penurunan superadmin terakhir dijaga pada kondisi UPDATE. Logout hanya mencabut sesi Bearer pemanggil. Regresi API mencakup permintaan serentak dan akses sesudah pencabutan; regresi mobile mencakup batas satu refresh serta respons refresh terlambat setelah logout. KV rate limit per email/IP tetap best-effort karena konsistensi eventual.

## Audit otorisasi dan PII 8.18b2c

Regresi menolak akses lintas guru pada kelas, siswa, impor, rekap, nilai, finalisasi, dan hasil. Pembacaan peserta asesmen dibatasi ke guru dan kelas snapshot; snapshot tidak konsisten menghasilkan 409 `ASSESSMENT_PARTICIPANTS_INVALID`. Siswa yang dibuat admin tetap milik guru kelas. Log internal hanya mencatat kode error dan pola route, tanpa pesan query atau path mentah; request ID dibuat server. Semua respons memakai `private, no-store`. Cache offline dan draf dipisah per akun, dibersihkan saat keluar, dan respons akun lama tidak mengisi cache akun baru. Token native tetap di SecureStore; token web hanya di memori tab, sehingga reload memerlukan login ulang, dan token AsyncStorage lama dihapus. Cache offline native tetap berada di sandbox aplikasi dan tidak dikirim ke pihak ketiga.

## Audit impor 8.18b2d

Validasi ZIP mencocokkan direktori dan header lokal sebelum SheetJS dijalankan. Ukuran hasil inflate dibatasi dan diperiksa, termasuk ketika metadata ukuran dipalsukan. Parser hanya membaca lembar pertama dengan batas baris; rentang besar, lebih dari 4 kolom, dan formula ditolak. Validasi identitas memakai schema yang sama dengan input manual. Regresi mencakup ZIP bomb, metadata palsu, file teks berlabel XLSX, formula, dan dimensi lembar berlebihan. Implementasi memakai [node:zlib yang didukung Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/zlib/) serta [opsi parser SheetJS](https://docs.sheetjs.com/docs/api/parse-options/), tanpa dependency baru.

## Triage Expo 8.18b2e

`ws` 8 yang rentan diarahkan ke 8.22.0; ws 7 yang dipakai Metro tetap mengikuti versi yang didukung. Advisory [node-forge GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) belum memiliki rilis perbaikan pada tanggal audit. Patch pnpm terikat ke 1.4.0 memeriksa jumlah elemen DigestAlgorithm sesuai elemen yang benar-benar ditangkap validator, termasuk parameter NULL opsional. `node scripts/check-toolchain-security.cjs` menguji signature SHA-256 valid dengan/tanpa parameter dan menolak elemen tambahan pada keduanya. Audit versi masih dapat menandai node-forge 1.4.0 meski patch diterapkan; jangan mengabaikan advisory secara global. Frozen install, test, typecheck, lint, dan bundle Android lulus. Expo install check menemukan patch SDK terbaru; tindak lanjut kompatibilitas dan advisory toolchain lainnya dicatat pada 8.18b2f.

## Dependency toolchain 8.18b2f

Vitest shared diselaraskan ke 4.1.12 dan Vite 8.3.5; drizzle-kit ke 0.31.11. Override dibatasi ke rentang rentan untuk esbuild, sharp, undici 7, dan Zod 4. Expo diperbarui ke patch SDK 58 yang direkomendasikan CLI. Semua test, typecheck, lint, frozen install, `expo install --check`, pemeriksaan migrasi Drizzle, bundle Android, dan Worker dry-run lulus. Satu tes mobile sempat timeout saat bundle Metro dan test worker berjalan bersamaan; pengulangan suite mobile sendiri lulus tanpa mengubah timeout.

Audit versi terakhir mencatat dua advisory high, tanpa critical/moderate/low: node-forge 1.4.0 dengan patch regresi lokal di atas, dan [Zod 3.25.76 bawaan Expo CLI](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Zod 3 CLI belum memiliki versi perbaikan kompatibel; aplikasi/API/shared dan Zod 4 toolchain memakai 4.6.7. Jangan menjalankan CLI dari konfigurasi/proyek yang tidak dipercaya. Pemutakhiran Zod 3 menunggu versi Expo CLI yang mendukungnya (8.21). Tidak ada advisory yang disembunyikan dari `pnpm audit`.

## Konsistensi asesmen 8.18c

Versi mutasi dan batch bersyarat mencegah finalisasi memakai skor yang berubah selama penghitungan. Trigger migrasi 0003 melindungi skor final dan riwayat dari penghapusan. Regresi API memeriksa simpan/finalisasi serentak, finalisasi ganda, reopen ganda, dan penghapusan data terkait. Draf mobile memvalidasi data lokal, membatasi kunci ke peserta/indikator asesmen, memakai nilai server saat konflik dengan peringatan, serta mengirim ulang draf yang belum tersinkron. Permintaan simpan diserialkan dan perubahan selama simpan dikirim ulang. Error simpan diteruskan agar finalisasi berhenti. Regresi mobile mencakup pemulihan, konflik, draf rusak, perubahan saat simpan, dan kegagalan sebelum finalisasi.

Cek ulang registry 2026-10-26: `@expo/cli@latest` = 58.1.15, `dependencies.zod` = `^3.25.76`; `expo@58.0.19` meminta CLI `^58.1.15`. Zod major 3 terbaru masih 3.25.76. Temuan 8.21 berlaku pada rilis stabil yang tersedia saat pengecekan, bukan klaim bahwa upgrade kompatibel tidak akan tersedia. [Manifest resmi Expo CLI](https://github.com/expo/expo/blob/main/packages/%40expo/cli/package.json).
