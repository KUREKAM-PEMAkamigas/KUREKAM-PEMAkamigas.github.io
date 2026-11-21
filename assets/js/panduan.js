/* KUREKAM · Isi panduan pengisian 10 indikator kesiapan IABEE.
   Langkah dan bukti mengikuti dokumen "Cara Teknis Mencapai 10 Indikator". Penanggung jawab dan waktu adalah usulan
   yang dikunci pada RTM Desember 2026. Contoh hanya memperlihatkan bentuk isian, bukan data prodi. */

export const PRINSIP = 'SIMANTAP memantau dan menampilkan hasil. Pengukuran dilakukan prodi dengan templat baku dan data nilai dari sistem akademik. Prodi mengisi rekap per semester, lalu aplikasi menghitung capaian dan menandai yang di bawah target. Kriteria dan templat satu untuk semua prodi.';

export const ALUR = [
  ['Rumuskan', 'Kaprodi dan tim kurikulum menyusun PI, pemetaan butir IABEE, dan MK inti di KUREKAM. Desember 2026.'],
  ['Ukur', 'Dosen mengolah nilai CPMK di Excel. Prodi mengisi rekap capaian per angkatan tiap akhir semester. Mulai Januari 2027.'],
  ['Evaluasi', 'Prodi membahas CPL di bawah kriteria dan mencatat tindak lanjut. SPM meninjau.'],
  ['Perbaiki', 'Tindakan diterapkan semester berikutnya, diukur ulang, dan dilaporkan di RTM.']
];

export const PERAN_ISI = [
  ['Kaprodi dan Sekprodi', 'Menyusun PI dan pemetaan, menandai MK inti, mengisi rekap capaian, data capstone, dan tindak lanjut', '1, 2, 3, 4, 5, 7, 10'],
  ['SPM', 'Menyediakan templat dan kriteria, meninjau lintas prodi, memantau kelayakan dokumen', '1, 3, 4, 7, 9'],
  ['Wakil Direktur I', 'Menetapkan SK pemetaan dan kriteria, memutuskan usulan revisi, memantau kelima prodi', '2, 4, 7'],
  ['Subbagian Akademik', 'Menyediakan data kelulusan dan ekspor nilai, melengkapi data dosen', '3, 6, 10'],
  ['CDC', 'Menjalankan tracer dan survei pengguna lulusan, menyerahkan jumlah responden', '8'],
  ['Bisnis dan kerja sama', 'Menyediakan mitra industri untuk proyek capstone', '5']
];

