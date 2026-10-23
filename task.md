# task.md — Checklist Eksekusi

Source of truth untuk urutan pekerjaan. Aturan lengkap ada di `AGENTS.md` §0.

**Aturan centang**: kerjakan satu task, verifikasi, lalu langsung ubah `- [ ]` menjadi `- [x]` pada giliran yang sama. Jangan centang tanpa verifikasi. Task terblokir diberi `BLOCKED: <alasan>`. Jangan menomori ulang atau menghapus task.

Legenda fase:

- **0** Fondasi repo & tooling
- **1** Kontrak domain, katalog instrumen, engine skoring (`@pjok/shared`)
- **2** Backend inti: D1, auth, middleware
- **3** API domain: kelas, siswa, asesmen, rekap, riwayat
- **4** Mobile inti: auth, navigasi, komponen
- **5** Fitur mobile per requirement
- **6** Laporan: Excel & PDF
- **7** Deploy Cloudflare + build aplikasi
- **8** QA, dokumentasi, rilis

---

## Fase 0 — Fondasi repo & tooling

- [x] **0.1** Inisialisasi git repo di root (`git init`, branch `main`), tanpa commit.
- [x] **0.2** Buat `pnpm-workspace.yaml` berisi `apps/*` dan `packages/*`.
- [x] **0.3** Buat `package.json` root: `private`, `engines` Node 22/pnpm 11, script `dev:api`, `dev:mobile`, `typecheck`, `lint`, `lint:fix`, `test`.
- [x] **0.4** Tambahkan script `-r` di root untuk `typecheck`/`test` agar mencakup semua workspace.
- [x] **0.5** Buat `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, target ES2022, moduleResolution bundler).
- [x] **0.6** Buat `biome.json` (formatter 2 spasi, single quote, semicolon as needed, import sorting) dan script lint memakainya.
- [x] **0.7** Buat `.gitignore` (node_modules, .expo, dist, .wrangler, .dev.vars, *.log, coverage, build artifacts).
- [x] **0.8** Buat `.editorconfig`, `.nvmrc` (22), dan `.gitattributes` (LF).
- [x] **0.9** Scaffold `packages/shared` (`package.json` `@pjok/shared`, tsconfig extends base, `src/index.ts`).
- [x] **0.10** Scaffold `apps/api` (`@pjok/api`, Hono, TypeScript, `src/index.ts` minimal, `package.json` script dev/deploy/db/*).
- [x] **0.11** Scaffold `apps/mobile` dengan Expo + expo-router + TypeScript (`@pjok/mobile`).
- [x] **0.12** Hubungkan `@pjok/shared` sebagai dependency workspace di api dan mobile.
- [x] **0.13** Jalankan `pnpm install` dan commit lockfile dalam keadaan bersih (tanpa error peer).
- [x] **0.14** Verifikasi `pnpm typecheck` dan `pnpm lint` hijau di ketiga workspace.
- [x] **0.15** Tulis `README.md` root: prasyarat, cara install, cara menjalankan api & mobile, daftar script.
- [x] **0.16** Tambahkan `docs/` kosong dengan placeholder `api.md`, `scoring.md`, `data-model.md`, `ops.md`.

## Fase 1 — Kontrak domain, katalog, engine skoring (`@pjok/shared`)

### 1A. Tipe & skema

- [x] **1.1** Buat enum/const: `UserRole`, `MaterialGroup` (bola_besar, atletik, kebugaran_jasmani, tksi), `AssessmentStatus` (draft, finalized, reopened), `ScoreCategory` (sangat_baik, baik, cukup, perlu_bimbingan), `ScoreKind` (process, product).
- [x] **1.2** Buat tipe `Teacher`, `Class`, `Student` + zod schema create/update/response.
- [x] **1.3** Buat tipe `Indicator` (id, name, description, unit, kind, weight, higherIsBetter, normTable?, rubricBands?).
- [x] **1.4** Buat tipe `RubricBand` (min, max, points, label, description) + validator kontinuitas 0–100.
- [x] **1.5** Buat tipe `NormTable` (sex, ageMin, ageMax, points[] pasangan raw→score) + validator monotonisitas.
- [x] **1.6** Buat tipe `Instrument` (id, slug, version, group, name, description, purpose, procedure[], indicators[], categoryThresholds[], sources[], assessesProcess, assessesProduct, scoringFormula).
- [x] **1.7** Buat tipe `CategoryThreshold` (minScore, maxScore, category, label) + validator menutup 0–100 tanpa celah/overlap.
- [x] **1.8** Buat skema zod `AssessmentInput` (classId, instrumentId, date, participantIds).
- [x] **1.9** Buat skema zod `ScoreInput` (studentId, indicatorId, rawValue) dan `ScoreBatchInput`.
- [x] **1.10** Buat skema zod `FeedbackInput` (resultId, note) dengan batas panjang.
- [x] **1.11** Buat skema zod `AssessmentResult` (scores[], normalized, finalScore, category, feedback).
- [x] **1.12** Buat skema zod pagination + filter riwayat (classId, instrumentId, from, to, page, perPage).
- [x] **1.13** Buat skema zod `ExportRequest` (assessmentId | classId, format xlsx|pdf).
- [x] **1.14** Ekspor semua tipe & schema lewat `src/index.ts` (tidak ada deep import dari luar package).

### 1B. Engine skoring (murni, tanpa I/O)

- [x] **1.15** Tulis `roundScore(value)` 2 desimal half-up + test (termasuk `.005`, negatif, NaN ditolak).
- [x] **1.16** Tulis `normalizeRawValue(indicator, raw, sex, age)` → 0–100 memakai `NormTable` (interpolasi linear, clamp, dukung `higherIsBetter=false`).
- [x] **1.17** Tulis `scoreFromRubric(indicator, raw)` untuk indikator berbasis rubrik band.
- [x] **1.18** Tulis `computeIndicatorScores(instrument, inputs)` → normalized per indikator.
- [x] **1.19** Tulis `computeProcessProduct(instrument, normalizedByKind)` → agregat proses & produk sesuai bobot instrumen.
- [x] **1.20** Tulis `computeFinalScore(instrument, scores)` → 0–100, tanpa I/O, deterministik.
- [x] **1.21** Tulis `resolveCategory(instrument, finalScore)` dari `categoryThresholds[]`.
- [x] **1.22** Tulis `validateCompleteness(instrument, scores)` → daftar indikator wajib yang kosong.
- [x] **1.23** Test: nilai minimum, maksimum, semua indikator sama, bobot tidak 1.0 ditolak.
- [x] **1.24** Test: indikator hilang → error terkontrol; nilai di luar rentang norma → clamp + flag.
- [x] **1.25** Test table-driven satu kasus per instrumen (minimal 12 instrumen).
- [x] **1.26** Pastikan tidak ada `Date.now()`, `fetch`, atau akses env di `src/scoring` (test/lint guard).

### 1C. Katalog instrumen + norma + sumber

- [x] **1.27** Buat `catalog/validators.ts` untuk memvalidasi seluruh katalog saat import/test.
- [x] **1.28** Isi instrumen **TKSI** (komponen daya tahan, kekuatan, kecepatan, kelincahan, koordinasi/daya ledak sesuai dokumen resmi) + norma per jenis kelamin & kelompok usia.
- [x] **1.29** Isi instrumen **bola besar**: sepak bola, bola basket, bola voli (rubrik proses: teknik dasar + sikap, bobot jelas).
- [x] **1.30** Isi instrumen **atletik**: lari, lompat jauh, lompat tinggi, tolak peluru, lempar lembing, lempar cakram (produk terukur + norma).
- [x] **1.31** Isi instrumen **kebugaran jasmani**: daya tahan kardiovaskular, kekuatan, kecepatan, kelincahan, koordinasi, daya ledak, keseimbangan.
- [x] **1.32** Lengkapi `purpose`, `procedure[]`, `sources[]` (sitasi + URL/DOI bila ada) untuk setiap instrumen.
- [x] **1.33** Tandai `assessesProcess`/`assessesProduct` konsisten dengan indikator tiap instrumen.
- [x] **1.34** Set `categoryThresholds` default per instrumen (tidak hardcode di UI) + label Bahasa Indonesia.
- [x] **1.35** Test katalog: semua instrumen lolos validator, bobot indikator = 1.0, ambang menutup 0–100, sumber tidak kosong.
- [x] **1.36** Tulis `scripts/dump-catalog.ts` untuk menghasilkan JSON katalog (dipakai seed API).
- [x] **1.37** Review manual isi rubrik/norma terhadap sumber yang dikutip; catat koreksi di `docs/scoring.md`.

## Fase 2 — Backend inti (`apps/api`)

### 2A. Konfigurasi & skema DB

- [x] **2.1** Buat `wrangler.jsonc`: `name`, `main`, `compatibility_date` terbaru, `compatibility_flags: ["nodejs_compat"]`, env `local`/`staging`/`production`.
- [x] **2.2** Definisikan binding D1 (`DB`), R2 (`EXPORTS`), KV (`RATE_LIMIT`), vars non-secret (`APP_ENV`, `ACCESS_TOKEN_TTL`).
- [x] **2.3** Buat `drizzle.config.ts` (dialect sqlite, schema path, out `src/db/migrations`, driver d1-http untuk CI).
- [x] **2.4** Tulis schema `users` (id, email unik, password_hash, name, nip?, school, role, created_at, updated_at).
- [x] **2.5** Tulis schema `sessions` (id, user_id FK cascade, refresh_token_hash unik, expires_at, revoked_at, user_agent?, created_at).
- [x] **2.6** Tulis schema `password_resets` (id, user_id, token_hash, expires_at, used_at).
- [x] **2.7** Tulis schema `classes` (id, teacher_id FK, name, grade_level, academic_year, notes?, created_at, updated_at) + unique (teacher_id, name, academic_year).
- [x] **2.8** Tulis schema `students` (id, teacher_id, class_id FK, full_name, nis, sex, birth_date, created_at, updated_at) + unique (class_id, nis).
- [x] **2.9** Tulis schema `instruments` (id, slug, version, group, name, payload_json snapshot lengkap, created_at) + unique (slug, version).
- [x] **2.10** Tulis schema `assessments` (id, teacher_id, class_id, instrument_id, instrument_snapshot_json, date, status, finalized_at?, reopened_at?, created_at, updated_at).
- [x] **2.11** Tulis schema `assessment_scores` (id, assessment_id, student_id, indicator_id, raw_value, normalized_value, kind, updated_at) + unique (assessment_id, student_id, indicator_id).
- [x] **2.12** Tulis schema `assessment_results` (id, assessment_id, student_id, process_score?, product_score?, final_score, category, computed_at) + unique (assessment_id, student_id).
- [x] **2.13** Tulis schema `assessment_feedback` (id, result_id FK, note, updated_at) + unique (result_id).
- [x] **2.14** Tulis schema `export_jobs` (id, teacher_id, assessment_id?, class_id?, format, status, r2_key?, error_message?, created_at, completed_at?).
- [x] **2.15** Tulis schema `audit_logs` (id, actor_id, action, entity_type, entity_id, payload_json, created_at).
- [x] **2.16** Tambahkan index: `students(class_id)`, `assessments(teacher_id, date)`, `assessments(class_id)`, `scores(assessment_id)`, `results(assessment_id)`, `sessions(user_id)`.
- [x] **2.17** Generate migrasi `0001_init.sql`, review SQL manual, jalankan `db:migrate:local`.
- [x] **2.18** Tulis `src/db/client.ts` (Drizzle + binding D1 dari `c.env`), tanpa singleton global yang bocor antar-request.
- [x] **2.19** Tulis seed katalog dari JSON hasil 1.36 (`db:seed:local` idempoten).
- [x] **2.20** Tulis seed demo: 1 guru, 2 kelas, 20 siswa, 1 asesmen final.

### 2B. Auth & middleware

- [x] **2.21** Implementasi `hashPassword`/`verifyPassword` (PBKDF2-SHA256 100k, salt 16 byte, base64url, constant-time compare).
- [x] **2.22** Test hashing: format string benar, verifikasi sukses, password salah gagal, salt berbeda tiap hash.
- [x] **2.23** Implementasi `issueAccessToken`/`verifyAccessToken` (Hono JWT, HS256, 15 menit, klaim `sub`/`role`).
- [x] **2.24** Implementasi refresh token opaque: generate 32 byte, simpan hash SHA-256, rotasi saat dipakai, deteksi reuse → cabut semua sesi user.
- [x] **2.25** Middleware `requireAuth` (parse Bearer, verifikasi, set `c.var.user`).
- [x] **2.26** Middleware `requireRole` + helper `assertOwnership(resourceTeacherId, user)`.
- [x] **2.27** Helper validasi request Zod (`parseBody`/`parseQuery`/`parseParams`) yang melempar error terstruktur.
- [x] **2.28** Handler error global: envelope `{ error: { code, message, details? } }`, map ZodError → 422, tidak membocorkan stack/PII.
- [x] **2.29** Middleware request-id + logger terstruktur (tanpa PII) + timing.
- [x] **2.30** Konfigurasi CORS untuk dev mobile (origin env, credentials tidak diperlukan karena Bearer).
- [x] **2.31** Rate limit KV untuk login (mis. 10/menit/IP+email) dan forgot-password (3/15 menit), dengan key ter-hash.
- [x] **2.32** Route `POST /v1/auth/login` (email+password, respons access+refresh+user, error `INVALID_CREDENTIALS`).
- [x] **2.33** Route `POST /v1/auth/refresh` (rotasi token, 401 `INVALID_REFRESH_TOKEN` bila gagal).
- [x] **2.34** Route `POST /v1/auth/logout` (cabut sesi saat ini, 204).
- [x] **2.35** Route `GET /v1/auth/me` (profil guru dari token).
- [x] **2.36** Route `POST /v1/auth/forgot-password` (buat token di KV + `password_resets`, selalu 202 agar tidak bocorkan email terdaftar).
- [x] **2.37** Route `POST /v1/auth/reset-password` (token sekali pakai, update hash, cabut semua sesi).
- [x] **2.38** Route `GET /v1/health` (cek D1 `SELECT 1`, versi build).
- [x] **2.39** Test auth end-to-end di workers pool: login sukses, password salah, token kedaluwarsa, refresh rotasi, reuse refresh ditolak, reset password.
- [x] **2.40** Test rate limit memblokir percobaan ke-11.

## Fase 3 — API domain

### 3A. Kelas & peserta didik

- [x] **3.1** `GET /v1/classes` (list milik guru, pagination + `q`).
- [x] **3.2** `POST /v1/classes` (validasi nama/tingkat/tahun ajaran, 409 bila duplikat).
- [x] **3.3** `GET /v1/classes/:id` (detail + jumlah siswa, 404/403 sesuai kepemilikan).
- [x] **3.4** `PATCH /v1/classes/:id`.
- [x] **3.5** `DELETE /v1/classes/:id` (tolak 409 `CLASS_HAS_ASSESSMENTS` bila sudah punya asesmen final).
- [x] **3.6** `GET /v1/classes/:id/students` (list + `q` + pagination).
- [x] **3.7** `POST /v1/classes/:id/students` (validasi NIS unik per kelas, tanggal lahir valid).
- [x] **3.8** `PATCH /v1/students/:id`.
- [x] **3.9** `DELETE /v1/students/:id` (tolak bila sudah punya skor final; atau soft-delete — pilih dan dokumentasikan).
- [x] **3.10** `GET /v1/students/import-template` (unduh `.xlsx` dengan kolom nama, NIS, jenis kelamin, tanggal lahir).
- [x] **3.11** `POST /v1/classes/:id/students/import?dryRun=true` (parse SheetJS, validasi baris, balikan ringkasan valid/error per baris).
- [x] **3.12** Commit impor: `db.batch()` insert, lewati duplikat NIS, balikan hasil per baris.
- [x] **3.13** Test impor: file valid, baris duplikat, NIS kosong, file bukan xlsx, file > 2 MB ditolak.
- [x] **3.14** Test otorisasi: guru A tidak bisa membaca/mengubah kelas guru B (403).

### 3B. Instrumen & asesmen

- [x] **3.15** `GET /v1/instruments` (filter `group`, `q`, pagination) — tanpa payload penuh.
- [x] **3.16** `GET /v1/instruments/:slug` (detail: tujuan, prosedur, indikator, rubrik, norma, ambang, sumber, process/product).
- [x] **3.17** `POST /v1/assessments` (buat draft + snapshot instrumen + validasi siswa milik kelas).
- [x] **3.18** `GET /v1/assessments` (riwayat: filter classId, instrumentId, from, to, status, pagination, `meta.total`).
- [x] **3.19** `GET /v1/assessments/:id` (header + skor + hasil + feedback, sertakan versi instrumen snapshot).
- [x] **3.20** `PUT /v1/assessments/:id/scores` (bulk upsert draft; hitung `normalized_value` server-side; tolak 409 bila final).
- [x] **3.21** `POST /v1/assessments/:id/finalize` (validasi kelengkapan, `computeFinalScore` ulang dari snapshot, simpan results + kategori, set status, 409 `ASSESSMENT_FINALIZED` bila sudah).
- [x] **3.22** `POST /v1/assessments/:id/reopen` (wajib alasan, tulis `audit_logs`, set status reopened, hanya guru pemilik).
- [x] **3.23** `PUT /v1/results/:id/feedback` (upsert catatan, batas 2000 karakter, hanya saat final/reopened).
- [x] **3.24** `GET /v1/assessments/:id/results` (per siswa: skor per indikator, proses/produk, final, kategori, feedback).
- [x] **3.25** `GET /v1/classes/:id/recap` (agregat: rata-rata, min, max, distribusi kategori, progres vs asesmen sebelumnya).
- [x] **3.26** Test integrasi: client mengirim `finalScore` palsu → server mengabaikan dan menyimpan hasil hitung sendiri.
- [x] **3.27** Test: finalize dengan indikator kosong → 422 `INCOMPLETE_SCORES` + daftar indikator.
- [x] **3.28** Test: edit skor setelah final → 409; setelah reopen → 200 dan tercatat di audit.
- [x] **3.29** Test: pagination & filter riwayat mengembalikan `meta.total` benar.
- [x] **3.30** Samakan bentuk respons semua route dengan helper `ok()`/`fail()`; tidak ada bentuk respons ad-hoc.

## Fase 4 — Mobile inti (`apps/mobile`)

- [x] **4.1** Konfigurasi `app.json` (name, slug, scheme, versi, ikon, splash, orientasi portrait).
- [x] **4.2** Buat struktur `app/(auth)/`, `app/(app)/`, `src/features/`, `src/components/`, `src/lib/`.
- [x] **4.3** Buat design token (`src/theme/tokens.ts`): warna, spacing, radius, typography, shadow; komponen memakai token.
- [x] **4.4** Buat komponen dasar: `Button`, `TextField`, `Select`, `Card`, `Badge`, `Screen`.
- [x] **4.5** Buat komponen status: `LoadingState`, `EmptyState`, `ErrorState` (dengan tombol coba lagi).
- [x] **4.6** Buat `src/lib/env.ts` (validasi zod `EXPO_PUBLIC_API_URL`).
- [x] **4.7** Buat `src/lib/api.ts`: fetch wrapper, timeout, parsing error envelope, header Authorization.
- [x] **4.8** Implementasi refresh otomatis satu kali saat 401 di api client + antrean request tertunda.
- [x] **4.9** Buat `src/lib/secure-store.ts` (simpan/ambil/hapus access+refresh token).
- [x] **4.10** Buat Zustand auth store (`status`, `user`, `signIn`, `signOut`, `hydrate`) yang memakai secure-store.
- [x] **4.11** Setup `QueryClient` (retry 1, staleTime 30 dtk) + provider di root layout.
- [x] **4.12** Root layout: cek sesi saat start, tampilkan splash selama hidrasi, arahkan ke `(auth)`/`(app)`.
- [x] **4.13** Layout `(auth)` tanpa tab bar; layout `(app)` dengan tab: Kelas, Asesmen, Riwayat, Profil.
- [x] **4.14** Layar login: email + password, react-hook-form + zod, tampilkan error per field dan error API.
- [x] **4.15** Validasi form login: format email, password minimal 8 karakter, tombol disabled saat submit.
- [x] **4.16** Aksi logout di Profil dengan konfirmasi + hapus token + redirect ke login.
- [x] **4.17** Layar lupa password: kirim email, tampilkan pesan netral.
- [x] **4.18** Layar reset password via deep link (`pjok://reset?token=...`), validasi token kosong.
- [x] **4.19** Guard rute: pengguna tanpa sesi tidak bisa masuk `(app)`; sesi aktif tidak bisa membuka `(auth)`.
- [x] **4.20** Konfigurasi jest-expo + RTL + msw/mock api client; satu smoke test render root.
- [x] **4.21** Test login screen: submit valid memanggil `signIn`, submit invalid menampilkan pesan.

