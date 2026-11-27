/* KUREKAM · Penugasan dosen lewat Excel: template berisi daftar MK dan daftar nama dosen terdaftar, serta pencocokan nama dosen
   yang longgar (gelar, urutan, dan singkatan boleh berbeda). Fungsi di sini murni: tidak menyentuh basis data. */

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const GELAR_DEPAN = new Set(['prof', 'dr', 'drs', 'dra', 'ir', 'h', 'hj', 'haji', 'hajjah', 'kh']);
const GELAR_BELAKANG = new Set(['st', 'mt', 'msi', 'msc', 'mm', 'me', 'mpd', 'spd', 'sp', 'sh', 'mh', 'mkom', 'skom', 'mkes', 'skm', 'phd', 'eng', 'mba', 'ssi', 'se', 'ak', 'ca', 'cpa', 'sst', 'mp', 'mpar', 'apt', 'dipl', 'ing', 'meng', 'seng', 'mtech', 'mkn', 'ma', 'ba', 'mphil', 'ssos', 'mhum', 'mpsi', 'psi', 'mscs', 'mit', 'mtm', 'mkkk', 'mkk', 'sik', 'sikom', 'kom', 'ipm', 'asean', 'eng', 'ipu', 'cert', 'cipm']);

/** Inti nama: tanpa gelar depan dan belakang, huruf kecil, tanpa titik. Hasil: daftar kata. */
export function intiNama(nama) {
  const awal = String(nama == null ? '' : nama).replace(/\r?\n.*/s, '').split(',')[0];
  const kata = awal.toLowerCase().replace(/[.]/g, ' ').replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  while (kata.length > 1 && GELAR_DEPAN.has(kata[0])) kata.shift();
  while (kata.length > 1 && GELAR_BELAKANG.has(kata[kata.length - 1])) kata.pop();
  return kata;
}

/** Dua kata cocok bila sama, atau salah satunya singkatan (1 sampai 2 huruf) yang diawali huruf yang sama. */
const kataCocok = (a, b) => a === b || (a.length <= 2 && b.length > 2 && b.startsWith(a[0])) || (b.length <= 2 && a.length > 2 && a.startsWith(b[0]));

/** Skor kecocokan dua nama (daftar kata). null bila tidak cocok. Semua kata pada nama yang lebih pendek harus ada, berurutan,
    pada nama yang lebih panjang, dan sedikitnya satu kata penuh (3 huruf atau lebih) harus sama persis. Skor = jumlah kata sama persis. */
function skorNama(e, r) {
  const [pendek, panjang] = e.length <= r.length ? [e, r] : [r, e];
  let j = 0, penuh = 0;
  for (const k of pendek) {
    let ketemu = false;
    while (j < panjang.length) { const q = panjang[j++]; if (kataCocok(k, q)) { ketemu = true; if (k === q && k.length >= 3) penuh++; break; } }
    if (!ketemu) return null;
  }
  return penuh >= 1 ? penuh : null;
}

/** Cocokkan satu nama dari Excel dengan daftar dosen terdaftar.
    Hasil: { d, cara: 'persis'|'inti'|'mirip' } bila cocok, { ambigu: [dosen] } bila beberapa kandidat sama kuat, atau null bila tidak ada yang cocok. */
export function cocokkanDosen(daftar, nama, nip = '', nidn = '') {
  const n = norm(nama);
  if (nip) { const d = daftar.find(x => x.nip && norm(x.nip) === norm(nip)); if (d) return { d, cara: 'persis' }; }
  if (nidn) { const d = daftar.find(x => x.nidn && norm(x.nidn) === norm(nidn)); if (d) return { d, cara: 'persis' }; }
  if (!n) return null;
  const p = daftar.find(x => norm(x.nama) === n); if (p) return { d: p, cara: 'persis' };
  const e = intiNama(nama); if (!e.length) return null;
  const sama = daftar.filter(x => { const r = intiNama(x.nama); return r.length === e.length && r.every((k, i) => k === e[i]); });
  if (sama.length === 1) return { d: sama[0], cara: 'inti' };
  if (sama.length > 1) return { ambigu: sama };
  const kand = daftar.map(x => ({ x, s: skorNama(e, intiNama(x.nama)) })).filter(q => q.s != null).sort((a, b) => b.s - a.s);
  if (!kand.length) return null;
  if (kand.length > 1 && kand[1].s === kand[0].s) return { ambigu: kand.filter(q => q.s === kand[0].s).map(q => q.x) };
  return { d: kand[0].x, cara: 'mirip' };
}

