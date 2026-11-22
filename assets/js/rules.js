/* KUREKAM · Aturan Buku Pedoman, keterlacakan OBE, progres, dan beban dosen riil. */
import { formatKode, awalanKode, kodeBaku, awalPraktik } from './kode.js';
import { PARAM_DEFAULT, KELOMPOK, GRUP, BUTIR_IABEE, INDIKATOR_IABEE } from './config.js';
import { detect, lvNum, MIN_CPL, ANJURAN_SMT, batasCpl, selisihRentang, alasanOk } from './bloom.js';
import { turunanReal } from './realisasilogic.js';

export const KMAP = Object.fromEntries(KELOMPOK.map(k => [k.id, k]));
export const fmt = (v, d = 0) => v == null || Number.isNaN(v) ? '–' : Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });

export function param(S) {
  const p = JSON.parse(JSON.stringify(PARAM_DEFAULT));
  const u = (S.settings && S.settings.param) || {};
  Object.keys(u).forEach(k => { if (u[k] != null) p[k] = (typeof u[k] === 'object' && !Array.isArray(u[k])) ? { ...p[k], ...u[k] } : u[k]; });
  return p;
}
export const grupOf = (mk) => (KMAP[mk.kel] || {}).g || 'MKK';
export const durasi = (mk, P) => (P.durasiPraktik[grupOf(mk)] || 170);
export const sksOf = (mk) => (+mk.T || 0) + (+mk.P || 0);
export const jpOf = (mk, P) => Math.round(((+mk.T || 0) * P.menitTeori / 60 + (+mk.P || 0) * durasi(mk, P) / 60) * 100) / 100;
export const tingkat = (smt) => Math.ceil(smt / 2);
export const kelasOf = (S, prodiId, smt) => { const p = S.prodi.find(x => x.id === prodiId); return p && p.kelas ? (+p.kelas[tingkat(smt)] || 0) : 0; };
export const byProdi = (arr, pid) => arr.filter(x => x.prodi === pid);

/* ---------- Struktur kurikulum per semester ---------- */
export function struktur(S, pid) {
  const P = param(S);
  const mks = byProdi(S.mk, pid);
  const smt = {};
  for (let s = 1; s <= 8; s++) smt[s] = { T: 0, P: 0, sks: 0, jp: 0, n: 0, mk: [] };
  const g = { MKU: 0, MBS: 0, MBE: 0, MKK: 0 }, kat = {};
  let jpT = 0, jpP = 0;
  mks.forEach(m => {
    const s = smt[m.smt]; if (!s) return;
    s.T += +m.T || 0; s.P += +m.P || 0; s.sks += sksOf(m); s.jp += jpOf(m, P); s.n++; s.mk.push(m);
    g[grupOf(m)] += sksOf(m);
    kat[m.kat] = (kat[m.kat] || 0) + sksOf(m);
    if (m.smt <= 6) { jpT += (+m.T || 0) * P.menitTeori / 60; jpP += (+m.P || 0) * durasi(m, P) / 60; }
  });
  const total = mks.reduce((a, m) => a + sksOf(m), 0);
  const totP = mks.reduce((a, m) => a + (+m.P || 0), 0);
  return {
    smt, g, kat, total, n: mks.length, totP,
    praktikSks: total ? totP / total * 100 : 0,
    praktikJam: (jpT + jpP) ? jpP / (jpT + jpP) * 100 : 0,
    spesifik: total ? (g.MBE + g.MKK) / total * 100 : 0,
    umum: total ? (kat['Pendidikan umum'] || 0) / total * 100 : 0,
    matSains: kat['Matematika dan ilmu alam'] || 0,
    ti: kat['Teknologi informasi'] || 0
  };
}
export function jpRange(P, s) {
  const k = P.kerangka[s]; if (!k || k[1] == null) return null;
  const lo = k[2] + k[3] * 2, hi = Math.round((k[1] + k[4] * 2.83) * 10) / 10;
  return [lo, hi];
}

const st = (ok, near) => ok ? 'ok' : near ? 'near' : 'bad';
/* ---------- Pemeriksa otomatis ---------- */
export function cekStruktur(S, pid) {
  const P = param(S), R = struktur(S, pid), out = [];
  for (let s = 1; s <= 8; s++) {
    const k = P.kerangka[s], x = R.smt[s];
    out.push({ grp: 'Semester ' + s, label: `SKS semester ${s}`, val: fmt(x.sks), target: `= ${k[0]}`, k: st(x.sks === k[0], Math.abs(x.sks - k[0]) <= 1), acuan: 'Pedoman Bab IV' });
    if (k[1] != null) {
      out.push({ grp: 'Semester ' + s, label: `SKS teori semester ${s}`, val: fmt(x.T), target: `${k[1]}–${k[2]}`, k: st(x.T >= k[1] && x.T <= k[2], x.T >= k[1] - 1 && x.T <= k[2] + 1), acuan: 'Pedoman Tabel 4.2' });
      out.push({ grp: 'Semester ' + s, label: `SKS praktik semester ${s}`, val: fmt(x.P), target: `${k[3]}–${k[4]}`, k: st(x.P >= k[3] && x.P <= k[4], x.P >= k[3] - 1 && x.P <= k[4] + 1), acuan: 'Pedoman Tabel 4.2' });
      out.push({ grp: 'Semester ' + s, label: `Jumlah MK semester ${s}`, val: fmt(x.n), target: `${k[5]}–${k[6]}`, k: st(x.n >= k[5] && x.n <= k[6], x.n >= k[5] - 1 && x.n <= k[6] + 1), acuan: 'Pedoman Tabel 4.3' });
      const jr = jpRange(P, s);
      out.push({ grp: 'Semester ' + s, label: `JP per minggu semester ${s}`, val: fmt(x.jp, 1), target: `${fmt(jr[0], 1)}–${fmt(jr[1], 1)}`, k: st(x.jp >= jr[0] && x.jp <= jr[1], x.jp >= jr[0] - 2 && x.jp <= jr[1] + 2), acuan: 'Pedoman Tabel 4.4 (full day)' });
    }
  }
  out.push({ grp: 'Total', label: 'Total SKS', val: fmt(R.total), target: `≥ ${P.totalSksMin}`, k: st(R.total >= P.totalSksMin, R.total >= P.totalSksMin - 2), acuan: 'Permendiktisaintek 39/2025' });
  out.push({ grp: 'Total', label: 'Jumlah MK prodi', val: fmt(R.n), target: `${P.mkProdiMin}–${P.mkProdiMax}`, k: st(R.n >= P.mkProdiMin && R.n <= P.mkProdiMax, R.n >= P.mkProdiMin - 3 && R.n <= P.mkProdiMax + 3), acuan: 'Pedoman Tabel 4.3' });
  out.push({ grp: 'Akreditasi', label: 'Muatan spesifik (MBE + MKK)', val: fmt(R.spesifik, 1) + '%', target: `≥ ${P.muatanSpesifikMin}%`, k: st(R.spesifik >= P.muatanSpesifikMin, R.spesifik >= P.muatanSpesifikMin - 3), acuan: 'IABEE 2.1.1' });
  out.push({ grp: 'Akreditasi', label: 'Pendidikan umum', val: fmt(R.umum, 1) + '%', target: `≤ ${P.pendidikanUmumMax}%`, k: st(R.umum <= P.pendidikanUmumMax, R.umum <= P.pendidikanUmumMax + 2), acuan: 'IABEE 2.1.1' });
  out.push({ grp: 'Akreditasi', label: 'Matematika dan ilmu alam', val: fmt(R.matSains) + ' SKS', target: `≥ ${P.matSainsMin} SKS`, k: st(R.matSains >= P.matSainsMin, false), acuan: 'LAM Teknik butir 19' });
  out.push({ grp: 'Akreditasi', label: 'Teknologi informasi', val: fmt(R.ti) + ' SKS', target: '> 0 SKS', k: st(R.ti > 0, false), acuan: 'IABEE 2.1.1' });
  out.push({ grp: 'Akreditasi', label: 'Porsi jam praktik (smt 1–6)', val: fmt(R.praktikJam, 1) + '%', target: `${P.praktikMin}–${P.praktikMax}%`, k: st(R.praktikJam >= P.praktikMin && R.praktikJam <= P.praktikMax, R.praktikJam >= P.praktikMin - 5), acuan: 'LAM Teknik butir 18' });
  return out.concat(cekKode(S, pid));
}

