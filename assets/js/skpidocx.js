/* KUREKAM · SKPI dalam Word (.docx), dwibahasa, mengikuti susunan SKPI PEM: berkas Utama (1 halaman) dan Lampiran Detail.
   Nilai berasal dari transkrip (skala 4,00); CPL dari pemetaan CPMK ke CPL di KUREKAM. QR dipasang tim internal pada kotak yang disediakan. */
import { buatDocx, muatBerkas, zip } from './docxlib.js';
import { radarSvg, perluVerifikasi, namaEnMk } from './skpidoc.js';

const W = 9638, ABU = 'F2F2F2';
const n2 = (v) => v == null ? '–' : (Math.round(v * 100) / 100).toFixed(2);
const bersih = (s) => String(s || '').normalize('NFKD').replace(/[^\w\s.-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);

/** Grafik laba-laba (SVG dari skpidoc) menjadi PNG untuk Word. Hanya jalan di peramban. */
export async function radarPng(hasil, rata, K) {
  const raw = radarSvg(hasil, rata, K), i = raw.indexOf('</svg>'); if (!raw.startsWith('<svg') || i < 0) return null;
  const svg = raw.slice(0, i + 6).replace('<svg ', '<svg width="1000" height="750" ');
  try {
    const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const c = document.createElement('canvas'); c.width = 1000; c.height = 750; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 750); g.drawImage(img, 0, 0, 1000, 750);
    const b = await new Promise(r => c.toBlob(r, 'image/png')); return b ? new Uint8Array(await b.arrayBuffer()) : null;
  } catch (e) { return null; }
}

const baris = (a, b) => [{ t: a, shade: '' }, { t: ':', al: 'c' }, { t: b }];
const kop = (d) => ({ k: 'tbl', w: [1500, W - 1500], sz: 22, nb: true, rows: [[{ img: { w: 80, h: 97 }, al: 'c' }, { t: `**KEMENTERIAN ENERGI DAN SUMBER DAYA MINERAL REPUBLIK INDONESIA**\n**${d.K.institusi || 'Politeknik Energi dan Mineral Akamigas'}**`, al: 'c', va: 'center', sz: 24 }]] });
const draf = (d) => perluVerifikasi(d.h).draf ? [{ k: 'p', t: '**DRAF · terjemahan belum diverifikasi Kaprodi / DRAFT · translations not yet verified**', al: 'c', color: 'C00000', sz: 18 }] : [];
const identitas = (d) => ({ k: 'tbl', w: [3900, 300, W - 4200], sz: 20, nb: true, rows: [
  baris('Nama Lengkap / Full Name', `**${d.m.nama || '-'}**`), baris('Nomor Induk Mahasiswa / Student ID', d.m.nim || '-'),
  baris('Total SKS Diselesaikan / Total Credits', d.m.sks != null ? String(d.m.sks) : '-'), baris('Indeks Prestasi Kumulatif / GPA', `**${d.m.ipk != null ? n2(d.m.ipk) : '-'}**`)] });
const penyelenggara = (d) => ({ k: 'tbl', w: [3900, 300, W - 4200], sz: 20, nb: true, rows: [
  baris('Nama Perguruan Tinggi / Institution', d.K.institusi || 'Politeknik Energi dan Mineral Akamigas'), baris('Program Studi / Study Program', d.m.prodi || d.prodiNama),
  baris('Bahasa Pengantar / Language of Instruction', 'Indonesia (Indonesian)')] });

