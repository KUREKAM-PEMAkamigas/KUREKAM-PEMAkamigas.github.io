/* KUREKAM PEM Akamigas · Aplikasi utama: state, peran, router, dan utilitas bersama. */
import { APP, PERAN, MENU_PERAN, DEVELOPER_SHA } from './config.js';
import { terimaTautanFirebase, DB } from './db.js';
import { buildSeed } from './seed.js';
import { icon } from './icons.js';
import { disposeAll, tilt } from './charts.js';
import { disposeHero } from './hero3d.js';

import beranda from './views/beranda.js';
import { pimpinan, mutu, akademik } from './views/dasbor.js';
import { visiView, cplView, bkView, mkView } from './views/susun.js';
import { petaView, matriksView } from './views/peta.js';
import { cpmkView, rpsView } from './views/ajar.js';
import bebanView from './views/beban.js';
import { periksaView, bloomView, revisiView, laporanView } from './views/evaluasi.js';
import indukView from './views/induk.js';
import bebanProdiView from './views/bebanprodi.js';
import asistenView from './views/asisten.js';

/* ---------------- state ---------------- */
export const S = { prodi: [], dosen: [], pl: [], cpl: [], bok: [], bk: [], mk: [], cpmk: [], sub: [], rps: [], tugas: [], revisi: [], lama: [], ajar: [], pengguna: [], log: [], settings: {} };
const CTX_KEY = 'kurekam_ctx';
export const ctx = (() => {
  const d = { role: 'wadir', prodi: 'TP', dosen: 'D-TP-01' };
  try { return Object.assign(d, JSON.parse(localStorage.getItem(CTX_KEY) || '{}')); } catch (e) { return d; }
})();
export function saveCtx() { try { localStorage.setItem(CTX_KEY, JSON.stringify({ role: ctx.role, prodi: ctx.prodi, dosen: ctx.dosen })); } catch (e) { /* abaikan */ } }

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
export const uid = (p) => p + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export function userName() {
  if (ctx.role === 'prodi') return 'Tim Kurikulum ' + ctx.prodi;
  if (ctx.role === 'dosen') return (S.dosen.find(d => d.id === ctx.dosen) || {}).nama || 'Dosen';
  return PERAN[ctx.role].nama;
}

/** Menu yang boleh dibuka peran aktif. */
export function bolehMenu(id) { const m = MENU_PERAN[ctx.role]; return !m || m.includes(id); }
/** Peran yang boleh dipilih akun ini. Tanpa daftar pengguna (masa penyiapan atau mode demo) semua peran bisa dicoba. */
export function peranAkun() { return ctx.kunci ? (ctx.izin || []) : Object.keys(PERAN).filter(k => k !== 'developer'); }
let sidikDev = false;
async function cekDeveloper() {
  sidikDev = false; const em = DB.user && DB.user.email ? DB.user.email.toLowerCase() : ''; if (!em || !window.crypto || !crypto.subtle) return;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kurekam:' + em)); sidikDev = DEVELOPER_SHA.includes(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')); } catch (e) { /* abaikan */ }
}
function terapkanAkun() {
  ctx.kunci = false; ctx.tanpaPeran = false; ctx.izin = null; ctx.akun = null;
  const em = DB.user && DB.user.email ? DB.user.email.toLowerCase() : '';
  if (!em) { if (ctx.role === 'developer') ctx.role = 'admin'; return; }
  const u = S.pengguna.find(x => (x.email || '').toLowerCase() === em);
  if (sidikDev || (u && (u.peran || []).includes('developer'))) {
    ctx.kunci = true; ctx.akun = u || null; ctx.izin = Object.keys(PERAN).sort((a, b) => (b === 'developer') - (a === 'developer'));
    if (!ctx.izin.includes(ctx.role) || !ctx.pilihDev) ctx.role = ctx.pilihDev || 'developer';
    if (u && u.dosen && !ctx.dosen) ctx.dosen = u.dosen;
    return;
  }
  if (ctx.role === 'developer') ctx.role = 'dosen';
  if (!S.pengguna.length) return;
  ctx.kunci = true;
  if (!u || !(u.peran || []).length) { ctx.tanpaPeran = true; ctx.izin = ['dosen']; ctx.role = 'dosen'; ctx.dosen = ''; return; }
  ctx.akun = u; ctx.izin = u.peran.filter(p => PERAN[p]);
  if (!ctx.izin.includes(ctx.role)) ctx.role = ctx.izin[0];
  if (u.prodi) ctx.prodi = u.prodi;
  ctx.dosen = u.dosen || '';
}
export function muatUlangAkun() { terapkanAkun(); }

