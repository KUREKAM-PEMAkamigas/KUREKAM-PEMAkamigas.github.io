/* KUREKAM · Penyusunan: Visi & PL, CPL, BoK & BK, Mata Kuliah */
import { S, ctx, can, save, remove, rerender, esc, icon, uid, openDrawer, addLog } from '../app.js';
import { KELOMPOK, KAT_IABEE, GRUP } from '../config.js';
import { chart, AX, PAL } from '../charts.js';
import { detect } from '../bloom.js';
import { badge } from '../bloom.js';
import { byProdi, struktur, param, jpOf, sksOf, grupOf, warnaGrup, fmt, durasi, kelasOf } from '../rules.js';
import { head, formDrawer, ro, kpi, animateCounts, opts, short, prodiName, bar } from './ui.js';

const RANAH = { S: 'Sikap', P: 'Pengetahuan', KU: 'Keterampilan umum', KK: 'Keterampilan khusus' };
const RANAH_HINT = { S: 'A', P: 'C', KU: 'C', KK: 'C' };
const liveBloom = (hintKey) => (v) => { const b = detect(v, hintKey()); return b ? `${badge(b.code)} kata kerja "<b>${esc(b.verb)}</b>"${b.kabur ? ' <span class="st near">kurang terukur</span>' : ''}` : (v.trim() ? badge(null) : 'Awali dengan kata kerja operasional, misalnya "menerapkan", "menganalisis", "merancang".'); };

/* ================= Visi & Profil Lulusan ================= */
export function visiView(el) {
  const p = S.prodi.find(x => x.id === ctx.prodi); const ed = can('susun');
  const pl = byProdi(S.pl, ctx.prodi);
  el.innerHTML = `
  <div class="grid g-21">
    <div class="card">${head('Visi keilmuan program studi', esc(p.nama), 'flag', '#10b981', ed ? `<button class="btn sm" id="ed-visi">${icon('edit')} Ubah</button>` : ro())}
      <div class="quote"><small>Visi PEM Akamigas</small><p>${esc(p.visi)}</p></div>
      <div class="quote q2"><small>Visi keilmuan prodi</small><p>${esc(p.visiKeilmuan || 'Belum diisi')}</p></div>
      ${p.misi ? `<div class="quote q3"><small>Misi prodi</small><p>${esc(p.misi)}</p></div>` : ''}
      <p class="note">Acuan LAM Teknik butir 1–3: visi keilmuan menunjukkan kekhasan bidang dan menjadi dasar profil lulusan serta CPL.</p>
    </div>
    <div class="card">${head('Catatan Unit SPM', 'Masukan untuk perbaikan', 'eye', '#f0616d', can('catatanSpm') ? `<button class="btn sm" id="add-cat">${icon('plus')} Catatan</button>` : '')}
      ${(p.catatanSpm || []).length ? p.catatanSpm.map(c => `<div class="note-card"><b>${esc(c.oleh)}</b> <span class="muted small">${esc(c.t)}</span><div>${esc(c.isi)}</div></div>`).join('') : '<div class="empty small">Belum ada catatan.</div>'}
    </div>
  </div>
  <div class="card" style="margin-top:18px">${head('Profil lulusan', 'Peran lulusan 3–5 tahun setelah lulus, dirumuskan bersama pemangku kepentingan', 'user', '#14b8a6', ed ? `<button class="btn pri sm" id="add-pl">${icon('plus')} Profil lulusan</button>` : '')}
    <div class="grid g3">${pl.map(x => { const n = S.cpl.filter(c => (c.pl || []).includes(x.id)).length; return `<div class="pl-card tilt ${ed ? 'click' : ''}" data-id="${x.id}"><span class="tag" style="--c:#14b8a6">${x.kode}</span><b>${esc(x.nama)}</b><p>${esc(x.teks)}</p><div class="small muted">${n} CPL mendukung</div></div>`; }).join('') || '<div class="empty">Belum ada profil lulusan.</div>'}</div>
  </div>`;
  const plForm = (x = {}) => formDrawer({ title: x.id ? 'Ubah profil lulusan' : 'Profil lulusan baru', sub: prodiName(), obj: x,
    fields: [{ k: 'kode', label: 'Kode', ph: 'PL4' }, { k: 'nama', label: 'Nama peran', ph: 'Mis. Supervisor Operasi' }, { k: 'teks', label: 'Deskripsi', type: 'textarea' }],
    onSave: async (o) => { if (!o.kode || !o.nama) return 'Kode dan nama wajib diisi.'; o.id = o.id || `${ctx.prodi}-${o.kode}-${Date.now().toString(36)}`; o.prodi = ctx.prodi; await save('pl', o, `Simpan profil lulusan ${o.kode} (${ctx.prodi})`); rerender(); },
    onDelete: x.id ? async () => { await remove('pl', x.id, `Hapus profil lulusan ${x.kode}`); rerender(); } : null });
  if (ed) {
    el.querySelector('#add-pl').onclick = () => plForm();
    el.querySelectorAll('.pl-card').forEach(c => c.onclick = () => plForm(S.pl.find(x => x.id === c.dataset.id)));
    el.querySelector('#ed-visi').onclick = () => formDrawer({ title: 'Visi keilmuan dan misi', sub: p.nama, obj: p,
      fields: [{ k: 'visiKeilmuan', label: 'Visi keilmuan prodi', type: 'textarea', rows: 4 }, { k: 'misi', label: 'Misi prodi', type: 'textarea', rows: 4 }],
      onSave: async (o) => { await save('prodi', o, `Ubah visi keilmuan ${p.id}`); rerender(); } });
  }
  const ac = el.querySelector('#add-cat'); if (ac) ac.onclick = () => formDrawer({ title: 'Catatan Unit SPM', sub: p.nama, fields: [{ k: 'isi', label: 'Catatan', type: 'textarea' }],
    onSave: async (o) => { p.catatanSpm = (p.catatanSpm || []).concat([{ t: new Date().toISOString().slice(0, 10), oleh: 'Unit SPM', isi: o.isi }]); await save('prodi', p, `Catatan SPM untuk ${p.id}`); rerender(); } });
  animateCounts(el);
}

