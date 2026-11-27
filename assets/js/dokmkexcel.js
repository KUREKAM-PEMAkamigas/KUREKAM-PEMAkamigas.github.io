/* KUREKAM · Paket dokumen MK dalam Excel: lembar DESKRIPSI, RPS, dan SAP dalam satu berkas, per prodi atau per MK.
   Templat memuat isian yang sudah ada. Impor memeriksa tiap baris, menampilkan pratinjau, lalu menyimpan.
   Aturan: hanya menambah dan memperbarui sel yang diisi di Excel (sel kosong tidak menghapus isian yang ada);
   RPS yang sudah disahkan tidak dapat ditimpa oleh dosen; MK tanpa CPL terkunci; dosen hanya MK yang diampu. */
import { S, ctx, can, save, saveMany, rerender, toast } from './app.js';
import { byProdi, mkTanpaCpl, rpsOf } from './rules.js';
import { pratinjauImpor } from './impor.js';
import { nz, norm, spasi, kolom, hapusContoh, tulisBuku } from './bokexcel.js';
import { pecahPustaka, gabungUtama, gabungPend, pecahBaris } from './rpsisi.js';
import { blankRps } from './views/ajar.js';
import { turunkanDok } from './views/dokgen.js';
import { loadXLSX, unduh } from './views/ui.js';

const akad = (m) => !/magang|tugas akhir/i.test(m.kel || '');
const urut = (a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true });
const potong = (t, n = 60) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

export const KEPALA_DESK = ['Kode MK', 'Nama MK', 'Deskripsi singkat (3 sampai 5 kalimat)', 'Kata kunci topik (pisah titik koma, minimal 5)', 'Pustaka utama (satu per baris, minimal 1)', 'Pustaka pendukung (satu per baris, boleh kosong)', 'Mata kuliah syarat (kode MK, pisah titik koma)'];
export const KEPALA_RPS = ['Kode MK', 'Nama MK', 'Pertemuan (1-16)', 'Kode Sub-CPMK (pisah koma)', 'Materi atau pokok bahasan', 'Indikator (satu per baris)', 'Bentuk dan metode tatap muka', 'Aktivitas daring', 'Teknik asesmen', 'Bobot penilaian (%)', 'Ujian (UTS atau UAS, isi otomatis)'];
export const KEPALA_SAP = ['Kode MK', 'Nama MK', 'Pertemuan (1-16)', 'Judul topik', 'Pendahuluan', 'Kegiatan inti', 'Penutup', 'Media dan alat (satu per baris)', 'Butir soal atau penugasan (satu per baris)'];

/** MK yang boleh diisi pengguna ini: tidak terkunci dan sesuai hak mengisi RPS. */
export const mkBolehDok = (pid) => byProdi(S.mk, pid).filter(m => akad(m) && !mkTanpaCpl(m) && can('rps', { prodi: m.prodi, mk: m.id }));
const kodeSub = (id) => (S.sub.find(s => s.id === id) || {}).kode || '';
const idMk = (mk, t) => mk.find(m => norm(m.kode) === norm(t) || (norm(t).length > 3 && norm(m.nama) === norm(t)));

/** Cocokkan kode Sub-CPMK dari Excel: kode penuh, nomor saja (0501, 05.01, 5-1), atau urutan S1. Hasil: id atau ''. */
export function cocokSub(subs, tok) {
  const t = norm(tok); if (!t) return '';
  let s = subs.find(x => norm(x.kode) === t); if (s) return s.id;
  const dig = t.replace(/\D/g, ''); if (!dig) return '';
  s = subs.find(x => String(x.kode).replace(/\D/g, '') === dig); if (s) return s.id;
  if (/^s\d+$/.test(t) || /^\d{1,2}$/.test(t)) { const n = +dig; const urutan = subs.slice().sort(urut); if (urutan[n - 1] && t.length <= 3) return urutan[n - 1].id; }
  return '';
}

