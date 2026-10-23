# AGENTS.md

Panduan kerja untuk agent (dan manusia) di repo ini. Baca file ini + `task.md` sebelum menyentuh kode.

## 0. ATURAN WAJIB — `task.md` adalah source of truth

Setiap pekerjaan HARUS terikat pada satu checkbox di `task.md`. Alurnya tidak boleh dilanggar:

1. **Sebelum mulai**: buka `task.md`, cari task `- [ ]` paling atas yang belum terblokir dan sesuai permintaan user. Kerjakan SATU task itu saja.
2. **Kerjakan + verifikasi**: implementasi, lalu jalankan verifikasi yang relevan (test, typecheck, lint, atau jalankan endpoint/screen). Tanpa verifikasi, task belum selesai.
3. **Centang segera**: begitu task terverifikasi, ubah `- [ ] **X.Y**` menjadi `- [x] **X.Y**` di `task.md` **pada giliran yang sama**. Jangan menunda, jangan mencentang beberapa task sekaligus di akhir.
4. **Jangan centang palsu**: centang hanya untuk pekerjaan yang benar-benar selesai dan terverifikasi. Jangan centang task yang hanya "hampir selesai".
5. **Terblokir**: biarkan `- [ ]`, tambahkan `BLOCKED: <alasan singkat>` tepat setelah judul task. Jangan hapus task.
6. **Task terlalu besar**: pecah menjadi sub-task baru `X.Ya`, `X.Yb`, dst. di posisi yang sama, kerjakan sub-task-nya satu per satu. Jangan memperluas definisi task asli.
7. **Selesai satu fase**: tambahkan satu baris di `## Progress log` (tanggal + fase + ringkasan). Jangan menulis log per task.
8. **Jangan** menghapus, menomori ulang, atau menyusun ulang task. Hanya mencentang, menambah `BLOCKED:`, dan menambah sub-task.
9. Jika menemukan pekerjaan baru di luar scope, tambahkan sebagai task baru di fase yang sesuai; jangan langsung mengerjakannya tanpa instruksi.

Jika ragu antara "selesai" dan "belum", anggap belum.

Isi `req.md` adalah requirement final. Jika implementasi menyimpang dari `req.md`, perbarui `task.md`/dokumen dulu dan sebutkan alasannya.

## 1. Produk

Aplikasi asesmen PJOK untuk guru: kelola kelas & peserta didik, pilih materi/instrumen (bola besar, atletik, kebugaran jasmani, TKSI), input skor per indikator, hitung nilai akhir + kategori otomatis, tulis umpan balik, rekap kelas, riwayat, ekspor Excel/PDF.

- UI & konten: **Bahasa Indonesia**. Identifier kode: **Inggris**.
- Pengguna: guru. Satu guru hanya boleh mengakses kelas & asesmen miliknya (kecuali peran admin di masa depan).

## 2. Stack

| Area | Pilihan |
| --- | --- |
| Mobile | React Native via **Expo** (expo-router, TypeScript) |
| Backend | **Hono** di **Cloudflare Workers** |
| DB | **Cloudflare D1** + **Drizzle ORM** (drizzle-kit) |
| File | **Cloudflare R2** (hasil ekspor) |
| KV | **Cloudflare KV** (token reset password, rate limit) |
| Auth | Email + password, PBKDF2-SHA256 (WebCrypto), JWT HS256 akses + refresh token opaque di D1 |
| Validasi | **Zod** di semua boundary (request, response, form, env) |
| Query mobile | **TanStack Query** |
| State | **Zustand** (hanya auth/session/UI state) |
| Form | **react-hook-form** + `@hookform/resolvers/zod` |
| Excel | **SheetJS (`xlsx`)** untuk baca/tulis |
| PDF | **pdf-lib** |
| Test | **Vitest** (`@cloudflare/vitest-pool-workers`) untuk api/shared, **jest-expo** + RTL untuk mobile |
| Lint/format | **Biome** |
| Package manager | **pnpm** workspaces (Node 22+, pnpm 11+) |

Versi dependency di-pin lewat `pnpm-lock.yaml`. Jangan menambah library baru tanpa alasan kuat; cek dulu apakah sudah ada util di repo.

