/* KUREKAM · Pemuat awal. Urutan: (1) Firebase dan halaman masuk tampil lebih dulu dengan berkas ringan,
   (2) sambil pengguna mengetik, grafik dan modul aplikasi diunduh di latar, (3) setelah masuk langsung memuat data.
   Keluar tidak memuat ulang halaman, hanya kembali ke formulir masuk.
   Di situs resmi tidak ada mode demo: tanpa sambungan Firebase aplikasi tidak dibuka. Data contoh hanya lewat
   Simulasi (khusus developer, setelah masuk), atau saat dijalankan dari komputer pengembang dan pratinjau berbingkai. */
import { terimaTautanFirebase, DB } from './db.js';
import { loginForm } from './auth-ui.js';

const $ = (s) => document.querySelector(s);
const dalamBingkai = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const BEBAS = ['localhost', '127.0.0.1'].includes(location.hostname) || dalamBingkai;
const muat = (src) => new Promise((res) => { const e = document.createElement('script'); e.async = false; e.src = src; e.onload = res; e.onerror = res; document.head.appendChild(e); });
/* ECharts diunduh bersamaan; async=false menjaga urutan (echarts sebelum echarts-gl). */
const grafik = Promise.all(['assets/vendor/echarts.min.js', 'assets/vendor/echarts-gl.min.js'].map(muat));
const modul = import('./app.js');
const tunggu = (pesan) => { const v = $('#view'); if (v) v.innerHTML = `<div class="empty"><span class="spin"></span> ${pesan}</div>`; };
const teks = (t) => String(t == null ? '' : t).replace(/[<>&"]/g, '');

async function jalan() {
  if (DB.needLogin) await loginForm();
  tunggu('Memuat data kurikulum…');
  const [m] = await Promise.all([modul, grafik]);
  await m.start();
}

/* Tanpa sambungan Firebase di situs resmi: jangan membuka aplikasi dengan data lokal. */
function belumTersambung() {
  const v = $('#view');
  v.innerHTML = `<div class="card" style="max-width:520px;margin:40px auto"><h3>Aplikasi belum tersambung ke basis data</h3>
    <p class="small" style="margin:8px 0">${DB.error ? 'Sambungan ke Firebase gagal: ' + teks(DB.error) + '. ' : 'Perangkat ini belum menyimpan pengaturan sambungan. '}Minta tautan sambungan dari admin (menu Data Induk, tab Basis data, tombol Salin tautan untuk HP atau perangkat lain), lalu tempel di bawah. Tautan itu hanya perlu dipakai sekali per perangkat.</p>
    <form id="bt" style="display:grid;gap:10px"><input class="inp" id="bt-l" placeholder="Tempel tautan sambungan di sini" required><button class="btn pri" type="submit">Hubungkan</button><button class="btn" type="button" id="bt-u">Coba lagi</button><div class="muted small" id="bt-m"></div></form></div>`;
  $('#bt-u').onclick = () => location.reload();
  $('#bt').onsubmit = (ev) => {
    ev.preventDefault();
    try { const u = new URL($('#bt-l').value.trim()); if (!u.searchParams.get('fb')) throw new Error('x'); location.href = location.pathname + '?fb=' + encodeURIComponent(u.searchParams.get('fb')) + '#beranda'; }
    catch (e) { $('#bt-m').textContent = 'Tautan tidak dikenali. Pastikan menyalin seluruh tautan dari admin.'; }
  };
}

async function mulai() {
  terimaTautanFirebase();
  const demo = BEBAS && new URLSearchParams(location.search).has('demo');
  if (demo) DB.useLocal(); else await DB.init();
  if (!demo && DB.mode !== 'firebase' && !BEBAS) { belumTersambung(); return; }
  await jalan();
}
window.addEventListener('kurekam:keluar', () => { jalan().catch(gagal); });
const gagal = (e) => { console.error(e); const v = $('#view'); if (v) v.innerHTML = `<div class="card empty">Gagal memulai aplikasi: ${teks(e.message || e)}</div>`; };
mulai().catch(gagal);
