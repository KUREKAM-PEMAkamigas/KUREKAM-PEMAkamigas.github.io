/* KUREKAM · CPMK, Sub-CPMK, RPS, dan SAP */
import { S, ctx, can, save, remove, rerender, esc, icon, uid, openDrawer, closeDrawer, toast } from '../app.js';
import { APP } from '../config.js';
import { tombolUnggahRps } from '../rpsimpor.js';
import { detect, badge } from '../bloom.js';
import { INTEG, integrasiOf, byProdi, param, jpOf, sksOf, grupOf, warnaGrup, fmt, rpsOf, rpsLengkap, sapLengkap, durasi } from '../rules.js';
import { tanya, head, formDrawer, ro, prodiName, short, statusTag, bar, pctColor, opts } from './ui.js';

const akad = (m) => !/magang|tugas akhir/i.test(m.kel);
const hintOf = (m) => (+m.P > +m.T ? 'P' : 'C');
const mine = (m) => ctx.role !== 'dosen' || S.tugas.some(t => t.mk === m.id && t.dosen === ctx.dosen);
const live = (m) => (v) => { const b = detect(v, hintOf(m)); return b ? `${badge(b.code)} kata kerja "<b>${esc(b.verb)}</b>"${b.kabur ? ' <span class="st near">tidak terukur, ganti KKO</span>' : ''}` : (v.trim() ? badge(null) : 'Awali dengan kata kerja operasional.'); };
let sel = null, fSmt = '';

function mkList(el, onPick, extra) {
  const list = (ctx.role === 'dosen' ? S.mk.filter(m => mine(m)) : byProdi(S.mk, ctx.prodi)).filter(akad).filter(m => !fSmt || m.smt === +fSmt).sort((a, b) => a.smt - b.smt || a.nama.localeCompare(b.nama));
  if (!sel || !list.some(m => m.id === sel)) sel = list[0] && list[0].id;
  el.innerHTML = `<div class="filters"><select class="inp" id="l-smt"><option value="">Semua semester</option>${[1, 2, 3, 4, 5, 6, 8].map(s => `<option value="${s}" ${+fSmt === s ? 'selected' : ''}>Semester ${s}</option>`).join('')}</select><span class="muted small">${list.length} MK${ctx.role === 'dosen' ? ' yang Anda ampu' : ''}</span></div>
    <div class="mklist">${list.map(m => `<div class="mkrow ${m.id === sel ? 'on' : ''}" data-id="${m.id}" style="--c:${warnaGrup(grupOf(m))}"><div><b>${esc(short(m.nama, 40))}</b><small>S${m.smt} · ${m.prodi} · ${m.T}T + ${m.P}P</small></div>${extra ? extra(m) : ''}</div>`).join('') || '<div class="empty small">Tidak ada MK.</div>'}</div>`;
  el.querySelector('#l-smt').onchange = e => { fSmt = e.target.value; rerender(); };
  el.querySelectorAll('.mkrow').forEach(r => r.onclick = () => { sel = r.dataset.id; onPick(); });
}

