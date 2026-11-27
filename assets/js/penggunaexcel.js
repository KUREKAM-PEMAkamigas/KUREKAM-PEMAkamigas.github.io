/* KUREKAM · Unduh dan unggah daftar pengguna (Excel).
   Berkas memuat email, nama, peran, prodi, dan dosen; tidak memuat kata sandi apa pun. Unggah hanya menambah dan memperbarui
   (tidak pernah menghapus pengguna). Pengguna baru otomatis dibuatkan akun masuk dengan kata sandi awal sama dengan email. */
import { S, ctx, save, muatUlangAkun, rerender, toast } from './app.js';
import { DB } from './db.js';
import { PERAN } from './config.js';
import { nz, norm, spasi, bukaBuku, kolom, hapusContoh, tulisBuku } from './bokexcel.js';
import { pratinjauImpor } from './impor.js';

const adaAdmin = (arr) => !arr.length || ctx.role === 'developer' || arr.some(u => (u.peran || []).some(k => k === 'admin' || k === 'developer'));
const idDari = (email) => 'U-' + email.replace(/[^a-z0-9]/g, '_');
const keyPeran = (t) => { const n = norm(t); return Object.keys(PERAN).find(k => norm(k) === n || norm(PERAN[k].nama) === n) || ''; };
const dosenNama = (id) => (S.dosen.find(d => d.id === id) || {}).nama || '';
const statusSandi = (u) => u.sandiDiubah ? 'Sudah diganti' : u.sandiAwal ? 'Masih sandi awal' : 'Belum ada akun dibuat lewat aplikasi';

export async function templatPengguna() {
  const baris = S.pengguna.slice().sort((a, b) => (a.email || '').localeCompare(b.email || '')).map(u => [u.email, u.nama || '', (u.peran || []).map(k => (PERAN[k] || {}).nama || k).join(', '), u.prodi || '', dosenNama(u.dosen), statusSandi(u)]);
  if (!baris.length) baris.push(['contoh@gmail.com', 'Nama Dosen', 'Dosen', 'TP', '', '', 'Contoh, hapus baris ini']);
  const daftar = [['PERAN YANG BOLEH', Object.keys(PERAN).filter(k => k !== 'developer' || ctx.role === 'developer').map(k => PERAN[k].nama).join(', ')], ['KODE PRODI', S.prodi.map(p => p.id).join(', ')]];
  await tulisBuku('Pengguna_KUREKAM.xlsx', ['Email akun', 'Nama', 'Peran (pisahkan dengan koma)', 'Prodi (kode, untuk peran Prodi)', 'Nama dosen (untuk peran Dosen)', 'Status kata sandi (hanya dibaca)'], baris, [34, 28, 30, 16, 34, 30], [
    'PETUNJUK PENGGUNA',
    '1. Satu baris satu akun. Email wajib dan menjadi akun masuk (sama dengan akun SIMANTAP bila sudah punya).',
    '2. Peran boleh lebih dari satu, misalnya "Dosen, Pimpinan". Nama peran lihat lembar DAFTAR.',
    '3. Peran Prodi wajib mengisi kode prodi. Peran Dosen wajib mengisi nama dosen persis seperti di Data Induk > Dosen.',
    '4. Email baru otomatis dibuatkan akun masuk; kata sandi awalnya sama dengan alamat email (huruf kecil) dan wajib diganti saat masuk pertama.',
    '5. Baris yang emailnya sudah ada diperbarui. Sel yang dikosongkan tidak mengubah data yang ada. Pengguna tidak pernah dihapus lewat unggahan.',
    '6. Kolom Status kata sandi hanya informasi dan diabaikan saat unggah. Berkas ini tidak memuat kata sandi.'], daftar);
}

