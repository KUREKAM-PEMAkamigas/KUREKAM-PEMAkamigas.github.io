/* KUREKAM · Templat dan impor Excel untuk Daftar Mata Kuliah dan untuk Matriks CPL-CPMK (masing-masing terpisah).
   Templat berisi data yang sudah ada. Kode lama memperbarui, kode kosong membuat baru (kode otomatis).
   Impor tidak pernah menghapus data. Aturan yang sama dengan formulir dipakai pada tiap baris. */
import { S, ctx, save, saveMany, rerender, toast, uid } from './app.js';
import { byProdi, param, cplTerlaluTinggi, cpmkProdi } from './rules.js';
import { KELOMPOK } from './config.js';
import { kodeBaruMk, awalPraktik } from './kode.js';
import { detect, alasanOk } from './bloom.js';
import { unduh, tanya } from './views/ui.js';
import { urutkanCpmk } from './views/matrikscpmk.js';
import { nz, norm, spasi, pecah, bukaBuku, kolom, hapusContoh, tulisBuku } from './bokexcel.js';

const khusus = (kel) => /magang|tugas akhir/i.test(kel || '');
const kodeMkDari = (mk, t) => mk.find(m => norm(m.kode) === norm(t) || norm(m.nama) === norm(t));

/* ---------------- Daftar mata kuliah ---------------- */
export async function templatMk(pid) {
  const mk = byProdi(S.mk, pid), bk = byProdi(S.bk, pid), cpl = byProdi(S.cpl, pid);
  const kBk = (id) => (bk.find(x => x.id === id) || {}).kode, kCpl = (id) => (cpl.find(x => x.id === id) || {}).kode, kMk = (id) => (mk.find(x => x.id === id) || {}).kode;
  const baris = mk.slice().sort((a, b) => a.smt - b.smt || String(a.kode).localeCompare(String(b.kode))).map(m => [m.kode, m.nama, m.smt, m.kel, m.T, m.P, m.lokasi || 'Kampus', m.inti ? 'Ya' : '', (m.prasyarat || []).map(kMk).filter(Boolean).join(', '), (m.bk || []).map(kBk).filter(Boolean).join(', '), (m.cpl || []).map(kCpl).filter(Boolean).join(', '), m.kompetensi || '', m.alasanCpl || '']);
  if (!baris.length) baris.push(['', 'Elektronika Analog', 2, 'MKK - kompetensi penciri', 1, 0, 'Kampus', 'Ya', '', '', cpl[0] ? cpl[0].kode : 'CPL01', 'penguat, sensor', '', 'Contoh, hapus baris ini']);
  await tulisBuku(`Template_Mata_Kuliah_${pid}.xlsx`,
    ['Kode MK (kosongkan untuk MK baru)', 'Nama mata kuliah', 'Semester (1 sampai 8)', 'Kelompok (lihat lembar DAFTAR)', 'SKS teori', 'SKS praktik', 'Lokasi (Kampus, Laboratorium, Industri)', 'MK inti (isi Ya bila inti)', 'Prasyarat (kode MK, pisahkan koma)', 'Bahan kajian (kode BK, pisahkan koma)', 'CPL yang didukung (kode CPL, pisahkan koma)', 'Kompetensi dosen untuk MK inti (kata kunci)', 'Alasan pengecualian rambu semester (bila perlu)'],
    baris, [20, 44, 12, 30, 10, 10, 18, 14, 26, 26, 30, 34, 34],
    ['Petunjuk pengisian Daftar Mata Kuliah', '1. Satu baris = satu mata kuliah. Baris yang sudah berisi kode adalah MK yang ada: ubah isinya lalu unggah ulang. Nama yang sama dengan MK yang ada juga dianggap MK itu.', '2. MK baru: kosongkan kolom Kode. Kode dibuat otomatis sesuai Pedoman.', '3. Kelompok harus persis salah satu pilihan di lembar DAFTAR. SKS teori dan praktik berupa angka.', '4. Aturan Pedoman tetap berlaku: SKS praktik maksimal sesuai parameter (kecuali magang dan tugas akhir); MK praktik murni (SKS teori 0) namanya diawali "Praktik" atau "Praktikum"; teori dan praktik dipisah menjadi MK berbeda.', '5. CPL tingkat tinggi tidak dapat dibebankan pada semester awal kecuali kolom alasan pengecualian diisi.', '6. Prasyarat, bahan kajian, dan CPL ditulis kodenya. Prasyarat juga boleh berupa nama MK, termasuk MK baru dalam berkas yang sama. Kode yang tidak dikenal membuat baris dilewati.', '7. MK kunci (MK bersama yang dikunci Pedoman) hanya dapat diubah oleh admin; barisnya dilewati.', '8. MK yang dihapus dari lembar ini TIDAK ikut terhapus di aplikasi. Hapus baris contoh sebelum mengunggah.'],
    [['DAFTAR RUJUKAN'], [], ['Kelompok (salin persis)', 'Kategori IABEE'], ...KELOMPOK.map(k => [k.id, k.iabee]), [], ['Kode BK', 'Nama bahan kajian'], ...bk.map(x => [x.kode, x.nama]), [], ['Kode CPL', 'Rumusan CPL'], ...cpl.map(c => [c.kode, c.teks])]);
}

