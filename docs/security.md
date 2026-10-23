# Checklist keamanan

Diperiksa 2026-10-23.

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
- [x] Upload impor dibatasi `.xlsx` dan 2 MB; file diparse di server.
- [x] SQL memakai Drizzle/parameter binding; filter `q` memakai `like`/`json_extract` dengan nilai terikat.
- [x] Tidak ada dependency audit kritis yang diketahui saat pemeriksaan; jalankan `pnpm audit` sebelum rilis.

## Tindak lanjut sebelum produksi

- Aktifkan alert error rate dan uptime di dashboard Cloudflare.
- Rotasi `JWT_SECRET` awal dan simpan di secret manager.
- Tinjau akses akun Cloudflare (least privilege) dan aktifkan MFA.
- Jalankan `pnpm audit` serta review dependabot.