/* ================= CPL ================= */
export function cplView(el) {
  const ed = can('susun');
  const cpl = byProdi(S.cpl, ctx.prodi), pl = byProdi(S.pl, ctx.prodi), mk = byProdi(S.mk, ctx.prodi);
  const dukung = cpl.map(c => mk.filter(m => (m.cpl || []).includes(c.id)).length);
  el.innerHTML = `
  <div class="grid g-21">
    <div class="card">${head('Capaian Pembelajaran Lulusan', prodiName() + ' · level dideteksi otomatis dari kata kerja operasional (Taksonomi Bloom)', 'target', '#0ea5e9', ed ? `<button class="btn pri sm" id="add">${icon('plus')} CPL</button>` : ro())}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Ranah</th><th>Rumusan</th><th>Bloom</th><th>PL</th><th>IABEE</th><th class="num">MK</th></tr></thead><tbody>
      ${cpl.map((c, i) => { const b = detect(c.teks, RANAH_HINT[c.ranah]); return `<tr class="${ed ? 'click' : ''}" data-id="${c.id}"><td><b>${c.kode}</b></td><td><span class="tag" style="--c:${PAL[['S', 'P', 'KU', 'KK'].indexOf(c.ranah)]}">${RANAH[c.ranah] || c.ranah}</span></td><td>${esc(c.teks)}</td><td>${b ? badge(b.code) : badge(null)}${b && b.kabur ? '<div class="small" style="color:#b45309">kurang terukur</div>' : ''}</td><td class="small">${(c.pl || []).map(id => (S.pl.find(x => x.id === id) || {}).kode).join(', ') || '<span class="st bad">–</span>'}</td><td class="small">${esc(c.iabee || '')}</td><td class="num"><b style="color:${dukung[i] >= 3 ? '#047857' : dukung[i] ? '#b45309' : '#b42335'}">${dukung[i]}</b></td></tr>`; }).join('')}
      </tbody></table></div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="card">${head('Dukungan MK per CPL', 'Minimal 3 MK agar capaian bisa diukur bertahap', 'pulse', '#10b981')}<div class="chart" id="c-d"></div></div>
      <div class="card">${head('Sebaran ranah dan level', '', 'sim', '#8b5cf6')}<div class="chart sm" id="c-r"></div></div>
    </div>
  </div>`;
  chart(el.querySelector('#c-d'), { grid: { left: 8, right: 20, top: 10, bottom: 8, containLabel: true }, tooltip: {}, xAxis: { type: 'value', ...AX }, yAxis: { type: 'category', data: cpl.map(c => c.kode), inverse: true, ...AX },
    series: [{ type: 'bar', data: dukung.map(v => ({ value: v, itemStyle: { color: v >= 3 ? '#10b981' : v ? '#f5a524' : '#f0616d', borderRadius: [0, 8, 8, 0] } })), barWidth: 14, label: { show: true, position: 'right', fontSize: 11 }, markLine: { symbol: 'none', data: [{ xAxis: 3 }], lineStyle: { color: '#8b5cf6', type: 'dashed' }, label: { formatter: 'min 3' } } }] });
  const lv = {}; cpl.forEach(c => { const b = detect(c.teks, RANAH_HINT[c.ranah]); const k = b ? b.code : '?'; lv[k] = (lv[k] || 0) + 1; });
  chart(el.querySelector('#c-r'), { tooltip: {}, series: [{ type: 'sunburst', radius: ['18%', '92%'], data: Object.keys(RANAH).map((r, i) => ({ name: r, itemStyle: { color: PAL[i] }, children: Object.entries(cpl.filter(c => c.ranah === r).reduce((a, c) => { const b = detect(c.teks, RANAH_HINT[c.ranah]); const k = b ? b.code : '?'; a[k] = (a[k] || 0) + 1; return a; }, {})).map(([k, v]) => ({ name: k, value: v })) })), label: { fontSize: 10 } }] });
  const form = (x = { ranah: 'KK', pl: [] }) => formDrawer({ title: x.id ? 'Ubah CPL ' + x.kode : 'CPL baru', sub: prodiName(), obj: x,
    fields: [{ k: 'kode', label: 'Kode', ph: 'KK5' }, { k: 'ranah', label: 'Ranah', type: 'select', opts: Object.entries(RANAH).map(([v, t]) => ({ v, t })) },
      { k: 'teks', label: 'Rumusan CPL', type: 'textarea', rows: 3, live: liveBloom(() => RANAH_HINT[document.querySelector('[name=ranah]').value]) },
      { k: 'pl', label: 'Mendukung profil lulusan', type: 'multi', opts: opts(pl) }, { k: 'iabee', label: 'Butir student outcome IABEE (huruf)', ph: 'mis. a, c' }],
    onSave: async (o) => { if (!o.kode || !o.teks) return 'Kode dan rumusan wajib diisi.'; if (!o.id && cpl.some(c => c.kode === o.kode)) return 'Kode sudah dipakai.'; o.id = o.id || `${ctx.prodi}-${o.kode}`; o.prodi = ctx.prodi; await save('cpl', o, `Simpan CPL ${o.kode} (${ctx.prodi})`); rerender(); },
    onDelete: x.id ? async () => { await remove('cpl', x.id, `Hapus CPL ${x.kode}`); rerender(); } : null });
  if (ed) { el.querySelector('#add').onclick = () => form(); el.querySelectorAll('tr.click').forEach(r => r.onclick = () => form({ ...S.cpl.find(c => c.id === r.dataset.id) })); }
}