export async function imporMk(file, pid) {
  const b = await bukaBuku(file, (h) => h.some(c => /^namamatakuliah|^nama/.test(c)) && h.some(c => /^semester/.test(c)));
  if (!b) throw new Error('Kolom Nama mata kuliah dan Semester tidak ditemukan. Gunakan templat dari tombol Templat Excel.');
  const k = { kode: kolom(b.h, /^kodemk/, /^kode/), nama: kolom(b.h, /^namamatakuliah/, /^nama/), smt: kolom(b.h, /^semester/), kel: kolom(b.h, /^kelompok/), T: kolom(b.h, /^sksteori/), P: kolom(b.h, /^skspraktik/), lok: kolom(b.h, /^lokasi/), inti: kolom(b.h, /^mkinti/), pra: kolom(b.h, /^prasyarat/), bk: kolom(b.h, /^bahankajian/), cpl: kolom(b.h, /^cpl/), kom: kolom(b.h, /^kompetensi/), alasan: kolom(b.h, /^alasan/) };
  if (k.T < 0 || k.P < 0) throw new Error('Kolom SKS teori dan SKS praktik tidak ditemukan.');
  const mk = byProdi(S.mk, pid), bk = byProdi(S.bk, pid), cpl = byProdi(S.cpl, pid), P = param(S), admin = ['admin', 'developer'].includes(ctx.role);
  const baru = [], ubah = [], lewat = [], pasca = []; let tetap = 0;
  const tampung = mk.slice();
  for (let r = b.mulai; r < b.rows.length; r++) {
    const row = b.rows[r]; if (hapusContoh(row)) continue; const no = r + 1, nama = spasi(row[k.nama]), kd = k.kode >= 0 ? nz(row[k.kode]) : '';
    if (!nama) { lewat.push(`baris ${no}: nama MK kosong`); continue; }
    const smt = Number(row[k.smt]); if (!Number.isInteger(smt) || smt < 1 || smt > 8) { lewat.push(`baris ${no} (${nama}): semester harus 1 sampai 8`); continue; }
    const T = Number(row[k.T] === '' ? 0 : row[k.T]), Pr = Number(row[k.P] === '' ? 0 : row[k.P]); if (!Number.isFinite(T) || !Number.isFinite(Pr) || T < 0 || Pr < 0 || T + Pr <= 0) { lewat.push(`baris ${no} (${nama}): SKS teori dan praktik tidak valid`); continue; }
    const sudah = kd ? mk.find(m => norm(m.kode) === norm(kd)) : mk.find(m => norm(m.nama) === norm(nama));
    if (kd && !sudah) { lewat.push(`baris ${no} (${nama}): kode "${kd}" tidak ada di prodi ${pid}. Kosongkan kolom kode untuk MK baru`); continue; }
    if (sudah && sudah.kunci && !admin) { lewat.push(`baris ${no} (${nama}): MK kunci hanya dapat diubah admin`); continue; }
    const kelRaw = k.kel >= 0 ? spasi(row[k.kel]) : '', kelMatch = KELOMPOK.find(x => norm(x.id) === norm(kelRaw));
    if (kelRaw && !kelMatch) { lewat.push(`baris ${no} (${nama}): kelompok "${kelRaw}" tidak dikenal (lihat lembar DAFTAR)`); continue; }
    const kel = kelMatch ? kelMatch.id : (sudah ? sudah.kel : ''); if (!kel) { lewat.push(`baris ${no} (${nama}): kelompok wajib diisi`); continue; }
    if (Pr > P.praktikMaxSks && !khusus(kel)) { lewat.push(`baris ${no} (${nama}): MK praktik dibatasi 1 sampai ${P.praktikMaxSks} SKS`); continue; }
    if (T === 0 && Pr > 0 && !khusus(kel) && !awalPraktik(nama)) { lewat.push(`baris ${no} (${nama}): nama MK praktik harus diawali "Praktik" atau "Praktikum"`); continue; }
    const idBk = [], idCpl = []; let salah = '';
    (k.bk >= 0 ? pecah(row[k.bk]) : []).forEach(t => { const x = bk.find(y => norm(y.kode) === norm(t)); if (x) idBk.push(x.id); else salah = `bahan kajian "${t}"`; });
    (k.cpl >= 0 ? pecah(row[k.cpl]) : []).forEach(t => { const x = cpl.find(y => norm(y.kode) === norm(t)); if (x) idCpl.push(x.id); else salah = `CPL "${t}"`; });
    if (salah) { lewat.push(`baris ${no} (${nama}): ${salah} tidak ada`); continue; }
    const alasan = k.alasan >= 0 ? spasi(row[k.alasan]) : '';
    const tinggi = idCpl.map(id => cpl.find(c => c.id === id)).filter(c => c && cplTerlaluTinggi(c, smt));
    if (tinggi.length && !alasanOk(alasan) && !khusus(kel)) { lewat.push(`baris ${no} (${nama}): CPL ${tinggi.map(c => c.kode).join(', ')} terlalu tinggi untuk semester ${smt}; isi alasan pengecualian`); continue; }
    const d = { nama, smt, kel, T, P: Pr, lokasi: (k.lok >= 0 && ['Kampus', 'Laboratorium', 'Industri'].find(x => norm(x) === norm(row[k.lok]))) || (sudah ? sudah.lokasi : (Pr > T ? 'Laboratorium' : 'Kampus')), inti: k.inti >= 0 ? /^(ya|y|1|true|inti)$/i.test(nz(row[k.inti])) : !!(sudah && sudah.inti), bk: idBk, cpl: idCpl, kompetensi: k.kom >= 0 ? spasi(row[k.kom]) : (sudah ? sudah.kompetensi || '' : ''), alasanCpl: alasan };
    d.kat = (kelMatch && kelMatch.iabee) || (sudah && sudah.kat) || 'Muatan spesifik';
    const praTeks = k.pra >= 0 ? pecah(row[k.pra]) : [];
    if (sudah) {
      const prasama = JSON.stringify((sudah.prasyarat || []).slice().sort());
      const baruRec = { ...sudah, ...d, prasyarat: sudah.prasyarat || [] };
      const sama = ['nama', 'smt', 'kel', 'T', 'P', 'lokasi', 'inti', 'kompetensi'].every(f => (sudah[f] || '') === (baruRec[f] || '') || (f === 'inti' && !!sudah.inti === !!baruRec.inti)) && JSON.stringify((sudah.bk || []).slice().sort()) === JSON.stringify(idBk.slice().sort()) && JSON.stringify((sudah.cpl || []).slice().sort()) === JSON.stringify(idCpl.slice().sort()) && nz(sudah.alasanCpl) === alasan;
      pasca.push({ rec: baruRec, pra: praTeks, prasama, sama, baru: false });
    } else {
      const rec = { ...d, id: uid(pid + '-MK'), prodi: pid, prasyarat: [] }; rec.kode = kodeBaruMk(tampung.filter(m => m.id !== rec.id), rec);
      if (tampung.some(m => norm(m.nama) === norm(nama))) { lewat.push(`baris ${no} (${nama}): nama ganda dalam berkas`); continue; }
      tampung.push(rec); pasca.push({ rec, pra: praTeks, prasama: '[]', sama: false, baru: true });
    }
  }
  /* prasyarat dipetakan sesudah semua MK (termasuk yang baru dalam berkas) dikenal */
  pasca.forEach(p => {
    if (p.pra.length) { const ids = []; let salah = ''; p.pra.forEach(t => { const x = kodeMkDari(tampung, t); if (x && x.id !== p.rec.id) ids.push(x.id); else salah = t; }); if (salah) { lewat.push(`${p.rec.nama}: prasyarat "${salah}" tidak dikenal (prasyarat tidak diubah)`); } else { p.rec.prasyarat = ids; if (JSON.stringify(ids.slice().sort()) !== p.prasama) p.sama = false; } }
    if (p.baru) baru.push(p.rec); else if (p.sama) tetap++; else ubah.push(p.rec);
  });
  if (!baru.length && !ubah.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : tetap ? 'Tidak ada perubahan: semua baris sama dengan data di aplikasi.' : 'Tidak ada baris data terbaca.'); return; }
  const msg = `${baru.length} MK baru dan ${ubah.length} MK diperbarui${tetap ? `, ${tetap} tidak berubah` : ''}.${lewat.length ? ` ${lewat.length} baris dilewati (${lewat.slice(0, 3).join('; ')}${lewat.length > 3 ? ', ...' : ''}).` : ''} Lanjutkan?`;
  if (!(await tanya(msg, 'Simpan mata kuliah'))) return;
  const semua = [...ubah, ...baru]; await saveMany('mk', semua, `Impor Excel: ${baru.length} MK baru, ${ubah.length} diperbarui (${pid})`);
  toast(`MK tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${lewat.length ? `, ${lewat.length} dilewati` : ''}.`); rerender();
}

