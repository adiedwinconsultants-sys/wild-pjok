# PJOK Asesmen

Aplikasi asesmen Pendidikan Jasmani, Olahraga, dan Kesehatan untuk guru. Guru mengelola kelas dan peserta didik, memilih instrumen (bola besar, atletik, kebugaran jasmani, TKSI), mengisi skor per indikator, lalu mendapatkan nilai akhir, kategori, rekap, umpan balik, serta ekspor Excel/PDF.

## Prasyarat

- Node.js 22+
- pnpm 12+ (`corepack enable`)
- Akun Cloudflare (untuk deploy) dan Expo/EAS (untuk build perangkat)

## Instalasi

```bash
pnpm install
```

## Menjalankan lokal

```bash
# terminal 1 — API (wrangler dev, http://localhost:8787)
pnpm dev:api

# terminal 2 — mobile (Expo)
pnpm dev:mobile
```

Siapkan `apps/api/.dev.vars` untuk secret lokal:

```
JWT_SECRET=dev-secret-minimal-32-karakter-aman
APP_ENV=local
```

Siapkan `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:8787/v1
```

### Database lokal

```bash
pnpm --filter @pjok/api db:migrate:local
pnpm --filter @pjok/api db:seed          # katalog + data demo
```

Data demo: guru `guru@demo.pjok.id` / `password123`.

## Perintah

| Perintah | Kegunaan |
| --- | --- |
| `pnpm dev:api` | Jalankan Worker lokal |
| `pnpm dev:mobile` | Jalankan Expo |
| `pnpm typecheck` | Typecheck semua workspace |
| `pnpm lint` / `pnpm lint:fix` | Biome check / auto-fix |
| `pnpm test` | Test shared, API, dan mobile |
| `pnpm --filter @pjok/api db:generate` | Buat migrasi Drizzle |
| `pnpm --filter @pjok/api db:migrate:local` | Terapkan migrasi lokal |
| `pnpm --filter @pjok/api db:seed` | Seed katalog + demo |
| `pnpm --filter @pjok/api deploy` | Deploy Worker |
| `pnpm --filter @pjok/api dump-catalog` | Regenerasi JSON katalog |

## Struktur

```
apps/api        Hono + Cloudflare Workers (D1, R2, KV)
apps/mobile     Expo + expo-router + React Native
packages/shared Tipe, schema Zod, katalog instrumen, engine skoring
docs            API, skoring, model data, operasi, penerimaan
```

## Dokumentasi

- [API](docs/api.md)
- [Skoring & laporan](docs/scoring.md)
- [Model data](docs/data-model.md)
- [Operasi & deploy](docs/ops.md)
- [Glosarium domain](CONTEXT.md)
- [Matriks penerimaan](docs/acceptance.md)

## Status

Versi `0.1.0`. Fase 0–6 selesai dan terverifikasi lokal. Deploy Cloudflare/EAS menunggu kredensial lingkungan (lihat `docs/ops.md`).
