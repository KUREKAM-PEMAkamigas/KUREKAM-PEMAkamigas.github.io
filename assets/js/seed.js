/* KUREKAM · Data contoh lima prodi D4.
   Struktur semester, MK kunci, dan kelas per tingkat mengikuti Buku Pedoman 2027 (draf).
   Nama MK ruang prodi, rumusan CPL, CPMK, RPS, dan nama dosen adalah CONTOH untuk demo,
   bukan data resmi. Prodi menggantinya lewat menu penyusunan atau impor Excel. */
import { APP, PARAM_DEFAULT, KELOMPOK } from './config.js';
import { detect } from './bloom.js';
import { buildLama } from './lama.js';

const KAT = Object.fromEntries(KELOMPOK.map(k => [k.id, k.iabee]));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pad = (n) => String(n).padStart(2, '0');

export const PRODI_DEF = [
  { id: 'TP', nama: 'Teknik Produksi Minyak dan Gas', c: '#10b981', d: 'operasi produksi sumur dan fasilitas produksi migas', kelas: { 1: 4, 2: 3, 3: 3, 4: 3 },
    pl: ['Production Engineer / Teknisi Ahli Produksi', 'Supervisor Operasi Lapangan Migas', 'Perencana Optimasi Produksi dan Technopreneur'],
    bk: [['Geologi dan Reservoir', 3], ['Pemboran dan Komplesi Sumur', 3], ['Teknik Produksi dan Artificial Lift', 3], ['Fasilitas Produksi Permukaan', 3], ['Mekanika dan Fluida Teknik', 2], ['Instrumentasi dan Komputasi Produksi', 2]],
    sci: { 'Termodinamika': 1, 'Mekanika Fluida': 1, 'Praktik Termodinamika': 1, 'Praktik Mekanika Fluida': 1 },
    mk: [['Gambar Teknik', 'p', 4], ['Geologi Minyak dan Gas Bumi', 'tp', 0], ['Pengenalan Peralatan Produksi', 'tp', 2], ['Kalkulus Terapan', 't', 'g0'], ['Statika dan Kekuatan Bahan', 't', 4], ['Komputasi Teknik', 'tp', 5], ['Listrik dan Elektronika Dasar', 'tp', 5], ['Sifat Fisik Batuan Reservoir', 'tp', 0], ['Sifat Fluida Reservoir', 'tp', 0], ['Teknik Pemboran Dasar', 'tp', 1], ['Lumpur dan Semen Pemboran', 'p', 1], ['Teknik Reservoir', 't', 0], ['Penilaian Formasi', 'tp', 0], ['Komplesi Sumur', 'tp', 1], ['Teknik Produksi I', 'tp', 2], ['Fasilitas Produksi Permukaan', 'tp', 3], ['Instrumentasi Produksi', 'tp', 5], ['Teknik Produksi II', 'tp', 2], ['Artificial Lift', 'tp', 2], ['Kerja Ulang dan Perawatan Sumur', 'p', 1], ['Uji Sumur', 'p', 2], ['Teknik Gas Bumi', 't', 3], ['Korosi dan Proteksi Katodik', 'p', 3], ['Simulasi Produksi', 'p', 5], ['Pengolahan Air Terproduksi', 'p', 3], ['Stimulasi Sumur', 'p', 2], ['Pengendalian Pasir', 'p', 1], ['Keekonomian Migas', 't', 'g5'], ['Manajemen Lapangan Produksi', 't', 'g5'], ['Operasi Fasilitas Lepas Pantai', 'p', 3], ['Integritas Sumur', 'p', 1], ['Optimasi Produksi', 'p', 2], ['Enhanced Oil Recovery', 'p', 0], ['Analisis Data Produksi', 'p', 5], ['Pengukuran Migas', 'p', 3], ['Praktik Lapangan Produksi', 'p', 2], ['Teknologi CCUS dan Energi Bersih', 't', 0], ['Regulasi dan Etika Profesi Migas', 't', 'g5'], ['Praktik Pipa dan Perpipaan', 'p', 3], ['Perencanaan Pengembangan Lapangan', 'p', 'g4']] },
  { id: 'TO', nama: 'Teknik Pengolahan Minyak dan Gas', c: '#0ea5e9', d: 'proses pengolahan minyak bumi, gas, dan petrokimia', kelas: { 1: 4, 2: 3, 3: 3, 4: 3 },
    pl: ['Process Engineer / Teknisi Ahli Proses Kilang', 'Supervisor Operasi Unit Proses', 'Analis Mutu Produk dan Technopreneur'],
    bk: [['Operasi Teknik Kimia', 3], ['Proses Kilang Minyak', 3], ['Pengolahan Gas dan Petrokimia', 3], ['Utilitas dan Pengolahan Limbah', 3], ['Termodinamika dan Perpindahan', 2], ['Laboratorium dan Kontrol Mutu', 2]],
    sci: { 'Kimia Organik': 1, 'Kimia Analisis': 1, 'Praktikum Kimia Organik': 1, 'Praktikum Kimia Analisis': 1, 'Kimia Fisika': 1 },
    mk: [['Gambar Teknik dan Diagram Proses', 'p', 4], ['Pengantar Teknik Kimia', 't', 0], ['Neraca Massa dan Energi', 'tp', 4], ['Kalkulus Terapan', 't', 'g0'], ['Aplikasi Komputer Proses', 'tp', 4], ['Mekanika Fluida Proses', 'tp', 4], ['Perpindahan Panas', 'tp', 4], ['Termodinamika Teknik Kimia', 't', 4], ['Analisis Minyak Bumi', 'tp', 5], ['Operasi Teknik Kimia I', 'tp', 0], ['Perpindahan Massa', 'tp', 0], ['Operasi Teknik Kimia II', 'tp', 0], ['Teknologi Minyak Bumi', 't', 1], ['Kinetika dan Katalis', 'tp', 2], ['Distilasi Minyak Bumi', 'tp', 1], ['Peralatan Proses Kilang', 'tp', 1], ['Instrumentasi dan Kontrol Proses', 'tp', 4], ['Proses Konversi Kilang', 'tp', 1], ['Pengolahan Gas Bumi', 'tp', 2], ['Utilitas Kilang', 'p', 3], ['Pengolahan Limbah Industri', 'p', 3], ['Praktik Operasi Unit Distilasi', 'p', 1], ['Simulasi Proses', 'p', 4], ['Teknologi Petrokimia', 't', 2], ['Pengendalian Mutu Produk', 'p', 5], ['Blending Produk BBM', 'p', 1], ['Praktik Pengolahan Gas', 'p', 2], ['Keekonomian Kilang', 't', 'g5'], ['Manajemen Operasi Kilang', 't', 'g5'], ['Energi Terbarukan dan Biorefinery', 't', 2], ['Praktik Utilitas', 'p', 3], ['Optimasi Proses', 'p', 1], ['Analisis Keselamatan Proses', 'p', 3], ['Praktik Kontrol Proses', 'p', 4], ['Troubleshooting Unit Proses', 'p', 1], ['Praktik Laboratorium Produk', 'p', 5], ['Regulasi dan Etika Profesi Migas', 't', 'g5'], ['Perancangan Alat Proses', 'p', 'g4'], ['Praktik Petrokimia', 'p', 2]] },
  { id: 'TI', nama: 'Teknik Instrumentasi Kilang', c: '#8b5cf6', d: 'sistem instrumentasi, kontrol, dan otomasi kilang', kelas: { 1: 4, 2: 3, 3: 3, 4: 3 },
    pl: ['Instrument Engineer / Teknisi Ahli Instrumentasi', 'Supervisor Pemeliharaan Instrumentasi dan Kontrol', 'Integrator Sistem Otomasi dan Technopreneur'],
    bk: [['Elektronika dan Rangkaian', 2], ['Pengukuran dan Sensor', 3], ['Sistem Kontrol Proses', 3], ['Otomasi, PLC, dan DCS', 3], ['Sistem Instrumentasi Keselamatan', 3], ['Pemrograman dan Jaringan Industri', 2]],
    sci: { 'Statistika dan Probabilitas': 0, 'Rangkaian Listrik': 1, 'Praktikum Rangkaian Listrik': 1 },
    mk: [['Gambar Teknik dan Diagram Instrumen', 'p', 1], ['Pengantar Instrumentasi Kilang', 't', 1], ['Elektronika Dasar', 'tp', 0], ['Kalkulus Terapan', 't', 'g0'], ['Algoritma dan Pemrograman', 'tp', 5], ['Teknik Pengukuran', 'tp', 1], ['Elektronika Analog', 'tp', 0], ['Elektronika Digital', 'tp', 0], ['Sensor dan Transduser', 'tp', 1], ['Mesin Listrik', 'tp', 0], ['Sistem Kontrol Dasar', 't', 2], ['Kalibrasi Instrumen', 'p', 1], ['Mikrokontroler', 'tp', 5], ['Instrumentasi Proses Kilang', 'tp', 1], ['Pemrograman PLC', 'tp', 3], ['Sistem Kontrol Proses', 'tp', 2], ['Elemen Kontrol Akhir', 'p', 2], ['Jaringan Komunikasi Industri', 'tp', 5], ['Distributed Control System', 'tp', 3], ['Analisa Instrumen (Analyzer)', 'p', 1], ['Sistem Instrumentasi Keselamatan', 'tp', 4], ['Praktik Instrumentasi Proses', 'p', 1], ['Tuning Pengendali', 'p', 2], ['SCADA dan HMI', 'p', 3], ['Pemeliharaan Instrumen', 'p', 1], ['Praktik DCS', 'p', 3], ['Keamanan Siber Industri', 't', 5], ['Manajemen Pemeliharaan Instrumen', 't', 'g5'], ['Fire and Gas System', 'p', 4], ['Kontrol Lanjut', 'p', 2], ['Integrasi Sistem Otomasi', 'p', 3], ['Instrumentasi Cerdas dan IIoT', 'p', 5], ['Troubleshooting Loop Kontrol', 'p', 2], ['Regulasi dan Etika Profesi Migas', 't', 'g5'], ['Proyek Otomasi Mini', 'p', 'g4'], ['Kewirausahaan Teknologi', 't', 'g5'], ['Praktik Kalibrasi Lanjut', 'p', 1], ['Praktik Analyzer', 'p', 1], ['Praktik SIS', 'p', 4]] },
  { id: 'TM', nama: 'Teknik Mesin Kilang', c: '#f5a524', d: 'peralatan mekanik, pemeliharaan, dan keandalan kilang', kelas: { 1: 4, 2: 2, 3: 2, 4: 2 },
    pl: ['Mechanical Engineer / Teknisi Ahli Mekanik Kilang', 'Supervisor Pemeliharaan dan Inspeksi Peralatan', 'Perencana Keandalan Aset dan Technopreneur'],
    bk: [['Mekanika Teknik dan Material', 2], ['Termofluida', 2], ['Peralatan Statis Kilang', 3], ['Peralatan Putar Kilang', 3], ['Pemeliharaan dan Keandalan', 3], ['Manufaktur dan Pengelasan', 3]],
    sci: { 'Matematika Teknik': 0, 'Termodinamika Teknik': 1 },
    mk: [['Gambar Teknik Mesin', 'p', 0], ['Pengetahuan Bahan Teknik', 'tp', 0], ['Proses Manufaktur', 'tp', 5], ['Kalkulus Terapan', 't', 'g0'], ['Statika Struktur', 't', 0], ['Kerja Bangku dan Pelat', 'p', 5], ['Menggambar dengan CAD', 'p', 0], ['Mekanika Fluida', 'tp', 1], ['Kekuatan Material', 'tp', 0], ['Elemen Mesin', 'tp', 0], ['Pengelasan', 'p', 5], ['Perpindahan Panas', 't', 1], ['Pemesinan', 'p', 5], ['Pompa dan Kompresor', 'tp', 3], ['Bejana Tekan dan Alat Penukar Kalor', 'tp', 2], ['Turbin dan Penggerak', 'tp', 3], ['Sistem Perpipaan', 'tp', 2], ['Metrologi dan Inspeksi', 'p', 4], ['Pemeliharaan Mesin', 'tp', 4], ['Analisis Getaran', 'p', 4], ['Inspeksi Peralatan Statis', 'p', 2], ['Korosi dan Integritas Material', 't', 2], ['Overhaul Pompa', 'p', 3], ['Overhaul Kompresor', 'p', 3], ['Uji Tak Rusak (NDT)', 'p', 2], ['Pelumasan dan Tribologi', 'p', 4], ['Manajemen Pemeliharaan', 't', 'g5'], ['Analisis Keandalan Aset', 'p', 4], ['Simulasi Struktur dengan Perangkat Lunak', 'p', 0], ['Alignment dan Balancing', 'p', 3], ['Praktik Perpipaan', 'p', 2], ['Hidrolik dan Pneumatik', 'p', 3], ['Root Cause Failure Analysis', 'p', 4], ['Regulasi dan Etika Profesi Migas', 't', 'g5'], ['Perancangan Komponen Mesin', 'p', 'g4'], ['Kewirausahaan Teknologi', 't', 'g5'], ['Praktik Overhaul Turbin', 'p', 3], ['Praktik Inspeksi Lanjut', 'p', 2]] },
  { id: 'LO', nama: 'Logistik Minyak dan Gas', c: '#f0616d', d: 'rantai pasok, penyimpanan, dan distribusi migas', kelas: { 1: 4, 2: 2, 3: 2, 4: 2 },
    pl: ['Logistics Engineer / Analis Rantai Pasok Migas', 'Supervisor Terminal, Depot, dan Distribusi', 'Perencana Pengadaan dan Technopreneur Logistik'],
    bk: [['Manajemen Rantai Pasok', 3], ['Pergudangan dan Persediaan', 3], ['Transportasi dan Distribusi Migas', 3], ['Sistem Informasi Logistik', 2], ['Pengadaan dan Kontrak', 3], ['Ekonomi dan Bisnis Migas', 2]],
    sci: { 'Statistika Industri 1': 0, 'Statistika Industri 2': 0, 'Matematika Optimasi': 0 },
    mk: [['Pengantar Logistik Migas', 't', 0], ['Pengetahuan Produk Migas', 'tp', 2], ['Akuntansi Dasar', 't', 5], ['Kalkulus Terapan', 't', 'g0'], ['Aplikasi Komputer Logistik', 'p', 3], ['Ekonomi Teknik', 't', 5], ['Manajemen Rantai Pasok', 'tp', 0], ['Pengukuran Kuantitas Migas', 'tp', 2], ['Manajemen Persediaan', 'tp', 1], ['Sistem Informasi Logistik', 'tp', 3], ['Riset Operasi', 'tp', 'g0'], ['Manajemen Pergudangan', 'tp', 1], ['Transportasi Migas', 'tp', 2], ['Pengadaan Barang dan Jasa', 'tp', 4], ['Operasi Terminal dan Depot', 'p', 2], ['Manajemen Kontrak', 't', 4], ['Perencanaan Distribusi BBM', 'p', 2], ['Analitik Data Logistik', 'p', 3], ['Losses Control Migas', 'p', 2], ['Kepabeanan dan Perdagangan', 't', 5], ['Simulasi Sistem Logistik', 'p', 3], ['Manajemen Armada', 'p', 2], ['Praktik Pergudangan', 'p', 1], ['Manajemen Risiko Rantai Pasok', 'p', 0], ['Logistik Hijau', 't', 0], ['Praktik Pengadaan Elektronik', 'p', 4], ['Perencanaan Kebutuhan Material', 'p', 1], ['Logistik Lepas Pantai', 'p', 2], ['Optimasi Rute Distribusi', 'p', 3], ['Pemasaran Digital', 'p', 5], ['Kewirausahaan Logistik', 't', 'g5'], ['Regulasi dan Etika Profesi Migas', 't', 'g5'], ['Perancangan Sistem Logistik', 'p', 'g4'], ['Praktik Terminal LPG', 'p', 2], ['Praktik Depot BBM', 'p', 2], ['Praktik Sistem Informasi Logistik', 'p', 3]] }
];