/** Hak akses per peran. */
export function can(action, obj = {}) {
  const r = ctx.role;
  if (r === 'admin' || r === 'developer') return true;
  switch (action) {
    case 'susun': return r === 'prodi' && (obj.prodi || ctx.prodi) === ctx.prodi;          // visi s.d. CPMK, penugasan
    case 'rps': {                                                                             // Sub-CPMK, RPS, SAP
      if (r === 'prodi') return (obj.prodi || ctx.prodi) === ctx.prodi;
      if (r === 'dosen') return S.tugas.some(t => t.mk === obj.mk && t.dosen === ctx.dosen);
      return false;
    }
    case 'sahkanRps': return r === 'prodi' && obj.prodi === ctx.prodi;
    case 'sahkanKurikulum': return r === 'wadir';
    case 'revisi': return r === 'wadir';
    case 'catatanSpm': return r === 'spm';
    case 'induk': return r === 'akademik';
    case 'param': return false;
    default: return false;
  }
}

/* ---------------- persistensi ---------------- */
export async function save(col, doc, aksi) {
  const arr = S[col]; const i = arr.findIndex(x => x.id === doc.id);
  if (i >= 0) arr[i] = doc; else arr.push(doc);
  try { await DB.put(col, doc, arr); } catch (e) { toast('Gagal menyimpan: ' + e.message); return; }
  if (aksi) await addLog(aksi);
}
export async function saveMany(col, docs, aksi) {
  docs.forEach(doc => { const i = S[col].findIndex(x => x.id === doc.id); if (i >= 0) S[col][i] = doc; else S[col].push(doc); });
  try { if (DB.mode === 'firebase') { for (const d of docs) await DB.put(col, d, S[col]); } else await DB.put(col, docs[0] || {}, S[col]); } catch (e) { toast('Gagal menyimpan: ' + e.message); }
  if (aksi) await addLog(aksi);
}
export async function remove(col, id, aksi) {
  S[col] = S[col].filter(x => x.id !== id);
  try { await DB.del(col, id, S[col]); } catch (e) { toast('Gagal menghapus: ' + e.message); }
  if (aksi) await addLog(aksi);
}
export async function saveSettings() { const doc = Object.assign({ id: 'app' }, S.settings); try { await DB.put('settings', doc, [doc]); } catch (e) { toast('Gagal menyimpan pengaturan'); } }
export async function addLog(aksi) {
  const doc = { id: 'LOG' + Date.now() + Math.floor(Math.random() * 1000), t: new Date().toISOString(), user: userName() + (DB.user && DB.user.email ? ' · ' + DB.user.email : ''), aksi };
  S.log.unshift(doc); if (S.log.length > 400) S.log.length = 400;
  try { await DB.put('log', doc, S.log); } catch (e) { /* abaikan */ }
}
export async function resetData() { const d = buildSeed(); for (const c of Object.keys(d)) await DB.replaceAll(c, d[c]); load(d); }
export async function replaceData(d) { for (const c of Object.keys(d)) { if (S[c] !== undefined || c === 'settings') await DB.replaceAll(c, d[c]); } load(d); }
function load(d) {
  Object.keys(S).forEach(k => { if (k === 'pengguna' && !d[k]) return; if (k !== 'settings') S[k] = d[k] || []; });
  S.settings = (d.settings && d.settings[0]) || { id: 'app', paritas: 'ganjil', param: {} };
  S.log.sort((a, b) => (b.t || '').localeCompare(a.t || ''));
}

