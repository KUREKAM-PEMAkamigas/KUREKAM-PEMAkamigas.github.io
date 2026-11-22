/* KUREKAM · Fungsi bantu bersama untuk SAP dan ACP: membaca isian pertemuan RPS menjadi bagian dokumen.
   Semua fungsi murni (menerima data, mengembalikan nilai) sehingga SAP, ACP, dan RPS memakai satu sumber isian. */
import { S } from './app.js';
import { param, durasi, cplSingkat } from './rules.js';
import { teknikDari } from './rubrik.js';
import { detect } from './bloom.js';

export const KOTA = 'Cepu';
export const RANAH_NAMA = { S: 'Sikap', P: 'Pengetahuan', KU: 'Keterampilan umum', KK: 'Keterampilan khusus' };
export const pc = (v) => `${String(Math.round((+v || 0) * 100) / 100).replace('.', ',')}%`;
export const pendek = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
export const tahunDari = (r) => (String((r && r.tgl) || '').match(/^(\d{4})/) || [])[1] || String(new Date().getFullYear());
export const namaBerkas = (awal, m) => `${awal}_${m.kode}_${String(m.nama).replace(/[^A-Za-z0-9]+/g, '_')}.docx`;

/** Data dasar satu mata kuliah. */
export function konteksMk(m, r) {
  const P = param(S), p = S.prodi.find(x => x.id === m.prodi) || { nama: m.prodi };
  const cpl = (m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
  const cpmk = S.cpmk.filter(c => c.mk === m.id), subs = S.sub.filter(s => s.mk === m.id);
  const tugas = S.tugas.filter(t => t.mk === m.id);
  const nama = (id) => (S.dosen.find(d => d.id === id) || {}).nama;
  const pengampu = tugas.map(t => nama(t.dosen)).filter(Boolean);
  const koor = tugas.filter(t => t.koordinator).map(t => nama(t.dosen)).filter(Boolean)[0] || (r && r.koordinator) || '';
  const prak = (+m.P || 0) > (+m.T || 0);
  const T = +m.T || 0, Pr = +m.P || 0, dp = durasi(m, P);
  const pert = ((r && r.pertemuan) || []).slice().sort((a, b) => a.m - b.m);
  return { P, p, cpl, cpmk, subs, pengampu, koor, kaprodi: (r && r.kaprodi) || p.kaprodi || '', prak, T, Pr, dp, menitPert: T * P.menitTeori + Pr * dp, pert };
}

/** Level Bloom sebuah rumusan, misalnya { code: 'C4', nama: 'Menganalisis' }. */
export const bloomDari = (teks, prak) => { const b = detect(teks, prak ? 'P' : 'C'); return b ? { code: b.code, nama: b.nama } : null; };

/** Bahan kajian satu pertemuan sebagai daftar butir: poin bertanda •, ditambah baris Konteks. */
export function butirMateri(p) {
  const t = String(p.materi || '').replace(/\*\*/g, '');
  const baris = t.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const out = [];
  baris.forEach(b => {
    if (/^materi inti\s*:?$/i.test(b)) return;
    if (/^pustaka\s*:/i.test(b)) return;
    if (/^[•\-–*]\s+/.test(b)) out.push(b.replace(/^[•\-–*]\s+/, ''));
    else if (/^materi inti\s*:/i.test(b)) out.push(b.replace(/^materi inti\s*:\s*/i, ''));
    else out.push(b);
  });
  if (out.length === 1 && out[0].includes(';')) return out[0].split(/;\s*/).filter(Boolean);
  return out;
}

/** Judul SAP: isian judul, atau poin pertama materi (selalu utuh, tanpa pemotongan). */
export const judulPertemuan = (p) => String(p.judul || '').trim() || String(butirMateri(p).find(b => !/^konteks\s*:/i.test(b)) || '').replace(/\s+/g, ' ').trim() || `Pertemuan ${p.m}`;

/* ---------- Kepala formulir (mengikuti kepala RPS FM-BPPAK, warna biru RPS) ---------- */
export const BIRU = 'D9E2F3', ABU = 'E7E6E6';
export const BELUM = '(belum diisi)';
export const isiAtau = (v, ket = BELUM) => { const t = String(v == null ? '' : v).trim(); return t || ket; };
export const namaAtau = (arr, ket) => (arr && arr.length ? arr.join('\n') : ket);
/** Kepala formulir: logo, identitas lembaga, nomor dokumen, tanggal terbit, revisi, jumlah halaman, lalu judul dokumen. jenis = 'sap' atau 'acp'. lebar = lebar tabel (dxa). */
export function kepalaFormulir(prodiNama, judul, jenis, lebar = 9638, subjudul = '') {
  const d = param(S).dok[jenis], w = [1400, lebar - 1400 - 1500 - 2300, 1500, 2300];
  const rows = [[{ img: { w: 128, h: 155 }, shade: BIRU, va: 'center' },
    { t: `**KEMENTERIAN ENERGI DAN SUMBER DAYA MINERAL**\n**BADAN PENGEMBANGAN SUMBER DAYA MANUSIA ENERGI DAN SUMBER DAYA MINERAL**\n**POLITEKNIK ENERGI DAN MINERAL AKAMIGAS**\n**PROGRAM STUDI ${String(prodiNama).toUpperCase()}**`, al: 'c', va: 'center', shade: BIRU, sz: 17 },
    { t: 'No Dokumen\nTanggal Terbit\nRevisi\nJumlah Halaman', shade: BIRU, va: 'center', sz: 16 },
    { t: `: ${d.no}\n: ${d.terbit}\n: ${d.rev}\n: {{HAL}}`, shade: BIRU, va: 'center', sz: 16 }],
  [{ t: `**${judul}**${subjudul ? '\n' + subjudul : ''}`, span: 4, al: 'c', sz: 22, shade: BIRU }]];
  return { k: 'tbl', w, sz: 18, rows };
}
/** Teks status dokumen untuk baris identitas. */
export const statusDok = (st, tgl, oleh) => (st === 'disahkan' ? `Disahkan${tgl ? ' pada ' + tgl : ''}${oleh ? ' oleh ' + oleh : ''}` : st === 'diajukan' ? 'Diajukan ke Ketua Program Studi, menunggu pengesahan' : 'Draf, belum disahkan');

/** Daftar pustaka bernomor dari RPS: { 1: 'teks', ... }. */
export function daftarPustaka(r) {
  const peta = {};
  `${(r && r.pustaka) || ''}\n${(r && r.pustakaPendukung) || ''}`.split(/\n+/).forEach(b => { const x = b.trim().match(/^(\d+)[.)]\s*(.+)$/); if (x) peta[+x[1]] = x[2]; });
  return peta;
}
const kutipanSingkat = (t) => { const x = String(t).match(/^(.*?\((?:19|20)\d{2}\))/); return x ? x[1] : String(t).replace(/\s+/g, ' ').trim(); };
/** Sumber belajar satu pertemuan, dari baris Pustaka pada materi, dalam bentuk kutipan singkat. */
export function sumberBelajar(p, r) {
  const m = String(p.materi || '').replace(/\*\*/g, '').match(/pustaka\s*:\s*([^\n]+)/i);
  if (!m) return '';
  const peta = daftarPustaka(r), nomor = Array.from(m[1].matchAll(/\((\d+)\)|\b(\d+)\b/g)).map(x => +(x[1] || x[2]));
  const isi = nomor.filter(n => peta[n]).map(n => kutipanSingkat(peta[n]));
  return isi.length ? isi.map(x => x.replace(/[.\s]+$/, '')).join('; ') : m[1].trim();
}