## Fase 5 — Fitur mobile

### 5A. Kelas & peserta didik

- [x] **5.1** Layar daftar kelas: kartu nama/tingkat/tahun + jumlah siswa, loading/empty/error.
- [x] **5.2** Form tambah kelas (nama, tingkat, tahun ajaran) + invalidasi cache.
- [x] **5.3** Form ubah kelas dari detail.
- [x] **5.4** Hapus kelas dengan dialog konfirmasi + tangani 409.
- [x] **5.5** Layar detail kelas: daftar siswa + pencarian lokal.
- [x] **5.6** Form tambah siswa (nama, NIS, jenis kelamin, tanggal lahir) + validasi.
- [x] **5.7** Form ubah siswa.
- [x] **5.8** Hapus siswa dengan konfirmasi + tangani penolakan bila sudah dinilai.
- [x] **5.9** Tombol "Impor Excel" memakai `expo-document-picker`, unggah multipart ke endpoint dry-run.
- [x] **5.10** Layar pratinjau impor: ringkasan valid/duplikat/error per baris, tombol "Simpan yang valid".
- [x] **5.11** Setelah commit: invalidasi query siswa, tampilkan jumlah berhasil/gagal.

### 5B. Katalog & panduan instrumen

- [x] **5.12** Layar katalog materi dengan pengelompokan 4 grup + pencarian.
- [x] **5.13** Layar detail instrumen: tab/seksi tujuan, prosedur, indikator, rubrik, kriteria skor.
- [x] **5.14** Tampilkan badge "Penilaian Proses"/"Penilaian Produk" dan daftar sumber validitas.
- [x] **5.15** Tampilkan satuan & arah indikator (mis. "detik — semakin kecil semakin baik").
- [x] **5.16** Tombol "Mulai Asesmen" dari detail instrumen.

