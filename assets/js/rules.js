/* KUREKAM · Aturan Buku Pedoman, keterlacakan OBE, progres, dan beban dosen riil. */
import { PARAM_DEFAULT, KELOMPOK, GRUP } from './config.js';
import { detect, lvNum, MIN_CPL, ANJURAN_SMT } from './bloom.js';

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
    if (b.kabur) issues.push({ obj: 'CPMK', kode: c.kode, teks: c.teks, msg: `"${b.verb}" tidak terukur, ganti dengan KKO yang dapat diases`, k: 'near', b });
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

/* ---------- RPS ---------- */
export function rpsOf(S, mkId) { return S.rps.find(r => r.mk === mkId); }
export function rpsLengkap(r) {
  if (!r || !r.pertemuan) return 0;
  const isi = r.pertemuan.filter(p => (p.materi || '').trim() || p.ujian).length;
  return isi / 16 * 100;
}
export const INTEG = ['', 'Penelitian', 'PKM', 'Penelitian dan PKM'];
export const integrasiOf = (r) => r && r.pertemuan ? r.pertemuan.filter(p => !p.ujian && p.integ).length : 0;
export function cekIntegrasi(S, pid) {
  const P = param(S), min = P.integrasiMinPertemuan || 2;
  const rp = S.rps.filter(r => r.prodi === pid && rpsLengkap(r) > 0);
  const kurang = rp.filter(r => integrasiOf(r) < min).map(r => ({ kode: ((S.mk.find(m => m.id === r.mk) || {}).kode) || r.mk }));
  const L = (a) => a.map(x => x.kode).slice(0, 6).join(', ') + (a.length > 6 ? ', …' : '');
  return [{ grp: 'Pembelajaran', label: `RPS dengan integrasi penelitian atau PKM kurang dari ${min} pertemuan`, val: kurang.length ? `${kurang.length} dari ${rp.length}: ${L(kurang)}` : (rp.length ? 'Tidak ada' : 'Belum ada RPS'), target: '0', k: kurang.length ? 'near' : 'ok', acuan: 'SN Dikti (standar proses), LAM Teknik butir penelitian dan PkM' }];
}
export function sapLengkap(r) {
  if (!r || !r.pertemuan) return 0;
  const isi = r.pertemuan.filter(p => p.ujian || (p.sap && (p.sap.inti || '').trim())).length;
  return isi / 16 * 100;
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
  const riilT = (+m.T || 0) * pT * kls * P.menitTeori / 60;
  const riilP = (+m.P || 0) * pP * kls * durasi(m, P) / 60;
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
