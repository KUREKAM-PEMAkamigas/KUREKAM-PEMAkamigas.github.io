/* KUREKAM · Templat dan impor Excel untuk Body of Knowledge (BoK) dan Bahan Kajian (BK), masing-masing terpisah.
   Templat berisi data yang sudah ada sehingga prodi dapat mengubah atau menambah baris lalu mengunggah ulang.
   Baris dengan kode lama memperbarui data itu; kode kosong membuat baru (kode otomatis). Data tidak pernah dihapus lewat impor. */
import { S, save, saveMany, rerender, toast } from './app.js';
import { byProdi, kodeBerikut } from './rules.js';
import { LEVELS } from './bloom.js';
import { unduh, loadXLSX } from './views/ui.js';
import { pratinjauImpor, bedaRingkas, rencanaHapus, awalCadangan } from './impor.js';

export const nz = (v) => String(v == null ? '' : v).trim();
export const norm = (v) => nz(v).toLowerCase().replace(/[^a-z0-9]/g, '');
export const spasi = (v) => nz(v).replace(/\s+/g, ' ');
export const pecah = (v) => nz(v).split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
const LEVEL = Object.keys(LEVELS);

export async function bukaBuku(file, cocokKepala) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
  for (const nm of wb.SheetNames) {
    const r = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: '' });
    const i = r.findIndex(x => cocokKepala(x.map(norm)));
    if (i >= 0) return { rows: r, h: r[i].map(norm), mulai: i + 1 };
  }
  return null;
}
export const kolom = (h, ...p) => { for (const q of p) { const i = h.findIndex(x => q.test(x)); if (i >= 0) return i; } return -1; };
export const hapusContoh = (row) => !row.some(v => nz(v)) || row.some(v => /hapus baris ini/i.test(nz(v)));

export async function tulisBuku(nama, kepala, baris, lebar, petunjuk, daftar) {
  const X = await loadXLSX(), wb = X.utils.book_new();
  const ws = X.utils.aoa_to_sheet([kepala, ...baris]); ws['!cols'] = lebar.map(w => ({ wch: w })); ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  X.utils.book_append_sheet(wb, ws, 'DATA');
  const wp = X.utils.aoa_to_sheet(petunjuk.map(t => [t])); wp['!cols'] = [{ wch: 130 }]; X.utils.book_append_sheet(wb, wp, 'PETUNJUK');
  if (daftar && daftar.length) { const wd = X.utils.aoa_to_sheet(daftar); wd['!cols'] = [{ wch: 20 }, { wch: 90 }]; X.utils.book_append_sheet(wb, wd, 'DAFTAR'); }
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), nama);
}

/* ---------------- BoK ---------------- */
export async function templatBok(pid, awal = 'Template') {
  const bok = byProdi(S.bok, pid);
  const baris = bok.map(b => [b.kode, b.nama, b.sumber || '']);
  if (!baris.length) baris.push(['', 'Matematika, Komputasi, dan Sains Terapan', 'IABEE 2.1.1, LAM Teknik butir 19', 'Contoh, hapus baris ini']);
  await tulisBuku(`${awal}_BoK_${pid}.xlsx`, ['Kode BoK (kosongkan untuk BoK baru)', 'Nama BoK', 'Sumber rujukan (asosiasi, SKKNI, IABEE, dan lain-lain)'], baris, [24, 60, 60],
    ['Petunjuk pengisian Body of Knowledge (BoK)', '1. Satu baris = satu BoK. Baris yang sudah berisi kode adalah BoK yang ada: ubah isinya lalu unggah ulang.', '2. BoK baru: kosongkan kolom Kode. Kode dibuat otomatis.', '3. Nama BoK wajib diisi. Sumber rujukan boleh kosong tetapi sebaiknya diisi untuk keperluan akreditasi.', '4. Hapus baris contoh bila ada. BoK yang dihapus dari lembar ini TIDAK ikut terhapus di aplikasi.', '5. Unggah lewat tombol Impor Excel BoK di menu BoK & Bahan Kajian. Aplikasi menampilkan ringkasan dan meminta konfirmasi.']);
}