/* ================= CPMK & Sub-CPMK ================= */
export function cpmkView(el) {
  el.innerHTML = `<div class="grid g-12"><div class="card" id="left"></div><div id="right"></div></div>`;
  const draw = () => {
    mkList(el.querySelector('#left'), draw, m => { const n = S.cpmk.filter(c => c.mk === m.id).length, s = S.sub.filter(c => c.mk === m.id).length; return `<span class="tag" style="--c:${n ? '#10b981' : '#f0616d'}">${n} CPMK · ${s} Sub</span>`; });
    const m = S.mk.find(x => x.id === sel); const R = el.querySelector('#right');
    if (!m) { R.innerHTML = '<div class="card empty">Pilih mata kuliah.</div>'; return; }
    const edC = can('susun', m), edS = can('rps', { prodi: m.prodi, mk: m.id });
    const cp = S.cpmk.filter(c => c.mk === m.id), cplMk = (m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
    const tot = S.sub.filter(s => s.mk === m.id).reduce((a, s) => a + (+s.bobot || 0), 0);
    R.innerHTML = `<div class="card">${head(esc(m.nama), `Semester ${m.smt} · ${m.T}T + ${m.P}P · CPL dibebankan: ${cplMk.map(c => c.kode).join(', ') || 'belum ada'}`, 'spark', '#0ea5e9', edC ? `<button class="btn pri sm" id="add-c">${icon('plus')} CPMK</button>` : (edS ? '' : ro()))}
      <div class="cplbox">${cplMk.map(c => `<div><span class="tag" style="--c:#0ea5e9">${c.kode}</span> ${esc(c.teks)} ${badge((detect(c.teks, c.ranah === 'S' ? 'A' : 'C') || {}).code)}</div>`).join('')}</div>
      ${cp.map(c => { const b = detect(c.teks, hintOf(m)); const ss = S.sub.filter(s => s.cpmk === c.id); return `<div class="cpmk"><div class="cpmk-h ${edC ? 'click' : ''}" data-c="${c.id}"><span class="orbsm">${c.kode.replace('CPMK', 'C')}</span><div><b>${esc(c.teks)}</b><div class="small muted">Mendukung ${(c.cpl || []).map(id => (S.cpl.find(x => x.id === id) || {}).kode).join(', ') || '–'}</div></div>${b ? badge(b.code) : badge(null)}</div>
        <div class="subs">${ss.map(s => { const sb = detect(s.teks, 'C'); return `<div class="sub ${edS ? 'click' : ''}" data-s="${s.id}"><span class="small muted">${s.kode}</span><span>${esc(s.teks)}</span>${sb ? badge(sb.code) : badge(null)}<b>${fmt(s.bobot)}%</b></div>`; }).join('')}
        ${edS ? `<button class="btn ghost sm" data-adds="${c.id}">${icon('plus')} Sub-CPMK</button>` : ''}</div></div>`; }).join('') || '<div class="empty">Belum ada CPMK.</div>'}
      <div class="filters" style="margin-top:12px"><span class="st ${Math.abs(tot - 100) < 0.5 ? 'ok' : tot ? 'near' : 'na'}">Total bobot Sub-CPMK: ${fmt(tot)}%</span><span class="note">Level Sub-CPMK tidak boleh melampaui CPMK induknya, dan CPMK tidak melampaui CPL.</span></div></div>`;
    const cForm = (x = { cpl: [] }) => formDrawer({ title: x.id ? 'Ubah ' + x.kode : 'CPMK baru', sub: m.nama, obj: x,
      fields: [{ k: 'kode', label: 'Kode', ph: 'CPMK' + (cp.length + 1) }, { k: 'teks', label: 'Rumusan CPMK', type: 'textarea', live: live(m) }, { k: 'cpl', label: 'CPL yang didukung (dari CPL yang dibebankan pada MK)', type: 'multi', opts: opts(cplMk, c => c.teks) }],
      onSave: async (o) => { if (!o.teks) return 'Rumusan wajib diisi.'; o.kode = o.kode || 'CPMK' + (cp.length + 1); o.id = o.id || uid(m.id + '-CPMK'); o.mk = m.id; o.prodi = m.prodi; await save('cpmk', o, `Simpan ${o.kode} ${m.nama}`); draw(); },
      onDelete: x.id ? async () => { for (const s of S.sub.filter(s => s.cpmk === x.id)) await remove('sub', s.id); await remove('cpmk', x.id, `Hapus ${x.kode} ${m.nama}`); draw(); } : null });
    const sForm = (x) => formDrawer({ title: x.id ? 'Ubah ' + x.kode : 'Sub-CPMK baru', sub: m.nama, obj: x,
      fields: [{ k: 'kode', label: 'Kode' }, { k: 'bobot', label: 'Bobot penilaian (%)', type: 'number' }, { k: 'teks', label: 'Rumusan Sub-CPMK (kemampuan akhir tahap belajar)', type: 'textarea', live: live({ T: 1, P: 0 }) }],
      onSave: async (o) => { if (!o.teks) return 'Rumusan wajib diisi.'; o.id = o.id || uid(x.cpmk + '-S'); o.mk = m.id; o.prodi = m.prodi; o.bobot = +o.bobot || 0; await save('sub', o, `Simpan ${o.kode} ${m.nama}`); draw(); },
      onDelete: x.id ? async () => { await remove('sub', x.id, `Hapus ${x.kode}`); draw(); } : null });
    const ac = R.querySelector('#add-c'); if (ac) ac.onclick = () => cForm();
    if (edC) R.querySelectorAll('.cpmk-h.click').forEach(h => h.onclick = () => cForm({ ...S.cpmk.find(c => c.id === h.dataset.c) }));
    if (edS) { R.querySelectorAll('.sub.click').forEach(h => h.onclick = () => sForm({ ...S.sub.find(c => c.id === h.dataset.s) })); R.querySelectorAll('[data-adds]').forEach(b => b.onclick = () => { const c = S.cpmk.find(x => x.id === b.dataset.adds); const n = S.sub.filter(s => s.cpmk === c.id).length + 1; sForm({ cpmk: c.id, kode: `Sub-${c.kode}.${n}`, bobot: 0 }); }); }
  };
  draw();
}

/* ================= RPS & SAP ================= */
function blankRps(m) {
  const ss = S.sub.filter(s => s.mk === m.id); const prak = m.P > m.T;
  return { id: m.id, mk: m.id, prodi: m.prodi, deskripsi: '', pustaka: '', penelitian: '', pkm: '', status: 'draf', pertemuan: Array.from({ length: 16 }, (_, i) => { const w = i + 1; if (w === 8 || w === 16) return { m: w, ujian: w === 8 ? 'UTS' : 'UAS', sub: ss.map(s => s.id), materi: w === 8 ? 'Ujian Tengah Semester' : 'Ujian Akhir Semester', metode: prak ? 'Ujian praktik' : 'Ujian tertulis', asesmen: prak ? 'Unjuk kerja' : 'Tes tertulis', bobot: w === 8 ? 20 : 25, sap: {} }; return { m: w, sub: [], materi: '', metode: '', asesmen: '', bobot: 0, integ: '', integUraian: '', sap: {} }; }) };
}
export function rpsView(el) {
  el.innerHTML = `<div class="filters" id="rps-unggah" style="margin-bottom:12px"></div><div class="grid g-12"><div class="card" id="left"></div><div id="right"></div></div>`;
  const draw = () => {
    mkList(el.querySelector('#left'), draw, m => { const r = rpsOf(S, m.id); return statusTag(r ? r.status : ''); });
    const m = S.mk.find(x => x.id === sel); const R = el.querySelector('#right');
    if (!m) { R.innerHTML = '<div class="card empty">Pilih mata kuliah.</div>'; return; }
    const P = param(S), r = rpsOf(S, m.id), ed = can('rps', { prodi: m.prodi, mk: m.id }) && (!r || r.status !== 'disahkan' || ctx.role === 'prodi' || ctx.role === 'admin');
    const subs = S.sub.filter(s => s.mk === m.id), peng = S.tugas.filter(t => t.mk === m.id).map(t => (S.dosen.find(d => d.id === t.dosen) || {}).nama).filter(Boolean);
    if (!r) { R.innerHTML = `<div class="card">${head(esc(m.nama), 'RPS belum dibuat', 'audit', '#10b981')}<div class="empty">${subs.length ? '' : 'Lengkapi CPMK dan Sub-CPMK terlebih dahulu. '}${ed ? `<br><button class="btn pri" id="mk-rps" style="margin-top:10px">${icon('plus')} Buat RPS 16 pertemuan</button>` : 'Dosen pengampu belum menyusun RPS.'}</div></div>`; const b = R.querySelector('#mk-rps'); if (b) b.onclick = async () => { await save('rps', blankRps(m), `Buat RPS ${m.nama}`); draw(); }; return; }
    const lk = rpsLengkap(r), sp = sapLengkap(r), bobot = r.pertemuan.reduce((a, p) => a + (+p.bobot || 0), 0);
    const cover = subs.filter(s => !r.pertemuan.some(p => (p.sub || []).includes(s.id)));
    R.innerHTML = `<div class="card">${head(esc(m.nama), `Semester ${m.smt} · ${m.T}T + ${m.P}P · ${fmt(jpOf(m, P), 2)} jam/minggu · Pengampu: ${esc(peng.join(', ') || 'belum ditugaskan')}`, 'audit', '#10b981', statusTag(r.status))}
      <div class="grid g4 mini"><div><small>RPS terisi</small><b>${fmt(lk)}%</b>${bar(lk, pctColor(lk))}</div><div><small>SAP terisi</small><b>${fmt(sp)}%</b>${bar(sp, pctColor(sp))}</div><div><small>Total bobot asesmen</small><b style="color:${Math.abs(bobot - 100) < 1 ? '#047857' : '#b45309'}">${fmt(bobot, 1)}%</b></div><div><small>Sub-CPMK belum terjadwal</small><b style="color:${cover.length ? '#b42335' : '#047857'}">${cover.length}</b></div></div>
      <div class="grid g3 mini" style="margin-top:10px"><div><small>Pertemuan terintegrasi penelitian atau PKM</small><b style="color:${integrasiOf(r) >= (P.integrasiMinPertemuan || 2) ? '#047857' : '#b45309'}">${integrasiOf(r)} <span class="small muted">minimal ${P.integrasiMinPertemuan || 2}</span></b></div><div style="grid-column:span 2"><small>Penelitian dan PKM yang diintegrasikan</small><div class="small"><b>Penelitian:</b> ${esc(r.penelitian) || '<span class="muted">belum diisi</span>'}<br><b>PKM:</b> ${esc(r.pkm) || '<span class="muted">belum diisi</span>'}</div></div></div>
      <div class="filters" style="margin-top:12px">
        ${ed ? `<button class="btn sm" id="ed-info">${icon('edit')} Deskripsi & pustaka</button>` : ''}
        <button class="btn sm" id="print">${icon('download')} Cetak RPS</button>
        ${ed && r.status === 'draf' && can('rps', { prodi: m.prodi, mk: m.id }) ? `<button class="btn vio sm" id="aju">${icon('upload')} Ajukan ke kaprodi</button>` : ''}
        ${r.status === 'diajukan' && can('sahkanRps', m) ? `<button class="btn pri sm" id="sah">${icon('check')} Sahkan RPS</button><button class="btn sm danger" id="tolak">Kembalikan ke dosen</button>` : ''}
        ${r.status === 'disahkan' && can('sahkanRps', m) ? `<button class="btn sm danger" id="batal">Batalkan pengesahan</button>` : ''}
        ${!ed ? ro() : ''}</div>
      <div class="tbl-wrap" style="max-height:560px;margin-top:8px"><table class="tbl"><thead><tr><th>Mg</th><th>Sub-CPMK</th><th>Bahan kajian / materi</th><th>Metode & bentuk</th><th>Asesmen</th><th>Penelitian / PKM</th><th class="num">Bobot</th><th>SAP</th></tr></thead><tbody>
      ${r.pertemuan.map((p, i) => `<tr class="${p.ujian ? 'locked' : ''} ${ed ? 'click' : ''}" data-i="${i}"><td class="num"><b>${p.m}</b></td><td class="small">${(p.sub || []).map(id => (S.sub.find(s => s.id === id) || {}).kode).filter(Boolean).map(k => k.replace('Sub-CPMK', 'S')).join(', ')}</td><td>${p.ujian ? `<span class="tag" style="--c:#8b5cf6">${p.ujian}</span> ` : ''}${esc(p.materi) || '<span class="st bad">belum diisi</span>'}</td><td class="small">${esc(p.metode)}</td><td class="small">${esc(p.asesmen)}</td><td class="small">${p.integ ? `<span class="tag" style="--c:${p.integ === 'PKM' ? '#f5a524' : p.integ === 'Penelitian' ? '#8b5cf6' : '#14b8a6'}">${p.integ}</span>` : '<span class="muted">–</span>'}</td><td class="num">${fmt(p.bobot, 1)}%</td><td>${p.ujian ? '–' : (p.sap && p.sap.inti ? '<span class="st ok">ada</span>' : '<span class="st na">kosong</span>')}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    const q = (s) => R.querySelector(s);
    if (ed) {
      q('#ed-info').onclick = () => formDrawer({ title: 'Deskripsi dan pustaka', sub: m.nama, obj: r, fields: [{ k: 'deskripsi', label: 'Deskripsi mata kuliah', type: 'textarea', rows: 4 }, { k: 'bahan', label: 'Bahan kajian', type: 'textarea', rows: 3 }, { k: 'syarat', label: 'Mata kuliah syarat', type: 'textarea', rows: 1 }, { k: 'pustaka', label: 'Pustaka utama dan pendukung', type: 'textarea', rows: 5 }, { k: 'penelitian', label: 'Penelitian dosen yang diintegrasikan (judul, skema, tahun)', type: 'textarea', rows: 2, ph: 'Contoh: Optimasi gas lift sumur tua, Penelitian Terapan 2026' }, { k: 'pkm', label: 'PKM yang diintegrasikan (judul, mitra, tahun)', type: 'textarea', rows: 2, ph: 'Contoh: Pendampingan K3 bengkel mitra, PKM 2026' }], onSave: async (o) => { await save('rps', o, `Ubah deskripsi RPS ${m.nama}`); draw(); } });
      R.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => {
        const i = +tr.dataset.i, p = r.pertemuan[i]; const flat = { ...p, ...Object.fromEntries(Object.entries(p.sap || {}).map(([k, v]) => ['sap_' + k, v])) };
        formDrawer({ title: `Pertemuan ${p.m}${p.ujian ? ' · ' + p.ujian : ''}`, sub: `${m.nama} · durasi tatap muka ${m.T ? m.T * P.menitTeori + ' menit teori' : ''}${m.T && m.P ? ' + ' : ''}${m.P ? m.P * durasi(m, P) + ' menit praktik' : ''}`, obj: flat, wide: true,
          fields: [{ k: 'sub', label: 'Sub-CPMK yang dicapai', type: 'multi', opts: subs.map(s => ({ v: s.id, t: s.kode.replace('Sub-CPMK', 'S'), title: s.teks })) }, { k: 'materi', label: 'Bahan kajian / materi', type: 'textarea', rows: 2 }, { k: 'metode', label: 'Metode dan bentuk pembelajaran', full: true }, { k: 'indikator', label: 'Indikator penilaian', type: 'textarea', rows: 2 }, { k: 'asesmen', label: 'Kriteria dan teknik asesmen', type: 'textarea', rows: 2 }, { k: 'tatap', label: 'Tatap muka (bentuk, metode, alokasi waktu, penugasan)', type: 'textarea', rows: 2 }, { k: 'daring', label: 'Daring (bila ada)', type: 'textarea', rows: 2 }, { k: 'bobot', label: 'Bobot (%)', type: 'number', step: '0.1' },
            ...(p.ujian ? [] : [{ k: 'integ', label: 'Integrasi penelitian dan PKM', type: 'select', opts: INTEG.map(v => ({ v, t: v || 'Tidak ada' })) }, { k: 'integUraian', label: 'Bentuk integrasi (hasil penelitian sebagai bahan ajar, studi kasus, keterlibatan mahasiswa di PKM)', type: 'textarea', rows: 2 }]),
            ...(p.ujian ? [] : [{ k: 'sap_pendahuluan', label: 'SAP · Pendahuluan', type: 'textarea', rows: 2 }, { k: 'sap_inti', label: 'SAP · Kegiatan inti', type: 'textarea', rows: 3 }, { k: 'sap_penutup', label: 'SAP · Penutup', type: 'textarea', rows: 2 }, { k: 'sap_media', label: 'SAP · Media dan alat', full: true }])],
          onSave: async (o) => { const sap = {}; Object.keys(o).filter(k => k.startsWith('sap_')).forEach(k => { sap[k.slice(4)] = o[k]; delete o[k]; }); r.pertemuan[i] = { ...o, sap, m: p.m, ujian: p.ujian }; if (r.status === 'disahkan') r.status = 'draf'; await save('rps', r, `Ubah RPS ${m.nama} pertemuan ${p.m}`); draw(); } });
      });
    }
    const aju = q('#aju'); if (aju) aju.onclick = async () => { if (lk < 99) { toast('Lengkapi 16 pertemuan sebelum mengajukan.'); return; } r.status = 'diajukan'; r.tgl = new Date().toISOString().slice(0, 10); await save('rps', r, `Ajukan RPS ${m.nama}`); draw(); };
    const sah = q('#sah'); if (sah) sah.onclick = async () => { r.status = 'disahkan'; r.oleh = 'Kaprodi ' + m.prodi; r.tgl = new Date().toISOString().slice(0, 10); await save('rps', r, `Sahkan RPS ${m.nama}`); draw(); };
    const bt = q('#batal'); if (bt) bt.onclick = async () => { if (!(await tanya(`Pengesahan RPS ${m.nama} dibatalkan dan statusnya kembali menjadi draf, sehingga dosen dapat merevisi. Lanjutkan?`, 'Batalkan pengesahan'))) return; r.status = 'draf'; r.oleh = ''; r.tgl = ''; await save('rps', r, `Batalkan pengesahan RPS ${m.nama}`); draw(); };
    const tl = q('#tolak'); if (tl) tl.onclick = async () => { r.status = 'draf'; await save('rps', r, `Kembalikan RPS ${m.nama} ke dosen`); draw(); };
    q('#print').onclick = () => cetakRps(m, r);
  };
  tombolUnggahRps(el, draw);
  draw();
}