/* ================= BoK & Bahan Kajian ================= */
export function bkView(el) {
  const ed = can('susun');
  const bok = byProdi(S.bok, ctx.prodi), bk = byProdi(S.bk, ctx.prodi), mk = byProdi(S.mk, ctx.prodi), cpl = byProdi(S.cpl, ctx.prodi);
  const sksBk = (b) => mk.filter(m => (m.bk || []).includes(b.id)).reduce((a, m) => a + sksOf(m) / Math.max(1, (m.bk || []).length), 0);
  el.innerHTML = `
  <div class="grid g-12">
    <div class="card">${head('Body of Knowledge', 'Peta keilmuan bidang (asosiasi, SKKNI, IABEE)', 'globe', '#6366f1', ed ? `<button class="btn sm" id="add-bok">${icon('plus')} BoK</button>` : '')}
      ${bok.map((b, i) => `<div class="bok ${ed ? 'click' : ''}" data-id="${b.id}" style="--c:${PAL[i % PAL.length]}"><b>${b.kode} · ${esc(b.nama)}</b><div class="small muted">${esc(b.sumber || '')}</div><div class="small">${bk.filter(x => x.bok === b.id).length} bahan kajian · ${fmt(bk.filter(x => x.bok === b.id).reduce((a, x) => a + sksBk(x), 0), 1)} SKS</div></div>`).join('')}
    </div>
    <div class="card">${head('Peta BoK → bahan kajian', 'Luas kotak = SKS mata kuliah yang memuat bahan kajian tersebut', 'grid4', '#8b5cf6')}<div class="chart lg" id="c-tree"></div></div>
  </div>
  <div class="card" style="margin-top:18px">${head('Bahan kajian', 'Bagian BoK yang dipilih prodi beserta kedalamannya', 'layers', '#8b5cf6', ed ? `<button class="btn pri sm" id="add-bk">${icon('plus')} Bahan kajian</button>` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Bahan kajian</th><th>BoK</th><th>Kedalaman</th><th>CPL</th><th class="num">MK</th><th class="num">SKS</th></tr></thead><tbody>
    ${bk.map(b => `<tr class="${ed ? 'click' : ''}" data-id="${b.id}"><td><b>${b.kode}</b></td><td>${esc(b.nama)}</td><td class="small">${(bok.find(x => x.id === b.bok) || {}).kode || '–'}</td><td>${badge(b.kedalaman)}</td><td class="small">${(b.cpl || []).map(id => (S.cpl.find(c => c.id === id) || {}).kode).join(', ')}</td><td class="num">${mk.filter(m => (m.bk || []).includes(b.id)).length}</td><td class="num">${fmt(sksBk(b), 1)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  chart(el.querySelector('#c-tree'), { tooltip: { formatter: (q) => `${q.name}: ${fmt(q.value, 1)} SKS` }, series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, width: '100%', height: '100%', label: { fontSize: 11 }, upperLabel: { show: true, height: 22, fontWeight: 700, color: '#fff' }, itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2, borderRadius: 8 },
    data: bok.map((b, i) => ({ name: b.nama, itemStyle: { color: PAL[i % PAL.length] }, children: bk.filter(x => x.bok === b.id).map(x => ({ name: x.nama, value: Math.max(0.5, sksBk(x)) })) })).filter(x => x.children.length) }] });
  const lvOpts = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'P1', 'P2', 'P3', 'P4', 'P5', 'A1', 'A2', 'A3', 'A4', 'A5'].map(v => ({ v, t: v }));
  const bkForm = (x = { cpl: [] }) => formDrawer({ title: x.id ? 'Ubah bahan kajian ' + x.kode : 'Bahan kajian baru', sub: prodiName(), obj: x,
    fields: [{ k: 'kode', label: 'Kode', ph: 'BK13' }, { k: 'nama', label: 'Nama bahan kajian' }, { k: 'bok', label: 'Bagian dari BoK', type: 'select', opts: bok.map(b => ({ v: b.id, t: `${b.kode} · ${b.nama}` })) },
      { k: 'kedalaman', label: 'Kedalaman (level Bloom)', type: 'select', opts: lvOpts }, { k: 'cpl', label: 'CPL yang dibentuk', type: 'multi', opts: opts(cpl, c => c.teks) }],
    onSave: async (o) => { if (!o.kode || !o.nama) return 'Kode dan nama wajib diisi.'; o.id = o.id || `${ctx.prodi}-${o.kode}-${Date.now().toString(36)}`; o.prodi = ctx.prodi; await save('bk', o, `Simpan BK ${o.kode} (${ctx.prodi})`); rerender(); },
    onDelete: x.id ? async () => { await remove('bk', x.id, `Hapus BK ${x.kode}`); rerender(); } : null });
  const bokForm = (x = {}) => formDrawer({ title: x.id ? 'Ubah BoK' : 'BoK baru', sub: prodiName(), obj: x, fields: [{ k: 'kode', label: 'Kode', ph: 'BOK7' }, { k: 'nama', label: 'Nama' }, { k: 'sumber', label: 'Sumber rujukan' }],
    onSave: async (o) => { if (!o.kode || !o.nama) return 'Kode dan nama wajib diisi.'; o.id = o.id || `${ctx.prodi}-${o.kode}`; o.prodi = ctx.prodi; await save('bok', o, `Simpan BoK ${o.kode}`); rerender(); },
    onDelete: x.id ? async () => { await remove('bok', x.id, `Hapus BoK ${x.kode}`); rerender(); } : null });
  if (ed) {
    el.querySelector('#add-bk').onclick = () => bkForm(); el.querySelector('#add-bok').onclick = () => bokForm();
    el.querySelectorAll('tr.click').forEach(r => r.onclick = () => bkForm({ ...S.bk.find(c => c.id === r.dataset.id) }));
    el.querySelectorAll('.bok.click').forEach(r => r.onclick = () => bokForm({ ...S.bok.find(c => c.id === r.dataset.id) }));
  }
}