/* menu: id rute KUREKAM yang dipakai mengisi; nama: label menu */
export const PANDUAN = [
  { no: 1, menu: 'pi', nama: 'Menu Indikator Kinerja (PI)', pj: 'Kaprodi dan tim kurikulum; SPM meninjau. Selesai Desember 2026',
    tujuan: 'Memastikan setiap CPL punya indikator yang dapat diamati, dan indikator itu diukur lewat CPMK mata kuliah inti.',
    langkah: ['Tetapkan daftar mata kuliah inti per prodi dari matriks CPL dan mata kuliah. Tandai di menu Mata Kuliah & SKS, kolom Inti.', 'Rumuskan 2 sampai 4 PI per CPL, berupa perilaku yang dapat diamati, di menu Indikator Kinerja (PI).', 'Hubungkan setiap PI ke CPMK mata kuliah inti yang sudah ada.', 'Pastikan setiap CPMK punya instrumen penilaian dan bobot di RPS.', 'SPM meninjau lintas prodi.'],
    bukti: 'Tabel CPL, PI, CPMK, dan instrumen per prodi.',
    contoh: ['CPL P2: Menganalisis prinsip kerja peralatan dan proses dalam operasi produksi.', 'PI P2.1: Menjelaskan prinsip kerja peralatan utama dengan benar (C2).', 'PI P2.2: Menganalisis data kinerja peralatan untuk menentukan penyebab penyimpangan (C4).', 'CPMK pada MK inti yang mengukur P2.2: Mahasiswa mampu menganalisis data kinerja pompa. Instrumen: ujian praktik dengan rubrik.'],
    nilai: 'Persentase CPL yang sudah punya PI dan persentase MK inti yang seluruh CPMK-nya terhubung ke PI. Dipakai yang terendah.' },
  { no: 2, menu: 'cpl', nama: 'Menu CPL atau Matriks Keterlacakan, tab CPL × butir IABEE', pj: 'Kaprodi dan Wakil Direktur I. Desember 2026',
    tujuan: 'Menunjukkan bahwa seluruh butir kompetensi lulusan IABEE (a) sampai (k) tercakup oleh CPL kurikulum.',
    langkah: ['Ambil daftar butir (a) sampai (k) dari buku kriteria IABEE yang ada di Drive.', 'Petakan tiap CPL ke satu atau lebih butir pada formulir CPL atau tab CPL × butir IABEE.', 'Bila ada butir yang belum tercakup, tambahkan PI atau CPMK, bukan CPL baru, agar kurikulum tidak berubah.', 'Tetapkan pemetaan dengan SK Direktur dan cetak matriksnya dari menu Kesiapan IABEE.'],
    bukti: 'Matriks CPL ke butir IABEE dan SK penetapan.',
    contoh: ['CPL tentang tanggung jawab dan etika profesi dipetakan ke butir (g).', 'CPL tentang menganalisis permasalahan teknis dipetakan ke butir (b).', 'CPL tentang merancang perbaikan atau sistem dipetakan ke butir (c) dan (j).', 'Bila tidak ada CPL yang mencakup butir (e), buat PI atau CPMK pada MK yang memakai perangkat lunak atau pemodelan.'],
    nilai: 'Jumlah butir yang tercakup dan jumlah CPL yang sudah diberi butir. Dipakai yang terendah.' },
  { no: 3, menu: 'capaian', nama: 'Menu Capaian CPL & Tindak Lanjut', pj: 'Kaprodi dan dosen pengampu; templat dari SPM. Mulai Januari 2027',
    tujuan: 'Memiliki data capaian tiap CPL untuk setiap angkatan, dari nilai CPMK yang sudah ada.',
    langkah: ['Ekspor nilai per mahasiswa per CPMK dari sistem akademik atau rekap dosen. Data ini tetap di Excel prodi.', 'Hitung di Excel: nilai CPMK, lalu nilai PI (rata-rata terbobot), lalu nilai CPL.', 'Hitung berapa mahasiswa yang dinilai dan berapa yang mencapai nilai batas pada tiap CPL.', 'Isi atau impor angka rekap itu di menu Capaian CPL & Tindak Lanjut pada akhir semester.', 'Angkatan 2022 diukur mundur hanya bila nilai per CPMK masih tersimpan.'],
    bukti: 'Rekap CPL per angkatan per semester.',
    contoh: ['Angkatan 2024, CPL P2: 30 mahasiswa dinilai, 24 mencapai nilai batas.', 'Yang diisi di KUREKAM hanya dua angka itu. Nama, NIM, dan nilai per mahasiswa tidak dimasukkan.'],
    nilai: 'Jumlah CPL yang punya rekap capaian dibagi seluruh CPL prodi.' },
  { no: 4, menu: 'capaian', nama: 'Menu Capaian CPL & Tindak Lanjut', pj: 'Kaprodi dan SPM. Hasil pertama Juni 2027, lalu tiap semester',
    tujuan: 'Mengetahui CPL mana yang memenuhi kriteria ketercapaian dan mana yang perlu diperbaiki.',
    langkah: ['Tetapkan kriteria ketercapaian dengan SK, satu kriteria untuk semua prodi (usulan: minimal 70% mahasiswa bernilai minimal 60). Parameternya ada di Data Induk.', 'Aplikasi menghitung persentase mahasiswa yang memenuhi tiap CPL.', 'Tandai CPL yang di bawah kriteria dan bahas dalam rapat prodi.', 'Jadikan hasil pembahasan dasar perbaikan (indikator 7).'],
    bukti: 'Tabel ketercapaian CPL dan daftar CPL di bawah kriteria.',
    contoh: ['24 dari 30 mahasiswa mencapai nilai batas berarti 80%, memenuhi kriteria 70%.', '15 dari 30 berarti 50%, di bawah kriteria dan perlu tindak lanjut.'],
    nilai: 'Dari CPL yang sudah terukur, jumlah yang capaian angkatan terbarunya memenuhi kriteria.' },
  { no: 5, menu: 'lulusan', nama: 'Menu Capstone, Lulusan & Tracer, tab Capstone', pj: 'Kaprodi dan bagian kerja sama untuk mitra industri. Berjalan sepanjang 2027',
    tujuan: 'Mendokumentasikan capstone yang jelas bobotnya, memakai rubrik, dan berangkat dari masalah nyata dengan standar rekayasa.',
    langkah: ['Pastikan bobot Praktik Capstone Design 4 SKS pada kurikulum (semester 6 satu SKS, semester 7 satu SKS, semester 8 dua SKS).', 'Susun rubrik berbasis PI: identifikasi masalah, rancangan, standar, K3, kendala nyata (biaya, lingkungan, keselamatan), dan presentasi.', 'Tiap proyek punya pembimbing dan penguji (SK) dan berasal dari kebutuhan nyata atau mitra industri.', 'Simpan laporan, rubrik terisi, dan nilai per PI di Drive, lalu tempel tautannya.', 'Isi bobot, status rubrik, jumlah proyek, dan jumlah mitra di KUREKAM.'],
    bukti: 'Rubrik, laporan proyek, SK pembimbing dan penguji, daftar proyek dan mitra.',
    contoh: ['Bobot capstone 6 SKS. Rubrik: identifikasi masalah 15%, rancangan 25%, standar dan K3 15%, kendala nyata 15%, hasil 15%, presentasi 15%.', 'Isian KUREKAM: tahun akademik 2026/2027, bobot penilaian 40%, rubrik draf, 3 proyek, 2 mitra.'],
    nilai: 'Empat syarat: MK capstone ada, bobot dicatat, rubrik tersedia, dan proyek nyata tercatat.' },
  { no: 6, menu: 'lulusan', nama: 'Menu Capstone, Lulusan & Tracer, tab Lulusan dan tracer', pj: 'Subbagian Akademik dan Kaprodi. Desember 2026',
    tujuan: 'Mengetahui berapa lulusan dari kurikulum OBE di tiap prodi, sebagai syarat pendaftaran asesmen.',
    langkah: ['Pastikan tanggal mulai OBE tiap prodi dan angkatan pertama yang mengikuti kurikulum OBE (SK dan Buku Kurikulum).', 'Ambil data kelulusan per tahun dari Subbagian Akademik.', 'Isi jumlah lulusan dan jumlah lulusan OBE per tahun lulus. Daftar nama disimpan di bagian akademik, bukan di aplikasi.'],
    bukti: 'Rekap angkatan OBE dan jumlah lulusan per prodi.',
    contoh: ['Tahun lulus 2026: 60 lulusan, 60 di antaranya lulusan kurikulum OBE.'],
    nilai: 'Terpenuhi bila prodi sudah punya data lulusan. Ditampilkan jumlah lulusan OBE.' },
  { no: 7, menu: 'capaian', nama: 'Menu Capaian CPL & Tindak Lanjut, tab Tindak lanjut', pj: 'Kaprodi dan SPM. Minimal satu siklus per prodi pilot di 2027',
    tujuan: 'Membuktikan bahwa hasil pengukuran CPL dipakai memperbaiki pembelajaran, lalu diukur ulang.',
    langkah: ['Dalam rapat prodi setiap semester, catat CPL atau PI yang belum tercapai.', 'Tetapkan penyebab dan tindakan: perubahan metode, materi, instrumen, atau urutan mata kuliah.', 'Terapkan di semester berikutnya, ukur ulang, dan nyatakan efektif atau belum pada kolom hasil.', 'Bila tindakan berupa perubahan kurikulum, ajukan sebagai usulan revisi dari catatan itu.', 'Ringkas dalam notulen dan laporan RTM.'],
    bukti: 'Notulen rapat, catatan tindak lanjut, dan hasil ukur ulang.',
    contoh: ['Temuan: CPL P2 angkatan 2024 hanya 50%.', 'Tindakan: menambah praktik terbimbing pada MK inti dan memperbaiki rubrik.', 'Hasil: angkatan 2025 naik menjadi 76%. Status: selesai.'],
    nilai: 'Satu catatan berstatus selesai dihitung satu siklus perbaikan.' },
  { no: 8, menu: 'lulusan', nama: 'Menu Capstone, Lulusan & Tracer, tab Lulusan dan tracer', pj: 'CDC dan Kaprodi. Dasar ukur Januari 2027, target respons minimal 70% (usulan)',
    tujuan: 'Mendapat umpan balik lulusan dan pengguna lulusan untuk memperbaiki kurikulum.',
    langkah: ['CDC memperbarui kuesioner tracer dan survei pengguna agar memuat pertanyaan per butir kompetensi IABEE.', 'Sebar lewat formulir daring dan kontak alumni serta mitra industri.', 'Tindak lanjuti responden yang belum menjawab.', 'Olah hasil per prodi, serahkan ke Kaprodi, dan isi jumlah responden di KUREKAM.'],
    bukti: 'Laporan tracer dan survei pengguna per prodi.',
    contoh: ['100 lulusan, 80 responden tracer (80%), 75 responden survei pengguna (75%). Keduanya di atas 70%.'],
    nilai: 'Responden tracer dan responden pengguna dibagi jumlah lulusan. Dipakai yang terendah, target minimal 70%.' },
  { no: 9, menu: null, nama: 'SIMANTAP (daftar periksa dokumen)', pj: 'SPM dan Kaprodi prodi pilot. Maret 2028, sebelum registrasi April 2028',
    tujuan: 'Memastikan dokumen kelayakan dan laporan evaluasi diri lengkap sebelum mendaftar.',
    langkah: ['Unduh daftar syarat kelayakan RPEA 2026 (9 butir) dan templat laporan evaluasi diri dari Drive.', 'Buat daftar periksa per butir dengan penanggung jawab dan tenggat di SIMANTAP.', 'Kumpulkan bukti dari indikator 1 sampai 8, yang sebagian besar tersedia dari KUREKAM.', 'Tulis laporan evaluasi diri prodi pilot dan telaah oleh SPM sebelum mendaftar.'],
    bukti: 'Daftar periksa dan draf laporan evaluasi diri.',
    contoh: ['Butir: bukti kurikulum OBE berjalan. Bukti: SK dan Buku Kurikulum. Penanggung jawab: Kaprodi. Tenggat: Januari 2028. Status: lengkap.'],
    nilai: 'Dipantau lewat daftar periksa di SIMANTAP, bukan dihitung di KUREKAM.' },
  { no: 10, menu: 'induk', nama: 'Data Induk, tab Dosen, dan formulir Mata Kuliah', pj: 'Subbagian Akademik dan Kaprodi. Triwulan I 2027, diperbarui tiap tahun',
    tujuan: 'Memastikan mata kuliah inti diampu dosen yang kompetensinya sesuai.',
    langkah: ['Dari daftar mata kuliah inti, lihat dosen pengampu dan latar bidang S1 sampai S3 serta sertifikasinya.', 'Isi kata kunci kompetensi pada formulir mata kuliah inti.', 'Cocokkan dengan kebutuhan CPMK. KUREKAM mencocokkan otomatis dengan bidang dan sertifikasi dosen.', 'Bila ada MK inti tanpa dosen yang sesuai, rencanakan pelatihan, sertifikasi, atau rekrutmen.', 'Data dosen tidak memuat NIP di panel kecocokan dan tanpa data pribadi lain.'],
    bukti: 'Tabel dosen pengampu dan kecukupan kompetensi.',
    contoh: ['MK inti Teknik Reservoir. Kata kunci: reservoir, petrofisika. Dosen pengampu: S2 Teknik Perminyakan dengan sertifikasi terkait. Hasil: sesuai.'],
    nilai: 'Jumlah MK inti yang punya pengampu dengan bidang atau sertifikasi cocok kata kunci, dibagi seluruh MK inti.' }
];
