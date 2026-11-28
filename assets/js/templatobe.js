/* KUREKAM · Penyusun lembar Excel format impor Tabel Kurikulum OBE (lembar 1 sampai 18).
   Satu bentuk untuk semua prodi dan semua kurikulum; tata letaknya sama dengan yang dibaca obeimpor.js.
   Dipakai untuk templat kosong (di aplikasi) dan templat berisi contoh (berkas di assets/templat). */
import { CONTOH } from './contohobe.js';

export { CONTOH };
export const JENIS_PADANAN = ['Sama', 'Diganti nama', 'Digabung', 'Dipecah', 'Dihapus', 'Baru di 2027'];
const V = 'V', NAMA_RANAH = { S: 'Sikap', P: 'Pengetahuan', KU: 'Keterampilan Umum', KK: 'Keterampilan Khusus' };
const KOL18 = [['obs', 'Observasi (tugas dan keaktifan)'], ['part', 'Partisipasi dan praktik'], ['unjuk', 'Unjuk kerja'], ['quiz', 'Kuis (tes tulis)'], ['uts', 'Tes tulis UTS'], ['uas', 'Tes tulis UAS'], ['lisan', 'Tes lisan']];
const GRUP = [['MKU', 'MK Nasional / Wajib Umum (MKU)'], ['MBS', 'MK Basic Science (MBS)'], ['MBE', 'MK Basic Engineering (MBE)'], ['MKK', 'MK Kompetensi (MKK)']];
const IABEE = { a: '(a)', b: '(b)', c: '(c)', d: '(d)', e: '(e)', f: '(f)', g: '(g)', h: '(h)', i: '(i)', j: '(j)', k: '(k)' };

