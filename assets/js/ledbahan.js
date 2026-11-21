/* KUREKAM · Bahan Tabel Suplemen LED IABEE (templat SER 2023): A1, A2, B1, B2, C1, C2, lalu B3 sampai B5.
   Semua tabel disusun dari data kurikulum yang sudah ada, jadi tidak diketik ulang. Hanya data agregat. */
import { BUTIR_IABEE, KAT_IABEE } from './config.js';
import { byProdi, iabeeOf, piOfCpl, kriteriaPi, param, sksOf, lulusanRekap } from './rules.js';

const urut = (a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true });
const X = 'X';
/** Satu pemeriksaan: [teks, lolos 'ok' | 'near' | 'bad']. Persen = proporsi pemeriksaan yang lolos penuh, 'near' dihitung setengah. */
const nilaiCek = (cek) => cek.length ? Math.round(cek.reduce((a, c) => a + (c[1] === 'ok' ? 1 : c[1] === 'near' ? 0.5 : 0), 0) / cek.length * 100) : 0;
const st = (cek, kosong) => kosong ? 'na' : cek.every(c => c[1] === 'ok') ? 'ok' : cek.some(c => c[1] !== 'bad') ? 'near' : 'bad';

function tabelA1(S, pid) {
  const pl = byProdi(S.pl, pid).sort(urut), cpl = byProdi(S.cpl, pid).sort(urut);
  const kolom = ['Profil Profesional Mandiri \\ CPL', ...cpl.map(c => c.kode)];
  const baris = pl.map(p => [`${p.kode} ${p.nama}`, ...cpl.map(c => (c.pl || []).includes(p.id) ? X : '')]);
  const cek = [
    ['Profil profesional mandiri sudah ditetapkan', pl.length ? 'ok' : 'bad'],
    ['CPL sudah ditetapkan', cpl.length ? 'ok' : 'bad'],
    [`Setiap profil didukung minimal satu CPL${pl.filter(p => !cpl.some(c => (c.pl || []).includes(p.id))).length ? ' (belum: ' + pl.filter(p => !cpl.some(c => (c.pl || []).includes(p.id))).map(p => p.kode).join(', ') + ')' : ''}`, pl.length && pl.every(p => cpl.some(c => (c.pl || []).includes(p.id))) ? 'ok' : 'bad'],
    [`Setiap CPL menopang minimal satu profil${cpl.filter(c => !(c.pl || []).length).length ? ' (belum: ' + cpl.filter(c => !(c.pl || []).length).map(c => c.kode).join(', ') + ')' : ''}`, cpl.length && cpl.every(c => (c.pl || []).length) ? 'ok' : 'near']
  ];
  return { kode: 'A1', judul: 'Peta Hubungan Profil Profesional Mandiri dan Capaian Pembelajaran Program', kolom, baris, cek, catatan: ['Tuliskan pernyataan Profil Profesional Mandiri dan CPL di bawah tabel pada LED.', ...pl.map(p => `${p.kode}: ${p.nama}`), ...cpl.map(c => `${c.kode}: ${c.teks}`)], kosong: !pl.length || !cpl.length };
}

function tabelA2(S, pid) {
  const cpl = byProdi(S.cpl, pid).sort(urut), huruf = BUTIR_IABEE.map(b => b.k);
  const kolom = ['CPL \\ Butir kriteria IABEE', ...huruf.map(h => `(${h})`)];
  const baris = cpl.map(c => [c.kode, ...huruf.map(h => iabeeOf(c).includes(h) ? X : '')]);
  const kosongB = huruf.filter(h => !cpl.some(c => iabeeOf(c).includes(h)));
  const tanpa = cpl.filter(c => !iabeeOf(c).length);
  const cek = [
    ['CPL sudah ditetapkan', cpl.length ? 'ok' : 'bad'],
    [`Seluruh butir (a) sampai (k) tercakup${kosongB.length ? ' (belum: ' + kosongB.join(', ') + ')' : ''}`, cpl.length && !kosongB.length ? 'ok' : 'bad'],
    [`Setiap CPL dipetakan ke minimal satu butir${tanpa.length ? ' (belum: ' + tanpa.map(c => c.kode).join(', ') + ')' : ''}`, cpl.length && !tanpa.length ? 'ok' : 'near']
  ];
  return { kode: 'A2', judul: 'Peta Keterkaitan CPL dengan Butir Kriteria Capaian Pembelajaran IABEE (a) sampai (k)', kolom, baris, cek, catatan: ['Engineering Technology memakai butir (a) sampai (k).', 'Butir (k) adalah kemampuan belajar sepanjang hayat.'], kosong: !cpl.length };
}