export async function imporPengguna(file) {
  const b = await bukaBuku(file, h => h.some(x => /^email/.test(x)));
  if (!b) throw new Error('Kolom Email tidak ditemukan. Gunakan templat dari tombol Unduh Excel.');
  const k = { em: kolom(b.h, /^email/), nama: kolom(b.h, /^nama(?!dosen)/), peran: kolom(b.h, /^peran/), prodi: kolom(b.h, /^prodi/), dosen: kolom(b.h, /^namadosen/, /^dosen/) };
  const baru = [], ubah = [], lewat = [], catatan = []; let tetap = 0; const seen = new Set();
  for (let r = b.mulai; r < b.rows.length; r++) {
    const row = b.rows[r]; if (hapusContoh(row)) continue; const no = r + 1, email = nz(row[k.em]).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { lewat.push(`baris ${no}: email belum benar`); continue; }
    if (seen.has(email)) { lewat.push(`baris ${no}: email ${email} dobel di berkas`); continue; } seen.add(email);
    const ada = S.pengguna.find(u => u.email === email), d = {};
    const nama = k.nama >= 0 ? spasi(row[k.nama]) : ''; if (nama) d.nama = nama;
    const pr = k.peran >= 0 ? String(nz(row[k.peran])).split(/[,;\n]+/).map(s => s.trim()).filter(Boolean) : [];
    if (pr.length) { const ky = pr.map(keyPeran); const salah = pr.find((_, i) => !ky[i]); if (salah) { lewat.push(`baris ${no}: peran "${salah}" tidak dikenal`); continue; } if (ky.includes('developer') && ctx.role !== 'developer') { lewat.push(`baris ${no}: peran Developer hanya dapat diberikan developer`); continue; } d.peran = [...new Set(ky)]; }
    const kp = k.prodi >= 0 ? nz(row[k.prodi]).toUpperCase() : ''; if (kp) { if (!S.prodi.some(p => p.id === kp)) { lewat.push(`baris ${no}: kode prodi "${kp}" tidak ada`); continue; } d.prodi = kp; }
    const nd = k.dosen >= 0 ? spasi(row[k.dosen]) : '';
    if (nd) { const cocok = S.dosen.filter(x => norm(x.nama) === norm(nd) || x.id === nd); if (cocok.length !== 1) { lewat.push(`baris ${no}: dosen "${nd}" ${cocok.length ? 'cocok dengan lebih dari satu data' : 'tidak ditemukan di Data Induk > Dosen'}`); continue; } d.dosen = cocok[0].id; }
    const akhir = { ...(ada || { prodi: '', dosen: '' }), ...d }; akhir.email = email;
    if (!(akhir.peran || []).length) { lewat.push(`baris ${no}: peran belum diisi`); continue; }
    if (akhir.peran.includes('prodi') && !akhir.prodi) { lewat.push(`baris ${no}: peran Prodi wajib mengisi kode prodi`); continue; }
    if (akhir.peran.includes('dosen') && !akhir.dosen) { lewat.push(`baris ${no}: peran Dosen wajib mengisi nama dosen`); continue; }
    if (!ada) { akhir.id = idDari(email); baru.push(akhir); continue; }
    const beda = ['nama', 'prodi', 'dosen'].filter(f => (akhir[f] || '') !== (ada[f] || '')).concat(JSON.stringify([...(akhir.peran || [])].sort()) !== JSON.stringify([...(ada.peran || [])].sort()) ? ['peran'] : []);
    if (beda.length) ubah.push({ d: akhir, beda }); else tetap++;
  }
  if (!baru.length && !ubah.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : 'Tidak ada perubahan.'); return; }
  const nanti = S.pengguna.filter(u => !ubah.some(x => x.d.id === u.id)).concat(ubah.map(x => x.d), baru);
  if (!adaAdmin(nanti)) { toast('Dibatalkan: daftar hasil unggahan tidak memiliki akun admin.'); return; }
  if (DB.mode === 'firebase' && baru.length) catatan.push('akun masuk pengguna baru dibuat otomatis dengan kata sandi awal sama dengan email');
  const mode = await pratinjauImpor({ jenis: 'pengguna', baru: baru.map(d => `${d.email} · ${d.peran.map(p => PERAN[p].nama).join(', ')}`), ubah: ubah.map(x => ({ label: x.d.email, detail: x.beda.join(', ') + ' berubah' })), tetap, lewat, catatan }); if (!mode) return;
  let akunBaru = 0, akunAda = 0, gagal = 0;
  for (const d of baru) {
    if (DB.mode === 'firebase') { try { const h = await DB.buatAkun(d.email, d.email); if (h === 'baru') { d.sandiAwal = new Date().toISOString(); akunBaru++; } else akunAda++; } catch (e) { gagal++; catatan.push(`${d.email}: akun masuk gagal dibuat (${e.message})`); } }
    await save('pengguna', d, `Impor Excel: pengguna baru ${d.email}`);
  }
  for (const x of ubah) await save('pengguna', x.d, `Impor Excel: perbarui pengguna ${x.d.email}`);
  muatUlangAkun(); rerender();
  toast(`Pengguna tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${DB.mode === 'firebase' && baru.length ? `. Akun masuk dibuat ${akunBaru}, sudah ada ${akunAda}${gagal ? `, gagal ${gagal}` : ''}` : ''}.`);
}