/** Mengembalikan daftar lembar {sheet, judul, kolom, baris, catatan}. D = bentuk CONTOH; D kosong menghasilkan templat kosong. */
export function lembarImpor(D = {}) {
  const pl = D.pl || [], cpl = D.cpl || [], bk = D.bk || [], mk = D.mk || [], cpmk = D.cpmk || [], sub = D.sub || [], nilai = D.nilai || [];
  const namaMk = (no) => (mk.find(m => m[0] === no) || [])[2] || '';
  const T = [];
  const add = (sheet, judul, kolom, baris, catatan = []) => T.push({ sheet, judul, kolom, baris, catatan });

  add('1. Profil Lulusan (PL)', 'Profil Lulusan (PL)', ['Kode PL', 'Profil Lulusan', 'Profesi'], pl.map(p => [p[0], p[1], p[2]]),
    ['Kode PL1, PL2, dan seterusnya. Sedikitnya 2 profil lulusan.']);
  add('2. CPL SNDIKTI', 'CPL SN Dikti dan CPL Prodi yang memuatnya', ['Ranah', 'Kode unsur SN Dikti', 'CPL Prodi', 'Rumusan CPL Prodi'],
    cpl.map(c => [NAMA_RANAH[c[1]], c[2], c[0], c[3]]), ['Satu baris per pasangan unsur SN Dikti dan CPL. Ranah: Sikap, Pengetahuan, Keterampilan Umum, Keterampilan Khusus.']);
  add('3. CPL Prodi', 'CPL Prodi', ['Kode', 'Deskripsi CPL', 'Ranah', 'Kode SN Dikti', 'Butir IABEE'],
    cpl.map(c => [c[0], c[3], NAMA_RANAH[c[1]], c[2], IABEE[c[4]] || c[4]]), ['Minimal 9 CPL: Sikap 2, Pengetahuan 2, Keterampilan Umum 2, Keterampilan Khusus 3.']);
  add('5. Pemetaan CPL & PL', 'Pemetaan CPL terhadap Profil Lulusan', ['CPL \\ PL', ...pl.map(p => p[0])], cpl.map(c => [c[0], ...pl.map(p => (c[5].includes(p[0]) ? V : ''))]), ['Tulis V pada sel yang berkaitan.']);
  add('6. Rumusan BK', 'Rumusan Bahan Kajian (BK)', ['Kode BK', 'Bahan Kajian'], bk.map(b => [b[0], b[1]]));
  add('7. Pemetaan CPL-BK', 'Pemetaan Bahan Kajian terhadap CPL', ['BK \\ CPL', ...cpl.map(c => c[0])], bk.map(b => [b[0], ...cpl.map(c => (b[2].includes(c[0]) ? V : ''))]));
  add('8. Pemetaan BK-MK', 'Pemetaan Mata Kuliah terhadap Bahan Kajian', ['Kode MK \\ BK', ...bk.map(b => b[0])], mk.map(m => [m[0], ...bk.map(b => (m[7].includes(b[0]) ? V : ''))]),
    ['Kolom pertama memakai nomor urut MK (MK01, MK02, dan seterusnya) yang sama di semua lembar.']);
  add('9. Pemetaan CPL-MK', 'Pemetaan CPL terhadap Mata Kuliah', ['MK / CPL', ...cpl.map(c => c[0])], mk.map(m => [m[0], ...cpl.map(c => (m[8].includes(c[0]) ? V : ''))]));
  add('11. Susunan Mata Kuliah', 'Susunan Mata Kuliah', ['No MK', 'Kode MK', 'Nama MK', 'SKS', 'Smt 1', 'Smt 2', 'Smt 3', 'Smt 4', 'Smt 5', 'Smt 6', 'Smt 7', 'Smt 8', 'Kelompok', 'Lokasi', 'Keterangan', 'SKS Teori', 'SKS Praktik'],
    mk.map(m => [m[0], m[1], m[2], m[4] + m[5], ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => (m[3] === s ? V : '')), m[6], m[5] > m[4] ? 'Laboratorium' : 'Kampus', '', m[4], m[5]]),
    ['SKS = SKS teori + SKS praktik. Teori dan praktik dipisah menjadi MK berbeda; nama MK praktik diawali Praktik atau Praktikum; MK praktik maksimal 3 SKS.']);
  { /* 12: organisasi MK per semester menurut kelompok */
    const kol = GRUP.map(([g]) => Math.max(1, ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => mk.filter(m => m[3] === s && m[6] === g).length)));
    const kepala = ['Smt', 'SKS', 'Jml MK']; GRUP.forEach(([g, n], i) => { kepala.push(n); for (let k = 1; k < kol[i]; k++) kepala.push(''); });
    const baris = [8, 7, 6, 5, 4, 3, 2, 1].reverse().map(s => {
      const r = [s, mk.filter(m => m[3] === s).reduce((a, m) => a + m[4] + m[5], 0), mk.filter(m => m[3] === s).length];
      GRUP.forEach(([g], i) => { const l = mk.filter(m => m[3] === s && m[6] === g).map(m => m[0]); for (let k = 0; k < kol[i]; k++) r.push(l[k] || ''); });
      return r;
    });
    add('12. Organisasi Mata Kuliah', 'Organisasi Mata Kuliah per Semester', kepala, baris, ['Tulis nomor MK (MK01, dan seterusnya) di bawah kelompoknya. Judul kelompok menentukan kelompok MK di aplikasi.']);
  }
  add('13. Pemetaan CPL-CPMK-MK', 'Pemetaan CPL, CPMK, dan Mata Kuliah', ['CPL', 'Deskripsi CPL', 'CPMK', 'Deskripsi CPMK', 'MK'],
    cpmk.flatMap(c => c[3].map(k => { const cc = cpl.find(x => x[0] === k); return [k, cc ? cc[3] : '', c[1], c[2], c[0]]; })),
    ['CPMK milik prodi dan boleh dipakai banyak MK: tulis satu baris per kombinasi CPL, CPMK, dan MK. Nomor CPMK urut per prodi (CPMK01, dan seterusnya).']);
  add('14. Pemetaan CPL-MK-CPMK', 'Pemetaan CPL, Mata Kuliah, dan CPMK', ['MK / CPL', ...cpl.map(c => c[0])],
    mk.map(m => [m[0], ...cpl.map(c => cpmk.filter(x => x[0] === m[0] && x[3].includes(c[0])).map(x => x[1]).join(', '))]), ['Sel diisi kode CPMK yang menghubungkan MK dengan CPL; beberapa CPMK dipisah koma.']);
  add('15. Pemetaan MK-CPMK-Sub-CPMK', 'Pemetaan Mata Kuliah, CPMK, dan Sub-CPMK', ['MK', 'Nama MK', 'CPMK', 'Sub-CPMK', 'Uraian Sub-CPMK'],
    sub.map(s => [s[0], namaMk(s[0]), s[1], s[2], s[3]]), ['Kode Sub-CPMK = SUB-CPMK + nomor CPMK + urutan dua digit, misalnya SUB-CPMK0501. Tiap CPMK 2 sampai 3 Sub-CPMK; tiap MK 2 sampai 4 CPMK.']);
  add('17. Tahap & Mekanisme Penilaian', 'Tahap dan Mekanisme Penilaian', ['CPL', 'MK', 'CPMK', 'Tahap Penilaian', 'Teknik Penilaian', 'Instrumen', 'Kriteria', 'Bobot'],
    nilai.map(n => { const c = cpmk.find(x => x[0] === n[0] && x[1] === n[1]); return [c ? c[3][0] : '', n[0], n[1], n[2], n[3], 'Rubrik penilaian', '', Object.values(n[4]).reduce((a, b) => a + b, 0) + '%']; }),
    ['Satu baris per CPMK pada tiap MK. Tahap ditulis Minggu N (satu baris per teknik, urutannya sama dengan kolom Teknik Penilaian).']);
  add('18. Bobot Penilaian', 'Bobot Penilaian per CPMK', ['CPL', 'MK', 'CPMK', 'MBKM', ...KOL18.map(k => k[1]), 'TOTAL'],
    nilai.map(n => { const c = cpmk.find(x => x[0] === n[0] && x[1] === n[1]); return [c ? c[3][0] : '', n[0], n[1], '', ...KOL18.map(k => n[4][k[0]] || ''), Object.values(n[4]).reduce((a, b) => a + b, 0)]; }),
    ['Jumlah bobot semua CPMK pada satu MK harus 100.']);
  return T;
}