/** d: { K, prodiNama, m, h, rata, radar (Uint8Array|null) }. Hasil: Blob .docx Utama. */
export async function berkasSkpiUtama(d) {
  const { K, h } = d, B = [], logo = await muatBerkas('assets/img/logo-pem-akamigas.png');
  B.push(...draf(d), kop(d), { k: 'p', t: '', sz: 8 });
  B.push({ k: 'p', t: '**SURAT KETERANGAN PENDAMPING IJAZAH**', al: 'c', sz: 26, sb: 60 }, { k: 'p', t: 'Diploma Supplement', al: 'c', i: true, sz: 20, sa: 120 });
  B.push({ k: 'h', lvl: 1, t: '1. INFORMASI TENTANG IDENTITAS DIRI PEMEGANG SKPI', sz: 22 }, identitas(d));
  B.push({ k: 'h', lvl: 1, t: '2. INFORMASI TENTANG PENYELENGGARA PROGRAM', sz: 22 }, penyelenggara(d));
  B.push({ k: 'h', lvl: 1, t: '3. INFORMASI TENTANG HASIL YANG DICAPAI', sz: 22 });
  B.push({ k: 'p', t: 'Profil kompetensi lulusan berdasarkan Capaian Pembelajaran Lulusan (CPL):', al: 'l' }, { k: 'p', t: '(Graduate competency profile based on Program Learning Outcomes (PLO)):', al: 'l', i: true, sa: 80 });
  if (d.radar) B.push({ k: 'img', img: { w: 1020, h: 765, ref: 'radar' }, al: 'c', sa: 40 });
  B.push({ k: 'p', t: 'Gambar 1. Diagram Radar CPL Mahasiswa / Figure 1. Student PLO Radar Chart', al: 'c', i: true, sz: 18, sa: 120 });
  B.push({ k: 'p', t: '**Keterangan Nilai Mutu terhadap Predikat:** (Description of Grade to Predicate):', al: 'l', sa: 40 });
  B.push({ k: 'p', t: `• Nilai > ${n2(K.sangat)} = Sangat Kompeten (Highly Competent)`, al: 'l', ind: 360, sa: 20 }, { k: 'p', t: `• Nilai ${n2(K.kompeten)} - ${n2(K.sangat)} = Kompeten (Competent)`, al: 'l', ind: 360, sa: 20 }, { k: 'p', t: `• Nilai < ${n2(K.kompeten)} = Cukup Kompeten (Sufficiently Competent)`, al: 'l', ind: 360, sa: 120 });
  B.push({ k: 'tbl', w: [7338, 2300], sz: 18, nb: true, rows: [[
    { t: 'Untuk menjaga integritas dan keabsahan data, rincian detail seluruh mata kuliah yang berkontribusi dalam membentuk setiap nilai Capaian Pembelajaran Lulusan (CPL) di atas telah kami arsipkan secara digital.¶(To maintain data integrity and validity, the detailed breakdown of all courses contributing to each PLO score above has been digitally archived.)', va: 'center' },
    { t: '[QR Code]\n\nScan Rincian CPL\n(Scan PLO Details)', al: 'c', va: 'center', shade: ABU }]] });
  return buatDocx({ blocks: B, logo, images: d.radar ? { radar: d.radar } : {}, landscape: false, margin: 1134, footer: `SKPI ${d.m.nim} · PEM Akamigas`, judul: `SKPI Utama ${d.m.nim}` });
}