/* ---------------- Matriks CPL-CPMK ---------------- */
export async function templatCpmk(pid) {
  const mk = byProdi(S.mk, pid), cpl = byProdi(S.cpl, pid), grup = cpmkProdi(S, pid);
  const kCpl = (id) => (cpl.find(x => x.id === id) || {}).kode || '';
  const baris = grup.map(g => [g.kode, kCpl(g.cpl), g.teks, g.rec.map(x => (mk.find(m => m.id === x.mk) || {}).kode).filter(Boolean).join(', ')]);
  if (!baris.length) baris.push(['', cpl[0] ? cpl[0].kode : 'CPL01', 'Mampu menjelaskan prinsip kerja sensor dan penguat sinyal.', mk[0] ? mk[0].kode : '', 'Contoh, hapus baris ini']);
  await tulisBuku(`Template_CPMK_${pid}.xlsx`, ['Kode CPMK (kosongkan untuk CPMK baru)', 'Kode CPL induk (satu CPL)', 'Rumusan CPMK (diawali kata kerja operasional)', 'Mata kuliah yang memuat (kode MK, pisahkan koma)'], baris, [22, 18, 80, 44],
    ['Petunjuk pengisian Matriks CPL-CPMK', '1. Satu baris = satu CPMK milik prodi, diturunkan dari satu CPL, dan boleh dimuat banyak mata kuliah.', '2. Baris yang sudah berisi kode adalah CPMK yang ada: ubah rumusan atau tambahkan mata kuliah, lalu unggah ulang. CPMK baru: kosongkan kolom kode; kode dibuat otomatis menurut urutan CPL.', '3. Kode CPL induk wajib ada. Mata kuliah yang dicantumkan harus sudah dibebani CPL itu di menu Mata Kuliah & SKS; bila belum, MK tersebut dilewati dengan keterangan.', '4. Rumusan CPMK diawali kata kerja operasional (Taksonomi Bloom). Level Bloom dideteksi otomatis. Level CPMK tidak boleh melampaui level CPL induknya.', '5. Impor hanya MENAMBAH mata kuliah pada CPMK dan tidak melepasnya. Untuk melepas MK dari CPMK, pakai formulir di menu Matriks CPL-CPMK.', '6. Hapus baris contoh sebelum mengunggah.'],
    [['DAFTAR RUJUKAN'], [], ['Kode CPL', 'Rumusan CPL'], ...cpl.map(c => [c.kode, c.teks]), [], ['Kode MK', 'Nama mata kuliah (CPL yang dibebankan)'], ...mk.map(m => [m.kode, `${m.nama} (smt ${m.smt}; ${(m.cpl || []).map(id => kCpl(id)).filter(Boolean).join(', ') || 'belum ada CPL'})`])]);
}

