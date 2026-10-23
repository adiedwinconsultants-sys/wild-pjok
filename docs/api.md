# API

Base URL lokal: `http://localhost:8787/v1`. Semua respons JSON memakai envelope:

```json
{ "data": {}, "meta": { "page": 1, "perPage": 20, "total": 0, "totalPages": 0 } }
```

Error:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {}, "requestId": "…" } }
```

Autentikasi memakai `Authorization: Bearer <accessToken>`. Access token 15 menit; refresh token opaque 30 hari dan dirotasi.

## Pagination

`page` (1-based, default 1) dan `perPage` (default 20, maks 100). List menyertakan `meta.total` dan `meta.totalPages`.

## Auth

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/auth/register` | Body `{ name, email, password, school? }` → akun guru + token; email duplikat 409 |
| POST | `/auth/login` | Body `{ email, password }` → access/refresh token + user |
| POST | `/auth/refresh` | Body `{ refreshToken }` → token baru (rotasi) |
| POST | `/auth/logout` | Bearer + opsional `{ refreshToken }` → 204 |
| GET | `/auth/me` | Profil guru |
| PATCH | `/auth/me` | `{ name?, nip?, school? }` |
| DELETE | `/auth/sessions` | Cabut semua sesi guru |
| POST | `/auth/forgot-password` | `{ email }` → 202 netral; `devToken` hanya `APP_ENV=local` |
| POST | `/auth/reset-password` | `{ token, password }`, token sekali pakai |

Rate limit: login 10/menit per IP+email, forgot-password 3/15 menit, register 5/10 menit per IP+email.

## Admin

Hanya `superadmin`. `admin` dan `superadmin` boleh mengakses data lintas guru; `teacher` hanya data miliknya.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/admin/users?q=&role=&page=&perPage=` | Daftar akun + `classCount` |
| PATCH | `/admin/users/:id` | `{ role: "teacher"\|"admin"\|"superadmin" }`; superadmin terakhir tidak dapat diturunkan |

## Kelas & peserta didik

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/classes?q=&page=&perPage=` | List kelas milik guru + `studentCount` |
| POST | `/classes` | `{ name, gradeLevel, academicYear, notes? }` |
| GET | `/classes/:id` | Detail kelas |
| PATCH | `/classes/:id` | Ubah kelas |
| DELETE | `/classes/:id` | 409 `CLASS_HAS_ASSESSMENTS` bila ada asesmen final |
| GET | `/classes/:id/recap` | Rekap asesmen terakhir: rata-rata, min, max, distribusi, siswa |
| GET | `/classes/:id/students?q=&page=&perPage=` | List siswa |
| POST | `/classes/:id/students` | `{ fullName, nis, sex: "L"\|"P", birthDate: "YYYY-MM-DD" }` |
| POST | `/classes/:id/students/import?dryRun=true` | Multipart `file` `.xlsx` ≤ 2 MB; default dry-run |
| GET | `/students/import-template` | Unduh template XLSX |
| PATCH | `/students/:id` | Ubah siswa |
| DELETE | `/students/:id` | 409 `STUDENT_HAS_RESULTS` bila sudah dinilai |

Respons impor:

```json
{ "data": { "dryRun": true, "valid": [], "duplicates": [], "errors": [{ "rowNumber": 3, "message": "…" }], "inserted": 0 } }
```

## Instrumen

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/instruments?group=&q=&page=&perPage=` | Ringkasan katalog |
| GET | `/instruments/:slug` | Payload lengkap: tujuan, prosedur, indikator, norma/rubrik, ambang, sumber |

Grup: `bola_besar`, `atletik`, `kebugaran_jasmani`, `tksi`.

## Asesmen

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/assessments` | `{ classId, instrumentId, date, participantIds }` → draft + snapshot instrumen |
| GET | `/assessments?classId=&instrumentId=&from=&to=&status=&q=&page=&perPage=` | Riwayat |
| GET | `/assessments/:id` | Header, snapshot, skor, hasil, feedback |
| PUT | `/assessments/:id/scores` | Body `{ scores: [{ studentId, indicatorId, rawValue }] }`; server menghitung normalized |
| POST | `/assessments/:id/finalize` | Validasi kelengkapan, hitung ulang, simpan hasil, set final |
| POST | `/assessments/:id/reopen` | `{ reason }` minimal 5 karakter; tulis audit log |
| GET | `/assessments/:id/results` | Hasil per siswa + skor indikator + feedback |
| PUT | `/results/:id/feedback` | `{ note }` maks 2000 karakter; hanya final/reopened |

Aturan penting:

- `finalScore` dari client diabaikan; server selalu menghitung dari snapshot.
- Finalisasi tidak lengkap → 422 `INCOMPLETE_SCORES` dengan daftar indikator.
- Edit skor setelah final → 409 `ASSESSMENT_FINALIZED`.
- Reopen mengubah status menjadi `reopened` dan tercatat di `audit_logs`.

## Ekspor

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/exports` | `{ assessmentId, format: "xlsx"\|"pdf" }` → job selesai + metadata |
| GET | `/exports/:id` | Status job + `downloadUrl` |
| GET | `/exports/:id/download` | Unduh berkas (Bearer) |

Job milik guru lain → 403. Berkas R2 dibersihkan otomatis setelah 30 hari oleh scheduled handler.

## Health

`GET /health` → `{ data: { status: "ok", version, timestamp } }`; memeriksa D1 dengan `SELECT 1`.

## Kode error

| Kode | HTTP | Konteks |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Body/query/param tidak valid |
| `UNAUTHORIZED` | 401 | Token tidak ada/invalid |
| `TOKEN_EXPIRED` / `TOKEN_INVALID` | 401 | Access token |
| `INVALID_CREDENTIALS` | 401 | Login gagal |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh gagal/reuse |
| `INVALID_RESET_TOKEN` | 400 | Token reset salah/kedaluwarsa |
| `EMAIL_ALREADY_REGISTERED` | 409 | Registrasi dengan email yang sudah ada |
| `ADMIN_USER_NOT_FOUND` | 404 | Akun target tidak ada |
| `LAST_SUPERADMIN` | 409 | Superadmin terakhir tidak boleh diturunkan |
| `RATE_LIMITED` | 429 | Melebihi batas |
| `FORBIDDEN` | 403 | Bukan pemilik resource |
| `NOT_FOUND` | 404 | Endpoint tidak ada |
| `CLASS_NOT_FOUND` / `STUDENT_NOT_FOUND` / `INSTRUMENT_NOT_FOUND` | 404 | Resource |
| `ASSESSMENT_NOT_FOUND` / `RESULT_NOT_FOUND` / `EXPORT_NOT_FOUND` | 404 | Resource |
| `CLASS_DUPLICATE` / `STUDENT_DUPLICATE` | 409 | Duplikat unik |
| `CLASS_HAS_ASSESSMENTS` / `STUDENT_HAS_RESULTS` | 409 | Hapus ditolak |
| `ASSESSMENT_FINALIZED` | 409 | Edit setelah final |
| `ASSESSMENT_NOT_FINALIZED` | 409 | Feedback sebelum final |
| `INCOMPLETE_SCORES` | 422 | Finalisasi kurang indikator |
| `SCORE_INVALID` | 422 | Skor di luar aturan instrumen |
| `IMPORT_INVALID` | 422 | File impor tidak valid |
| `PAYLOAD_TOO_LARGE` | 413 | Berkas > 2 MB |
| `EXPORT_FAILED` | 500 | Pembuatan laporan gagal |
| `INTERNAL_ERROR` | 500 | Kesalahan tak terduga |