### 5C. Alur asesmen & input nilai

- [x] **5.17** Wizard langkah 1: pilih kelas.
- [x] **5.18** Wizard langkah 2: pilih instrumen (dari kelas/grup).
- [x] **5.19** Wizard langkah 3: tanggal + pilih siswa (default semua) + ringkasan.
- [x] **5.20** Buat draft lewat API lalu navigasi ke layar input dengan `assessmentId`.
- [x] **5.21** Layar input: daftar siswa, progres pengisian (x/y indikator), indikator yang kurang ditandai.
- [x] **5.22** Editor skor per siswa: input numerik per indikator dengan satuan, keyboard numerik, validasi rentang.
- [x] **5.23** Preview nilai akhir + kategori per siswa (dihitung dari `@pjok/shared`, diberi label "perkiraan").
- [x] **5.24** Autosave draft (debounce 800 ms) + indikator status tersimpan/gagal.
- [x] **5.25** Simpan draft lokal (AsyncStorage) dan pulihkan saat layar dibuka kembali.
- [x] **5.26** Tombol finalisasi dengan dialog konfirmasi berisi ringkasan siswa belum lengkap.
- [x] **5.27** Tangani 409 saat finalisasi (sudah final) dan tampilkan pesan jelas.
- [x] **5.28** Layar hasil per siswa: tabel indikator, nilai proses/produk, nilai akhir, kategori.
- [x] **5.29** Form umpan balik: pilihan template kalimat + teks bebas, simpan via API.
- [x] **5.30** Layar rekap kelas: tabel semua siswa (final + kategori), rata-rata, distribusi, urutkan.
- [x] **5.31** Layar riwayat: filter kelas/materi/rentang tanggal, buka detail atau lanjutkan draft.
- [x] **5.32** Aksi reopen dari detail asesmen final (wajib alasan) dengan peringatan audit.

