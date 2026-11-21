/* KUREKAM · SKPI: penyusun dokumen (HTML siap cetak/simpan PDF) dan grafik laba-laba. Fungsi murni tanpa akses jaringan atau penyimpanan. */
import { DOMAIN, predikat, SKPI_DEF } from './skpilogic.js';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n2 = (v) => v == null ? '–' : v.toFixed(2).replace('.', ',');
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const tglId = (d) => `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`;
export const tglEn = (d) => `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
const pot = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

/** Sebutan singkat sumbu grafik: field singkat bila ada, bila tidak beberapa kata pertama teks CPL. */
export const singkatId = (c) => c.singkat || pot(String(c.teks || '').replace(/^(Mampu|Menunjukkan|Menguasai|Menerapkan|Menganalisis|Merancang|Mengelola|Mengoperasikan|Menjelaskan|Mengambil)\s+/i, '').split(/\s+/).slice(0, 4).join(' '), 26);
export const singkatEn = (c) => c.singkatEn || '';

/** Grafik laba-laba skala 0-4. rata = Map(cplId -> skor) untuk pembanding (opsional). */
export function radarSvg(hasil, rata, K = SKPI_DEF) {
  const N = hasil.length, W = 600, H = 450, cx = W / 2, cy = 222, R = 150, MIN = 2;
  if (N < 3) return '<div class="note">Grafik laba-laba memerlukan minimal tiga CPL.</div>';
  const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / N, P = (i, v) => { const f = Math.max(0, Math.min(1, (v - MIN) / (4 - MIN))); return [cx + R * f * Math.cos(ang(i)), cy + R * f * Math.sin(ang(i))]; };
  const poly = (f) => hasil.map((x, i) => P(i, f(x)).map(v => v.toFixed(1)).join(',')).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="radar" font-family="Arial, Helvetica, sans-serif">`;
  for (const r of [2, 2.5, 3, 3.5, 4]) s += `<polygon points="${poly(() => r)}" fill="none" stroke="#cbd5e1" stroke-width="${r === 4 ? 1.2 : .7}"/>`;
  hasil.forEach((x, i) => { const [ex, ey] = P(i, 4); s += `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#cbd5e1" stroke-width=".7"/>`; });
  s += `<polygon points="${poly(() => K.sangat)}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 3"/>`;
  s += `<polygon points="${poly(() => K.kompeten)}" fill="none" stroke="#e08a00" stroke-width="1.4" stroke-dasharray="5 3"/>`;
  [2, 2.5, 3, 3.5, 4].forEach(r => { s += `<text x="${cx + 3}" y="${(cy - R * (r - MIN) / (4 - MIN) - 2).toFixed(1)}" font-size="7.5" fill="#64748b">${r.toFixed(1).replace('.', ',')}</text>`; });
  if (rata && rata.size) s += `<polygon points="${poly(x => rata.get(x.cpl.id) || 0)}" fill="none" stroke="#6366f1" stroke-width="1.6" stroke-dasharray="1 0"/>`;
  s += `<polygon points="${poly(x => x.skor || 0)}" fill="rgba(16,185,129,.28)" stroke="#0f9f6e" stroke-width="2"/>`;
  hasil.forEach((x, i) => {
    const [px, py] = P(i, x.skor || 0); s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="#0f9f6e"/>`;
    const a = ang(i), lx = cx + (R + 16) * Math.cos(a), ly = cy + (R + 16) * Math.sin(a), c = Math.cos(a), anc = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle';
    const y0 = ly + (Math.sin(a) > 0.6 ? 6 : Math.sin(a) < -0.6 ? -14 : -4);
    s += `<text x="${lx.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${anc}" font-size="9.5" font-weight="700" fill="#0f172a">${esc(x.cpl.kode)} · ${n2(x.skor)}</text>`;
    s += `<text x="${lx.toFixed(1)}" y="${(y0 + 10).toFixed(1)}" text-anchor="${anc}" font-size="7.5" fill="#334155">${esc(pot(singkatId(x.cpl), 28))}</text>`;
    const en = singkatEn(x.cpl); if (en) s += `<text x="${lx.toFixed(1)}" y="${(y0 + 19).toFixed(1)}" text-anchor="${anc}" font-size="7.5" font-style="italic" fill="#64748b">${esc(pot(en, 28))}</text>`;
  });
  return s + '</svg>'
    + `<div class="leg"><span><i style="border-top-color:#0f9f6e"></i>Mahasiswa / Student</span>${rata && rata.size ? '<span><i style="border-top-color:#6366f1"></i>Rata-rata angkatan / Cohort average</span>' : ''}<span><i class="dsh" style="border-top-color:#e08a00"></i>Batas Kompeten / Competent threshold ${n2(K.kompeten)}</span><span><i class="dot" style="border-top-color:#94a3b8"></i>${n2(K.sangat)}</span></div><div class="note">Sumbu dimulai dari 2,00 (nilai C) agar perbedaan terlihat. / Axis starts at 2.00 (grade C) so differences are visible.</div>`;
}

/** Butir terjemahan yang belum terverifikasi pada profil satu mahasiswa. */
export function perluVerifikasi(h, padan) {
  const cpl = h.hasil.filter(x => x.skor != null && !(x.cpl.tekEn && x.cpl.enStatus === 'ok')).map(x => x.cpl.kode);
  const mk = new Set(); h.hasil.forEach(x => x.rincian.forEach(r => { const ok = (r.mk.namaEn && r.mk.enStatus === 'ok') || (!r.mk.namaEn && r.t.namaEn); if (!ok) mk.add(r.mk.nama); }));
  return { cpl, mk: [...mk], draf: cpl.length > 0 || mk.size > 0 };
}
export const namaEnMk = (mk, t) => mk.namaEn || (t && t.namaEn) || '';

const CSS = `
@page{size:A4;margin:13mm 13mm 14mm}*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:9.4pt;color:#0f172a;line-height:1.32;margin:0}
.pg{page-break-after:always;position:relative}.pg:last-child{page-break-after:auto}
.kop{display:flex;align-items:center;gap:12px;border-bottom:2px solid #0f172a;padding-bottom:7px;margin-bottom:9px}.kop img{height:44px;width:auto;flex:none}.kop .t{flex:1;min-width:0;text-align:center}
.kop .t b{font-size:12.5pt;display:block;letter-spacing:.2px}.kop .t span{font-size:8.5pt;color:#334155}
h1{font-size:13pt;text-align:center;margin:4px 0 0;letter-spacing:.4px}h1 em,.sub{display:block;font-weight:400;font-size:9.5pt;color:#475569}
.no{text-align:center;font-size:8.8pt;margin:3px 0 9px}
h2{font-size:9.6pt;background:#e8f1ee;border-left:4px solid #0f9f6e;padding:3px 7px;margin:11px 0 5px}h2 em{font-weight:400;color:#475569;font-style:italic}
table{border-collapse:collapse;width:100%}td,th{vertical-align:top;padding:2.6px 5px;border-bottom:1px solid #e2e8f0}th{text-align:left;font-size:8.4pt;background:#f1f5f9;border-bottom:1px solid #94a3b8}
.k td:first-child{width:37%;color:#334155}.k em{display:block;color:#64748b;font-size:8.2pt}.k td.v b{font-weight:700}.k td.v em{color:#64748b}
td.n,th.n{text-align:right;white-space:nowrap}em.en,.en{color:#64748b;font-style:italic;display:block;font-size:8.4pt}
.tag{display:inline-block;padding:1px 6px;border-radius:9px;font-size:8pt;font-weight:700;white-space:nowrap}.sk{background:#d1fae5;color:#065f46}.k{background:#dbeafe;color:#1e40af}.ck{background:#fef3c7;color:#92400e}
.leg{display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:center;font-size:8pt;color:#334155;margin-top:2px}.leg i{display:inline-block;width:20px;height:0;border-top:2.5px solid;vertical-align:middle;margin-right:5px}.leg i.dsh{border-top-style:dashed}.leg i.dot{border-top-style:dotted;border-top-width:2px}.rad{text-align:center;margin:4px 0}.radar{width:100%;max-width:560px;height:auto}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #cbd5e1;border-radius:4px;padding:6px 8px;min-height:44px;white-space:pre-wrap}
.ttd{display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;gap:14px}.ttd .c{text-align:center;min-width:210px}.ttd .sp{height:54px}
.qr{width:96px;height:96px}.qr svg{width:96px;height:96px}.qrt{font-size:7.6pt;color:#475569;max-width:170px;word-break:break-all}
.note{font-size:8.2pt;color:#475569}.wm{position:fixed;top:42%;left:6%;width:88%;text-align:center;font-size:50pt;font-weight:900;color:rgba(220,38,38,.12);transform:rotate(-24deg);pointer-events:none;z-index:9}
.lamp h3{font-size:9.6pt;margin:10px 0 3px;page-break-after:avoid}.lamp table{font-size:8.3pt}.lamp tr{page-break-inside:avoid}
.dom td,.dom th{font-size:8.8pt}.hd{display:flex;justify-content:space-between;font-size:8pt;color:#475569;border-bottom:1px solid #cbd5e1;margin-bottom:6px}
@media screen{body{background:#e2e8f0;padding:14px}.pg{background:#fff;max-width:794px;margin:0 auto 14px;padding:36px 40px;box-shadow:0 2px 14px rgba(0,0,0,.18)}}
`;

const bi = (id, en) => `${esc(id)}<em class="en">${esc(en)}</em>`;
const baris = (id, en, v, ven) => `<tr><td>${esc(id)}<em>${esc(en)}</em></td><td class="v"><b>${esc(v || '–')}</b>${ven ? `<em>${esc(ven)}</em>` : ''}</td></tr>`;
const chip = (p) => p ? `<span class="tag ${p[2]}">${esc(p[0])}</span><em class="en">${esc(p[1])}</em>` : '–';

/** Satu mahasiswa -> satu rangkaian halaman SKPI. s = {m, h, cat, kode, qr, url, rata, draf, tgl}. */
function halaman(s, K, ctxDoc) {
  const { m, h, cat = {}, kode, qr, url, rata, tgl } = s, d = tgl || new Date(), pr = ctxDoc;
  const cplData = h.hasil;
  const ada = cplData.filter(x => x.skor != null);
  const ipk = m.ipk != null ? m.ipk.toFixed(2).replace('.', ',') : '–';
  const head = `<div class="kop"><img src="${esc(pr.logoPem)}" alt=""><div class="t"><b>${esc(K.institusi)}</b><span style="font-style:italic">${esc(K.institusiEn)}</span><br><span>${esc(K.badan)}</span><br><span style="font-style:italic">${esc(K.badanEn)}</span></div><img src="${esc(pr.logoEsdm)}" alt=""></div>`;
  const noDok = kode ? `No. ${esc(kode)}` : 'PRATINJAU · belum diterbitkan / not yet issued';
  const dom = h.domain.filter(x => x.n > 0);
  const p1 = `<div class="pg">${head}
  <h1>SURAT KETERANGAN PENDAMPING IJAZAH<em>Diploma Supplement</em></h1><div class="no">${noDok}</div>
  <h2>1. INFORMASI TENTANG IDENTITAS PEMEGANG SKPI <em>/ Information Identifying the Holder of the Diploma Supplement</em></h2>
  <table class="k">${baris('Nama lengkap', 'Full name', m.nama)}${baris('Tempat dan tanggal lahir', 'Place and date of birth', m.ttl, m.ttlEn)}${baris('Nomor Induk Mahasiswa', 'Student ID number', m.nim)}
  ${baris('Tanggal kelulusan (yudisium)', 'Date of graduation', m.yudisium, m.yudisiumEn)}${baris('Nomor ijazah', 'Diploma number', cat.noIjazah)}${baris('Gelar yang diberikan', 'Title awarded', `${K.gelar}`, K.gelarEn)}</table>
  <h2>2. INFORMASI TENTANG IDENTITAS PENYELENGGARA PROGRAM <em>/ Information Identifying the Awarding Institution</em></h2>
  <table class="k">${baris('Perguruan tinggi', 'Institution', K.institusi, K.institusiEn)}${baris('Program studi', 'Study program', pr.prodiNama || m.prodi, m.prodiEn)}${baris('Status akreditasi program studi', 'Accreditation status', K.akred)}
  ${baris('Kementerian / badan pembina', 'Ministry / governing body', K.badan, K.badanEn)}</table>
  <h2>3. INFORMASI TENTANG KUALIFIKASI DAN HASIL YANG DICAPAI <em>/ Information on the Qualification and Results Obtained</em></h2>
  <table class="k">${baris('Jenis dan jenjang pendidikan', 'Type and level of education', K.jenjang, 'Vocational education · ' + (m.programEn || 'Bachelor of Applied Science'))}${baris('Level kualifikasi KKNI', 'Indonesian Qualifications Framework (KKNI) level', `Level ${K.kkni}`)}
  ${baris('Lama studi resmi', 'Official length of study', K.lamaStudi)}${baris('Bahasa pengantar', 'Language of instruction', 'Indonesia', 'Indonesian')}${baris('Beban studi', 'Total credits', m.totalSks != null ? `${m.totalSks} SKS` : '', m.totalSks != null ? `${m.totalSks} credits` : '')}
  ${baris('Indeks Prestasi Kumulatif', 'Grade Point Average (scale 0–4)', ipk)}${baris('Predikat kelulusan', 'Graduation predicate', m.predikatLulus, m.predikatLulusEn)}${baris('Kurikulum', 'Curriculum', K.kurikulum)}</table>
  <h2>4. RINGKASAN KOMPETENSI PER RANAH <em>/ Competence Summary by Domain</em></h2>
  <table class="dom"><thead><tr><th>Ranah / Domain</th><th class="n">Skor / Score (0–4)</th><th>Predikat / Predicate</th></tr></thead><tbody>
  ${dom.map(x => `<tr><td>${bi(x.id, x.en)}</td><td class="n"><b>${n2(x.skor)}</b></td><td>${chip(x.pred)}</td></tr>`).join('')}</tbody></table>
  <div class="rad">${radarSvg(cplData, rata, K)}</div>
  <div class="note">${esc('Skor 0–4 mengikuti skala nilai SIAKAD. Predikat: > ' + n2(K.sangat) + ' Sangat Kompeten; ' + n2(K.kompeten) + '–' + n2(K.sangat) + ' Kompeten; < ' + n2(K.kompeten) + ' Cukup Kompeten.')}<em class="en">${esc('Scores use the SIAKAD 0–4 scale. Predicate: > ' + n2(K.sangat) + ' Highly Competent; ' + n2(K.kompeten) + '–' + n2(K.sangat) + ' Competent; < ' + n2(K.kompeten) + ' Sufficiently Competent.')}</em></div>
  </div>`;
  const p2 = `<div class="pg"><div class="hd"><span>SKPI · ${esc(m.nim)} · ${esc(kode || 'pratinjau')}</span><span>Halaman / Page 2</span></div>
  <h2>5. CAPAIAN PEMBELAJARAN LULUSAN <em>/ Graduate Learning Outcomes</em></h2>
  <table><thead><tr><th>Kode</th><th>Capaian pembelajaran / Learning outcome</th><th class="n">Skor</th><th>Predikat</th></tr></thead><tbody>
  ${cplData.map(x => `<tr><td><b>${esc(x.cpl.kode)}</b><em class="en">${esc((DOMAIN.find(q => q[0] === x.cpl.ranah) || [])[2] || '')}</em></td><td>${esc(x.cpl.teks)}<em class="en">${esc(x.cpl.tekEn || '(terjemahan belum tersedia / translation not yet available)')}</em></td><td class="n"><b>${n2(x.skor)}</b></td><td>${chip(x.pred)}</td></tr>`).join('')}</tbody></table>
  <h2>6. KEGIATAN TAMBAHAN NON-AKADEMIK <em>/ Additional Non-Academic Activities</em></h2>
  <div class="two"><div class="box">${esc(cat.nonAkademik || '–')}</div><div class="box en" style="display:block">${esc(cat.nonAkademikEn || '–')}</div></div>
  <h2>7. PENGESAHAN <em>/ Authorization</em></h2>
  <div class="ttd"><div>${qr ? `<div class="qr">${qr}</div><div class="qrt">Pindai untuk memeriksa keaslian / Scan to verify<br>${esc(url || '')}</div>` : '<div class="qrt">Belum diterbitkan — QR keaslian akan muncul setelah SKPI diterbitkan.<br>Not yet issued — the authenticity QR appears after issuance.</div>'}</div>
  <div class="c">${esc(K.tempat)}, ${esc(tglId(d))}<em class="en">${esc(K.tempat)}, ${esc(tglEn(d))}</em>${esc(K.jabatan)}<em class="en">${esc(K.jabatanEn)}</em><div class="sp"></div><b>${esc(K.penandatangan || '………………………………')}</b>${K.nip ? `<br>NIP ${esc(K.nip)}` : ''}</div></div>
  <div class="note" style="margin-top:8px">${esc('Metode: skor CPL = rata-rata angka mutu mata kuliah pembentuk CPL, dibobot dengan SKS dan porsi CPMK mata kuliah itu terhadap CPL (' + K.kurikulum + '). Rincian mata kuliah pada lampiran.')}<em class="en">${esc('Method: each learning-outcome score is the average grade point of the courses that build it, weighted by credits and by the share of the course’s learning objectives mapped to that outcome (' + K.kurikulum + '). Course details are in the appendix.')}</em></div>
  </div>`;
  const lamp = `<div class="pg lamp"><div class="hd"><span>LAMPIRAN · RINCIAN MATA KULIAH PEMBENTUK KOMPETENSI / Appendix · Courses contributing to each outcome</span><span>${esc(m.nim)}</span></div>
  ${ada.map(x => `<h3>${esc(x.cpl.kode)} — ${n2(x.skor)} <span class="tag ${x.pred[2]}">${esc(x.pred[0])} / ${esc(x.pred[1])}</span></h3><table><thead><tr><th>Mata kuliah / Course</th><th class="n">SKS</th><th class="n">Nilai</th><th class="n">Mutu</th><th class="n">Porsi</th></tr></thead><tbody>
  ${x.rincian.map(r => `<tr><td>${esc(r.mk.nama)}<em class="en">${esc(namaEnMk(r.mk, r.t) || '–')}</em></td><td class="n">${r.t.sks}</td><td class="n">${esc(r.t.nilai)}</td><td class="n">${n2(r.t.am)}</td><td class="n">${Math.round(r.porsi * 100)}%</td></tr>`).join('')}</tbody></table>`).join('')}</div>`;
  return p1 + p2 + lamp;
}

/** Dokumen lengkap (satu atau banyak mahasiswa) sebagai teks HTML. */
export function bangunSkpi({ prodiNama, K, siswa, logoPem, logoEsdm, draf }) {
  const ctxDoc = { prodiNama, logoPem, logoEsdm };
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>SKPI ${siswa.length === 1 ? esc(siswa[0].m.nim) : 'angkatan'}</title><style>${CSS}</style></head><body>${draf ? '<div class="wm">DRAF · terjemahan belum diverifikasi<br><span style="font-size:22pt">DRAFT · translations not yet verified</span></div>' : ''}${siswa.map(s => halaman(s, K, ctxDoc)).join('')}</body></html>`;
}

export { predikat };