const KUNCI = {
  1: [['Pengantar Industri Migas dan Energi Terbarukan', 2, 0, 'Kunci bersama'], ['Keselamatan dan Kesehatan Kerja (K3)', 1, 0, 'Kunci bersama'], ['Praktik K3', 0, 2, 'Kunci bersama']],
  4: [['Kewarganegaraan', 2, 0, 'Kunci bersama']],
  5: [['Pancasila', 2, 0, 'Kunci bersama'], ['Bahasa Indonesia', 2, 0, 'Kunci bersama'], ['Capstone Design I', 1, 1, 'Kunci bersama']],
  6: [['Agama', 2, 0, 'Kunci bersama'], ['Capstone Design II', 0, 2, 'Kunci bersama']],
  7: [['Magang Berdampak (inti)', 0, 10, 'Kunci bersama'], ['Mata Kuliah Konversi Magang', 0, 10, 'Kunci bersama']],
  8: [['Capstone Design III', 0, 2, 'Kunci bersama'], ['Tugas Akhir', 0, 8, 'Kunci bersama']]
};
/* MK bergilir: [nama, T, P, prodi smt pertama, smt, prodi smt kedua, smt] */
const ROT = [['Matematika Dasar', 2, 0, ['TM', 'TI', 'LO'], 1, ['TO', 'TP'], 2], ['Fisika Dasar', 2, 0, ['TP', 'TM', 'TI'], 1, ['TO', 'LO'], 2], ['Kimia Dasar', 2, 0, ['TO', 'TP', 'LO'], 1, ['TM', 'TI'], 2], ['Bahasa Inggris', 1, 1, ['TI', 'TO', 'TM'], 1, ['TP', 'LO'], 2], ['Praktikum Fisika Dasar', 0, 1, ['TP', 'TM', 'TI'], 2, ['TO', 'LO'], 3], ['Praktikum Kimia Dasar', 0, 1, ['TO', 'TP', 'LO'], 2, ['TI', 'TM'], 3]];
const SCI_SMT = { TP: { 'Termodinamika': [2, 1, 0], 'Mekanika Fluida': [2, 1, 0], 'Praktik Termodinamika': [3, 0, 1], 'Praktik Mekanika Fluida': [3, 0, 1] }, TO: { 'Kimia Organik': [2, 1, 0], 'Kimia Analisis': [2, 1, 0], 'Praktikum Kimia Organik': [3, 0, 1], 'Praktikum Kimia Analisis': [3, 0, 1], 'Kimia Fisika': [3, 1, 0] }, TI: { 'Statistika dan Probabilitas': [2, 2, 0], 'Rangkaian Listrik': [2, 1, 0], 'Praktikum Rangkaian Listrik': [3, 0, 2] }, TM: { 'Matematika Teknik': [2, 2, 0], 'Termodinamika Teknik': [2, 2, 0] }, LO: { 'Statistika Industri 1': [2, 2, 0], 'Statistika Industri 2': [3, 1, 1], 'Matematika Optimasi': [3, 1, 1] } };

