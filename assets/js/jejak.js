/* KUREKAM · Jejak aktivitas dan sesi pengguna untuk Ruang Pantau Wakil Direktur I.
   - kur_jejak: satu dokumen per kejadian (masuk, buka halaman, simpan, hapus, keluar).
   - kur_sesi : satu dokumen per akun, diperbarui tiap menit selama aplikasi terbuka (siapa yang sedang aktif).
   Yang dicatat hanya email, nama, peran, prodi, halaman, dan uraian aksi. Tidak mencatat IP, lokasi, atau isi ketikan. */
import { DB } from './db.js';
import { ctx, S, toast } from './app.js';
import { PERAN } from './config.js';

export const BOLEH_PANTAU = ['wadir', 'admin', 'developer'];
export const JENIS = { masuk: ['Masuk', '#10b981'], buka: ['Buka halaman', '#0ea5e9'], simpan: ['Simpan', '#8b5cf6'], hapus: ['Hapus', '#f0616d'], keluar: ['Keluar', '#64748b'] };
export const AKTIF_MENIT = 3;

const perangkat = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'HP' : 'Laptop/PC';
function siapa() {
  const u = DB.user; if (!u) return null;
  const a = ctx.akun || {};
  const dosen = ctx.dosen || a.dosen || '';
  const nmDosen = dosen ? (S.dosen.find(d => d.id === dosen) || {}).nama : '';
  return { uid: u.uid, email: (u.email || '').toLowerCase(), nama: nmDosen || a.nama || u.email, peran: ctx.role, peranAkun: a.peran || [], prodi: ctx.prodi || a.prodi || '', dosen };
}
const idJejak = () => 'J' + Date.now() + Math.floor(Math.random() * 1e4);

/** Catat satu kejadian. Tidak pernah menghentikan aplikasi bila gagal. */
export async function catat(jenis, aksi = '', hal = '') {
  if (DB.mode !== 'firebase' || !DB.user) return;
  const s = siapa(); if (!s) return;
  const doc = { id: idJejak(), t: new Date().toISOString(), jenis, aksi: String(aksi).slice(0, 300), hal: hal || halaman(), perangkat: perangkat(), ...s };
  try { await DB.tulisJejak('jejak', doc); } catch (e) { /* abaikan */ }
}
const halaman = () => (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'beranda';

let detak = null, halTerakhir = '', waktuBuka = 0;
async function denyut() {
  const s = siapa(); if (!s || document.hidden) return;
  await DB.tulisJejak('sesi', { id: s.uid, ...s, hal: halaman(), terakhir: new Date().toISOString(), t: new Date().toISOString(), perangkat: perangkat(), mulai: sesiMulai });
}
let sesiMulai = '';
/** Dipanggil sekali setelah pengguna masuk dan data dimuat. */
export function mulaiJejak() {
  if (DB.mode !== 'firebase' || !DB.user || detak) return;
  sesiMulai = new Date().toISOString();
  let baru = true; try { const k = 'kurekam_masuk_' + DB.user.uid; baru = !sessionStorage.getItem(k); sessionStorage.setItem(k, '1'); } catch (e) { /* abaikan */ }
  if (baru) catat('masuk', 'Masuk ke KUREKAM sebagai ' + ((PERAN[ctx.role] || {}).nama || ctx.role));
  denyut(); detak = setInterval(denyut, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) denyut(); });
  if (BOLEH_PANTAU.includes(ctx.role)) kabarLangsung();
}
/** Dipanggil setiap pindah halaman. Halaman yang sama tidak dicatat ulang, dan pindah cepat (< 15 detik) tidak dicatat. */
export function jejakHalaman(id, judul) {
  if (DB.mode !== 'firebase' || !DB.user) return;
  const kini = Date.now();
  if (id === halTerakhir) return;
  halTerakhir = id;
  if (kini - waktuBuka < 15000) { waktuBuka = kini; clearTimeout(jejakHalaman.t); jejakHalaman.t = setTimeout(() => catat('buka', judul, id), 15000); return; }
  waktuBuka = kini; clearTimeout(jejakHalaman.t); catat('buka', judul, id); denyut();
}
export function jejakKeluar() { return catat('keluar', 'Keluar dari KUREKAM'); }

/* ---- kabar langsung untuk Wakil Direktur I: notifikasi saat ada yang masuk atau menyimpan ---- */
let berhenti = null;
export const pendengar = new Set();
function kabarLangsung() {
  if (berhenti) return;
  const sejak = new Date().toISOString(), saya = DB.user.uid;
  berhenti = DB.dengar('jejak', sejak, (docs) => {
    docs.forEach(d => {
      pendengar.forEach(f => { try { f(d); } catch (e) { /* abaikan */ } });
      if (d.uid === saya || d.jenis === 'buka') return;
      const p = (PERAN[d.peran] || {}).nama || d.peran;
      toast(d.jenis === 'masuk' ? `${d.nama} (${p}${d.prodi && d.peran !== 'wadir' ? ' ' + d.prodi : ''}) baru masuk` : `${d.nama}: ${d.aksi}`);
    });
  });
}

/** Rangkum jejak menjadi angka per akun. */
export function rangkumJejak(list) {
  const per = new Map();
  list.forEach(j => {
    const k = j.email || j.uid; if (!k) return;
    const o = per.get(k) || { email: j.email, nama: j.nama, peran: j.peran, prodi: j.prodi, dosen: j.dosen, masuk: 0, buka: 0, simpan: 0, hapus: 0, hari: new Set(), terakhir: '', aksiTerakhir: '' };
    o[j.jenis] = (o[j.jenis] || 0) + 1; o.hari.add((j.t || '').slice(0, 10));
    if ((j.t || '') > o.terakhir) { o.terakhir = j.t; o.nama = j.nama || o.nama; }
    if ((j.jenis === 'simpan' || j.jenis === 'hapus') && (j.t || '') >= (o.tAksi || '')) { o.tAksi = j.t; o.aksiTerakhir = j.aksi; }
    per.set(k, o);
  });
  return per;
}