export async function imporBok(file, pid) {
  const b = await bukaBuku(file, (h) => h.some(c => /^namabok|^nama/.test(c)) && h.some(c => /^kode/.test(c)));
  if (!b) throw new Error('Kolom Kode dan Nama BoK tidak ditemukan. Gunakan templat dari tombol Templat BoK.');
  const c = { kode: kolom(b.h, /^kodebok/, /^kode/), nama: kolom(b.h, /^namabok/, /^nama/), sumber: kolom(b.h, /^sumber/) };
  const ada = byProdi(S.bok, pid), baru = [], ubah = [], lewat = [], disebut = new Set(); let tetap = 0;
  for (let r = b.mulai; r < b.rows.length; r++) {
    const row = b.rows[r]; if (hapusContoh(row)) continue; const no = r + 1, nama = spasi(row[c.nama]), kd = nz(row[c.kode]); if (kd) disebut.add(norm(kd));
    if (!nama) { lewat.push(`baris ${no}: nama BoK kosong`); continue; }
    const sumber = c.sumber >= 0 ? spasi(row[c.sumber]) : '';
    const sudah = kd ? ada.find(x => norm(x.kode) === norm(kd)) : ada.find(x => norm(x.nama) === norm(nama)); if (sudah) disebut.add(norm(sudah.kode));
    if (kd && !sudah) { lewat.push(`baris ${no}: kode "${kd}" tidak ada di prodi ${pid}. Kosongkan kolom kode untuk BoK baru`); continue; }
    if (sudah) { if (sudah.nama === nama && nz(sudah.sumber) === sumber) tetap++; else ubah.push({ ...sudah, nama, sumber }); } else if (baru.some(x => norm(x.nama) === norm(nama))) lewat.push(`baris ${no}: nama "${nama}" ganda dalam berkas`); else baru.push({ nama, sumber, prodi: pid });
  }
  const hp = rencanaHapus('bok', ada.filter(x => !disebut.has(norm(x.kode))));
  if (!baru.length && !ubah.length && !hp.boleh.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : tetap ? 'Tidak ada perubahan: semua baris sama dengan data di aplikasi.' : 'Tidak ada baris data terbaca.'); return; }
  const mode = await pratinjauImpor({ jenis: 'BoK', baru: baru.map(d => d.nama), ubah: ubah.map(d => ({ label: `${d.kode} ${d.nama}`, detail: bedaRingkas(ada.find(x => x.id === d.id), d) })), tetap, lewat, boleh: hp.boleh, tahan: hp.tahan }); if (!mode) return;
  if (mode === 'ganti') { await templatBok(pid, awalCadangan()); await hp.jalan(pid); }
  if (ubah.length) await saveMany('bok', ubah, `Impor Excel: perbarui ${ubah.length} BoK (${pid})`);
  for (const d of baru) { d.kode = kodeBerikut(S, 'bok', pid); d.id = `${pid}-${d.kode}`; await save('bok', d, `Impor Excel: BoK baru ${d.kode} (${pid})`); }
  toast(`BoK tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${lewat.length ? `, ${lewat.length} dilewati` : ''}${mode === 'ganti' ? `, ${hp.boleh.length} dihapus` : ''}.`); rerender();
}

/* ---------------- Bahan kajian ---------------- */
export async function templatBk(pid, awal = 'Template') {
  const bk = byProdi(S.bk, pid), bok = byProdi(S.bok, pid), cpl = byProdi(S.cpl, pid);
  const kodeBok = (id) => (bok.find(x => x.id === id) || {}).kode || '', kodeCpl = (id) => (cpl.find(x => x.id === id) || {}).kode || '';
  const baris = bk.map(b => [b.kode, b.nama, kodeBok(b.bok), b.kedalaman || '', (b.cpl || []).map(kodeCpl).filter(Boolean).join(', ')]);
  if (!baris.length) baris.push(['', 'Matematika terapan', bok[0] ? bok[0].kode : 'BOK1', 'C3', cpl[0] ? cpl[0].kode : 'CPL01', 'Contoh, hapus baris ini']);
  await tulisBuku(`${awal}_Bahan_Kajian_${pid}.xlsx`, ['Kode BK (kosongkan untuk BK baru)', 'Nama bahan kajian', 'Kode BoK induk', 'Kedalaman (level Bloom: C1 sampai C6, P1 sampai P5, A1 sampai A5)', 'CPL yang dibentuk (kode CPL, pisahkan koma)'], baris, [22, 60, 16, 30, 34],
    ['Petunjuk pengisian Bahan Kajian (BK)', '1. Satu baris = satu bahan kajian. Baris yang sudah berisi kode adalah BK yang ada: ubah isinya lalu unggah ulang.', '2. BK baru: kosongkan kolom Kode. Kode dibuat otomatis.', '3. Nama BK dan Kode BoK induk wajib diisi. Kode BoK dilihat di lembar DAFTAR (BoK harus sudah ada di aplikasi; impor BoK lebih dulu bila perlu).', '4. Kedalaman diisi level Bloom, misalnya C3. Boleh kosong, tetapi pemeriksa kurikulum akan memberi peringatan.', '5. CPL yang dibentuk ditulis kodenya, misalnya CPL01, CPL04. Boleh kosong.', '6. Hapus baris contoh bila ada. BK yang dihapus dari lembar ini TIDAK ikut terhapus di aplikasi.', '7. Unggah lewat tombol Impor Excel BK. Aplikasi menampilkan ringkasan dan meminta konfirmasi.'],
    [['DAFTAR RUJUKAN'], [], ['Kode BoK', 'Nama BoK'], ...bok.map(b => [b.kode, b.nama]), [], ['Kode CPL', 'Rumusan CPL'], ...cpl.map(c => [c.kode, c.teks])]);
}