/* ---------- templat ---------- */
export async function templatDokMk(pid, mkIds, awal = 'Template', namaTunggal = '') {
  const semua = byProdi(S.mk, pid).filter(m => akad(m) && !mkTanpaCpl(m) && (!mkIds || mkIds.includes(m.id))).sort((a, b) => a.smt - b.smt || urut(a, b));
  if (!semua.length) { toast('Belum ada MK yang dibebani CPL untuk dibuatkan templat.'); return; }
  const X = await loadXLSX(), wb = X.utils.book_new();
  const dD = [], dR = [], dS = [], ref = [];
  semua.forEach(m => {
    const r = rpsOf(S, m.id) || blankRps(m), subs = S.sub.filter(s => s.mk === m.id).sort(urut), pu = pecahPustaka(r.pustaka, r.pustakaPendukung);
    const syar = (r.syaratIds || []).map(id => (S.mk.find(x => x.id === id) || {}).kode).filter(Boolean).join('; ') || '';
    dD.push([m.kode, m.nama, r.deskripsi || '', (r.kataKunci || []).join('; '), pu.utama.join('\n'), pu.pend.join('\n'), syar]);
    subs.forEach(s => ref.push([`${m.kode} · ${s.kode}`, s.teks]));
    (r.pertemuan || []).forEach(p => {
      dR.push([m.kode, m.nama, p.m, p.ujian ? '' : (p.sub || []).map(kodeSub).filter(Boolean).join(', '), p.materi || '', p.indikator || '', p.tatap || p.metode || '', p.daring || '', p.asesmen || '', p.bobot || '', p.ujian || '']);
      const sp = p.sap || {};
      dS.push([m.kode, m.nama, p.m, p.judul || '', sp.pendahuluan || '', p.ujian ? '' : (sp.inti || ''), sp.penutup || '', sp.media || '', sp.soal || '']);
    });
  });
  const tambah = (aoa, nama, lebar) => { const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = lebar.map(w => ({ wch: w })); ws['!freeze'] = { xSplit: 0, ySplit: 1 }; X.utils.book_append_sheet(wb, ws, nama); };
  tambah([KEPALA_DESK, ...dD], 'DESKRIPSI', [10, 36, 70, 40, 60, 50, 24]);
  tambah([KEPALA_RPS, ...dR], 'RPS', [10, 30, 8, 24, 50, 50, 40, 36, 24, 10, 10]);
  tambah([KEPALA_SAP, ...dS], 'SAP', [10, 30, 8, 36, 50, 60, 40, 36, 44]);
  const pet = ['Petunjuk pengisian paket dokumen MK (Deskripsi, RPS, SAP)', '',
    '1. Tiga lembar: DESKRIPSI (satu baris per MK), RPS (16 baris per MK, satu per pertemuan), SAP (16 baris per MK). Kolom Kode MK, Nama MK, dan Pertemuan jangan diubah.',
    '2. Isi bertahap boleh. Lembar atau sel yang kosong dilewati: isian yang sudah ada di aplikasi TIDAK dihapus. Untuk mengosongkan isian, ubah di aplikasi.',
    '3. Kode Sub-CPMK pada lembar RPS: tulis lengkap (misalnya SUB-CPMK0501) atau nomornya saja (0501). Beberapa Sub-CPMK dipisah koma. Daftar Sub-CPMK tiap MK ada di lembar DAFTAR. Pertemuan 8 (UTS) dan 16 (UAS) otomatis memuat semua Sub-CPMK.',
    '4. Indikator, pustaka, media, dan butir soal: satu butir per baris di dalam sel (Alt+Enter). Kata kunci dipisah titik koma.',
    '5. Bobot penilaian dalam persen; jumlah semua pertemuan satu MK sebaiknya 100. Bila tidak 100, tetap disimpan dengan peringatan.',
    '6. Deskripsi singkat, minimal 5 kata kunci, dan minimal 1 pustaka utama adalah isian wajib. Bila kurang, tetap disimpan dengan catatan.',
    '7. MK yang belum dibebani CPL tidak ada di berkas ini. RPS yang sudah disahkan tidak dapat diubah dosen lewat impor. Dosen hanya memperoleh MK yang diampu.',
    '8. Setelah unggah ada pratinjau per MK (baru, diperbarui, dilewati) dan baru disimpan setelah disetujui. RPS yang sudah diajukan atau disahkan akan kembali berstatus draf dan SAP perlu disetujui ulang.'];
  const wp = X.utils.aoa_to_sheet(pet.map(t => [t])); wp['!cols'] = [{ wch: 140 }]; X.utils.book_append_sheet(wb, wp, 'PETUNJUK');
  const wd = X.utils.aoa_to_sheet([['Kode MK · Kode Sub-CPMK', 'Rumusan Sub-CPMK'], ...ref]); wd['!cols'] = [{ wch: 28 }, { wch: 110 }]; X.utils.book_append_sheet(wb, wd, 'DAFTAR');
  const nama = namaTunggal ? `${awal}_DokumenMK_${namaTunggal}.xlsx` : `${awal}_DokumenMK_${pid}.xlsx`;
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), nama);
}