/* ---------------- drawer ---------------- */
export function openDrawer(html, onMount, wide) {
  closeDrawer();
  const bg = document.createElement('div'); bg.className = 'drawer-bg'; bg.id = 'drawer';
  bg.innerHTML = `<div class="drawer ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeDrawer(); });
  document.body.appendChild(bg);
  bg.querySelectorAll('[data-close]').forEach(x => { x.onclick = closeDrawer; });
  if (onMount) onMount(bg.querySelector('.drawer'));
}
export function closeDrawer() { const d = document.getElementById('drawer'); if (d) d.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

/* ---------------- navigasi ---------------- */
export const ROUTES = [
  { id: 'beranda', t: 'Beranda', ic: 'home', c: '#10b981', sec: 'Ringkasan', v: beranda },
  { id: 'pimpinan', t: 'Dasbor Pimpinan', sub: 'Wakil Direktur I', ic: 'dash', c: '#8b5cf6', sec: 'Ringkasan', v: pimpinan },
  { id: 'mutu', t: 'Dasbor Mutu', sub: 'Unit SPM', ic: 'medal', c: '#f0616d', sec: 'Ringkasan', v: mutu },
  { id: 'akademik', t: 'Dasbor Akademik', sub: 'Kasubbag Akademik', ic: 'calendar', c: '#f5a524', sec: 'Ringkasan', v: akademik },
  { id: 'asisten', t: 'Asisten Kurikulum', sub: 'Pemandu dan generator', ic: 'spark', c: '#f5a524', sec: 'Penyusunan Kurikulum', prodi: true, v: asistenView },
  { id: 'visi', t: 'Visi & Profil Lulusan', ic: 'flag', c: '#10b981', sec: 'Penyusunan Kurikulum', prodi: true, v: visiView },
  { id: 'cpl', t: 'Capaian Pembelajaran Lulusan', ic: 'target', c: '#0ea5e9', sec: 'Penyusunan Kurikulum', prodi: true, v: cplView },
  { id: 'bk', t: 'BoK & Bahan Kajian', ic: 'layers', c: '#8b5cf6', sec: 'Penyusunan Kurikulum', prodi: true, v: bkView },
  { id: 'mk', t: 'Mata Kuliah & SKS', ic: 'book', c: '#14b8a6', sec: 'Penyusunan Kurikulum', prodi: true, v: mkView },
  { id: 'peta', t: 'Peta Kurikulum', ic: 'grid4', c: '#6366f1', sec: 'Penyusunan Kurikulum', prodi: true, v: petaView },
  { id: 'matriks', t: 'Matriks Keterlacakan', ic: 'link', c: '#f472b6', sec: 'Penyusunan Kurikulum', prodi: true, v: matriksView },
  { id: 'cpmk', t: 'CPMK & Sub-CPMK', ic: 'spark', c: '#0ea5e9', sec: 'Pembelajaran', prodi: true, v: cpmkView },
  { id: 'rps', t: 'RPS & SAP', ic: 'audit', c: '#10b981', sec: 'Pembelajaran', prodi: true, v: rpsView },
  { id: 'beban', t: 'Penugasan & Beban Dosen', ic: 'user', c: '#f5a524', sec: 'Beban Dosen & Prodi', v: bebanView },
  { id: 'bebanprodi', t: 'Beban Prodi & Kapasitas JP', ic: 'pulse', c: '#0ea5e9', sec: 'Beban Dosen & Prodi', v: bebanProdiView },
  { id: 'periksa', t: 'Pemeriksa Kurikulum', ic: 'check', c: '#10b981', sec: 'Evaluasi & Kawal Mutu', prodi: true, v: periksaView },
  { id: 'bloom', t: 'Taksonomi Bloom', ic: 'sim', c: '#8b5cf6', sec: 'Evaluasi & Kawal Mutu', prodi: true, v: bloomView },
  { id: 'revisi', t: 'Revisi & Pengesahan', ic: 'loop', c: '#6366f1', sec: 'Evaluasi & Kawal Mutu', v: revisiView },
  { id: 'laporan', t: 'Laporan & Cetak', ic: 'download', c: '#14b8a6', sec: 'Evaluasi & Kawal Mutu', prodi: true, v: laporanView },
  { id: 'induk', t: 'Data Induk & Pengaturan', ic: 'db', c: '#64748b', sec: 'Sistem', v: indukView }
];

function renderSide(cur) {
  let sec = '', h = `<div class="brand-logos"><img src="assets/img/logo-pem-akamigas.png" alt="PEM Akamigas" class="lg-pem"><img src="assets/img/logo-esdm.png" alt="Kementerian ESDM" class="lg-esdm"></div>
    <div class="brand"><div class="brand-logo k">${icon('layers')}</div><div><b>${APP.nama}</b><small>${APP.panjang}</small></div></div><nav class="nav">`;
  ROUTES.filter(r => bolehMenu(r.id)).forEach(r => {
    if (r.sec !== sec) { sec = r.sec; h += `<div class="nav-sec">${sec}</div>`; }
    h += `<a href="#${r.id}" class="${r.id === cur ? 'on' : ''}" style="--c:${r.c}"><span class="chip">${icon(r.ic)}</span><span>${r.t}${r.sub ? `<small class="nsub">${r.sub}</small>` : ''}</span></a>`;
  });
  h += `</nav><div class="side-foot">${APP.institusi}<br>Kurikulum ${APP.tahunKurikulum} · ${DB.mode === 'firebase' ? 'Firestore' : 'Mode demo lokal'}</div>`;
  $('#side').innerHTML = h;
  $$('#side a').forEach(a => a.addEventListener('click', () => $('#side').classList.remove('open')));
}

function renderTop(route) {
  const prodiOpts = S.prodi.map(p => `<option value="${p.id}" ${p.id === ctx.prodi ? 'selected' : ''}>${p.id}</option>`).join('');
  const dosenOpts = S.dosen.map(d => `<option value="${d.id}" ${d.id === ctx.dosen ? 'selected' : ''}>${esc(d.nama)}</option>`).join('');
  $('#top').innerHTML = `
    <button class="btn ghost menu-btn" id="menuBtn" aria-label="Menu">${icon('menu')}</button>
    <div><div class="crumb">${route.sec}</div><h1>${route.t}</h1></div>
    <div class="sp"></div>
    ${ctx.kunci && ctx.role === 'prodi' && ctx.akun && ctx.akun.prodi ? `<span class="tag" style="--c:#10b981">Prodi ${esc(ctx.prodi)}</span>` : route.prodi || ctx.role === 'prodi' ? `<div class="role-box"><span class="rl muted small">Prodi</span><select class="inp" id="prodiSel" aria-label="Program studi">${prodiOpts}</select></div>` : ''}
    <div class="role-box">
      <span class="ico-badge" style="--c:${PERAN[ctx.role].c};width:32px;height:32px">${icon('user')}</span>
      <select class="inp" id="roleSel" aria-label="Peran">${peranAkun().map(k => `<option value="${k}" ${k === ctx.role ? 'selected' : ''}>${PERAN[k].nama}</option>`).join('')}</select>
      ${ctx.role === 'dosen' && (!ctx.kunci || sidikDev) ? `<select class="inp rl" id="dosenSel" aria-label="Dosen">${dosenOpts}</select>` : ''}
    </div>
    ${DB.user ? `<button class="btn" id="sandiBtn" title="${esc(DB.user.email)}">${icon('gear')} Kata sandi</button>` : ''}
    ${DB.user ? `<button class="btn" id="logoutBtn">${icon('logout')} Keluar</button>` : ''}`;
  $('#menuBtn').onclick = () => $('#side').classList.toggle('open');
  $('#roleSel').onchange = e => { ctx.role = e.target.value; ctx.pilihDev = ctx.role; saveCtx(); route_(); };
  const gs = $('#sandiBtn'); if (gs) gs.onclick = formSandi;
  const ps = $('#prodiSel'); if (ps) ps.onchange = e => { ctx.prodi = e.target.value; saveCtx(); route_(); };
  const ds = $('#dosenSel'); if (ds) ds.onchange = e => { ctx.dosen = e.target.value; saveCtx(); route_(); };
  const lo = $('#logoutBtn'); if (lo) lo.onclick = async () => { await DB.logout(); location.reload(); };
}

export function route_() {
  const id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'beranda';
  let r = ROUTES.find(x => x.id === id) || ROUTES[0];
  if (!bolehMenu(r.id)) { r = ROUTES[0]; try { history.replaceState(null, '', location.pathname + location.search + '#beranda'); } catch (e) { /* abaikan */ } }
  disposeAll(); disposeHero(); closeDrawer();
  renderSide(r.id); renderTop(r);
  const view = $('#view');
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  view.innerHTML = APP.dataContoh && S.settings.demo !== false ? `<div class="ribbon">${icon('info')} Mode demo: struktur semester, MK kunci, dan kelas mengikuti Buku Pedoman 2027 (draf). Nama MK ruang prodi, rumusan CPL/CPMK, RPS, dan nama dosen adalah data contoh sampai prodi mengisi atau mengimpor Excel matriks.</div>` : '';
  if (ctx.akun && ctx.akun.sandiAwal && !ctx.akun.sandiDiubah) view.innerHTML += `<div class="ribbon info">${icon('info')} Anda masih memakai kata sandi awal dari admin. Demi keamanan, ganti lewat tombol Kata sandi di kanan atas.</div>`;
  if (ctx.tanpaPeran) view.innerHTML += `<div class="ribbon bad">${icon('alert')} Akun ${esc(DB.user.email)} belum diberi peran di KUREKAM, sehingga hanya dapat melihat. Hubungi admin untuk didaftarkan di Data Induk, tab Pengguna dan peran.</div>`;
  const holder = document.createElement('div'); view.appendChild(holder);
  try { r.v(holder); } catch (e) { console.error(e); holder.innerHTML = `<div class="card empty">Terjadi kesalahan saat memuat halaman: ${esc(e.message)}</div>`; }
  tilt(view);
  window.scrollTo({ top: 0 });
}
export const rerender = () => route_();

/* Kolom kata sandi dengan tombol lihat dan sembunyikan. */
export const kolomSandi = (id, ph) => `<div style="position:relative"><input class="inp" id="${id}" type="password" placeholder="${ph}" required autocomplete="off" style="width:100%;padding-right:96px"><button type="button" class="btn ghost sm" data-mata="${id}" style="position:absolute;right:4px;top:50%;transform:translateY(-50%)">${icon('eye')} Lihat</button></div>`;
export function pasangMata(root) { root.querySelectorAll('[data-mata]').forEach(b => b.onclick = () => { const i = root.querySelector('#' + b.dataset.mata), buka = i.type === 'password'; i.type = buka ? 'text' : 'password'; b.innerHTML = `${icon('eye')} ${buka ? 'Sembunyikan' : 'Lihat'}`; }); }
function formSandi() {
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('gear')}</span><div><h3>Ganti kata sandi</h3><div class="sub">${esc(DB.user.email)} · alamat email hanya bisa diubah admin</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <form id="gs" style="display:grid;gap:10px;margin-top:12px">${kolomSandi('gs-l', 'Kata sandi sekarang')}${kolomSandi('gs-b', 'Kata sandi baru, minimal 8 karakter')}${kolomSandi('gs-u', 'Ulangi kata sandi baru')}<div class="muted small" id="gs-msg"></div>
    <div class="drawer-act"><div class="sp"></div><button type="button" class="btn ghost" data-close>Batal</button><button class="btn pri" type="submit">${icon('check')} Simpan kata sandi</button></div></form>`, (dr) => {
    pasangMata(dr);
    dr.querySelector('#gs').onsubmit = async ev => {
      ev.preventDefault(); const l = dr.querySelector('#gs-l').value, b = dr.querySelector('#gs-b').value, u = dr.querySelector('#gs-u').value, msg = dr.querySelector('#gs-msg');
      if (b.length < 8) { msg.textContent = 'Kata sandi baru minimal 8 karakter.'; return; }
      if (b !== u) { msg.textContent = 'Ulangan kata sandi baru tidak sama.'; return; }
      if (b === l) { msg.textContent = 'Kata sandi baru harus berbeda dari yang sekarang.'; return; }
      try { await DB.gantiSandi(l, b); } catch (e) { msg.textContent = /wrong-password|invalid-credential|invalid-login/.test(e.code || '') ? 'Kata sandi sekarang tidak cocok.' : 'Gagal mengganti: ' + e.message; return; }
      const em = DB.user.email.toLowerCase(), a = S.pengguna.find(x => (x.email || '').toLowerCase() === em);
      if (a) { a.sandiDiubah = new Date().toISOString(); await save('pengguna', a); }
      await addLog('Mengganti kata sandi akun');
      closeDrawer(); toast('Kata sandi berhasil diganti.'); route_();
    };
  });
}

