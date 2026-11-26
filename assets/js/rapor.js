/* KUREKAM · Rapor kompetensi mahasiswa dari nilai: predikat, ringkasan lintas mata kuliah, narasi, dan dokumen cetak.
   Fungsi murni. Skala 0-100. Sangat kompeten ≥ batas kuat, Kompeten ≥ ambang, selain itu Perlu penguatan. */
import { hitungCpl } from './nilaicpl.js';

export const BATAS_KUAT = 85;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = (v) => v == null ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ',');
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const hariIni = () => { const d = new Date(); return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`; };

export function predikat(v, ambang, kuat = BATAS_KUAT) {
  if (v == null) return { k: 'na', t: 'Belum diisi', w: '#94a3b8' };
  if (v >= kuat) return { k: 'sk', t: 'Sangat kompeten', w: '#0f8a5f' };
  if (v >= ambang) return { k: 'k', t: 'Kompeten', w: '#10b981' };
  return { k: 'p', t: 'Perlu penguatan', w: '#d4313f' };
}
export const rataSkor = (obj, ids) => { const a = (ids || Object.keys(obj)).map(i => obj[i]).filter(v => v != null); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; };

/** Skor satu mahasiswa pada satu dokumen nilai (kur_nilai). Mengembalikan {cpl, cpmk} atau null bila NIM tidak ada. */
export function skorDariDok(S, doc, nim, ambang, nimPos, nimLen) {
  const x = (doc.mhs || []).find(m => m.nim === nim); if (!x) return null;
  const cpmk = S.cpmk.filter(c => c.mk === doc.mk), bobotCpmk = {};
  cpmk.forEach(c => { const b = S.sub.filter(s => s.cpmk === c.id).reduce((a, s) => a + (+s.bobot || 0), 0); bobotCpmk[c.id] = b || 1; });
  const h = hitungCpl({ tabel: { kolom: (doc.kolom || []).map((nama, i) => ({ i, nama })), mhs: [x] }, cpmk, bobotCpmk, peta: doc.peta || {}, ambang, nimPos, nimLen });
  return h.mahasiswa[0] ? { cpl: h.mahasiswa[0].cpl, cpmk: h.mahasiswa[0].cpmk } : null;
}

/** Gabungan lintas mata kuliah untuk satu NIM. docs: dokumen kur_nilai. Bobot MK = SKS (teori + praktik), minimal 1. */
export function lintasMk(S, nim, docs, ambang, nimPos, nimLen) {
  const mkRows = [], gab = {};
  docs.filter(d => (d.mhs || []).some(m => m.nim === nim)).forEach(d => {
    const m = S.mk.find(x => x.id === d.mk); if (!m) return;
    const sk = skorDariDok(S, d, nim, ambang, nimPos, nimLen); if (!sk) return;
    const w = Math.max(1, (+m.T || 0) + (+m.P || 0));
    mkRows.push({ mk: m, smt: d.smt, kelas: d.kelas, w, cpl: sk.cpl, rata: rataSkor(sk.cpl) });
    Object.keys(sk.cpl).forEach(id => { const g = gab[id] || (gab[id] = { s: 0, w: 0, dari: [] }); g.s += sk.cpl[id] * w; g.w += w; g.dari.push({ mk: m, skor: sk.cpl[id], w }); });
  });
  const cpl = {}; Object.keys(gab).forEach(id => { cpl[id] = { skor: gab[id].s / gab[id].w, dari: gab[id].dari.sort((a, b) => b.skor - a.skor) }; });
  return { mkRows, cpl };
}

/** Kalimat ringkas rapor. cplRows: [{kode, skor}], cpmkRows: [{kode, skor, cpl:[kode]}]. */
export function narasi({ nama, cplRows, cpmkRows, ambang, lintas }) {
  const ada = cplRows.filter(r => r.skor != null), kuat = ada.filter(r => r.skor >= BATAS_KUAT), kurang = ada.filter(r => r.skor < ambang), belum = cplRows.length - ada.length;
  if (!ada.length) return `${nama || 'Mahasiswa'} belum memiliki nilai CPL yang dapat dihitung.`;
  const rata = rataSkor(Object.fromEntries(ada.map((r, i) => [i, r.skor])));
  const p = predikat(rata, ambang);
  const daftar = (a) => a.map(r => r.kode).join(', ');
  const cpmkLemah = (r) => cpmkRows.filter(c => c.skor != null && c.skor < ambang && (c.cpl || []).includes(r.kode)).map(c => c.kode);
  let t = `${nama || 'Mahasiswa'} memiliki rata-rata CPL ${f1(rata)} dengan predikat ${p.t.toLowerCase()} pada ${ada.length} CPL yang telah diukur.`;
  const komp = ada.filter(r => r.skor >= ambang);
  if (komp.length) t += ` Kompeten pada ${daftar(komp)}${kuat.length ? `, dan sangat kuat pada ${daftar(kuat)}` : ''}.`;
  if (kurang.length) t += ` Perlu penguatan pada ${kurang.map(r => { const c = cpmkLemah(r); return r.kode + (c.length ? ` (CPMK ${c.join(', ')} masih di bawah ${ambang})` : ''); }).join('; ')}.`;
  else t += ' Tidak ada CPL yang berada di bawah ambang.';
  if (belum) t += ` ${belum} CPL belum diukur.`;
  if (lintas && lintas.menguatkan && lintas.menguatkan.length) t += ` Mata kuliah yang paling menguatkan: ${lintas.menguatkan.join(', ')}.`;
  if (lintas && lintas.melemahkan && lintas.melemahkan.length) t += ` Mata kuliah yang perlu diperhatikan: ${lintas.melemahkan.join(', ')}.`;
  return t;
}

/** Grafik laba-laba 0-100 untuk cetak. items: [{kode, skor}] */
export function radar100(items, ambang) {
  const N = items.length; if (N < 3) return '';
  const W = 460, H = 360, cx = W / 2, cy = 180, R = 125, ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / N, P = (i, v) => [cx + R * v / 100 * Math.cos(ang(i)), cy + R * v / 100 * Math.sin(ang(i))];
  const poly = (f) => items.map((x, i) => P(i, f(x, i)).map(v => v.toFixed(1)).join(',')).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" style="max-width:100%">`;
  [25, 50, 75, 100].forEach(r => { s += `<polygon points="${poly(() => r)}" fill="none" stroke="#cbd5e1" stroke-width=".7"/>`; });
  items.forEach((x, i) => { const [ex, ey] = P(i, 100), [lx, ly] = P(i, 117); s += `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#cbd5e1" stroke-width=".7"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" text-anchor="middle" dominant-baseline="middle" fill="#334155">${esc(x.kode)}</text>`; });
  s += `<polygon points="${poly(() => ambang)}" fill="none" stroke="#6366f1" stroke-width="1" stroke-dasharray="4 3"/>`;
  s += `<polygon points="${poly(x => x.skor || 0)}" fill="#0ea5e9" fill-opacity=".22" stroke="#0ea5e9" stroke-width="2"/>`;
  items.forEach((x, i) => { if (x.skor == null) return; const [px, py] = P(i, x.skor); s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="#0ea5e9"/>`; });
  return s + `<text x="10" y="${H - 8}" font-size="10" fill="#6366f1">garis putus-putus = ambang ${ambang}</text></svg>`;
}

const bar = (v, ambang) => { const p = predikat(v, ambang); return v == null ? '<span style="color:#94a3b8">belum diisi</span>' : `<span style="display:inline-block;width:110px;height:8px;background:#e2e8f0;border-radius:4px;vertical-align:middle"><i style="display:block;height:8px;width:${Math.min(100, v)}%;background:${p.w};border-radius:4px"></i></span> <b>${f1(v)}</b>`; };

/** Dokumen cetak rapor mahasiswa (HTML A4). d: {institusi, prodiNama, logo, mhs:{nim,nama,kelas,angkatan}, mk:{kode,nama}, smt, ambang, cplRows:[{kode,teks,skor,rataKelas}], cpmkRows:[{kode,teks,skor,rataKelas,cpl}], narasi, lintas:{cplRows, mkRows, narasi}|null} */
export function htmlRapor(d) {
  const th = 'style="text-align:left;background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 6px;font-size:10pt"', td = 'style="border:1px solid #cbd5e1;padding:4px 6px;font-size:10pt;vertical-align:top"';
  const tabel = (judul, rows, kolom) => `<h3 style="font-size:11pt;margin:14px 0 4px">${judul}</h3><table style="border-collapse:collapse;width:100%"><thead><tr>${kolom.map(k => `<th ${th}>${k}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  const cplTr = (r) => { const p = predikat(r.skor, d.ambang); return `<tr><td ${td}><b>${esc(r.kode)}</b><br><span style="font-size:9pt;color:#475569">${esc(r.teks || '')}</span></td><td ${td}>${bar(r.skor, d.ambang)}</td><td ${td} align="center">${f1(r.rataKelas)}</td><td ${td}><b style="color:${p.w}">${p.t}</b></td></tr>`; };
  const cpmkTr = (r) => { const p = predikat(r.skor, d.ambang); return `<tr><td ${td}><b>${esc(r.kode)}</b> <span style="font-size:9pt;color:#475569">${esc(r.teks || '')}</span></td><td ${td}>${bar(r.skor, d.ambang)}</td><td ${td} align="center">${f1(r.rataKelas)}</td><td ${td}><b style="color:${p.w}">${p.t}</b></td></tr>`; };
  const lintas = d.lintas ? `<div style="page-break-before:always"></div><h2 style="font-size:13pt;margin:0 0 6px">Kompetensi lintas mata kuliah</h2><p style="font-size:10.5pt;line-height:1.45">${esc(d.lintas.narasi)}</p>
    ${tabel('CPL gabungan (berbobot SKS)', d.lintas.cplRows.map(r => `<tr><td ${td}><b>${esc(r.kode)}</b><br><span style="font-size:9pt;color:#475569">${esc(r.teks || '')}</span></td><td ${td}>${bar(r.skor, d.ambang)}</td><td ${td} align="center">${r.n || 0}</td><td ${td}><b style="color:${predikat(r.skor, d.ambang).w}">${predikat(r.skor, d.ambang).t}</b></td></tr>`), ['CPL', 'Skor', 'Jumlah MK', 'Predikat'])}
    ${tabel('Mata kuliah yang telah dinilai', d.lintas.mkRows.map(r => `<tr><td ${td}><b>${esc(r.kode)}</b> ${esc(r.nama)}</td><td ${td}>${esc(r.smt)}</td><td ${td} align="center">${f1(r.rata)}</td><td ${td}>${r.cpl.map(c => `${esc(c.kode)} <b style="color:${predikat(c.skor, d.ambang).w}">${f1(c.skor)}</b>`).join(' · ')}</td></tr>`), ['Mata kuliah', 'Semester', 'Rata-rata CPL', 'Skor per CPL'])}` : '';
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Rapor kompetensi ${esc(d.mhs.nim)}</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0}.kop{display:flex;gap:12px;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px}.kop img{height:54px}.kop b{font-size:13pt}.kop span{display:block;font-size:10pt;color:#475569}.id td{padding:2px 10px 2px 0;font-size:10.5pt}</style></head><body>
    <div class="kop"><img src="${esc(d.logo)}" alt=""><div><b>${esc(d.institusi)}</b><span>Program Studi ${esc(d.prodiNama)}</span></div></div>
    <h1 style="font-size:15pt;margin:0 0 6px">Rapor Kompetensi Mahasiswa</h1>
    <table class="id"><tr><td>Nama</td><td><b>${esc(d.mhs.nama)}</b></td><td>NIM</td><td><b>${esc(d.mhs.nim)}</b></td></tr><tr><td>Kelas</td><td>${esc(d.mhs.kelas || '-')}</td><td>Angkatan</td><td>${esc(d.mhs.angkatan)}</td></tr><tr><td>Mata kuliah</td><td colspan="3">${esc(d.mk.kode)} ${esc(d.mk.nama)} · ${esc(d.smt)}</td></tr></table>
    <p style="font-size:10.5pt;line-height:1.45;background:#f8fafc;border-left:3px solid #0ea5e9;padding:6px 10px">${esc(d.narasi)}</p>
    <div style="text-align:center">${radar100(d.cplRows.map(r => ({ kode: r.kode, skor: r.skor })), d.ambang)}</div>
    ${tabel('Capaian pembelajaran lulusan (CPL)', d.cplRows.map(cplTr), ['CPL', 'Skor', 'Rata-rata kelas', 'Predikat'])}
    ${tabel('Capaian pembelajaran mata kuliah (CPMK)', d.cpmkRows.map(cpmkTr), ['CPMK', 'Skor', 'Rata-rata kelas', 'Predikat'])}
    <p style="font-size:9pt;color:#64748b;margin-top:10px">Skor 0 sampai 100. Sangat kompeten ≥ ${BATAS_KUAT}, kompeten ≥ ${d.ambang}, perlu penguatan di bawah ${d.ambang}. Dicetak ${hariIni()} dari KUREKAM.</p>
    ${lintas}</body></html>`;
}