/* ---------- impor ---------- */
/** Cari lembar menurut nama (DESKRIPSI, RPS, SAP) atau menurut kepala kolom; kembalikan {h, rows, mulai} atau null. */
function cariLembar(X, wb, nama, cocok) {
  const urutan = [...wb.SheetNames.filter(n => norm(n) === nama), ...wb.SheetNames.filter(n => norm(n) !== nama)];
  for (const n of urutan) {
    const r = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
    const i = r.findIndex(x => cocok(x.map(norm)));
    if (i >= 0) return { rows: r, h: r[i].map(norm), mulai: i + 1, nama: n };
  }
  return null;
}
const angka = (v) => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.').replace('%', '')); return Number.isFinite(n) ? n : NaN; };

/** Baca berkas menjadi data mentah per MK, tanpa menyimpan. Hasil: {desk, rps, sap, lewat, catatan, adaLembar}. */
export async function bacaDokMk(file, pid) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
  const mkPid = byProdi(S.mk, pid), boleh = new Set(mkBolehDok(pid).map(m => m.id)), lewat = [], catatan = [];
  const o = { desk: new Map(), rps: new Map(), sap: new Map(), lewat, catatan, adaLembar: [] };
  const mkSah = (row, kMk, no, lembar) => {
    const m = idMk(mkPid, row[kMk]); if (!m) { lewat.push(`${lembar} baris ${no}: MK "${nz(row[kMk])}" tidak ada di prodi ini`); return null; }
    if (mkTanpaCpl(m)) { lewat.push(`${lembar} baris ${no} (${m.kode}): MK belum dibebani CPL, belum dapat diisi`); return null; }
    if (!boleh.has(m.id)) { lewat.push(`${lembar} baris ${no} (${m.kode}): di luar MK yang boleh Anda isi`); return null; }
    return m;
  };
  const d = cariLembar(X, wb, 'deskripsi', (h) => h.some(c => /^deskripsisingkat/.test(c)) && h.some(c => /^kodemk|^namamk/.test(c)));
  if (d) {
    o.adaLembar.push('DESKRIPSI');
    const k = { mk: kolom(d.h, /^kodemk/, /^namamk/), desk: kolom(d.h, /^deskripsi/), kunci: kolom(d.h, /^katakunci/), pu: kolom(d.h, /^pustakautama/), pp: kolom(d.h, /^pustakapendukung/), sy: kolom(d.h, /^matakuliahsyarat|^syarat/) };
    for (let i = d.mulai; i < d.rows.length; i++) {
      const row = d.rows[i]; if (hapusContoh(row)) continue; const no = i + 1, m = mkSah(row, k.mk, no, 'DESKRIPSI'); if (!m) continue;
      const x = {};
      if (k.desk >= 0 && nz(row[k.desk])) x.deskripsi = spasi(row[k.desk]);
      if (k.kunci >= 0 && nz(row[k.kunci])) x.kataKunci = nz(row[k.kunci]).split(/[;\n]+/).map(t => t.trim()).filter(Boolean);
      if (k.pu >= 0 && nz(row[k.pu])) x.pustakaU = pecahBaris(row[k.pu]).map(t => t.replace(/^\(?\d+\)\s*/, ''));
      if (k.pp >= 0 && nz(row[k.pp])) x.pustakaP = pecahBaris(row[k.pp]).map(t => t.replace(/^\(?S\d+\)\s*/i, ''));
      if (k.sy >= 0 && nz(row[k.sy])) x.syarat = nz(row[k.sy]).split(/[;\n,]+/).map(t => t.trim()).filter(Boolean);
      if (Object.keys(x).length) o.desk.set(m.id, x);
    }
  }
  const rp = cariLembar(X, wb, 'rps', (h) => h.some(c => /^pertemuan/.test(c)) && h.some(c => /^materi|^kodesub/.test(c)) && h.some(c => /^indikator/.test(c)));
  if (rp) {
    o.adaLembar.push('RPS');
    const k = { mk: kolom(rp.h, /^kodemk/, /^namamk/), m: kolom(rp.h, /^pertemuan/), sub: kolom(rp.h, /^kodesub/), mat: kolom(rp.h, /^materi/), ind: kolom(rp.h, /^indikator/), tat: kolom(rp.h, /^bentuk|^metode|^tatapmuka/), dar: kolom(rp.h, /^aktivitasdaring|^daring/), asm: kolom(rp.h, /^teknikasesmen|^asesmen/), bob: kolom(rp.h, /^bobot/) };
    for (let i = rp.mulai; i < rp.rows.length; i++) {
      const row = rp.rows[i]; if (hapusContoh(row)) continue; const no = i + 1, m = mkSah(row, k.mk, no, 'RPS'); if (!m) continue;
      const w = angka(row[k.m]); if (!Number.isInteger(w) || w < 1 || w > 16) { lewat.push(`RPS baris ${no} (${m.kode}): nomor pertemuan harus 1 sampai 16`); continue; }
      const x = { m: w };
      if (k.sub >= 0 && nz(row[k.sub])) x.sub = nz(row[k.sub]).split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
      if (k.mat >= 0 && nz(row[k.mat])) x.materi = nz(row[k.mat]);
      if (k.ind >= 0 && nz(row[k.ind])) x.indikator = pecahBaris(row[k.ind]).join('\n');
      if (k.tat >= 0 && nz(row[k.tat])) x.tatap = pecahBaris(row[k.tat]).join('\n');
      if (k.dar >= 0 && nz(row[k.dar])) x.daring = pecahBaris(row[k.dar]).join('\n');
      if (k.asm >= 0 && nz(row[k.asm])) x.asesmen = spasi(row[k.asm]);
      if (k.bob >= 0 && nz(row[k.bob])) { const b = angka(row[k.bob]); if (Number.isNaN(b) || b < 0 || b > 100) { lewat.push(`RPS baris ${no} (${m.kode}) pertemuan ${w}: bobot harus angka 0 sampai 100`); } else x.bobot = b; }
      if (Object.keys(x).length > 1) { if (!o.rps.has(m.id)) o.rps.set(m.id, new Map()); o.rps.get(m.id).set(w, x); }
    }
  }
  const sp = cariLembar(X, wb, 'sap', (h) => h.some(c => /^pertemuan/.test(c)) && h.some(c => /^kegiatan|^pendahuluan|^judul/.test(c)) && !h.some(c => /^indikator/.test(c)));
  if (sp) {
    o.adaLembar.push('SAP');
    const k = { mk: kolom(sp.h, /^kodemk/, /^namamk/), m: kolom(sp.h, /^pertemuan/), jd: kolom(sp.h, /^judul/), pen: kolom(sp.h, /^pendahuluan/), int: kolom(sp.h, /^kegiatan|^inti/), tup: kolom(sp.h, /^penutup/), med: kolom(sp.h, /^media/), soal: kolom(sp.h, /^butirsoal|^soal/) };
    for (let i = sp.mulai; i < sp.rows.length; i++) {
      const row = sp.rows[i]; if (hapusContoh(row)) continue; const no = i + 1, m = mkSah(row, k.mk, no, 'SAP'); if (!m) continue;
      const w = angka(row[k.m]); if (!Number.isInteger(w) || w < 1 || w > 16) { lewat.push(`SAP baris ${no} (${m.kode}): nomor pertemuan harus 1 sampai 16`); continue; }
      const x = { m: w }, s = {};
      if (k.jd >= 0 && nz(row[k.jd])) x.judul = spasi(row[k.jd]);
      [['pendahuluan', k.pen], ['inti', k.int], ['penutup', k.tup], ['media', k.med], ['soal', k.soal]].forEach(([f, c]) => { if (c >= 0 && nz(row[c])) s[f] = pecahBaris(row[c]).join('\n'); });
      if (Object.keys(s).length) x.sap = s;
      if (x.judul || x.sap) { if (!o.sap.has(m.id)) o.sap.set(m.id, new Map()); o.sap.get(m.id).set(w, x); }
    }
  }
  if (!o.adaLembar.length) throw new Error('Lembar DESKRIPSI, RPS, atau SAP tidak ditemukan. Gunakan templat dari tombol Templat.');
  return o;
}

