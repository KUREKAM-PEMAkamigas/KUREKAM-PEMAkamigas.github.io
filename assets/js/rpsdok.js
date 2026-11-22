/* KUREKAM · Dokumen RPS berformat templat (FM-BPPAK): kepala, identitas, jam, otorisasi, CPL/CPMK/Sub-CPMK,
   korelasi, deskripsi, pustaka, rencana 16 pertemuan (8 kolom bernomor), dan SAP.
   Dipakai untuk pratinjau cetak dan unduhan Word oleh dosen, Prodi, SPM, Akademik, dan Wakil Direktur I. */
import { S } from './app.js';
import { APP } from './config.js';
import { labelKel } from './kode.js';
import { param, durasi, fmt, kriteriaPi, iabeeOf, cplSingkat } from './rules.js';
import { detect } from './bloom.js';
import { teknikDari, rubrikDipakai } from './rubrik.js';
import { buatDocx, muatBerkas } from './docxlib.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const namaBerkasRps = (m) => `RPS_${m.kode}_${String(m.nama).replace(/[^A-Za-z0-9]+/g, '_')}.docx`;

export const CATATAN_JUDUL = 'Catatan sesuai dengan SN Dikti (Permendiktisaintek No. 39 Tahun 2025 jo. Permendiktisaintek No. 10 Tahun 2026):';
export const CATATAN_RPS = [
  ['Capaian Pembelajaran Lulusan PRODI (CPL-PRODI) adalah rumusan standar kompetensi lulusan yang dimiliki oleh setiap lulusan PRODI sesuai jenjangnya (Pasal 6–7), yang mencakup kompetensi terintegrasi meliputi:',
    'penguasaan ilmu pengetahuan dan teknologi, serta kecakapan/keterampilan spesifik dan aplikasinya;',
    'kecakapan umum sebagai dasar penguasaan ilmu pengetahuan, teknologi, dan bidang kerja yang relevan;',
    'pengetahuan dan keterampilan yang dibutuhkan untuk dunia kerja, studi lanjut, dan/atau sertifikasi profesi; serta',
    'kemampuan intelektual untuk berpikir secara mandiri dan kritis sebagai pembelajar sepanjang hayat (dengan tetap berlandaskan sikap beriman, bertakwa, berakhlak mulia, dan berkarakter Pancasila).'],
  'CPL yang dibebankan pada mata kuliah adalah beberapa capaian pembelajaran lulusan program studi (CPL-PRODI) yang dibebankan pada suatu mata kuliah sebagai acuan pembentukan/pengembangan mata kuliah tersebut, yang merepresentasikan keterpaduan aspek sikap, pengetahuan, kecakapan umum, dan kecakapan/keterampilan spesifik.',
  'CP Mata Kuliah (CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPL yang dibebankan pada mata kuliah, dan bersifat spesifik terhadap bahan kajian atau materi pembelajaran mata kuliah tersebut.',
  'Sub-CP Mata Kuliah (Sub-CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPMK yang dapat diukur atau diamati dan merupakan kemampuan akhir yang direncanakan pada tiap tahap pembelajaran. Sub-CPMK dalam RPS ini ditulis dengan level kognitif Taksonomi Bloom yang sesuai (C4: Analisis, C5: Evaluasi/Sintesis, C6: Mencipta).',
  'Indikator penilaian kemampuan dalam proses maupun hasil belajar mahasiswa adalah pernyataan spesifik dan terukur yang mengidentifikasi kemampuan atau kinerja hasil belajar mahasiswa yang disertai bukti-bukti.',
  'Kriteria Penilaian adalah patokan yang digunakan sebagai ukuran atau tolok ukur ketercapaian pembelajaran dalam penilaian berdasarkan indikator-indikator yang telah ditetapkan. Kriteria penilaian merupakan pedoman bagi penilai agar penilaian konsisten, objektif, akuntabel, dan tidak bias. Kriteria dapat berupa kuantitatif ataupun kualitatif.',
  'Teknik penilaian mencakup penilaian formatif dan sumatif (Pasal 27) yang dilakukan melalui Tes tulis, Tes lisan, Observasi, Partisipasi, Unjuk kerja, Laporan, dan Presentasi (dengan instrumen berupa rubrik dan/atau portofolio).',
  'Bentuk pembelajaran sesuai Pasal 16 ayat (1) meliputi: Kuliah, Responsi, Tutorial, Seminar, Praktikum, Praktik, Studio, Penelitian, Perancangan, Pengembangan, Tugas Akhir, Pelatihan Bela Negara, Pertukaran Pelajar, Magang, Wirausaha, Pengabdian kepada Masyarakat, dan/atau bentuk pembelajaran lain yang setara.',
  'Metode Pembelajaran yang berpusat pada mahasiswa (student-centered learning) meliputi: Small Group Discussion, Role-Play & Simulation, Discovery Learning, Self-Directed Learning, Cooperative Learning, Collaborative Learning, Contextual Learning, Project-Based Learning, Case-Based Learning, dan metode lainnya yang setara.',
  'Materi Pembelajaran adalah rincian atau uraian dari bahan kajian yang dapat disajikan dalam bentuk beberapa pokok dan sub-pokok bahasan. Materi dikaitkan dengan konteks industri dan, bila relevan, dengan perangkat lunak atau simulasi pendukung untuk memperkuat relevansi industri.',
  'Bobot penilaian adalah persentase penilaian terhadap setiap pencapaian Sub-CPMK yang besarnya proporsional dengan tingkat kesulitan dan kedalaman pencapaian Sub-CPMK tersebut, dengan total keseluruhan 100%.',
  'Singkatan kegiatan belajar (Pasal 16 ayat 2): TM = Tatap Muka; TB = Belajar Terbimbing; PT = Penugasan Terstruktur; BM = Belajar Mandiri (dengan beban 1 SKS setara 45 jam per semester).',
];