### 5D. Ekspor, profil, kualitas

- [x] **5.33** Layar ekspor: pilih format (Excel/PDF) → buat job → polling status → unduh.
- [x] **5.34** Bagikan file hasil ekspor via `expo-sharing`/simpan ke perangkat.
- [x] **5.35** Layar profil: nama, NIP, sekolah (dipakai di kop laporan), simpan ke API.
- [x] **5.36** Cache offline: katalog instrumen & rekap terakhir tetap terbaca tanpa jaringan.
- [x] **5.37** Audit semua layar: loading, kosong, error + coba lagi, sukses.
- [x] **5.38** Audit aksesibilitas: label, urutan fokus, kontras, target sentuh ≥ 44×44.
- [x] **5.39** Test RTL: input skor menampilkan preview benar dan menangani error validasi.
- [x] **5.40** Test RTL: wizard asesmen membuat draft dengan payload yang sesuai schema.

## Fase 6 — Laporan Excel & PDF

- [x] **6.1** Definisikan kontrak `ReportData` di shared (guru, kelas, instrumen, tanggal, siswa, indikator, nilai, kategori, feedback).
- [x] **6.2** Tulis `docs/scoring.md` bagian laporan (definisi kolom & urutan).
- [x] **6.3** Builder XLSX sheet "Rekap": identitas + tabel siswa (nilai akhir, kategori, feedback singkat).
- [x] **6.4** Builder XLSX sheet "Detail Indikator": satu kolom per indikator + nilai ternormalisasi.
- [x] **6.5** Builder XLSX sheet "Umpan Balik": teks penuh per siswa.
- [x] **6.6** Format XLSX: lebar kolom, freeze header, format angka 2 desimal, header tebal.
- [x] **6.7** Tulis spesifikasi layout PDF (A4, margin, kop, tabel, footer nomor halaman).
- [x] **6.8** Builder PDF: kop berisi nama guru, NIP, sekolah, kelas, materi, tanggal.
- [x] **6.9** Builder PDF: tabel nilai per indikator + nilai akhir + kategori.
- [x] **6.10** Builder PDF: umpan balik, tanda tangan guru, nomor halaman.
- [x] **6.11** Pastikan font PDF mendukung karakter Indonesia (é/ñ tidak wajib, tapi aman) + test render.
- [x] **6.12** Route ekspor: buat `export_jobs`, proses, unggah ke R2, simpan `r2_key`, status `completed`.
- [x] **6.13** `GET /v1/exports/:id` (status + URL unduh berumur pendek dari R2).
- [x] **6.14** Nama file: `rekap-<kelas>-<materi>-<YYYY-MM-DD>.xlsx|pdf` (slug, tanpa spasi).
- [x] **6.15** Test ekspor: XLSX dapat dibaca ulang dan berisi N baris siswa; PDF mulai dengan `%PDF-` dan > 1 halaman.
- [x] **6.16** Test otorisasi: guru lain tidak bisa mengunduh hasil ekspor (403).
- [x] **6.17** Bersihkan file R2 kedaluwarsa (cron/scheduled handler) setelah 30 hari.

