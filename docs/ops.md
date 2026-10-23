# Operasi & deploy

## Lingkungan

| Lingkungan | Worker env | D1 | R2 | KV |
| --- | --- | --- | --- | --- |
| lokal | default | `pjok` (local) | `pjok-exports` (local) | `RATE_LIMIT` (local) |
| staging | `--env staging` | `pjok-staging` | `pjok-exports-staging` | namespace staging |
| production | `--env production` | `pjok-production` | `pjok-exports-production` | namespace production |

`apps/api/wrangler.jsonc` memuat placeholder `database_id` dan KV `id`. Ganti dengan ID nyata sebelum deploy.

## Prasyarat deploy

```bash
pnpm --filter @pjok/api exec wrangler login
pnpm --filter @pjok/api exec wrangler whoami
```

### 1. Buat resource (sekali per lingkungan)

```bash
cd apps/api
wrangler d1 create pjok-staging
wrangler d1 create pjok-production
wrangler r2 bucket create pjok-exports-staging
wrangler r2 bucket create pjok-exports-production
wrangler kv namespace create RATE_LIMIT --env staging
wrangler kv namespace create RATE_LIMIT --env production
```

Salin `database_id` dan KV `id` ke `wrangler.jsonc`.

### 2. Secret

```bash
# minimal 32 byte acak, berbeda per lingkungan
wrangler secret put JWT_SECRET --env staging
wrangler secret put JWT_SECRET --env production
```

Secret tidak pernah masuk repo. `.dev.vars` hanya untuk lokal dan sudah di-ignore.

### 3. Migrasi

```bash
wrangler d1 migrations apply pjok-staging --remote --env staging
wrangler d1 migrations apply pjok-production --remote --env production
```

Migrasi bersifat append-only. Jangan mengedit migrasi yang sudah diterapkan.

### 4. Seed katalog

```bash
pnpm --filter @pjok/api db:seed:local   # regenerasi catalog.sql + lokal
wrangler d1 execute pjok-staging --remote --env staging \
  --file=src/db/seed/catalog.sql
wrangler d1 execute pjok-production --remote --env production \
  --file=src/db/seed/catalog.sql
```

Seed demo hanya untuk QA lokal, jangan ke production.

### 5. Deploy

```bash
# staging
wrangler deploy --env staging
# smoke test: health, login, CRUD kelas, finalisasi
wrangler deploy --env production
```

Verifikasi CORS: set `CORS_ORIGIN` sesuai origin aplikasi; untuk mobile Bearer token tidak memerlukan credentials. Custom domain diatur di dashboard Cloudflare.

### Deploy lewat integrasi Git Cloudflare Workers Builds

Workers Builds menjalankan build dan deploy dari root repo. Karena Worker berada di
`apps/api`, jangan biarkan perintah deploy default `npx wrangler deploy` berjalan di root
(akan gagal dengan pesan "application detection logic ... root of a workspace"). Atur di
dashboard Cloudflare → Worker → Settings → Build:

| Pengaturan | Nilai |
| --- | --- |
| Build command | `pnpm install --frozen-lockfile` |
| Deploy command | `cd apps/api && npx wrangler deploy` |

Alternatif yang setara: gunakan workflow manual `.github/workflows/deploy-api.yml`
(`workflow_dispatch`) yang sudah menetapkan `working-directory: apps/api`.

Pastikan `database_id` D1 dan `id` KV di `apps/api/wrangler.jsonc` sudah berisi ID nyata
sebelum deploy; placeholder nol akan ditolak Cloudflare.

## Rollback

1. Deploy versi sebelumnya dari commit/tag yang diketahui baik:
   ```bash
   git checkout <tag-atau-commit>
   pnpm install --frozen-lockfile
   wrangler deploy --env production
   ```
2. Jangan rollback migrasi dengan menghapus tabel. Jika perubahan skema bermasalah, buat migrasi koreksi baru.
3. Pulihkan data dari backup bila perlu (lihat bawah), lalu deploy ulang worker yang cocok.

## Backup & restore D1

Backup manual:

```bash
wrangler d1 export pjok-production --remote --output=backup-pjok-$(date +%F).sql
wrangler r2 object put pjok-backups/backup-pjok-$(date +%F).sql \
  --file=backup-pjok-$(date +%F).sql
```

Restore (hati-hati, tulis ke database kosong/terpisah lebih dulu):

```bash
wrangler d1 execute pjok-production --remote --file=backup-pjok-YYYY-MM-DD.sql
```

Jadwalkan backup harian di CI/cron eksternal. Scheduled handler worker saat ini hanya membersihkan ekspor R2 > 30 hari; backup otomatis belum aktif sampai kredensial tersedia.

## Rotasi secret

1. Buat `JWT_SECRET` baru (≥ 32 byte acak).
2. `wrangler secret put JWT_SECRET --env production`.
3. Semua access token lama langsung invalid; pengguna melakukan login ulang. Refresh token di D1 tetap valid sampai kedaluwarsa/rotasi.
4. Catat waktu rotasi di changelog operasional.

## Observability

- `wrangler tail --env production` untuk log realtime.
- Log terstruktur: `level`, `requestId`, `method`, `path`, `status`, `durationMs`, `env`. Tidak ada nama/NIS/email.
- `observability.enabled: true` di `wrangler.jsonc`.
- Pantau error rate 5xx dan latency p95. Alert dikonfigurasi di dashboard Cloudflare.

## Batas & biaya

- D1: perhatikan rows read/written; list/rekap memakai index dan pagination. Benchmark target p95 < 300 ms untuk 100 siswa.
- R2: ekspor disimpan sementara; cleanup otomatis > 30 hari. Backup menambah storage.
- Worker: CPU rendah karena skoring ringan; PDF/XLSX dibatasi ukuran kelas.
- KV: rate limit dan token reset memakai TTL; key di-hash.

## Insiden umum

| Gejala | Tindakan |
| --- | --- |
| 500 `Konfigurasi environment tidak valid` | Cek binding D1/R2/KV dan `JWT_SECRET` |
| 401 massal setelah deploy | Cek `JWT_SECRET` tidak berubah tak sengaja |
| 403 pada resource sendiri | Cek `teacher_id` dan token user |
| Ekspor gagal | Cek binding R2, ukuran data, lalu `wrangler tail` |
| Migrasi gagal | Jangan edit migrasi lama; buat migrasi baru dan ulangi |
