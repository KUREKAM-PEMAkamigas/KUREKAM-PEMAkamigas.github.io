/* KUREKAM · Pemuat awal. Urutan: (1) Firebase dan halaman masuk tampil lebih dulu dengan berkas ringan,
   (2) sambil pengguna mengetik, grafik dan modul aplikasi diunduh di latar, (3) setelah masuk langsung memuat data.
   Keluar tidak memuat ulang halaman, hanya kembali ke formulir masuk. */
import { terimaTautanFirebase, DB } from './db.js';
import { loginForm } from './auth-ui.js';

const $ = (s) => document.querySelector(s);
const muat = (src) => new Promise((res) => { const e = document.createElement('script'); e.async = false; e.src = src; e.onload = res; e.onerror = res; document.head.appendChild(e); });
/* ECharts diunduh bersamaan; async=false menjaga urutan (echarts sebelum echarts-gl). */
const grafik = Promise.all(['assets/vendor/echarts.min.js', 'assets/vendor/echarts-gl.min.js'].map(muat));
const modul = import('./app.js');
const tunggu = (pesan) => { const v = $('#view'); if (v) v.innerHTML = `<div class="empty"><span class="spin"></span> ${pesan}</div>`; };

async function jalan() {
  if (DB.needLogin) await loginForm();
  tunggu('Memuat data kurikulum…');
  const [m] = await Promise.all([modul, grafik]);
  await m.start();
}
async function mulai() {
  terimaTautanFirebase();
  if (new URLSearchParams(location.search).has('demo')) DB.useLocal(); else await DB.init();
  await jalan();
}
window.addEventListener('kurekam:keluar', () => { jalan().catch(gagal); });
const gagal = (e) => { console.error(e); const v = $('#view'); if (v) v.innerHTML = `<div class="card empty">Gagal memulai aplikasi: ${String(e.message || e).replace(/[<>&]/g, '')}</div>`; };
mulai().catch(gagal);