## Fase 7 — Deploy Cloudflare & build aplikasi

- [x] **7.1** Buat D1 database staging & production, catat `database_id` di `wrangler.jsonc`.
- [x] **7.2** Buat bucket R2 `pjok-exports-staging` & `pjok-exports-production`.
- [x] **7.3** Buat KV namespace untuk rate limit & reset token (staging & production).
- [x] **7.4** Set secret `JWT_SECRET` (≥ 32 byte acak) per environment lewat `wrangler secret put`.
- [x] **7.5** Jalankan migrasi remote staging, lalu production; verifikasi tabel.
- [x] **7.6** Deploy worker staging, jalankan smoke test (health, login, CRUD kelas, finalisasi).
- [x] **7.7** Deploy production setelah smoke test staging hijau.
- [ ] **7.8** BLOCKED: menunggu domain/CORS produksi Verifikasi custom domain/route API dan CORS dari build mobile.
- [x] **7.9** Setup EAS project + `eas.json` profil `development`, `preview`, `production`.
- [x] **7.10** Set env `EXPO_PUBLIC_API_URL` per profil (staging vs production).
- [ ] **7.11** BLOCKED: menunggu perangkat fisik dan akun EAS Build `preview` (APK internal) dan uji di perangkat fisik.
- [x] **7.12** CI GitHub Actions: install, lint, typecheck, test, cek migrasi belum di-edit.
- [x] **7.13** Tambahkan langkah deploy manual-terkontrol (workflow_dispatch) untuk api.
- [ ] **7.14** BLOCKED: alert dashboard Cloudflare belum dikonfigurasi Observability: `wrangler tail`, alert error rate, log tanpa PII.
- [ ] **7.15** BLOCKED: backup terjadwal menunggu kredensial Cloudflare Backup harian D1 ke R2 (scheduled worker/cron) + dokumentasi restore.
- [x] **7.16** Review limit & biaya (D1 rows read/written, R2 storage, Worker CPU) dan catat di `docs/ops.md`.