/** Capaian pembelajaran pertemuan: indikator diubah menjadi kalimat kemampuan mahasiswa. */
export function capaianPertemuan(p) {
  return String(p.indikator || '').split(/\n+/).map(t => t.trim().replace(/^\d+(\.\d+)*[.)]?\s+/, '')).filter(Boolean).map(t => {
    const x = t.match(/^(?:Ketepatan|Kemampuan|Kelengkapan|Kejelasan|Kesesuaian)(?:\s+dalam)?\s+(\S.*)$/i);
    if (x && /^(me|ber|di)\w+/i.test(x[1])) return `Mahasiswa mampu ${x[1].replace(/^./, c => c.toLowerCase())}`;
    return `Mahasiswa memenuhi indikator: ${t.replace(/^./, c => c.toLowerCase())}`;
  });
}

/** Indikator bernomor pertemuan.urut. */
export const indikatorBernomor = (p) => String(p.indikator || '').split(/\n+/).map(t => t.trim().replace(/^\d+(\.\d+)*[.)]?\s+/, '')).filter(Boolean).map((t, i) => `${p.m}.${i + 1} ${t}`);

/** Jenis penilaian (Tertulis, Lisan, Kinerja) dan bentuk penilaian dengan rubrik. */
export function penilaianPertemuan(p) {
  const tk = teknikDari(`${p.asesmen || ''} ${p.ujian ? 'tes tulis' : ''}`);
  const jenis = [];
  if (tk.some(k => k.id === 'tulis')) jenis.push('Tertulis');
  if (tk.some(k => k.id === 'lisan')) jenis.push('Lisan');
  if (tk.some(k => ['laporan', 'presentasi', 'unjuk', 'partisipasi'].includes(k.id))) jenis.push('Kinerja');
  const bentuk = tk.length ? tk.map(k => `${k.id === 'tulis' ? 'Ujian tulis' : k.nama} — Rubrik ${k.rubrik}`) : [];
  return { jenis, bentuk, teks: String(p.asesmen || '').replace(/^Kriteria:.*?Teknik:\s*/is, '').trim() };
}

