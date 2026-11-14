/* KUREKAM · Antarmuka masuk yang ringan: hanya bergantung pada db.js dan ikon, agar halaman login tampil cepat. */
import { DB } from './db.js';
import { icon } from './icons.js';
const $ = (sel, root = document) => root.querySelector(sel);

/* Kolom kata sandi dengan tombol lihat dan sembunyikan. */
export const kolomSandi = (id, ph) => `<div style="position:relative"><input class="inp" id="${id}" type="password" placeholder="${ph}" required autocomplete="off" style="width:100%;padding-right:96px"><button type="button" class="btn ghost sm" data-mata="${id}" style="position:absolute;right:4px;top:50%;transform:translateY(-50%)">${icon('eye')} Lihat</button></div>`;
export function pasangMata(root) { root.querySelectorAll('[data-mata]').forEach(b => b.onclick = () => { const i = root.querySelector('#' + b.dataset.mata), buka = i.type === 'password'; i.type = buka ? 'text' : 'password'; b.innerHTML = `${icon('eye')} ${buka ? 'Sembunyikan' : 'Lihat'}`; }); }

export function loginForm() {
  return new Promise(resolve => {
    const v = $('#view');
    v.innerHTML = `<div class="card" style="max-width:440px;margin:40px auto"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('db')}</span><div><h3>Masuk ke KUREKAM</h3><div class="sub">Akun sama dengan SIMANTAP (Firebase).</div></div></div>
      <form id="lgn" style="display:grid;gap:10px;margin-top:12px"><input class="inp" id="lg-e" type="email" placeholder="Email" required>${kolomSandi('lg-p', 'Kata sandi')}
      <button class="btn pri" type="submit">Masuk</button><div class="muted small" id="lg-msg"></div><button class="btn" type="button" id="lg-lupa">Lupa kata sandi? Kirim tautan ke email saya</button><div class="small muted">Pengguna baru: kata sandi awal sama dengan alamat email (huruf kecil), lalu Anda diminta menggantinya.</div><div class="small"><a href="#" id="lg-local">Buka mode demo lokal</a></div></form></div>`;
    v.querySelector('#lgn').onsubmit = async ev => { ev.preventDefault(); try { await DB.login(v.querySelector('#lg-e').value.trim().toLowerCase(), v.querySelector('#lg-p').value); resolve(); } catch (e) { v.querySelector('#lg-msg').textContent = /wrong-password|invalid-credential|invalid-login|user-not-found/.test(e.code || '') ? 'Email atau kata sandi tidak cocok. Pengguna baru memakai alamat email sebagai kata sandi awal.' : 'Gagal masuk: ' + e.message; } };
    pasangMata(v);
    v.querySelector('#lg-lupa').onclick = async ev => { ev.preventDefault(); const em = v.querySelector('#lg-e').value.trim(), msg = v.querySelector('#lg-msg'); if (!em) { msg.textContent = 'Isi email lebih dulu, lalu klik Lupa kata sandi.'; return; } try { await DB.kirimReset(em); msg.textContent = 'Tautan untuk membuat kata sandi baru dikirim ke ' + em + ' bila email itu sudah punya akun masuk. Pengirimnya noreply dari firebaseapp.com, periksa juga folder spam. Bila tidak ada, minta admin mendaftarkan email ini lebih dulu.'; } catch (e) { msg.textContent = 'Gagal mengirim: ' + e.message; } };
    v.querySelector('#lg-local').onclick = ev => { ev.preventDefault(); DB.useLocal(); resolve(); };
  });
}