## Fase 8 — QA, dokumentasi, rilis

- [x] **8.1** Seed demo lengkap (3 kelas × 30 siswa, 4 grup materi, 3 asesmen final) untuk QA.
- [x] **8.2** Tulis `docs/api.md`: semua endpoint, skema request/response, kode error.
- [x] **8.3** Tulis `docs/scoring.md`: rumus, norma, ambang, contoh perhitungan, sumber.
- [x] **8.4** Tulis `docs/data-model.md`: ERD + penjelasan tabel & invariant.
- [x] **8.5** Tulis `docs/ops.md`: deploy, rollback, migrasi, backup/restore, rotasi secret.
- [x] **8.6** Tulis `CONTEXT.md`: glosarium domain (asesmen, indikator, norma, proses/produk, TKSI).
- [x] **8.7** Matriks penerimaan req 1–7: satu skenario uji per poin, catat status.
- [ ] **8.8** BLOCKED: menunggu perangkat fisik Uji manual end-to-end di perangkat: login → kelas → impor → asesmen → finalisasi → feedback → rekap → ekspor.
- [x] **8.9** Benchmark API: p95 < 300 ms untuk list/rekap 100 siswa; optimalkan query bila lewat.
- [x] **8.10** Security checklist: rate limit aktif, token kedaluwarsa, IDOR diuji, tidak ada secret di repo, dependency audit.
- [x] **8.11** Audit PII: grep log/analytics untuk nama/NIS; pastikan tidak ada.
- [x] **8.12** Review seluruh teks UI berbahasa Indonesia (tidak ada placeholder/Lorem/English bocor).
- [ ] **8.13** BLOCKED: menunggu perangkat dan pembaca layar Uji aksesibilitas dengan TalkBack/VoiceOver pada alur input nilai.
- [x] **8.14** Perbarui `README.md` dengan status rilis dan tautan dokumen.
- [x] **8.15** Tulis release notes v1.0.0 dan tag `v1.0.0` (hanya jika user meminta commit/tag).
- [x] **8.16** Redesign UI mobile ke arah profesional-minimalis ala Apple (tipografi sistem, palet netral, komponen inti, layar utama).
  - [x] **8.16a** Token desain & komponen inti minimalis: warna netral, radius, tipografi sistem, Button/Card/TextField/Select/ListRow/Badge/PageHeader.
  - [x] **8.16b** Splash, tab bar, header stack, dan layar autentikasi (login, daftar, lupa sandi, reset sandi).
  - [x] **8.16c** Layar utama: Kelas, Asesmen, Riwayat, Profil, detail kelas, katalog, wizard, input nilai, hasil.
  - [x] **8.16d** Verifikasi `typecheck`, `lint`, dan test mobile setelah redesign.