## 3. Struktur repo

```
apps/
  api/            Hono worker (@pjok/api)
    src/routes/   route per domain
    src/db/       drizzle schema + migrasi + seed
    src/middleware/
  mobile/         Expo app (@pjok/mobile)
    app/          expo-router routes
    src/features/ fitur per domain
packages/
  shared/         (@pjok/shared) tipe, zod schema, katalog instrumen, engine skoring
    src/catalog/  data instrumen + norma + sumber
    src/scoring/  fungsi murni perhitungan nilai
docs/             api.md, scoring.md, data-model.md, ops.md
req.md            requirement asli (jangan diedit)
task.md           checklist eksekusi (lihat §0)
AGENTS.md         file ini
```

`packages/shared` tidak boleh mengimpor kode dari `apps/*`. `apps/api` dan `apps/mobile` hanya boleh memakai `@pjok/shared` lewat entry point publiknya.

## 4. Perintah

```
pnpm install
pnpm dev:api            # wrangler dev
pnpm dev:mobile         # expo start
pnpm typecheck          # semua workspace
pnpm lint               # biome check
pnpm lint:fix           # biome check --write
pnpm test               # semua workspace

pnpm --filter @pjok/api db:generate     # buat migrasi drizzle
pnpm --filter @pjok/api db:migrate:local
pnpm --filter @pjok/api db:seed:local
pnpm --filter @pjok/api deploy
```

Definisi script ini dibuat di task 0.3 dan 0.4. Jika script berbeda di repo, **ikuti package.json**, dan perbaiki dokumen ini.

## 5. Aturan domain (tidak bisa dinegosiasikan)

1. **Skoring itu murni dan milik server.** Semua matematika nilai ada di `packages/shared/src/scoring`, fungsi murni tanpa I/O, tanpa `Date.now()`.
2. **Server menghitung ulang.** Mobile boleh menampilkan preview, tetapi `assessment_results.final_score` selalu dihitung ulang di API saat finalize. Jangan pernah mempercayai nilai final dari client.
3. **Ambang kategori tidak boleh hardcode di UI.** Kategori (`Sangat Baik`/`Baik`/`Cukup`/`Perlu Bimbingan`) berasal dari konfigurasi instrumen di katalog dan disimpan sebagai snapshot saat asesmen dibuat.
4. **Nilai mentah vs nilai 0–100.** Simpan nilai mentah (mis. detik, cm, meter, repetisi) di `assessment_scores.raw_value`, dan nilai ternormalisasi 0–100 di `normalized_value`. Konversi memakai tabel norma instrumen.
5. **Pembulatan**: 2 desimal, half-up, hanya di helper `roundScore()`. Jangan pakai `toFixed` liar di tempat lain.
6. **Instrumen punya sumber.** Setiap instrumen wajib punya `sources[]` (sitasi penelitian/dokumen resmi) dan field `assessesProcess`/`assessesProduct`. Instrumen tanpa sumber tidak boleh masuk katalog.
7. **Snapshot, bukan referensi hidup.** Saat asesmen dibuat, simpan salinan indikator + bobot + ambang ke DB agar nilai lama tidak berubah ketika katalog diperbarui.
8. **Asesmen final bersifat immutable.** Perubahan hanya lewat `reopen` yang tercatat di `audit_logs` (siapa, kapan, alasan).
9. **Data peserta didik = PII.** Jangan pernah menulis nama/NIS ke log, pesan error, atau analytics. Jangan kirim PII ke layanan pihak ketiga.
10. **Zona waktu**: simpan timestamp ISO 8601 UTC; tampilkan dalam `Asia/Jakarta`. Tanggal asesmen adalah `date` (YYYY-MM-DD), bukan timestamp.

## 6. Konvensi backend

