/* KUREKAM · Titik pulih (cadangan di dalam basis data)
   Titik pulih = salinan seluruh data kurikulum pada satu saat. Disimpan terkompresi di koleksi terpisah (kur_pulih dan kur_pulihdata)
   sehingga tidak ikut dimuat saat aplikasi dibuka. Pengguna dan log tidak disalin: akun dan kata sandi awal tidak diduplikasi,
   dan pemulihan tidak mengembalikan akun lama. Nilai per mahasiswa tidak pernah ada di data ini. */
import { S, ctx, dalamSimulasi, toast } from './app.js';
import { DB, COLLECTIONS } from './db.js';

const META = 'pulih', DATA = 'pulihdata', UKURAN_POTONG = 700000;
const SERTA = COLLECTIONS.filter(c => c !== 'log' && c !== 'pengguna');
const BATAS = { harian: 14, sebelum: 12, manual: 40 };

const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const dariB64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function lewat(stream, data) { return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer()); }
async function kemas(teks) {
  const mentah = new TextEncoder().encode(teks);
  if (typeof CompressionStream === 'undefined') return { gz: false, s: b64(mentah) };
  return { gz: true, s: b64(await lewat(new CompressionStream('gzip'), mentah)) };
}
async function buka(s, gz) {
  const u8 = dariB64(s);
  return new TextDecoder().decode(gz ? await lewat(new DecompressionStream('gzip'), u8) : u8);
}

/** Isi data saat ini sebagai objek {koleksi: [dokumen]}. */
export function fotoData() {
  const o = {};
  SERTA.forEach(k => { o[k] = k === 'settings' ? [S.settings] : (S[k] || []); });
  return o;
}
const ringkasData = (o) => Object.keys(o).reduce((a, k) => { a[k] = (o[k] || []).length; return a; }, {});

/** Membuat titik pulih. jenis: 'manual' | 'harian' | 'sebelum'. Mengembalikan metadata, atau null bila gagal. */
export async function buatTitikPulih(label, jenis = 'manual') {
  try {
    const foto = fotoData(), teks = JSON.stringify(foto), k = await kemas(teks);
    const id = 'T' + Date.now(), bagian = [];
    for (let i = 0; i < k.s.length; i += UKURAN_POTONG) bagian.push(k.s.slice(i, i + UKURAN_POTONG));
    /* data ditulis lebih dulu, metadata terakhir: titik pulih yang setengah jadi tidak pernah muncul di daftar */
    for (let i = 0; i < bagian.length; i++) await DB.dok.tulis(DATA, { id: id + '_' + i, ref: id, i, d: bagian[i] });
    const meta = { id, t: new Date().toISOString(), label: label || 'Titik pulih', jenis, oleh: (DB.user && DB.user.email) || ctx.role || '-', bagian: bagian.length, gz: k.gz, ukuran: k.s.length, n: ringkasData(foto) };
    await DB.dok.tulis(META, meta);
    pangkas(jenis).catch(() => { });
    return meta;
  } catch (e) {
    console.warn('Titik pulih gagal dibuat:', e.message || e);
    return null;
  }
}

export async function daftarTitikPulih() {
  const a = await DB.dok.daftar(META);
  return a.sort((x, y) => (y.t || '').localeCompare(x.t || ''));
}

export async function hapusTitikPulih(meta) {
  for (let i = 0; i < (meta.bagian || 0); i++) await DB.dok.hapus(DATA, meta.id + '_' + i);
  await DB.dok.hapus(META, meta.id);
}
async function pangkas(jenis) {
  const a = (await daftarTitikPulih()).filter(x => x.jenis === jenis);
  for (const x of a.slice(BATAS[jenis] || 40)) await hapusTitikPulih(x);
}

/** Membaca isi titik pulih menjadi objek data. */
export async function bacaTitikPulih(meta) {
  let s = '';
  for (let i = 0; i < meta.bagian; i++) { const d = await DB.dok.baca(DATA, meta.id + '_' + i); if (!d) throw new Error('Bagian ' + (i + 1) + ' titik pulih hilang. Titik ini tidak dapat dipakai.'); s += d.d; }
  return JSON.parse(await buka(s, meta.gz));
}

/** Memulihkan data dari titik pulih. Titik pulih baru dibuat lebih dulu agar pemulihan sendiri bisa dibatalkan. Mengembalikan jumlah koleksi yang dipulihkan. */
export async function pulihkan(meta) {
  const d = await bacaTitikPulih(meta);
  if (!Array.isArray(d.mk) || !Array.isArray(d.prodi)) throw new Error('Isi titik pulih tidak sah.');
  const aman = await buatTitikPulih('Otomatis sebelum memulihkan ' + new Date(meta.t).toLocaleString('id-ID'), 'sebelum');
  if (!aman) throw new Error('Titik pengaman gagal dibuat, pemulihan dibatalkan agar data sekarang tidak hilang.');
  let n = 0;
  for (const c of SERTA) { if (Array.isArray(d[c])) { await DB.replaceAll(c, d[c]); n++; } }
  return n;
}

/** Unduh isi titik pulih sebagai berkas JSON (sama bentuknya dengan Unduh cadangan di Data Induk). */
export async function berkasTitikPulih(meta) { return new Blob([JSON.stringify(await bacaTitikPulih(meta))], { type: 'application/json' }); }

/** Titik pulih otomatis sebelum tindakan yang menimpa banyak data. Bila gagal ditulis ke basis data, berkas JSON diunduh sebagai gantinya. */
export async function titikOtomatis(alasan) {
  if (dalamSimulasi()) return null;
  const m = await buatTitikPulih(alasan, 'sebelum');
  if (m) return m;
  try {
    const { unduh } = await import('./views/ui.js');
    unduh(new Blob([JSON.stringify(fotoData())], { type: 'application/json' }), `kurekam-pengaman-${new Date().toISOString().slice(0, 10)}.json`);
    toast('Titik pulih tidak dapat disimpan di basis data. Salinan pengaman diunduh sebagai berkas.');
  } catch (e) { /* abaikan */ }
  return null;
}

/** Sekali sehari saat aplikasi dibuka oleh admin, developer, atau Wadir I, hanya pada basis data nyata. */
export async function titikHarian() {
  if (DB.mode !== 'firebase' || dalamSimulasi() || !['admin', 'developer', 'wadir'].includes(ctx.role)) return null;
  try {
    const hari = new Date().toISOString().slice(0, 10);
    const a = await daftarTitikPulih();
    if (a.some(x => x.jenis === 'harian' && (x.t || '').slice(0, 10) === hari)) return null;
    if (!S.mk.length) return null; /* jangan menyimpan titik dari data kosong */
    return await buatTitikPulih('Otomatis harian', 'harian');
  } catch (e) { console.warn('Titik harian dilewati:', e.message || e); return null; }
}