function kelompokKunci(n) {
  const s = n.toLowerCase();
  if (s.includes('k3')) return 'MKK - K3';
  if (/(matematika|fisika|kimia) dasar/.test(s)) return 'MBS - matematika dan sains dasar';
  if (s.includes('capstone')) return 'MKK - capstone';
  if (s.includes('magang')) return 'MKK - magang';
  if (s.includes('tugas akhir')) return 'MKK - tugas akhir';
  if (/pancasila|agama|kewarganegaraan|bahasa indonesia/.test(s)) return 'MKU - wajib kurikulum';
  if (/bahasa inggris|pengantar industri/.test(s)) return 'MKU - institusi';
  return 'MBS - sains penciri';
}
const TI_RX = /komputasi|pemrograman|sistem informasi|aplikasi komputer|simulasi|analitik|scada|iiot|siber|cad|perangkat lunak/i;
const TYPES = { t: [2, 0], tp: [2, 1], p: [0, 2], p1: [0, 1], t1: [1, 0] };

const CPL_T = [
  ['S', 'S1', 'Menunjukkan sikap bertanggung jawab atas pekerjaan di bidang keahliannya secara mandiri dengan menjunjung tinggi keselamatan dan etika profesi.', 'f'],
  ['S', 'S2', 'Menginternalisasi semangat kemandirian, kejuangan, kewirausahaan, dan kepedulian terhadap lingkungan dalam kehidupan profesional.', 'i'],
  ['P', 'P1', 'Menjelaskan konsep teoretis matematika, sains, dan rekayasa yang mendasari {d}.', 'a'],
  ['P', 'P2', 'Menganalisis prinsip kerja peralatan dan proses dalam {d} berdasarkan standar industri.', 'b'],
  ['KU', 'KU1', 'Menerapkan pemikiran logis, kritis, sistematis, dan inovatif dalam implementasi teknologi di bidang keahliannya.', 'd'],
  ['KU', 'KU2', 'Mengambil keputusan secara tepat berdasarkan analisis data serta bekerja sama dalam tim multidisiplin.', 'e,g'],
  ['KK', 'KK1', 'Mengoperasikan peralatan utama {d} sesuai prosedur standar dan kaidah K3.', 'c'],
  ['KK', 'KK2', 'Menganalisis permasalahan teknis pada {d} menggunakan data lapangan dan perangkat lunak rekayasa.', 'b,k'],
  ['KK', 'KK3', 'Merancang perbaikan atau sistem sederhana di bidang {d} dengan mempertimbangkan batasan realistis, keselamatan, dan lingkungan.', 'c,h'],
  ['KK', 'KK4', 'Mengelola pekerjaan operasi dan pemeliharaan di bidang {d} sesuai standar mutu, K3LL, dan regulasi migas.', 'j']
];
const PL_CPL = [['P1', 'P2', 'KK1', 'KK2'], ['S1', 'KU2', 'KK1', 'KK4'], ['S2', 'KU1', 'KK3', 'KK2']];
const GBK = [['Matematika Terapan', 1, ['P1', 'KU1']], ['Sains Dasar', 1, ['P1']], ['K3LL', 4, ['S1', 'KK4']], ['Karakter, Kebangsaan, dan Komunikasi', 6, ['S1', 'S2', 'KU2']], ['Perancangan dan Proyek Rekayasa', 2, ['KK3', 'KU2', 'KU1']], ['Manajemen dan Kewirausahaan', 5, ['S2', 'KU2', 'KK4']]];
const BOK = [['Matematika dan Sains Dasar', 'IABEE 2.1.1, LAM Teknik butir 19'], ['Dasar Keteknikan', 'IABEE disiplin ET, SKKNI terkait'], ['Keilmuan Inti Prodi', 'SKKNI dan standar kompetensi migas'], ['K3LL dan Lingkungan', 'Regulasi K3 migas, ISO 45001'], ['Manajemen dan Profesionalisme', 'IABEE student outcomes'], ['Karakter dan Kebangsaan', 'Kepdirjen 209/B/KPT/2025']];
const SPEC_CPL = [['P2', 'KK1', 'KK2'], ['P2', 'KK1', 'KK4'], ['P2', 'KK2', 'KK1'], ['KK1', 'KK4', 'KK2'], ['P1', 'P2'], ['P2', 'KK2', 'KU1']];