export async function imporCpmk(file, pid) {
  const b = await bukaBuku(file, (h) => h.some(c => /^rumusan/.test(c)) && h.some(c => /cpl/.test(c)));
  if (!b) throw new Error('Kolom Kode CPL dan Rumusan CPMK tidak ditemukan. Gunakan templat dari tombol Templat Excel.');
  const k = { kode: kolom(b.h, /^kodecpmk/, /^kodecp(?!l)/), cpl: kolom(b.h, /^kodecpl/, /^cpl/), teks: kolom(b.h, /^rumusan/), mk: kolom(b.h, /^matakuliah/, /^mk/) };
  const mk = byProdi(S.mk, pid), cpl = byProdi(S.cpl, pid), grup = cpmkProdi(S, pid), baru = [], ubah = [], lewat = [], catatan = []; let tetap = 0, tambahMk = 0;
  const kunci = (t, c) => spasi(t).toLowerCase() + '|' + c;
  const buat = [], ganti = [];
  for (let r = b.mulai; r < b.rows.length; r++) {
    const row = b.rows[r]; if (hapusContoh(row)) continue; const no = r + 1, teks = spasi(row[k.teks]), kd = k.kode >= 0 ? nz(row[k.kode]) : '';
    if (!teks) { lewat.push(`baris ${no}: rumusan CPMK kosong`); continue; }
    const cp = cpl.find(x => norm(x.kode) === norm(row[k.cpl])); if (!cp) { lewat.push(`baris ${no}: kode CPL "${nz(row[k.cpl])}" tidak ada`); continue; }
    const bc = detect(teks, 'C'), bl = detect(cp.teks, cp.ranah === 'S' ? 'A' : 'C');
    if (!bc) catatan.push(`baris ${no}: tidak diawali kata kerja Bloom`); else if (bc.kabur) catatan.push(`baris ${no}: kata kerja "${bc.verb}" kurang terukur`); else if (bl && bc.d === bl.d && bc.n > bl.n) { lewat.push(`baris ${no}: level ${bc.code} melampaui CPL ${cp.kode} (${bl.code})`); continue; }
    const g = kd ? grup.find(x => norm(x.kode) === norm(kd)) : grup.find(x => kunci(x.teks, x.cpl) === kunci(teks, cp.id));
    if (kd && !g) { lewat.push(`baris ${no}: kode "${kd}" tidak ada di prodi ${pid}. Kosongkan kolom kode untuk CPMK baru`); continue; }
    const idMk = []; let salahMk = '';
    (k.mk >= 0 ? pecah(row[k.mk]) : []).forEach(t => { const m = kodeMkDari(mk, t); if (!m) salahMk = `MK "${t}" tidak ada`; else if (!(m.cpl || []).includes(cp.id)) catatan.push(`baris ${no}: ${m.kode} belum dibebani ${cp.kode}, dilewati`); else idMk.push(m.id); });
    if (salahMk) { lewat.push(`baris ${no}: ${salahMk}`); continue; }
    if (g) {
      const mkAda = new Set(g.rec.map(x => x.mk)), tambah = idMk.filter(id => !mkAda.has(id));
      const gantiTeks = spasi(g.teks) !== teks;
      if (gantiTeks) g.rec.forEach(x => ganti.push({ ...x, teks }));
      tambah.forEach(id => buat.push({ id: uid(id + '-CPMK'), mk: id, prodi: pid, kode: g.kode, teks: gantiTeks ? teks : g.teks, cpl: [g.cpl] })); tambahMk += tambah.length;
      if (!gantiTeks && !tambah.length) tetap++; else ubah.push(g.kode);
    } else {
      if (!idMk.length) { lewat.push(`baris ${no}: CPMK baru wajib dimuat sedikitnya satu mata kuliah yang dibebani ${cp.kode}`); continue; }
      idMk.forEach(id => buat.push({ id: uid(id + '-CPMK'), mk: id, prodi: pid, kode: '', teks, cpl: [cp.id] })); baru.push(teks);
    }
  }
  if (!baru.length && !ubah.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : tetap ? 'Tidak ada perubahan: semua baris sama dengan data di aplikasi.' : 'Tidak ada baris data terbaca.'); return; }
  const msg = `${baru.length} CPMK baru dan ${ubah.length} CPMK diperbarui${tetap ? `, ${tetap} tidak berubah` : ''} (${tambahMk} pemuatan MK ditambahkan).${lewat.length ? ` ${lewat.length} baris dilewati (${lewat.slice(0, 3).join('; ')}${lewat.length > 3 ? ', ...' : ''}).` : ''}${catatan.length ? ` Catatan: ${catatan.slice(0, 2).join('; ')}${catatan.length > 2 ? ', ...' : ''}.` : ''} Lanjutkan?`;
  if (!(await tanya(msg, 'Simpan CPMK'))) return;
  if (ganti.length) await saveMany('cpmk', ganti, `Impor Excel: ubah rumusan CPMK (${pid})`);
  if (buat.length) await saveMany('cpmk', buat, `Impor Excel: ${buat.length} pemuatan CPMK (${pid})`);
  await urutkanCpmk(pid);
  toast(`CPMK tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${lewat.length ? `, ${lewat.length} dilewati` : ''}.`); rerender();
}
