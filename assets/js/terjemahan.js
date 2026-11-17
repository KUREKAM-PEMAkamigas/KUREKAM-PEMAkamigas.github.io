/* KUREKAM · Draf terjemahan Inggris untuk CPL dan nama mata kuliah (dipakai SKPI dwibahasa).
   SEMUA isi di sini adalah DRAF. Tidak ada yang dianggap benar sebelum diverifikasi Kaprodi (status "ok" diberikan manual).
   Kunci pencocokan: teks Indonesia yang sama persis (huruf kecil, tanpa tanda baca) dengan data aplikasi. */
import { PRODI_DEF, CPL_T } from './seed.js';

export const kunci = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const D_EN = {
  TP: 'well production operations and oil and gas production facilities',
  TO: 'oil, gas, and petrochemical processing',
  TI: 'refinery instrumentation, control, and automation systems',
  TM: 'refinery mechanical equipment, maintenance, and reliability',
  LO: 'oil and gas supply chain, storage, and distribution'
};
const CPL_EN = {
  S1: 'Demonstrates a responsible attitude toward work in their field of expertise, independently, upholding safety and professional ethics.',
  S2: 'Internalizes the spirit of independence, perseverance, entrepreneurship, and care for the environment in professional life.',
  P1: 'Explains the theoretical concepts of mathematics, science, and engineering that underlie {d}.',
  P2: 'Analyzes the working principles of equipment and processes in {d} based on industry standards.',
  KU1: 'Applies logical, critical, systematic, and innovative thinking in implementing technology in their field of expertise.',
  KU2: 'Makes appropriate decisions based on data analysis and works collaboratively in multidisciplinary teams.',
  KK1: 'Operates the main equipment of {d} in accordance with standard procedures and occupational health and safety principles.',
  KK2: 'Analyzes technical problems in {d} using field data and engineering software.',
  KK3: 'Designs improvements or simple systems in the field of {d} considering realistic constraints, safety, and the environment.',
  KK4: 'Manages operation and maintenance work in the field of {d} in accordance with quality standards, occupational health, safety and environment (HSE) requirements, and oil and gas regulations.'
};
const SING = {
  S1: ['Tanggung jawab dan etika profesi', 'Responsibility and ethics'], S2: ['Kemandirian dan kewirausahaan', 'Independence and entrepreneurship'],
  P1: ['Konsep dasar sains dan rekayasa', 'Science and engineering concepts'], P2: ['Prinsip kerja peralatan dan proses', 'Equipment and process principles'],
  KU1: ['Berpikir logis dan inovatif', 'Logical and innovative thinking'], KU2: ['Keputusan dan kerja tim', 'Decisions and teamwork'],
  KK1: ['Mengoperasikan peralatan', 'Equipment operation'], KK2: ['Analisis masalah teknis', 'Technical problem analysis'],
  KK3: ['Merancang perbaikan', 'Improvement design'], KK4: ['Mengelola operasi dan pemeliharaan', 'Operation and maintenance management']
};

