/* ============================================================
   KUREKAM PEM Akamigas · Konfigurasi
   Kurikulum · Rancang · Evaluasi · Kawal Mutu
   ------------------------------------------------------------
   1) FIREBASE: kosongkan agar memakai database lokal peramban
      (mode demo). Untuk basis data bersama, isi dengan konfigurasi
      Web App proyek Firebase yang sama dengan SIMANTAP. Seluruh
      koleksi KUREKAM diberi awalan "kur_" agar tidak bercampur
      dengan koleksi SIMANTAP.
   2) PARAMETER: diambil dari Buku Pedoman Kurikulum Sarjana
      Terapan PEM Akamigas 2027 (draf November 2026). Semua angka
      bisa diubah admin di menu Data Induk & Pengaturan.
   ============================================================ */

export const FIREBASE_CONFIG = {
  apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
};

export const APP = {
  nama: 'KUREKAM',
  panjang: 'Kurikulum · Rancang · Evaluasi · Kawal Mutu',
  institusi: 'PEM Akamigas · BPSDM KESDM',
  tahunKurikulum: 2027,
  tahunAkademik: '2027/2028',
  seedVersi: 4,
  dataContoh: true
};

/* Kelompok mata kuliah: durasi 1 SKS praktik (menit) dan pemetaan kategori IABEE bawaan. */
export const KELOMPOK = [
  { id: 'MKU - wajib kurikulum', g: 'MKU', iabee: 'Pendidikan umum' },
  { id: 'MKU - institusi', g: 'MKU', iabee: 'Pendidikan umum' },
  { id: 'MBS - matematika dan sains dasar', g: 'MBS', iabee: 'Matematika dan ilmu alam' },
  { id: 'MBS - sains penciri', g: 'MBS', iabee: 'Matematika dan ilmu alam' },
  { id: 'MBE - basic engineering', g: 'MBE', iabee: 'Muatan spesifik' },
  { id: 'MKK - K3', g: 'MKK', iabee: 'Muatan spesifik' },
  { id: 'MKK - kompetensi penciri', g: 'MKK', iabee: 'Muatan spesifik' },
  { id: 'MKK - pendukung', g: 'MKK', iabee: 'Muatan spesifik' },
  { id: 'MKK - capstone', g: 'MKK', iabee: 'Muatan spesifik' },
  { id: 'MKK - magang', g: 'MKK', iabee: 'Muatan spesifik' },
  { id: 'MKK - tugas akhir', g: 'MKK', iabee: 'Muatan spesifik' }
];
export const GRUP = {
  MKU: { nama: 'Mata Kuliah Wajib (MKW)', c: '#f5a524' },
  MBS: { nama: 'Basic Science (MKBS)', c: '#0ea5e9' },
  MBE: { nama: 'Basic Engineering (MKBE)', c: '#8b5cf6' },
  MKK: { nama: 'Kompetensi (MKKK)', c: '#10b981' }
};
/* Pemetaan kode prodi KUREKAM ke unit SIMANTAP bila berbeda. Kosong karena keduanya memakai LG. */
export const UNIT_SIMANTAP = {};
export const KAT_IABEE = ['Pendidikan umum', 'Matematika dan ilmu alam', 'Teknologi informasi', 'Muatan spesifik'];

/* Butir kompetensi lulusan (a) sampai (k), Kriteria IABEE 1.2.2 (items (a) to (k)), untuk program teknologi rekayasa
   (Sarjana Terapan/D-IV, Sydney Accord), templat evaluasi diri 2024. */