/* ---------- Model dokumen: satu sumber untuk pratinjau HTML dan berkas Word ---------- */
const DOK = { no: 'FM-BPPAK.01-06', terbit: '11 Januari 2023', rev: '02' };
const BIRU = 'D9E2F3', ABU = 'E7E6E6';
const pendek = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const tglId = (t) => { const x = String(t || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return x ? `${x[3].padStart(2, '0')}-${x[2].padStart(2, '0')}-${x[1]}` : (t || ''); };
export const METODE_SIFAT = [
  ['Small Group Discussion', 'Berpusat pada Mahasiswa', 'Kolaboratif', 'Holistik'],
  ['Role-Play & Simulation', 'Berpusat pada Mahasiswa', 'Kolaboratif', 'Holistik'],
  ['Discovery Learning', 'Saintifik', 'Berpusat pada Mahasiswa', ''],
  ['Self-Directed Learning', 'Berpusat pada Mahasiswa', '', ''],
  ['Cooperative Learning', 'Interaktif', 'Kolaboratif', ''],
  ['Collaborative Learning', 'Kolaboratif', 'Berpusat pada Mahasiswa', ''],
  ['Contextual Learning', 'Efektif', 'Kolaboratif', ''],
  ['Project Based Learning', 'Tematik', 'Holistik', 'Berpusat pada Mahasiswa'],
  ['Problem Based Learning', 'Tematik', 'Berpusat pada Mahasiswa', ''],
];

/** Gabungkan sel berurutan yang kuncinya sama menjadi satu sel bertingkat (rowspan). */
function gabung(rows, kol, kunci, isi) {
  let i = 0;
  while (i < rows.length) {
    let j = i; while (j + 1 < rows.length && kunci(j + 1) === kunci(i)) j++;
    const n = j - i + 1;
    rows[i][kol] = { t: isi(i, j), rs: n, va: 'center', al: 'c' };
    for (let k = i + 1; k <= j; k++) rows[k][kol] = { skip: true };
    i = j + 1;
  }
}

export function modelRps(m, r) {
  const P = param(S), p = S.prodi.find(x => x.id === m.prodi) || { nama: m.prodi };
  const cplMk = (m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
  const cpmk = S.cpmk.filter(c => c.mk === m.id), subs = S.sub.filter(s => s.mk === m.id);
  const cplById = (id) => S.cpl.find(c => c.id === id);
  const cplKode = cplSingkat;
  const prak = (+m.P || 0) > (+m.T || 0);
  const tugas = S.tugas.filter(t => t.mk === m.id);
  const nama = (id) => (S.dosen.find(d => d.id === id) || {}).nama;
  const peng = tugas.map(t => nama(t.dosen)).filter(Boolean);
  const koor = tugas.filter(t => t.koordinator).map(t => nama(t.dosen)).filter(Boolean)[0] || r.koordinator || '';
  const kaprodi = r.kaprodi || p.kaprodi || '';
  const T = +m.T || 0, Pr = +m.P || 0, dp = durasi(m, P);
  const tm = (T * P.menitTeori + Pr * dp) * 16;
  const subK = (id) => { const s = S.sub.find(x => x.id === id); return s ? s.kode : ''; };
  const bloomKode = (teks) => { const b = detect(teks, prak ? 'P' : 'C'); return b && !/\((?:[CPA]\d(?:,\s*)?)+\)\s*\.?$/.test(String(teks)) ? ` (${b.code})` : ''; };
  const pert = (r.pertemuan || []).slice().sort((a, b) => a.m - b.m);
  const B = [];

  /* 1. Kepala dokumen */
  B.push({ k: 'tbl', w: [1900, 7600, 2200, 4100], sz: 20, rows: [
    [{ img: { w: 175, h: 212 }, shade: BIRU, va: 'center' },
      { t: `**KEMENTERIAN ENERGI DAN SUMBER DAYA MINERAL**\n**BADAN PENGEMBANGAN SUMBER DAYA MANUSIA ENERGI DAN SUMBER DAYA MINERAL**\n**POLITEKNIK ENERGI DAN MINERAL AKAMIGAS**\n**PROGRAM STUDI ${String(p.nama).toUpperCase()}**`, al: 'c', va: 'center', shade: BIRU, sz: 22 },
      { t: 'No Dokumen\nTanggal Terbit\nRevisi\nJumlah Halaman', shade: BIRU, va: 'center' },
      { t: `: ${DOK.no}\n: ${DOK.terbit}\n: ${DOK.rev}\n: {{HAL}}`, shade: BIRU, va: 'center' }],
    [{ t: '**RENCANA PEMBELAJARAN SEMESTER**', span: 4, al: 'c', sz: 24, shade: BIRU }],
  ] });

  /* 2. Identitas */
  B.push({ k: 'tbl', w: [5200, 1600, 2800, 1300, 1500, 1500, 1900], head: 2, sz: 20, rows: [
    [{ t: 'MATA KULIAH (MK)', rs: 2 }, { t: 'KODE', rs: 2 }, { t: 'Rumpun MK', rs: 2 }, { t: 'BOBOT (sks)', span: 2 }, { t: 'SEMESTER', rs: 2 }, { t: 'Tgl Penyusunan', rs: 2 }],
    [{ skip: true }, { skip: true }, { skip: true }, 'Teori', 'Praktikum', { skip: true }, { skip: true }],
    [{ t: `**${m.nama}**`, al: 'c' }, { t: m.kode, al: 'c' }, { t: labelKel(m.kel), al: 'c' }, { t: String(T), al: 'c' }, { t: String(Pr), al: 'c' }, { t: String(m.smt), al: 'c' }, { t: `${tglId(r.tgl) || tglId(new Date().toISOString())}${r.revisi ? '\n(' + r.revisi + ')' : ''}`, al: 'c' }],
  ] });

  /* 3. Jam pembelajaran dan otorisasi */
  const jam = (v) => v ? `${v} menit` : '-';
  const nm = (v) => ({ t: `\n\n\n${v || '..............................'}`, rs: 3, va: 'bottom', al: 'c' });
  B.push({ k: 'tbl', w: [2600, 2600, 3533, 3533, 3534], sz: 20, rows: [
    [{ t: '**JUMLAH JAM PEMBELAJARAN**', span: 2, al: 'c', shade: BIRU }, { t: '**OTORISASI / PENGESAHAN**', span: 3, al: 'c', shade: BIRU }],
    ['Tatap Muka', `${fmt(tm)} menit`, { t: '**Dosen Pengembang RPS**', al: 'c' }, { t: '**Koordinator RMK**', al: 'c' }, { t: '**Ka Prodi**', al: 'c' }],
    ['Tugas Terstruktur', jam(r.jamTerstruktur), nm(peng.join('; ')), nm(koor), nm(kaprodi)],
    ['Tugas Mandiri', jam(r.jamMandiri), { skip: true }, { skip: true }, { skip: true }],
    ['Tugas Terbimbing', jam(r.jamTerbimbing), { skip: true }, { skip: true }, { skip: true }],
  ] });

  /* 4. Capaian pembelajaran */
  const cp = [];
  cp.push([{ t: '**Capaian Pembelajaran (CP)**', rs: 1 }, { t: '**CPL-PRODI yang dibebankan pada MK**', span: 2, shade: ABU }]);
  if (cplMk.length) cplMk.forEach(c => cp.push([{ skip: true }, { t: `**${cplKode(c)}**` }, { t: c.teks }])); else cp.push([{ skip: true }, { t: '', span: 2 }]);
  cp.push([{ skip: true }, { t: '**Capaian Pembelajaran Mata Kuliah (CPMK)**', span: 2, shade: ABU }]);
  if (cpmk.length) cpmk.forEach(c => cp.push([{ skip: true }, { t: `**${c.kode}**` }, { t: c.teks }])); else cp.push([{ skip: true }, { t: '', span: 2 }]);
  cp.push([{ skip: true }, { t: '**Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)**', span: 2, shade: ABU }]);
  if (subs.length) subs.forEach(s => cp.push([{ skip: true }, { t: `**${s.kode}**` }, { t: s.teks.replace(/\.$/, '') + bloomKode(s.teks) + '.' }])); else cp.push([{ skip: true }, { t: '', span: 2 }]);
  cp.push([{ skip: true }, { t: 'Ranah dan level pada akhir rumusan: A = Afektif; C = Kognitif; P = Psikomotor, mengikuti Taksonomi Bloom.', span: 2, i: true, sz: 16 }]);
  cp[0][0].rs = cp.length;
  B.push({ k: 'tbl', w: [2200, 1900, 11700], sz: 20, rows: cp });

  /* 5. Korelasi CPMK dan Sub-CPMK */
  const nS = Math.max(subs.length, 1), wS = Math.floor(11700 / nS), wKor = [2200, 1900, ...Array(nS).fill(wS)]; wKor[wKor.length - 1] += 11700 - wS * nS;
  B.push({ k: 'tbl', w: wKor, head: 1, sz: nS > 8 ? 16 : 18, rows: [
    [{ t: 'Korelasi CPMK terhadap Sub-CPMK', span: 2 }, ...(subs.length ? subs.map(s => s.kode) : [''])],
    ...(cpmk.length ? cpmk : [{ kode: '', id: '' }]).map(c => ['', { t: `**${c.kode}**`, al: 'c' }, ...(subs.length ? subs.map(s => ({ t: s.cpmk === c.id ? '✓' : '', al: 'c' })) : [''])]),
  ] });

  /* 6. Deskripsi, bahan kajian, pustaka, dosen, syarat, integrasi */
  const bk = (m.bk || []).map(id => (S.bk.find(b => b.id === id) || {}).nama).filter(Boolean);
  const syarat = (m.prasyarat || []).map(id => (S.mk.find(x => x.id === id) || {}).nama).filter(Boolean).join('; ');
  const integ = [];
  if (r.penelitian || r.pkm) integ.push(`**Penelitian:** ${r.penelitian || '-'}\n**PKM:** ${r.pkm || '-'}`);
  pert.filter(x => x.integ || (x.riset || []).length).forEach(x => {
    const ent = (x.riset || []).map(id => { const e = (S.riset || []).find(y => y.id === id); return e ? `${e.jenis}: ${e.judul}` : ''; }).filter(Boolean).join('; ');
    integ.push(`Pertemuan ${x.m} (${ent || x.integ}): ${x.integUraian || '-'}`);
  });
  const dots = '..........';
  const baris2 = [
    ['Deskripsi Singkat MK', r.deskripsi || dots],
    ['Bahan Kajian: Materi pembelajaran', r.bahan || (bk.length ? bk.map((b, i) => `${i + 1}. ${b}`).join('; ') : dots)],
    ...(r.pustakaPendukung ? [['Pustaka Utama', r.pustaka || dots], ['Pustaka Pendukung', r.pustakaPendukung]] : [['Pustaka', String(r.pustaka || '').trim() || dots]]),
    ['Dosen Pengampu', peng.join('; ') || dots],
    ['Matakuliah syarat', r.syarat || syarat || '-'],
    ['Integrasi penelitian dan PKM', integ.join('\n') || dots],
  ];
  B.push({ k: 'tbl', w: [2600, 13200], sz: 20, rows: baris2.map(x => [{ t: `**${x[0]}**`, shade: 'F2F2F2' }, { t: x[1], al: /^(Deskripsi|Bahan)/.test(x[0]) ? 'j' : '' }]) });

  /* 7. Rencana pembelajaran 16 pertemuan */
  const rubrikLabel = (txt) => teknikDari(txt).map(k => `Rubrik ${k.rubrik} (${k.rubrik === 'K1' ? 'Ujian Tulis' : k.nama})`);
  const pc = (v) => `${String(Math.round((+v || 0) * 100) / 100).replace('.', ',')}%`;
  /* Indikator: satu per baris, diberi nomor pertemuan.urut (3.1, 3.2, ...); tiga per Sub-CPMK. */
  const indikatorNomor = (x) => String(x.indikator || '').split(/\n+/).map(t => t.trim().replace(/^\d+(\.\d+)*[.)]?\s+/, '')).filter(Boolean).map((t, i) => `${x.m}.${i + 1} ${t}`).join('\n');
  const rows7 = [
    [{ t: 'Mg Ke-', rs: 2 }, { t: 'Kemampuan akhir tiap tahapan belajar (Sub-CPMK)', rs: 2 }, { t: 'Penilaian', span: 2 }, { t: 'Bentuk Pembelajaran; Metode Pembelajaran;\nPenugasan Mahasiswa;', span: 2 }, { t: 'Materi Pembelajaran', rs: 2 }, { t: 'Bobot Penilaian (%)', rs: 2 }],
    [{ skip: true }, { skip: true }, 'Indikator', 'Kriteria & Teknik', '', '', { skip: true }, { skip: true }],
    ['(1)', '(2)', '(3)', '(4)', 'Tatap Muka (5)', 'Daring (6)', '(7)', '(8)'].map(t => ({ t, sz: 16, b: true })),
  ];
  pert.forEach(x => {
    if (x.ujian) {
      rows7.push([{ t: `**${x.m}**`, al: 'c' }, { t: `**${x.ujian}**${x.materi ? ': ' + x.materi : ''}${(x.sub || []).length ? '\n' + (x.sub || []).map(subK).filter(Boolean).join(', ') : ''}\nTeknik: ${x.asesmen || '-'}${x.metode ? ' · ' + x.metode : ''}${rubrikLabel(`${x.asesmen || ''}`).length ? '\nKriteria: ' + rubrikLabel(x.asesmen).join(', ') : ''}`, span: 6, shade: 'F2F2F2' }, { t: `**${pc(x.bobot)}**`, al: 'c' }]);
      return;
    }
    const sk = (x.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean).map(s => `**${s.kode}**\n${s.teks}${bloomKode(s.teks)}`).join('\n');
    const rl = rubrikLabel(x.asesmen);
    const krit = x.asesmen ? `${rl.length ? 'Kriteria: ' + rl.join(', ') + '\n' : ''}Teknik: ${x.asesmen}` : '';
    const tmk = x.tatap || (x.metode ? 'Metode: ' + x.metode : '');
    const lines = x.integ || (x.riset || []).length ? `\nIntegrasi ${x.integ || 'penelitian dan PKM'}` : '';
    rows7.push([{ t: `**${x.m}**`, al: 'c' }, sk, indikatorNomor(x), krit, tmk + lines, x.daring || '', x.materi || '', { t: `**${pc(x.bobot)}**`, al: 'c' }]);
  });
  const tot = pert.reduce((a, x) => a + (+x.bobot || 0), 0), ok100 = Math.abs(tot - 100) < 0.05;
  rows7.push([{ t: '**Jumlah bobot penilaian**', span: 7, al: 'c' }, { t: `**${pc(tot)}**`, al: 'c', color: ok100 ? '' : 'C00000' }]);
  B.push({ k: 'tbl', w: [600, 2300, 2300, 2100, 2400, 1900, 3500, 700], head: 3, sz: 17, rows: rows7 });
  if (!ok100) B.push({ k: 'p', t: `Perhatian: jumlah bobot penilaian ${fmt(tot, 1)}%, seharusnya 100%.`, color: 'C00000', b: true });

  /* 8. Catatan SN Dikti */
  B.push({ k: 'h', lvl: 2, t: CATATAN_JUDUL, sb: 240 });
  CATATAN_RPS.forEach((c, i) => {
    if (Array.isArray(c)) { B.push({ k: 'p', t: `${i + 1}.  ${c[0]}`, ind: 0, hang: 360, sa: 20, sz: 18 }); c.slice(1).forEach(x => B.push({ k: 'p', t: `–  ${x}`, ind: 360, hang: 300, sa: 10, sz: 18 })); }
    else B.push({ k: 'p', t: `${i + 1}.  ${c}`, ind: 0, hang: 360, sa: 20, sz: 18 });
  });

  /* 9. Metode dan sifat pembelajaran */
  B.push({ k: 'h', lvl: 2, t: 'Metode Pembelajaran dan Sifat Pembelajaran', sb: 240 });
  B.push({ k: 'tbl', w: [4600, 3733, 3733, 3734], head: 1, sz: 19, rows: [['Metode Pembelajaran', { t: 'Sifat Pembelajaran', span: 3 }], ...METODE_SIFAT.map(x => [x[0], x[1], x[2], x[3]])] });
  const dipakai = METODE_SIFAT.filter(x => pert.some(q => String(q.metode || '').toLowerCase().includes(x[0].toLowerCase().replace(' & ', ' ').split(' ')[0]) && String(q.metode || '').toLowerCase().includes(x[0].toLowerCase().split(' ').slice(-1)[0]))).map(x => x[0]);
  if (dipakai.length) B.push({ k: 'p', t: `Metode yang dipakai pada RPS ini: ${dipakai.join(', ')}.`, sz: 18 });

  /* 10. Portofolio penilaian dan evaluasi ketercapaian CPL */
  B.push({ k: 'h', lvl: 1, t: 'Portofolio Penilaian dan Evaluasi Ketercapaian CPL Mahasiswa', pb: true });
  B.push({ k: 'p', t: 'Tabel ini dipakai dosen untuk mengisi nilai setiap bentuk penilaian, menghitung ketercapaian CPMK, lalu ketercapaian CPL pada mata kuliah ini. Baris dikelompokkan menurut CPMK. Bobot ujian yang mencakup beberapa Sub-CPMK dibagi sesuai jumlah Sub-CPMK pada tiap CPMK.', sz: 19 });
  const cpmkOrder = new Map(cpmk.map((c, i) => [c.id, i]));
  const ent = [];
  pert.forEach(x => {
    const ss = (x.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean);
    const g = new Map(); ss.forEach(s => { if (!g.has(s.cpmk)) g.set(s.cpmk, []); g.get(s.cpmk).push(s); });
    if (!g.size) { if (+x.bobot) ent.push({ x, ck: '', ss: [], b: +x.bobot || 0 }); return; }
    g.forEach((arr, ck) => ent.push({ x, ck, ss: arr, b: (+x.bobot || 0) * arr.length / ss.length }));
  });
  ent.sort((a, b) => (cpmkOrder.has(a.ck) ? cpmkOrder.get(a.ck) : 99) - (cpmkOrder.has(b.ck) ? cpmkOrder.get(b.ck) : 99) || a.x.m - b.x.m);
  const ckObj = (id) => cpmk.find(c => c.id === id);
  const cplDari = (id) => { const c = ckObj(id); return c ? (c.cpl || []).map(cplById).filter(Boolean).map(q => q.kode) : []; };
  const cplTampil = (id) => { const c = ckObj(id); return c ? (c.cpl || []).map(cplById).filter(Boolean).map(cplSingkat) : []; };
  const rows10 = ent.map(e => {
    const cl = cplDari(e.ck);
    return [{ t: String(e.x.m), al: 'c' }, { t: cl.join(', '), al: 'c' }, '', e.ss.map(s => s.kode).join(', ') || '-', pendek(String(e.x.indikator || '').split(/\n/)[0], 90) || '-', e.x.ujian ? `**${e.x.ujian}**${e.x.asesmen ? ': ' + e.x.asesmen : ''}` : (e.x.asesmen || e.x.metode || '-'), { t: `${fmt(e.b, 1)}%`, al: 'c' }, '', '', '', ''];
  });
  const kodeCk = (i) => (ckObj(ent[i].ck) || {}).kode || '-';
  gabung(rows10, 2, (i) => ent[i].ck, (i) => kodeCk(i));
  gabung(rows10, 1, (i) => cplDari(ent[i].ck).join(','), (i, j) => cplTampil(ent[i].ck).join('\n') || '-');
  gabung(rows10, 9, (i) => ent[i].ck, (i, j) => `${fmt(ent.slice(i, j + 1).reduce((a, e) => a + e.b, 0), 1)}%`);
  gabung(rows10, 10, (i) => cplDari(ent[i].ck).join(','), () => '');
  B.push({ k: 'tbl', w: [600, 1300, 1000, 1300, 1700, 3500, 800, 1100, 1200, 1300, 2000], head: 1, sz: 16, rows: [
    ['Mg', 'CPL', 'CPMK', 'Sub-CPMK', 'Indikator', 'Bentuk Penilaian', 'Bobot (%)', 'Nilai Mahasiswa', 'Bobot × Nilai', 'Bobot % CPMK', 'Ketercapaian CPL pada MK'],
    ...rows10,
    [{ t: '**Jumlah**', span: 6, al: 'c' }, { t: `**${fmt(ent.reduce((a, e) => a + e.b, 0), 1)}%**`, al: 'c' }, { t: '', span: 4 }],
  ] });
  B.push({ k: 'p', t: '**Cara menghitung.** Nilai Mahasiswa dalam skala 0 sampai 100. Bobot × Nilai = Bobot (%) × Nilai ÷ 100. Ketercapaian CPMK = jumlah (Bobot × Nilai) pada CPMK tersebut ÷ Bobot % CPMK × 100. Ketercapaian CPL pada MK = rata-rata tertimbang ketercapaian CPMK yang membentuk CPL itu, dengan Bobot % CPMK sebagai pembobot. Nilai akhir MK = jumlah seluruh (Bobot × Nilai).', sz: 18 });

  /* 11. Evaluasi indikator kinerja IABEE */
  const idCpmk = new Set(cpmk.map(c => c.id)), idCpl = new Set(cplMk.map(c => c.id));
  const piMk = (S.pi || []).filter(q => idCpl.has(q.cpl) && (!(q.cpmk || []).length || (q.cpmk || []).some(id => idCpmk.has(id)))).sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
  B.push({ k: 'h', lvl: 2, t: 'Evaluasi Ketercapaian Indikator Kinerja (PI) untuk IABEE', sb: 240 });
  if (piMk.length) {
    B.push({ k: 'p', t: `Setiap PI dinilai dari instrumen pada CPMK yang mengukurnya. PI dinyatakan tercapai bila persentase mahasiswa yang memperoleh nilai sekurang-kurangnya nilai batas memenuhi kriteria prodi (bawaan: ${P.piMinPersen}% mahasiswa dengan nilai minimal ${P.piMinNilai}). Isi kolom hasil setelah nilai mahasiswa tersedia. Jangan menuliskan nama atau nomor mahasiswa pada tabel ini; cukup jumlah.`, sz: 18 });
    B.push({ k: 'tbl', w: [900, 1300, 4300, 1000, 1700, 1900, 1600, 1100, 2000], head: 1, sz: 16, rows: [
      ['Kode PI', 'CPL', 'Rumusan PI', 'Butir IABEE', 'CPMK pengukur', 'Kriteria ketercapaian', 'Mahasiswa memenuhi / seluruh mahasiswa', 'Persen', 'Status'],
      ...piMk.map(q => { const c = cplById(q.cpl) || {}, kr = kriteriaPi(q, P); return [{ t: q.kode, al: 'c' }, { t: cplSingkat(c), al: 'c' }, q.teks || '', { t: iabeeOf(c).map(h => `(${h})`).join(' '), al: 'c' }, (q.cpmk || []).map(id => (ckObj(id) || {}).kode).filter(Boolean).join(', ') || '-', `Minimal ${kr.persen}% mahasiswa bernilai ≥ ${kr.nilai}`, { t: '…… / ……', al: 'c' }, '', 'Tercapai / Belum']; }),
    ] });
  } else {
    B.push({ k: 'p', t: 'Belum ada indikator kinerja (PI) yang dihubungkan ke CPMK mata kuliah ini. Hubungkan PI dan CPMK pada menu Indikator Kinerja agar ketercapaian CPL dapat dibuktikan untuk akreditasi IABEE.', sz: 18, i: true });
  }

  /* 12. Rubrik penilaian */
  rubrikDipakai(r, prak).forEach((rb, i) => {
    B.push({ k: 'h', lvl: 2, t: `${rb.id}. ${rb.judul}`, sb: 240, pb: i === 0 });
    const nk = rb.kolom.length, wk = Math.floor(12800 / nk);
    B.push({ k: 'tbl', w: [3000, ...Array(nk).fill(wk)], head: 1, sz: 17, rows: [
      [rb.id === 'K1' ? 'Komponen dan Bobot' : 'Aspek dan Bobot', ...rb.kolom],
      ...rb.baris.map(b => [{ t: `**${b[0]}**`, shade: 'F2F2F2' }, ...b.slice(1).map(x => x)]),
      [{ t: '**Nilai Akhir**', shade: 'F2F2F2' }, { t: rb.akhir, span: nk }],
    ] });
  });
  B.push({ k: 'p', t: 'Skor 0 diberikan bila komponen tidak dikerjakan. Rubrik ini bersifat umum; dosen dapat menyesuaikan deskriptor dengan topik mata kuliah dan melampirkan versi yang disesuaikan.', sz: 17, i: true });

  /* 13. SAP */
  const sap = pert.filter(x => x.sap && (x.sap.inti || x.sap.pendahuluan));
  if (sap.length) {
    B.push({ k: 'h', lvl: 1, t: 'Satuan Acara Perkuliahan (SAP)', pb: true });
    B.push({ k: 'tbl', w: [600, 3600, 4400, 3200, 4000], head: 1, sz: 17, rows: [['Mg', 'Pendahuluan', 'Kegiatan inti', 'Penutup', 'Media dan alat'], ...sap.map(x => [{ t: String(x.m), al: 'c' }, x.sap.pendahuluan || '', x.sap.inti || '', x.sap.penutup || '', x.sap.media || ''])] });
  }
  B.push({ k: 'p', t: `Kurikulum ${APP.tahunKurikulum} · Status RPS: ${r.status || 'draf'}${r.tgl ? ' · ' + tglId(r.tgl) : ''} · Dihasilkan dari KUREKAM.`, sz: 16, color: '666666', sb: 120 });
  return B;
}

/* ---------- Penyaji HTML (pratinjau layar dan cetak) ---------- */
const hSel = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>').replace(/¶/g, '<br><br>').replace(/\{\{HAL\}\}/g, '…');
export function htmlBlok(blocks, logoSrc = '') {
  return blocks.map(b => {
    if (b.k === 'h') return `<h4 ${b.pb ? 'style="page-break-before:always"' : ''}>${esc(b.t)}</h4>`;
    if (b.k === 'img') return `<p style="text-align:${b.al === 'l' ? 'left' : b.al === 'r' ? 'right' : 'center'};margin:6pt 0">${logoSrc ? `<img src="${logoSrc}" alt="" style="height:${Math.round((b.img.h || 200) / 100 * 37.8)}px">` : ''}</p>`;
    if (b.k === 'br') return '<div style="page-break-after:always"></div>';
    if (b.k === 'p') return `<p style="${b.ind ? `margin-left:${Math.round(b.ind / 20)}pt;` : ''}${b.hang ? `text-indent:-${Math.round(b.hang / 20)}pt;padding-left:${Math.round(b.hang / 20)}pt;` : ''}${b.i ? 'font-style:italic;' : ''}${b.color ? `color:#${b.color};` : ''}margin:2pt 0">${hSel(b.t)}</p>`;
    const tot = b.w.reduce((a, c) => a + c, 0);
    const kolom = `<colgroup>${b.w.map(w => `<col style="width:${(w / tot * 100).toFixed(2)}%">`).join('')}</colgroup>`;
    const rows = b.rows.map((row, ri) => {
      const head = ri < (b.head || 0);
      return `<tr>${row.map(cell => {
        const c = typeof cell === 'object' && cell !== null ? cell : { t: cell };
        if (c.skip) return '';
        const st = `${c.shade ? `background:#${c.shade};` : ''}${c.al ? `text-align:${{ c: 'center', j: 'justify', r: 'right' }[c.al] || 'left'};` : ''}${c.va ? `vertical-align:${c.va === 'center' ? 'middle' : c.va};` : ''}${c.color ? `color:#${c.color};` : ''}${c.sz ? `font-size:${Math.max(8, c.sz / 2)}pt;` : ''}`;
        const at = `${c.span > 1 ? ` colspan="${c.span}"` : ''}${c.rs > 1 ? ` rowspan="${c.rs}"` : ''}${st ? ` style="${st}"` : ''}`;
        const inner = c.img ? (logoSrc ? `<img src="${logoSrc}" alt="" style="height:64px">` : '') : hSel(c.t);
        return `<${head ? 'th' : 'td'}${at}>${inner}</${head ? 'th' : 'td'}>`;
      }).join('')}</tr>`;
    }).join('');
    return `<table class="tbl">${kolom}${rows}</table>`;
  }).join('');
}

/** Isi dokumen RPS sebagai HTML. logo=true menambahkan logo untuk pratinjau layar. */
export function badanRps(m, r, logo = false) { return htmlBlok(modelRps(m, r), logo ? 'assets/img/logo-rps.png' : ''); }

/** Berkas Word (.docx) lanskap A4 dengan logo, tabel berlebar tetap, rubrik, portofolio, dan evaluasi PI. */
export async function berkasDocxRps(m, r) {
  const logo = await muatBerkas('assets/img/logo-rps.png');
  return buatDocx({ blocks: modelRps(m, r), logo, footer: `RPS ${m.kode} ${m.nama} · KUREKAM`, judul: `RPS ${m.nama}` });
}
