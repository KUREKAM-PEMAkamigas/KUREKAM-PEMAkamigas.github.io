/* KUREKAM · Beban perkuliahan prodi dan kapasitas jadwal (JP)
   Migrasi gagasan "Dashboard Evaluasi Beban Perkuliahan": simulasi durasi 1 SKS, kapasitas JP mingguan,
   insight otomatis, peringkat, profil relatif, tren, lanskap beban, komposisi kelompok, dan rincian MK.
   Dua sumber data: Rancangan 2027 (koleksi mk) dan kurikulum berjalan (koleksi lama). */
import { S, ctx, saveCtx, can, save, remove, rerender, esc, icon, toast, uid, saveSettings, addLog } from '../app.js';
import { chart, AX } from '../charts.js';
import { param, fmt, grupOf, kelasOf, warnaGrup } from '../rules.js';
import { GRUP } from '../config.js';
import { head, kpi, animateCounts, prodiTag, formDrawer, short, loadXLSX, unduh, tanya } from './ui.js';

const GK = ['MKU', 'MBS', 'MBE', 'MKK'];
const NON_KELAS = /magang|praktik kerja lapangan|\bpkl\b|tugas akhir|skripsi/i;
export const JP_DEFAULT = { dur: 60, perDay: 8, days: 5 };
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const PRESET = {
  pedoman: ['Pedoman 2027 (60 / 120 / 170)', { t: 60, p: { MKU: 120, MBS: 120, MBE: 170, MKK: 170 } }],
  lama: ['Aturan lama (45 / 135 / 180)', { t: 45, p: { MKU: 135, MBS: 135, MBE: 135, MKK: 180 } }],
  t50: ['Teori 50 menit', { t: 50, p: { MKU: 120, MBS: 120, MBE: 170, MKK: 170 } }],
  p180: ['Praktik seragam 180', { t: 60, p: { MKU: 180, MBS: 180, MBE: 180, MKK: 180 } }]
};

let src = 'baru', scope = 6, sim = null, jpSes = null, dSmt = 0, dGrp = '';

const resmi = () => { const P = param(S); return { t: P.menitTeori, p: { ...P.durasiPraktik } }; };
const jpCfg = () => jpSes || { ...JP_DEFAULT, ...(S.settings.jp || {}) };
const sameSim = (a, b) => a.t === b.t && GK.every(g => a.p[g] === b.p[g]);

/** Daftar MK ternormalisasi untuk satu sumber. */
export function daftar(sumber) {
  if (sumber === 'lama') return S.lama.map(m => ({ id: m.id, prodi: m.prodi, smt: +m.smt, kode: m.kode, nama: m.nama, g: m.g, T: +m.T || 0, P: +m.P || 0, nk: (m.kelas || []).length || 1, kls: (m.kelas || []).join(', '), raw: m }));
  return S.mk.map(m => ({ id: m.id, prodi: m.prodi, smt: +m.smt, kode: m.kode, nama: m.nama, g: grupOf(m), T: +m.T || 0, P: +m.P || 0, nk: kelasOf(S, m.prodi, m.smt) || 1, kls: (kelasOf(S, m.prodi, m.smt) || 1) + ' kelas', raw: m }));
}
const menit = (m, c) => m.T * c.t + m.P * (c.p[m.g] || 170);

/** Agregat satu prodi untuk satu sumber dan satu aturan waktu. */
export function hitung(list, pid, c, maxSmt = 8) {
  const o = { n: 0, T: 0, P: 0, menit: 0, mT: 0, mP: 0, ajar: 0, g: { MKU: 0, MBS: 0, MBE: 0, MKK: 0 }, ng: { MKU: 0, MBS: 0, MBE: 0, MKK: 0 }, smt: {} };
  for (let s = 1; s <= 8; s++) o.smt[s] = { n: 0, T: 0, P: 0, menit: 0, ajar: 0 };
  list.forEach(m => {
    if (m.prodi !== pid || !o.smt[m.smt]) return;
    const mm = menit(m, c), x = o.smt[m.smt];
    x.n++; x.T += m.T; x.P += m.P; x.menit += mm; x.ajar += NON_KELAS.test(m.nama) ? 0 : mm * m.nk;
    if (m.smt > maxSmt) return;
    o.n++; o.T += m.T; o.P += m.P; o.menit += mm; o.mT += m.T * c.t; o.mP += mm - m.T * c.t; o.g[m.g] = (o.g[m.g] || 0) + mm; o.ng[m.g] = (o.ng[m.g] || 0) + 1;
    o.ajar += NON_KELAS.test(m.nama) ? 0 : mm * m.nk;
  });
  o.jam = o.menit / 60; o.sks = o.T + o.P;
  o.rasio = o.sks ? o.P / o.sks * 100 : 0;
  o.rasioJam = o.menit ? o.mP / o.menit * 100 : 0;
  const act = Object.keys(o.smt).map(Number).filter(s => s <= maxSmt && o.smt[s].n);
  o.rata = act.length ? o.menit / 60 / act.length : 0;
  o.puncak = act.reduce((b, s) => (o.smt[s].menit > (b ? o.smt[b].menit : -1) ? s : b), 0);
  return o;
}

const pct = (v, cap) => { const p = cap ? v / cap * 100 : 0; return `<span class="st ${p > 100 ? 'bad' : p > 85 ? 'near' : 'ok'}">${fmt(v, v % 1 ? 1 : 0)}</span>`; };
const namaSrc = (s) => s === 'lama' ? 'Kurikulum berjalan' : `Rancangan ${S.settings.tahunKurikulum || 2027}`;