export const KEPALA_PENUGASAN = ['Prodi', 'Semester', 'Kode MK', 'Nama MK', 'SKS T', 'SKS P', 'Dosen', 'Kelas', 'Porsi T', 'Porsi P', 'Koordinator'];

/** Buat buku kerja template penugasan. mkList: MK yang dimuat. S: data aplikasi. kelasOf: fungsi jumlah kelas bawaan. */
export function bangunTemplatePenugasan(X, S, mkList, kelasOf, judul = '') {
  const wb = X.utils.book_new(), baris = [KEPALA_PENUGASAN];
  const nama = (id) => (S.dosen.find(d => d.id === id) || {}).nama || '';
  mkList.forEach(m => {
    const ts = (S.tugas || []).filter(t => t.mk === m.id);
    if (!ts.length) baris.push([m.prodi, m.smt, m.kode, m.nama, m.T || 0, m.P || 0, '', kelasOf(S, m.prodi, m.smt), 1, 1, '']);
    else ts.forEach(t => baris.push([m.prodi, m.smt, m.kode, m.nama, m.T || 0, m.P || 0, nama(t.dosen), t.kelas, t.porsiT == null ? 1 : t.porsiT, t.porsiP == null ? 1 : t.porsiP, t.koordinator ? 'ya' : '']));
  });
  const ws = X.utils.aoa_to_sheet(baris); ws['!cols'] = [8, 9, 12, 44, 7, 7, 40, 8, 9, 9, 12].map(w => ({ wch: w })); ws['!autofilter'] = { ref: `A1:K${baris.length}` };
  X.utils.book_append_sheet(wb, ws, 'PENUGASAN');
  const urut = (S.dosen || []).slice().sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
  const ref = X.utils.aoa_to_sheet([['Nama terdaftar di KUREKAM (salin persis ke kolom Dosen)', 'Homebase', 'Status', 'Juga mengajar di'], ...urut.map(d => [d.nama, d.homebase || '', d.status || '', (d.prodiAjar || []).join(', ')])]);
  ref['!cols'] = [52, 12, 30, 18].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ref, 'REFERENSI');
  const pet = [['Petunjuk pengisian template penugasan' + (judul ? ' · ' + judul : '')], [''],
    ['1. Isi kolom Dosen pada lembar PENUGASAN. Paling mudah: salin nama dari lembar REFERENSI.'],
    ['2. Nama tidak harus persis. Aplikasi mencocokkan nama tanpa memperhatikan gelar, urutan gelar, huruf besar kecil, dan singkatan (misalnya "M. Rehan" dikenali sebagai "Muhammad Rehan").'],
    ['3. Bila tidak ada yang cocok, nama dicatat apa adanya sebagai dosen baru (homebase mengikuti prodi MK, status "Belum ada di DUK"), dan dapat dilengkapi di Data Induk > Dosen.'],
    ['4. Bila nama cocok dengan lebih dari satu dosen terdaftar, baris itu dilewati dan dilaporkan. Tulis nama lebih lengkap lalu impor ulang.'],
    ['5. Satu MK dengan dua dosen (team teaching atau kelas praktik dibagi): tambahkan baris baru dengan Prodi, Kode MK, dan Nama MK yang sama. Atur Kelas, Porsi T, dan Porsi P tiap dosen (0 sampai 1, atau persen).'],
    ['6. Baris tanpa Dosen diabaikan. Penugasan yang sudah ada (dosen dan MK sama) diperbarui.'],
    ['7. Koordinator: tulis "ya" untuk dosen koordinator MK.']];
  const ps = X.utils.aoa_to_sheet(pet); ps['!cols'] = [{ wch: 130 }]; X.utils.book_append_sheet(wb, ps, 'PETUNJUK');
  return wb;
}
