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
# terminal 1 - API (wrangler dev, http://localhost:8787)
pnpm dev:api

# terminal 2 - mobile (Expo)
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

Data demo: guru `guru@demo.pjok.id` / `password123`, superadmin `superadmin@demo.pjok.id` /
`password123`, 3 kelas x 30 siswa, 3 asesmen final (TKSI, bola besar, atletik), dan 1 draf
kebugaran jasmani. Halaman **Profil → Kelola pengguna** hanya tampil untuk admin/superadmin.

### WorkOS (opsional)

Registrasi dan login email/password aktif tanpa WorkOS. Untuk mengaktifkan tombol "Lanjutkan
dengan WorkOS", isi `.dev.vars`:

```
WORKOS_CLIENT_ID=client_...
WORKOS_CLIENT_SECRET=sk_...
WORKOS_API_BASE=https://api.workos.com
```

Daftarkan redirect URI di dashboard WorkOS (Authentication → Redirects), mis.
`pjok://auth/callback` untuk development. Bila env kosong, endpoint WorkOS mengembalikan
503 dan tombol disembunyikan di mobile. Login WorkOS membuat akun guru otomatis berdasarkan
email; peran lanjutan diatur superadmin lewat API admin.

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
| `pnpm --filter @pjok/api deploy` | Deploy Worker production |
| `pnpm --filter @pjok/api dump-catalog` | Regenerasi JSON katalog |

## Build APK Android

Build memakai EAS cloud; tidak perlu Android SDK/JDK di mesin lokal.

```bash
cd apps/mobile
npx eas-cli@latest login          # sekali, akun Expo
npx eas-cli@latest init           # sekali, menautkan projectId EAS
npx eas-cli@latest build -p android --profile preview
```

- `preview`: APK internal dengan API staging.
- `production-apk`: APK internal dengan API production.
- `production`: AAB untuk Play Store dengan API production.

Setelah build selesai, unduh APK dari tautan EAS lalu pasang di perangkat
(`adb install <file>.apk` atau buka tautannya langsung di Android).

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
- [Catatan rilis v1.0.0](docs/release-notes-v1.0.0.md)

## Status

API staging dan production sudah ter-deploy di Cloudflare Workers. Build APK menunggu
login akun EAS (lihat bagian Build APK Android).