export default function bebanProdiView(el) {
  if (!sim) sim = resmi();
  const c = sim, J = jpCfg(), cap = J.perDay * J.days, off = resmi();
  const ed = can('induk') || ctx.role === 'admin';
  const simOn = !sameSim(c, off);
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span><b>Beban perkuliahan prodi.</b> Halaman ini memindahkan gagasan Dashboard Evaluasi Beban Perkuliahan ke KUREKAM: durasi 1 SKS dapat disimulasikan, kebutuhan jam dibandingkan dengan kapasitas jadwal mingguan, dan kurikulum berjalan (${fmt(S.lama.length)} MK hasil migrasi) dapat disandingkan dengan rancangan baru.</span></div>
  <div class="filters">
    <div class="seg"><button data-src="baru" class="${src === 'baru' ? 'on' : ''}">${namaSrc('baru')}</button><button data-src="lama" class="${src === 'lama' ? 'on' : ''}">Kurikulum berjalan</button><button data-src="banding" class="${src === 'banding' ? 'on' : ''}">Bandingkan keduanya</button></div>
    <div class="seg"><button data-sc="6" class="${scope === 6 ? 'on' : ''}">Semester 1–6 (di kampus)</button><button data-sc="8" class="${scope === 8 ? 'on' : ''}">Semester 1–8</button></div>
    <div class="sp"></div>
    <button class="btn sm" id="xl">${icon('download')} Unduh Excel</button>
  </div>
  <details class="card sim" ${simOn ? 'open' : ''}>
    <summary>${head('Simulasi waktu pertemuan dan kapasitas jadwal', `1 SKS teori ${c.t} menit · praktik ${GK.map(g => `${g} ${c.p[g]}`).join(' · ')} menit · kapasitas ${cap} JP per minggu ${simOn ? '· <b style="color:#f0616d">simulasi aktif, bukan parameter resmi</b>' : '· sama dengan parameter resmi'}`, 'gear', '#6366f1', `<span class="tag" style="--c:#6366f1">Buka atau tutup</span>`)}</summary>
    <div class="sim-grid">
      <div class="simc" style="--c:#0ea5e9"><b>Teori</b><label>1 SKS teori<div class="unit"><input class="inp" type="number" id="s-t" min="30" max="120" step="5" value="${c.t}"><span>menit</span></div></label><small>berlaku untuk semua kelompok</small></div>
      ${GK.map(g => `<div class="simc" style="--c:${warnaGrup(g)}"><b>${g}</b><label>1 SKS praktik<div class="unit"><input class="inp" type="number" id="s-${g}" min="45" max="300" step="5" value="${c.p[g]}"><span>menit</span></div></label><small>${GRUP[g].nama}</small></div>`).join('')}
    </div>
    <div class="sim-grid" style="margin-top:10px">
      <div class="simc" style="--c:#f5a524"><b>Jam pertemuan</b><label>Durasi 1 JP<div class="unit"><input class="inp" type="number" id="j-dur" min="30" max="120" step="5" value="${J.dur}"><span>menit</span></div></label></div>
      <div class="simc" style="--c:#f5a524"><b>Hari kuliah</b><label>JP per hari<div class="unit"><input class="inp" type="number" id="j-day" min="1" max="14" value="${J.perDay}"><span>JP</span></div></label></div>
      <div class="simc" style="--c:#f5a524"><b>Minggu kuliah</b><label>Hari per minggu<div class="unit"><input class="inp" type="number" id="j-days" min="1" max="7" value="${J.days}"><span>hari</span></div></label></div>
      <div class="simc wide" style="--c:#64748b"><b>Kapasitas</b><div class="small">${J.perDay} JP × ${J.days} hari (${HARI[0]}–${HARI[J.days - 1]}) = <b>${cap} JP</b> atau ${fmt(cap * J.dur / 60, 1)} jam per minggu untuk satu angkatan. Sel berwarna kuning berarti di atas 85% kapasitas, merah berarti melebihi kapasitas.</div></div>
    </div>
    <div class="filters" style="margin:12px 0 0">
      <button class="btn pri sm" id="s-go">${icon('play')} Hitung ulang</button>
      ${Object.entries(PRESET).map(([k, v]) => `<button class="btn sm" data-pr="${k}">${v[0]}</button>`).join('')}
      <button class="btn sm ghost" id="s-rst">${icon('loop')} Kembali ke parameter resmi</button>
      <div class="sp"></div>
      ${ed ? `<button class="btn sm" id="j-save">${icon('check')} Simpan kapasitas JP</button>` : ''}
      ${ctx.role === 'admin' && simOn ? `<button class="btn sm danger" id="s-resmi">${icon('flag')} Jadikan parameter resmi</button>` : ''}
    </div>
  </details>
  <div id="bp-body" style="margin-top:18px"></div>`;

  el.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { src = b.dataset.src; rerender(); });
  el.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { scope = +b.dataset.sc; rerender(); });
  const baca = () => {
    const n = (id, d, lo, hi) => { const v = parseFloat(el.querySelector(id).value); return Number.isFinite(v) && v >= lo && v <= hi ? v : d; };
    sim = { t: n('#s-t', c.t, 20, 240), p: Object.fromEntries(GK.map(g => [g, n('#s-' + g, c.p[g], 20, 600)])) };
    jpSes = { dur: n('#j-dur', J.dur, 5, 240), perDay: n('#j-day', J.perDay, 1, 20), days: Math.round(n('#j-days', J.days, 1, 7)) };
  };
  el.querySelector('#s-go').onclick = () => { baca(); rerender(); };
  el.querySelectorAll('.sim input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { baca(); rerender(); } }));
  el.querySelectorAll('[data-pr]').forEach(b => b.onclick = () => { sim = JSON.parse(JSON.stringify(PRESET[b.dataset.pr][1])); toast('Simulasi: ' + PRESET[b.dataset.pr][0]); rerender(); });
  el.querySelector('#s-rst').onclick = () => { sim = resmi(); jpSes = null; rerender(); };
  const js = el.querySelector('#j-save'); if (js) js.onclick = async () => { baca(); S.settings.jp = { ...jpSes }; jpSes = null; await saveSettings(); await addLog(`Ubah kapasitas JP: ${S.settings.jp.perDay} JP × ${S.settings.jp.days} hari, 1 JP ${S.settings.jp.dur} menit`); toast('Kapasitas JP tersimpan'); rerender(); };
  const sr = el.querySelector('#s-resmi'); if (sr) sr.onclick = async () => {
    if (!(await tanya('Durasi simulasi akan menjadi parameter resmi KUREKAM dan mengubah perhitungan JP serta beban dosen di semua halaman. Lanjutkan?'))) return;
    S.settings.param = { ...(S.settings.param || {}), menitTeori: sim.t, durasiPraktik: { ...sim.p } }; await saveSettings(); await addLog(`Ubah parameter resmi: teori ${sim.t} menit, praktik ${GK.map(g => g + ' ' + sim.p[g]).join(', ')}`); sim = null; toast('Parameter resmi diperbarui'); rerender();
  };
  el.querySelector('#xl').onclick = () => ekspor(c, J);

  const body = el.querySelector('#bp-body');
  if (src === 'banding') banding(body, c, J); else tunggal(body, src, c, J, ed);
  animateCounts(el);
}

/* ================= satu sumber ================= */
function tunggal(el, sumber, c, J, ed) {
  const list = daftar(sumber), cap = J.perDay * J.days, toJP = (mnt) => mnt / J.dur;
  const PR = S.prodi, A = Object.fromEntries(PR.map(p => [p.id, hitung(list, p.id, c, scope)]));
  if (!list.length) { el.innerHTML = `<div class="card empty">Belum ada data ${namaSrc(sumber).toLowerCase()}. Impor lewat Data Induk & Pengaturan.</div>`; return; }
  const sems = Array.from({ length: scope }, (_, i) => i + 1);
  const tot = (f) => PR.reduce((a, p) => a + f(A[p.id]), 0);
  const gm = tot(a => a.menit), gT = tot(a => a.T), gP = tot(a => a.P);
  const urut = PR.slice().sort((a, b) => A[b.id].menit - A[a.id].menit);
  const top = urut[0], low = urut[urut.length - 1];
  const prak = PR.slice().sort((a, b) => A[b.id].rasioJam - A[a.id].rasioJam)[0];
  const rataS = sems.map(s => { const v = PR.map(p => A[p.id].smt[s]).filter(x => x.n); return v.length ? v.reduce((a, x) => a + x.menit, 0) / v.length / 60 : 0; });
  const sibuk = rataS.indexOf(Math.max(...rataS)) + 1;
  const gap = A[low.id].jam ? (A[top.id].jam - A[low.id].jam) / A[low.id].jam * 100 : 0;
  const unit = []; PR.forEach(p => sems.forEach(s => { const x = A[p.id].smt[s]; if (x.n) unit.push({ p: p.id, s, jp: toJP(x.menit) }); }));
  const over = unit.filter(u => u.jp > cap), padat = unit.slice().sort((a, b) => b.jp - a.jp)[0] || { p: '-', s: 0, jp: 0 };
  const ajar = tot(a => a.ajar) / 60, P0 = param(S);
  const dsn = sumber === 'baru' ? S.dosen.length : null;
  if (!PR.some(p => p.id === ctx.prodi)) ctx.prodi = PR[0].id;
  const cur = ctx.prodi, det = list.filter(m => m.prodi === cur && (!dSmt || m.smt === dSmt) && (!dGrp || m.g === dGrp)).sort((a, b) => a.smt - b.smt || a.kode.localeCompare(b.kode));

  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Total jam tatap muka', gm / 60, `${fmt(toJP(gm))} JP · akumulasi per minggu, semester 1–${scope}`, '#0ea5e9', 'pulse', 1)}
    ${kpi('Jumlah mata kuliah', tot(a => a.n), `teori ${fmt(gT)} SKS · praktik ${fmt(gP)} SKS`, '#10b981', 'book')}
    ${kpi('Tingkat terpadat', padat.jp, `${padat.p} semester ${padat.s} · kapasitas ${cap} JP`, padat.jp > cap ? '#f0616d' : '#f5a524', 'alert', 1)}
    ${kpi('Porsi jam praktik', gm ? tot(a => a.mP) / gm * 100 : 0, `${fmt(gT + gP ? gP / (gT + gP) * 100 : 0, 1)}% bila dihitung dari SKS`, '#8b5cf6', 'bolt', 1)}
  </div>

  <div class="ins" style="margin-top:18px">
    <div class="icard" style="--c:#f0616d"><small>Beban tertinggi</small><b>${top.id} paling padat</b><span>${esc(top.nama)} memikul ${fmt(A[top.id].jam, 1)} jam, tertinggi dari ${PR.length} prodi.</span></div>
    <div class="icard" style="--c:#10b981"><small>Porsi praktik</small><b>${prak.id} paling banyak praktik</b><span>${fmt(A[prak.id].rasioJam, 1)}% jam belajarnya berupa praktik (${fmt(A[prak.id].rasio, 1)}% dari SKS).</span></div>
    <div class="icard" style="--c:#f5a524"><small>Semester tersibuk</small><b>Semester ${sibuk} rata-rata terberat</b><span>Rata-rata ${fmt(rataS[sibuk - 1], 1)} jam per minggu per prodi.</span></div>
    <div class="icard" style="--c:#8b5cf6"><small>Kesenjangan</small><b>Selisih ${fmt(gap, 1)}% antarprodi</b><span>Beban ${top.id} berada ${fmt(gap, 1)}% di atas ${low.id}. ${gap > 10 ? 'Keseragaman antarprodi belum tercapai.' : 'Beban antarprodi sudah relatif seragam.'}</span></div>
    <div class="icard" style="--c:${over.length ? '#f0616d' : '#10b981'}"><small>Kapasitas jadwal</small><b>${over.length ? over.length + ' tingkat melebihi kapasitas' : 'Semua tingkat muat'}</b><span>${over.length ? over.slice(0, 4).map(o => `${o.p} smt ${o.s}`).join(', ') + (over.length > 4 ? ', dan lainnya' : '') + ` butuh lebih dari ${cap} JP per minggu.` : `Tingkat terpadat memakai ${fmt(padat.jp / cap * 100)}% dari ${cap} JP.`}</span></div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Peringkat beban prodi', 'Diurutkan dari total jam tertinggi', 'medal', '#f5a524')}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Prodi</th><th class="num">MK</th><th class="num">SKS T/P</th><th class="num">JP</th><th>Beban</th><th class="num">Jam</th><th class="num">Rata-rata/smt</th></tr></thead><tbody>
      ${urut.map((p, i) => `<tr class="click" data-pp="${p.id}"><td><b>${i + 1}</b></td><td>${prodiTag(p.id)} <span class="small">${esc(p.nama)}</span></td><td class="num">${A[p.id].n}</td><td class="num">${A[p.id].T}/${A[p.id].P}</td><td class="num">${fmt(toJP(A[p.id].menit))}</td><td><div class="bar" style="width:110px"><i style="width:${A[p.id].menit / (A[top.id].menit || 1) * 100}%;--c:${p.c}"></i></div></td><td class="num"><b>${fmt(A[p.id].jam, 1)}</b></td><td class="num">${fmt(A[p.id].rata, 1)}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card">${head('Profil relatif prodi', 'Indeks 100 = nilai tertinggi antarprodi pada tiap sumbu', 'target', '#8b5cf6')}<div class="chart" id="c-rad"></div></div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Tren beban per semester', `Jam tatap muka per minggu, garis putus-putus = kapasitas ${fmt(cap * J.dur / 60, 1)} jam`, 'pulse', '#0ea5e9')}<div class="chart lg" id="c-tr"></div></div>
    <div class="card">${head('Lanskap beban 3D', 'JP per minggu, prodi × semester. Seret untuk memutar.', 'layers', '#6366f1')}<div class="chart lg" id="c-3d"></div></div>
  </div>

  <div class="card" style="margin-top:18px">${head('Kebutuhan JP dan kapasitas jadwal', `1 JP = ${J.dur} menit · ${J.perDay} JP per hari · ${HARI[0]}–${HARI[J.days - 1]} = ${cap} JP per minggu`, 'calendar', '#f5a524')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th>${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<th class="num">Smt ${s}</th>`).join('')}<th class="num">Total JP</th><th>Tingkat terpadat</th><th class="num">Terpakai</th></tr></thead><tbody>
    ${urut.map(p => { const a = hitung(list, p.id, c, 8); let w = 0, ws = 0; sems.forEach(s => { const v = toJP(a.smt[s].menit); if (v > w) { w = v; ws = s; } });
      return `<tr><td>${prodiTag(p.id)}</td>${[1, 2, 3, 4, 5, 6, 7, 8].map(s => { const x = a.smt[s]; return `<td class="num">${!x.n ? '<span class="muted">–</span>' : s > 6 ? `<span class="muted" title="Magang dan tugas akhir, tidak dijadwalkan di kelas">${fmt(toJP(x.menit), 0)}</span>` : pct(Math.round(toJP(x.menit) * 10) / 10, cap)}</td>`; }).join('')}<td class="num"><b>${fmt(toJP(A[p.id].menit))}</b></td><td>Semester ${ws} <div class="bar" style="width:90px;display:inline-block;vertical-align:middle"><i style="width:${Math.min(100, w / cap * 100)}%;--c:${w > cap ? '#f0616d' : p.c}"></i></div></td><td class="num"><span class="st ${w > cap ? 'bad' : w > cap * .85 ? 'near' : 'ok'}">${fmt(w / cap * 100, 1)}%</span></td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="note">Semester 7 dan 8 berisi magang dan tugas akhir sehingga ditampilkan abu-abu dan tidak dibandingkan dengan kapasitas kelas. ${sumber === 'baru' ? `Rentang JP wajib per semester menurut pedoman tetap diperiksa di menu Pemeriksa Kurikulum.` : ''}</p></div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Komposisi kelompok mata kuliah', 'Jam tatap muka ditumpuk per kelompok', 'layers', '#10b981')}<div class="chart" id="c-st"></div></div>
    <div class="card">${head('Kebutuhan jam mengajar', 'Jam tatap muka × kelas paralel per minggu, tanpa magang dan tugas akhir', 'user', '#f0616d')}
      <div class="chart sm" id="c-aj"></div>
      <div class="formula" style="margin-top:10px">Σ jam mengajar semester 1–${scope} = <b>${fmt(ajar)}</b> jam per minggu<br>Rata-rata per paruh tahun ≈ <b>${fmt(ajar / 2)}</b> jam ÷ batas ${P0.bebanRiilMax} SKS riil = <b>${fmt(Math.ceil(ajar / 2 / P0.bebanRiilMax))}</b> dosen setara penuh${dsn ? ` (tersedia ${dsn} dosen)` : ''}</div></div>
  </div>

  <div class="card" style="margin-top:18px">${head(`Rincian mata kuliah ${cur}`, `${namaSrc(sumber)} · ${det.length} MK tampil${ed && sumber === 'lama' ? ' · klik baris untuk mengubah' : ''}`, 'book', '#14b8a6', ed && sumber === 'lama' ? `<button class="btn sm pri" id="l-add">${icon('plus')} Tambah MK</button>` : '')}
    <div class="filters">
      <div class="seg">${PR.map(p => `<button data-dp="${p.id}" class="${p.id === cur ? 'on' : ''}">${p.id}</button>`).join('')}</div>
      <select class="inp" id="d-smt"><option value="0">Semua semester</option>${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<option value="${s}" ${s === dSmt ? 'selected' : ''}>Semester ${s}</option>`).join('')}</select>
      <select class="inp" id="d-grp"><option value="">Semua kelompok</option>${GK.map(g => `<option ${g === dGrp ? 'selected' : ''}>${g}</option>`).join('')}</select>
    </div>
    <div class="grid g4 mini" style="margin-bottom:12px">${GK.map(g => `<div style="border-left:4px solid ${warnaGrup(g)};padding-left:10px"><small>${g} · ${A[cur].ng[g]} MK</small><b>${fmt(A[cur].g[g] / 60, 1)} jam</b></div>`).join('')}</div>
    <div class="tbl-wrap" style="max-height:560px"><table class="tbl"><thead><tr><th class="num">Smt</th><th>Kode</th><th>Mata kuliah</th><th>Kelompok</th><th class="num">T</th><th class="num">P</th><th class="num">Menit/minggu</th><th class="num">JP</th><th>Kelas paralel</th><th class="num">Jam mengajar</th></tr></thead><tbody>
    ${det.map(m => `<tr class="${ed && sumber === 'lama' ? 'click' : ''}" data-l="${m.id}"><td class="num">${m.smt}</td><td class="small">${esc(m.kode)}</td><td><b>${esc(short(m.nama, 60))}</b></td><td><span class="tag" style="--c:${warnaGrup(m.g)}">${m.g}</span></td><td class="num">${m.T}</td><td class="num">${m.P}</td><td class="num">${fmt(menit(m, c))}</td><td class="num">${fmt(menit(m, c) / J.dur, 1)}</td><td class="small">${esc(m.kls)}</td><td class="num">${NON_KELAS.test(m.nama) ? '<span class="muted">–</span>' : fmt(menit(m, c) * m.nk / 60, 1)}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">Tidak ada mata kuliah pada saringan ini.</td></tr>'}
    </tbody></table></div></div>`;

  el.querySelectorAll('[data-pp],[data-dp]').forEach(b => b.onclick = () => { ctx.prodi = b.dataset.pp || b.dataset.dp; saveCtx(); rerender(); });
  el.querySelector('#d-smt').onchange = e => { dSmt = +e.target.value; rerender(); };
  el.querySelector('#d-grp').onchange = e => { dGrp = e.target.value; rerender(); };
  if (ed && sumber === 'lama') {
    el.querySelectorAll('tr[data-l]').forEach(tr => tr.onclick = () => formLama({ ...S.lama.find(x => x.id === tr.dataset.l) }));
    el.querySelector('#l-add').onclick = () => formLama({ prodi: cur, smt: dSmt || 1, g: 'MKK', T: 1, P: 1, kelas: ['A', 'B'] });
  }

  /* grafik */
  const ax = [['Total jam', a => a.jam], ['Jumlah MK', a => a.n], ['SKS teori', a => a.T], ['SKS praktik', a => a.P], ['Porsi praktik', a => a.rasioJam], ['Puncak semester', a => a.puncak ? a.smt[a.puncak].menit : 0]];
  const mx = ax.map(([, f]) => Math.max(...PR.map(p => f(A[p.id])), 1));
  chart(el.querySelector('#c-rad'), { tooltip: {}, legend: { bottom: 0, textStyle: { fontSize: 11 } }, color: PR.map(p => p.c),
    radar: { indicator: ax.map(([n]) => ({ name: n, max: 100 })), radius: '62%', center: ['50%', '46%'], splitArea: { areaStyle: { color: ['rgba(14,165,233,.03)', 'rgba(14,165,233,.07)'] } }, axisName: { color: '#6b778c', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(24,35,58,.1)' } }, axisLine: { lineStyle: { color: 'rgba(24,35,58,.1)' } } },
    series: [{ type: 'radar', symbolSize: 5, areaStyle: { opacity: .12 }, lineStyle: { width: 2 }, data: PR.map(p => ({ name: p.id, value: ax.map(([, f], i) => +(f(A[p.id]) / mx[i] * 100).toFixed(1)) })) }] });
  chart(el.querySelector('#c-tr'), { tooltip: { trigger: 'axis' }, legend: { top: 0 }, color: PR.map(p => p.c), grid: { left: 8, right: 24, top: 34, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: sems.map(s => 'Smt ' + s), boundaryGap: false, ...AX }, yAxis: { type: 'value', name: 'jam/minggu', nameTextStyle: { fontSize: 10, color: '#6b778c' }, ...AX },
    series: PR.map((p, i) => ({ name: p.id, type: 'line', smooth: .3, symbolSize: 7, lineStyle: { width: 3 }, data: sems.map(s => +(A[p.id].smt[s].menit / 60).toFixed(1)), markLine: i ? undefined : { symbol: 'none', silent: true, data: [{ yAxis: +(cap * J.dur / 60).toFixed(1) }], lineStyle: { color: '#f0616d', type: 'dashed' }, label: { formatter: 'kapasitas', fontSize: 10 } } })) });
  const d3 = []; let zmax = cap; PR.forEach((p, i) => sems.forEach((s, j) => { const v = +toJP(A[p.id].smt[s].menit).toFixed(1); zmax = Math.max(zmax, v); d3.push({ value: [j, i, v], itemStyle: { color: v > cap ? '#f0616d' : p.c, opacity: .92 } }); }));
  if (window.echarts && el.querySelector('#c-3d')) {
    try {
      chart(el.querySelector('#c-3d'), { tooltip: { formatter: q => `${PR[q.value[1]].id} · semester ${q.value[0] + 1}<br><b>${q.value[2]} JP</b> dari ${cap} JP` },
        xAxis3D: { type: 'category', data: sems.map(s => 'S' + s), name: '', axisLabel: { fontSize: 10 } }, yAxis3D: { type: 'category', data: PR.map(p => p.id), name: '', axisLabel: { fontSize: 10 } }, zAxis3D: { type: 'value', name: 'JP', max: Math.ceil(zmax / 5) * 5, axisLabel: { fontSize: 10 } },
        grid3D: { boxWidth: 150, boxDepth: 80, boxHeight: 70, viewControl: { alpha: 22, beta: 32, distance: 235, autoRotate: true, autoRotateSpeed: 5, rotateSensitivity: 1.4 }, light: { main: { intensity: 1.15, shadow: true }, ambient: { intensity: .45 } }, axisLine: { lineStyle: { color: '#94a3b8' } }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.3)' } }, axisPointer: { show: false } },
        series: [{ type: 'bar3D', data: d3, shading: 'lambert', bevelSize: .25, barSize: 9, label: { show: false }, emphasis: { label: { show: false } } }] });
    } catch (e) { el.querySelector('#c-3d').innerHTML = '<div class="empty small">Grafik 3D tidak didukung peramban ini.</div>'; }
  }
  chart(el.querySelector('#c-st'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: PR.map(p => p.id), ...AX }, yAxis: { type: 'value', name: 'jam', nameTextStyle: { fontSize: 10, color: '#6b778c' }, ...AX },
    series: GK.map((g, i) => ({ name: g, type: 'bar', stack: 'a', barWidth: 38, data: PR.map(p => +(A[p.id].g[g] / 60).toFixed(1)), itemStyle: { color: warnaGrup(g), borderRadius: i === GK.length - 1 ? [8, 8, 0, 0] : 0 } })) });
  chart(el.querySelector('#c-aj'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, grid: { left: 8, right: 24, top: 10, bottom: 8, containLabel: true },
    xAxis: { type: 'value', ...AX }, yAxis: { type: 'category', data: PR.map(p => p.id).reverse(), ...AX },
    series: [{ type: 'bar', barWidth: 16, data: PR.slice().reverse().map(p => ({ value: +(A[p.id].ajar / 60).toFixed(0), itemStyle: { color: p.c, borderRadius: [0, 8, 8, 0] } })), label: { show: true, position: 'right', fontSize: 11, formatter: '{c} jam' } }] });
}

function formLama(x) {
  formDrawer({ title: x.id ? 'Ubah MK kurikulum berjalan' : 'Tambah MK kurikulum berjalan', sub: 'Data pembanding, tidak memengaruhi rancangan baru', obj: { ...x, kelasTxt: (x.kelas || []).join(', ') },
    fields: [{ k: 'prodi', label: 'Prodi', type: 'select', opts: S.prodi.map(p => ({ v: p.id, t: p.id })) }, { k: 'smt', label: 'Semester', type: 'number' }, { k: 'kode', label: 'Kode MK' }, { k: 'g', label: 'Kelompok', type: 'select', opts: GK.map(g => ({ v: g, t: g + ' · ' + GRUP[g].nama })) },
      { k: 'nama', label: 'Nama mata kuliah', full: true }, { k: 'T', label: 'SKS teori', type: 'number' }, { k: 'P', label: 'SKS praktik', type: 'number' }, { k: 'kelasTxt', label: 'Kelas paralel (pisahkan dengan koma)', full: true }],
    onSave: async (o) => {
      if (!o.nama) return 'Nama mata kuliah wajib diisi.'; if (!(o.smt >= 1 && o.smt <= 8)) return 'Semester harus 1 sampai 8.';
      o.id = o.id || uid('L'); o.T = +o.T || 0; o.P = +o.P || 0; o.kode = o.kode || '-'; o.kelas = String(o.kelasTxt || '').split(/[,;/\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean); delete o.kelasTxt;
      await save('lama', o, `Ubah MK kurikulum berjalan: ${o.nama}`); rerender();
    },
    onDelete: x.id ? async () => { await remove('lama', x.id, `Hapus MK kurikulum berjalan: ${x.nama}`); rerender(); } : null });
}

/* ================= perbandingan ================= */
function banding(el, c, J) {
  const L = daftar('lama'), B = daftar('baru'), cap = J.perDay * J.days, PR = S.prodi;
  if (!L.length || !B.length) { el.innerHTML = '<div class="card empty">Perbandingan memerlukan data kurikulum berjalan dan rancangan baru.</div>'; return; }
  const a = Object.fromEntries(PR.map(p => [p.id, { l: hitung(L, p.id, c, scope), b: hitung(B, p.id, c, scope) }]));
  const sum = (k, f) => PR.reduce((x, p) => x + f(a[p.id][k]), 0);
  const d = (nw, old, dec = 0, inv = false) => { const v = nw - old; if (Math.abs(v) < 0.05) return '<span class="muted">tetap</span>'; const good = inv ? v > 0 : v < 0; return `<span style="color:${good ? '#10b981' : '#f0616d'};font-weight:700">${v > 0 ? '+' : '−'}${fmt(Math.abs(v), dec)}</span>`; };
  const sems = Array.from({ length: scope }, (_, i) => i + 1);
  const spread = (k) => { const v = PR.map(p => a[p.id][k].jam); return Math.min(...v) ? (Math.max(...v) - Math.min(...v)) / Math.min(...v) * 100 : 0; };
  const peak = (k) => Math.max(...PR.flatMap(p => sems.map(s => a[p.id][k].smt[s].menit / J.dur)));
  if (!PR.some(p => p.id === ctx.prodi)) ctx.prodi = PR[0].id;
  const cur = ctx.prodi;
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Jumlah mata kuliah', sum('b', x => x.n), `kurikulum berjalan ${fmt(sum('l', x => x.n))} MK`, '#10b981', 'book')}
    ${kpi('Total jam tatap muka', sum('b', x => x.jam), `kurikulum berjalan ${fmt(sum('l', x => x.jam), 1)} jam`, '#0ea5e9', 'pulse', 1)}
    ${kpi('Kesenjangan antarprodi', spread('b'), `kurikulum berjalan ${fmt(spread('l'), 1)}%`, '#8b5cf6', 'sim', 1)}
    ${kpi('Puncak JP satu tingkat', peak('b'), `kurikulum berjalan ${fmt(peak('l'), 1)} JP · kapasitas ${cap}`, '#f5a524', 'alert', 1)}
  </div>
  <div class="card" style="margin-top:18px">${head('Kurikulum berjalan dibanding rancangan baru', `Dihitung dengan aturan waktu yang sama (teori ${c.t} menit), semester 1–${scope}. Hijau berarti lebih ringkas, kecuali kolom praktik.`, 'loop', '#6366f1')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th rowspan="2">Prodi</th><th colspan="3" class="num">Jumlah MK</th><th colspan="3" class="num">SKS</th><th colspan="3" class="num">Jam per minggu (akumulasi)</th><th colspan="3" class="num">Porsi jam praktik</th><th colspan="2" class="num">Puncak JP</th></tr>
    <tr>${'<th class="num">Berjalan</th><th class="num">Baru</th><th class="num">Selisih</th>'.repeat(4)}<th class="num">Berjalan</th><th class="num">Baru</th></tr></thead><tbody>
    ${PR.map(p => { const l = a[p.id].l, b = a[p.id].b; const pk = (x) => x.puncak ? x.smt[x.puncak].menit / J.dur : 0;
      return `<tr class="click" data-pp="${p.id}"><td>${prodiTag(p.id)}</td><td class="num">${l.n}</td><td class="num"><b>${b.n}</b></td><td class="num">${d(b.n, l.n)}</td><td class="num">${l.sks}</td><td class="num"><b>${b.sks}</b></td><td class="num">${d(b.sks, l.sks)}</td><td class="num">${fmt(l.jam, 1)}</td><td class="num"><b>${fmt(b.jam, 1)}</b></td><td class="num">${d(b.jam, l.jam, 1)}</td><td class="num">${fmt(l.rasioJam, 1)}%</td><td class="num"><b>${fmt(b.rasioJam, 1)}%</b></td><td class="num">${d(b.rasioJam, l.rasioJam, 1, true)}</td><td class="num">${pct(Math.round(pk(l) * 10) / 10, cap)}</td><td class="num">${pct(Math.round(pk(b) * 10) / 10, cap)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="note">Kurikulum berjalan memakai klasifikasi lama yang dipetakan ke kelompok KUREKAM (MKWU menjadi MKU, MKKK menjadi MKK). Aturan waktu dapat diganti lewat panel simulasi untuk melihat pengaruh durasi lama 45/135/180 menit.</p></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Jumlah MK per prodi', 'Batas pedoman ditandai garis putus-putus', 'book', '#10b981')}<div class="chart" id="c-n"></div></div>
    <div class="card">${head('Total jam per prodi', 'Makin rapat antarprodi makin seragam bebannya', 'pulse', '#0ea5e9')}<div class="chart" id="c-j"></div></div>
  </div>
  <div class="card" style="margin-top:18px">${head(`Beban per semester ${cur}`, 'Jam tatap muka per minggu, kurikulum berjalan dan rancangan baru', 'calendar', '#f5a524', `<div class="seg">${PR.map(p => `<button data-pp="${p.id}" class="${p.id === cur ? 'on' : ''}">${p.id}</button>`).join('')}</div>`)}<div class="chart" id="c-s"></div></div>`;
  el.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => { ctx.prodi = b.dataset.pp; saveCtx(); rerender(); });
  const P0 = param(S), ids = PR.map(p => p.id);
  const duo = (id, f, mark) => chart(el.querySelector(id), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: ids, ...AX }, yAxis: { type: 'value', ...AX },
    series: [{ name: 'Kurikulum berjalan', type: 'bar', barWidth: 20, data: PR.map(p => +f(a[p.id].l).toFixed(1)), itemStyle: { color: '#cbd5e1', borderRadius: [6, 6, 0, 0] } }, { name: 'Rancangan baru', type: 'bar', barWidth: 20, data: PR.map(p => ({ value: +f(a[p.id].b).toFixed(1), itemStyle: { color: p.c, borderRadius: [6, 6, 0, 0] } })), itemStyle: { color: '#10b981' }, markLine: mark }] });
  duo('#c-n', x => x.n, scope === 8 ? { symbol: 'none', silent: true, data: [{ yAxis: P0.mkProdiMin }, { yAxis: P0.mkProdiMax }], lineStyle: { color: '#8b5cf6', type: 'dashed' }, label: { fontSize: 10 } } : undefined);
  duo('#c-j', x => x.jam);
  const pc = PR.find(p => p.id === cur).c;
  chart(el.querySelector('#c-s'), { tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 8, right: 24, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: sems.map(s => 'Smt ' + s), ...AX }, yAxis: { type: 'value', name: 'jam/minggu', nameTextStyle: { fontSize: 10, color: '#6b778c' }, ...AX },
    series: [{ name: 'Kurikulum berjalan', type: 'line', smooth: .3, symbolSize: 7, lineStyle: { width: 3, type: 'dashed', color: '#94a3b8' }, itemStyle: { color: '#94a3b8' }, data: sems.map(s => +(a[cur].l.smt[s].menit / 60).toFixed(1)) },
      { name: 'Rancangan baru', type: 'line', smooth: .3, symbolSize: 8, lineStyle: { width: 4, color: pc }, itemStyle: { color: pc }, areaStyle: { color: pc, opacity: .1 }, data: sems.map(s => +(a[cur].b.smt[s].menit / 60).toFixed(1)), markLine: { symbol: 'none', silent: true, data: [{ yAxis: +(cap * J.dur / 60).toFixed(1) }], lineStyle: { color: '#f0616d', type: 'dashed' }, label: { formatter: 'kapasitas', fontSize: 10 } } }] });
}

/* ================= ekspor Excel ================= */
export const DATA_HEAD = ['Program Studi', 'Semester', 'Kode MK', 'Nama Mata Kuliah', 'Klasifikasi', 'SKS Teori', 'SKS Praktik', 'Kelas Paralel'];
async function ekspor(c, J) {
  let X; try { X = await loadXLSX(); } catch (e) { toast('Pustaka Excel gagal dimuat'); return; }
  const wb = X.utils.book_new(), cap = J.perDay * J.days;
  const add = (name, aoa, cols) => { const ws = X.utils.aoa_to_sheet(aoa); if (cols) ws['!cols'] = cols.map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, name); };
  ['baru', 'lama'].forEach(k => {
    const list = daftar(k); if (!list.length) return;
    const rek = [[`Rekap beban perkuliahan · ${namaSrc(k)}`], [`Teori ${c.t} menit · praktik ${GK.map(g => g + ' ' + c.p[g]).join(', ')} menit · 1 JP ${J.dur} menit · kapasitas ${cap} JP per minggu`], [],
      ['Prodi', 'Jumlah MK', 'SKS teori', 'SKS praktik', 'Total SKS', 'Jam per minggu (akumulasi)', 'Porsi jam praktik %', ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => `JP smt ${s}`), 'Jam mengajar × kelas']];
    S.prodi.forEach(p => { const a = hitung(list, p.id, c, 8); rek.push([p.id, a.n, a.T, a.P, a.sks, +a.jam.toFixed(1), +a.rasioJam.toFixed(1), ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => +(a.smt[s].menit / J.dur).toFixed(1)), +(a.ajar / 60).toFixed(1)]); });
    add(k === 'baru' ? 'Rekap Rancangan' : 'Rekap Berjalan', rek, [10, 10, 10, 10, 10, 24, 18, 9, 9, 9, 9, 9, 9, 9, 9, 20]);
    add(k === 'baru' ? 'DATA Rancangan' : 'DATA', [DATA_HEAD].concat(list.slice().sort((x, y) => x.prodi.localeCompare(y.prodi) || x.smt - y.smt).map(m => [m.prodi, m.smt, m.kode, m.nama, m.g, m.T, m.P, k === 'lama' ? m.kls : m.nk])), [14, 10, 12, 48, 12, 10, 12, 16]);
  });
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `KUREKAM_beban_prodi_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('Excel diunduh. Lembar DATA dapat diperbaiki lalu diimpor ulang di Data Induk.');
}
