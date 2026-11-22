/* KUREKAM · Tabel pemetaan kurikulum OBE per prodi (mengikuti Templat Tabel Kurikulum OBE PEM Akamigas, lembar 1 sampai 20)
   ditambah tabel IABEE (X1 sampai X4). Semua tabel dihitung dari data KUREKAM; yang bersumber dari RPS (16 sampai 20)
   dihitung dari bobot dan teknik penilaian pada pertemuan RPS. Fungsi murni: menerima S dan id prodi. */
import { byProdi, param, iabeeOf, kriteriaPi, sksOf } from './rules.js';
import { BUTIR_IABEE } from './config.js';
import { RUBRIK, teknikDari } from './rubrik.js';

const nu = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
const RANAH_URUT = { S: 1, P: 2, KU: 3, KK: 4 };
const RANAH_NAMA = { S: 'Sikap', P: 'Pengetahuan', KU: 'Keterampilan umum', KK: 'Keterampilan khusus' };
const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const V = (b) => (b ? 'V' : '');
export const snDari = (c) => String(c.sn || '').split(/[,;\n]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
const f1 = (n) => { const v = Math.round(n * 10) / 10; return String(v).replace('.', ','); };

/* Kolom teknik penilaian: urut mengikuti templat, dipecah agar bobot RPS terbaca. */
export const KOL_TEKNIK = [
  ['mbkm', 'MBKM', /mbkm|magang|studi independen|kampus mengajar/i],
  ['hadir', 'Partisipasi (kehadiran dan sikap)', /partisipasi|kehadiran|sikap|keaktifan/i],
  ['praktik', 'Observasi dan unjuk kerja (praktik)', /observasi|unjuk|praktik|praktikum|demonstrasi|simulasi|proyek|project/i],
  ['laporan', 'Laporan dan tugas', /laporan|makalah|tugas|resume|jurnal|portofolio/i],
  ['presentasi', 'Presentasi', /presentasi|paparan|seminar/i],
  ['kuis', 'Kuis (tes tulis)', /kuis|quiz|tes tulis|tertulis/i],
  ['uts', 'Tes tulis UTS', null],
  ['uas', 'Tes tulis UAS', null],
  ['lisan', 'Tes lisan', /lisan|tanya jawab|wawancara|diskusi/i],
];
const TAHAP = (m) => (m < 8 ? 'Sebelum UTS' : m === 8 ? 'UTS' : m < 16 ? 'Setelah UTS' : 'UAS');

const status = (cek) => !cek.length ? 'na' : cek.some(x => x[1] === 'bad') ? 'bad' : cek.some(x => x[1] === 'near') ? 'near' : 'ok';
const ck = (cond, okTeks, burukTeks, k = 'bad') => (cond ? [okTeks, 'ok'] : [burukTeks, k]);

/** Rincian penilaian per RPS: daftar entri (pertemuan x CPMK) dengan bobot dan kolom teknik. */
export function rincianRps(S, m, r) {
  const cpmk = S.cpmk.filter(c => c.mk === m.id), out = [];
  (r.pertemuan || []).forEach(p => {
    const ss = (p.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean);
    const g = new Map(); ss.forEach(s => { if (!g.has(s.cpmk)) g.set(s.cpmk, []); g.get(s.cpmk).push(s); });
    const teks = `${p.asesmen || ''} ${p.ujian ? '' : (p.metode || '')}`;
    const kol = p.ujian ? [/uts/i.test(p.ujian) ? 'uts' : 'uas'] : KOL_TEKNIK.filter(k => k[2] && k[2].test(String(p.asesmen || ''))).map(k => k[0]);
    if (p.ujian && /unjuk|praktik/i.test(String(p.asesmen || ''))) kol.push('praktik');
    const pakai = kol.length ? kol : ['laporan'];
    const keluar = (ck0, n) => out.push({ p, cpmk: ck0, b: (+p.bobot || 0) * n, kol: pakai, rb: teknikDari(teks).map(t => t.rubrik) });
    if (!g.size) { keluar(cpmk[0] ? cpmk[0].id : '', 1); return; }
    g.forEach((arr, ck0) => keluar(ck0, arr.length / ss.length));
  });
  return out;
}

export function tabelObe(S, pid) {
  const P = param(S);
  const pl = byProdi(S.pl, pid).sort((a, b) => nu(a.kode, b.kode));
  const cpl = byProdi(S.cpl, pid).sort((a, b) => nu(a.kode, b.kode));
  const bk = byProdi(S.bk, pid).sort((a, b) => nu(a.kode, b.kode));
  const mk = byProdi(S.mk, pid).sort((a, b) => (a.smt - b.smt) || nu(a.kode, b.kode));
  const cpmk = byProdi(S.cpmk, pid), sub = byProdi(S.sub, pid), pi = byProdi(S.pi || [], pid);
  const mkById = (id) => S.mk.find(x => x.id === id) || {};
  const cplById = (id) => S.cpl.find(x => x.id === id) || {};
  const kodeMk = (id) => mkById(id).kode || id;
  const cmpk = (a, b) => nu(kodeMk(a.mk), kodeMk(b.mk)) || nu(a.kode, b.kode);
  const T = [];
  const tambah = (t) => { t.k = t.k || status(t.cek || []); if (!(t.baris || []).length && t.k === 'ok') t.k = 'na'; T.push({ catatan: [], cek: [], ...t }); };

  /* 1 */ tambah({ no: '1', sheet: '1. Profil Lulusan (PL)', judul: 'Profil Lulusan (PL)', kolom: ['Kode PL', 'Profil Lulusan', 'Profesi'],
    baris: pl.map(x => [x.kode, x.teks || x.nama, x.profesi || (x.nama || '')]), cek: [ck(pl.length >= 2, `${pl.length} profil lulusan`, 'Isi sedikitnya 2 profil lulusan'), ck(pl.every(x => x.teks || x.nama), 'Semua PL memiliki rumusan', 'Ada PL tanpa rumusan')] });

  /* 2 */ const snRows = [];
  cpl.slice().sort((a, b) => (RANAH_URUT[a.ranah] || 9) - (RANAH_URUT[b.ranah] || 9) || nu(a.kode, b.kode)).forEach(c => { const s = snDari(c); (s.length ? s : ['(belum diisi)']).forEach(k => snRows.push([RANAH_NAMA[c.ranah] || c.ranah, k, c.kode, c.teks])); });
  const tanpaSn = cpl.filter(c => !snDari(c).length);
  tambah({ no: '2', sheet: '2. CPL SNDIKTI', judul: 'CPL SN Dikti dan CPL Prodi yang memuatnya', kolom: ['Ranah', 'Kode unsur SN Dikti', 'CPL Prodi', 'Rumusan CPL Prodi'], baris: snRows,
    cek: [ck(!tanpaSn.length, 'Semua CPL sudah diberi kode unsur SN Dikti', `${tanpaSn.length} CPL belum diberi kode unsur SN Dikti (${tanpaSn.map(c => c.kode).slice(0, 6).join(', ')}). Isi di menu CPL.`, 'near')],
    catatan: ['Deskripsi baku unsur SN Dikti mengikuti lampiran Permendiktisaintek 39/2025 jo. 10/2026. Kode CPL prodi tidak berubah; kode unsur dicatat terpisah.'] });

  /* 3 */ tambah({ no: '3', sheet: '3. CPL Prodi', judul: 'CPL Prodi', kolom: ['Kode', 'Deskripsi CPL', 'Ranah', 'Kode SN Dikti', 'Butir IABEE'],
    baris: cpl.map(c => [c.kode, c.teks, RANAH_NAMA[c.ranah] || c.ranah, snDari(c).join(', '), iabeeOf(c).map(h => `(${h})`).join(' ')]),
    cek: [ck(cpl.length >= 9 && cpl.length <= 12, `${cpl.length} CPL (anjuran 9 sampai 12)`, `${cpl.length} CPL, anjuran templat 9 sampai 12`, 'near'), ck(cpl.every(c => iabeeOf(c).length), 'Semua CPL terkait butir IABEE', `${cpl.filter(c => !iabeeOf(c).length).length} CPL belum terkait butir IABEE`, 'near')] });

  /* 4 */ const snSet = Array.from(new Set(cpl.flatMap(snDari))).sort((a, b) => (RANAH_URUT[a.replace(/\d+$/, '')] || 9) - (RANAH_URUT[b.replace(/\d+$/, '')] || 9) || nu(a, b));
  tambah({ no: '4', sheet: '4. Pemetaan', judul: 'Pemetaan CPL SN Dikti terhadap CPL Prodi', kolom: ['CPL SN Dikti \\ CPL', ...cpl.map(c => c.kode)], baris: snSet.map(s => [s, ...cpl.map(c => V(snDari(c).includes(s)))]),
    cek: [ck(snSet.length > 0, `${snSet.length} unsur SN Dikti terpetakan`, 'Belum ada kode unsur SN Dikti pada CPL', 'near'), ck(['S', 'P', 'KU', 'KK'].every(r => snSet.some(s => s.replace(/^CPL-/, '').replace(/\d+$/, '') === r)), 'Empat unsur (S, P, KU, KK) tercakup', 'Ada unsur SN Dikti yang belum tercakup', 'near')] });

  /* 5 */ tambah({ no: '5', sheet: '5. Pemetaan CPL & PL', judul: 'Pemetaan CPL dan PL', kolom: ['CPL \\ PL', ...pl.map(x => x.kode)], baris: cpl.map(c => [c.kode, ...pl.map(x => V((c.pl || []).includes(x.id)))]),
    cek: [ck(cpl.every(c => (c.pl || []).length), 'Setiap CPL mendukung sedikitnya satu PL', `${cpl.filter(c => !(c.pl || []).length).length} CPL belum terkait PL`), ck(pl.every(x => cpl.some(c => (c.pl || []).includes(x.id))), 'Setiap PL didukung sedikitnya satu CPL', `${pl.filter(x => !cpl.some(c => (c.pl || []).includes(x.id))).length} PL belum didukung CPL`)] });

  /* 6 */ const bokNama = (id) => (S.bok.find(x => x.id === id) || {}).nama || '';
  tambah({ no: '6', sheet: '6. Rumusan BK', judul: 'Rumusan Bahan Kajian (BK)', kolom: ['Kode', 'Bahan Kajian', 'Bidang ilmu (BoK) asal', 'Kedalaman (Bloom)'], baris: bk.map(b => [b.kode, b.nama, bokNama(b.bok), b.kedalaman || '']),
    cek: [ck(bk.length > 0, `${bk.length} bahan kajian`, 'Belum ada bahan kajian'), ck(bk.every(b => b.bok), 'Semua BK berasal dari BoK asosiasi', `${bk.filter(b => !b.bok).length} BK belum diasalkan ke BoK`, 'near')], catatan: ['Bahan kajian diambil dari bidang ilmu yang dirumuskan asosiasi program studi sejenis.'] });

  /* 7 */ tambah({ no: '7', sheet: '7. Pemetaan CPL-BK', judul: 'Pemetaan CPL dan BK', kolom: ['BK \\ CPL', ...cpl.map(c => c.kode)], baris: bk.map(b => [b.kode, ...cpl.map(c => V((b.cpl || []).includes(c.id)))]),
    cek: [ck(bk.every(b => (b.cpl || []).length), 'Setiap BK terkait CPL', `${bk.filter(b => !(b.cpl || []).length).length} BK belum terkait CPL`), ck(cpl.every(c => bk.some(b => (b.cpl || []).includes(c.id))), 'Setiap CPL terkait BK', `${cpl.filter(c => !bk.some(b => (b.cpl || []).includes(c.id))).length} CPL belum terkait BK`)] });

  /* 8 */ tambah({ no: '8', sheet: '8. Pemetaan BK-MK', judul: 'Pemetaan BK dan Mata Kuliah', kolom: ['MK \\ BK', ...bk.map(b => b.kode)], baris: mk.map(m => [m.kode, ...bk.map(b => V((m.bk || []).includes(b.id)))]),
    cek: [ck(mk.every(m => (m.bk || []).length), 'Setiap MK memuat BK', `${mk.filter(m => !(m.bk || []).length).length} MK belum terkait BK`, 'near'), ck(bk.every(b => mk.some(m => (m.bk || []).includes(b.id))), 'Setiap BK dimuat sedikitnya satu MK', `${bk.filter(b => !mk.some(m => (m.bk || []).includes(b.id))).length} BK belum dimuat MK`)] });

  /* 9 */ tambah({ no: '9', sheet: '9. Pemetaan CPL-MK', judul: 'Pemetaan CPL dan Mata Kuliah', kolom: ['MK \\ CPL', ...cpl.map(c => c.kode)], baris: mk.map(m => [m.kode, ...cpl.map(c => V((m.cpl || []).includes(c.id)))]),
    cek: [ck(mk.every(m => (m.cpl || []).length), 'Setiap MK membebankan CPL', `${mk.filter(m => !(m.cpl || []).length).length} MK belum membebankan CPL (di luar magang dan TA bila memang tidak ada)`, 'near'), ck(cpl.every(c => mk.some(m => (m.cpl || []).includes(c.id))), 'Setiap CPL dibebankan pada sedikitnya satu MK', `${cpl.filter(c => !mk.some(m => (m.cpl || []).includes(c.id))).length} CPL belum dibebankan ke MK`)] });

  /* 10 */ tambah({ no: '10', sheet: '10. Pemetaan CPL-BK-MK', judul: 'Pemetaan CPL, BK, dan Mata Kuliah', kolom: ['CPL \\ BK', ...bk.map(b => b.kode)],
    baris: cpl.map(c => [c.kode, ...bk.map(b => mk.filter(m => (m.cpl || []).includes(c.id) && (m.bk || []).includes(b.id)).map(m => m.kode).join(', '))]),
    cek: [ck(cpl.every(c => mk.some(m => (m.cpl || []).includes(c.id) && (m.bk || []).length)), 'Setiap CPL memiliki MK yang memuat BK', 'Ada CPL yang tidak menemukan MK sekaligus BK', 'near')] });

  /* 11 */ const totSks = mk.reduce((a, m) => a + sksOf(m), 0);
  tambah({ no: '11', sheet: '11. Susunan Mata Kuliah', judul: 'Susunan Mata Kuliah', kolom: ['Kode MK', 'Nama MK', 'SKS', 'Teori', 'Praktik', 1, 2, 3, 4, 5, 6, 7, 8].map(String),
    baris: [...mk.map(m => [m.kode, m.nama, String(sksOf(m)), String(+m.T || 0), String(+m.P || 0), ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => V(+m.smt === s))]), ['', 'Jumlah SKS', String(totSks), String(mk.reduce((a, m) => a + (+m.T || 0), 0)), String(mk.reduce((a, m) => a + (+m.P || 0), 0)), '', '', '', '', '', '', '', '']],
    cek: [ck(totSks >= P.totalSksMin, `${totSks} SKS (minimal ${P.totalSksMin})`, `${totSks} SKS, kurang dari ${P.totalSksMin}`)] });

  /* 12 */ const smts = [8, 7, 6, 5, 4, 3, 2, 1];
  tambah({ no: '12', sheet: '12. Organisasi Mata Kuliah', judul: 'Organisasi Mata Kuliah per Semester', kolom: ['Semester', 'SKS', 'Jumlah MK', 'SKS teori', 'SKS praktik', 'Kode MK'],
    baris: [...smts.map(s => { const a = mk.filter(m => +m.smt === s); return [ROMAWI[s], String(a.reduce((x, m) => x + sksOf(m), 0)), String(a.length), String(a.reduce((x, m) => x + (+m.T || 0), 0)), String(a.reduce((x, m) => x + (+m.P || 0), 0)), a.map(m => m.kode).join(', ')]; }), ['Jumlah', String(totSks), String(mk.length), '', '', '']],
    cek: [ck(smts.every(s => mk.some(m => +m.smt === s)), 'Delapan semester terisi', 'Ada semester tanpa mata kuliah', 'near'), ck(smts.every(s => { const x = mk.filter(m => +m.smt === s).reduce((a, m) => a + sksOf(m), 0); return x <= 24; }), 'Beban SKS per semester dalam batas', 'Ada semester melebihi 24 SKS', 'near')] });

  /* 12a */ tambah({ no: '12a', sheet: '12a. Peta Pemenuhan CPL', judul: 'Peta Pemenuhan Capaian Pembelajaran per Semester', kolom: ['CPL', ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => `Semester ${s}`)],
    baris: cpl.map(c => [c.kode, ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => mk.filter(m => +m.smt === s && (m.cpl || []).includes(c.id)).map(m => m.kode).join(', '))]),
    cek: [ck(cpl.every(c => mk.filter(m => (m.cpl || []).includes(c.id)).map(m => m.smt).filter((v, i, a) => a.indexOf(v) === i).length >= 2), 'Setiap CPL dibentuk bertahap pada sedikitnya dua semester', 'Ada CPL yang hanya dibentuk pada satu semester', 'near')] });

  /* 13 */ const r13 = [];
  cpl.forEach(c => cpmk.filter(x => (x.cpl || []).includes(c.id)).sort(cmpk).forEach(x => r13.push([c.kode, c.teks, x.kode, x.teks, kodeMk(x.mk)])));
  tambah({ no: '13', sheet: '13. Pemetaan CPL-CPMK-MK', judul: 'Pemetaan CPL, CPMK, dan Mata Kuliah', kolom: ['CPL', 'Deskripsi CPL', 'CPMK', 'Deskripsi CPMK', 'MK'], baris: r13,
    cek: [ck(cpl.every(c => cpmk.some(x => (x.cpl || []).includes(c.id))), 'Setiap CPL memiliki CPMK', `${cpl.filter(c => !cpmk.some(x => (x.cpl || []).includes(c.id))).length} CPL belum memiliki CPMK`), ck(cpmk.every(x => (x.cpl || []).length), 'Setiap CPMK terhubung ke CPL', `${cpmk.filter(x => !(x.cpl || []).length).length} CPMK belum terhubung ke CPL`)] });

  /* 14 */ tambah({ no: '14', sheet: '14. Pemetaan CPL-MK-CPMK', judul: 'Pemetaan CPL, Mata Kuliah, dan CPMK', kolom: ['MK \\ CPL', ...cpl.map(c => c.kode)],
    baris: mk.map(m => [m.kode, ...cpl.map(c => cpmk.filter(x => x.mk === m.id && (x.cpl || []).includes(c.id)).map(x => x.kode).join(', '))]),
    cek: [ck(mk.filter(m => (m.cpl || []).length).every(m => cpmk.some(x => x.mk === m.id)), 'Setiap MK ber-CPL memiliki CPMK', `${mk.filter(m => (m.cpl || []).length && !cpmk.some(x => x.mk === m.id)).length} MK ber-CPL belum memiliki CPMK`, 'near')] });

  /* 15 */ const r15 = [];
  mk.forEach(m => { const cs = cpmk.filter(x => x.mk === m.id).sort((a, b) => nu(a.kode, b.kode)); cs.forEach((x, i) => { const ss = sub.filter(s => s.cpmk === x.id).sort((a, b) => nu(a.kode, b.kode)); (ss.length ? ss : [null]).forEach((s, j) => r15.push([i === 0 && j === 0 ? m.kode : '', j === 0 ? x.kode : '', s ? s.kode : '', s ? s.teks : ''])); }); });
  tambah({ no: '15', sheet: '15. Pemetaan MK-CPMK-Sub-CPMK', judul: 'Pemetaan Mata Kuliah, CPMK, dan Sub-CPMK', kolom: ['MK', 'CPMK', 'Sub-CPMK', 'Uraian Sub-CPMK'], baris: r15,
    cek: [ck(cpmk.every(x => sub.some(s => s.cpmk === x.id)), 'Setiap CPMK memiliki Sub-CPMK', `${cpmk.filter(x => !sub.some(s => s.cpmk === x.id)).length} CPMK belum memiliki Sub-CPMK`, 'near')] });

  /* 16 sampai 20: dari RPS */
  const rpsList = mk.map(m => ({ m, r: S.rps.find(x => x.mk === m.id) })).filter(x => x.r && (x.r.pertemuan || []).length);
  const ent = rpsList.flatMap(({ m, r }) => rincianRps(S, m, r).map(e => ({ ...e, m })));
  const cpmkObj = (id) => S.cpmk.find(c => c.id === id) || {};
  const cplKodeDari = (id) => ((cpmkObj(id).cpl || []).map(x => cplById(x).kode).filter(Boolean)[0]) || '-';
  /* total per (MK, CPMK) dan per kolom */
  const agr = new Map();
  ent.forEach(e => { const k = `${e.m.id}|${e.cpmk}`; if (!agr.has(k)) agr.set(k, { m: e.m, cpmk: e.cpmk, tot: 0, kol: {}, tahap: new Map() }); const a = agr.get(k); a.tot += e.b; e.kol.forEach(c => { a.kol[c] = (a.kol[c] || 0) + e.b / e.kol.length; }); const t = TAHAP(e.p.m); if (!a.tahap.has(t)) a.tahap.set(t, { b: 0, kol: new Set(), rb: new Set() }); const th = a.tahap.get(t); th.b += e.b; e.kol.forEach(c => th.kol.add(c)); e.rb.forEach(c => th.rb.add(c)); });
  const baris = Array.from(agr.values()).sort((a, b) => nu(a.m.kode, b.m.kode) || nu(cpmkObj(a.cpmk).kode, cpmkObj(b.cpmk).kode));
  const namaKol = (id) => (KOL_TEKNIK.find(k => k[0] === id) || [])[1] || id;
  const adaRps = rpsList.length;
  const cekRps = (extra = []) => [ck(adaRps > 0, `${adaRps} dari ${mk.length} MK sudah memiliki RPS`, 'Belum ada RPS yang terisi', 'na'), ...extra];
  const totMk = new Map(); baris.forEach(a => totMk.set(a.m.id, (totMk.get(a.m.id) || 0) + a.tot));
  const tidak100 = Array.from(totMk.entries()).filter(([, v]) => Math.abs(v - 100) > 0.5);

  tambah({ no: '16', sheet: '16. Teknik Penilaian CPMK', judul: 'Teknik Penilaian CPMK (dari RPS)', kolom: ['CPL', 'MK', 'CPMK', ...KOL_TEKNIK.map(k => k[1])],
    baris: baris.map(a => [cplKodeDari(a.cpmk), a.m.kode, cpmkObj(a.cpmk).kode || '-', ...KOL_TEKNIK.map(k => V(a.kol[k[0]] > 0))]),
    cek: cekRps([ck(baris.every(a => Object.keys(a.kol).length), 'Setiap CPMK memiliki teknik penilaian', 'Ada CPMK tanpa teknik penilaian', 'near')]),
    catatan: ['Teknik dibaca dari kolom Kriteria dan Teknik pada RPS. Pertemuan yang tidak menyebut teknik dihitung sebagai laporan dan tugas.'] });

  const r17 = [];
  baris.forEach(a => ['Sebelum UTS', 'UTS', 'Setelah UTS', 'UAS'].forEach(t => { const th = a.tahap.get(t); if (!th) return; const rb = Array.from(th.rb).sort(); r17.push([cplKodeDari(a.cpmk), a.m.kode, cpmkObj(a.cpmk).kode || '-', t, Array.from(th.kol).map(namaKol).join(', '), rb.length ? rb.map(x => `Rubrik ${x}`).join(', ') : 'Daftar hadir atau lembar skor', rb.map(x => (RUBRIK[x].baris[0] ? RUBRIK[x].baris.slice(0, 3).map(b => String(b[0]).replace(/\s*\(\d+%\)\s*$/, '')).join('; ') : '')).join(' | '), `${f1(th.b)}%`]); }));
  tambah({ no: '17', sheet: '17. Tahap & Mekanisme Penilaian', judul: 'Tahap dan Mekanisme Penilaian (dari RPS)', kolom: ['CPL', 'MK', 'CPMK', 'Tahap Penilaian', 'Teknik Penilaian', 'Instrumen', 'Kriteria', 'Bobot'], baris: r17, cek: cekRps() });

  const barisBobot = (urutMk) => {
    const rows = []; const mkIds = Array.from(new Set(baris.map(a => a.m.id)));
    mkIds.forEach(id => { const a = baris.filter(x => x.m.id === id); a.forEach(x => rows.push(urutMk ? [x.m.kode, cplKodeDari(x.cpmk), cpmkObj(x.cpmk).kode || '-', ...KOL_TEKNIK.map(k => (x.kol[k[0]] ? f1(x.kol[k[0]]) : '')), f1(x.tot)] : [cplKodeDari(x.cpmk), x.m.kode, cpmkObj(x.cpmk).kode || '-', ...KOL_TEKNIK.map(k => (x.kol[k[0]] ? f1(x.kol[k[0]]) : '')), f1(x.tot)])); const tt = a.reduce((s, x) => s + x.tot, 0); rows.push([`Jumlah ${a[0].m.kode}`, '', '', ...KOL_TEKNIK.map(() => ''), f1(tt) + (Math.abs(tt - 100) > 0.5 ? ' (harus 100)' : '')]); });
    return rows;
  };
  const cekBobot = cekRps([ck(!tidak100.length, 'Jumlah bobot setiap MK = 100', `${tidak100.length} MK berjumlah bobot bukan 100: ${tidak100.map(([id, v]) => `${kodeMk(id)} (${f1(v)})`).slice(0, 5).join(', ')}`)]);
  tambah({ no: '18', sheet: '18. Bobot Penilaian', judul: 'Bobot Penilaian (CPL, MK, CPMK)', kolom: ['CPL', 'MK', 'CPMK', ...KOL_TEKNIK.map(k => k[1]), 'TOTAL'], baris: barisBobot(false), cek: cekBobot, catatan: ['Jumlah total setiap MK = 100.'] });
  tambah({ no: '18a', sheet: '18a. Bobot Penilaian', judul: 'Bobot Penilaian (MK, CPL, CPMK)', kolom: ['MK', 'CPL', 'CPMK', ...KOL_TEKNIK.map(k => k[1]), 'TOTAL'], baris: barisBobot(true), cek: cekBobot, catatan: ['Jumlah total setiap MK = 100.'] });

  const r19 = [];
  Array.from(new Set(baris.map(a => a.m.id))).forEach(id => { const a = baris.filter(x => x.m.id === id); a.forEach(x => r19.push([x.m.kode, cplKodeDari(x.cpmk), cpmkObj(x.cpmk).kode || '-', f1(x.tot)])); const tt = a.reduce((s, x) => s + x.tot, 0); r19.push([`Nilai ${a[0].m.kode} =`, '', '', f1(tt)]); });
  tambah({ no: '19', sheet: '19. Rumusan NA MK', judul: 'Rumusan Nilai Akhir Mata Kuliah', kolom: ['MK', 'CPL', 'CPMK', 'Skor maks'], baris: r19, cek: cekBobot, catatan: ['Nilai MK = jumlah (Skor maks CPMK × capaian CPMK ÷ 100).'] });

  const r20 = [];
  cpl.forEach(c => { const a = baris.filter(x => (cpmkObj(x.cpmk).cpl || []).includes(c.id)); if (!a.length) return; a.forEach(x => r20.push([c.kode, cpmkObj(x.cpmk).kode || '-', x.m.kode, f1(x.tot)])); r20.push([`Nilai ${c.kode} =`, '', '', f1(a.reduce((s, x) => s + x.tot, 0))]); });
  tambah({ no: '20', sheet: '20. Rumusan NA CPL', judul: 'Rumusan Nilai Akhir CPL', kolom: ['CPL', 'CPMK', 'MK', 'Skor maks'], baris: r20,
    cek: cekRps([ck(cpl.every(c => baris.some(x => (cpmkObj(x.cpmk).cpl || []).includes(c.id))), 'Setiap CPL memiliki skor pada RPS', `${cpl.filter(c => !baris.some(x => (cpmkObj(x.cpmk).cpl || []).includes(c.id))).length} CPL belum memiliki skor dari RPS`, 'near')]),
    catatan: ['Nilai CPL = jumlah (Skor maks × capaian CPMK ÷ 100) dibagi jumlah skor maks, dinyatakan dalam persen. Skor maks CPL tidak harus 100 bila CPL dibentuk dari bagian CPMK.'] });

  /* Tambahan IABEE */
  tambah({ no: 'X1', sheet: 'X1. PI per CPL', judul: 'Indikator Kinerja (PI) per CPL', kolom: ['CPL', 'Kode PI', 'Rumusan PI', 'Butir IABEE', 'CPMK pengukur', 'MK', 'Kriteria ketercapaian'],
    baris: cpl.flatMap(c => { const a = pi.filter(q => q.cpl === c.id).sort((x, y) => nu(x.kode, y.kode)); return (a.length ? a : [null]).map(q => { if (!q) return [c.kode, '(belum ada PI)', '', iabeeOf(c).map(h => `(${h})`).join(' '), '', '', '']; const kr = kriteriaPi(q, P); const cs = (q.cpmk || []).map(id => cpmkObj(id)).filter(x => x.id); return [c.kode, q.kode, q.teks, iabeeOf(c).map(h => `(${h})`).join(' '), cs.map(x => x.kode).join(', '), Array.from(new Set(cs.map(x => kodeMk(x.mk)))).join(', '), `Minimal ${kr.persen}% mahasiswa bernilai ≥ ${kr.nilai}`]; }); }),
    cek: [ck(cpl.every(c => pi.filter(q => q.cpl === c.id).length >= P.piPerCplMin), `Setiap CPL memiliki ${P.piPerCplMin} sampai ${P.piPerCplMax} PI`, `${cpl.filter(c => pi.filter(q => q.cpl === c.id).length < P.piPerCplMin).length} CPL memiliki PI kurang dari ${P.piPerCplMin}`), ck(pi.every(q => (q.cpmk || []).length), 'Setiap PI terkait CPMK', `${pi.filter(q => !(q.cpmk || []).length).length} PI belum terkait CPMK`)] });
  tambah({ no: 'X2', sheet: 'X2. CPL-Butir IABEE', judul: 'Pemetaan CPL terhadap Butir Kompetensi Lulusan IABEE (a) sampai (k)', kolom: ['CPL \\ Butir', ...BUTIR_IABEE.map(b => `(${b.k})`)], baris: cpl.map(c => [c.kode, ...BUTIR_IABEE.map(b => V(iabeeOf(c).includes(b.k)))]),
    cek: [ck(BUTIR_IABEE.every(b => cpl.some(c => iabeeOf(c).includes(b.k))), 'Seluruh butir (a) sampai (k) tercakup oleh CPL', `Butir belum tercakup: ${BUTIR_IABEE.filter(b => !cpl.some(c => iabeeOf(c).includes(b.k))).map(b => `(${b.k})`).join(' ')}`)], catatan: ['Butir (k): belajar sepanjang hayat dan berpikir kritis.'] });
  tambah({ no: 'X3', sheet: 'X3. PI-MK-Instrumen', judul: 'Peta PI, Mata Kuliah, dan Instrumen Penilaian', kolom: ['Kode PI', 'CPL', 'CPMK', 'MK', 'Teknik penilaian pada RPS', 'Instrumen (rubrik)'],
    baris: pi.flatMap(q => { const cs = (q.cpmk || []).map(id => cpmkObj(id)).filter(x => x.id); return (cs.length ? cs : [null]).map(x => { if (!x) return [q.kode, cplById(q.cpl).kode || '', '(belum terkait)', '', '', '']; const a = baris.find(y => y.cpmk === x.id); const rb = a ? Array.from(new Set(Array.from(a.tahap.values()).flatMap(t => Array.from(t.rb)))).sort() : []; return [q.kode, cplById(q.cpl).kode || '', x.kode, kodeMk(x.mk), a ? Object.keys(a.kol).map(namaKol).join(', ') : '(RPS belum terisi)', rb.map(z => `Rubrik ${z}`).join(', ')]; }); }),
    cek: [ck(pi.length > 0, `${pi.length} PI terpetakan`, 'Belum ada PI', 'na'), ck(pi.every(q => (q.cpmk || []).some(id => baris.some(a => a.cpmk === id))), 'Setiap PI diukur pada RPS yang terisi', 'Ada PI yang CPMK-nya belum memiliki penilaian pada RPS', 'near')] });
  tambah({ no: 'X4', sheet: 'X4. Rumus Ketercapaian', judul: 'Rumus Perhitungan Ketercapaian (CPMK, CPL, PI)', kolom: ['Besaran', 'Rumus', 'Keterangan'],
    baris: [
      ['Nilai CPMK mahasiswa', 'Σ (bobot bentuk penilaian × nilai) ÷ Σ bobot, pada CPMK itu', 'Bobot dari tabel 18; nilai skala 0 sampai 100'],
      ['Nilai akhir MK', 'Σ (Skor maks CPMK × nilai CPMK ÷ 100)', 'Jumlah skor maks seluruh CPMK pada MK = 100 (tabel 19)'],
      ['Nilai CPL pada MK', 'rata-rata tertimbang nilai CPMK pembentuk CPL, dengan bobot % CPMK', 'Tercatat pada tabel Portofolio di RPS'],
      ['Nilai CPL mahasiswa', 'Σ (Skor maks × nilai CPMK ÷ 100) ÷ Σ Skor maks × 100', 'Seluruh MK pembentuk CPL (tabel 20)'],
      ['Nilai PI mahasiswa', 'rata-rata tertimbang nilai instrumen CPMK yang mengukur PI', 'PI dan CPMK dipetakan pada tabel X1 dan X3'],
      ['PI tercapai', `jumlah mahasiswa bernilai PI ≥ nilai batas ÷ jumlah mahasiswa × 100% ≥ batas persen`, `Bawaan: minimal ${P.piMinPersen}% mahasiswa bernilai ≥ ${P.piMinNilai}; dapat diubah per PI`],
      ['CPL tercapai', 'semua PI pada CPL tercapai', 'Hasil tiap angkatan dicatat pada menu Capaian CPL (angka agregat, tanpa nama atau NIM)'],
    ], cek: [['Rumus berlaku untuk seluruh prodi; kriteria dapat diubah di menu Data Induk, Parameter', 'ok']], k: 'ok' });

  return T;
}