/** Lampiran Detail: tabel CPL dwibahasa dan tabel mata kuliah pembentuk tiap CPL. */
export async function berkasSkpiLampiran(d) {
  const { K, h } = d, B = [], logo = await muatBerkas('assets/img/logo-pem-akamigas.png');
  B.push(...draf(d), kop(d), { k: 'p', t: '', sz: 8 });
  B.push({ k: 'p', t: '**LAMPIRAN: RINCIAN MATA KULIAH PEMBENTUK KOMPETENSI**', al: 'c', sz: 24, sb: 60 }, { k: 'p', t: '(APPENDIX: DETAILS OF COMPETENCY-FORMING COURSES)', al: 'c', i: true, sa: 100 });
  B.push({ k: 'h', lvl: 1, t: 'INFORMASI TENTANG IDENTITAS DIRI PEMEGANG SKPI (INFORMATION ON THE IDENTITY OF THE SKPI HOLDER)', sz: 20 }, identitas(d));
  B.push({ k: 'h', lvl: 1, t: 'INFORMASI TENTANG PENYELENGGARA PROGRAM (INFORMATION ON THE AWARDING INSTITUTION)', sz: 20 }, penyelenggara(d));
  B.push({ k: 'p', t: '**Tabel 1. Capaian Pembelajaran Lulusan dan Predikat**', al: 'l', sb: 120, keep: true }, { k: 'p', t: '(Table 1. Program Learning Outcomes and Predicate)', al: 'l', i: true, sa: 80, keep: true });
  B.push({ k: 'tbl', w: [900, 5638, 1100, 2000], sz: 18, head: 1, rows: [['Kode\n(Code)', 'Deskripsi Capaian Pembelajaran Lulusan\n(Description of Program Learning Outcomes)', 'Nilai Mutu\n(Grade)', 'Predikat\n(Predicate)']].concat(h.hasil.map(x => [
    { t: `**${x.cpl.kode}**`, al: 'c', va: 'center' }, { t: `${x.cpl.teks || ''}\n(${x.cpl.tekEn || 'terjemahan belum tersedia / translation not yet available'})`, al: 'l' },
    { t: n2(x.skor), al: 'c', va: 'center' }, { t: x.pred ? `${x.pred[0]}\n(${x.pred[1]})` : 'Belum diukur\n(Not measured)', al: 'c', va: 'center' }])) });
  h.hasil.filter(x => x.skor != null).forEach((x, i) => {
    B.push({ k: 'p', t: `**▪ ${x.cpl.kode} - Nilai Capaian / (Achievement Score) : ${n2(x.skor)}**`, al: 'l', sb: 200, keep: true, sz: 20 });
    B.push({ k: 'p', t: x.cpl.teks || '', al: 'j', sz: 18, keep: true, sa: 20 }, { k: 'p', t: `(${x.cpl.tekEn || ''})`, al: 'j', sz: 18, i: true, sa: 80, keep: true });
    B.push({ k: 'tbl', w: [1300, 6338, 2000], sz: 18, head: 1, rows: [['Kode MK\n(Course Code)', 'Nama Mata Kuliah\n(Course Name)', 'Nilai Mutu\n(Grade)']].concat(x.rincian.map(r => [
      { t: r.t.kode, al: 'c' }, { t: `${r.mk.nama || r.t.nama}\n(${namaEnMk(r.mk, r.t) || '-'})` }, { t: n2(r.t.am), al: 'c', va: 'center' }])) });
  });
  B.push({ k: 'p', t: `Metode: skor CPL = rata-rata nilai mutu mata kuliah pembentuk CPL, dibobot SKS dan porsi CPMK mata kuliah itu terhadap CPL (${K.kurikulum}). / Method: each score is the credit- and CPMK-share-weighted average of grade points of the contributing courses.`, sz: 16, i: true, sb: 160, al: 'j' });
  return buatDocx({ blocks: B, logo, landscape: false, margin: 1134, footer: `Lampiran SKPI ${d.m.nim} · PEM Akamigas`, judul: `Lampiran SKPI ${d.m.nim}` });
}

const unduhBlob = (blob, nama) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());

/** x: { m, h }. Dua berkas per mahasiswa (Utama dan Lampiran), ZIP bila lebih dari satu mahasiswa. */
export async function unduhSkpiWord(daftar, { K, prodiNama, rata }) {
  const files = [];
  for (const x of daftar) {
    const d = { K, prodiNama, m: x.m, h: x.h, rata, radar: await radarPng(x.h.hasil, rata, K) }, id = `${x.m.nim}_${bersih(x.m.nama)}`;
    files.push({ name: `1_SKPI_Utama_${id}.docx`, data: await bytes(await berkasSkpiUtama(d)) }, { name: `2_SKPI_Lampiran_Detail_${id}.docx`, data: await bytes(await berkasSkpiLampiran(d)) });
  }
  if (files.length === 2) { for (const f of files) { unduhBlob(new Blob([f.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), f.name); await new Promise(r => setTimeout(r, 500)); } return files.length; }
  unduhBlob(zip(files), `SKPI_Word_${bersih(prodiNama)}_${daftar.length}_mahasiswa.zip`);
  return files.length;
}
