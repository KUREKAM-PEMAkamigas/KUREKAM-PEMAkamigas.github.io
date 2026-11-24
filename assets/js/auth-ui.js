/* KUREKAM · Antarmuka masuk yang ringan: hanya bergantung pada db.js dan ikon, agar halaman login tampil cepat. */
import { DB } from './db.js';
import { icon } from './icons.js';
const $ = (sel, root = document) => root.querySelector(sel);

/* Kolom kata sandi dengan tombol lihat dan sembunyikan. */
export const kolomSandi = (id, ph) => `<div style="position:relative"><input class="inp" id="${id}" type="password" placeholder="${ph}" required autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" style="width:100%;padding-right:96px"><button type="button" class="btn ghost sm" data-mata="${id}" style="position:absolute;right:4px;top:50%;transform:translateY(-50%)">${icon('eye')} Lihat</button></div>`;
export function pasangMata(root) { root.querySelectorAll('[data-mata]').forEach(b => b.onclick = () => { const i = root.querySelector('#' + b.dataset.mata), buka = i.type === 'password'; i.type = buka ? 'text' : 'password'; b.innerHTML = `${icon('eye')} ${buka ? 'Sembunyikan' : 'Lihat'}`; }); }

export function loginForm() {
  return new Promise(resolve => {
    const v = $('#view');
    v.innerHTML = `<div class="card" style="max-width:440px;margin:40px auto"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('db')}</span><div><h3>Masuk ke KUREKAM</h3><div class="sub">Akun sama dengan SIMANTAP (Firebase).</div></div></div>
      <form id="lgn" style="display:grid;gap:10px;margin-top:12px"><input class="inp" id="lg-e" type="email" placeholder="Email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required>${kolomSandi('lg-p', 'Kata sandi')}
      <button class="btn pri" type="submit">Masuk</button><div class="muted small" id="lg-msg"></div><button class="btn" type="button" id="lg-lupa">Lupa kata sandi? Kirim tautan ke email saya</button><div class="small muted">Pengguna baru: kata sandi awal sama dengan alamat email (huruf kecil), lalu Anda diminta menggantinya.</div></form></div>`;
    /* Perlindungan terhadap blokir Firebase: tombol dikunci saat memproses dan saat masa tunggu, supaya percobaan berulang tidak memperpanjang blokir. */
    const KUNCI = 'kurekam_tunggu', tombol = v.querySelector('#lgn button[type=submit]'), pesan = v.querySelector('#lg-msg');
    let jam = null;
    const sisa = () => { try { return Math.max(0, (+localStorage.getItem(KUNCI) || 0) - Date.now()); } catch (e) { return 0; } };
    const tampilTunggu = () => {
      clearInterval(jam);
      const ukur = () => { const s = sisa(); if (!s) { clearInterval(jam); tombol.disabled = false; tombol.textContent = 'Masuk'; if (pesan.dataset.tunggu) { pesan.textContent = 'Masa tunggu selesai. Silakan coba masuk lagi.'; delete pesan.dataset.tunggu; } return; }
        const m = Math.floor(s / 60000), d = Math.floor(s % 60000 / 1000); tombol.disabled = true; tombol.textContent = `Tunggu ${m}:${String(d).padStart(2, '0')}`;
        pesan.dataset.tunggu = '1'; pesan.textContent = 'Firebase membatasi percobaan dari perangkat atau jaringan ini untuk sementara. Ini bukan kesalahan akun Anda. Mohon tunggu, jangan menekan Masuk berulang. Bisa juga coba dari data seluler, atau pakai Lupa kata sandi.'; };
      ukur(); jam = setInterval(ukur, 1000);
    };
    if (sisa()) tampilTunggu();
    v.querySelector('#lgn').onsubmit = async ev => {
      ev.preventDefault(); if (tombol.disabled) return;
      tombol.disabled = true; tombol.textContent = 'Memeriksa...'; pesan.textContent = '';
      try { await DB.login(v.querySelector('#lg-e').value.trim().toLowerCase(), v.querySelector('#lg-p').value); resolve(); return; }
      catch (e) {
        const c = e.code || '';
        if (/too-many-requests/.test(c)) { try { localStorage.setItem(KUNCI, String(Date.now() + 5 * 60000)); } catch (x) { /* abaikan */ } tampilTunggu(); return; }
        pesan.textContent = /wrong-password|invalid-credential|invalid-login|user-not-found/.test(c) ? 'Email atau kata sandi tidak cocok. Kata sandi awal sama dengan alamat email huruf kecil, tanpa spasi. Bila sudah pernah mengganti sandi, pakai sandi baru itu atau tekan Lupa kata sandi.' : /network/.test(c) ? 'Tidak ada koneksi internet. Periksa jaringan Anda lalu coba lagi.' : 'Gagal masuk: ' + e.message;
      }
      tombol.disabled = false; tombol.textContent = 'Masuk';
    };
    pasangMata(v);
    v.querySelector('#lg-lupa').onclick = async ev => { ev.preventDefault(); const em = v.querySelector('#lg-e').value.trim(), msg = v.querySelector('#lg-msg'); if (!em) { msg.textContent = 'Isi email lebih dulu, lalu klik Lupa kata sandi.'; return; } try { await DB.kirimReset(em); msg.textContent = 'Tautan untuk membuat kata sandi baru dikirim ke ' + em + ' bila email itu sudah punya akun masuk. Pengirimnya noreply dari firebaseapp.com, periksa juga folder spam. Bila tidak ada, minta admin mendaftarkan email ini lebih dulu.'; } catch (e) { msg.textContent = 'Gagal mengirim: ' + e.message; } };
  });
}