/* ---------- Kode dan penamaan MK (Pedoman Kode MK, keputusan 21 Nov 2026) ---------- */
const khusus = (m) => /magang|tugas akhir/i.test(m.kel || '') || /^(tugas akhir|magang|praktik kerja lapangan|pkl)\b/i.test(m.nama || '');
export function cekKode(S, pid) {
  const mk = byProdi(S.mk, pid), out = [], G = 'Kode dan penamaan', A = 'Pedoman Kode MK', P = param(S);
  if (!mk.length) return out;
  const salahFormat = mk.filter(m => !formatKode(m.kode));
  const salahAwalan = mk.filter(m => formatKode(m.kode) && m.kode.slice(0, 3) !== awalanKode(m));
  const n1 = salahFormat.length + salahAwalan.length;
  out.push({ grp: G, label: 'Kode MK sesuai pola Pedoman (2 huruf + 1 angka kelompok + 3 angka)', val: n1 ? `${n1} MK perlu disesuaikan` : 'semua sesuai', target: '0 MK', k: st(n1 === 0, n1 <= 3), acuan: A });
  const hitung = {}; mk.forEach(m => { hitung[m.kode] = (hitung[m.kode] || 0) + 1; });
  const ganda = Object.keys(hitung).filter(k => hitung[k] > 1);
  out.push({ grp: G, label: 'Kode MK tidak ganda dalam satu prodi', val: ganda.length ? `${ganda.length} kode ganda` : 'tidak ada', target: '0', k: st(!ganda.length, false), acuan: A });
  const bakuBeda = mk.filter(m => { const b = kodeBaku(m.nama); return b && m.kode !== b; });
  out.push({ grp: G, label: 'MK bersama memakai kode baku', val: bakuBeda.length ? `${bakuBeda.length} MK berbeda` : 'sesuai', target: '0', k: st(!bakuBeda.length, bakuBeda.length <= 2), acuan: A });
  const praktikMurni = mk.filter(m => +m.T === 0 && +m.P > 0 && !khusus(m) && !/capstone/i.test(m.nama));
  const tanpaAwal = praktikMurni.filter(m => !awalPraktik(m.nama));
  out.push({ grp: G, label: 'Nama MK praktik diawali "Praktik" atau "Praktikum"', val: tanpaAwal.length ? `${tanpaAwal.length} MK` : 'sesuai', target: '0 MK', k: st(!tanpaAwal.length, tanpaAwal.length <= 3), acuan: 'Keputusan 21 Nov 2026' });
  const campur = mk.filter(m => +m.T > 0 && +m.P > 0 && !khusus(m));
  out.push({ grp: G, label: 'Teori dan praktik dipisah menjadi MK tersendiri', val: campur.length ? `${campur.length} MK masih gabungan` : 'terpisah', target: '0 MK', k: st(!campur.length, campur.length <= 5), acuan: A });
  const lebih = mk.filter(m => +m.P > P.praktikMaxSks && !khusus(m));
  out.push({ grp: G, label: `SKS praktik per MK maksimal ${P.praktikMaxSks}`, val: lebih.length ? `${lebih.length} MK melebihi` : 'sesuai', target: `≤ ${P.praktikMaxSks} SKS`, k: st(!lebih.length, false), acuan: 'Keputusan 21 Nov 2026' });
  const cap = mk.filter(m => /capstone/i.test(m.nama) && !/tugas akhir/i.test(m.nama));
  if (cap.length) { const t = cap.reduce((a, m) => a + (+m.T || 0) + (+m.P || 0), 0); out.push({ grp: G, label: 'Total SKS Capstone Design (semester 6, 7, 8)', val: `${fmt(t)} SKS`, target: `= ${P.capstoneSks} SKS`, k: st(t === P.capstoneSks, Math.abs(t - P.capstoneSks) <= 1), acuan: 'Keputusan 21 Nov 2026' }); }
  const mg = mk.filter(m => /magang|praktik kerja lapangan|^pkl\b/i.test(m.nama + ' ' + (m.kel || '')) && !/tugas akhir/i.test(m.kel || ''));
  if (mg.length) {
    const konv = mg.filter(m => /konversi/i.test(m.nama)), inti = mg.filter(m => !/konversi/i.test(m.nama));
    const sk = (a) => a.reduce((x, m) => x + (+m.T || 0) + (+m.P || 0), 0);
    out.push({ grp: G, label: `Magang berdampak: PKL (inti) ${P.magangInti} SKS`, val: `${fmt(sk(inti))} SKS`, target: `= ${P.magangInti} SKS`, k: st(sk(inti) === P.magangInti, false), acuan: 'Keputusan 21 Nov 2026' });
    out.push({ grp: G, label: `Magang berdampak: MK konversi usulan prodi ${P.magangKonversi} SKS`, val: `${fmt(sk(konv))} SKS`, target: `= ${P.magangKonversi} SKS`, k: st(sk(konv) === P.magangKonversi, false), acuan: 'Keputusan 21 Nov 2026' });
  }
  return out;
}