/* Nama mata kuliah: "Indonesia = English", satu per baris. */
const MK_TEKS = `
Pengantar Industri Migas dan Energi Terbarukan = Introduction to the Oil and Gas and Renewable Energy Industry
Keselamatan dan Kesehatan Kerja (K3) = Occupational Health and Safety
Praktik K3 = Occupational Health and Safety Practicum
Kewarganegaraan = Civics
Pancasila = Pancasila
Pancasila dan Kewarganegaraan = Pancasila and Civics
Bahasa Indonesia = Indonesian Language
Agama = Religion
Agama dan Etika = Religion and Ethics
Capstone Design I = Capstone Design I
Capstone Design II = Capstone Design II
Capstone Design III = Capstone Design III
Magang Berdampak (inti) = Impactful Internship (core)
Mata Kuliah Konversi Magang = Internship Conversion Course
Tugas Akhir = Final Project
Matematika Dasar = Basic Mathematics
Fisika Dasar = Basic Physics
Kimia Dasar = Basic Chemistry
Bahasa Inggris = English Language
Praktikum Fisika Dasar = Basic Physics Practicum
Praktikum Kimia Dasar = Basic Chemistry Practicum
Termodinamika = Thermodynamics
Mekanika Fluida = Fluid Mechanics
Praktik Termodinamika = Thermodynamics Practicum
Praktik Mekanika Fluida = Fluid Mechanics Practicum
Gambar Teknik = Engineering Drawing
Geologi Minyak dan Gas Bumi = Petroleum Geology
Pengenalan Peralatan Produksi = Introduction to Production Equipment
Kalkulus Terapan = Applied Calculus
Statika dan Kekuatan Bahan = Statics and Strength of Materials
Komputasi Teknik = Engineering Computation
Listrik dan Elektronika Dasar = Basic Electricity and Electronics
Sifat Fisik Batuan Reservoir = Reservoir Rock Properties
Sifat Fluida Reservoir = Reservoir Fluid Properties
Teknik Pemboran Dasar = Basic Drilling Engineering
Lumpur dan Semen Pemboran = Drilling Mud and Cement
Teknik Reservoir = Reservoir Engineering
Penilaian Formasi = Formation Evaluation
Komplesi Sumur = Well Completion
Teknik Produksi I = Production Engineering I
Teknik Produksi II = Production Engineering II
Fasilitas Produksi Permukaan = Surface Production Facilities
Instrumentasi Produksi = Production Instrumentation
Artificial Lift = Artificial Lift
Kerja Ulang dan Perawatan Sumur = Workover and Well Service
Uji Sumur = Well Testing
Teknik Gas Bumi = Natural Gas Engineering
Korosi dan Proteksi Katodik = Corrosion and Cathodic Protection
Keekonomian Migas = Oil and Gas Economics
Simulasi Produksi = Production Simulation
Pengolahan Air Terproduksi = Produced Water Treatment
Stimulasi Sumur = Well Stimulation
Pengendalian Pasir = Sand Control
Manajemen Lapangan Produksi = Production Field Management
Teknologi CCUS dan Energi Bersih = CCUS and Clean Energy Technology
Operasi Fasilitas Lepas Pantai = Offshore Facilities Operations
Integritas Sumur = Well Integrity
Optimasi Produksi = Production Optimization
Enhanced Oil Recovery = Enhanced Oil Recovery
Regulasi dan Etika Profesi Migas = Oil and Gas Regulations and Professional Ethics
Praktik Terpadu TP 1 = Integrated Practicum TP 1
Praktik Terpadu TP 2 = Integrated Practicum TP 2
Kimia Organik = Organic Chemistry
Kimia Analisis = Analytical Chemistry
Praktikum Kimia Organik = Organic Chemistry Practicum
Praktikum Kimia Analisis = Analytical Chemistry Practicum
Kimia Fisika = Physical Chemistry
Gambar Teknik dan Diagram Proses = Engineering Drawing and Process Diagrams
Pengantar Teknik Kimia = Introduction to Chemical Engineering
Neraca Massa dan Energi = Mass and Energy Balances
Aplikasi Komputer Proses = Process Computer Applications
Mekanika Fluida Proses = Process Fluid Mechanics
Perpindahan Panas = Heat Transfer
Termodinamika Teknik Kimia = Chemical Engineering Thermodynamics
Analisis Minyak Bumi = Petroleum Analysis
Operasi Teknik Kimia I = Chemical Engineering Operations I
Operasi Teknik Kimia II = Chemical Engineering Operations II
Perpindahan Massa = Mass Transfer
Teknologi Minyak Bumi = Petroleum Technology
Kinetika dan Katalis = Kinetics and Catalysis
Distilasi Minyak Bumi = Crude Oil Distillation
Peralatan Proses Kilang = Refinery Process Equipment
Instrumentasi dan Kontrol Proses = Process Instrumentation and Control
Proses Konversi Kilang = Refinery Conversion Processes
Pengolahan Gas Bumi = Natural Gas Processing
Utilitas Kilang = Refinery Utilities
Pengolahan Limbah Industri = Industrial Waste Treatment
Praktik Operasi Unit Distilasi = Distillation Unit Operation Practicum
Simulasi Proses = Process Simulation
Teknologi Petrokimia = Petrochemical Technology
Keekonomian Kilang = Refinery Economics
Manajemen Operasi Kilang = Refinery Operations Management
Energi Terbarukan dan Biorefinery = Renewable Energy and Biorefinery
Pengendalian Mutu Produk = Product Quality Control
Blending Produk BBM = Fuel Product Blending
Praktik Pengolahan Gas = Gas Processing Practicum
Praktik Utilitas = Utilities Practicum
Praktik Terpadu TO 1 = Integrated Practicum TO 1
Praktik Terpadu TO 2 = Integrated Practicum TO 2
Praktik Terpadu TO 3 = Integrated Practicum TO 3
Praktik Terpadu TO 4 = Integrated Practicum TO 4
Optimasi Proses = Process Optimization
Analisis Keselamatan Proses = Process Safety Analysis
Praktik Kontrol Proses = Process Control Practicum
Troubleshooting Unit Proses = Process Unit Troubleshooting
Statistika dan Probabilitas = Statistics and Probability
Rangkaian Listrik = Electric Circuits
Praktikum Rangkaian Listrik = Electric Circuits Practicum
Gambar Teknik dan Diagram Instrumen = Engineering Drawing and Instrument Diagrams
Pengantar Instrumentasi Kilang = Introduction to Refinery Instrumentation
Elektronika Dasar = Basic Electronics
Algoritma dan Pemrograman = Algorithms and Programming
Teknik Pengukuran = Measurement Techniques
Elektronika Analog = Analog Electronics
Elektronika Digital = Digital Electronics
Sensor dan Transduser = Sensors and Transducers
Mesin Listrik = Electrical Machines
Sistem Kontrol Dasar = Basic Control Systems
Kalibrasi Instrumen = Instrument Calibration
Mikrokontroler = Microcontrollers
Instrumentasi Proses Kilang = Refinery Process Instrumentation
Pemrograman PLC = PLC Programming
Sistem Kontrol Proses = Process Control Systems
Jaringan Komunikasi Industri = Industrial Communication Networks
Elemen Kontrol Akhir = Final Control Elements
Distributed Control System = Distributed Control System
Analisa Instrumen (Analyzer) = Instrument Analysis (Analyzer)
Sistem Instrumentasi Keselamatan = Safety Instrumented Systems
Praktik Instrumentasi Proses = Process Instrumentation Practicum
Tuning Pengendali = Controller Tuning
Keamanan Siber Industri = Industrial Cybersecurity
Manajemen Pemeliharaan Instrumen = Instrument Maintenance Management
SCADA dan HMI = SCADA and HMI
Pemeliharaan Instrumen = Instrument Maintenance
Praktik DCS = DCS Practicum
Fire and Gas System = Fire and Gas System
Kewirausahaan Teknologi = Technology Entrepreneurship
Praktik Terpadu TI 1 = Integrated Practicum TI 1
Praktik Terpadu TI 2 = Integrated Practicum TI 2
Praktik Terpadu TI 3 = Integrated Practicum TI 3
Praktik Terpadu TI 4 = Integrated Practicum TI 4
Kontrol Lanjut = Advanced Control
Integrasi Sistem Otomasi = Automation Systems Integration
Instrumentasi Cerdas dan IIoT = Smart Instrumentation and IIoT
Troubleshooting Loop Kontrol = Control Loop Troubleshooting
Matematika Teknik = Engineering Mathematics
Termodinamika Teknik = Engineering Thermodynamics
Gambar Teknik Mesin = Mechanical Engineering Drawing
Pengetahuan Bahan Teknik = Engineering Materials
Proses Manufaktur = Manufacturing Processes
Statika Struktur = Structural Statics
Kerja Bangku dan Pelat = Bench Work and Sheet Metal Work
Menggambar dengan CAD = Computer-Aided Drafting (CAD)
Kekuatan Material = Strength of Materials
Elemen Mesin = Machine Elements
Pengelasan = Welding
Pemesinan = Machining
Pompa dan Kompresor = Pumps and Compressors
Bejana Tekan dan Alat Penukar Kalor = Pressure Vessels and Heat Exchangers
Turbin dan Penggerak = Turbines and Prime Movers
Sistem Perpipaan = Piping Systems
Pemeliharaan Mesin = Machinery Maintenance
Metrologi dan Inspeksi = Metrology and Inspection
Analisis Getaran = Vibration Analysis
Inspeksi Peralatan Statis = Static Equipment Inspection
Korosi dan Integritas Material = Corrosion and Material Integrity
Overhaul Pompa = Pump Overhaul
Overhaul Kompresor = Compressor Overhaul
Manajemen Pemeliharaan = Maintenance Management
Praktik Terpadu TM 1 = Integrated Practicum TM 1
Praktik Terpadu TM 2 = Integrated Practicum TM 2
Praktik Terpadu TM 3 = Integrated Practicum TM 3
Praktik Terpadu TM 4 = Integrated Practicum TM 4
Praktik Terpadu TM 5 = Integrated Practicum TM 5
Praktik Terpadu TM 6 = Integrated Practicum TM 6
Uji Tak Rusak (NDT) = Non-Destructive Testing (NDT)
Pelumasan dan Tribologi = Lubrication and Tribology
Analisis Keandalan Aset = Asset Reliability Analysis
Simulasi Struktur dengan Perangkat Lunak = Structural Simulation with Software
Alignment dan Balancing = Alignment and Balancing
Praktik Perpipaan = Piping Practicum
Hidrolik dan Pneumatik = Hydraulics and Pneumatics
Root Cause Failure Analysis = Root Cause Failure Analysis
Statistika Industri 1 = Industrial Statistics 1
Statistika Industri 2 = Industrial Statistics 2
Matematika Optimasi = Optimization Mathematics
Pengantar Logistik Migas = Introduction to Oil and Gas Logistics
Pengetahuan Produk Migas = Oil and Gas Product Knowledge
Akuntansi Dasar = Basic Accounting
Aplikasi Komputer Logistik = Logistics Computer Applications
Manajemen Rantai Pasok = Supply Chain Management
Ekonomi Teknik = Engineering Economics
Pengukuran Kuantitas Migas = Oil and Gas Quantity Measurement
Manajemen Persediaan = Inventory Management
Sistem Informasi Logistik = Logistics Information Systems
Riset Operasi = Operations Research
Manajemen Pergudangan = Warehouse Management
Transportasi Migas = Oil and Gas Transportation
Pengadaan Barang dan Jasa = Procurement of Goods and Services
Operasi Terminal dan Depot = Terminal and Depot Operations
Manajemen Kontrak = Contract Management
Perencanaan Distribusi BBM = Fuel Distribution Planning
Kepabeanan dan Perdagangan = Customs and Trade
Logistik Hijau = Green Logistics
Analitik Data Logistik = Logistics Data Analytics
Losses Control Migas = Oil and Gas Losses Control
Simulasi Sistem Logistik = Logistics System Simulation
Manajemen Armada = Fleet Management
Praktik Pergudangan = Warehousing Practicum
Kewirausahaan Logistik = Logistics Entrepreneurship
Praktik Terpadu LO 1 = Integrated Practicum LO 1
Praktik Terpadu LO 2 = Integrated Practicum LO 2
Praktik Terpadu LO 3 = Integrated Practicum LO 3
Praktik Terpadu LO 4 = Integrated Practicum LO 4
Praktik Terpadu LO 5 = Integrated Practicum LO 5
Praktik Terpadu LO 6 = Integrated Practicum LO 6
Praktik Terpadu LO 7 = Integrated Practicum LO 7
Praktik Terpadu LO 8 = Integrated Practicum LO 8
Manajemen Risiko Rantai Pasok = Supply Chain Risk Management
Praktik Pengadaan Elektronik = Electronic Procurement Practicum
Perencanaan Kebutuhan Material = Material Requirements Planning
Logistik Lepas Pantai = Offshore Logistics
Optimasi Rute Distribusi = Distribution Route Optimization
Pemasaran Digital = Digital Marketing
Perancangan Sistem Logistik = Logistics System Design
Praktik Terminal LPG = LPG Terminal Practicum
`;
/*SIAKAD*/

