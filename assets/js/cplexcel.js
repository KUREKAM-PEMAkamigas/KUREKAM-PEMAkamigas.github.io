/* KUREKAM · Templat dan impor Excel untuk CPL.
   Satu lembar CPL berisi kode, ranah, unsur SN Dikti, rumusan, profil lulusan, dan butir IABEE.
   Level Bloom dideteksi otomatis dari kata kerja, jadi tidak diisi. Templat berisi CPL yang sudah ada,
   sehingga prodi dapat mengubah atau menambah baris lalu mengunggah ulang. */
import { S, ctx, save, saveMany, rerender, toast } from './app.js';
import { byProdi, kodeBerikut, rencanaSelaras, iabeeOf } from './rules.js';
import { BUTIR_IABEE } from './config.js';
import { detect } from './bloom.js';
import { unduh, tanya, loadXLSX } from './views/ui.js';

const RANAH = { S: 'Sikap', P: 'Pengetahuan', KU: 'Keterampilan umum', KK: 'Keterampilan khusus' };
const HINT = { S: 'A', P: 'C', KU: 'C', KK: 'C' };
const nz = (v) => String(v == null ? '' : v).trim();
const norm = (v) => nz(v).toLowerCase().replace(/[^a-z0-9]/g, '');
const pecah = (v) => nz(v).split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
const ranahDari = (v) => { const t = norm(v); const k = Object.keys(RANAH).find(r => r.toLowerCase() === t); if (k) return k; return Object.keys(RANAH).find(r => norm(RANAH[r]) === t) || ''; };