/* ---------- Keterlacakan OBE ---------- */
export function trace(S, pid) {
  const pl = byProdi(S.pl, pid), cpl = byProdi(S.cpl, pid), bk = byProdi(S.bk, pid), mk = byProdi(S.mk, pid);
  const cpmk = byProdi(S.cpmk, pid), sub = byProdi(S.sub, pid);
  const mkAkad = mk.filter(m => !/magang|tugas akhir/i.test(m.kel));
  const cplNoMk = cpl.filter(c => !mk.some(m => (m.cpl || []).includes(c.id)));
  const out = {
    pl, cpl, bk, mk, cpmk, sub,
    plNoCpl: pl.filter(p => !cpl.some(c => (c.pl || []).includes(p.id))),
    cplNoPl: cpl.filter(c => !(c.pl || []).length),
    cplNoBk: cpl.filter(c => !bk.some(b => (b.cpl || []).includes(c.id))),
    cplNoMk,
    bkNoMk: bk.filter(b => !mk.some(m => (m.bk || []).includes(b.id))),
    mkNoCpl: mkAkad.filter(m => !(m.cpl || []).length),
    mkNoBk: mkAkad.filter(m => !(m.bk || []).length),
    mkNoCpmk: mkAkad.filter(m => !cpmk.some(c => c.mk === m.id)),
    cpmkNoSub: cpmk.filter(c => !sub.some(s => s.cpmk === c.id)),
    cpmkLuar: cpmk.filter(c => { const m = mk.find(x => x.id === c.mk); return m && (c.cpl || []).some(id => !(m.cpl || []).includes(id)); }),
    bobotSalah: mkAkad.filter(m => { const ss = sub.filter(s => s.mk === m.id); if (!ss.length) return false; const t = ss.reduce((a, s) => a + (+s.bobot || 0), 0); return Math.abs(t - 100) > 0.5; }),
    cplDukungan: cpl.map(c => ({ c, n: mk.filter(m => (m.cpl || []).includes(c.id)).length }))
  };
  out.skor = (() => {
    const cek = [out.plNoCpl.length === 0, out.cplNoPl.length === 0, out.cplNoBk.length === 0, out.cplNoMk.length === 0, out.bkNoMk.length === 0, out.mkNoCpl.length === 0, out.mkNoBk.length === 0, out.cpmkLuar.length === 0, out.bobotSalah.length === 0];
    return cek.filter(Boolean).length / cek.length * 100;
  })();
  return out;
}
export function cekTrace(S, pid) {
  const t = trace(S, pid), L = (a) => a.map(x => x.kode).slice(0, 6).join(', ') + (a.length > 6 ? ', …' : '');
  const row = (label, arr, acuan) => ({ grp: 'Keterlacakan', label, val: arr.length ? `${arr.length}: ${L(arr)}` : 'Tidak ada', target: '0', k: arr.length ? 'bad' : 'ok', acuan });
  return [
    row('Profil lulusan tanpa CPL', t.plNoCpl, 'LAM butir 13'),
    row('CPL tanpa profil lulusan', t.cplNoPl, 'LAM butir 13'),
    row('CPL tanpa bahan kajian', t.cplNoBk, 'SN Dikti, KPT OBE'),
    row('CPL tanpa mata kuliah pendukung', t.cplNoMk, 'IABEE 1.2, LAM butir 14'),
    row('Bahan kajian tidak dipakai MK', t.bkNoMk, 'KPT OBE'),
    row('MK tanpa CPL', t.mkNoCpl, 'IABEE 2.1'),
    row('MK tanpa bahan kajian', t.mkNoBk, 'KPT OBE'),
    row('CPMK di luar CPL yang dibebankan', t.cpmkLuar, 'IABEE 2.2'),
    ...cekRambu(S, pid),
    ...cekIntegrasi(S, pid),
    { grp: 'Keterlacakan', label: 'Bobot Sub-CPMK tidak 100%', val: t.bobotSalah.length ? `${t.bobotSalah.length}: ${L(t.bobotSalah)}` : 'Tidak ada', target: '0', k: t.bobotSalah.length ? 'near' : 'ok', acuan: 'Pedoman RPS' }
  ];
}

/* ---------- Taksonomi Bloom ---------- */
const hintRanah = { S: 'A', P: 'C', KU: 'C', KK: 'C' };
export function bloomOf(text, hint) { return detect(text, hint); }
export function bloomAudit(S, pid) {
  const issues = [], P = param(S);
  const cpl = byProdi(S.cpl, pid), cpmk = byProdi(S.cpmk, pid), sub = byProdi(S.sub, pid), mk = byProdi(S.mk, pid);
  const cplLv = {};
  cpl.forEach(c => {
    const b = detect(c.teks, hintRanah[c.ranah] || 'C'); cplLv[c.id] = b;
    if (!b) issues.push({ obj: 'CPL', kode: c.kode, teks: c.teks, msg: 'Kata kerja operasional tidak dikenali', k: 'bad' });
    else {
      if (b.kabur && c.ranah !== 'P') issues.push({ obj: 'CPL', kode: c.kode, teks: c.teks, msg: `"${b.verb}" kurang terukur untuk ranah ${c.ranah}`, k: 'near', b });
      if (b.n < (MIN_CPL[c.ranah] || 3)) issues.push({ obj: 'CPL', kode: c.kode, teks: c.teks, msg: `Level ${b.code} di bawah anjuran KKNI 6 (minimal level ${MIN_CPL[c.ranah] || 3})`, k: 'near', b });
    }
  });
  const cpmkLv = {};
  cpmk.forEach(c => {
    const m = mk.find(x => x.id === c.mk); const hint = m && (+m.P > +m.T) ? 'P' : 'C';
    const b = detect(c.teks, hint); cpmkLv[c.id] = b;
    if (!b) { issues.push({ obj: 'CPMK', kode: c.kode, teks: c.teks, msg: 'Kata kerja operasional tidak dikenali', k: 'bad' }); return; }
    if (b.kabur) issues.push({ obj: 'CPMK', kode: c.kode, teks: c.teks, msg: `"${b.verb}" tidak terukur, ganti dengan kata kerja operasional yang dapat diukur`, k: 'near', b });
    const maxCpl = Math.max(0, ...(c.cpl || []).map(id => cplLv[id] && cplLv[id].d === b.d ? cplLv[id].n : 0));
    if (maxCpl && b.n > maxCpl) issues.push({ obj: 'CPMK', kode: c.kode, teks: c.teks, msg: `Level ${b.code} melampaui level CPL yang didukung (${maxCpl})`, k: 'near', b });
    if (m && b.d === 'C') { const r = ANJURAN_SMT[m.smt]; if (r && (b.n < r[0] - 1 || b.n > r[1] + 1)) issues.push({ obj: 'CPMK', kode: c.kode, teks: c.teks, msg: `Level ${b.code} di luar anjuran semester ${m.smt} (C${r[0]}–C${r[1]})`, k: 'near', b }); }
  });
  sub.forEach(s => {
    const c = cpmk.find(x => x.id === s.cpmk); const b = detect(s.teks, 'C');
    if (!b) { issues.push({ obj: 'Sub-CPMK', kode: s.kode, teks: s.teks, msg: 'Kata kerja operasional tidak dikenali', k: 'bad' }); return; }
    const bc = c && cpmkLv[c.id];
    if (bc && bc.d === b.d && b.n > bc.n) issues.push({ obj: 'Sub-CPMK', kode: s.kode, teks: s.teks, msg: `Level ${b.code} melampaui CPMK induknya (${bc.code})`, k: 'near', b });
  });
  /* distribusi level CPMK per semester */
  const dist = {};
  for (let s = 1; s <= 8; s++) dist[s] = {};
  cpmk.forEach(c => { const m = mk.find(x => x.id === c.mk); const b = cpmkLv[c.id]; if (m && b) dist[m.smt][b.code] = (dist[m.smt][b.code] || 0) + 1; });
  const avg = {};
  for (let s = 1; s <= 8; s++) {
    const e = Object.entries(dist[s]).filter(([k]) => k[0] === 'C'); const n = e.reduce((a, [, v]) => a + v, 0);
    avg[s] = n ? e.reduce((a, [k, v]) => a + lvNum(k) * v, 0) / n : null;
  }
  let naik = true; let prev = 0;
  for (let s = 1; s <= 6; s++) { if (avg[s] != null) { if (avg[s] + 0.3 < prev) naik = false; prev = Math.max(prev, avg[s]); } }
  return { issues, dist, avg, naik, cplLv, cpmkLv, nStmt: cpl.length + cpmk.length + sub.length, P };
}


