/* KUREKAM · CPMK, Sub-CPMK, RPS, dan SAP */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, uid, openDrawer, closeDrawer, toast } from '../app.js';
import { labelKel, labelGrup } from '../kode.js';
import { APP } from '../config.js';
import { tombolUnggahRps } from '../rpsimpor.js';
import { badanRps, berkasDocxRps, namaBerkasRps } from '../rpsdok.js';
import { badanSap, berkasDocxSap, namaBerkasSap } from '../sapdok.js';
import { badanAcp, berkasDocxAcp, namaBerkasAcp } from '../acpdok.js';
import { urutkanCpmk } from './matrikscpmk.js';
import { bukaAsistenRps, periksaRps } from './asisten.js';
import { alasanRps, usulanMk } from '../usulan.js';
import { kartuVerif, ikatVerif, formVerif, verifOf } from './verifrps.js';
import { bukaGeneratorDok, turunkanDok } from './dokgen.js';
import { detect, badge, ANJURAN_SMT, selisihRentang, kkoSemester } from '../bloom.js';
import { kodeBerikut, cpmkProdi, mkTanpaCpl, PESAN_KUNCI_CPL, INTEG, integrasiOf, byProdi, param, jpOf, sksOf, grupOf, warnaGrup, fmt, rpsOf, rpsLengkap, sapLengkap, durasi } from '../rules.js';
import { TEKNIK, RUBRIK, teknikDari, kriteriaTeknik } from '../rubrik.js';
import { pecahBahan, gabungBahan, pecahPustaka, gabungUtama, gabungPend, opsiPustaka, pecahMateri, gabungMateri, pecahBaris, pecahIndikator, pecahMetode, METODE_DEF, daringDef, tatapDef, jamDefault, kenaliSyarat } from '../rpsisi.js';
import { unduh, tanya, head, formDrawer, ro, prodiName, short, statusTag, stTag, bar, pctColor, opts } from './ui.js';
import { rapikanEntri, normRiset, opsiRiset, riset, ringkasIntegrasi, teksRiset, jenisInteg, kecocokan, labelRiset, BENTUK } from '../riset.js';

