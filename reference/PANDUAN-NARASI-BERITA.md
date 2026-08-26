# PANDUAN NARASI BERITA & ARTIKEL KOPSIM MANDIRI
*Rujukan Baku Penulisan dan Pengelolaan Konten Kanal Berita Koperasi Syarikat Islam Mandiri*

---

## 1. STRUKTUR ARTIKEL (Formula Piramida Terbalik — Inti di Depan)

Setiap artikel berita dan warta kegiatan KOPSIM Mandiri wajib disusun dengan formula piramida terbalik:

1. **LEAD (Paragraf 1):**
   - Wajib menjawab unsur **Apa – Kapan – Di mana – Siapa** dalam 1–2 kalimat padat dan informatif.
   - Paragraf ini juga berfungsi sebagai rujukan utama untuk kolom `ringkasan` pada kartu berita di portal publik.

2. **KONTEKS (Paragraf 2):**
   - Menjelaskan urgensi program/kegiatan, latar belakang inisiatif, atau tujuan strategis yang melandasi kegiatan tersebut bagi para anggota dan masyarakat.

3. **KUTIPAN (Paragraf 3, Opsional):**
   - Kutipan dari pimpinan, tokoh, pengurus, mitra kerja, atau perwakilan anggota/nelayan/petani.
   - **ATURAN MUTLAK KUTIPAN:** HARUS memakai format `[ISI: kutipan dari <jabatan/nama>]` jika kutipan asli belum tersedia atau belum diverifikasi.
   - **DILARANG KERAS** mengarang kutipan atas nama orang, pejabat, atau instansi nyata sekecil apa pun.

4. **PENUTUP (Paragraf Terakhir):**
   - Mengaitkan kembali kegiatan/pencapaian dengan misi besar koperasi: penguatan ekonomi umat, kemandirian sektor riil, prinsip keadilan syariah, dan kesejahteraan anggota sebagai penutup emosional yang berbobot.

---

## 2. ATURAN KATEGORI (Pilih Satu, Tidak Boleh Kosong)

| Kode Kategori | Label Kategori | Keterangan & Ruang Lingkup | Syarat Kolom `project_id` |
| :--- | :--- | :--- | :--- |
| `kemitraan` | **Kemitraan Strategis** | Kerja sama dengan pihak eksternal (Kementerian/Pemerintah, BUMN, mitra bisnis swasta, perbankan syariah, penandatanganan MOU). | Opsional / `NULL` |
| `program` | **Program Koperasi** | Inisiatif internal koperasi (pendampingan petani/nelayan, ekspansi rantai pasok, peluncuran produk/layanan baru). | Opsional / `NULL` |
| `dampak` | **Dampak Sosial & Ekonomi** | Cerita dampak nyata, kemaslahatan langsung, dan perubahan sosial ekonomi di wilayah atau komunitas tertentu. | Opsional / `NULL` |
| `update_proyek` | **Update Perkembangan Proyek** | Laporan progres berkala terkait proyek investasi dan unit usaha tertentu (laporan panen, volume tangkapan, pengolahan pabrik, distribusi). | **WAJIB DIISI** (`project_id`) |

---

## 3. GAYA BAHASA & TATA TULIS

- **Formal tapi Hangat:** Berwibawa, lugas, santun, dan membangkitkan optimisme. BUKAN bombastis atau sensasional.
- **Hindari Superlatif Tanpa Bukti Data:** Dilarang menggunakan kata seperti *"terbesar di dunia"*, *"revolusioner"*, *"tak tertandingi"*, dsb., tanpa rujukan data konkret.
- **Angka & Statistik:** Jangan menulis angka/data statistik spesifik kecuali ada sumber resmi. Jika data belum terkonfirmasi, gunakan format `[ISI: angka/data]`.
- **Panjang Ringkasan:** 1–2 kalimat padat, maksimal sekitar 150 karakter.
- **Panjang Konten:** 3–5 paragraf pendek terstruktur, bukan esai akademis atau narasi yang bertele-tele.

---

## 4. ATURAN PLACEHOLDER (KRITIS & BERLAKU SELAMANYA)

1. **Format Standar Wajib:**  
   `[ISI: penjelasan singkat apa yang perlu diisi]`
2. **Cakupan Penggunaan Placeholder:**  
   - Tanggal dan waktu spesifik kegiatan.
   - Nama orang, gelar, atau jabatan narasumber.
   - Kutipan langsung narasumber.
   - Angka tonase, volume hasil panen/tangkapan, persentase, nilai transaksi.
   - Nama instansi dinas/kementerian/perusahaan mitra.
   - Fakta atau data apa pun yang belum dikonfirmasi resmi oleh manajemen KOPSIM Mandiri.
3. **Status Artikel Ber-Placeholder:**  
   - Artikel yang masih memiliki sekurang-kurangnya satu teks `[ISI:` **WAJIB berstatus `'draft'`**, dan **DILARANG KERAS** diterbitkan (`'terbit'`).
   - Sistem CMS admin mengunci tombol **"Terbitkan"** secara otomatis jika placeholder masih terdeteksi.
4. **Prinsip Kejujuran AI & Penulis:**  
   - Asisten AI / Gemini **TIDAK PERNAH** mengisi atau mengganti placeholder ini dengan tebakan atau data karangan sendiri kapan pun dan untuk artikel apa pun.
