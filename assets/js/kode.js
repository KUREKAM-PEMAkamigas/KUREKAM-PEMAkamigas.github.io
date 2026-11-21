/* KUREKAM · Pedoman Kode Mata Kuliah.
   Kode 6 karakter: [2 huruf] + [1 angka kelompok] + [3 angka urut].
   - 2 huruf : kode prodi (TP, TO, TM, TI, LG), atau AK untuk MK bersama (wajib kurikulum dan basic science bersama).
   - angka   : 1 MKW (wajib kurikulum), 2 MKBS (basic science), 3 MKKK (kompetensi), 4 MKBE (basic engineering).
   - tanpa kode semester; teori dan praktik adalah MK terpisah dengan kode terpisah.
   Fungsi di sini murni (tanpa akses data) agar dapat dipakai seed, pemeriksa, dan layar penyusunan. */

export const KODE_PRODI = ['TP', 'TO', 'TM', 'TI', 'LG'];
export const DIGIT_GRUP = { MKU: 1, MBS: 2, MKK: 3, MBE: 4 };
/** Nama kelompok sesuai Pedoman Kode MK (tampilan). Kunci internal data tetap MKU, MBS, MBE, MKK. */
export const KODE_GRUP = { MKU: 'MKW', MBS: 'MKBS', MKK: 'MKKK', MBE: 'MKBE' };
export const NAMA_GRUP = { MKU: 'Mata Kuliah Wajib', MBS: 'Mata Kuliah Basic Science', MBE: 'Mata Kuliah Basic Engineering', MKK: 'Mata Kuliah Kompetensi' };

/** Prodi lama "LO" dibaca sebagai "LG" (Logistik Migas). */
export const kodeProdi = (pid) => (pid === 'LO' ? 'LG' : pid);

/** Kode baku dari Pedoman Kode MK. Capstone, PKL/Magang inti, dan Tugas Akhir adalah usulan sampai rapat menetapkan. */
export const KODE_BAKU = [
  [/^agama\b/i, 'AK1001'],
  [/^pancasila\b/i, 'AK1002'],
  [/^kewarganegaraan\b/i, 'AK1003'],
  [/^bahasa indonesia\b/i, 'AK1004'],
  [/^praktik(um)?\s+bahasa inggris/i, 'AK1006'],
  [/^bahasa inggris/i, 'AK1005'],
  [/^praktik(um)?\s+(k3|keselamatan dan kesehatan|kesehatan dan keselamatan)/i, 'AK1008'],
  [/^(k3\b|keselamatan dan kesehatan|kesehatan dan keselamatan)/i, 'AK1007'],
  [/^pengantar industri migas/i, 'AK1009'],
  [/capstone design\s*iii\b/i, 'AK1014'],
  [/capstone design\s*ii\b/i, 'AK1013'],
  [/capstone design(\s*i)?\s*$/i, 'AK1010'],
  [/^tugas akhir/i, 'AK1012'],
  [/(praktik kerja lapangan|^pkl\b|magang berdampak.*(inti|pkl)|^magang berdampak\s*$)/i, 'AK1011'],
  [/^praktik(um)?\s+fisika dasar/i, 'AK2004'],
  [/^praktik(um)?\s+kimia dasar/i, 'AK2005'],
  [/^matematika dasar/i, 'AK2001'],
  [/^fisika dasar/i, 'AK2002'],
  [/^kimia dasar/i, 'AK2003']
];
/** Usulan (belum ditetapkan rapat): kode yang tidak berasal dari daftar awal Pedoman. */
export const KODE_USULAN = new Set(['AK1010', 'AK1011', 'AK1012', 'AK1013', 'AK1014']);

export const kodeBaku = (nama) => { const n = String(nama || '').trim(); const h = KODE_BAKU.find(([rx]) => rx.test(n)); return h ? h[1] : null; };
export const formatKode = (k) => /^(AK|TP|TO|TM|TI|LG)[1-4]\d{3}$/.test(String(k || ''));
export const grupKel = (kel) => { const s = String(kel || ''); return /^MKU/.test(s) ? 'MKU' : /^MBS/.test(s) ? 'MBS' : /^MBE/.test(s) ? 'MBE' : 'MKK'; };