const akad = (m) => !/magang|tugas akhir/i.test(m.kel);
const hintOf = (m) => (+m.P > +m.T ? 'P' : 'C');
const mine = (m) => ctx.role !== 'dosen' || S.tugas.some(t => t.mk === m.id && t.dosen === ctx.dosen);
const live = (m) => (v) => { const b = detect(v, hintOf(m)); return b ? `${badge(b.code)} kata kerja "<b>${esc(b.verb)}</b>"${b.kabur ? ' <span class="st near">tidak terukur, ganti KKO</span>' : ''}` : (v.trim() ? badge(null) : 'Awali dengan kata kerja operasional.'); };
const liveCpmk = (m) => (v) => {
  const b = detect(v, hintOf(m)), dasar = live(m)(v), r = ANJURAN_SMT[m.smt];
  if (!b || b.d !== 'C' || !r) return dasar;
  const g = selisihRentang(b, m.smt);
  if (!g) return `${dasar} <span class="st ok">sesuai rentang semester ${m.smt} (C${r[0]}–C${r[1]})</span>`;
  const berat = Math.abs(g) >= 2;
  return `${dasar} <span class="st ${berat ? 'bad' : 'near'}">${g > 0 ? 'terlalu tinggi' : 'terlalu rendah'} untuk semester ${m.smt} (anjuran C${r[0]}–C${r[1]})${berat ? ': isi alasan di bawah' : ''}</span><div class="small" style="margin-top:4px">Contoh kata kerja yang sesuai: ${esc(kkoSemester(m.smt))}</div>`;
};
const tagRentang = (m, b) => { const g = selisihRentang(b, m.smt); return g ? `<span class="st ${Math.abs(g) >= 2 ? 'bad' : 'near'}" title="Anjuran semester ${m.smt}: C${(ANJURAN_SMT[m.smt] || [])[0]}–C${(ANJURAN_SMT[m.smt] || [])[1]}">${g > 0 ? 'terlalu tinggi' : 'terlalu rendah'} untuk smt ${m.smt}</span>` : ''; };
let sel = null, fSmt = '';
/** Memilih mata kuliah yang dibuka pada menu CPMK dan RPS (dipakai tautan di Beranda). */
export function pilihMk(id) { sel = id; fSmt = ''; }

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
    if (mkTanpaCpl(m)) { R.innerHTML = `<div class="card">${head(esc(m.nama), `Semester ${m.smt} · ${m.T}T + ${m.P}P · CPL dibebankan: belum ada`, 'spark', '#0ea5e9', ro())}<div class="ribbon bad">${icon('alert')} <b>Belum dapat diisi.</b> ${PESAN_KUNCI_CPL}</div></div>`; return; }
    const edS = can('rps', { prodi: m.prodi, mk: m.id }), edC = can('susun', m) || edS;
    const cp = S.cpmk.filter(c => c.mk === m.id), cplMk = (m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
    const tot = S.sub.filter(s => s.mk === m.id).reduce((a, s) => a + (+s.bobot || 0), 0);
    R.innerHTML = `<div class="card">${head(esc(m.nama), `${m.inti ? 'Mata kuliah inti · ' : ''}Semester ${m.smt} · ${m.T}T + ${m.P}P · CPL dibebankan: ${cplMk.map(c => c.kode).join(', ') || 'belum ada'}`, 'spark', '#0ea5e9', edC ? `<button class="btn pri sm" id="add-c">${icon('plus')} CPMK</button>` : ro())}
      <div class="cplbox">${cplMk.map(c => `<div><span class="tag" style="--c:#0ea5e9">${c.kode}</span> ${esc(c.teks)} ${badge((detect(c.teks, c.ranah === 'S' ? 'A' : 'C') || {}).code)}</div>`).join('')}</div>
      ${cp.map(c => { const b = detect(c.teks, hintOf(m)); const ss = S.sub.filter(s => s.cpmk === c.id); return `<div class="cpmk"><div class="cpmk-h" data-c="${c.id}"><span class="orbsm">${c.kode.replace('CPMK', 'C')}</span><div><b>${esc(c.teks)}</b><div class="small muted">Mendukung ${(c.cpl || []).map(id => (S.cpl.find(x => x.id === id) || {}).kode).join(', ') || '–'} · PI: ${(S.pi || []).filter(p => (p.cpmk || []).includes(c.id)).map(p => p.kode).join(', ') || (m.inti ? '<span class="st bad">belum ada</span>' : '–')}</div></div>${b ? badge(b.code) : badge(null)} ${b ? tagRentang(m, b) : ''}${edC ? `<span class="aksi"><button class="btn sm btn-ic" data-ec="${c.id}">${icon('edit')} Alasan${c.usul ? ' / rumusan' : ''}</button><button class="btn sm btn-ic danger" data-dc="${c.id}">${icon('trash')} Lepas dari MK</button></span>` : ''}</div>
        <div class="subs">${ss.map(s => { const sb = detect(s.teks, 'C'); return `<div class="sub" data-s="${s.id}"><span class="small muted">${s.kode}</span><span>${esc(s.teks)}</span>${sb ? badge(sb.code) : badge(null)}<b>${fmt(s.bobot)}%</b>${edC ? `<span class="aksi"><button class="btn sm btn-ic" data-es="${s.id}">${icon('edit')} Ubah</button><button class="btn sm btn-ic danger" data-ds="${s.id}">${icon('trash')} Hapus</button></span>` : ''}</div>`; }).join('')}
        ${edC ? `<button class="btn ghost sm" data-adds="${c.id}">${icon('plus')} Sub-CPMK</button>` : ''}</div></div>`; }).join('') || '<div class="empty">Belum ada CPMK.</div>'}
      <div class="filters" style="margin-top:12px"><span class="st ${Math.abs(tot - 100) < 0.5 ? 'ok' : tot ? 'near' : 'na'}">Total bobot Sub-CPMK: ${fmt(tot)}%</span><span class="note">Level Sub-CPMK tidak boleh melampaui CPMK induknya, dan CPMK tidak melampaui CPL.</span></div></div>`;
    /* CPMK dipilih dari bank prodi (turunan CPL pada MK ini); dosen dapat mengusulkan CPMK baru di bawah salah satu CPL MK-nya */
    const bank = cpmkProdi(S, m.prodi).filter(g => (m.cpl || []).includes(g.cpl) && !cp.some(k => g.rec.some(r => r.id === k.id)));
    const cForm = () => formDrawer({ title: 'Tambah CPMK pada ' + m.nama, sub: 'Pilih CPMK yang sesuai dari daftar prodi, atau usulkan yang baru', obj: { pilih: [], cplBaru: cplMk[0] && cplMk[0].id },
      fields: [{ k: 'pilih', label: 'CPMK prodi yang dimuat MK ini (turunan dari CPL MK ini, boleh lebih dari satu)', type: 'multi', opts: bank.map(g => ({ v: g.kunci, t: `${g.kode} · ${short(g.teks, 70)}`, title: g.teks })), help: bank.length ? 'Kode CPMK sama di semua mata kuliah yang memuatnya.' : 'Belum ada CPMK prodi yang tersisa untuk CPL mata kuliah ini. Usulkan CPMK baru di bawah.' },
        { k: 'cplBaru', label: 'Usulan CPMK baru: diturunkan dari CPL', type: 'select', opts: cplMk.map(c => ({ v: c.id, t: `${c.kode} · ${short(c.teks, 60)}` })) },
        { k: 'teks', label: 'Usulan CPMK baru: rumusan (kosongkan bila hanya memilih)', type: 'textarea', rows: 3, live: liveCpmk(m) }],
      onSave: async (o) => {
        if (!(o.pilih || []).length && !o.teks) return 'Pilih CPMK dari daftar atau tulis usulan CPMK baru.';
        const baru = [];
        (o.pilih || []).forEach(k => { const g = bank.find(y => y.kunci === k); if (g) baru.push({ id: uid(m.id + '-CPMK'), mk: m.id, prodi: m.prodi, kode: g.kode, teks: g.teks, cpl: [g.cpl] }); });
        if (o.teks) baru.push({ id: uid(m.id + '-CPMK'), mk: m.id, prodi: m.prodi, kode: kodeBerikut(S, 'cpmk', m.prodi, { pakai: [] }), teks: o.teks, cpl: [o.cplBaru], ...(can('susun', m) ? {} : { usul: true }) });
        await saveMany('cpmk', baru, `Tambah CPMK pada ${m.nama}`); if (can('susun', m)) await urutkanCpmk(m.prodi); draw();
      } });
    const cEdit = (x) => formDrawer({ title: 'Ubah ' + x.kode, sub: m.nama, obj: x,
      fields: [...(x.usul || can('susun', m) && !S.cpmk.some(k => k.id !== x.id && k.kode === x.kode) ? [{ k: 'teks', label: 'Rumusan CPMK', type: 'textarea', live: liveCpmk(m) }] : []), { k: 'alasanLevel', label: 'Alasan bila level di luar rentang semester (hanya bila perlu)', type: 'textarea', rows: 2, ph: 'Kosongkan bila level sudah sesuai', help: `Rentang anjuran semester ${m.smt}: ${ANJURAN_SMT[m.smt] ? 'C' + ANJURAN_SMT[m.smt][0] + '–C' + ANJURAN_SMT[m.smt][1] : '–'}. Selisih 2 level atau lebih dari rentang wajib diberi alasan agar RPS dapat diajukan. Rumusan CPMK yang dipakai banyak mata kuliah diubah oleh prodi di menu Matriks CPL–CPMK.` }],
      onSave: async (o) => { await save('cpmk', o, `Simpan ${o.kode} ${m.nama}`); draw(); } });
    const sForm = (x) => formDrawer({ title: x.id ? 'Ubah ' + x.kode : 'Sub-CPMK baru', sub: m.nama, obj: x,
      fields: [{ k: 'kode', label: 'Kode', type: 'kode', ph: x.kode }, { k: 'bobot', label: 'Bobot penilaian (%)', type: 'number' }, { k: 'teks', label: 'Rumusan Sub-CPMK (kemampuan akhir tahap belajar)', type: 'textarea', live: live({ T: 1, P: 0 }) }],
      onSave: async (o) => { if (!o.teks) return 'Rumusan wajib diisi.'; o.kode = o.kode || kodeBerikut(S, 'sub', m.prodi, { cpmk: S.cpmk.find(c => c.id === x.cpmk) }); o.id = o.id || uid(x.cpmk + '-S'); o.mk = m.id; o.prodi = m.prodi; o.bobot = +o.bobot || 0; await save('sub', o, `Simpan ${o.kode} ${m.nama}`); draw(); },
      onDelete: x.id ? async () => { await remove('sub', x.id, `Hapus ${x.kode}`); draw(); } : null });
    const ac = R.querySelector('#add-c'); if (ac) ac.onclick = () => cForm();
    if (edC) {
      R.querySelectorAll('[data-ec]').forEach(b => b.onclick = () => cEdit({ ...S.cpmk.find(c => c.id === b.dataset.ec) }));
      R.querySelectorAll('[data-dc]').forEach(b => b.onclick = async () => { const c = S.cpmk.find(x => x.id === b.dataset.dc); if (!(await tanya(`Lepaskan ${c.kode} dari mata kuliah ini beserta Sub-CPMK di bawahnya? CPMK tetap ada di daftar prodi.`, 'Lepas'))) return; for (const s of S.sub.filter(s => s.cpmk === c.id)) await remove('sub', s.id); await remove('cpmk', c.id, `Lepas ${c.kode} dari ${m.nama}`); if (can('susun', m)) await urutkanCpmk(m.prodi); draw(); });
      R.querySelectorAll('[data-es]').forEach(b => b.onclick = () => sForm({ ...S.sub.find(c => c.id === b.dataset.es) }));
      R.querySelectorAll('[data-ds]').forEach(b => b.onclick = async () => { const c = S.sub.find(x => x.id === b.dataset.ds); if (!(await tanya(`Hapus ${c.kode}?`, 'Hapus'))) return; await remove('sub', c.id, `Hapus ${c.kode}`); draw(); });
      R.querySelectorAll('[data-adds]').forEach(b => b.onclick = () => { const c = S.cpmk.find(x => x.id === b.dataset.adds); sForm({ cpmk: c.id, kode: kodeBerikut(S, 'sub', m.prodi, { cpmk: c }), bobot: 0 }); });
    }
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
    if (mkTanpaCpl(m)) { R.innerHTML = `<div class="card">${head(esc(m.nama), 'RPS belum dapat diisi', 'audit', '#10b981', ro())}<div class="ribbon bad">${icon('alert')} <b>RPS terkunci.</b> ${PESAN_KUNCI_CPL}</div></div>`; return; }
    const P = param(S), r = rpsOf(S, m.id), ed = can('rps', { prodi: m.prodi, mk: m.id }) && (!r || r.status !== 'disahkan' || ctx.role === 'prodi' || ['admin', 'developer'].includes(ctx.role));
    const subs = S.sub.filter(s => s.mk === m.id), peng = S.tugas.filter(t => t.mk === m.id).map(t => (S.dosen.find(d => d.id === t.dosen) || {}).nama).filter(Boolean);
    if (!r) { R.innerHTML = `<div class="card">${head(esc(m.nama), 'RPS belum dibuat', 'audit', '#10b981')}<div class="empty">${subs.length ? '' : 'Lengkapi CPMK dan Sub-CPMK terlebih dahulu. '}${ed ? `<br><div class="filters" style="justify-content:center;margin-top:10px"><button class="btn pri" id="mk-rps">${icon('plus')} Buat RPS kosong 16 pertemuan</button><button class="btn vio" id="mk-gen">${icon('spark')} Buat draf otomatis dengan Asisten RPS</button></div><div class="small muted" style="margin-top:8px">Punya RPS lama? Pakai tombol Unggah RPS dari Word di atas, lalu lengkapi kekurangannya dengan Asisten RPS.</div>` : 'Dosen pengampu belum menyusun RPS.'}</div></div>`; const b = R.querySelector('#mk-rps'); if (b) b.onclick = async () => { await save('rps', blankRps(m), `Buat RPS ${m.nama}`); draw(); }; const gb = R.querySelector('#mk-gen'); if (gb) gb.onclick = () => bukaAsistenRps(m, draw, blankRps); return; }
    const lk = rpsLengkap(r), sp = sapLengkap(r), bobot = r.pertemuan.reduce((a, p) => a + (+p.bobot || 0), 0);
    const cover = subs.filter(s => !r.pertemuan.some(p => (p.sub || []).includes(s.id)));
    const ri = ringkasIntegrasi(S, m, r), nPert = r.pertemuan.length, salahJml = nPert !== 16;
    const kotakRiset = ri.entri.length ? `<b>Penelitian:</b> ${esc(teksRiset(S, ri.entri, 'Penelitian')) || '–'}<br><b>PKM:</b> ${esc(teksRiset(S, ri.entri, 'PKM')) || '–'}${ri.bad.length ? `<br><span class="st bad">${ri.bad.length} belum sesuai dengan materi</span>` : ''}${ri.near.length ? ` <span class="st near">${ri.near.length} perlu dicek</span>` : ''}` : ((r.penelitian || r.pkm) ? `<b>Penelitian:</b> ${esc(r.penelitian) || '–'}<br><b>PKM:</b> ${esc(r.pkm) || '–'}<br><span class="st near">Judul lama bebas, belum terhubung ke daftar.</span>${ed ? ` <button class="btn sm pri" id="pindah">Pindahkan ke daftar dan hubungkan</button>` : ''}` : '<span class="muted">Belum ada. Klik pertemuan, lalu pilih penelitian atau PKM dari daftar.</span>');
    const cellInteg = (p) => { if (p.ujian) return '<span class="muted">–</span>'; const ids = p.riset || []; if (ids.length) return ids.map(id => { const e = riset(S, id); if (!e) return ''; const c = kecocokan(S, m, r, p, e); return `<div class="small"><span class="tag" style="--c:${e.jenis === 'PKM' ? '#f5a524' : '#8b5cf6'}">${e.jenis}</span> ${esc(short(e.judul, 50))} ${stTag(c.k, c.k === 'ok' ? 'Sesuai' : c.k === 'near' ? 'Perlu dicek' : 'Belum sesuai')}<div class="muted">${esc(c.t)}</div></div>`; }).join(''); return p.integ ? `<span class="tag" style="--c:${p.integ === 'PKM' ? '#f5a524' : '#8b5cf6'}">${p.integ}</span> <span class="small muted">pilih dari daftar</span>` : '<span class="muted">–</span>'; };
    R.innerHTML = `<div class="card">${head(esc(m.nama), `Semester ${m.smt} · ${m.T}T + ${m.P}P · ${fmt(jpOf(m, P), 2)} jam/minggu · Pengampu: ${esc(peng.join(', ') || 'belum ditugaskan')}`, 'audit', '#10b981', statusTag(r.status))}
      <div class="grid g4 mini"><div><small>RPS terisi</small><b>${fmt(lk)}%</b>${bar(lk, pctColor(lk))}</div><div><small>SAP terisi</small><b>${fmt(sp)}%</b>${bar(sp, pctColor(sp))}</div><div><small>Total bobot asesmen</small><b style="color:${Math.abs(bobot - 100) < 1 ? '#047857' : '#b45309'}">${fmt(bobot, 1)}%</b></div><div><small>Sub-CPMK belum terjadwal</small><b style="color:${cover.length ? '#b42335' : '#047857'}">${cover.length}</b></div></div>
      <div class="grid g3 mini" style="margin-top:10px"><div><small>Integrasi penelitian atau PKM (opsional)</small><b style="color:#475569">${integrasiOf(r) ? integrasiOf(r) + ' pertemuan' : 'Tidak ada integrasi'}</b></div><div style="grid-column:span 2"><small>Penelitian dan PKM yang diintegrasikan (otomatis dari pilihan di pertemuan)</small><div class="small">${kotakRiset}</div></div></div>
      ${salahJml ? `<div class="ribbon bad" style="margin-top:12px">${icon('alert')} <b>RPS belum sesuai: jumlah pertemuan ${nPert}, seharusnya 16.</b> RPS ini belum dapat diajukan atau disahkan. ${nPert > 16 ? `Hapus ${nPert - 16} pertemuan yang berlebih: klik pertemuannya, lalu tombol <b>Hapus</b> di bagian bawah. Nomor pertemuan menyesuaikan otomatis.` : 'Lengkapi sampai 16 pertemuan.'}</div>` : ''}
      ${alasanRps(m, r) ? `<div style="margin-top:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 12px"><b>Validasi usulan.</b> RPS belum dapat diajukan atau disahkan: ${esc(alasanRps(m, r))}.${r && r.usulTinjau && ed ? ` Baca seluruh pertemuan, sunting bila perlu, lalu <button class="btn sm pri" id="tinjau">Saya sudah membaca dan menyetujui isi RPS</button>` : ''}${usulanMk(m.id).length ? ' Usulan CPMK dan Sub-CPMK disetujui Prodi di Asisten Kurikulum.' : ''}</div>` : ''}
      ${kartuVerif(m)}
      <div class="filters" style="margin-top:12px">
        ${ed ? `<button class="btn sm" id="ed-info">${icon('edit')} Deskripsi & pustaka</button>` : ''}
        <button class="btn sm vio" id="asis">${icon('spark')} Asisten RPS${(() => { const k = periksaRps(m, r).filter(c => c.k !== 'ok').length; return k ? ` · ${k} saran` : ''; })()}</button>
        <button class="btn sm" id="print">${icon('download')} Cetak / Unduh RPS</button>
        <button class="btn sm vio" id="gen-dok">${icon('spark')} Generator SAP & ACP${(r.sapStatus === 'disahkan' ? '' : ' · SAP ' + (r.sapStatus || 'draf')) + (r.acpStatus === 'disahkan' ? '' : ' · ACP ' + (r.acpStatus || 'draf'))}</button>
        <button class="btn sm" id="print-sap">${icon('download')} SAP</button>
        <button class="btn sm" id="print-acp">${icon('download')} ACP</button>
        <button class="btn sm" id="unduh-paket">${icon('download')} Paket RPS + SAP + ACP</button>
        ${ed && r.status === 'draf' && can('rps', { prodi: m.prodi, mk: m.id }) ? (() => { const bad = periksaRps(m, r).filter(c => c.k === 'bad'); return `<button class="btn vio sm" id="aju" ${bad.length ? `disabled title="Belum bisa diajukan: ${esc(bad.map(c => c.butir).join('; '))}"` : ''}>${icon('upload')} Ajukan ke kaprodi</button>${bad.length ? `<span class="small" style="color:#b42335;align-self:center">Ajukan belum aktif: ${bad.length} butir belum sesuai (${esc(bad.map(c => c.butir).join('; '))}). Buka Asisten RPS lalu klik tombol Perbaiki di.</span>` : ''}`; })() : ''}
        ${r.status === 'diajukan' && can('sahkanRps', m) ? `<button class="btn pri sm" id="sah">${icon('check')} Sahkan RPS</button><button class="btn sm danger" id="tolak">Kembalikan ke dosen</button>` : ''}
        ${r.status === 'disahkan' && can('sahkanRps', m) ? `<button class="btn sm danger" id="batal">Batalkan pengesahan</button>` : ''}
        ${!ed ? ro() : ''}</div>
      <div class="rps-cq"><div class="tbl-wrap" style="max-height:560px;margin-top:8px"><table class="tbl"><thead><tr><th>Mg</th><th>Sub-CPMK</th><th>Indikator</th><th>Kriteria &amp; teknik</th><th>Tatap muka</th><th>Daring</th><th>Materi Pembelajaran</th><th class="num">Bobot</th><th>Integrasi</th><th>SAP</th></tr></thead><tbody>
      ${r.pertemuan.map((p, i) => { const pl = 'white-space:pre-line;min-width:150px'; const subTxt = (p.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean).map(s => `<b>${esc(s.kode.replace(/^sub-cpmk/i, 'S'))}</b>`).join(', '); const ind = pecahIndikator(p.indikator).map((t, k) => `${p.m}.${k + 1} ${t}`).join('\n'); const mt = pecahMateri(p.materi); return `<tr class="${p.ujian ? 'locked' : ''} ${ed ? 'click' : ''}" data-i="${i}"><td class="num" data-l="Pertemuan"><b>${p.m}</b></td><td class="small" data-l="Sub-CPMK">${subTxt}</td><td class="small" data-l="Indikator" style="${pl}">${esc(ind) || '<span class="muted">–</span>'}</td><td class="small" data-l="Kriteria dan teknik" style="${pl}">${(() => { const kt = kriteriaTeknik(p.asesmen); return kt.teknik.length ? `<b>Kriteria:</b> ${esc(kt.kriteria.join(', '))}\n<b>Teknik:</b> ${esc(kt.teknik.join(', '))}` : (esc(p.asesmen) || '<span class="muted">–</span>'); })()}</td><td class="small" data-l="Tatap muka" style="${pl}">${esc(p.tatap || (p.metode ? 'Metode: ' + p.metode : '')) || '<span class="st bad">belum diisi</span>'}</td><td class="small" data-l="Daring" style="${pl}">${esc(p.daring) || '<span class="muted">–</span>'}</td><td data-l="Materi" style="${pl};min-width:220px">${p.ujian ? `<span class="tag" style="--c:#8b5cf6">${p.ujian}</span> ` : ''}${esc(mt.isi) || '<span class="st bad">belum diisi</span>'}${mt.pus.length ? `<div class="small muted">Pustaka: ${mt.pus.map(x => esc(`(${x.n})${x.bab ? ' ' + x.bab : ''}`)).join(', ')}</div>` : ''}</td><td class="num" data-l="Bobot">${fmt(p.bobot, 1)}%</td><td class="small" data-l="Integrasi">${cellInteg(p)}</td><td data-l="SAP">${(() => { const ada = p.ujian ? (p.sap && p.sap.soal) : (p.sap && p.sap.inti), t = ada ? '<span class="st ok">ada</span>' : '<span class="st na">kosong</span>'; return ed ? `<button class="btn sm" data-sap="${i}" title="Isi SAP pertemuan ini">${t} Isi</button>` : t; })()}</td></tr>`; }).join('')}
      </tbody></table></div></div></div>`;
    const q = (s) => R.querySelector(s);
    if (ed) {
      q('#ed-info').onclick = () => {
        const tmPert = (+m.T || 0) * P.menitTeori + (+m.P || 0) * durasi(m, P), jd = jamDefault(m, tmPert);
        const subOpt = subs.map(s => ({ v: s.id, t: s.kode.replace(/^sub-cpmk/i, 'S'), title: s.teks }));
        const bahan = (r.bahanList && r.bahanList.length ? r.bahanList : pecahBahan(r.bahan));
        const kandidat = S.mk.filter(x => x.id !== m.id && +x.smt <= +m.smt && x.prodi === m.prodi).sort((x, y) => (+x.smt - +y.smt) || String(x.nama).localeCompare(y.nama));
        const idSyarat = (r.syaratIds && r.syaratIds.length ? r.syaratIds : kenaliSyarat(r.syarat, kandidat)).filter(id => kandidat.some(x => x.id === id));
        const pu = pecahPustaka(r.pustaka, r.pustakaPendukung);
        const obj = { ...r, _bahan: bahan, _syarat: idSyarat, _pusU: pu.utama, _pusP: pu.pend, jamTerstruktur: r.jamTerstruktur == null ? jd.terstruktur : r.jamTerstruktur, jamMandiri: r.jamMandiri == null ? jd.mandiri : r.jamMandiri };
        const lamaSyarat = String(r.syarat || '').trim() && !idSyarat.length;
        formDrawer({ title: 'Deskripsi dan pustaka', sub: `${m.nama} · semester ${m.smt} · ${m.T}T + ${m.P}P`, obj, full: true,
          fields: [{ k: 'deskripsi', label: 'Deskripsi mata kuliah', type: 'textarea', rows: 9 },
            { k: '_bahan', label: 'Bahan kajian (satu kotak per nomor; boleh ditambah, diubah, atau dihapus)', type: 'listsub', tambah: 'Tambah bahan kajian', sub: subOpt, ph: 'Tulis satu bahan kajian', help: 'Klik Sub-CPMK di bawah tiap bahan kajian untuk memetakan bahan kajian terhadap Sub-CPMK.' },
            { k: '_syarat', label: 'Mata kuliah syarat (opsional; klik untuk memilih, semester di bawahnya atau semester berjalan)', type: 'multi', opts: kandidat.map(x => ({ v: x.id, t: `${x.nama} (smt ${x.smt})`, title: `${x.kode} · ${x.nama}` })), help: lamaSyarat ? `Isian lama: “${esc(r.syarat)}”. Pilih ulang dari daftar; bila tidak memilih, isian lama dipertahankan.` : 'Kosongkan bila tidak ada mata kuliah syarat.' },
            { k: '_pusU', label: 'Pustaka utama (satu kotak per pustaka; nomor otomatis)', type: 'list', tambah: 'Tambah pustaka utama', nomor: (i) => `(${i + 1})`, ph: 'Penulis, tahun, judul, edisi, penerbit' },
            { k: '_pusP', label: 'Pustaka pendukung (boleh kosong)', type: 'list', tambah: 'Tambah pustaka pendukung', nomor: (i) => `(S${i + 1})`, ph: 'Penulis, tahun, judul, penerbit atau tautan' },
            { k: 'jamTerstruktur', label: 'Tugas terstruktur (menit per semester) · wajib', type: 'number' }, { k: 'jamMandiri', label: 'Tugas mandiri (menit per semester) · wajib', type: 'number' }, { k: 'jamTerbimbing', label: 'Tugas terbimbing (menit per semester, boleh kosong)', type: 'number' },
            { k: '_jam', type: 'html', html: `<div class="jamtot" id="jam-tot"></div><button type="button" class="btn sm" id="jam-auto" style="margin-top:8px">${icon('spark')} Isi ulang otomatis (170 menit × 16 per SKS)</button>` }],
          onOpen: (dr) => {
            const g = (n) => +dr.querySelector(`[name="${n}"]`).value || 0, el = dr.querySelector('#jam-tot');
            const up = () => { const tot = jd.tm + g('jamTerstruktur') + g('jamMandiri') + g('jamTerbimbing'), sel = tot - jd.target; el.innerHTML = `Tatap muka 16 pertemuan <b>${fmt(jd.tm)}</b> menit + tugas = <b>${fmt(tot)} menit (${fmt(tot / 60, 1)} jam)</b>. Target ${jd.sks} SKS × 170 menit × 16 pertemuan = ${fmt(jd.target)} menit (${fmt(jd.target / 60, 1)} jam). ${Math.abs(sel) <= 30 ? '<span class="st ok">Sesuai</span>' : `<span class="st near">${sel > 0 ? 'Lebih' : 'Kurang'} ${fmt(Math.abs(sel))} menit</span>`}`; };
            dr.querySelectorAll('[name^="jam"]').forEach(i => i.addEventListener('input', up));
            dr.querySelector('#jam-auto').onclick = () => { dr.querySelector('[name="jamTerstruktur"]').value = jd.terstruktur; dr.querySelector('[name="jamMandiri"]').value = jd.mandiri; up(); };
            up();
          },
          onSave: async (o) => {
            if (o.jamTerstruktur == null || o.jamMandiri == null) return 'Tugas terstruktur dan tugas mandiri wajib diisi (menit per semester).';
            o.bahanList = o._bahan; o.bahan = gabungBahan(o._bahan);
            o.syaratIds = o._syarat; if (o._syarat.length) o.syarat = o._syarat.map(id => (kandidat.find(x => x.id === id) || {}).nama).filter(Boolean).join('; '); else if (!lamaSyarat) o.syarat = '';
            o.pustaka = gabungUtama(o._pusU); o.pustakaPendukung = gabungPend(o._pusP);
            ['_bahan', '_syarat', '_pusU', '_pusP', '_jam'].forEach(k => delete o[k]);
            turunkanDok(o); await save('rps', o, `Ubah deskripsi RPS ${m.nama}`); draw();
          } });
      };
      R.querySelectorAll('[data-sap]').forEach(bt => bt.onclick = (ev) => {
        ev.stopPropagation();
        const i = +bt.dataset.sap, p = r.pertemuan[i], pm = pecahMateri(p.materi), ind = pecahIndikator(p.indikator);
        const subTeks = (p.sub || []).map(id => S.sub.find(x => x.id === id)).filter(Boolean);
        const ring = `<div class="subinfo"><div class="small muted">Dasar dari RPS pertemuan ini (diubah di lembar Pertemuan, bukan di sini)</div>${subTeks.map(x => `<div class="si"><b>${esc(x.kode.replace(/^sub-cpmk/i, 'S'))}</b> · ${esc(x.teks)}</div>`).join('') || '<div class="si">Sub-CPMK belum dipilih di RPS.</div>'}${ind.length ? `<div class="si"><b>Indikator</b><br>${ind.map((t, k) => `${p.m}.${k + 1} ${esc(t)}`).join('<br>')}</div>` : ''}<div class="si"><b>Materi</b><br>${esc(pm.isi || '(belum diisi)').replace(/\n/g, '<br>')}</div></div>`;
        const obj = { judul: p.judul || '', ...Object.fromEntries(Object.entries(p.sap || {}).map(([k, v]) => ['sap_' + k, v])) };
        formDrawer({ title: `SAP Pertemuan ${p.m}${p.ujian ? ' · ' + p.ujian : ''}`, sub: m.nama, obj, full: true,
          fields: [{ k: '_ring', type: 'html', html: ring }, { k: 'judul', label: 'Judul topik SAP (boleh kosong, terisi dari poin pertama materi)', full: true },
            ...(p.ujian ? [{ k: 'sap_soal', label: 'Butir soal ujian atau ringkasan kisi-kisi (satu per baris)', type: 'textarea', rows: 6 }] : [{ k: 'sap_pendahuluan', label: 'Pendahuluan', type: 'textarea', rows: 3 }, { k: 'sap_inti', label: 'Kegiatan inti', type: 'textarea', rows: 6 }, { k: 'sap_penutup', label: 'Penutup', type: 'textarea', rows: 3 }, { k: 'sap_media', label: 'Media dan alat (satu per baris)', type: 'textarea', rows: 3 }, { k: 'sap_soal', label: 'Butir soal atau penugasan non tes (satu per baris)', type: 'textarea', rows: 3 }])],
          onSave: async (o) => { const sap = {}; Object.keys(o).filter(k => k.startsWith('sap_')).forEach(k => { sap[k.slice(4)] = o[k]; }); r.pertemuan[i] = { ...p, judul: o.judul, sap }; if (r.status === 'disahkan') r.status = 'draf'; turunkanDok(r); await save('rps', r, `Ubah SAP ${m.nama} pertemuan ${p.m}`); draw(); } });
      });
      R.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => {
        const i = +tr.dataset.i, p = r.pertemuan[i];
        const tmP = (+m.T || 0) * P.menitTeori + (+m.P || 0) * durasi(m, P), pm = pecahMateri(p.materi), opsPus = opsiPustaka(r);
        const infoSub = (ids) => ids.length ? ids.map(id => { const s = S.sub.find(x => x.id === id); if (!s) return ''; const c = S.cpmk.find(x => x.id === s.cpmk); return `<div class="si"><b>${esc(s.kode.replace(/^sub-cpmk/i, 'S'))}</b>${c ? ' · ' + esc(c.kode) : ''}${s.bobot != null ? ` · bobot ${fmt(s.bobot, 1)}%` : ''}<br>${esc(s.teks)}</div>`; }).join('') + `<div class="small muted">Pastikan materi, metode, dan indikator di bawah sesuai dengan rumusan Sub-CPMK ini.</div>` : '<div class="small muted">Klik Sub-CPMK untuk melihat isinya.</div>';
        const flat = { ...p, ...Object.fromEntries(Object.entries(p.sap || {}).map(([k, v]) => ['sap_' + k, v])), _isi: pm.isi, _pus: pm.pus, _indikator: pecahIndikator(p.indikator), _tatap: pecahBaris(p.tatap), _daring: pecahBaris(p.daring), _teknik: teknikDari(p.asesmen).map(x => x.id) };
        formDrawer({ title: `Pertemuan ${p.m}${p.ujian ? ' · ' + p.ujian : ''}`, sub: `${m.nama} · durasi tatap muka ${m.T ? m.T * P.menitTeori + ' menit teori' : ''}${m.T && m.P ? ' + ' : ''}${m.P ? m.P * durasi(m, P) + ' menit praktik' : ''}`, obj: flat, full: true,
          fields: [{ k: 'sub', label: '1. Sub-CPMK yang dicapai', type: 'multi', opts: subs.map(s => ({ v: s.id, t: s.kode.replace(/^sub-cpmk/i, 'S'), title: s.teks })), info: infoSub },
            { k: '_indikator', label: '2. Indikator penilaian (satu kotak per indikator; tiga per Sub-CPMK, nomor otomatis)', type: 'list', nomor: (i) => `${p.m}.${i + 1}`, tambah: 'Tambah indikator', ph: 'Misalnya: Ketepatan menjelaskan struktur dan cara kerja JFET' },
            { k: '_teknik', label: '3. Teknik asesmen (pilih; kriteria atau rubrik mengikuti otomatis)', type: 'multi', opts: TEKNIK.map(x => ({ v: x.id, t: `${x.nama} · Rubrik ${x.rubrik}`, title: `${x.nama} dinilai dengan Rubrik ${x.rubrik} (${RUBRIK[x.rubrik].judul})` })), info: (ids) => ids.length ? `<div class="si"><b>Kriteria:</b> ${ids.map(id => { const x = TEKNIK.find(t => t.id === id); return esc(`Rubrik ${x.rubrik} (${x.rubrik === 'K1' ? 'Ujian Tulis' : x.nama})`); }).join(', ')}<br><b>Teknik:</b> ${ids.map(id => esc(TEKNIK.find(t => t.id === id).nama)).join(', ')}</div>` : '<div class="small muted">Teknik adalah cara menilai (misalnya tes tulis, laporan). Kriteria adalah rubrik penilaian yang dipakai untuk teknik itu, jadi cukup memilih teknik.</div>' },
            { k: '_tatap', label: '4. Tatap muka (bentuk, metode, alokasi waktu TM, penugasan PT)', type: 'list', paket: tatapDef(m, P, durasi(m, P), p.ujian ? 0 : p.m), quick: [...tatapDef(m, P, durasi(m, P), p.ujian ? 0 : p.m), ...METODE_DEF.map(x => `Metode: ${x}`)], nomor: false, tambah: 'Tambah isian sendiri', ph: 'Misalnya: Bentuk: Kuliah Offline' },
            { k: '_daring', label: '5. Daring (bila ada)', type: 'list', paket: daringDef(m, P, durasi(m, P), p.ujian ? 0 : p.m), quick: daringDef(m, P, durasi(m, P), p.ujian ? 0 : p.m), nomor: false, tambah: 'Tambah isian sendiri', ph: 'Misalnya: Bentuk: Kuliah Tatap Maya' },
            { k: '_isi', label: '6. Materi Pembelajaran', type: 'textarea', rows: 8, help: 'Ketik, atau tempel dari RPS lama. Pustaka dipilih di kotak berikutnya, tidak perlu diketik di sini.' },
            { k: '_pus', label: '7. Daftar pustaka pertemuan ini (pilih dari daftar pustaka, lalu tulis babnya)', type: 'listpus', opts: opsPus, tambah: 'Tambah pustaka', nomor: false, help: opsPus.length ? '' : 'Daftar pustaka belum ada. Isi dulu di tombol Deskripsi & pustaka.' },
            { k: 'bobot', label: '8. Bobot penilaian (%)', type: 'number', step: '0.1' },
            ...(p.ujian ? [] : [{ k: 'riset', label: '9. Penelitian atau PKM yang diintegrasikan (pilih dari daftar pengampu)', type: 'multi', opts: opsiRiset(S, m).map(e => ({ v: e.id, t: `${e.jenis}: ${short(e.judul, 60)}${e.tahun ? ' (' + e.tahun + ')' : ''}`, title: labelRiset(S, e) })) },
              { k: 'bentuk', label: '10. Integrasi: dipakai sebagai', type: 'select', opts: [{ v: '', t: 'Pilih bentuk' }, ...BENTUK.map(v => ({ v, t: v })), { v: 'Lainnya', t: 'Lainnya (tulis sendiri)' }] }, { k: 'bentukLain', label: 'Bila memilih Lainnya, tulis bentuknya', ph: 'Contoh: Materi pengayaan, tugas proyek akhir' },
              ...(p.integ && !(p.riset || []).length ? [{ k: 'integ', label: 'Penandaan lama tanpa judul (ganti dengan pilihan dari daftar, atau kosongkan)', type: 'select', opts: INTEG.map(v => ({ v, t: v || 'Tidak ada' })) }] : []),
              { k: 'integUraian', label: 'Kaitan dengan materi (boleh kosong, terisi otomatis dari pilihan penelitian atau PKM)', type: 'textarea', rows: 2 }]),
            { k: '_sapnote', type: 'html', html: `<div class="ribbon info">${icon('info')} <span><b>SAP diisi terpisah</b> lewat tombol pada kolom SAP di tabel RPS. Judul, Sub-CPMK, indikator, dan materi di sini otomatis menjadi dasar SAP, jadi tidak perlu diisi dua kali.</span></div>` }],
          onDelete: nPert > 16 ? async () => { r.pertemuan.splice(i, 1); r.pertemuan.forEach((x, k) => { x.m = k + 1; }); if (r.status === 'disahkan') r.status = 'draf'; turunkanDok(r); await save('rps', r, `Hapus pertemuan ${p.m} dari RPS ${m.nama}`); draw(); } : null,
          extra: p.ujian || opsiRiset(S, m).length ? '' : `<div class="ribbon info" style="margin-top:10px">${icon('info')} Daftar penelitian atau PKM pengampu masih kosong. Isi dulu di menu <a href="#riset"><b>Penelitian & PKM Dosen</b></a> (bisa unggah Excel), lalu kembali ke sini.</div>`,
          onSave: async (o) => { o.materi = gabungMateri(o._isi, o._pus); { const mt = (o._tatap || []).map(l => (l.match(/^(?:bentuk|metode)\s*:\s*(.+)$/i) || [])[1]).filter(Boolean); if (mt.length) o.metode = mt.join('; '); } o.indikator = (o._indikator || []).join('\n'); o.tatap = (o._tatap || []).join('\n'); o.daring = (o._daring || []).join('\n'); if ((o._teknik || []).length) o.asesmen = o._teknik.map(id => TEKNIK.find(t => t.id === id).nama).join(', '); else if (teknikDari(p.asesmen).length) o.asesmen = ''; ['_teknik', '_isi', '_pus', '_indikator', '_tatap', '_daring'].forEach(k => delete o[k]); const sap = {}; Object.keys(o).filter(k => k.startsWith('sap_')).forEach(k => { sap[k.slice(4)] = o[k]; delete o[k]; }); if ((o.riset || []).length) { o.integ = jenisInteg(S, o.riset); if (!String(o.integUraian || '').trim()) { const e0 = riset(S, o.riset[0]); o.integUraian = `${(o.bentuk === 'Lainnya' ? (o.bentukLain || 'Lainnya') : o.bentuk) || 'Bahan ajar'}: ${e0 ? e0.judul : ''}${o.riset.length > 1 ? ` dan ${o.riset.length - 1} lainnya` : ''}.`; } } else if (p.riset && p.riset.length && !('integ' in o && o.integ)) o.integ = '';
            r.pertemuan[i] = { ...o, sap, m: p.m, ujian: p.ujian }; { const r2 = ringkasIntegrasi(S, m, r); if (r2.entri.length) { r.penelitian = teksRiset(S, r2.entri, 'Penelitian'); r.pkm = teksRiset(S, r2.entri, 'PKM'); } } if (r.status === 'disahkan') r.status = 'draf'; turunkanDok(r); await save('rps', r, `Ubah RPS ${m.nama} pertemuan ${p.m}`); draw(); } });
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
    const aju = q('#aju'); if (aju) aju.onclick = async () => { const badAju = periksaRps(m, r).filter(c => c.k === 'bad'); if (badAju.length) { toast('Belum bisa diajukan: ' + badAju.map(c => c.butir).join('; ') + '.'); return; } const al = alasanRps(m, r); if (al) { toast('Belum bisa diajukan: ' + al + '.'); return; } if (salahJml) { toast(`Jumlah pertemuan ${nPert}, seharusnya 16. Perbaiki dulu.`); return; } if (lk < 99) { toast('Lengkapi 16 pertemuan sebelum mengajukan.'); return; } for (const v of verifOf(m.id).filter(x => x.status === 'perbaiki')) await save('jadwal', { ...v, status: 'diperbaiki', tglPerbaikan: new Date().toISOString().slice(0, 10) });
      r.status = 'diajukan'; r.tgl = new Date().toISOString().slice(0, 10); await save('rps', r, `Ajukan RPS ${m.nama}`); draw(); };
    const sah = q('#sah'); if (sah) sah.onclick = async () => { const al = alasanRps(m, r); if (al) { toast('Belum bisa disahkan: ' + al + '.'); return; } if (salahJml) { toast(`Jumlah pertemuan ${nPert}, seharusnya 16. Kembalikan ke dosen untuk diperbaiki.`); return; } r.status = 'disahkan'; r.oleh = 'Kaprodi ' + m.prodi; r.tgl = new Date().toISOString().slice(0, 10); await save('rps', r, `Sahkan RPS ${m.nama}`); draw(); };
    const bt = q('#batal'); if (bt) bt.onclick = async () => { if (!(await tanya(`Pengesahan RPS ${m.nama} dibatalkan dan statusnya kembali menjadi draf, sehingga dosen dapat merevisi. Lanjutkan?`, 'Batalkan pengesahan'))) return; r.status = 'draf'; r.oleh = ''; r.tgl = ''; await save('rps', r, `Batalkan pengesahan RPS ${m.nama}`); draw(); };
    const tl = q('#tolak'); if (tl) tl.onclick = () => formVerif(m, { statusAwal: 'perbaiki', wajib: true, judul: 'Kembalikan RPS ke dosen: tulis alasannya', onDone: async (o) => { if (o.status === 'perbaiki') { r.status = 'draf'; await save('rps', r, `Kembalikan RPS ${m.nama} ke dosen`); } draw(); } });
    ikatVerif(R, m, draw);
    q('#print').onclick = () => cetakRps(m, r);
    q('#print-sap').onclick = () => cetakDok('Satuan Acara Pembelajaran (SAP)', badanSap(m, r, true), () => berkasDocxSap(m, r), namaBerkasSap(m));
    q('#print-acp').onclick = () => cetakDok('Analisis Capaian Pembelajaran (ACP)', badanAcp(m, r, true), () => berkasDocxAcp(m, r), namaBerkasAcp(m));
    q('#unduh-paket').onclick = async () => { try { unduh(await berkasDocxRps(m, r), namaBerkasRps(m)); await new Promise(z => setTimeout(z, 400)); unduh(await berkasDocxSap(m, r), namaBerkasSap(m)); await new Promise(z => setTimeout(z, 400)); unduh(await berkasDocxAcp(m, r), namaBerkasAcp(m)); toast('Tiga berkas Word diunduh: RPS, SAP, dan ACP.'); } catch (e) { console.error(e); toast('Berkas Word gagal dibuat. ' + e.message); } };
    q('#asis').onclick = () => bukaAsistenRps(m, draw, blankRps);
    q('#gen-dok').onclick = () => bukaGeneratorDok(m, draw);
  };
  tombolUnggahRps(el, draw);
  draw();
}

function cetakDok(judul, badan, buatWord, nama) {
  openDrawer(`<div class="no-print filters"><button class="btn pri" onclick="window.print()">${icon('download')} Cetak / simpan PDF</button><button class="btn" id="rep-doc">${icon('download')} Unduh Word</button><button class="btn ghost" data-close>Tutup</button></div>
  <div class="report rps-doc" id="rep" title="${esc(judul)}">${badan}</div>`, (dr) => {
    dr.querySelector('#rep-doc').onclick = async () => { try { unduh(await buatWord(), nama); } catch (e) { console.error(e); toast('Berkas Word gagal dibuat. ' + e.message); } };
  }, true);
}

function cetakRps(m, r) {
  openDrawer(`<div class="no-print filters"><button class="btn pri" onclick="window.print()">${icon('download')} Cetak / simpan PDF</button><button class="btn" id="rep-doc">${icon('download')} Unduh Word (format templat)</button><button class="btn ghost" data-close>Tutup</button></div>
  <div class="report rps-doc" id="rep">${badanRps(m, r, true)}</div>`, (dr) => {
    dr.querySelector('#rep-doc').onclick = async () => { try { unduh(await berkasDocxRps(m, r), namaBerkasRps(m)); } catch (e) { console.error(e); toast('Berkas Word gagal dibuat. ' + e.message); } };
  }, true);
  void closeDrawer;
}