/** Lembar pemetaan MK 2023 ke 2027 (contoh atau kosong). */
export const KOLOM_PEMETAAN = ['Kode MK 2023', 'Nama MK 2023', 'SKS 2023', 'Semester 2023', 'Kode MK 2027', 'Nama MK 2027', 'Jenis padanan', 'Catatan'];
export const CONTOH_PEMETAAN = [
  ['XX1101', 'K3 dan Praktik K3', 3, 1, 'AK1007; AK1008', 'Keselamatan dan Kesehatan Kerja (K3); Praktik K3', 'Dipecah', 'Teori dan praktik wajib dipisah menjadi MK berbeda pada 2027.'],
  ['XX1102', 'Matematika Dasar', 3, 1, 'AK2001', 'Matematika Dasar', 'Sama', 'Kode MK bersama menurut pedoman.'],
  ['XX2101', 'Dasar Proses Pengolahan Migas', 3, 2, 'XX4001', 'Dasar Proses Pengolahan Migas', 'Diganti nama', 'Kode baru menurut pola 6 karakter (prodi, kelompok, urut).'],
  ['XX2102', 'Praktikum Proses Dasar', 2, 2, 'XX4002', 'Praktikum Dasar Proses Pengolahan Migas', 'Diganti nama', ''],
  ['XX3101', 'Distilasi dan Praktik Distilasi', 5, 3, 'XX3001; XX3002', 'Operasi Unit Distilasi; Praktik Operasi Unit Distilasi', 'Dipecah', ''],
  ['XX3103', 'Seminar Teknik', 2, 3, '', '', 'Dihapus', 'Tidak ada padanan pada 2027; alasan dicatat di sini.'],
  ['', '', '', '', 'XX3003', 'Pengantar Keselamatan Proses', 'Baru di 2027', 'MK baru; kolom 2023 dikosongkan.'],
];
