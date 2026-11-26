/* KUREKAM · Laporan SKPI dalam Word (.docx): capaian pembelajaran lulusan mahasiswa dari nilai asli (skor 0-100) lintas mata kuliah.
   Memakai pemetaan CPMK ke CPL yang sama dengan rapor kompetensi. */
import { buatDocx, muatBerkas } from './docxlib.js';
import { predikat, BATAS_KUAT } from './rapor.js';
import { SKPI_DEF } from './skpilogic.js';

const W = 9638, ABU = 'E7E6E6', BIRU = 'D9E2F3';
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tgl = () => { const d = new Date(); return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`; };
const f1 = (v) => v == null ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ',');

/** d: { institusi, prodiNama, mhs:{nim,nama,angkatan}, ambang, rata, narasi, cplRows:[{kode,teks,skor,n}], mkRows:[{kode,nama,smt,rata,cpl:[{kode,skor}]}], kaprodi } */
export function modelSkpiWord(d) {
  const B = [], K = SKPI_DEF, p = (v) => predikat(v, d.ambang), ada = d.cplRows.filter(r => r.skor != null);
  B.push({ k: 'tbl', w: [1500, W - 1500], sz: 20, rows: [[{ img: { w: 80, h: 97 }, al: 'c' }, { t: `**${d.institusi || 'Politeknik Energi dan Mineral Akamigas'}**\nProgram Studi ${d.prodiNama}\n**SURAT KETERANGAN PENDAMPING IJAZAH (SKPI)**\nLaporan Capaian Pembelajaran Lulusan`, al: 'c', va: 'center' }]] });
  B.push({ k: 'p', t: '', sz: 8, sa: 60 });
  B.push({ k: 'h', lvl: 1, t: '1. Identitas Mahasiswa' });
  B.push({ k: 'tbl', w: [3000, W - 3000], sz: 20, rows: [
    [{ t: '**Nama**', shade: ABU }, d.mhs.nama || '-'], [{ t: '**Nomor Induk Mahasiswa**', shade: ABU }, d.mhs.nim], [{ t: '**Angkatan**', shade: ABU }, d.mhs.angkatan || '-'],
    [{ t: '**Program Studi**', shade: ABU }, d.prodiNama], [{ t: '**Jenjang dan Gelar**', shade: ABU }, `${K.jenjang || 'Sarjana Terapan (D4)'}${K.gelar ? ' · ' + K.gelar : ''}`], [{ t: '**Level KKNI**', shade: ABU }, String(K.kkni || 6)],
  ] });
  B.push({ k: 'h', lvl: 1, t: '2. Ringkasan Kompetensi' });
  B.push({ k: 'p', t: d.narasi, al: 'j' });
  B.push({ k: 'tbl', w: [3000, W - 3000], sz: 20, rows: [
    [{ t: '**Rata-rata skor CPL**', shade: ABU }, `${f1(d.rata)} (${p(d.rata).t})`], [{ t: '**CPL terukur**', shade: ABU }, `${ada.length} dari ${d.cplRows.length}`],
    [{ t: '**Mata kuliah yang dinilai**', shade: ABU }, String(d.mkRows.length)],
  ] });
  B.push({ k: 'h', lvl: 1, t: '3. Capaian Pembelajaran Lulusan (CPL)' });
  B.push({ k: 'tbl', w: [900, 4838, 1200, 1300, 1400], sz: 19, head: 1, rows: [['CPL', 'Rumusan', 'Skor', 'Jumlah MK', 'Predikat']].concat(d.cplRows.map(r => [{ t: `**${r.kode}**`, al: 'c' }, r.teks || '', { t: f1(r.skor), al: 'c' }, { t: r.n ? String(r.n) : '–', al: 'c' }, { t: r.skor == null ? 'Belum diukur' : p(r.skor).t, al: 'c', b: true }])) });
  B.push({ k: 'h', lvl: 1, t: '4. Rincian per Mata Kuliah' });
  B.push({ k: 'tbl', w: [1300, 3238, 1500, 1300, 2300], sz: 19, head: 1, rows: [['Kode', 'Mata Kuliah', 'Semester', 'Rata-rata', 'Skor per CPL']].concat(d.mkRows.map(r => [r.kode, r.nama, r.smt, { t: f1(r.rata), al: 'c' }, r.cpl.map(c => `${c.kode}: ${f1(c.skor)}`).join('\n')])) });
  B.push({ k: 'p', t: `Catatan metode: skor 0 sampai 100 dihitung dari nilai asli komponen penilaian yang dipetakan ke CPMK, kemudian ke CPL. Skor CPL lintas mata kuliah berbobot SKS. Sangat kompeten bila skor ≥ ${BATAS_KUAT}, kompeten bila ≥ ${d.ambang}, dan perlu penguatan bila di bawah ${d.ambang}. Hanya mata kuliah yang nilainya sudah tersimpan ikut dihitung.`, sz: 18, i: true, sb: 120, al: 'j' });
  B.push({ k: 'p', t: `Dicetak ${tgl()} dari KUREKAM.`, sz: 18, sa: 120 });
  B.push({ k: 'tbl', w: [W / 2, W / 2].map(Math.round), sz: 20, rows: [[{ t: '', }, { t: `Cepu, ${tgl()}\nKetua Program Studi\n\n\n\n**${d.kaprodi || '(nama Ketua Program Studi belum diisi)'}**`, al: 'c' }]] });
  return B;
}

export async function berkasDocxSkpiWord(d) {
  const logo = await muatBerkas('assets/img/logo-rps.png');
  return buatDocx({ blocks: modelSkpiWord(d), logo, landscape: false, margin: 1134, footer: `SKPI ${d.mhs.nim} · PEM Akamigas`, judul: `SKPI ${d.mhs.nim}` });
}