export const BUTIR_IABEE = [
  { k: 'a', ringkas: 'Penerapan matematika, sains, komputasi, dan ilmu rekayasa', teks: 'Kemampuan mengidentifikasi dan menerapkan pengetahuan matematika, ilmu pengetahuan alam, komputasi, dasar-dasar rekayasa, dan ilmu rekayasa khusus sesuai disiplinnya terhadap prosedur, proses, sistem, atau metodologi rekayasa terapan.' },
  { k: 'b', ringkas: 'Analisis masalah rekayasa', teks: 'Kemampuan mengidentifikasi, merangkum, merumuskan, mengkaji literatur, dan menganalisis permasalahan rekayasa yang terdefinisi secara luas hingga mencapai kesimpulan yang dapat dibuktikan dengan alat analisis yang sesuai.' },
  { k: 'c', ringkas: 'Perancangan sistem, komponen, atau proses', teks: 'Kemampuan merancang sistem, komponen, atau proses untuk menyelesaikan permasalahan rekayasa yang terdefinisi secara luas dengan mempertimbangkan keselamatan dan kesehatan publik, biaya seumur hidup, nol emisi karbon, sumber daya, budaya, sosial, dan lingkungan.' },
  { k: 'd', ringkas: 'Investigasi: data, standar, dan percobaan', teks: 'Kemampuan menemukan, memilih, dan mengolah data dari standar, pangkalan data, dan literatur, serta merencanakan dan melaksanakan percobaan untuk menarik kesimpulan yang sahih.' },
  { k: 'e', ringkas: 'Pemanfaatan sumber daya, teknologi, dan pemodelan', teks: 'Kemampuan menggunakan sumber daya dan teknologi yang diperlukan beserta keterbatasannya, termasuk prediksi dan pemodelan, untuk menyelesaikan permasalahan rekayasa yang terdefinisi secara luas.' },
  { k: 'f', ringkas: 'Dampak terhadap masyarakat, K3, hukum, dan lingkungan', teks: 'Kemampuan menganalisis dan mengevaluasi dampak penyelesaian masalah rekayasa terhadap masyarakat, ekonomi, keberlanjutan, keselamatan dan kesehatan, hukum, dan lingkungan.' },
  { k: 'g', ringkas: 'Etika profesi dan kepatuhan hukum', teks: 'Kemampuan untuk secara konsisten mematuhi etika profesi, norma praktik rekayasa terapan, serta hukum nasional dan internasional, dengan menghormati keberagaman dan inklusivitas.' },
  { k: 'h', ringkas: 'Kerja individu dan tim multidisiplin', teks: 'Kemampuan berfungsi efektif sebagai individu dan sebagai anggota atau pemimpin dalam tim yang beragam, inklusif, dan multidisiplin pada berbagai lingkungan kerja.' },
  { k: 'i', ringkas: 'Komunikasi tertulis, lisan, dan grafis', teks: 'Kemampuan berkomunikasi tertulis, lisan, dan grafis secara efektif dalam kegiatan keteknikan dengan mempertimbangkan perbedaan budaya, bahasa, dan cara belajar.' },
  { k: 'j', ringkas: 'Manajemen proyek rekayasa', teks: 'Kemampuan menerapkan prinsip manajemen rekayasa pada proyek, sebagai anggota maupun pemimpin dalam tim multidisiplin.' },
  { k: 'k', ringkas: 'Belajar sepanjang hayat dan berpikir kritis', teks: 'Kemampuan mengenali kebutuhan serta menjalankan belajar mandiri dan sepanjang hayat, dan berpikir kritis.' }
];

/* Sepuluh indikator kesiapan IABEE. Target bawaan dapat diubah admin di menu Kesiapan IABEE. */
export const INDIKATOR_IABEE = [
  { no: 1, nama: 'Mata kuliah inti dengan PI dan CPMK terpetakan', sumber: 'KUREKAM (PI, CPMK, RPS)', target: 'PI untuk 100% CPL lima prodi, Desember 2026' },
  { no: 2, nama: 'CPL terpetakan ke butir IABEE (a) sampai (k)', sumber: 'KUREKAM (butir IABEE pada CPL)', target: 'Lima prodi terpetakan, Desember 2026' },
  { no: 3, nama: 'CPL yang datanya terukur per angkatan', sumber: 'Rekap agregat dari Excel prodi', target: 'Pengukuran mulai Januari 2027' },
  { no: 4, nama: 'Ketercapaian CPL terhadap kriteria', sumber: 'Rekap agregat dari Excel prodi', target: 'Semua CPL prodi pilot di atas kriteria' },
  { no: 5, nama: 'Capstone: bobot, rubrik, proyek nyata', sumber: 'KUREKAM dan Google Drive', target: 'Terdokumentasi 2027 sampai 2028' },
  { no: 6, nama: 'Jumlah lulusan OBE per prodi', sumber: 'Bagian akademik (agregat)', target: 'Terdata semua prodi' },
  { no: 7, nama: 'Tindak lanjut perbaikan dari hasil CPL', sumber: 'Catatan prodi dan menu Revisi', target: 'Minimal 1 siklus per prodi pilot' },
  { no: 8, nama: 'Tracer dan survei pengguna lulusan', sumber: 'CDC (agregat)', target: 'Respons minimal 70%' },
  { no: 9, nama: 'Kelengkapan dokumen kelayakan dan evaluasi diri', sumber: 'Daftar periksa di SIMANTAP', target: '100% prodi pilot, Maret 2028' },
  { no: 10, nama: 'Kompetensi dosen untuk mata kuliah inti', sumber: 'KUREKAM (dosen dan penugasan)', target: 'Tidak ada mata kuliah inti tanpa dosen sesuai' }
];