/** Bobot tiap Sub-CPMK dari bobot penilaian pertemuan (pertemuan biasa dibagi rata per Sub-CPMK; ujian dihitung terpisah). */
export function bobotRingkas(pert) {
  const sub = new Map(), ujian = [];
  pert.forEach(x => {
    const b = +x.bobot || 0; if (!b) return;
    if (x.ujian) { ujian.push(x); return; }
    const ss = x.sub || []; if (!ss.length) return;
    ss.forEach(id => sub.set(id, (sub.get(id) || 0) + b / ss.length));
  });
  return { sub, ujian };
}

/** Bobot tiap Sub-CPMK termasuk bagian ujian: bobot setiap pertemuan (juga UTS dan UAS) dibagi rata ke Sub-CPMK pada pertemuan itu. Jumlah semuanya sama dengan jumlah bobot RPS. */
export function bobotSubPenuh(pert) {
  const m = new Map();
  pert.forEach(x => { const b = +x.bobot || 0, ss = x.sub || []; if (!b || !ss.length) return; ss.forEach(id => m.set(id, (m.get(id) || 0) + b / ss.length)); });
  return m;
}

/** Bobot setiap CPMK (jumlah bobot pertemuan biasa dan ujian, dibagi rata per Sub-CPMK pada tiap pertemuan). */
export function bobotCpmk(pert) {
  const m = new Map();
  pert.forEach(x => {
    const b = +x.bobot || 0, ss = (x.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean);
    if (!b || !ss.length) return;
    ss.forEach(s => m.set(s.cpmk, (m.get(s.cpmk) || 0) + b / ss.length));
  });
  return m;
}

/** Ringkas daftar pertemuan menjadi rentang, misalnya [6,7,9] menjadi "Mg 6–7, 9". */
export function rentang(arr) {
  const a = Array.from(new Set(arr)).sort((x, y) => x - y), out = []; let i = 0;
  while (i < a.length) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(j > i ? `${a[i]}–${a[j]}` : `${a[i]}`); i = j + 1; }
  return out.length ? `Mg ${out.join(', ')}` : '-';
}

export { cplSingkat };