function tabelB1(S, pid) {
  const mk = byProdi(S.mk, pid).slice().sort((a, b) => (a.smt - b.smt) || urut(a, b));
  const kolom = ['No', 'Kode dan nama mata kuliah', 'Sifat (W/P)', 'Penyelenggara (S/LP)', 'Matematika & IPA (SKS)', 'Muatan spesifik sub-disiplin (SKS)', 'TI & komunikasi (SKS)', 'Pendidikan umum (SKS)', 'Semester'];
  const kol = { 'Matematika dan ilmu alam': 4, 'Muatan spesifik': 5, 'Teknologi informasi': 6, 'Pendidikan umum': 7 };
  const tot = [0, 0, 0, 0];
  const baris = mk.map((m, i) => { const r = [i + 1, `${m.kode} ${m.nama}`, m.pilihan ? 'P' : 'W', m.luarProdi ? 'LP' : 'S', '', '', '', '', m.smt]; const k = kol[m.kat]; if (k) { r[k] = sksOf(m); tot[k - 4] += sksOf(m); } return r; });
  const total = tot.reduce((a, b) => a + b, 0);
  baris.push(['', 'Jumlah SKS', '', '', ...tot, '']);
  if (total) baris.push(['', 'Persentase', '', '', ...tot.map(t => Math.round(t / total * 1000) / 10 + '%'), '']);
  const tanpaKat = mk.filter(m => !KAT_IABEE.includes(m.kat));
  const cek = [
    ['Daftar mata kuliah sudah ada', mk.length ? 'ok' : 'bad'],
    [`Setiap mata kuliah punya kategori bidang kajian${tanpaKat.length ? ` (belum: ${tanpaKat.length} MK)` : ''}`, mk.length && !tanpaKat.length ? 'ok' : mk.length ? 'near' : 'bad'],
    [`Total ${total} SKS ${total >= 144 ? 'memenuhi' : 'belum mencapai'} 144 SKS`, total >= 144 ? 'ok' : total ? 'near' : 'bad']
  ];
  return { kode: 'B1', judul: 'Komposisi Mata Kuliah menurut Bidang Kajian (Engineering Technology)', kolom, baris, cek, catatan: ['Seluruh mata kuliah diasumsikan wajib (W) dan diselenggarakan prodi sendiri (S). Ubah jika ada mata kuliah pilihan atau dari luar prodi.'], kosong: !mk.length };
}

/** CPL yang dibentuk tiap mata kuliah: dari bidang cpl pada MK dan dari CPMK. */
const cplMk = (S, pid) => { const m = new Map(); byProdi(S.mk, pid).forEach(k => { const s = new Set(k.cpl || []); byProdi(S.cpmk, pid).filter(c => c.mk === k.id && c.cpl).forEach(c => (Array.isArray(c.cpl) ? c.cpl : [c.cpl]).forEach(x => s.add(x))); m.set(k.id, s); }); return m; };

function tabelB2(S, pid) {
  const cpl = byProdi(S.cpl, pid).sort(urut), mk = byProdi(S.mk, pid), peta = cplMk(S, pid);
  const kolom = ['CPL', ...[1, 2, 3, 4].flatMap(t => [`Tahun ${t} · Sem ${t * 2 - 1}`, `Tahun ${t} · Sem ${t * 2}`])];
  const baris = cpl.map(c => [c.kode, ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => mk.filter(m => m.smt === s && peta.get(m.id).has(c.id)).map(m => m.kode).join(', '))]);
  const tanpa = cpl.filter(c => !mk.some(m => peta.get(m.id).has(c.id)));
  const satu = cpl.filter(c => { const n = new Set(mk.filter(m => peta.get(m.id).has(c.id)).map(m => m.smt)).size; return n === 1; });
  const cek = [
    ['CPL dan mata kuliah sudah ada', cpl.length && mk.length ? 'ok' : 'bad'],
    [`Setiap CPL dibentuk oleh minimal satu mata kuliah${tanpa.length ? ' (belum: ' + tanpa.map(c => c.kode).join(', ') + ')' : ''}`, cpl.length && !tanpa.length ? 'ok' : 'bad'],
    [`Setiap CPL dibangun bertahap, tidak hanya di satu semester${satu.length ? ' (satu semester: ' + satu.map(c => c.kode).join(', ') + ')' : ''}`, cpl.length && !tanpa.length && !satu.length ? 'ok' : 'near']
  ];
  return { kode: 'B2', judul: 'Peta Jalan Pembentukan CPL melalui Mata Kuliah sepanjang Kurikulum', kolom, baris, cek, catatan: ['Kode mata kuliah pada tiap semester. Sumber: pemetaan CPL pada mata kuliah dan CPMK.'], kosong: !cpl.length };
}