## Fase 9 — WorkOS, registrasi pengguna, superadmin

- [x] **9.1** Shared: role `superadmin`, schema `registerInputSchema`, `workosExchangeInputSchema`, `adminUserUpdateSchema`, tipe `AuthProvider` + `Teacher.authProvider`.
- [x] **9.2** DB: migrasi baru `auth_provider` + `workos_user_id` pada `users` (tanpa mengubah migrasi lama), update schema Drizzle.
- [x] **9.3** API auth: `POST /v1/auth/register` (akun guru), rate limit, email duplikat 409.
- [x] **9.4** API WorkOS: `GET /v1/auth/workos/status`, `POST /v1/auth/workos/authorize` (state di KV), `POST /v1/auth/workos/exchange` (upsert akun + sesi lokal); env `WORKOS_*`; 503 bila belum dikonfigurasi.
- [x] **9.5** API admin: `GET /v1/admin/users` (cari/filter/pagination) dan `PATCH /v1/admin/users/:id` (ubah role), hanya superadmin; cegah menurunkan superadmin terakhir.
- [x] **9.6** Otorisasi: middleware/helper menganggap `admin` dan `superadmin` boleh mengakses lintas data; token/klaim memuat role baru.
- [x] **9.7** Seed demo: satu akun superadmin (`superadmin@demo.pjok.id`) + guru demo; dokumentasikan kredensial lokal.
- [x] **9.8** Test API: registrasi sukses/duplikat/validasi, guard admin, list/ubah role, WorkOS 503 saat belum dikonfigurasi.
- [x] **9.9** Mobile auth: `signUp`, `signInWithWorkos` (expo-web-browser + deep link callback), status WorkOS, penyimpanan sesi.
- [x] **9.10** Mobile layar daftar akun dan tombol WorkOS di login (disembunyikan bila belum dikonfigurasi).
- [x] **9.11** Mobile layar "Kelola pengguna" untuk superadmin: daftar, pencarian, ubah role, status penyedia login.
- [x] **9.12** Dokumentasi `docs/api.md` + `README.md` untuk registrasi, WorkOS env/dashboard redirect, dan akun superadmin.
- [x] **9.13** Verifikasi akhir `pnpm typecheck`, `pnpm lint`, `pnpm test`.