export async function imporBk(file, pid) {
  const b = await bukaBuku(file, (h) => h.some(c => /^namabahan|^nama/.test(c)) && h.some(c => /bokinduk|^kodebok|^bok/.test(c)));
  if (!b) throw new Error('Kolom Nama bahan kajian dan Kode BoK induk tidak ditemukan. Gunakan templat dari tombol Templat BK.');
  const c = { kode: kolom(b.h, /^kodebk/, /^kode(?!bok)/), nama: kolom(b.h, /^namabahan/, /^nama/), bok: kolom(b.h, /^kodebokinduk/, /bokinduk/, /^kodebok/, /^bok/), ked: kolom(b.h, /^kedalaman/), cpl: kolom(b.h, /^cpl/) };
  const ada = byProdi(S.bk, pid), bok = byProdi(S.bok, pid), cpl = byProdi(S.cpl, pid), baru = [], ubah = [], lewat = [], catatan = [], disebut = new Set(); let tetap = 0;
  for (let r = b.mulai; r < b.rows.length; r++) {
    const row = b.rows[r]; if (hapusContoh(row)) continue; const no = r + 1, nama = spasi(row[c.nama]), kd = c.kode >= 0 ? nz(row[c.kode]) : ''; if (kd) disebut.add(norm(kd));
    if (!nama) { lewat.push(`baris ${no}: nama bahan kajian kosong`); continue; }
    const pb = bok.find(x => norm(x.kode) === norm(row[c.bok]));
    if (!pb) { lewat.push(`baris ${no}: kode BoK "${nz(row[c.bok])}" tidak ada. Impor atau tambahkan BoK dulu`); continue; }
    const ked = c.ked >= 0 ? nz(row[c.ked]).toUpperCase() : ''; if (ked && !LEVEL.includes(ked)) { lewat.push(`baris ${no}: kedalaman "${ked}" bukan level Bloom (C1 sampai C6, P1 sampai P5, A1 sampai A5)`); continue; }
    if (!ked) catatan.push(`baris ${no}: kedalaman kosong`);
    const idCpl = []; let salah = '';
    (c.cpl >= 0 ? pecah(row[c.cpl]) : []).forEach(k => { const p = cpl.find(x => norm(x.kode) === norm(k)); if (p) idCpl.push(p.id); else salah = k; });
    if (salah) { lewat.push(`baris ${no}: kode CPL "${salah}" tidak ada`); continue; }
    const sudah = kd ? ada.find(x => norm(x.kode) === norm(kd)) : ada.find(x => norm(x.nama) === norm(nama)); if (sudah) disebut.add(norm(sudah.kode));
    if (kd && !sudah) { lewat.push(`baris ${no}: kode "${kd}" tidak ada di prodi ${pid}. Kosongkan kolom kode untuk BK baru`); continue; }
    const d = { nama, bok: pb.id, kedalaman: ked, cpl: idCpl };
    if (sudah) { const sama = sudah.nama === nama && sudah.bok === d.bok && nz(sudah.kedalaman) === ked && JSON.stringify(sudah.cpl || []) === JSON.stringify(idCpl); if (sama) tetap++; else ubah.push({ ...sudah, ...d }); }
    else if (baru.some(x => norm(x.nama) === norm(nama))) lewat.push(`baris ${no}: nama "${nama}" ganda dalam berkas`); else baru.push({ ...d, prodi: pid });
  }
  const hp = rencanaHapus('bk', ada.filter(x => !disebut.has(norm(x.kode))));
  if (!baru.length && !ubah.length && !hp.boleh.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : tetap ? 'Tidak ada perubahan: semua baris sama dengan data di aplikasi.' : 'Tidak ada baris data terbaca.'); return; }
  const mode = await pratinjauImpor({ jenis: 'bahan kajian', baru: baru.map(d => d.nama), ubah: ubah.map(d => ({ label: `${d.kode} ${d.nama}`, detail: bedaRingkas(ada.find(x => x.id === d.id), d) })), tetap, lewat, catatan, boleh: hp.boleh, tahan: hp.tahan }); if (!mode) return;
  if (mode === 'ganti') { await templatBk(pid, awalCadangan()); await hp.jalan(pid); }
  if (ubah.length) await saveMany('bk', ubah, `Impor Excel: perbarui ${ubah.length} bahan kajian (${pid})`);
  for (const d of baru) { d.kode = kodeBerikut(S, 'bk', pid); d.id = `${pid}-${d.kode}-${Date.now().toString(36)}`; await save('bk', d, `Impor Excel: BK baru ${d.kode} (${pid})`); }
  toast(`Bahan kajian tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${lewat.length ? `, ${lewat.length} dilewati` : ''}${mode === 'ganti' ? `, ${hp.boleh.length} dihapus` : ''}.`); rerender();
}
