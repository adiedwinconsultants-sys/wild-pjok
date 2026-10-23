# Catatan Rilis v1.0.0

Tanggal: 2026-10-23

Rilis awal aplikasi asesmen PJOK untuk guru: pengelolaan kelas dan peserta didik, katalog
instrumen, input skor, perhitungan nilai di server, umpan balik, rekap, riwayat, serta ekspor
Excel/PDF.

## Fitur utama

- Autentikasi email/password dengan akses JWT 15 menit dan refresh token 30 hari yang dirotasi.
- Registrasi akun guru mandiri, pemulihan kata sandi, dan pencabutan sesi.
- Peran `teacher`, `admin`, dan `superadmin`; superadmin dapat mencari pengguna dan mengubah
  peran lewat layar **Kelola pengguna**.
- Kelola kelas dan peserta didik, termasuk impor Excel dengan validasi dan deteksi duplikat.
- Katalog instrumen bola besar, atletik, kebugaran jasmani, dan TKSI beserta norma dan sumber.
- Wizard asesmen, input skor per indikator dengan autosave, finalisasi, reopen beraudit, dan
  umpan balik.
- Nilai akhir selalu dihitung ulang di API; kategori mengikuti snapshot instrumen.
- Rekap kelas, riwayat asesmen, dan ekspor Excel/PDF dengan identitas lengkap.
- UI mobile Bahasa Indonesia dengan state loading, kosong, error, dan sukses.

## Teknis

- Monorepo pnpm: Expo + expo-router, Hono di Cloudflare Workers, D1 + Drizzle, R2, KV.
- Validasi Zod di seluruh boundary; skoring murni di `@pjok/shared`.
- Rate limit login, registrasi, dan pemulihan sandi.
- Seed demo menyertakan akun guru dan superadmin.
- WorkOS dihapus setelah rilis ini; autentikasi hanya email/password. Migrasi `0002` menghapus
  kolom `auth_provider` dan `workos_user_id`.

## Verifikasi

- `pnpm typecheck`, `pnpm lint`, dan `pnpm test` hijau: shared 25, API 24, mobile 14 test.

## Batasan yang diketahui

- Uji end-to-end di perangkat fisik dan uji TalkBack/VoiceOver belum dilakukan.
- Backup terjadwal D1, observability, dan verifikasi domain produksi masih menunggu konfigurasi
  Cloudflare.
