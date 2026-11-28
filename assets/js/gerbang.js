/* KUREKAM · Gerbang tahap penyusunan kurikulum prodi (Kurikulum 2027).
   Enam tahap berurutan: 1 Landasan, 2 Bahan kajian dan mata kuliah, 3 CPMK, 4 Sub-CPMK, 5 Indikator kinerja (PI), 6 Tetapkan.
   Butir MERAH mengunci tahap berikutnya (menambah atau mengubah isi; melihat tetap boleh). Butir KUNING hanya peringatan.
   Pengecualian per butir hanya oleh Wakil Direktur I, SPM, atau admin, dengan alasan tertulis. Kurikulum 2023 tidak dikunci.
   Fungsi di sini murni: menerima S (data) dan kode prodi. */
import { DB } from './db.js';
import { param, byProdi, trace, telaahKeselarasan, kelengkapanCpl, piTrace, bloomAudit, cekStruktur, ditetapkanProdi } from './rules.js';

export const NAMA_TAHAP = {
  1: 'Landasan: visi, profil lulusan, dan CPL',
  2: 'Bahan kajian, mata kuliah, dan SKS',
  3: 'CPMK prodi',
  4: 'Sub-CPMK per mata kuliah',
  5: 'Indikator kinerja (PI)',
  6: 'Tetapkan kurikulum prodi'
};
/** Menu (id rute) milik tiap tahap; menu pada tahap N terkunci bila ada tahap sebelumnya yang masih merah. */
export const TAHAP_MENU = { visi: 1, cpl: 1, bk: 2, mk: 2, cpmkprodi: 3, cpmk: 4, pi: 5 };
/** Koleksi data milik tiap tahap, dipakai penjaga simpan. */
export const TAHAP_KOLEKSI = { pl: 1, cpl: 1, bk: 2, bok: 2, mk: 2, cpmk: 3, sub: 4, pi: 5 };
const MENU_TAHAP = { 1: '#cpl', 2: '#mk', 3: '#cpmkprodi', 4: '#cpmk', 5: '#pi' };
const BATAS_CPMK_BERSAMA = 6;

const L = (a, f) => { const d = a.slice(0, 4).map(f).join(', '); return a.length > 4 ? `${d}, dan ${a.length - 4} lainnya` : d; };
const kd = (x) => x.kode || x.id;

export const gerbangAktif = (S) => !!S && DB.kurikulum !== '2023' && param(S).gerbangTahap !== false;
const pengecualian = (S, pid) => (((S.settings || {}).gerbang || {})[pid] || {}).pengecualian || {};