/** Terapkan data mentah ke salinan RPS. Hasil: {r, ubah:[ringkas], peringatan:[]} tanpa menyimpan. */
export function terapkanDokMk(m, o) {
  const lama = rpsOf(S, m.id), r = lama ? JSON.parse(JSON.stringify(lama)) : blankRps(m), subs = S.sub.filter(s => s.mk === m.id), ubah = new Set(), peringatan = [];
  const sama = (a, b) => JSON.stringify(a == null ? '' : a) === JSON.stringify(b == null ? '' : b);
  const atur = (obj, key, val, label) => { if (!sama(obj[key], val)) { obj[key] = val; ubah.add(label); } };
  const d = o.desk.get(m.id);
  if (d) {
    if (d.deskripsi != null) atur(r, 'deskripsi', d.deskripsi, 'deskripsi');
    if (d.kataKunci) atur(r, 'kataKunci', d.kataKunci, 'kata kunci');
    if (d.pustakaU) atur(r, 'pustaka', gabungUtama(d.pustakaU), 'pustaka utama');
    if (d.pustakaP) atur(r, 'pustakaPendukung', gabungPend(d.pustakaP), 'pustaka pendukung');
    if (d.syarat) {
      const kand = S.mk.filter(x => x.id !== m.id && x.prodi === m.prodi), ids = [];
      d.syarat.forEach(t => { const x = idMk(kand, t); if (x) ids.push(x.id); else peringatan.push(`MK syarat "${t}" tidak ditemukan`); });
      if (ids.length) { atur(r, 'syaratIds', ids, 'MK syarat'); r.syarat = ids.map(id => (kand.find(x => x.id === id) || {}).nama).filter(Boolean).join('; '); }
    }
  }
  const pr = o.rps.get(m.id), ps = o.sap.get(m.id);
  (r.pertemuan || []).forEach(p => {
    const x = pr && pr.get(p.m);
    if (x) {
      ['materi', 'indikator', 'tatap', 'daring', 'asesmen'].forEach(f => { if (x[f] != null && !p.ujian) atur(p, f, x[f], 'pertemuan'); else if (x[f] != null && p.ujian && f === 'asesmen') atur(p, f, x[f], 'pertemuan'); });
      if (x.bobot != null) atur(p, 'bobot', x.bobot, 'bobot');
      if (x.sub && !p.ujian) { const ids = [], tak = []; x.sub.forEach(t => { const id = cocokSub(subs, t); if (id) { if (!ids.includes(id)) ids.push(id); } else tak.push(t); }); if (tak.length) peringatan.push(`pertemuan ${p.m}: Sub-CPMK "${tak.join(', ')}" tidak dikenali`); if (ids.length) atur(p, 'sub', ids, 'Sub-CPMK pertemuan'); }
    }
    const y = ps && ps.get(p.m);
    if (y) { if (y.judul != null) atur(p, 'judul', y.judul, 'SAP'); if (y.sap) { const sap = { ...(p.sap || {}) }; let b = false; Object.keys(y.sap).forEach(f => { if (!sama(sap[f], y.sap[f])) { sap[f] = y.sap[f]; b = true; } }); if (b) { p.sap = sap; ubah.add('SAP'); } } }
  });
  if (pr) pr.forEach((x, w) => { if (!(r.pertemuan || []).some(p => p.m === w)) peringatan.push(`pertemuan ${w} tidak ada di RPS`); });
  /* pemeriksaan isi */
  const pu = pecahPustaka(r.pustaka, r.pustakaPendukung);
  if (d) {
    if (!String(r.deskripsi || '').trim()) peringatan.push('deskripsi singkat masih kosong');
    if ((r.kataKunci || []).length < 5) peringatan.push(`kata kunci ${(r.kataKunci || []).length} dari minimal 5`);
    if (!pu.utama.filter(Boolean).length) peringatan.push('pustaka utama belum ada');
  }
  if (pr) {
    const tot = (r.pertemuan || []).reduce((a, p) => a + (+p.bobot || 0), 0);
    if (tot && Math.abs(tot - 100) > 0.5) peringatan.push(`jumlah bobot ${Math.round(tot * 10) / 10}% (seharusnya 100%)`);
    const kosong = (r.pertemuan || []).filter(p => !p.ujian && !String(p.materi || '').trim()).map(p => p.m);
    if (kosong.length) peringatan.push(`materi pertemuan ${kosong.join(', ')} masih kosong`);
  }
  if (ubah.size && r.status && r.status !== 'draf') { r.status = 'draf'; ubah.add('status kembali draf'); }
  if (ubah.size) { try { turunkanDok(r); } catch (e) { /* abaikan */ } }
  return { r, ubah: [...ubah], peringatan, baru: !lama };
}