export const MK_EN = (() => { const m = new Map(); MK_TEKS.split('\n').forEach(l => { const i = l.indexOf(' = '); if (i > 0) m.set(kunci(l.slice(0, i)), l.slice(i + 3).trim()); }); return m; })();

/** Tambah padanan dari sumber lain (misalnya nama Inggris di transkrip SIAKAD) tanpa menimpa yang sudah ada. */
export function tambahMkEn(pasangan) { let n = 0; for (const [id, en] of pasangan) { const k = kunci(id); if (k && en && !MK_EN.has(k)) { MK_EN.set(k, en); n++; } } return n; }

/** Teks CPL Indonesia bawaan seed (per prodi) -> {en, singkat, singkatEn}. */
const CPL_INDEX = (() => {
  const m = new Map();
  PRODI_DEF.forEach(pd => {
    CPL_T.forEach(([, k, t]) => {
      let id = t.replace('{d}', pd.d);
      if (pd.id === 'TM' && k === 'P1') id = 'Memahami konsep teoretis matematika, sains, dan rekayasa yang mendasari ' + pd.d + '.';
      if (pd.id === 'LO' && k === 'KK3') id = 'Mampu membuat rancangan sistem logistik migas yang efisien dengan mempertimbangkan biaya, keselamatan, dan lingkungan.';
      const en = CPL_EN[k].replace('{d}', D_EN[pd.id] || '');
      if (pd.id === 'TM' && k === 'P1') m.set(kunci(id), { en: 'Understands the theoretical concepts of mathematics, science, and engineering that underlie ' + D_EN.TM + '.', s: SING[k][0], se: SING[k][1] });
      else if (pd.id === 'LO' && k === 'KK3') m.set(kunci(id), { en: 'Is able to produce efficient oil and gas logistics system designs considering cost, safety, and the environment.', s: SING[k][0], se: SING[k][1] });
      else m.set(kunci(id), { en, s: SING[k][0], se: SING[k][1] });
    });
  });
  return m;
})();
export const draftCpl = (c) => CPL_INDEX.get(kunci(c.teks)) || null;
export const draftMk = (m) => MK_EN.get(kunci(m.nama)) || null;