function tabelC1(S, pid) {
  const P = param(S), cpl = byProdi(S.cpl, pid).sort(urut), cpmk = byProdi(S.cpmk, pid), mk = byProdi(S.mk, pid);
  const kolom = ['CPL', 'Indikator kinerja (PI)', 'Metode pengukuran', 'Kriteria pemenuhan'];
  const baris = [];
  cpl.forEach(c => {
    const pis = piOfCpl(S, c.id);
    if (!pis.length) { baris.push([c.kode, '(belum ada PI)', '', '']); return; }
    pis.forEach((p, i) => { const k = kriteriaPi(p, P), cs = cpmk.filter(x => (p.cpmk || []).includes(x.id)).map(x => { const m = mk.find(y => y.id === x.mk); return `${m ? m.kode : x.mk}/${x.kode}`; });
      baris.push([i ? '' : `${c.kode} ${c.teks}`, `${p.kode} ${p.teks}`, cs.length ? `Rata-rata nilai CPMK ${cs.join(', ')}` : '(belum dikaitkan ke CPMK)', `${k.persen}% mahasiswa dengan nilai minimal ${k.nilai}`]); });
  });
  const tanpa = cpl.filter(c => !piOfCpl(S, c.id).length), luar = cpl.filter(c => { const n = piOfCpl(S, c.id).length; return n && (n < P.piPerCplMin || n > P.piPerCplMax); });
  const piTanpa = byProdi(S.pi || [], pid).filter(p => !(p.cpmk || []).length);
  const cek = [
    ['CPL sudah ditetapkan', cpl.length ? 'ok' : 'bad'],
    [`Setiap CPL punya indikator kinerja${tanpa.length ? ' (belum: ' + tanpa.map(c => c.kode).join(', ') + ')' : ''}`, cpl.length && !tanpa.length ? 'ok' : cpl.length && tanpa.length < cpl.length ? 'near' : 'bad'],
    [`Jumlah PI per CPL ${P.piPerCplMin} sampai ${P.piPerCplMax}${luar.length ? ' (di luar rentang: ' + luar.map(c => c.kode).join(', ') + ')' : ''}`, cpl.length && !tanpa.length && !luar.length ? 'ok' : 'near'],
    [`Setiap PI dikaitkan ke CPMK untuk pengukuran${piTanpa.length ? ` (belum: ${piTanpa.length} PI)` : ''}`, byProdi(S.pi || [], pid).length && !piTanpa.length ? 'ok' : byProdi(S.pi || [], pid).length ? 'near' : 'bad']
  ];
  return { kode: 'C1', judul: 'Indikator Kinerja, Metode Pengukuran, dan Kriteria Pemenuhan CPL', kolom, baris, cek, catatan: ['Lampirkan rubrik indikator kinerja bila sudah disusun.'], kosong: !cpl.length };
}

function tabelC2(S, pid) {
  const cpl = byProdi(S.cpl, pid).sort(urut), cpmk = byProdi(S.cpmk, pid), mk = byProdi(S.mk, pid);
  const kolom = ['CPL', 'Indikator kinerja (PI)', ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => `Semester ${s}`)];
  const baris = []; let adaPi = 0, terjadwal = 0;
  cpl.forEach(c => piOfCpl(S, c.id).forEach((p, i) => {
    adaPi++;
    const m = (p.cpmk || []).map(id => cpmk.find(x => x.id === id)).filter(Boolean).map(x => mk.find(y => y.id === x.mk)).filter(Boolean);
    if (m.length) terjadwal++;
    baris.push([i ? '' : c.kode, `${p.kode} ${p.teks}`, ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => m.filter(x => x.smt === s).map(x => x.kode).join(', '))]);
  }));
  const cek = [
    ['Indikator kinerja sudah ada', adaPi ? 'ok' : 'bad'],
    [`Setiap PI punya jadwal asesmen pada mata kuliah tertentu${adaPi - terjadwal ? ` (belum: ${adaPi - terjadwal} PI)` : ''}`, adaPi && terjadwal === adaPi ? 'ok' : terjadwal ? 'near' : 'bad']
  ];
  return { kode: 'C2', judul: 'Jadwal Asesmen Capaian Pembelajaran Program', kolom, baris, cek, catatan: ['Jadwal mengikuti mata kuliah tempat CPMK terkait dinilai.'], kosong: !adaPi };
}

