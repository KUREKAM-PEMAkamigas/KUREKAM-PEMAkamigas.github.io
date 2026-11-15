# KUREKAM PEM Akamigas

Kurikulum, Rancang, Evaluasi, Kawal Mutu. Aplikasi web statis untuk menyusun kurikulum OBE lima prodi sarjana terapan, dari visi sampai RPS dan SAP, lengkap dengan beban dosen riil dan beban prodi.

## Memasang di GitHub Pages
1. Buat repositori baru, misalnya `kurekam`, di akun atau organisasi yang sama dengan SIMANTAP.
2. Unggah seluruh isi folder ini (index.html dan folder assets) ke cabang utama.
3. Buka Settings, Pages, pilih cabang utama dan folder root, lalu simpan.
4. Aplikasi terbuka di `https://<nama-akun>.github.io/kurekam/`.

## Basis data
- Tanpa pengaturan, aplikasi berjalan dalam mode lokal: data tersimpan di peramban masing-masing.
- Untuk data bersama, masuk sebagai Admin, buka Data Induk & Pengaturan, tab Basis data, lalu tempel konfigurasi Web App Firebase milik SIMANTAP. Koleksi KUREKAM berawalan `kur_`.
- Konfigurasi permanen dapat ditulis di `assets/js/config.js`.

## Data awal
- Rancangan baru berisi data contoh yang mengikuti kerangka Buku Pedoman 2027. Ganti lewat impor Matriks_Kurikulum_D4_PEM_Akamigas.xlsx.
- Kurikulum berjalan (395 MK) dimigrasikan dari Dashboard Evaluasi Beban Perkuliahan dan dapat diganti lewat impor lembar DATA.

## Data dosen dan penugasan (Excel)

Menu **Data Induk & Pengaturan > Impor & ekspor**:

- **Impor data dosen**: membaca berkas DUK (lembar "DOSEN PER PRODI") atau Template_Dosen.xlsx. Hanya nama, NIP, NIDN, jabatan, pendidikan, bidang ilmu, dan prodi yang dibaca. Kolom pribadi (NIK, telepon, tanggal lahir, keluarga, gaji) tidak dibaca dan tidak disimpan. Berkas diproses di peramban, tidak dikirim ke mana pun.
- **Impor penugasan**: dosen dapat mengampu MK di prodi mana pun (dosen milik UPPS). Homebase hanya penanda asal.
- Jangan menaruh berkas DUK di repositori ini. Data dosen tersimpan di peramban (mode lokal) atau Firestore bila dihubungkan.

## Kesiapan IABEE (Tahap 1, November 2026)
- Koleksi baru `kur_pi`: indikator kinerja (PI) per CPL `{id, prodi, cpl, kode, teks, cpmk[], minPersen, minNilai}`. Kriteria bawaan 70% mahasiswa bernilai minimal 60 (Data Induk > parameter).
- `cpl.iabee` kini daftar huruf butir (a) sampai (k) sesuai templat evaluasi diri IABEE 2024 (Sydney Accord). Data lama berbentuk teks tetap terbaca lewat `iabeeOf()`.
- `mk.inti` (boolean) menandai mata kuliah inti untuk asesmen CPL.
- Menu baru: Indikator Kinerja (PI) dan Kesiapan IABEE (10 indikator; tanpa data ditampilkan "Belum diukur"). Matriks Keterlacakan punya tab CPL × butir IABEE. Pemeriksa Kurikulum punya kelompok aturan Kesiapan IABEE.
- Versi seed tidak dinaikkan agar data riil di Firestore tidak tertimpa.

## Kesiapan IABEE, Tahap 2

- Menu **Capaian CPL & Tindak Lanjut**: rekap agregat per CPL dan angkatan (jumlah dinilai, jumlah mencapai nilai batas), templat dan impor Excel, serta catatan tindak lanjut yang bisa diajukan sebagai usulan revisi. Koleksi `kur_capaian` dan `kur_tl`. Tanpa nama, NIM, atau nilai per mahasiswa.
- Dosen: bidang S1, S2, S3 dan sertifikasi (formulir dosen dan templat impor). MK: kata kunci kompetensi untuk MK inti. Kecocokan tampil di menu Kesiapan IABEE tanpa NIP.
- Indikator 3, 4, 7, dan 10 kini dihitung otomatis. Tidak ada perubahan seedVersi dan aturan Firestore.

## Kesiapan IABEE, Tahap 3

- Menu **Capstone, Lulusan & Tracer** (prodi, Wadir, SPM, Akademik): dokumentasi capstone (bobot, rubrik, proyek nyata, tautan Drive) dan angka lulusan OBE, responden tracer, dan responden survei pengguna per tahun lulus, dengan templat dan impor Excel. Koleksi `kur_capstone` dan `kur_lulusan`. Tanpa nama, NIM, atau nama mitra.
- Indikator 5, 6, dan 8 dihitung otomatis. Indikator 9 tetap dipantau di SIMANTAP.
- Menu Kesiapan IABEE: kartu **Ekspor triwulan untuk SIMANTAP** (JSON dan Excel, angka agregat 10 indikator per prodi, kunci `iabee_01` sampai `iabee_10`).

## Panduan 10 indikator

Menu **Panduan 10 Indikator**: prinsip, alur empat langkah, pembagian peran, dan kartu tiap indikator (tujuan, langkah, contoh bentuk isian, bukti, penanggung jawab usulan, cara aplikasi menilai, status prodi saat ini). Isi ada di `assets/js/panduan.js`. Butir kompetensi lulusan IABEE kini sepuluh (a sampai j).

## Sinkron otomatis dengan SIMANTAP
KUREKAM menulis ringkasan 10 indikator IABEE per prodi ke koleksi `kur_umpan` (satu dokumen per prodi, id = kode prodi), otomatis beberapa detik setelah data tersimpan, dan lewat tombol "Kirim sekarang" di menu Kesiapan IABEE. SIMANTAP membacanya. Temuan AMI di koleksi `indikator` SIMANTAP dibaca balik di menu yang sama. Aturan Firestore harus mengizinkan pengguna masuk membaca dan menulis `kur_umpan`.
