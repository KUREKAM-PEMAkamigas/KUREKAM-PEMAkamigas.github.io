/* KUREKAM · CPMK, Sub-CPMK, RPS, dan SAP */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, uid, openDrawer, closeDrawer, toast } from '../app.js';
import { labelKel, labelGrup } from '../kode.js';
import { APP } from '../config.js';
import { tombolUnggahRps } from '../rpsimpor.js';
import { badanRps, berkasWordRps, namaBerkasRps } from '../rpsdok.js';
import { bukaAsistenRps, periksaRps } from './asisten.js';
import { alasanRps, usulanMk } from '../usulan.js';
import { detect, badge } from '../bloom.js';
import { INTEG, integrasiOf, byProdi, param, jpOf, sksOf, grupOf, warnaGrup, fmt, rpsOf, rpsLengkap, sapLengkap, durasi } from '../rules.js';
import { unduh, tanya, head, formDrawer, ro, prodiName, short, statusTag, stTag, bar, pctColor, opts } from './ui.js';
import { rapikanEntri, normRiset, opsiRiset, riset, ringkasIntegrasi, teksRiset, jenisInteg, kecocokan, labelRiset, BENTUK } from '../riset.js';

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
  el.innerHTML = `<div class="grid g-12 split-mk"><div class="card" id="left"></div><div id="right"></div></div>`;
  const draw = () => {
    mkList(el.querySelector('#left'), draw, m => { const n = S.cpmk.filter(c => c.mk === m.id).length, s = S.sub.filter(c => c.mk === m.id).length; return `<span class="tag" style="--c:${n ? '#10b981' : '#f0616d'}">${n} CPMK · ${s} Sub</span>`; });
    const m = S.mk.find(x => x.id === sel); const R = el.querySelector('#right');
    if (!m) { R.innerHTML = '<div class="card empty">Pilih mata kuliah.</div>'; return; }
    const edC = can('susun', m), edS = can('rps', { prodi: m.prodi, mk: m.id });
    const cp = S.cpmk.filter(c => c.mk === m.id), cplMk = (m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
    const tot = S.sub.filter(s => s.mk === m.id).reduce((a, s) => a + (+s.bobot || 0), 0);
    R.innerHTML = `<div class="card">${head(esc(m.nama), `${m.inti ? 'Mata kuliah inti · ' : ''}Semester ${m.smt} · ${m.T}T + ${m.P}P · CPL dibebankan: ${cplMk.map(c => c.kode).join(', ') || 'belum ada'}`, 'spark', '#0ea5e9', edC ? `<button class="btn pri sm" id="add-c">${icon('plus')} CPMK</button>` : (edS ? '' : ro()))}
      <div class="cplbox">${cplMk.map(c => `<div><span class="tag" style="--c:#0ea5e9">${c.kode}</span> ${esc(c.teks)} ${badge((detect(c.teks, c.ranah === 'S' ? 'A' : 'C') || {}).code)}</div>`).join('')}</div>
      ${cp.map(c => { const b = detect(c.teks, hintOf(m)); const ss = S.sub.filter(s => s.cpmk === c.id); return `<div class="cpmk"><div class="cpmk-h ${edC ? 'click' : ''}" data-c="${c.id}"><span class="orbsm">${c.kode.replace('CPMK', 'C')}</span><div><b>${esc(c.teks)}</b><div class="small muted">Mendukung ${(c.cpl || []).map(id => (S.cpl.find(x => x.id === id) || {}).kode).join(', ') || '–'} · PI: ${(S.pi || []).filter(p => (p.cpmk || []).includes(c.id)).map(p => p.kode).join(', ') || (m.inti ? '<span class="st bad">belum ada</span>' : '–')}</div></div>${b ? badge(b.code) : badge(null)}</div>
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
  el.innerHTML = `<div class="filters" id="rps-unggah" style="margin-bottom:12px"></div><div class="grid g-12 split-mk"><div class="card" id="left"></div><div id="right"></div></div>`;
  const draw = () => {
    mkList(el.querySelector('#left'), draw, m => { const r = rpsOf(S, m.id); return statusTag(r ? r.status : ''); });
    const m = S.mk.find(x => x.id === sel); const R = el.querySelector('#right');
    if (!m) { R.innerHTML = '<div class="card empty">Pilih mata kuliah.</div>'; return; }
    const P = param(S), r = rpsOf(S, m.id), ed = can('rps', { prodi: m.prodi, mk: m.id }) && (!r || r.status !== 'disahkan' || ctx.role === 'prodi' || ['admin', 'developer'].includes(ctx.role));
    const subs = S.sub.filter(s => s.mk === m.id), peng = S.tugas.filter(t => t.mk === m.id).map(t => (S.dosen.find(d => d.id === t.dosen) || {}).nama).filter(Boolean);
    if (!r) { R.innerHTML = `<div class="card">${head(esc(m.nama), 'RPS belum dibuat', 'audit', '#10b981')}<div class="empty">${subs.length ? '' : 'Lengkapi CPMK dan Sub-CPMK terlebih dahulu. '}${ed ? `<br><div class="filters" style="justify-content:center;margin-top:10px"><button class="btn pri" id="mk-rps">${icon('plus')} Buat RPS kosong 16 pertemuan</button><button class="btn vio" id="mk-gen">${icon('spark')} Buat draf otomatis dengan Asisten RPS</button></div><div class="small muted" style="margin-top:8px">Punya RPS lama? Pakai tombol Unggah RPS dari Word di atas, lalu lengkapi kekurangannya dengan Asisten RPS.</div>` : 'Dosen pengampu belum menyusun RPS.'}</div></div>`; const b = R.querySelector('#mk-rps'); if (b) b.onclick = async () => { await save('rps', blankRps(m), `Buat RPS ${m.nama}`); draw(); }; const gb = R.querySelector('#mk-gen'); if (gb) gb.onclick = () => bukaAsistenRps(m, draw, blankRps); return; }
    const lk = rpsLengkap(r), sp = sapLengkap(r), bobot = r.pertemuan.reduce((a, p) => a + (+p.bobot || 0), 0);
    const cover = subs.filter(s => !r.pertemuan.some(p => (p.sub || []).includes(s.id)));
    const ri = ringkasIntegrasi(S, m, r), nPert = r.pertemuan.length, salahJml = nPert !== 16;
    const kotakRiset = ri.entri.length ? `<b>Penelitian:</b> ${esc(teksRiset(S, ri.entri, 'Penelitian')) || '–'}<br><b>PKM:</b> ${esc(teksRiset(S, ri.entri, 'PKM')) || '–'}${ri.bad.length ? `<br><span class="st bad">${ri.bad.length} belum nyambung dengan materi</span>` : ''}${ri.near.length ? ` <span class="st near">${ri.near.length} perlu dicek</span>` : ''}` : ((r.penelitian || r.pkm) ? `<b>Penelitian:</b> ${esc(r.penelitian) || '–'}<br><b>PKM:</b> ${esc(r.pkm) || '–'}<br><span class="st near">Judul lama bebas, belum terhubung ke daftar.</span>${ed ? ` <button class="btn sm pri" id="pindah">Pindahkan ke daftar dan hubungkan</button>` : ''}` : '<span class="muted">Belum ada. Klik pertemuan, lalu pilih penelitian atau PKM dari daftar.</span>');
    const cellInteg = (p) => { if (p.ujian) return '<span class="muted">–</span>'; const ids = p.riset || []; if (ids.length) return ids.map(id => { const e = riset(S, id); if (!e) return ''; const c = kecocokan(S, m, r, p, e); return `<div class="small"><span class="tag" style="--c:${e.jenis === 'PKM' ? '#f5a524' : '#8b5cf6'}">${e.jenis}</span> ${esc(short(e.judul, 50))} ${stTag(c.k, c.k === 'ok' ? 'Sesuai' : c.k === 'near' ? 'Perlu dicek' : 'Belum nyambung')}<div class="muted">${esc(c.t)}</div></div>`; }).join(''); return p.integ ? `<span class="tag" style="--c:${p.integ === 'PKM' ? '#f5a524' : '#8b5cf6'}">${p.integ}</span> <span class="small muted">pilih dari daftar</span>` : '<span class="muted">–</span>'; };
    R.innerHTML = `<div class="card">${head(esc(m.nama), `Semester ${m.smt} · ${m.T}T + ${m.P}P · ${fmt(jpOf(m, P), 2)} jam/minggu · Pengampu: ${esc(peng.join(', ') || 'belum ditugaskan')}`, 'audit', '#10b981', statusTag(r.status))}
      <div class="grid g4 mini"><div><small>RPS terisi</small><b>${fmt(lk)}%</b>${bar(lk, pctColor(lk))}</div><div><small>SAP terisi</small><b>${fmt(sp)}%</b>${bar(sp, pctColor(sp))}</div><div><small>Total bobot asesmen</small><b style="color:${Math.abs(bobot - 100) < 1 ? '#047857' : '#b45309'}">${fmt(bobot, 1)}%</b></div><div><small>Sub-CPMK belum terjadwal</small><b style="color:${cover.length ? '#b42335' : '#047857'}">${cover.length}</b></div></div>
      <div class="grid g3 mini" style="margin-top:10px"><div><small>Integrasi penelitian atau PKM (opsional)</small><b style="color:#475569">${integrasiOf(r) ? integrasiOf(r) + ' pertemuan' : 'Tidak ada integrasi'}</b></div><div style="grid-column:span 2"><small>Penelitian dan PKM yang diintegrasikan (otomatis dari pilihan di pertemuan)</small><div class="small">${kotakRiset}</div></div></div>
      ${salahJml ? `<div class="ribbon bad" style="margin-top:12px">${icon('alert')} <b>RPS belum sesuai: jumlah pertemuan ${nPert}, seharusnya 16.</b> RPS ini belum dapat diajukan atau disahkan. ${nPert > 16 ? `Hapus ${nPert - 16} pertemuan yang berlebih: klik pertemuannya, lalu tombol <b>Hapus</b> di bagian bawah. Nomor pertemuan menyesuaikan otomatis.` : 'Lengkapi sampai 16 pertemuan.'}</div>` : ''}
      ${alasanRps(m, r) ? `<div style="margin-top:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 12px"><b>Validasi usulan.</b> RPS belum dapat diajukan atau disahkan: ${esc(alasanRps(m, r))}.${r && r.usulTinjau && ed ? ` Baca seluruh pertemuan, sunting bila perlu, lalu <button class="btn sm pri" id="tinjau">Saya sudah membaca dan menyetujui isi RPS</button>` : ''}${usulanMk(m.id).length ? ' Usulan CPMK dan Sub-CPMK disetujui Prodi di Asisten Kurikulum.' : ''}</div>` : ''}
      <div class="filters" style="margin-top:12px">
        ${ed ? `<button class="btn sm" id="ed-info">${icon('edit')} Deskripsi & pustaka</button>` : ''}
        <button class="btn sm vio" id="asis">${icon('spark')} Asisten RPS${(() => { const k = periksaRps(m, r).filter(c => c.k !== 'ok').length; return k ? ` · ${k} saran` : ''; })()}</button>
        <button class="btn sm" id="print">${icon('download')} Cetak / Unduh RPS</button>
        ${ed && r.status === 'draf' && can('rps', { prodi: m.prodi, mk: m.id }) ? `<button class="btn vio sm" id="aju">${icon('upload')} Ajukan ke kaprodi</button>` : ''}
        ${r.status === 'diajukan' && can('sahkanRps', m) ? `<button class="btn pri sm" id="sah">${icon('check')} Sahkan RPS</button><button class="btn sm danger" id="tolak">Kembalikan ke dosen</button>` : ''}
        ${r.status === 'disahkan' && can('sahkanRps', m) ? `<button class="btn sm danger" id="batal">Batalkan pengesahan</button>` : ''}
        ${!ed ? ro() : ''}</div>
      <div class="rps-cq"><div class="tbl-wrap" style="max-height:560px;margin-top:8px"><table class="tbl"><thead><tr><th>Mg</th><th>Sub-CPMK</th><th>Bahan kajian / materi</th><th>Metode & bentuk</th><th>Asesmen</th><th>Penelitian / PKM</th><th class="num">Bobot</th><th>SAP</th></tr></thead><tbody>
      ${r.pertemuan.map((p, i) => `<tr class="${p.ujian ? 'locked' : ''} ${ed ? 'click' : ''}" data-i="${i}"><td class="num" data-l="Pertemuan"><b>${p.m}</b></td><td class="small" data-l="Sub-CPMK">${(p.sub || []).map(id => (S.sub.find(s => s.id === id) || {}).kode).filter(Boolean).map(k => k.replace('Sub-CPMK', 'S')).join(', ')}</td><td data-l="Materi">${p.ujian ? `<span class="tag" style="--c:#8b5cf6">${p.ujian}</span> ` : ''}${esc(p.materi) || '<span class="st bad">belum diisi</span>'}</td><td class="small" data-l="Metode">${esc(p.metode)}</td><td class="small" data-l="Asesmen">${esc(p.asesmen)}</td><td class="small" data-l="Penelitian atau PKM">${cellInteg(p)}</td><td class="num" data-l="Bobot">${fmt(p.bobot, 1)}%</td><td data-l="SAP">${p.ujian ? '–' : (p.sap && p.sap.inti ? '<span class="st ok">ada</span>' : '<span class="st na">kosong</span>')}</td></tr>`).join('')}
      </tbody></table></div></div></div>`;
    const q = (s) => R.querySelector(s);
    if (ed) {
      q('#ed-info').onclick = () => formDrawer({ title: 'Deskripsi dan pustaka', sub: m.nama, obj: r, fields: [{ k: 'deskripsi', label: 'Deskripsi mata kuliah', type: 'textarea', rows: 4 }, { k: 'bahan', label: 'Bahan kajian', type: 'textarea', rows: 3 }, { k: 'syarat', label: 'Mata kuliah syarat', type: 'textarea', rows: 1 }, { k: 'pustaka', label: 'Pustaka utama dan pendukung', type: 'textarea', rows: 5 }], onSave: async (o) => { await save('rps', o, `Ubah deskripsi RPS ${m.nama}`); draw(); } });
      R.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => {
        const i = +tr.dataset.i, p = r.pertemuan[i]; const flat = { ...p, ...Object.fromEntries(Object.entries(p.sap || {}).map(([k, v]) => ['sap_' + k, v])) };
        formDrawer({ title: `Pertemuan ${p.m}${p.ujian ? ' · ' + p.ujian : ''}`, sub: `${m.nama} · durasi tatap muka ${m.T ? m.T * P.menitTeori + ' menit teori' : ''}${m.T && m.P ? ' + ' : ''}${m.P ? m.P * durasi(m, P) + ' menit praktik' : ''}`, obj: flat, wide: true,
          fields: [{ k: 'sub', label: 'Sub-CPMK yang dicapai', type: 'multi', opts: subs.map(s => ({ v: s.id, t: s.kode.replace('Sub-CPMK', 'S'), title: s.teks })) }, { k: 'materi', label: 'Bahan kajian / materi', type: 'textarea', rows: 2 }, { k: 'metode', label: 'Metode dan bentuk pembelajaran', full: true }, { k: 'indikator', label: 'Indikator penilaian', type: 'textarea', rows: 2 }, { k: 'asesmen', label: 'Kriteria dan teknik asesmen', type: 'textarea', rows: 2 }, { k: 'tatap', label: 'Tatap muka (bentuk, metode, alokasi waktu, penugasan)', type: 'textarea', rows: 2 }, { k: 'daring', label: 'Daring (bila ada)', type: 'textarea', rows: 2 }, { k: 'bobot', label: 'Bobot (%)', type: 'number', step: '0.1' },
            ...(p.ujian ? [] : [{ k: 'riset', label: 'Penelitian atau PKM yang diintegrasikan (pilih dari daftar pengampu)', type: 'multi', opts: opsiRiset(S, m).map(e => ({ v: e.id, t: `${e.jenis}: ${short(e.judul, 60)}${e.tahun ? ' (' + e.tahun + ')' : ''}`, title: labelRiset(S, e) })) },
              { k: 'bentuk', label: 'Dipakai sebagai', type: 'select', opts: [{ v: '', t: 'Pilih bentuk' }, ...BENTUK.map(v => ({ v, t: v })), { v: 'Lainnya', t: 'Lainnya (tulis sendiri)' }] }, { k: 'bentukLain', label: 'Bila memilih Lainnya, tulis bentuknya', ph: 'Contoh: Materi pengayaan, tugas proyek akhir' },
              ...(p.integ && !(p.riset || []).length ? [{ k: 'integ', label: 'Penandaan lama tanpa judul (ganti dengan pilihan dari daftar, atau kosongkan)', type: 'select', opts: INTEG.map(v => ({ v, t: v || 'Tidak ada' })) }] : []),
              { k: 'integUraian', label: 'Kaitan dengan materi (boleh kosong, terisi otomatis dari pilihan di atas)', type: 'textarea', rows: 2 }]),
            ...(p.ujian ? [] : [{ k: 'sap_pendahuluan', label: 'SAP · Pendahuluan', type: 'textarea', rows: 2 }, { k: 'sap_inti', label: 'SAP · Kegiatan inti', type: 'textarea', rows: 3 }, { k: 'sap_penutup', label: 'SAP · Penutup', type: 'textarea', rows: 2 }, { k: 'sap_media', label: 'SAP · Media dan alat', full: true }])],
          onDelete: nPert > 16 ? async () => { r.pertemuan.splice(i, 1); r.pertemuan.forEach((x, k) => { x.m = k + 1; }); if (r.status === 'disahkan') r.status = 'draf'; await save('rps', r, `Hapus pertemuan ${p.m} dari RPS ${m.nama}`); draw(); } : null,
          extra: p.ujian || opsiRiset(S, m).length ? '' : `<div class="ribbon info" style="margin-top:10px">${icon('info')} Daftar penelitian atau PKM pengampu masih kosong. Isi dulu di menu <a href="#riset"><b>Penelitian & PKM Dosen</b></a> (bisa unggah Excel), lalu kembali ke sini.</div>`,
          onSave: async (o) => { const sap = {}; Object.keys(o).filter(k => k.startsWith('sap_')).forEach(k => { sap[k.slice(4)] = o[k]; delete o[k]; }); if ((o.riset || []).length) { o.integ = jenisInteg(S, o.riset); if (!String(o.integUraian || '').trim()) { const e0 = riset(S, o.riset[0]); o.integUraian = `${(o.bentuk === 'Lainnya' ? (o.bentukLain || 'Lainnya') : o.bentuk) || 'Bahan ajar'}: ${e0 ? e0.judul : ''}${o.riset.length > 1 ? ` dan ${o.riset.length - 1} lainnya` : ''}.`; } } else if (p.riset && p.riset.length && !('integ' in o && o.integ)) o.integ = '';
            r.pertemuan[i] = { ...o, sap, m: p.m, ujian: p.ujian }; { const r2 = ringkasIntegrasi(S, m, r); if (r2.entri.length) { r.penelitian = teksRiset(S, r2.entri, 'Penelitian'); r.pkm = teksRiset(S, r2.entri, 'PKM'); } } if (r.status === 'disahkan') r.status = 'draf'; await save('rps', r, `Ubah RPS ${m.nama} pertemuan ${p.m}`); draw(); } });
      });
    }
    const pd = q('#pindah'); if (pd) pd.onclick = async () => {
      const pemilik = ctx.role === 'dosen' ? ctx.dosen : ((S.tugas.find(t => t.mk === m.id) || {}).dosen || '');
      if (!pemilik) { toast('MK ini belum punya dosen pengampu. Tetapkan dulu di Penugasan dan Beban Dosen.'); return; }
      const baru = [], pecah = (t, jenis) => String(t || '').split(/[;\n]+/).map(x => x.trim()).filter(Boolean).forEach(j => { const e = rapikanEntri({ dosen: pemilik, jenis, judul: j, tahun: (j.match(/(19|20)\d{2}/) || [])[0] }); const ada = (S.riset || []).concat(baru).find(x => x.dosen === pemilik && normRiset(x.judul) === normRiset(e.judul)); if (!ada) baru.push({ ...e, id: uid('RS') + baru.length }); });
      pecah(r.penelitian, 'Penelitian'); pecah(r.pkm, 'PKM');
      if (baru.length) await saveMany('riset', baru, `Pindahkan judul lama RPS ${m.nama} ke daftar penelitian dan PKM`);
      const semua = (S.riset || []).filter(e => e.dosen === pemilik);
      const kenal = (j) => { const x = rapikanEntri({ judul: j }); return semua.find(e => normRiset(e.judul) === normRiset(x.judul)); };
      const ids = { Penelitian: String(r.penelitian || '').split(/[;\n]+/).map(kenal).filter(Boolean).map(e => e.id), PKM: String(r.pkm || '').split(/[;\n]+/).map(kenal).filter(Boolean).map(e => e.id) };
      r.pertemuan.forEach(x => { if (x.ujian || !x.integ || (x.riset || []).length) return; const w = []; if (/Penelitian/.test(x.integ) && ids.Penelitian[0]) w.push(ids.Penelitian[0]); if (/PKM/.test(x.integ) && ids.PKM[0]) w.push(ids.PKM[0]); if (w.length) x.riset = w; });
      const r2 = ringkasIntegrasi(S, m, r), r2n = r2.entri.length; r.penelitian = teksRiset(S, r2.entri, 'Penelitian'); r.pkm = teksRiset(S, r2.entri, 'PKM');
      await save('rps', r, `Hubungkan integrasi RPS ${m.nama} ke daftar`); toast(r2n ? 'Judul lama dipindahkan ke daftar dan dihubungkan ke pertemuan yang sudah ditandai.' : 'Judul lama dipindahkan ke daftar. Klik pertemuan, lalu pilih dari daftar.'); draw();
    };
    const tj = q('#tinjau'); if (tj) tj.onclick = async () => { if (!(await tanya('Saya sudah membaca seluruh isi RPS ini, memahaminya, dan menyetujuinya sebagai isian resmi.', 'Setujui'))) return; r.usulTinjau = false; await save('rps', r, `Setujui isi usulan RPS ${m.nama}`); draw(); };
    const aju = q('#aju'); if (aju) aju.onclick = async () => { const al = alasanRps(m, r); if (al) { toast('Belum bisa diajukan: ' + al + '.'); return; } if (salahJml) { toast(`Jumlah pertemuan ${nPert}, seharusnya 16. Perbaiki dulu.`); return; } if (lk < 99) { toast('Lengkapi 16 pertemuan sebelum mengajukan.'); return; }
      r.status = 'diajukan'; r.tgl = new Date().toISOString().slice(0, 10); await save('rps', r, `Ajukan RPS ${m.nama}`); draw(); };
    const sah = q('#sah'); if (sah) sah.onclick = async () => { const al = alasanRps(m, r); if (al) { toast('Belum bisa disahkan: ' + al + '.'); return; } if (salahJml) { toast(`Jumlah pertemuan ${nPert}, seharusnya 16. Kembalikan ke dosen untuk diperbaiki.`); return; } r.status = 'disahkan'; r.oleh = 'Kaprodi ' + m.prodi; r.tgl = new Date().toISOString().slice(0, 10); await save('rps', r, `Sahkan RPS ${m.nama}`); draw(); };
    const bt = q('#batal'); if (bt) bt.onclick = async () => { if (!(await tanya(`Pengesahan RPS ${m.nama} dibatalkan dan statusnya kembali menjadi draf, sehingga dosen dapat merevisi. Lanjutkan?`, 'Batalkan pengesahan'))) return; r.status = 'draf'; r.oleh = ''; r.tgl = ''; await save('rps', r, `Batalkan pengesahan RPS ${m.nama}`); draw(); };
    const tl = q('#tolak'); if (tl) tl.onclick = async () => { r.status = 'draf'; await save('rps', r, `Kembalikan RPS ${m.nama} ke dosen`); draw(); };
    q('#print').onclick = () => cetakRps(m, r);
    q('#asis').onclick = () => bukaAsistenRps(m, draw, blankRps);
  };
  tombolUnggahRps(el, draw);
  draw();
}

function cetakRps(m, r) {
  openDrawer(`<div class="no-print filters"><button class="btn pri" onclick="window.print()">${icon('download')} Cetak / simpan PDF</button><button class="btn" id="rep-doc">${icon('download')} Unduh Word (format templat)</button><button class="btn ghost" data-close>Tutup</button></div>
  <div class="report rps-doc" id="rep">${badanRps(m, r, true)}</div>`, (dr) => {
    dr.querySelector('#rep-doc').onclick = () => unduh(new Blob(['\ufeff', berkasWordRps(m, r)], { type: 'application/msword' }), namaBerkasRps(m));
  }, true);
  void closeDrawer;
}