function loginForm() {
  return new Promise(resolve => {
    const v = $('#view');
    v.innerHTML = `<div class="card" style="max-width:440px;margin:40px auto"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('db')}</span><div><h3>Masuk ke KUREKAM</h3><div class="sub">Akun sama dengan SIMANTAP (Firebase).</div></div></div>
      <form id="lgn" style="display:grid;gap:10px;margin-top:12px"><input class="inp" id="lg-e" type="email" placeholder="Email" required>${kolomSandi('lg-p', 'Kata sandi')}
      <button class="btn pri" type="submit">Masuk</button><div class="muted small" id="lg-msg"></div><div class="small"><a href="#" id="lg-lupa">Lupa kata sandi</a> · <a href="#" id="lg-local">Buka mode demo lokal</a></div></form></div>`;
    v.querySelector('#lgn').onsubmit = async ev => { ev.preventDefault(); try { await DB.login(v.querySelector('#lg-e').value.trim(), v.querySelector('#lg-p').value); resolve(); } catch (e) { v.querySelector('#lg-msg').textContent = 'Gagal masuk: ' + e.message; } };
    pasangMata(v);
    v.querySelector('#lg-lupa').onclick = async ev => { ev.preventDefault(); const em = v.querySelector('#lg-e').value.trim(), msg = v.querySelector('#lg-msg'); if (!em) { msg.textContent = 'Isi email lebih dulu, lalu klik Lupa kata sandi.'; return; } try { await DB.kirimReset(em); msg.textContent = 'Bila email terdaftar, tautan untuk membuat kata sandi baru sudah dikirim ke ' + em + '. Periksa juga folder spam.'; } catch (e) { msg.textContent = 'Gagal mengirim: ' + e.message; } };
    v.querySelector('#lg-local').onclick = ev => { ev.preventDefault(); DB.useLocal(); resolve(); };
  });
}