/* ================= Mata Kuliah ================= */
export function mkView(el) {
  const ed = can('susun'), P = param(S);
  const all = byProdi(S.mk, ctx.prodi), R = struktur(S, ctx.prodi);
  const st = { smt: '', kel: '', q: '' };
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Total SKS', R.total, `target minimal ${P.totalSksMin}`, R.total >= P.totalSksMin ? '#10b981' : '#f0616d', 'book')}
    ${kpi('Jumlah MK', R.n, `batas ${P.mkProdiMin}–${P.mkProdiMax}`, R.n >= P.mkProdiMin && R.n <= P.mkProdiMax ? '#10b981' : '#f5a524', 'grid4')}
    ${kpi('Muatan spesifik', R.spesifik, `MBE + MKK, minimal ${P.muatanSpesifikMin}% (IABEE)`, '#8b5cf6', 'medal', 1)}
    ${kpi('Porsi jam praktik', R.praktikJam, `semester 1–6, LAM ${P.praktikMin}–${P.praktikMax}%`, '#f5a524', 'bolt', 1)}
  </div>
  <div class="card" style="margin-top:18px">${head('Daftar mata kuliah', prodiName() + ' · JP dihitung otomatis: teori 60 menit, praktik MKU/MBS 120 menit, MBE/MKK 170 menit per SKS', 'book', '#14b8a6',
    `<button class="btn sm" id="calc">${icon('sim')} Kalkulator SKS</button>${ed ? `<button class="btn pri sm" id="add">${icon('plus')} Mata kuliah</button>` : ro()}`)}
    <div class="filters"><div class="search">${icon('search')}<input class="inp" id="q" placeholder="Cari nama atau kode MK"></div>
      <select class="inp" id="f-smt"><option value="">Semua semester</option>${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<option value="${s}">Semester ${s}</option>`).join('')}</select>
      <select class="inp" id="f-kel"><option value="">Semua kelompok</option>${Object.keys(GRUP).map(g => `<option value="${g}">${g}</option>`).join('')}</select></div>
    <div class="tbl-wrap" style="max-height:620px"><table class="tbl" id="t-mk"></table></div>
  </div>`;
  const draw = () => {
    const rows = all.filter(m => (!st.smt || m.smt === +st.smt) && (!st.kel || grupOf(m) === st.kel) && (!st.q || (m.nama + m.kode).toLowerCase().includes(st.q))).sort((a, b) => a.smt - b.smt || a.kode.localeCompare(b.kode));
    el.querySelector('#t-mk').innerHTML = `<thead><tr><th>Smt</th><th>Kode</th><th>Mata kuliah</th><th>Kelompok</th><th class="num">T</th><th class="num">P</th><th class="num">SKS</th><th class="num">JP/mg</th><th>Kategori IABEE</th><th>CPL</th><th>BK</th><th>Prasyarat</th></tr></thead><tbody>
    ${rows.map(m => `<tr class="${m.kunci ? 'locked' : ''} ${ed && (!m.kunci || ['admin', 'developer'].includes(ctx.role)) ? 'click' : ''}" data-id="${m.id}"><td class="num">${m.smt}</td><td class="small">${esc(m.kode)}</td><td><b>${esc(m.nama)}</b>${m.kunci ? `<div><span class="tag" style="--c:#64748b">${icon('info')} ${esc(m.kunci)}</span></div>` : ''}</td><td><span class="tag" style="--c:${warnaGrup(grupOf(m))}">${esc(m.kel)}</span></td><td class="num">${m.T}</td><td class="num">${m.P}</td><td class="num"><b>${sksOf(m)}</b></td><td class="num">${fmt(jpOf(m, P), 2)}</td><td class="small">${esc(m.kat)}</td><td class="small">${(m.cpl || []).map(id => (S.cpl.find(c => c.id === id) || {}).kode).join(', ') || '<span class="st bad">–</span>'}</td><td class="small">${(m.bk || []).map(id => (S.bk.find(c => c.id === id) || {}).kode).join(', ')}</td><td class="small">${(m.prasyarat || []).map(id => short((S.mk.find(c => c.id === id) || {}).nama, 24)).join(', ')}</td></tr>`).join('')}
    <tr class="sum"><td colspan="4">Jumlah (${rows.length} MK)</td><td class="num">${rows.reduce((a, m) => a + m.T, 0)}</td><td class="num">${rows.reduce((a, m) => a + m.P, 0)}</td><td class="num">${rows.reduce((a, m) => a + sksOf(m), 0)}</td><td class="num">${fmt(rows.reduce((a, m) => a + jpOf(m, P), 0), 1)}</td><td colspan="4"></td></tr></tbody>`;
    if (ed) el.querySelectorAll('#t-mk tr.click').forEach(r => r.onclick = () => form({ ...S.mk.find(m => m.id === r.dataset.id) }));
  };
  el.querySelector('#q').oninput = e => { st.q = e.target.value.toLowerCase(); draw(); };
  el.querySelector('#f-smt').onchange = e => { st.smt = e.target.value; draw(); };
  el.querySelector('#f-kel').onchange = e => { st.kel = e.target.value; draw(); };
  draw(); animateCounts(el);
  const form = (x = { smt: 1, kel: 'MKK - kompetensi penciri', kat: 'Muatan spesifik', T: 2, P: 0, cpl: [], bk: [], prasyarat: [], lokasi: 'Kampus' }) => formDrawer({ title: x.id ? 'Ubah mata kuliah' : 'Mata kuliah baru', sub: prodiName(), obj: x, wide: true,
    fields: [{ k: 'kode', label: 'Kode MK' }, { k: 'nama', label: 'Nama mata kuliah' }, { k: 'smt', label: 'Semester', type: 'select', opts: [1, 2, 3, 4, 5, 6, 7, 8].map(v => ({ v, t: 'Semester ' + v })) },
      { k: 'kel', label: 'Kelompok', type: 'select', opts: KELOMPOK.map(k => ({ v: k.id, t: k.id })) }, { k: 'kat', label: 'Kategori IABEE', type: 'select', opts: KAT_IABEE.map(v => ({ v, t: v })) },
      { k: 'lokasi', label: 'Lokasi', type: 'select', opts: ['Kampus', 'Laboratorium', 'Industri'].map(v => ({ v, t: v })) },
      { k: 'T', label: 'SKS teori', type: 'number', live: () => jpHelp() }, { k: 'P', label: 'SKS praktik (1–3)', type: 'number', live: () => jpHelp() },
      { k: 'bk', label: 'Bahan kajian', type: 'multi', opts: opts(byProdi(S.bk, ctx.prodi)) }, { k: 'cpl', label: 'CPL yang didukung', type: 'multi', opts: opts(byProdi(S.cpl, ctx.prodi), c => c.teks) },
      { k: 'prasyarat', label: 'Prasyarat', type: 'multi', opts: all.filter(m => m.id !== x.id && m.smt < +x.smt + 1).map(m => ({ v: m.id, t: short(m.nama, 30) })) }],
    onSave: async (o) => {
      o.smt = +o.smt; o.T = +o.T || 0; o.P = +o.P || 0;
      if (!o.nama) return 'Nama MK wajib diisi.'; if (o.P > 3 && !/magang|tugas akhir/i.test(o.kel)) return 'MK praktik dibatasi 1–3 SKS (Buku Pedoman).';
      o.id = o.id || uid(ctx.prodi + '-MK'); o.prodi = ctx.prodi; o.kode = o.kode || `${ctx.prodi}${o.smt}${String(all.length + 1).padStart(2, '0')}`;
      await save('mk', o, `Simpan MK ${o.nama} (${ctx.prodi})`); rerender();
    },
    onDelete: x.id ? async () => { await remove('mk', x.id, `Hapus MK ${x.nama}`); rerender(); } : null });
  const jpHelp = () => { const d = document.querySelector('#fd'); if (!d) return ''; const T = +d.querySelector('[name=T]').value || 0, Pp = +d.querySelector('[name=P]').value || 0; const kel = d.querySelector('[name=kel]').value; const m = { T, P: Pp, kel }; return `SKS ${T + Pp} · JP ${fmt(jpOf(m, P), 2)} jam/minggu · praktik ${durasi(m, P)} menit per SKS`; };
  if (ed) el.querySelector('#add').onclick = () => form();
  el.querySelector('#calc').onclick = () => kalkulator();
}

/** Kalkulator konversi kebutuhan belajar menjadi SKS (Panduan Teknis Bab III). */
export function kalkulator() {
  const P = param(S);
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('sim')}</span><div><h3>Kalkulator kebutuhan SKS</h3><div class="sub">1 SKS = 45 jam kegiatan per semester (Permendiktisaintek 39/2025), 16 pertemuan termasuk UTS dan UAS</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="form-grid">
    <div class="field"><label>Kelompok MK</label><select class="inp" id="k-g">${Object.keys(GRUP).map(g => `<option>${g}</option>`).join('')}</select></div>
    <div class="field"><label>Jam tatap muka teori per minggu</label><input class="inp" id="k-t" type="number" value="2" step="0.5"></div>
    <div class="field"><label>Jam praktik per minggu (di lab)</label><input class="inp" id="k-p" type="number" value="2.83" step="0.01"></div>
    <div class="field"><label>Jumlah kelas paralel</label><input class="inp" id="k-k" type="number" value="3"></div>
  </div><div class="formula" id="k-out" style="margin-top:14px"></div>`, (d) => {
    const up = () => {
      const g = d.querySelector('#k-g').value, jt = +d.querySelector('#k-t').value || 0, jpk = +d.querySelector('#k-p').value || 0, k = +d.querySelector('#k-k').value || 1, dur = P.durasiPraktik[g];
      const T = jt * 60 / P.menitTeori, Pp = jpk * 60 / dur, Tb = Math.round(T), Pb = Math.round(Pp);
      d.querySelector('#k-out').innerHTML = `SKS teori &nbsp;= ${fmt(jt, 2)} jam × 60 / ${P.menitTeori} = <b>${fmt(T, 2)}</b> → dibulatkan <b>${Tb}</b><br>SKS praktik = ${fmt(jpk, 2)} jam × 60 / ${dur} menit = <b>${fmt(Pp, 2)}</b> → dibulatkan <b>${Pb}</b><br>Bobot MK &nbsp;&nbsp;= <b>${Tb}T + ${Pb}P = ${Tb + Pb} SKS</b>, JP riil ${fmt(Tb * P.menitTeori / 60 + Pb * dur / 60, 2)} jam/minggu<br>Beban dosen untuk ${k} kelas: SKS kurikulum <b>${(Tb + Pb) * k}</b>, SKS riil <b>${fmt((Tb * P.menitTeori / 60 + Pb * dur / 60) * k, 2)}</b>`;
    };
    d.querySelectorAll('input,select').forEach(i => i.oninput = up); up();
  });
}
export { kelasOf, bar, addLog };