- Route Hono dipecah per domain di `src/routes/*.ts`, dipasang di `src/index.ts` dengan prefix `/v1`.
- Semua body/query/params divalidasi Zod sebelum handler. Handler tidak boleh parsing mentah.
- Bentuk respons sukses: `{ data: T, meta?: {...} }`. Error: `{ error: { code, message, details? } }` dengan HTTP status yang benar. `message` berbahasa Indonesia.
- Kode error stabil dalam `SCREAMING_SNAKE_CASE` (mis. `INVALID_CREDENTIALS`, `CLASS_NOT_FOUND`, `ASSESSMENT_FINALIZED`).
- Autentikasi lewat middleware; otorisasi kepemilikan (teacher vs resource) lewat helper eksplisit, bukan pengecekan ad-hoc di tiap handler.
- Migrasi: **jangan pernah** mengubah migrasi yang sudah di-apply. Tambah migrasi baru. Nama file `NNNN_snake_case.sql` dikelola drizzle-kit.
- Query D1: selalu lewat Drizzle. Untuk operasi multi-tabel pakai `db.batch()`; jangan mengandalkan transaksi interaktif.
- Pagination: `page` (1-based) + `perPage` (default 20, max 100), respons menyertakan `meta.total`.
- Password: PBKDF2-SHA256 100.000 iterasi (batas WebCrypto Cloudflare Workers), salt 16 byte acak, perbandingan constant-time. Simpan sebagai `pbkdf2_sha256$iters$salt$hash`.
- Access token 15 menit; refresh token 30 hari, disimpan sebagai hash di D1 dan dirotasi saat dipakai. Logout mencabut sesi.
- Rate limit endpoint auth (login, forgot-password) via KV.
- `.dev.vars` untuk secret lokal (tidak di-commit). Secret produksi via `wrangler secret put`.

## 7. Konvensi mobile

- Routing file-based (expo-router). Grup `(auth)` untuk login/reset, `(app)` untuk area terautentikasi.
- Token disimpan di `expo-secure-store`, bukan AsyncStorage.
- Semua akses API lewat satu client di `src/lib/api.ts` (base URL dari env, refresh otomatis sekali, error ter-normalisasi).
- Data server selalu lewat TanStack Query; jangan `useEffect` fetch manual.
- Setiap layar wajib punya state: loading, kosong, error (dengan tombol coba lagi), dan sukses.
- Komponen dasar (`Button`, `TextField`, `Select`, `Card`, `EmptyState`) dipakai ulang; jangan bikin varian baru per layar.
- Target sentuh minimal 44×44, label aksesibilitas pada kontrol non-teks.
- Draft nilai disimpan lokal (debounce) dan disinkronkan; konflik diselesaikan dengan "server menang" + peringatan ke guru.
- Teks UI Indonesia, nada netral-formal. Tidak ada teks placeholder "Lorem ipsum" yang lolos ke rilis.

## 8. Gaya kode

- TypeScript `strict`. Tidak ada `any` (gunakan `unknown` + narrowing/Zod). Tidak ada `@ts-ignore`.
- Nama file: `kebab-case.ts`; komponen React: `PascalCase.tsx`. Ekspor bernama, hindari default export kecuali file route expo-router.
- Fungsi murni dipisah dari handler/komponen. File > ~300 baris dipecah.
- Komentar hanya untuk "mengapa", bukan "apa". Jangan menambah komentar dekoratif.
- Error harus actionable; jangan menelan error diam-diam.
- Format & lint ditentukan Biome; jangan berdebat manual.

## 9. Selesai berarti (Definition of Done)

- [ ] Task terkait di `task.md` dicentang.
- [ ] `pnpm typecheck` dan `pnpm lint` bersih untuk workspace yang disentuh.
- [ ] Test baru/terupdate lulus (`pnpm test`), termasuk happy path + minimal satu kasus gagal.
- [ ] Perubahan skema DB disertai migrasi baru + seed/backfill bila perlu.
- [ ] Kontrak API berubah? `docs/api.md` diperbarui pada perubahan yang sama.
- [ ] Tidak ada secret, token, atau PII di diff maupun log.

## 10. Git

- Jangan commit, push, atau membuat PR kecuali user meminta eksplisit.
- Jika diminta commit: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), pesan singkat, sertakan ID task (mis. `feat(api): impor siswa dari Excel (3.7)`).
- Jangan pernah `git reset --hard`, `git clean`, atau force push di repo ini tanpa izin.
