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
  MKU: { nama: 'Mata Kuliah Umum', c: '#f5a524' },
  MBS: { nama: 'Basic Science', c: '#0ea5e9' },
  MBE: { nama: 'Basic Engineering', c: '#8b5cf6' },
  MKK: { nama: 'Kompetensi', c: '#10b981' }
};
export const KAT_IABEE = ['Pendidikan umum', 'Matematika dan ilmu alam', 'Teknologi informasi', 'Muatan spesifik'];

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
  /* Beban dosen: JP total = SKS teori + SKS praktik x (durasi / 60), dikali kelas dan porsi. */
  bebanRiilMin: 9, bebanRiilMax: 16, jpMingguMax: 24
};

export const PERAN = {
  prodi: { nama: 'Tim Kurikulum Prodi', c: '#10b981' },
  dosen: { nama: 'Dosen Pengampu', c: '#0ea5e9' },
  wadir: { nama: 'Wakil Direktur I', c: '#8b5cf6' },
  spm: { nama: 'Satuan Penjaminan Mutu (SPM)', c: '#f0616d' },
  akademik: { nama: 'Kasubbag AK', c: '#f5a524' },
  admin: { nama: 'Admin', c: '#64748b' },
  developer: { nama: 'Developer', c: '#0f172a' }
};
/* Akun developer dikenali dari sidik SHA-256 'kurekam:' + email (huruf kecil), bukan dari alamat emailnya.
   Developer setara admin, selalu bisa masuk walau belum ada di daftar pengguna, dan boleh meninjau tampilan semua peran. */
export const DEVELOPER_SHA = ['f512cb3abb950d4c65241a0fda6c394decc7b29da869d6f51bbe36b9b1804a7b'];

/* Menu yang tampil per peran. null berarti semua menu. Rute di luar daftar dialihkan ke Beranda. */
export const MENU_PERAN = {
  dosen: ['beranda', 'peta', 'cpmk', 'rps', 'beban', 'bloom'],
  prodi: ['beranda', 'asisten', 'visi', 'cpl', 'bk', 'mk', 'peta', 'matriks', 'cpmk', 'rps', 'beban', 'bebanprodi', 'periksa', 'bloom', 'revisi', 'laporan'],
  wadir: ['beranda', 'pimpinan', 'mutu', 'akademik', 'peta', 'matriks', 'rps', 'beban', 'bebanprodi', 'periksa', 'revisi', 'laporan'],
  spm: ['beranda', 'mutu', 'visi', 'cpl', 'peta', 'matriks', 'cpmk', 'rps', 'periksa', 'bloom', 'revisi', 'laporan'],
  akademik: ['beranda', 'akademik', 'mk', 'peta', 'beban', 'bebanprodi', 'laporan', 'induk'],
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