let memo = null;
/** Hapus hasil periksa yang tersimpan sementara; dipanggil setiap data berubah. */
export function bersihkanGerbang() { memo = null; }
/** Daftar butir per tahap: [{ no, nama, butir: [{ key, k, teks, h, alasan? }], merah, kuning, hijau }]. Hasil disimpan sementara sampai data berubah. */
export function periksaTahap(S, pid) {
  if (memo && memo.pid === pid && memo.S === S && Date.now() - memo.t < 3000) return memo.h;
  const h = hitungTahap(S, pid); memo = { pid, S, t: Date.now(), h }; return h;
}
function hitungTahap(S, pid) {
  const P = param(S), tr = trace(S, pid), te = telaahKeselarasan(S, pid), kl = kelengkapanCpl(S, pid), pt = piTrace(S, pid), ba = bloomAudit(S, pid);
  const pr = S.prodi.find(x => x.id === pid) || {}, px = pengecualian(S, pid);
  const T = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const add = (n, key, k, teks, h) => { const ex = px[key]; T[n].push({ key, k: ex && k === 'bad' ? 'near' : k, teks: ex && k === 'bad' ? `${teks} (dikecualikan: ${ex.alasan})` : teks, h: h || MENU_TAHAP[n], dikecualikan: !!(ex && k === 'bad'), asli: k }); };
  const bila = (n, key, arr, k, teks, f = kd, h) => { if (arr.length) add(n, key, k, `${arr.length} ${teks}: ${L(arr, f)}`, h); };

  /* Tahap 1 */
  if (!String(pr.visi || '').trim()) add(1, 's1:visi', 'bad', 'Visi program studi belum diisi', '#visi');
  if (kl.total && tr.pl.length < 2) add(1, 's1:pl', 'bad', `Profil lulusan baru ${tr.pl.length}, minimal 2`, '#visi');
  if (!tr.pl.length) add(1, 's1:pl', 'bad', 'Profil lulusan belum diisi', '#visi');
  if (kl.kurang) add(1, 's1:cplTotal', 'bad', `CPL baru ${kl.total}, minimal ${kl.min}`);
  kl.ranah.filter(r => r.kurang).forEach(r => add(1, 's1:ranah:' + r.r, 'bad', `CPL ranah ${r.nama} baru ${r.n}, minimal ${r.min}`));
  bila(1, 's1:plNoCpl', tr.plNoCpl, 'bad', 'profil lulusan belum dituju CPL mana pun', kd, '#visi');
  bila(1, 's1:cplNoPl', tr.cpl.filter(c => !(c.pl || []).length), 'bad', 'CPL belum terkait profil lulusan');
  bila(1, 's1:cplNoSn', tr.cpl.filter(c => !String(c.sn || '').trim()), 'bad', 'CPL belum punya unsur SN Dikti');
  ba.issues.filter(i => i.obj === 'CPL').forEach((i, n) => add(1, `s1:bloom:${i.kode}:${i.k}`, i.k, `${i.kode}: ${i.msg}`));
  if (tr.cpl.length) bila(1, 's1:butir', kl.butirKosong, 'near', 'butir IABEE belum tercakup CPL mana pun', (b) => '(' + b.k + ')');

  /* Tahap 2 */
  bila(2, 's2:cplNoBk', tr.cplNoBk, 'bad', 'CPL belum dibentuk bahan kajian');
  bila(2, 's2:cplNoMk', tr.cplNoMk, 'bad', 'CPL belum dimuat mata kuliah mana pun');
  bila(2, 's2:mkNoCpl', tr.mkNoCpl, 'bad', 'mata kuliah belum dibebani CPL (dosen tidak dapat mengisi RPS)');
  bila(2, 's2:bkNoMk', tr.bkNoMk, 'near', 'bahan kajian belum dimuat mata kuliah');
  bila(2, 's2:mkNoBk', tr.mkNoBk, 'near', 'mata kuliah belum terkait bahan kajian');
  cekStruktur(S, pid).forEach(c => { if (c.k === 'ok') return; add(2, `s2:str:${c.grp}:${c.label}`, c.k === 'bad' ? 'bad' : 'near', `${c.label}: hasil ${c.val}, ketentuan ${c.target}`, '#mk'); });

  /* Tahap 3 */
  const cpmk = tr.cpmk;
  bila(3, 's3:cplNoCpmk', tr.cpl.filter(c => !cpmk.some(k => (k.cpl || []).includes(c.id))), 'bad', 'CPL belum punya CPMK');
  bila(3, 's3:cpmkNoCpl', cpmk.filter(c => !(c.cpl || []).length), 'bad', 'CPMK belum terkait CPL');
  bila(3, 's3:mkNoCpmk', tr.mkNoCpmk, 'bad', 'mata kuliah belum punya CPMK');
  bila(3, 's3:cpmkDiLuar', tr.cpmkLuar, 'bad', 'CPMK mendukung CPL yang tidak dibebankan pada mata kuliahnya');
  bila(3, 's3:cpmkJumlah', te.cpmkLuar, 'bad', `mata kuliah dengan jumlah CPMK di luar ${(P.cpmkPerMk || { min: 2, max: 4 }).min} sampai ${(P.cpmkPerMk || { min: 2, max: 4 }).max}`);
  ba.issues.filter(i => i.obj === 'CPMK' && !/di luar anjuran semester/.test(i.msg)).forEach(i => add(3, `s3:bloom:${i.kode}:${i.msg}`, i.k, `${i.kode}: ${i.msg}`));
  { const pakai = {}; cpmk.forEach(c => { pakai[c.kode] = (pakai[c.kode] || new Set()).add(c.mk); });
    const banyak = Object.entries(pakai).filter(([, s]) => s.size > BATAS_CPMK_BERSAMA).map(([k, s]) => ({ kode: k, n: s.size }));
    bila(3, 's3:bersama', banyak, 'near', `CPMK dipakai lebih dari ${BATAS_CPMK_BERSAMA} mata kuliah (terlalu umum)`, (x) => `${x.kode} (${x.n} MK)`); }

  /* Tahap 4 */
  const mkAkad = tr.mk.filter(m => !/magang|tugas akhir/i.test(m.kel || ''));
  bila(4, 's4:mkNoSub', mkAkad.filter(m => cpmk.some(c => c.mk === m.id) && !tr.sub.some(s => s.mk === m.id)), 'bad', 'mata kuliah belum punya Sub-CPMK');
  bila(4, 's4:cpmkNoSub', tr.cpmkNoSub, 'bad', 'CPMK belum punya Sub-CPMK', (c) => { const m = tr.mk.find(x => x.id === c.mk); return `${m ? m.kode : ''}/${c.kode}`; });
  bila(4, 's4:subJumlah', te.subLuar, 'bad', `CPMK dengan jumlah Sub-CPMK di luar ${(P.subPerCpmk || { min: 2, max: 3 }).min} sampai ${(P.subPerCpmk || { min: 2, max: 3 }).max}`);
  bila(4, 's4:acuan', te.subTanpaAcuan, 'bad', 'mata kuliah dengan Sub-CPMK tanpa indikator acuan');
  ba.issues.filter(i => i.obj === 'Sub-CPMK').forEach(i => add(4, `s4:bloom:${i.kode}:${i.msg}`, i.k, `${i.kode}: ${i.msg}`));
  ba.issues.filter(i => i.obj === 'CPMK' && /di luar anjuran semester/.test(i.msg)).forEach(i => add(4, `s4:rambu:${i.kode}:${i.msg}`, 'near', `${i.kode}: ${i.msg}`, '#cpmk'));

  /* Tahap 5 */
  bila(5, 's5:cplNoPi', pt.cplNoPi, 'bad', 'CPL belum punya indikator kinerja (PI)');
  bila(5, 's5:cplPiJumlah', pt.cplPiDiLuar, 'bad', `CPL dengan jumlah PI di luar ${P.piPerCplMin} sampai ${P.piPerCplMax}`);
  bila(5, 's5:piNoCpmk', pt.piNoCpmk, 'bad', 'PI belum terkait CPMK');
  bila(5, 's5:piNoCpl', pt.piNoCpl, 'bad', 'PI tanpa CPL');

  const hasil = [1, 2, 3, 4, 5].map(no => {
    const butir = T[no], merah = butir.filter(b => b.k === 'bad').length, kuning = butir.filter(b => b.k === 'near').length;
    return { no, nama: NAMA_TAHAP[no], butir, merah, kuning, hijau: merah === 0 };
  });
  const semua = hasil.every(t => t.hijau);
  hasil.push({ no: 6, nama: NAMA_TAHAP[6], butir: [], merah: 0, kuning: 0, hijau: semua, terbuka: semua });
  return hasil;
}