async function boot() {
  terimaTautanFirebase();
  const demo = new URLSearchParams(location.search).has('demo');
  if (demo) DB.useLocal(); else await DB.init();
  if (DB.needLogin) await loginForm();
  let d = await DB.loadAll();
  const st = d.settings && d.settings[0];
  if (!d.mk.length || !st || (st.seedVersi || 0) < APP.seedVersi) { d = buildSeed(); for (const c of Object.keys(d)) await DB.replaceAll(c, d[c]); }
  /* migrasi ringan: RPS contoh mendapat isian integrasi penelitian dan PKM tanpa menghapus data pengguna */
  if (st && !st.integ5 && d.rps.length && !d.rps.some(r => (r.pertemuan || []).some(p => p.integ))) {
    const fresh = buildSeed(); let n = 0;
    for (const r of d.rps) { const f = fresh.rps.find(x => x.id === r.id); if (!f || !(f.pertemuan || []).some(p => p.integ)) continue; r.penelitian = r.penelitian || f.penelitian || ''; r.pkm = r.pkm || f.pkm || ''; (r.pertemuan || []).forEach((p, i) => { const q = (f.pertemuan || [])[i]; if (q && q.integ && !p.integ) { p.integ = q.integ; p.integUraian = q.integUraian || ''; } }); n++; }
    if (n) await DB.replaceAll('rps', d.rps);
  }
  if (st && !st.integ5) { st.integ5 = true; await DB.replaceAll('settings', [st]); }
  load(d);
  await cekDeveloper();
  terapkanAkun();
  window.addEventListener('hashchange', route_);
  route_();
}
boot().catch(e => { console.error(e); $('#view').innerHTML = `<div class="card empty">Gagal memulai aplikasi: ${esc(e.message)}</div>`; });

export { icon };