const VERB = {
  t: { 1: ['menjelaskan', 'menghitung'], 2: ['menjelaskan', 'menghitung'], 3: ['menerapkan', 'menganalisis'], 4: ['menerapkan', 'menganalisis'], 5: ['menganalisis', 'mengevaluasi'], 6: ['menganalisis', 'mengevaluasi'], 8: ['merancang', 'mengevaluasi'] },
  p: { 1: ['melakukan', 'mengoperasikan'], 2: ['melakukan', 'mengoperasikan'], 3: ['mengoperasikan', 'mengatasi'], 4: ['mengoperasikan', 'mengatasi'], 5: ['mengatasi', 'mengendalikan'], 6: ['mengatasi', 'mengendalikan'], 8: ['merancang', 'mengendalikan'] }
};
const OBJ = { menjelaskan: 'konsep dan prinsip dasar', menghitung: 'parameter utama dalam', menerapkan: 'metode dan prosedur', menganalisis: 'permasalahan teknis pada', mengevaluasi: 'kinerja dan alternatif solusi pada', merancang: 'solusi rekayasa untuk', melakukan: 'praktik', mengoperasikan: 'peralatan pada', mengatasi: 'gangguan dan permasalahan pada', mengendalikan: 'pelaksanaan pekerjaan', memahami: 'materi' };
const SUBV = { menjelaskan: ['menyebutkan', 'menjelaskan'], menghitung: ['menjelaskan', 'menghitung'], menerapkan: ['menjelaskan', 'menerapkan'], menganalisis: ['menghitung', 'menganalisis'], mengevaluasi: ['menganalisis', 'mengevaluasi'], merancang: ['menganalisis', 'merancang'], melakukan: ['mengikuti', 'melakukan'], mengoperasikan: ['melakukan', 'mengoperasikan'], mengatasi: ['mengoperasikan', 'mengatasi'], mengendalikan: ['mengatasi', 'mengendalikan'], memahami: ['mengenal', 'memahami'] };