/** Tahap pertama yang masih merah (angka) atau null. */
export const tahapMerahPertama = (hasil) => { const t = hasil.slice(0, 5).find(x => !x.hijau); return t ? t.no : null; };

/** Apakah pekerjaan pada tahap ke-n terkunci? Mengembalikan null (boleh) atau { tahap, nama, merah, h, pesan }. */
export function kunciTahap(S, pid, n) {
  if (!gerbangAktif(S) || !pid || !n || n <= 1 || ditetapkanProdi(S, pid)) return null;
  const hasil = periksaTahap(S, pid), t = hasil.slice(0, n - 1).find(x => !x.hijau);
  if (!t) return null;
  return { tahap: t.no, nama: t.nama, merah: t.merah, h: (t.butir.find(b => b.k === 'bad') || {}).h || MENU_TAHAP[t.no],
    pesan: `Tahap ${t.no} (${t.nama}) masih memiliki ${t.merah} butir merah. Perbaiki dahulu sebelum melanjutkan ke tahap ${n}.` };
}
export const kunciMenu = (S, pid, menuId) => kunciTahap(S, pid, TAHAP_MENU[menuId]);

/** Penjaga simpan: dilewatkan oleh impor Excel (hasilnya tetap dinilai oleh gerbang). */
let lewatiSampai = 0;
/** Dipanggil saat pengguna memilih berkas Excel: impor boleh menulis banyak tahap sekaligus selama 5 menit; hasilnya tetap dinilai gerbang. */
export function tandaiImpor() { lewatiSampai = Date.now() + 5 * 60 * 1000; }
export const tanpaGerbang = async (fn) => { tandaiImpor(); return fn(); };
export class GerbangError extends Error { constructor(m) { super(m); this.name = 'GerbangError'; } }
export function jagaSimpan(S, col, docs) {
  if (Date.now() < lewatiSampai) return;
  const n = TAHAP_KOLEKSI[col]; if (!n || n <= 1) return;
  const d = (docs || []).find(x => x && x.prodi); if (!d) return;
  /* dokumen baru atau berubah pada tahap n, sementara tahap sebelumnya merah */
  const k = kunciTahap(S, d.prodi, n);
  if (k) throw new GerbangError(k.pesan);
}