/* B3 sampai B5 hanya sebagian ada di KUREKAM: nama, jabatan, bidang, dan penugasan mengajar. Sisanya dari kepegawaian atau LKPS. */
function tabelB3(S, pid) {
  const ds = S.dosen.filter(d => d.homebase === pid).sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
  const kolom = ['Nama', 'Jabatan akademik', 'Bidang keahlian', 'Pendidikan terakhir', 'Sertifikasi profesi', 'Pengalaman industri (th)', 'Pengalaman mengajar (th)', 'Kegiatan profesi (R/S/T)'];
  const baris = ds.map(d => [d.nama, d.jabatan || '', d.bidang || '', '', '', '', '', '']);
  const cek = [['Daftar dosen homebase tersedia', ds.length ? 'ok' : 'bad'], ['Pendidikan, sertifikasi, dan pengalaman belum ada di KUREKAM; lengkapi dari kepegawaian atau LKPS', 'near']];
  return { kode: 'B3', judul: 'Daftar Dosen yang Terlibat dalam Pembelajaran', kolom, baris, cek, catatan: ['Kolom kosong diisi dari data kepegawaian.'], kosong: !ds.length, manual: true };
}
function tabelB4(S, pid) {
  const ds = S.dosen.filter(d => d.homebase === pid), mk = byProdi(S.mk, pid), tg = byProdi(S.tugas, pid);
  const kolom = ['Nama dosen', 'Mata kuliah diampu', 'Pembelajaran (SKS)', 'Penelitian dan PkM (SKS)', 'Pengelolaan institusi (SKS)', 'Di luar prodi (SKS)', 'Total SKS di prodi', '% waktu untuk prodi'];
  const baris = ds.map(d => { const ms = tg.filter(t => t.dosen === d.id).map(t => mk.find(m => m.id === t.mk)).filter(Boolean); const sks = ms.reduce((a, m) => a + sksOf(m), 0); return [d.nama, ms.map(m => m.kode).join(', '), sks || '', '', '', '', '', '']; });
  const cek = [['Penugasan mengajar tersedia', tg.length ? 'ok' : 'bad'], ['Penelitian, pengelolaan, dan beban di luar prodi diisi manual', 'near']];
  return { kode: 'B4', judul: 'Daftar Kegiatan Dosen dalam Pembelajaran (satu tahun akademik terakhir)', kolom, baris, cek, catatan: ['SKS pembelajaran dihitung dari penugasan mata kuliah di KUREKAM.'], kosong: !tg.length, manual: true };
}
function tabelB5() {
  return { kode: 'B5', judul: 'CV Singkat Dosen', kolom: ['Keterangan'], baris: [['CV singkat disusun per dosen dari data kepegawaian (pendidikan, jabatan, sertifikasi, publikasi, pengabdian). KUREKAM belum menyimpan data ini.']], cek: [['Disusun manual dari kepegawaian', 'bad']], catatan: [], kosong: true, manual: true };
}

export const URUTAN_TABEL = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'B3', 'B4', 'B5'];
export function ledBahan(S, pid) {
  const T = [tabelA1(S, pid), tabelA2(S, pid), tabelB1(S, pid), tabelB2(S, pid), tabelC1(S, pid), tabelC2(S, pid), tabelB3(S, pid), tabelB4(S, pid), tabelB5()];
  T.forEach(t => { t.pct = nilaiCek(t.cek); t.k = st(t.cek, t.kosong); });
  return T;
}
/** Ringkasan kecil untuk umpan ke SIMANTAP: status dan persen per tabel, tanpa isi tabel. */
export function ledRingkas(S, pid) {
  const T = ledBahan(S, pid), o = {};
  T.forEach(t => { o[t.kode] = { k: t.k, pct: t.pct }; });
  o.siap = T.slice(0, 6).filter(t => t.k === 'ok').length;
  return o;
}
export function obeProdi(S, pid) {
  const p = S.prodi.find(x => x.id === pid) || {}, o = p.obe || {}, ll = lulusanRekap(S, pid);
  return { angkatan: o.angkatan || '', wisuda: o.wisuda || '', catatan: o.catatan || '', lulusan: ll.obe || 0 };
}