export async function templatCpl(pid) {
  const X = await loadXLSX(), wb = X.utils.book_new();
  const cpl = byProdi(S.cpl, pid), pl = byProdi(S.pl, pid);
  const head = ['Kode CPL (kosongkan untuk CPL baru)', 'Ranah (S, P, KU, atau KK)', 'Unsur SN Dikti (mis. P03 atau KK02, KK03)', 'Rumusan CPL (diawali kata kerja operasional)', 'Profil lulusan yang didukung (mis. PL01, PL02)', 'Butir IABEE (a sampai k, mis. a, c)', 'Level Bloom (otomatis, jangan diisi)'];
  const baris = cpl.map(c => { const b = detect(c.teks, HINT[c.ranah]); return [c.kode, c.ranah, String(c.sn || ''), c.teks, (c.pl || []).map(id => (pl.find(p => p.id === id) || {}).kode).filter(Boolean).join(', '), iabeeOf(c).join(', '), b ? b.code : '']; });
  const contoh = baris.length ? [] : [['', 'KK', 'KK02', 'Mampu merancang rangkaian elektronika analog untuk sistem pengondisi sinyal sesuai spesifikasi.', pl[0] ? pl[0].kode : 'PL01', 'c, e', 'Contoh, hapus baris ini']];
  const ws = X.utils.aoa_to_sheet([head, ...baris, ...contoh]); ws['!cols'] = [22, 16, 24, 80, 26, 20, 18].map(w => ({ wch: w })); ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  X.utils.book_append_sheet(wb, ws, 'CPL');
  const ptk = [['Petunjuk pengisian CPL'],
    ['1. Satu baris = satu CPL. Baris yang sudah berisi kode adalah CPL yang ada: ubah isinya lalu unggah ulang untuk memperbarui.'],
    ['2. Untuk CPL baru, biarkan kolom Kode kosong. Kode dibuat otomatis dan diurutkan menurut ranah (Sikap, Pengetahuan, Keterampilan umum, Keterampilan khusus).'],
    ['3. Ranah diisi S, P, KU, atau KK (boleh juga nama lengkapnya).'],
    ['4. Unsur SN Dikti ditulis kode unsurnya, misalnya S01, P03, KU02, KK05. Boleh lebih dari satu, dipisah koma. Awalan harus sama dengan ranahnya.'],
    ['5. Rumusan CPL diawali kata kerja operasional (Taksonomi Bloom). Level Bloom dideteksi otomatis oleh aplikasi dari kata kerja itu; kolom level hanya informasi dan diabaikan saat impor.'],
    ['6. Profil lulusan ditulis kodenya (lihat lembar DAFTAR). Wajib minimal satu.'],
    ['7. Butir IABEE ditulis hurufnya a sampai k (lihat lembar DAFTAR). Boleh lebih dari satu, dipisah koma.'],
    ['8. Hapus baris contoh bila ada. CPL yang dihapus dari lembar ini TIDAK ikut terhapus di aplikasi; penghapusan dilakukan di menu CPL.'],
    ['9. Setelah diisi, unggah lewat tombol Impor Excel di menu Capaian Pembelajaran Lulusan. Aplikasi menampilkan ringkasan dan meminta konfirmasi sebelum menyimpan.']];
  const wp = X.utils.aoa_to_sheet(ptk); wp['!cols'] = [{ wch: 130 }]; X.utils.book_append_sheet(wb, wp, 'PETUNJUK');
  const daf = [['DAFTAR RUJUKAN'], [], ['Ranah', 'Nama'], ...Object.entries(RANAH), [], ['Kode profil lulusan', 'Nama peran'], ...pl.map(p => [p.kode, p.nama || String(p.teks || '').slice(0, 80)]), [], ['Butir IABEE', 'Rumusan'], ...BUTIR_IABEE.map(b => [b.k, b.teks || b.ringkas])];
  const wd = X.utils.aoa_to_sheet(daf); wd['!cols'] = [{ wch: 22 }, { wch: 110 }]; X.utils.book_append_sheet(wb, wd, 'DAFTAR');
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Template_CPL_${pid}.xlsx`);
}

export async function imporCpl(file, pid) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
  let rows = null, h = null, mulai = 0;
  for (const nm of wb.SheetNames) { const r = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: '' }); const i = r.findIndex(x => x.some(c => /^ranah/.test(norm(c))) && x.some(c => /rumusan/.test(norm(c)))); if (i >= 0) { rows = r; h = r[i].map(norm); mulai = i + 1; break; } }
  if (!rows) throw new Error('Kolom Ranah dan Rumusan CPL tidak ditemukan. Gunakan templat dari tombol Templat Excel.');
  const kol = (...p) => { for (const q of p) { const i = h.findIndex(x => q.test(x)); if (i >= 0) return i; } return -1; };
  const c = { kode: kol(/^kodecpl/, /^kode/), ranah: kol(/^ranah/), sn: kol(/^unsur/, /sndikti/), teks: kol(/^rumusan/), pl: kol(/^profil/), ib: kol(/^butiriabee/, /^iabee/) };
  const cpl = byProdi(S.cpl, pid), pl = byProdi(S.pl, pid), kodeIb = new Set(BUTIR_IABEE.map(b => b.k));
  const baru = [], ubah = [], lewat = [], catatan = []; let bloomTanpa = 0, tetap = 0;
  for (let r = mulai; r < rows.length; r++) {
    const row = rows[r]; if (!row.some(v => nz(v))) continue; if (row.some(v => /hapus baris ini/i.test(nz(v)))) continue;
    const no = r + 1, ranah = ranahDari(row[c.ranah]), teks = nz(row[c.teks]).replace(/\s+/g, ' ');
    if (!ranah) { lewat.push(`baris ${no}: ranah "${nz(row[c.ranah])}" tidak dikenal`); continue; }
    if (!teks) { lewat.push(`baris ${no}: rumusan kosong`); continue; }
    const plKode = pecah(row[c.pl]).map(t => t.toUpperCase()), plId = [];
    let plSalah = '';
    plKode.forEach(k => { const p = pl.find(x => String(x.kode).toUpperCase() === k); if (p) plId.push(p.id); else plSalah = k; });
    if (plSalah) { lewat.push(`baris ${no}: profil lulusan "${plSalah}" tidak ada`); continue; }
    if (!plId.length) { lewat.push(`baris ${no}: profil lulusan wajib minimal satu`); continue; }
    const ib = pecah(row[c.ib]).map(t => t.toLowerCase().replace(/[()]/g, '')); const ibSalah = ib.find(k => !kodeIb.has(k));
    if (ibSalah) { lewat.push(`baris ${no}: butir IABEE "${ibSalah}" bukan a sampai k`); continue; }
    const sn = pecah(row[c.sn]).map(t => t.toUpperCase().replace(/^CPL-?/, '')); const snSalah = sn.find(k => !new RegExp(`^${ranah}\\d{2}$`).test(k));
    if (snSalah) { lewat.push(`baris ${no}: unsur SN Dikti "${snSalah}" tidak sesuai ranah ${ranah} (contoh ${ranah}01)`); continue; }
    const b = detect(teks, HINT[ranah]); if (!b) { bloomTanpa++; catatan.push(`baris ${no}: tidak diawali kata kerja operasional Bloom`); } else if (b.kabur) catatan.push(`baris ${no}: kata kerja "${b.verb}" kurang terukur`);
    const kd = c.kode >= 0 ? nz(row[c.kode]) : '', ada = kd ? cpl.find(x => String(x.kode).toUpperCase() === kd.toUpperCase()) : null;
    if (kd && !ada) { lewat.push(`baris ${no}: kode "${kd}" tidak ada di prodi ${pid}. Kosongkan kolom kode untuk CPL baru`); continue; }
    const d = { ranah, sn: sn.join(', '), teks, pl: plId, iabee: ib };
    if (ada) { const sama = ada.ranah === d.ranah && String(ada.sn || '') === d.sn && nz(ada.teks).replace(/\s+/g, ' ') === d.teks && JSON.stringify(ada.pl || []) === JSON.stringify(d.pl) && JSON.stringify(iabeeOf(ada)) === JSON.stringify(d.iabee); if (!sama) ubah.push({ ...ada, ...d }); else tetap++; } else baru.push({ ...d, prodi: pid });
  }
  if (!baru.length && !ubah.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : tetap ? 'Tidak ada perubahan: semua baris sama dengan data di aplikasi.' : 'Tidak ada baris data terbaca.'); return; }
  const msg = `${baru.length} CPL baru dan ${ubah.length} CPL diperbarui${tetap ? `, ${tetap} tidak berubah` : ''}.${lewat.length ? ` ${lewat.length} baris dilewati (${lewat.slice(0, 3).join('; ')}${lewat.length > 3 ? ', ...' : ''}).` : ''}${catatan.length ? ` Catatan Bloom: ${catatan.slice(0, 3).join('; ')}${catatan.length > 3 ? ', ...' : ''}.` : ''} Lanjutkan?`;
  if (!(await tanya(msg, 'Simpan CPL'))) return;
  if (ubah.length) await saveMany('cpl', ubah, `Impor Excel: perbarui ${ubah.length} CPL (${pid})`);
  for (const d of baru) { d.kode = kodeBerikut(S, 'cpl', pid); d.id = `${pid}-${d.kode}`; await save('cpl', d, `Impor Excel: CPL baru ${d.kode} (${pid})`); }
  const r2 = rencanaSelaras(S, pid); if (r2.cpl.length) await saveMany('cpl', r2.cpl, `Urutkan kode CPL menurut ranah (${pid})`); if (r2.pi.length) await saveMany('pi', r2.pi);
  toast(`CPL tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${lewat.length ? `, ${lewat.length} dilewati` : ''}.`); rerender();
}