/* ---------- Rambu penempatan semester ---------- */
/** CPL terlalu tinggi untuk semester mata kuliah? Mengembalikan {b, mx} atau null. Sikap (ranah S) tidak dibatasi. */
export function cplTerlaluTinggi(c, smt) {
  if (!c || c.ranah === 'S') return null;
  const b = detect(c.teks, hintRanah[c.ranah] || 'C'); if (!b) return null;
  const mx = batasCpl(b.d, smt);
  return b.n > mx ? { b, mx } : null;
}
const akadMk = (m) => !/magang|tugas akhir/i.test(m.kel || '');
/** Temuan rambu untuk satu prodi: CPL terlalu tinggi pada MK dan CPMK di luar rentang level semester. */
export function pelanggaranRambu(S, pid) {
  const cpl = byProdi(S.cpl, pid), mk = byProdi(S.mk, pid).filter(akadMk), cpmk = byProdi(S.cpmk, pid);
  const cplMk = [], cpmkSmt = [];
  mk.filter(m => !m.kunci).forEach(m => (m.cpl || []).forEach(id => { const c = cpl.find(x => x.id === id), t = cplTerlaluTinggi(c, m.smt); if (t) cplMk.push({ m, c, ...t, alasan: alasanOk(m.alasanCpl) }); }));
  cpmk.forEach(c => { const m = mk.find(x => x.id === c.mk); if (!m) return; const b = detect(c.teks, +m.P > +m.T ? 'P' : 'C'), g = selisihRentang(b, m.smt); if (g) cpmkSmt.push({ m, c, b, gap: g, alasan: alasanOk(c.alasanLevel) }); });
  return { cplMk, cpmkSmt };
}
/** Baris Pemeriksa Kurikulum untuk rambu penempatan semester. */
export function cekRambu(S, pid) {
  const R = pelanggaranRambu(S, pid), L = (a, f) => a.slice(0, 5).map(f).join(', ') + (a.length > 5 ? ', …' : '');
  const cplBad = R.cplMk.filter(x => !x.alasan), cmBad = R.cpmkSmt.filter(x => Math.abs(x.gap) >= 2 && !x.alasan), cmNear = R.cpmkSmt.filter(x => Math.abs(x.gap) === 1 || (Math.abs(x.gap) >= 2 && x.alasan));
  const row = (label, arr, f, k, acuan) => ({ grp: 'Rambu penempatan semester', label, val: arr.length ? `${arr.length}: ${L(arr, f)}` : 'Tidak ada', target: '0', k: arr.length ? k : 'ok', acuan });
  return [
    row('CPL terlalu tinggi untuk semester mata kuliah, tanpa alasan', cplBad, x => `${x.m.kode} (S${x.m.smt}) ${x.c.kode}`, 'bad', 'Pedoman 4.4, Bloom, KKNI 6'),
    row('CPMK selisih 2 level atau lebih dari rentang semester, tanpa alasan', cmBad, x => `${x.c.kode} ${x.m.kode} (${x.b.code})`, 'bad', 'Pedoman 4.4, Bloom'),
    row('CPMK sedikit di luar rentang level semester, atau dikecualikan dengan alasan', cmNear, x => `${x.c.kode} ${x.m.kode} (${x.b.code})`, 'near', 'Pedoman 4.4, Bloom')
  ];
}
/** Alasan RPS mata kuliah ini belum boleh diajukan karena rambu level (kosong bila bersih). */
export function alasanRambuRps(S, m) {
  const cpmk = S.cpmk.filter(c => c.mk === m.id), a = [];
  const bad = cpmk.filter(c => { const g = selisihRentang(detect(c.teks, +m.P > +m.T ? 'P' : 'C'), m.smt); return Math.abs(g) >= 2 && !alasanOk(c.alasanLevel); });
  if (bad.length) a.push(`${bad.length} CPMK (${bad.slice(0, 3).map(c => c.kode).join(', ')}) berselisih 2 level atau lebih dari rentang semester ${m.smt} dan belum diberi alasan`);
  const cp = m.kunci ? [] : (m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(c => cplTerlaluTinggi(c, m.smt));
  if (cp.length && !alasanOk(m.alasanCpl)) a.push(`CPL ${cp.slice(0, 3).map(c => c.kode).join(', ')} terlalu tinggi untuk semester ${m.smt} dan belum diberi alasan pengecualian`);
  return a.length ? a.join('; ') + '. Alasan diisi prodi pada menu CPMK dan Sub-CPMK atau Mata Kuliah dan SKS' : '';
}

/* ---------- RPS ---------- */
export function rpsOf(S, mkId) { return S.rps.find(r => r.mk === mkId); }
export function rpsLengkap(r) {
  if (!r || !r.pertemuan) return 0;
  const isi = r.pertemuan.filter(p => (p.materi || '').trim() || p.ujian).length;
  return Math.min(100, isi / 16 * 100);
}
export const INTEG = ['', 'Penelitian', 'PKM', 'Penelitian dan PKM'];
export const integrasiOf = (r) => r && r.pertemuan ? r.pertemuan.filter(p => !p.ujian && (p.integ || (p.riset || []).length)).length : 0;
export function cekIntegrasi(S, pid) {
  /* Informasi saja: integrasi penelitian dan PKM bersifat opsional per mata kuliah, jadi tidak menjadi temuan. */
  const rp = S.rps.filter(r => r.prodi === pid && rpsLengkap(r) > 0);
  const dist = [0, 1, 2, 3].map(n => rp.filter(r => (n === 3 ? integrasiOf(r) >= 3 : integrasiOf(r) === n)).length);
  return [{ grp: 'Pembelajaran', label: 'Sebaran integrasi penelitian dan PKM per RPS (informasi)', val: rp.length ? `Tidak ada ${dist[0]}, 1 pertemuan ${dist[1]}, 2 pertemuan ${dist[2]}, 3 atau lebih ${dist[3]}` : 'Belum ada RPS', target: 'opsional', k: 'ok', acuan: 'SN Dikti (standar proses), LAM Teknik butir penelitian dan PkM' }];
}
export function sapLengkap(r) {
  if (!r || !r.pertemuan) return 0;
  const isi = r.pertemuan.filter(p => p.ujian || (p.sap && (p.sap.inti || '').trim())).length;
  return Math.min(100, isi / 16 * 100);
}

/* ---------- Progres tahap penyusunan ---------- */
export const TAHAP = ['Visi', 'Profil lulusan', 'CPL', 'BoK & BK', 'Mata kuliah', 'Peta kurikulum', 'Matriks', 'CPMK', 'Sub-CPMK', 'RPS', 'SAP'];
export function progres(S, pid) {
  const p = S.prodi.find(x => x.id === pid) || {}, P = param(S);
  const t = trace(S, pid), R = struktur(S, pid);
  const mkAkad = t.mk.filter(m => !/magang|tugas akhir/i.test(m.kel));
  const rps = mkAkad.map(m => rpsOf(S, m.id));
  const pct = (a, b) => b ? Math.min(100, a / b * 100) : 0;
  const smtOk = [1, 2, 3, 4, 5, 6, 7, 8].filter(s => R.smt[s].sks === P.kerangka[s][0]).length;
  const v = [
    (p.visiKeilmuan || '').trim() ? 100 : 0,
    pct(t.pl.length, 3),
    t.cpl.length ? pct(t.cpl.length - t.cplNoPl.length, t.cpl.length) : 0,
    t.bk.length ? pct(t.bk.length - t.bkNoMk.length, t.bk.length) * (t.bk.length >= 6 ? 1 : t.bk.length / 6) : 0,
    pct(R.n, P.mkProdiMin),
    smtOk / 8 * 100,
    t.cpl.length ? pct(t.cpl.length - t.cplNoMk.length, t.cpl.length) : 0,
    pct(mkAkad.length - t.mkNoCpmk.length, mkAkad.length),
    t.cpmk.length ? pct(t.cpmk.length - t.cpmkNoSub.length, t.cpmk.length) : 0,
    pct(rps.filter(r => r && r.status !== 'draf' && rpsLengkap(r) >= 99).length, mkAkad.length),
    pct(rps.filter(r => r && sapLengkap(r) >= 99).length, mkAkad.length)
  ];
  return { tahap: TAHAP.map((n, i) => ({ n, v: Math.round(v[i]) })), total: Math.round(v.reduce((a, b) => a + b, 0) / v.length), rpsSah: rps.filter(r => r && r.status === 'disahkan').length, rpsAju: rps.filter(r => r && r.status === 'diajukan').length, nMk: mkAkad.length };
}

/* ---------- Beban dosen ---------- */
/* SKS kurikulum (nominal) = (T x porsiT + P x porsiP) x kelas.
   SKS riil = (T x porsiT + P x durasi/60 x porsiP) x kelas, setara jam tatap muka riil per minggu (1 SKS teori = 60 menit). */
export function bebanTugas(S, t, P = param(S)) {
  const m = S.mk.find(x => x.id === t.mk); if (!m) return null;
  const kls = +t.kelas || 0, pT = t.porsiT == null ? 1 : +t.porsiT, pP = t.porsiP == null ? 1 : +t.porsiP;
  const nominal = ((+m.T || 0) * pT + (+m.P || 0) * pP) * kls;
  const jp = (S.settings && S.settings.jp && +S.settings.jp.dur) || 60;   /* menit per 1 JP */
  const riilT = (+m.T || 0) * pT * kls * P.menitTeori / jp;
  const riilP = (+m.P || 0) * pP * kls * durasi(m, P) / jp;
  return { m, kls, pT, pP, nominal, riilT, riilP, riil: riilT + riilP, ganjil: m.smt % 2 === 1 };
}
export function beban(S, paritas = 'ganjil') {
  const P = param(S);
  const rows = S.dosen.map(d => ({ d, items: [], nominal: 0, riil: 0, riilT: 0, riilP: 0, prodi: new Set() }));
  const idx = Object.fromEntries(rows.map(r => [r.d.id, r]));
  S.tugas.forEach(t => {
    const b = bebanTugas(S, t, P); if (!b || !idx[t.dosen]) return;
    if ((paritas === 'ganjil') !== b.ganjil) return;
    if (/magang|tugas akhir/i.test(b.m.kel)) return;
    const r = idx[t.dosen]; r.items.push({ t, ...b }); r.nominal += b.nominal; r.riil += b.riil; r.riilT += b.riilT; r.riilP += b.riilP; r.prodi.add(b.m.prodi);
  });
  rows.forEach(r => { r.k = r.riil > P.bebanRiilMax ? 'bad' : r.riil < P.bebanRiilMin ? 'near' : 'ok'; r.selisih = r.riil - r.nominal; });
  return { rows, P };
}
export function mkTanpaPengampu(S, paritas = 'ganjil') {
  return S.mk.filter(m => m.smt <= 6 && ((m.smt % 2 === 1) === (paritas === 'ganjil')) && !S.tugas.some(t => t.mk === m.id));
}
export const warnaGrup = (g) => (GRUP[g] || {}).c || '#64748b';

/* ---------- Kesiapan IABEE: PI, butir (a)-(k), MK inti ---------- */
export const HURUF_IABEE = BUTIR_IABEE.map(b => b.k);
/** Butir IABEE pada CPL selalu dibaca sebagai daftar huruf. Data lama berupa teks ("a, c") tetap terbaca. */
export function iabeeOf(c) {
  const v = c && c.iabee;
  const arr = Array.isArray(v) ? v : String(v || '').split(/[^a-zA-Z]+/);
  return Array.from(new Set(arr.map(x => String(x).trim().toLowerCase()).filter(x => HURUF_IABEE.includes(x)))).sort();
}
/* Penulisan singkat CPL: kode CPL ditambah unsur SN Dikti tanpa mengulang kata CPL, misalnya CPL02-P01,
   CPL05-KU01,KU02, atau CPL01-S01 s.d. S10 (tiga unsur berurutan atau lebih dalam satu ranah). */
export function cplSingkat(c) {
  if (!c) return '';
  const sn = String(c.sn || '').split(/[,;\n]+/).map(x => x.trim().toUpperCase().replace(/^CPL-?/, '')).filter(Boolean);
  if (!sn.length) return c.kode || '';
  const grup = new Map();
  sn.forEach(k => { const m = k.match(/^([A-Z]+)(\d+)$/); const r = m ? m[1] : k; if (!grup.has(r)) grup.set(r, []); grup.get(r).push({ k, n: m ? +m[2] : NaN }); });
  const out = [];
  grup.forEach(arr => {
    arr.sort((a, b) => a.n - b.n); let i = 0;
    while (i < arr.length) {
      let j = i; while (j + 1 < arr.length && arr[j + 1].n === arr[j].n + 1) j++;
      if (j - i >= 2) out.push(`${arr[i].k} s.d. ${arr[j].k}`); else for (let q = i; q <= j; q++) out.push(arr[q].k);
      i = j + 1;
    }
  });
  return `${c.kode}-${out.join(',')}`;
}
export const piOfCpl = (S, cplId) => (S.pi || []).filter(p => p.cpl === cplId).sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
export const kriteriaPi = (p, P) => ({ persen: p && p.minPersen != null && p.minPersen !== '' ? +p.minPersen : P.piMinPersen, nilai: p && p.minNilai != null && p.minNilai !== '' ? +p.minNilai : P.piMinNilai });
const labelCpmk = (S, c) => { const m = S.mk.find(x => x.id === c.mk); return { ...c, kode: `${m ? m.kode : c.mk}/${c.kode}` }; };
export function piTrace(S, pid) {
  const P = param(S);
  const cpl = byProdi(S.cpl, pid), pi = byProdi(S.pi || [], pid), mk = byProdi(S.mk, pid), cpmk = byProdi(S.cpmk, pid);
  const nPi = (c) => pi.filter(p => p.cpl === c.id).length;
  const punyaPi = (c) => pi.some(p => (p.cpmk || []).includes(c.id));
  const inti = mk.filter(m => m.inti);
  const cpmkInti = cpmk.filter(c => inti.some(m => m.id === c.mk));
  const butir = BUTIR_IABEE.map(b => ({ ...b, cpl: cpl.filter(c => iabeeOf(c).includes(b.k)) }));
  return {
    P, cpl, pi, mk, cpmk, inti, butir,
    cplNoPi: cpl.filter(c => !nPi(c)),
    cplPiDiLuar: cpl.filter(c => nPi(c) && (nPi(c) < P.piPerCplMin || nPi(c) > P.piPerCplMax)),
    piNoCpmk: pi.filter(p => !(p.cpmk || []).some(id => cpmk.some(c => c.id === id))),
    piNoCpl: pi.filter(p => !cpl.some(c => c.id === p.cpl)),
    cpmkInti,
    cpmkIntiNoPi: cpmkInti.filter(c => !punyaPi(c)).map(c => labelCpmk(S, c)),
    intiNoCpmk: inti.filter(m => !cpmk.some(c => c.mk === m.id)),
    intiLengkap: inti.filter(m => { const cs = cpmk.filter(c => c.mk === m.id); return cs.length && cs.every(punyaPi); }),
    butirKosong: butir.filter(b => !b.cpl.length),
    cplNoButir: cpl.filter(c => !iabeeOf(c).length)
  };
}
export function cekIabee(S, pid) {
  const t = piTrace(S, pid), P = t.P, L = (a) => a.map(x => x.kode).slice(0, 6).join(', ') + (a.length > 6 ? ', …' : '');
  const row = (label, arr, acuan, k = 'bad', kosong = 'Tidak ada') => ({ grp: 'Kesiapan IABEE', label, val: arr.length ? `${arr.length}: ${L(arr)}` : kosong, target: '0', k: arr.length ? k : 'ok', acuan });
  return [
    row('CPL tanpa indikator kinerja (PI)', t.cplNoPi, 'IABEE 1.2, asesmen CPL'),
    row(`CPL dengan jumlah PI di luar ${P.piPerCplMin}–${P.piPerCplMax}`, t.cplPiDiLuar, 'Pedoman asesmen CPL', 'near'),
    row('PI tanpa CPMK', t.piNoCpmk, 'IABEE 2.1.2, rantai ukur CPL'),
    t.inti.length ? row('Mata kuliah inti tanpa CPMK', t.intiNoCpmk, 'IABEE 2.1.2')
      : { grp: 'Kesiapan IABEE', label: 'Mata kuliah inti sudah ditandai', val: 'Belum ada', target: '≥ 1 MK', k: 'near', acuan: 'Lampiran kesiapan IABEE' },
    row('CPMK mata kuliah inti tanpa PI', t.cpmkIntiNoPi, 'IABEE 2.1.2, rantai ukur CPL'),
    row('CPL tanpa butir IABEE', t.cplNoButir, 'IABEE 1.2.2'),
    ...(() => { const ki = kompetensiInti(S, pid), cp = capaianCpl(S, pid), tl = tlProdi(S, pid);
      const out = [];
      if (ki.length) { const b = ki.filter(x => x.status === 'tanpa' || x.status === 'tidak'); out.push({ grp: 'Kesiapan IABEE', label: 'MK inti tanpa dosen pengampu yang sesuai', val: b.length ? `${b.length}: ${b.map(x => x.m.kode).slice(0, 6).join(', ')}` : 'Tidak ada', target: '0', k: b.length ? 'bad' : 'ok', acuan: 'IABEE 5 (staf pengajar)' }); }
      if (cp.bawah.length) { const tanpa = cp.bawah.filter(h => !tl.some(x => x.cpl === h.c.id)); out.push({ grp: 'Kesiapan IABEE', label: 'CPL di bawah kriteria tanpa catatan tindak lanjut', val: tanpa.length ? `${tanpa.length}: ${tanpa.map(h => h.c.kode).slice(0, 6).join(', ')}` : 'Tidak ada', target: '0', k: tanpa.length ? 'bad' : 'ok', acuan: 'IABEE 3 (peningkatan berkelanjutan)' }); }
      return out; })(),
    { grp: 'Kesiapan IABEE', label: 'Butir IABEE (a)–(k) yang belum dicakup CPL', val: t.butirKosong.length ? `${t.butirKosong.length}: ${t.butirKosong.map(b => '(' + b.k + ')').join(', ')}` : 'Semua tercakup', target: '0', k: t.butirKosong.length ? 'bad' : 'ok', acuan: 'IABEE 1.2.2' }
  ];
}

/* ---------- Tahap 2: capaian CPL agregat, tindak lanjut, kompetensi dosen ---------- */
const nz = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const persenCap = (r) => r && +r.n > 0 ? Math.min(100, (+r.lulus || 0) / +r.n * 100) : null;
const urutAngkatan = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
/** Capaian tiap CPL per angkatan. Baris tingkat CPL dipakai bila ada; bila hanya ada baris PI, dipakai PI terendah. */
export function capaianCpl(S, pid) {
  const P = param(S), krit = P.piMinPersen, cpl = byProdi(S.cpl, pid), manual = byProdi(S.capaian || [], pid);
  /* rekap manual didahulukan; hasil turunan dari Realisasi Pembelajaran mengisi CPL dan angkatan yang belum punya rekap manual */
  const rows = manual.concat(turunanReal(S, pid).filter(t => !manual.some(r => r.cpl === t.cpl && String(r.angkatan) === String(t.angkatan))));
  const hasil = cpl.map(c => {
    const rc = rows.filter(r => r.cpl === c.id && +r.n > 0), angk = Array.from(new Set(rc.map(r => String(r.angkatan)))).sort(urutAngkatan);
    const per = angk.map(a => {
      const lv = rc.filter(r => String(r.angkatan) === a), langsung = lv.find(r => !r.pi);
      if (langsung) return { angkatan: a, persen: persenCap(langsung), n: +langsung.n, lulus: +langsung.lulus, dari: 'CPL', id: langsung.id, turunan: langsung.turunan || '' };
      const terendah = lv.map(r => ({ r, p: persenCap(r) })).sort((x, y) => x.p - y.p)[0];
      return { angkatan: a, persen: terendah.p, n: +terendah.r.n, lulus: +terendah.r.lulus, dari: 'PI', id: terendah.r.id };
    });
    const akhir = per[per.length - 1] || null;
    return { c, per, akhir, terukur: !!per.length, ok: !!akhir && akhir.persen >= krit };
  });
  const angkatan = Array.from(new Set(rows.filter(r => +r.n > 0).map(r => String(r.angkatan)))).sort(urutAngkatan);
  return { krit, hasil, angkatan, terukur: hasil.filter(h => h.terukur), ok: hasil.filter(h => h.ok), bawah: hasil.filter(h => h.terukur && !h.ok) };
}
export const tlProdi = (S, pid) => byProdi(S.tl || [], pid);
export const TL_STATUS = { rencana: 'Direncanakan', berjalan: 'Berjalan', selesai: 'Selesai' };
const STOP_KOMP = new Set(['praktik', 'praktikum', 'dasar', 'teknik', 'mata', 'kuliah', 'design', 'capstone', 'berdampak', 'magang', 'tugas', 'akhir', 'terpadu', 'sistem', 'dengan', 'untuk', 'migas']);
export const kataKompetensi = (m) => { const eksplisit = String(m.kompetensi || '').split(/[,;\n]/).map(nz).filter(Boolean); if (eksplisit.length) return { kata: eksplisit, dari: 'diisi' }; return { kata: nz(m.nama).split(' ').filter(w => w.length >= 5 && !STOP_KOMP.has(w)), dari: 'nama' }; };
export const dosenPunyaBidang = (d) => !!(d && [d.bidang, d.s1, d.s2, d.s3, d.sertifikasi].some(v => nz(v)));
const teksBidang = (d) => nz([d.bidang, d.s1, d.s2, d.s3, d.sertifikasi].join(' '));
/** Kecocokan dosen pengampu dengan kompetensi yang diperlukan MK inti. Tidak memakai NIP. */
export function kompetensiInti(S, pid) {
  return byProdi(S.mk, pid).filter(m => m.inti).map(m => {
    const { kata, dari } = kataKompetensi(m), ids = Array.from(new Set(S.tugas.filter(t => t.mk === m.id).map(t => t.dosen)));
    const dosen = ids.map(id => S.dosen.find(d => d.id === id)).filter(Boolean);
    const cocok = dosen.filter(d => { const tb = teksBidang(d); return kata.some(k => tb.includes(k)); });
    const status = !dosen.length ? 'tanpa' : cocok.length ? 'sesuai' : dosen.some(dosenPunyaBidang) ? 'tidak' : 'data';
    return { m, kata, dari, dosen, cocok, status };
  });
}


/* ---------- Tahap 3: capstone, lulusan OBE, tracer dan survei pengguna (angka agregat) ---------- */
export const RUBRIK_ST = { belum: 'Belum ada', draf: 'Draf', disahkan: 'Disahkan' };
const terbaru = (arr) => arr.slice().sort((a, b) => String(a.tahun).localeCompare(String(b.tahun), 'id', { numeric: true })).pop() || null;
export const capstoneProdi = (S, pid) => byProdi(S.capstone || [], pid);
export const lulusanProdi = (S, pid) => byProdi(S.lulusan || [], pid).slice().sort((a, b) => String(a.tahun).localeCompare(String(b.tahun), 'id', { numeric: true }));
/** Empat syarat dokumentasi capstone untuk IABEE: MK ada, bobot penilaian, rubrik, proyek nyata. */
export function capstoneCek(S, pid) {
  const mkCap = byProdi(S.mk, pid).filter(m => /capstone/i.test(m.nama + ' ' + (m.kel || ''))), d = terbaru(capstoneProdi(S, pid));
  const sks = mkCap.reduce((a, m) => a + sksOf(m), 0);
  const syarat = [
    { k: 'mk', t: 'Mata kuliah capstone ada di kurikulum', ok: mkCap.length > 0, ket: mkCap.length ? `${mkCap.length} MK, ${sks} SKS` : 'Belum ada MK capstone' },
    { k: 'bobot', t: 'Bobot capstone dalam penilaian dicatat', ok: !!d && +d.bobot > 0, ket: d && +d.bobot > 0 ? `${fmt(+d.bobot, 1)}%` : 'Belum diisi' },
    { k: 'rubrik', t: 'Rubrik penilaian capstone tersedia', ok: !!d && (d.rubrik === 'draf' || d.rubrik === 'disahkan'), ket: d ? RUBRIK_ST[d.rubrik] || 'Belum ada' : 'Belum diisi' },
    { k: 'proyek', t: 'Proyek capstone berbasis masalah nyata', ok: !!d && +d.proyek > 0, ket: d && +d.proyek > 0 ? `${d.proyek} proyek${+d.mitra > 0 ? `, ${d.mitra} mitra industri` : ''}` : 'Belum diisi' }
  ];
  return { mkCap, sks, d, syarat, ok: syarat.filter(x => x.ok).length };
}
export function lulusanRekap(S, pid) {
  const rows = lulusanProdi(S, pid), jum = (f) => rows.reduce((a, r) => a + (+r[f] || 0), 0);
  const jumlah = jum('jumlah'), tracer = jum('tracer'), pengguna = jum('pengguna');
  return { rows, jumlah, obe: jum('obe'), tracer, pengguna, bekerja: jum('bekerja'), rTracer: jumlah ? tracer / jumlah * 100 : null, rPengguna: jumlah && pengguna ? pengguna / jumlah * 100 : null };
}

/** Sepuluh indikator kesiapan per prodi. nilai null berarti belum diukur (bukan nol). */
export function kesiapan(S, pid) {
  const t = piTrace(S, pid), target = (S.settings && S.settings.targetIabee) || {}, cap = capaianCpl(S, pid), tl = tlProdi(S, pid), ki = kompetensiInti(S, pid), cs = capstoneCek(S, pid), ll = lulusanRekap(S, pid);
  const pct = (a, b) => b ? a / b * 100 : 0;
  const st = (v) => v >= 99.5 ? 'ok' : v >= 50 ? 'near' : 'bad';
  const belum = (ket) => ({ nilai: null, teks: 'Belum diukur', k: 'na', ket });
  const hasil = {
    1: (() => {
      if (!t.cpl.length) return belum('CPL prodi belum ada.');
      const cplPi = pct(t.cpl.length - t.cplNoPi.length, t.cpl.length);
      if (!t.inti.length) return { nilai: cplPi, teks: `${fmt(cplPi)}% CPL ber-PI`, k: cplPi >= 50 ? 'near' : 'bad', ket: `${t.cpl.length - t.cplNoPi.length} dari ${t.cpl.length} CPL sudah punya PI. Mata kuliah inti belum ditandai, jadi pemetaan PI ke CPMK MK inti belum bisa dihitung.` };
      const mi = pct(t.intiLengkap.length, t.inti.length);
      return { nilai: Math.min(cplPi, mi), teks: `${fmt(cplPi)}% CPL ber-PI · ${fmt(mi)}% MK inti lengkap`, k: st(Math.min(cplPi, mi)), ket: `${t.cpl.length - t.cplNoPi.length} dari ${t.cpl.length} CPL punya PI. ${t.intiLengkap.length} dari ${t.inti.length} MK inti sudah memiliki CPMK yang seluruhnya terhubung ke PI.` };
    })(),
    2: (() => {
      if (!t.cpl.length) return belum('CPL prodi belum ada.');
      const ada = HURUF_IABEE.length - t.butirKosong.length, cplOk = t.cpl.length - t.cplNoButir.length;
      const v = Math.min(pct(ada, HURUF_IABEE.length), pct(cplOk, t.cpl.length));
      return { nilai: v, teks: `${ada} dari ${HURUF_IABEE.length} butir tercakup`, k: st(v), ket: `${cplOk} dari ${t.cpl.length} CPL sudah diberi butir IABEE.${t.butirKosong.length ? ' Butir belum tercakup: ' + t.butirKosong.map(b => '(' + b.k + ')').join(', ') + '.' : ''}` };
    })(),
    3: (() => {
      if (!t.cpl.length) return belum('CPL prodi belum ada.');
      if (!cap.terukur.length) return belum('Belum ada rekap capaian CPL. Isi atau impor di menu Capaian CPL & Tindak Lanjut.');
      const v = pct(cap.terukur.length, t.cpl.length);
      return { nilai: v, teks: `${cap.terukur.length} dari ${t.cpl.length} CPL terukur`, k: st(v), ket: `${cap.terukur.length} dari ${t.cpl.length} CPL sudah punya data capaian. Angkatan terdata: ${cap.angkatan.join(', ')}.` };
    })(),
    4: (() => {
      if (!cap.terukur.length) return belum('Dihitung setelah rekap capaian CPL masuk.');
      const v = pct(cap.ok.length, cap.terukur.length);
      return { nilai: v, teks: `${cap.ok.length} dari ${cap.terukur.length} CPL memenuhi`, k: st(v), ket: `Kriteria: minimal ${fmt(cap.krit)}% mahasiswa mencapai nilai batas, dilihat pada angkatan terbaru tiap CPL.${cap.bawah.length ? ' Di bawah kriteria: ' + cap.bawah.map(h => h.c.kode).join(', ') + '.' : ''}` };
    })(),
    5: (() => {
      if (!cs.d && !cs.mkCap.length) return belum('MK capstone belum ada di kurikulum dan dokumentasi capstone belum diisi (menu Capstone, Lulusan & Tracer).');
      const v = cs.ok / cs.syarat.length * 100, kurang = cs.syarat.filter(x => !x.ok).map(x => x.t.toLowerCase());
      return { nilai: v, teks: `${cs.ok} dari ${cs.syarat.length} syarat terpenuhi`, k: st(v), ket: kurang.length ? 'Belum: ' + kurang.join('; ') + '.' : 'Bobot, rubrik, dan proyek nyata sudah terdokumentasi.' };
    })(),
    6: (() => {
      if (!ll.rows.length) return belum('Belum ada data lulusan. Bagian Akademik mengisi di menu Capstone, Lulusan & Tracer.');
      return { nilai: null, teks: `${fmt(ll.obe)} lulusan OBE`, k: 'ok', ket: `Terdata ${ll.rows.length} tahun kelulusan dengan total ${fmt(ll.jumlah)} lulusan, ${fmt(ll.obe)} di antaranya lulusan kurikulum OBE.` };
    })(),
    7: (() => {
      if (!tl.length) return belum('Belum ada catatan tindak lanjut. Catat di menu Capaian CPL & Tindak Lanjut, lalu hubungkan ke menu Revisi.');
      const sl = tl.filter(x => x.status === 'selesai').length, jalan = tl.length - sl;
      return sl ? { nilai: 100, teks: `${sl} siklus selesai`, k: 'ok', ket: `${tl.length} catatan tindak lanjut, ${sl} selesai${jalan ? `, ${jalan} masih direncanakan atau berjalan` : ''}. ${tl.filter(x => x.revisi).length} terhubung ke usulan revisi.` }
        : { nilai: 0, teks: `${tl.length} catatan, belum selesai`, k: 'near', ket: `Ada ${tl.length} catatan tindak lanjut, belum ada yang berstatus selesai. Satu siklus dihitung bila temuan, tindakan, dan hasilnya sudah dicatat dan ditandai selesai.` };
    })(),
    8: (() => {
      if (!ll.jumlah || !ll.tracer) return belum('Belum ada data responden tracer. CDC atau akademik mengisi jumlah responden di menu Capstone, Lulusan & Tracer.');
      const v = ll.rPengguna == null ? ll.rTracer : Math.min(ll.rTracer, ll.rPengguna), kk = v >= 70 ? 'ok' : v >= 50 ? 'near' : 'bad';
      return { nilai: v, teks: `Tracer ${fmt(ll.rTracer)}%${ll.rPengguna == null ? '' : `, pengguna ${fmt(ll.rPengguna)}%`}`, k: kk, ket: `Responden tracer ${fmt(ll.tracer)} dari ${fmt(ll.jumlah)} lulusan${ll.rPengguna == null ? '. Survei pengguna belum diisi, nilai hanya dari tracer' : `; responden survei pengguna ${fmt(ll.pengguna)}`}. Target respons minimal 70%.` };
    })(),
    9: belum('Dipantau melalui daftar periksa dokumen di SIMANTAP.'),
    10: (() => {
      if (!ki.length) return belum('Mata kuliah inti belum ditandai.');
      if (!S.dosen.some(dosenPunyaBidang)) return belum('Bidang S1, S2, S3, dan sertifikasi dosen belum diisi (Data Induk, tab Dosen).');
      const ok = ki.filter(x => x.status === 'sesuai').length, v = pct(ok, ki.length), c = (s) => ki.filter(x => x.status === s).length;
      return { nilai: v, teks: `${ok} dari ${ki.length} MK inti sesuai`, k: st(v), ket: `Belum ada dosen pengampu: ${c('tanpa')}. Pengampu belum cocok dengan kompetensi: ${c('tidak')}. Pengampu belum diisi bidangnya: ${c('data')}.` };
    })()
  };
  return INDIKATOR_IABEE.map(d => ({ ...d, target: target[d.no] || d.target, ...hasil[d.no] }));
}