export const PARAM_DEFAULT = {
  menitTeori: 60,
  durasiPraktik: { MKU: 120, MBS: 120, MBE: 170, MKK: 170 },
  totalSksMin: 144,
  /* smt: [SKS target, T min, T maks, P min, P maks, MK min, MK maks] (smt 7-8 tanpa rentang T/P) */
  kerangka: {
    1: [20, 13, 15, 5, 7, 9, 12],
    2: [20, 12, 14, 6, 8, 9, 12],
    3: [20, 11, 13, 7, 9, 9, 12],
    4: [20, 10, 12, 8, 10, 9, 12],
    5: [18, 8, 9, 9, 10, 8, 11],
    6: [16, 6, 7, 9, 10, 7, 10],
    7: [20, null, null, null, null, null, null],
    8: [10, null, null, null, null, null, null]
  },
  mkProdiMin: 60, mkProdiMax: 72,
  muatanSpesifikMin: 65, pendidikanUmumMax: 25, matSainsMin: 4,
  praktikMin: 50, praktikMax: 70,
  /* RPS: jumlah pertemuan minimal yang memuat integrasi penelitian atau PKM */
  integrasiMinPertemuan: 2,
  /* PI dan CPL: tercapai bila minimal piMinPersen % mahasiswa bernilai minimal piMinNilai. PI per CPL 2 sampai 4. */
  piMinPersen: 70, piMinNilai: 60, piPerCplMin: 2, piPerCplMax: 4,
  /* Beban dosen: JP total = SKS teori + SKS praktik x (durasi / 60), dikali kelas dan porsi. */
  bebanRiilMin: 9, bebanRiilMax: 16, jpMingguMax: 24
};

export const PERAN = {
  prodi: { nama: 'Prodi', c: '#10b981' },
  dosen: { nama: 'Dosen', c: '#0ea5e9' },
  wadir: { nama: 'Wakil Direktur I', c: '#8b5cf6' },
  spm: { nama: 'SPM', c: '#f0616d' },
  akademik: { nama: 'Kasubbag AK', c: '#f5a524' },
  admin: { nama: 'Admin', c: '#64748b' },
  developer: { nama: 'Developer', c: '#0f172a' }
};
/* Akun developer dikenali dari sidik SHA-256 'kurekam:' + email (huruf kecil), bukan dari alamat emailnya.
   Developer setara admin, selalu bisa masuk walau belum ada di daftar pengguna, dan boleh meninjau tampilan semua peran. */
export const DEVELOPER_SHA = ['f512cb3abb950d4c65241a0fda6c394decc7b29da869d6f51bbe36b9b1804a7b'];

/* Menu yang tampil per peran. null berarti semua menu. Rute di luar daftar dialihkan ke Beranda. */
export const MENU_PERAN = {
  dosen: ['beranda', 'peta', 'cpmk', 'rps', 'realisasi', 'beban', 'bloom'],
  prodi: ['beranda', 'asisten', 'visi', 'cpl', 'pi', 'bk', 'mk', 'peta', 'matriks', 'cpmk', 'rps', 'realisasi', 'beban', 'bebanprodi', 'periksa', 'iabee', 'bahanled', 'generator', 'panduan', 'capaian', 'lulusan', 'skpi', 'advisory', 'bloom', 'revisi', 'laporan'],
  wadir: ['beranda', 'pimpinan', 'mutu', 'akademik', 'pi', 'peta', 'matriks', 'rps', 'realisasi', 'beban', 'bebanprodi', 'periksa', 'iabee', 'bahanled', 'generator', 'panduan', 'capaian', 'lulusan', 'skpi', 'advisory', 'revisi', 'laporan'],
  spm: ['beranda', 'mutu', 'visi', 'cpl', 'pi', 'peta', 'matriks', 'cpmk', 'rps', 'realisasi', 'periksa', 'iabee', 'bahanled', 'generator', 'panduan', 'capaian', 'lulusan', 'skpi', 'advisory', 'bloom', 'revisi', 'laporan'],
  akademik: ['beranda', 'akademik', 'mk', 'peta', 'beban', 'bebanprodi', 'realisasi', 'panduan', 'skpi', 'laporan', 'induk'],
  admin: null,
  developer: null
};
/* Halaman kerja utama tiap peran (tombol utama di Beranda). */
export const RUMAH_PERAN = { dosen: ['rps', 'RPS mata kuliah saya'], prodi: ['asisten', 'Asisten kurikulum'], wadir: ['pimpinan', 'Dasbor pimpinan'], spm: ['mutu', 'Dasbor mutu'], akademik: ['akademik', 'Dasbor akademik'], admin: ['induk', 'Data induk dan pengguna'], developer: ['induk', 'Data induk dan pengguna'] };

export const ACUAN = [
  'Permendiktisaintek Nomor 39 Tahun 2025 tentang Penjaminan Mutu Pendidikan Tinggi (beserta perubahannya)',
  'Kepdirjen Dikti Nomor 209/B/KPT/2025 tentang Mata Kuliah Wajib Kurikulum',
  'Instrumen Akreditasi LAM Teknik 2025 untuk Program Sarjana Terapan',
  'Kriteria Akreditasi IABEE 2026 untuk Program Engineering Technology (Sydney Accord)',
  'Anderson & Krathwohl (2001), A Taxonomy for Learning, Teaching, and Assessing (revisi Taksonomi Bloom)',
  'Buku Pedoman Kurikulum Sarjana Terapan PEM Akamigas 2027 (draf)'
];

/* Aplikasi pendamping. Akun masuk sama (satu proyek Firebase), tetapi sesi masuk dipisah per situs. */
export const APP_LAIN = { simantap: { nama: 'SIMANTAP 2.0', url: 'https://simantap-spmi.github.io/' } };