---

## Traceability requirement

| Req | Cakupan task |
| --- | --- |
| 1. Login, validasi, logout, pemulihan sandi | 2.21–2.40, 4.14–4.19 |
| 2. Kelola kelas & siswa, impor Excel, pilih kelas | 2.7–2.8, 3.1–3.14, 5.1–5.11, 5.17 |
| 3. Materi PJOK (bola besar, atletik, kebugaran, TKSI) | 1.28–1.34, 3.15–3.16, 5.12–5.16 |
| 4. Panduan, indikator, rubrik, kriteria, validitas, proses vs produk | 1.3–1.7, 1.27–1.35, 3.16, 5.13–5.15 |
| 5. Pilih siswa, input skor, hitung nilai & kategori | 1.15–1.26, 3.17–3.22, 5.17–5.27 |
| 6. Hasil, umpan balik, rekap, riwayat | 3.23–3.29, 5.28–5.34 |
| 7. Ekspor Excel/PDF dengan identitas lengkap | 6.1–6.17, 5.33–5.35 |

## Di luar scope v1 (jangan dikerjakan tanpa instruksi)

- Multi-sekolah / akun orang tua. (Peran admin/superadmin dan registrasi mandiri kini masuk Fase 9 atas permintaan user.)
- Registrasi mandiri tanpa WorkOS/persetujuan admin sudah dicakup Fase 9; verifikasi email tetap di luar scope.
- Sinkronisasi offline dua arah dengan resolusi konflik kompleks.
- Notifikasi push, integrasi LMS/Dapodik, analitik pihak ketiga.
- Lokalisasi selain Bahasa Indonesia.

## Progress log

<!-- Satu baris per fase selesai: `- YYYY-MM-DD — Fase X selesai: ringkasan`. -->

- 2026-10-23 — Fase 0 selesai: tooling pnpm/Biome/TS, workspace shared/api/mobile, README + docs.
- 2026-10-23 — Fase 1 selesai: tipe/schema, engine skoring, katalog 23 instrumen + test.
- 2026-10-23 — Fase 2 selesai: D1 schema/migrasi/seed, auth PBKDF2/JWT/refresh, middleware, rate limit, test.
- 2026-10-23 — Fase 3 selesai: CRUD kelas/siswa/impor, instrumen, asesmen/finalisasi/reopen/feedback/rekap/riwayat, test.
- 2026-10-23 — Fase 4 selesai: mobile auth, navigasi, komponen, api client refresh, test login + root.
- 2026-10-23 — Fase 5 selesai: kelas/siswa/impor, katalog, wizard, input skor/autosave, hasil/feedback/rekap/riwayat/reopen, ekspor, profil, test RTL.
- 2026-10-23 — Fase 6 selesai: builder XLSX/PDF, route ekspor R2, cleanup 30 hari, test laporan.
- 2026-10-23 - Fase 7 deploy: staging/production live, smoke test hijau, APK profile siap.
- 2026-10-23 — Fase 8 redesign selesai: palet netral ala Apple, komponen inti, splash/tab/auth, layar utama + kelola pengguna; typecheck/lint/test hijau.
- 2026-10-23 — Fase 9 selesai: registrasi guru, WorkOS backend-mediated, superadmin + kelola pengguna, migrasi 0001, seed demo, dokumentasi; typecheck/lint/test hijau.
