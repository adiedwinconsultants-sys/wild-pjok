# Glosarium domain

- **Asesmen**: kegiatan penilaian satu kelas pada satu tanggal dengan satu instrumen. Status: `draft`, `finalized`, `reopened`.
- **Instrumen**: paket penilaian berisi tujuan, prosedur, indikator, norma/rubrik, ambang kategori, dan sumber. Diidentifikasi `slug` + `version`.
- **Indikator**: butir terukur dalam instrumen (mis. sit-up 60 detik). Memiliki satuan, jenis (`process`/`product`), bobot, dan arah nilai.
- **Proses**: aspek teknik/sikap yang dinilai dengan rubrik.
- **Produk**: capaian terukur (detik, cm, meter, repetisi) yang dinormalkan.
- **Nilai mentah**: angka yang dicatat guru (`raw_value`).
- **Nilai ternormalisasi**: hasil konversi 0–100 (`normalized_value`).
- **Norma**: tabel titik `raw → score` per jenis kelamin dan kelompok usia, diinterpolasi linear.
- **Rubrik**: band rentang nilai mentah dengan poin dan deskripsi.
- **Ambang kategori**: batas nilai untuk `Sangat Baik`, `Baik`, `Cukup`, `Perlu Bimbingan`.
- **Snapshot**: salinan instrumen yang disimpan saat asesmen dibuat agar hasil lama tidak berubah.
- **Finalisasi**: proses server menghitung ulang dan mengunci hasil.
- **Reopen**: membuka asesmen final dengan alasan wajib; tercatat di audit log.
- **Rekap**: agregat kelas (rata-rata, min, max, distribusi, daftar siswa).
- **Umpan balik**: catatan guru per siswa pada hasil asesmen.
- **TKSI**: Tes Kebugaran Siswa Indonesia, sumber norma dan komponen kebugaran pada katalog.
- **PII**: data pribadi peserta didik (nama, NIS, tanggal lahir) yang tidak boleh masuk log/analytics.