function cetakRps(m, r) {
  const P = param(S), p = S.prodi.find(x => x.id === m.prodi), cp = S.cpmk.filter(c => c.mk === m.id), subs = S.sub.filter(s => s.mk === m.id);
  const peng = S.tugas.filter(t => t.mk === m.id).map(t => (S.dosen.find(d => d.id === t.dosen) || {}).nama).filter(Boolean);
  openDrawer(`<div class="no-print filters"><button class="btn pri" onclick="window.print()">${icon('download')} Cetak / simpan PDF</button><button class="btn ghost" data-close>Tutup</button></div>
  <div class="report" id="rep"><div class="kop"><img src="assets/img/logo-pem-akamigas.png" alt=""><div class="t"><b>POLITEKNIK ENERGI DAN MINERAL AKAMIGAS</b><span>Program Studi ${esc(p.nama)} · Sarjana Terapan</span></div><img src="assets/img/logo-esdm.png" alt=""></div>
  <h2>RENCANA PEMBELAJARAN SEMESTER</h2><div class="meta">Kurikulum ${APP.tahunKurikulum} · Status: ${r.status}${r.tgl ? ' · ' + r.tgl : ''}</div>
  <table class="tbl"><tbody><tr><th>Mata kuliah</th><td>${esc(m.nama)}</td><th>Kode</th><td>${esc(m.kode)}</td></tr><tr><th>Semester</th><td>${m.smt}</td><th>Bobot</th><td>${m.T} SKS teori + ${m.P} SKS praktik (${fmt(jpOf(m, P), 2)} jam/minggu)</td></tr><tr><th>Kelompok</th><td>${esc(m.kel)}</td><th>Pengampu</th><td>${esc(peng.join(', '))}</td></tr></tbody></table>
  <h4>Deskripsi</h4><p>${esc(r.deskripsi)}</p>
  <h4>CPL yang dibebankan</h4><ul>${(m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(Boolean).map(c => `<li><b>${c.kode}</b> ${esc(c.teks)}</li>`).join('')}</ul>
  <h4>CPMK dan Sub-CPMK</h4><ul>${cp.map(c => `<li><b>${c.kode}</b> ${esc(c.teks)} [${(detect(c.teks, hintOf(m)) || {}).code || '?'}]<ul>${subs.filter(s => s.cpmk === c.id).map(s => `<li>${s.kode}: ${esc(s.teks)} (${s.bobot}%)</li>`).join('')}</ul></li>`).join('')}</ul>
  <h4>Rencana 16 pertemuan</h4><table class="tbl"><thead><tr><th>Mg</th><th>Sub-CPMK</th><th>Materi</th><th>Metode</th><th>Asesmen</th><th>Penelitian/PKM</th><th>Bobot</th></tr></thead><tbody>${r.pertemuan.map(x => `<tr><td>${x.m}</td><td>${(x.sub || []).map(id => ((S.sub.find(s => s.id === id) || {}).kode || '').replace('Sub-CPMK', 'S')).join(', ')}</td><td>${esc(x.materi)}</td><td>${esc(x.metode)}</td><td>${esc(x.asesmen)}</td><td>${esc(x.integ || '')}</td><td>${fmt(x.bobot, 1)}%</td></tr>`).join('')}</tbody></table>
  <h4>Satuan Acara Perkuliahan</h4>${r.pertemuan.filter(x => x.sap && x.sap.inti).map(x => `<p><b>Pertemuan ${x.m}.</b> Pendahuluan: ${esc(x.sap.pendahuluan || '')}. Inti: ${esc(x.sap.inti)}. Penutup: ${esc(x.sap.penutup || '')}. Media: ${esc(x.sap.media || '')}.</p>`).join('') || '<p class="muted">SAP belum diisi.</p>'}
  <h4>Integrasi penelitian dan PKM</h4><p><b>Penelitian:</b> ${esc(r.penelitian) || '–'}<br><b>PKM:</b> ${esc(r.pkm) || '–'}</p>${r.pertemuan.filter(x => x.integ).map(x => `<p>Pertemuan ${x.m} (${x.integ}): ${esc(x.integUraian || '')}</p>`).join('')}
  <h4>Bahan kajian</h4><p>${esc(r.bahan || '')}</p><h4>Pustaka</h4><p style="white-space:pre-line">${esc(r.pustaka)}</p>
  <div class="ttd"><div><span>Dosen pengampu</span><b>${esc(peng[0] || '....................')}</b></div><div><span>Ketua Program Studi</span><b>....................</b></div></div></div>`, null, true);
  void closeDrawer;
}
