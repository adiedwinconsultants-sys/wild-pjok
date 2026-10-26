# Model data

Cloudflare D1 (SQLite) via Drizzle. Semua timestamp ISO 8601 UTC; tanggal asesmen adalah `date` `YYYY-MM-DD`.

## ERD ringkas

```
users 1─* sessions
users 1─* password_resets
users 1─* classes 1─* students
users 1─* assessments *─1 classes
assessments *─1 instruments (snapshot disimpan di assessments)
assessments 1─* assessment_scores *─1 students
assessments 1─* assessment_results *─1 students
assessment_results 1─1 assessment_feedback
users 1─* export_jobs
users 1─* audit_logs
```

## Tabel

| Tabel | Isi & invariant |
| --- | --- |
| `users` | Guru/admin; email unik; `password_hash` format `pbkdf2_sha256$iters$salt$hash`; `role` default `teacher` |
| `sessions` | Refresh token opaque (hash SHA-256 unik), `expires_at`, `revoked_at`; cascade dari user |
| `password_resets` | Token hash unik, sekali pakai (`used_at`), kedaluwarsa 15 menit |
| `classes` | Milik guru; unik `(teacher_id, name, academic_year)`; hapus ditolak bila ada asesmen final |
| `students` | Milik guru dan kelas; unik `(class_id, nis)`; PII; hapus ditolak bila sudah punya hasil |
| `instruments` | Katalog global; unik `(slug, version)`; `payload_json` berisi instrumen lengkap |
| `assessments` | Draft/final/reopened; snapshot `instrument_snapshot_json` + `participant_ids_json`; `date`, `finalized_at`, `reopened_at` |
| `assessment_scores` | Satu baris per `(assessment, student, indicator)`; `raw_value`, `normalized_value`, `kind` |
| `assessment_results` | Satu baris per `(assessment, student)`; proses/produk/final/kategori; immutable saat final |
| `assessment_feedback` | Satu baris per result; catatan maks 2000 karakter |
| `export_jobs` | Status `processing`/`completed`/`failed`; `r2_key`; pemilik guru |
| `audit_logs` | Aksi seperti reopen: aktor, entitas, payload alasan, waktu |

## Index

`students(class_id)`, `students(teacher_id)`, `classes(teacher_id)`, `assessments(teacher_id, date)`, `assessments(class_id)`, `assessment_scores(assessment_id)`, `assessment_results(assessment_id)`, `sessions(user_id)`, `password_resets(user_id)`.

## Invariant penting

1. **Snapshot, bukan referensi hidup.** Asesmen menyalin indikator, bobot, norma/rubrik, ambang, dan sumber. Perubahan katalog tidak mengubah hasil lama.
2. **Server menghitung ulang.** `final_score` dan kategori hanya ditulis server dari snapshot.
3. **Final immutable.** Skor tidak dapat diubah saat `finalized`; hanya lewat `reopen` yang menulis `audit_logs` dan mengubah status menjadi `reopened`.
4. **Kepemilikan.** Semua query guru difilter `teacher_id`; resource guru lain → 403.
5. **PII.** Nama/NIS tidak boleh masuk log, pesan error, atau analytics. Log hanya method/path/status/duration/requestId.
6. **Peserta.** `participant_ids_json` membatasi siswa yang dinilai pada asesmen tersebut; validasi saat pembuatan memastikan siswa milik kelas.
7. **Migrasi append-only.** Migrasi yang sudah diterapkan tidak boleh diubah; perubahan skema membuat migrasi baru.

Migrasi `0003_assessment_mutation_guard.sql` menambah `assessments.mutation_version` (default kosong, tanpa backfill khusus). Simpan nilai mengganti versi dalam batch yang sama; finalisasi melakukan compare-and-set dan insert hasil bersyarat dengan token versi baru. Trigger menolak insert/update/delete skor final, penghapusan asesmen final/reopened, dan penghapusan siswa yang masih menjadi peserta. Cascade kelas yang hanya berisi draf tetap diizinkan. Reopen mengubah versi dan menulis audit bersyarat dalam satu batch.