/** Awalan 6 karakter tanpa nomor urut: 'AK1', 'TP4', dst. */
export function awalanKode(m) {
  const b = kodeBaku(m.nama);
  if (b) return b.slice(0, 3);
  return kodeProdi(m.prodi) + DIGIT_GRUP[grupKel(m.kel)];
}
const urutDari = (k) => +String(k).slice(3);

/** Mengusulkan kode untuk seluruh MK satu prodi. Kode yang sudah sesuai Pedoman dipertahankan. Hasil: Map id -> kode. */
export function usulKodeProdi(mkProdi) {
  const hasil = new Map(), pakai = new Set(), seri = {};
  const catat = (k) => { const a = k.slice(0, 3); seri[a] = Math.max(seri[a] || 0, urutDari(k)); pakai.add(k); };
  mkProdi.forEach(m => { const b = kodeBaku(m.nama); if (b) { hasil.set(m.id, b); catat(b); } });
  mkProdi.forEach(m => {
    if (hasil.has(m.id)) return;
    const a = awalanKode(m);
    if (formatKode(m.kode) && m.kode.slice(0, 3) === a && !pakai.has(m.kode)) { hasil.set(m.id, m.kode); catat(m.kode); }
  });
  mkProdi.forEach(m => {
    if (hasil.has(m.id)) return;
    const a = awalanKode(m); seri[a] = (seri[a] || 0) + 1;
    const k = a + String(seri[a]).padStart(3, '0'); hasil.set(m.id, k); pakai.add(k);
  });
  return hasil;
}

/** Kode berikutnya untuk satu MK baru. */
export function kodeBaruMk(mkProdi, o) {
  const b = kodeBaku(o.nama); if (b) return b;
  const a = awalanKode(o);
  const maks = mkProdi.reduce((x, m) => (String(m.kode).startsWith(a) && formatKode(m.kode) ? Math.max(x, urutDari(m.kode)) : x), 0);
  return a + String(maks + 1).padStart(3, '0');
}

/** Tampilan nama kelompok bawaan data: 'MKU - wajib kurikulum' menjadi 'MKW - wajib kurikulum', dan seterusnya. */
export const labelKel = (kel) => String(kel || '').replace(/^MKU\b/, 'MKW').replace(/^MBS\b/, 'MKBS').replace(/^MBE\b/, 'MKBE').replace(/^MKK\b/, 'MKKK');
export const labelGrup = (g) => KODE_GRUP[g] || g;

/** Awalan "Praktik" atau "Praktikum" pada MK praktik murni. */
export const awalPraktik = (nama) => /^praktik(um)?\b/i.test(String(nama || '').trim());

/** Migrasi nama prodi lama (LO -> LG) pada seluruh isi data: nilai teks dan kunci objek. Mengembalikan jumlah koleksi yang berubah. */
export function migrasiLG(d) {
  const ubah = (v) => {
    if (typeof v === 'string') return /\bLO\b/.test(v) ? v.replace(/\bLO\b/g, 'LG') : v;
    if (Array.isArray(v)) return v.map(ubah);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k === 'LO' ? 'LG' : k] = (k === 'kode' && typeof v[k] === 'string' && /^LO\d/.test(v[k])) ? 'LG' + v[k].slice(2) : ubah(v[k]); return o; }
    return v;
  };
  const berubah = [];
  for (const c of Object.keys(d)) {
    if (!Array.isArray(d[c])) continue;
    const lama = JSON.stringify(d[c]);
    if (!/\bLO\b|"kode":"LO\d/.test(lama)) continue;
    const peta = new Map();
    d[c].map(ubah).forEach(x => peta.set(x && x.id != null ? x.id : peta.size, x));
    d[c] = Array.from(peta.values()); berubah.push(c);
  }
  return berubah;
}