export function buildSeed() {
  const R = rng(2027);
  const P = PARAM_DEFAULT;
  const D = { prodi: [], dosen: [], pl: [], cpl: [], bok: [], bk: [], mk: [], cpmk: [], sub: [], rps: [], tugas: [], revisi: [], lama: buildLama(), log: [], settings: [] };
  const pool = { MKU: [], SAINS: [], K3: [], BHS: [] };
  [['MKU', 'Dosen MKU', 6, 'Mata Kuliah Wajib Kurikulum'], ['SAINS', 'Dosen Sains', 8, 'Matematika dan Ilmu Alam'], ['K3', 'Dosen K3', 5, 'Keselamatan dan Kesehatan Kerja'], ['BHS', 'Dosen Bahasa', 3, 'Bahasa Inggris untuk Migas']].forEach(([k, n, c, b]) => {
    for (let i = 1; i <= c; i++) { const d = { id: `D-${k}-${pad(i)}`, nama: `${n} ${pad(i)}`, homebase: 'Bersama', bidang: b, jabatan: i % 3 === 0 ? 'Lektor Kepala' : i % 2 ? 'Lektor' : 'Asisten Ahli' }; D.dosen.push(d); pool[k].push(d.id); }
  });

  PRODI_DEF.forEach((pd, pi) => {
    const pid = pd.id;
    D.prodi.push({ id: pid, nama: pd.nama, c: pd.c, kelas: { ...pd.kelas }, visi: 'Menjadi pusat pendidikan vokasi energi dan sumber daya mineral yang unggul dan berdaya saing global.',
      visiKeilmuan: `Menjadi program studi sarjana terapan yang unggul dalam ${pd.d}, berwawasan keselamatan dan transisi energi, serta diakui industri nasional dan internasional pada tahun 2035.`,
      status: pid === 'TP' ? 'diajukan' : 'draf', catatanSpm: pid === 'TO' ? [{ t: '2026-11-10', oleh: 'Unit SPM', isi: 'Mohon lengkapi bukti pelibatan pemangku kepentingan untuk perumusan profil lulusan.' }] : [] });
    const dpool = [];
    for (let i = 1; i <= (pd.kelas[2] >= 3 ? 14 : 10); i++) { const d = { id: `D-${pid}-${pad(i)}`, nama: `Dosen ${pid} ${pad(i)}`, homebase: pid, bidang: pd.bk[(i - 1) % pd.bk.length][0], jabatan: i % 4 === 0 ? 'Lektor Kepala' : i % 2 ? 'Lektor' : 'Asisten Ahli' }; D.dosen.push(d); dpool.push(d.id); }

    /* PL, CPL, BoK, BK */
    pd.pl.forEach((n, i) => D.pl.push({ id: `${pid}-PL${i + 1}`, prodi: pid, kode: `PL${i + 1}`, nama: n, teks: `Lulusan berperan sebagai ${n.toLowerCase()} yang kompeten, berintegritas, dan mampu beradaptasi dengan teknologi di bidang ${pd.d}.` }));
    const cplId = (k) => `${pid}-${k}`;
    CPL_T.forEach(([ranah, k, t, ia]) => {
      let teks = t.replace('{d}', pd.d);
      if (pid === 'TM' && k === 'P1') teks = 'Memahami konsep teoretis matematika, sains, dan rekayasa yang mendasari ' + pd.d + '.';
      if (pid === 'LO' && k === 'KK3') teks = 'Mampu membuat rancangan sistem logistik migas yang efisien dengan mempertimbangkan biaya, keselamatan, dan lingkungan.';
      D.cpl.push({ id: cplId(k), prodi: pid, kode: k, ranah, teks, iabee: ia, pl: PL_CPL.map((a, i) => a.includes(k) ? `${pid}-PL${i + 1}` : null).filter(Boolean) });
    });
    BOK.forEach(([n, s], i) => D.bok.push({ id: `${pid}-BOK${i + 1}`, prodi: pid, kode: `BOK${i + 1}`, nama: i === 2 ? `Keilmuan Inti ${pd.nama}` : n, sumber: s }));
    const bkIds = { g: [], s: [] };
    GBK.forEach(([n, b, c], i) => { const id = `${pid}-BK${pad(i + 1)}`; bkIds.g.push(id); D.bk.push({ id, prodi: pid, kode: `BK${pad(i + 1)}`, nama: n, bok: `${pid}-BOK${b}`, kedalaman: ['C3', 'C2', 'C3', 'A3', 'C6', 'C4'][i], cpl: c.map(cplId) }); });
    pd.bk.forEach(([n, b], i) => { const id = `${pid}-BK${pad(i + 7)}`; bkIds.s.push(id); D.bk.push({ id, prodi: pid, kode: `BK${pad(i + 7)}`, nama: n, bok: `${pid}-BOK${b}`, kedalaman: b === 2 ? 'C3' : (i % 2 ? 'C5' : 'C4'), cpl: SPEC_CPL[i].map(cplId) }); });
    const bkCpl = (id) => (D.bk.find(b => b.id === id) || {}).cpl || [];

    /* MK kunci */
    let no = 0; const mkList = [];
    const addMk = (o) => { no++; const m = { id: `${pid}-MK${pad(no)}`, prodi: pid, kode: `${pid}${o.smt}${pad(no)}`, prasyarat: [], lokasi: (+o.P > +o.T) ? 'Laboratorium' : 'Kampus', ...o }; m.kat = m.kat || KAT[m.kel]; if (TI_RX.test(m.nama)) m.kat = 'Teknologi informasi'; mkList.push(m); return m; };
    const kunciBk = (n) => { const s = n.toLowerCase(); if (s.includes('k3')) return bkIds.g[2]; if (/matematika|statistika/.test(s)) return bkIds.g[0]; if (/fisika|kimia|termodinamika|mekanika fluida|rangkaian/.test(s)) return bkIds.g[1]; if (s.includes('capstone')) return bkIds.g[4]; if (/magang/.test(s)) return bkIds.g[5]; if (/tugas akhir/.test(s)) return bkIds.g[4]; return bkIds.g[3]; };
    const placeK = (smt, n, T, Pp, jk) => { const kel = kelompokKunci(n); const bk = kunciBk(n); addMk({ smt, nama: n, T, P: Pp, kel, kunci: jk, bk: [bk], cpl: bkCpl(bk).slice(0, 2) }); };
    for (let s = 1; s <= 8; s++) (KUNCI[s] || []).forEach(([n, T, Pp, jk]) => placeK(s, n, T, Pp, jk));
    ROT.forEach(([n, T, Pp, a, sa, b, sb]) => { if (a.includes(pid)) placeK(sa, n, T, Pp, 'Kunci bergilir'); else if (b.includes(pid)) placeK(sb, n, T, Pp, 'Kunci bergilir'); });
    Object.entries(SCI_SMT[pid]).forEach(([n, [s, T, Pp]]) => placeK(s, n, T, Pp, 'Kunci prodi'));
    mkList.filter(m => /magang/i.test(m.nama)).forEach(m => { m.cpl = ['KK1', 'KK4', 'S1', 'KU2'].map(cplId); m.lokasi = 'Industri'; });
    mkList.filter(m => /tugas akhir/i.test(m.nama)).forEach(m => { m.cpl = ['KK2', 'KK3', 'KU1'].map(cplId); });
    mkList.filter(m => /capstone/i.test(m.nama)).forEach(m => { m.cpl = ['KK3', 'KU2', 'KK2'].map(cplId); });

    /* MK ruang prodi diisi agar tiap semester memenuhi rentang T/P */
    let queue = pd.mk.slice(), deferred = [], filler = 0;
    for (let s = 1; s <= 6; s++) {
      const k = P.kerangka[s];
      const cur = mkList.filter(m => m.smt === s);
      let T0 = cur.reduce((a, m) => a + m.T, 0), P0 = cur.reduce((a, m) => a + m.P, 0), n = cur.length;
      let Tt = Math.round((k[1] + k[2]) / 2); if (k[0] - Tt > k[4]) Tt = k[0] - k[4]; if (k[0] - Tt < k[3]) Tt = k[0] - k[3];
      let remT = Math.max(0, Tt - T0), remP = Math.max(0, (k[0] - Tt) - P0);
      queue = deferred.concat(queue); deferred = [];
      while ((remT > 0 || remP > 0)) {
        let item = queue.shift();
        if (!item) { filler++; item = [`Praktik Terpadu ${pid} ${filler}`, remT > 0 ? 'tp' : 'p', 3]; }
        const [nm, ty, bi] = item; const [dt, dp] = TYPES[ty];
        let T = Math.min(dt, remT), Pp = Math.min(dp, remP);
        if (n >= k[6] - 1) { T = remT; Pp = remP; }
        if (T + Pp === 0) { deferred.push(item); continue; }
        if (ty === 't' && T === 0) { deferred.push(item); continue; }
        if (ty === 'p' && Pp === 0) { deferred.push(item); continue; }
        const bk = typeof bi === 'string' ? bkIds.g[+bi.slice(1)] : bkIds.s[bi];
        const kel = typeof bi === 'string' ? (bi === 'g0' ? 'MBS - sains penciri' : bi === 'g4' ? 'MKK - pendukung' : 'MKK - pendukung') : (pd.bk[bi][1] === 2 ? 'MBE - basic engineering' : 'MKK - kompetensi penciri');
        const c = bkCpl(bk); const pick = c.slice(0, 2 + Math.floor(R() * 2));
        addMk({ smt: s, nama: nm, T, P: Pp, kel, kunci: '', bk: [bk], cpl: pick });
        remT -= T; remP -= Pp; n++;
      }
    }
    /* prasyarat sederhana */
    mkList.forEach(m => {
      const base = m.nama.replace(/ II$/, ' I'); if (base !== m.nama) { const p = mkList.find(x => x.nama === base); if (p) m.prasyarat.push(p.id); }
      const pr = m.nama.match(/^Praktik(?:um)? (.+)$/); if (pr) { const p = mkList.find(x => x.nama === pr[1] && x.smt < m.smt); if (p) m.prasyarat.push(p.id); }
      if (m.nama === 'Capstone Design II') m.prasyarat.push(mkList.find(x => x.nama === 'Capstone Design I').id);
      if (m.nama === 'Capstone Design III') m.prasyarat.push(mkList.find(x => x.nama === 'Capstone Design II').id);
    });
    D.mk.push(...mkList);

    /* CPMK dan Sub-CPMK */
    const subDepth = { TP: 4, TO: 4, TI: 3, TM: 2, LO: 2 }[pid];
    mkList.forEach(m => {
      if (/magang|tugas akhir/i.test(m.kel)) return;
      const prak = m.P > m.T; const smt = /capstone design iii/i.test(m.nama) ? 8 : m.smt;
      let verbs = (prak ? VERB.p : VERB.t)[smt] || VERB.t[6];
      if (/capstone/i.test(m.nama)) verbs = ['merancang', 'mengevaluasi'];
      if (pid === 'TM' && m.smt === 1 && !prak) verbs = ['memahami', verbs[1]];
      const nC = (m.T + m.P) <= 1 ? 1 : 2;
      for (let i = 0; i < nC; i++) {
        const v = verbs[i]; const id = `${m.id}-CPMK${i + 1}`;
        const lvV = (detect('Mampu ' + v, prak ? 'P' : 'C') || { n: 3, d: 'C' });
        const lvC = (id) => { const c = D.cpl.find(x => x.id === id); const b = c && detect(c.teks, c.ranah === 'S' ? 'A' : 'C'); return b && b.d === lvV.d ? b.n : (b ? 9 : 0); };
        const fit = m.cpl.filter(id => lvC(id) >= lvV.n);
        const cplLink = [(fit.length ? fit : m.cpl)[i % Math.max(1, (fit.length ? fit : m.cpl).length)]].filter(Boolean);
        D.cpmk.push({ id, mk: m.id, prodi: pid, kode: `CPMK${i + 1}`, teks: `Mampu ${v} ${OBJ[v] || ''} ${m.nama.toLowerCase()}${prak ? ' sesuai prosedur dan kaidah K3' : ''}.`.replace(/\s+/g, ' '), cpl: cplLink });
        if (m.smt <= subDepth || /capstone design i$/i.test(m.nama)) {
          const sv = SUBV[v] || [v, v];
          sv.forEach((w, j) => D.sub.push({ id: `${id}-S${j + 1}`, cpmk: id, mk: m.id, prodi: pid, kode: `Sub-CPMK${i + 1}.${j + 1}`, teks: `Mampu ${w} ${OBJ[w] || 'aspek'} ${m.nama.toLowerCase()} pada topik ${j + 1}.`.replace(/\s+/g, ' '), bobot: 0 }));
        }
      }
      const ss = D.sub.filter(s => s.mk === m.id);
      if (ss.length) { const b = Math.floor(100 / ss.length); ss.forEach((s, i) => { s.bobot = i === ss.length - 1 ? 100 - b * (ss.length - 1) : b; }); }
      if (pid === 'TI' && m.smt === 3 && ss.length) ss[0].bobot += 10;
    });

    /* RPS + SAP */
    const rpsSmt = { TP: 2, TO: 2, TI: 1, TM: 1, LO: 0 }[pid];
    mkList.filter(m => m.smt <= rpsSmt && !/magang|tugas akhir/i.test(m.kel)).forEach((m, idx) => {
      const ss = D.sub.filter(s => s.mk === m.id); if (!ss.length) return;
      const prak = m.P > m.T; const pert = [];
      let si = 0;
      for (let w = 1; w <= 16; w++) {
        if (w === 8 || w === 16) { pert.push({ m: w, ujian: w === 8 ? 'UTS' : 'UAS', sub: ss.map(s => s.id), materi: w === 8 ? 'Ujian Tengah Semester' : 'Ujian Akhir Semester', metode: prak ? 'Ujian praktik' : 'Ujian tertulis', asesmen: prak ? 'Unjuk kerja' : 'Tes tertulis', bobot: w === 8 ? 20 : 25, sap: {} }); continue; }
        const s = ss[si % ss.length]; si++;
        const filled = !(pid === 'TI' && w > 12) && !(pid === 'TM' && w > 6);
        pert.push({ m: w, sub: [s.id], materi: filled ? `${m.nama}: ${s.teks.replace(/^Mampu /, '').replace(/\.$/, '')}` : '', metode: prak ? 'Demonstrasi dan praktik terbimbing di laboratorium' : 'Kuliah interaktif, diskusi kelompok, dan studi kasus', asesmen: prak ? 'Laporan praktik dan observasi' : (w % 2 ? 'Kuis' : 'Tugas'), bobot: Math.round(55 / 14 * 10) / 10,
          ...((pid === 'TP' || pid === 'TO') && filled && (w === 5 || w === 12) ? (w === 5 ? { integ: 'Penelitian', integUraian: 'Hasil penelitian dosen (contoh) dipakai sebagai studi kasus dan bahan diskusi.' } : { integ: 'PKM', integUraian: 'Mahasiswa menyusun rekomendasi teknis untuk mitra PKM (contoh).' }) : {}),
          sap: pid === 'TP' && filled ? { pendahuluan: 'Apersepsi, briefing K3, dan penyampaian tujuan pertemuan (10 menit)', inti: prak ? 'Demonstrasi oleh dosen, praktik berkelompok, pengamatan dan pencatatan data' : 'Penjelasan konsep, contoh soal, diskusi kasus lapangan', penutup: 'Refleksi, kuis singkat, dan penugasan (10 menit)', media: prak ? 'Peralatan lab, lembar kerja, APD' : 'Proyektor, modul ajar, LMS' } : {} });
      }
      const status = pid === 'TP' ? (m.smt === 1 ? 'disahkan' : 'diajukan') : pid === 'TO' ? (idx % 3 === 0 ? 'diajukan' : 'draf') : 'draf';
      D.rps.push({ id: m.id, mk: m.id, prodi: pid, deskripsi: `Mata kuliah ini membekali mahasiswa dengan kemampuan ${m.nama.toLowerCase()} untuk mendukung ${pd.d}.`, pustaka: 'Diisi dosen pengampu (buku teks, standar API/ASME/ISA, modul praktik).', pertemuan: pert, status, oleh: status === 'disahkan' ? 'Kaprodi ' + pid : '', tgl: status !== 'draf' ? '2026-11-1' + (idx % 9) : '' });
    });

    /* Penugasan dosen (smt 1-6) */
    let rr = Math.floor(R() * dpool.length);
    const sharedOf = (m) => /MKU/.test(m.kel) ? (/bahasa inggris/i.test(m.nama) ? 'BHS' : 'MKU') : /K3/.test(m.kel) ? 'K3' : /matematika dan sains dasar/.test(m.kel) ? 'SAINS' : null;
    const sp = { MKU: 0, SAINS: 0, K3: 0, BHS: 0 };
    mkList.filter(m => m.smt <= 6).forEach((m, i) => {
      if (pid === 'LO' && m.smt === 6 && i % 3 === 0 && !m.kunci) return; // contoh MK belum ada pengampu
      const kls = pd.kelas[Math.ceil(m.smt / 2)];
      const sh = sharedOf(m);
      const next = () => { if (sh) { const a = pool[sh]; const d = a[(sp[sh] + pi) % a.length]; sp[sh]++; return d; } rr++; return dpool[(pid === 'TP' && rr % 7 === 0 ? 0 : rr) % dpool.length]; };
      const tid = () => `T-${m.id}-${D.tugas.length}`;
      if (m.T > 0 && m.P > 0) {
        const a = next(), b = next();
        D.tugas.push({ id: tid(), mk: m.id, prodi: pid, dosen: a, kelas: kls, porsiT: 1, porsiP: 0.5, koordinator: true });
        D.tugas.push({ id: tid(), mk: m.id, prodi: pid, dosen: b === a ? next() : b, kelas: kls, porsiT: 0, porsiP: 0.5, koordinator: false });
      } else if (m.P > 0 && kls >= 3) {
        const a = next(), b = next();
        D.tugas.push({ id: tid(), mk: m.id, prodi: pid, dosen: a, kelas: kls, porsiT: 0, porsiP: 0.5, koordinator: true });
        D.tugas.push({ id: tid(), mk: m.id, prodi: pid, dosen: b === a ? next() : b, kelas: kls, porsiT: 0, porsiP: 0.5, koordinator: false });
      } else {
        D.tugas.push({ id: tid(), mk: m.id, prodi: pid, dosen: next(), kelas: kls, porsiT: 1, porsiP: 1, koordinator: true });
      }
    });
  });

  D.revisi.push(
    { id: 'REV-001', prodi: 'TP', objek: 'Mata kuliah', uraian: 'Menggabungkan Metode Penelitian ke dalam Capstone Design I', alasan: 'Menjaga total 144 SKS dan memperkuat capstone sesuai IABEE', oleh: 'Tim Kurikulum TP', tgl: '2026-11-09', status: 'disetujui', putusan: 'Disetujui Wadir 1, 10 November 2026' },
    { id: 'REV-002', prodi: 'TO', objek: 'CPL', uraian: 'Menambah CPL keterampilan khusus tentang transisi energi dan biorefinery', alasan: 'Masukan pengguna lulusan dan tracer study 2025', oleh: 'Tim Kurikulum TO', tgl: '2026-11-11', status: 'menunggu', putusan: '' },
    { id: 'REV-003', prodi: 'LO', objek: 'Mata kuliah', uraian: 'Memindahkan Pemasaran Digital dari semester 6 ke semester 5', alasan: 'Mendukung Capstone Design I', oleh: 'Tim Kurikulum LO', tgl: '2026-11-11', status: 'menunggu', putusan: '' }
  );
  D.log.push({ id: 'LOG' + Date.now(), t: new Date().toISOString(), user: 'Sistem', aksi: 'Data contoh KUREKAM dimuat' });
  D.settings.push({ id: 'app', seedVersi: APP.seedVersi, paritas: 'ganjil', param: {} });
  return D;
}