export async function imporDokMk(file, pid) {
  const o = await bacaDokMk(file, pid), semuaMk = new Set([...o.desk.keys(), ...o.rps.keys(), ...o.sap.keys()]);
  const baru = [], ubah = [], lewat = o.lewat.slice(), catatan = [], simpan = []; let tetap = 0;
  [...semuaMk].map(id => S.mk.find(x => x.id === id)).filter(Boolean).sort((a, b) => a.smt - b.smt || urut(a, b)).forEach(m => {
    const lama = rpsOf(S, m.id);
    if (lama && lama.status === 'disahkan' && ctx.role === 'dosen') { lewat.push(`${m.kode} ${m.nama}: RPS sudah disahkan, hubungi Kaprodi untuk membukanya`); return; }
    const h = terapkanDokMk(m, o);
    h.peringatan.forEach(t => catatan.push(`${m.kode}: ${t}`));
    if (!h.ubah.length) { tetap++; return; }
    simpan.push(h.r);
    (h.baru ? baru : ubah).push(h.baru ? `${m.kode} ${potong(m.nama, 50)} (${h.ubah.join(', ')})` : { label: `${m.kode} ${potong(m.nama, 50)}`, detail: h.ubah.join(', ') });
  });
  if (!baru.length && !ubah.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : tetap ? 'Tidak ada perubahan: isi berkas sama dengan data di aplikasi.' : 'Tidak ada isian terbaca.'); return; }
  const mode = await pratinjauImpor({ jenis: `dokumen MK (${o.adaLembar.join(', ')})`, baru, ubah, tetap, lewat, catatan });
  if (!mode) return;
  await saveMany('rps', simpan, `Impor Excel dokumen MK: ${baru.length} baru, ${ubah.length} diperbarui (${pid})`);
  toast(`Dokumen MK tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${lewat.length ? `, ${lewat.length} dilewati` : ''}.${catatan.length ? ' Lihat catatan di pratinjau sebelumnya atau Pemeriksa.' : ''}`);
  rerender();
}

/** Tahap untuk halaman Impor dan ekspor: satu entri paket dokumen MK. */
export function LANGKAH_DOKMK(pid, n) {
  const mk = byProdi(S.mk, pid).filter(m => akad(m) && !mkTanpaCpl(m)), r = byProdi(S.rps || [], pid);
  const syarat = mk.length ? '' : 'Bebankan CPL pada mata kuliah lebih dulu.';
  return [
    { id: 'dokmk', no: 7, nama: 'Dokumen MK: Deskripsi, RPS, dan SAP', ket: 'Tiga lembar dalam satu berkas: deskripsi singkat, 16 pertemuan RPS, dan SAP. Dapat diisi bertahap; sel kosong tidak menghapus isian.', hitung: r.length, satuan: 'RPS', syarat, tpl: () => templatDokMk(pid, mkBolehDok(pid).map(m => m.id)), imp: (f) => imporDokMk(f, pid), buka: '#rps' }
  ];
}
