/* KUREKAM · Dokumen Satuan Acara Pembelajaran (SAP) per mata kuliah: sampul berlogo, daftar SAP, lalu satu lembar SAP tiap pertemuan
   (identitas, Sub-CPMK dan capaian, bahan kajian, metode, media, skenario pembelajaran bertahap dan berwaktu, penilaian, sumber belajar).
   Semua isi diambil dari RPS dan data kurikulum; dosen hanya melengkapi isian SAP pada tiap pertemuan. Berkas Word potret A4. */
import { S } from './app.js';
import { buatDocx, muatBerkas } from './docxlib.js';
import { htmlBlok } from './rpsdok.js';
import { konteksMk, butirMateri, judulPertemuan, sumberBelajar, capaianPertemuan, indikatorBernomor, penilaianPertemuan, bloomDari, KOTA, tahunDari, pc, namaBerkas, cplSingkat } from './dokbantu.js';

export const namaBerkasSap = (m) => namaBerkas('SAP', m);
const GEL = '1F3864', PUTIH = 'FFFFFF', ABU = 'F2F2F2';
const W = 9638;
const butir = (arr, tanda = '• ') => arr.map(x => tanda + x).join('\n');
const nomori = (arr) => arr.map((x, i) => `${i + 1}.  ${x}`).join('\n');
const daftarTeks = (t) => String(t || '').split(/[\n;,]+/).map(x => x.trim()).filter(Boolean);
const judulTabel = (t, span = 2) => [{ t: `**${t}**`, span, shade: GEL, color: PUTIH, al: 'c' }];

export function modelSap(m, r) {
  const k = konteksMk(m, r), B = [];
  const nonUjian = k.pert.filter(x => !x.ujian), ujian = k.pert.filter(x => x.ujian);
  const subKode = (id) => (S.sub.find(s => s.id === id) || {}).kode || '';
  const waktuTeks = () => {
    const bag = [];
    if (k.T) bag.push(`${k.T} × ${k.P.menitTeori} Menit`);
    if (k.Pr) bag.push(`${k.Pr} × ${k.dp} Menit (Praktik)`);
    return `${bag.join(' + ')} (Tatap Muka)`;
  };
  const peng = k.pengampu.join('; ') || '..............................';
  const tahun = tahunDari(r);

  /* Sampul */
  B.push({ k: 'img', img: { w: 300, h: 363 }, sb: 200 });
  B.push({ k: 'p', t: '**POLITEKNIK ENERGI DAN MINERAL AKAMIGAS**', al: 'c', sz: 28, sa: 20 });
  B.push({ k: 'p', t: `**PROGRAM STUDI ${String(k.p.nama).toUpperCase()}**`, al: 'c', sz: 24, sa: 20 });
  B.push({ k: 'p', t: 'Jenjang Sarjana Terapan (D-IV) | KKNI Level 6', al: 'c', sz: 20, sa: 360 });
  B.push({ k: 'p', t: '**SATUAN ACARA PEMBELAJARAN (SAP)**', al: 'c', sz: 40, sa: 200 });
  B.push({ k: 'p', t: 'Mata Kuliah', al: 'c', sz: 24, sa: 40 });
  B.push({ k: 'p', t: `**${String(m.nama).toUpperCase()}**`, al: 'c', sz: 34, sa: 40 });
  B.push({ k: 'p', t: `Kode: ${m.kode} | Semester ${m.smt} | ${k.T ? k.T + ' SKS Teori' : ''}${k.T && k.Pr ? ' + ' : ''}${k.Pr ? k.Pr + ' SKS Praktik' : ''}`, al: 'c', sz: 22, sa: 360 });
  B.push({ k: 'tbl', w: [W], sz: 22, rows: [[{ t: `**${peng}**\nDosen Pengampu`, al: 'c', shade: GEL, color: PUTIH, sz: 24 }]] });
  B.push({ k: 'p', t: '**Daftar SAP yang tercakup dalam dokumen ini:**', sb: 200, sa: 80, sz: 22, al: 'l' });
  k.pert.forEach((x, i) => B.push({ k: 'p', t: x.ujian ? `SAP ${i + 1}  :  Pertemuan ${x.m} — ${x.ujian === 'UTS' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)'}` : `SAP ${i + 1}  :  Pertemuan ${x.m} — ${judulPertemuan(x)}`, sz: 20, al: 'l', sa: 30 }));
  B.push({ k: 'p', t: `${KOTA}, ${tahun}\nProgram Studi ${k.p.nama} — PEM Akamigas`, al: 'c', sz: 20, sb: 240 });

  /* Satu lembar per pertemuan */
  k.pert.forEach((x, i) => {
    const ujianP = !!x.ujian, jdl = ujianP ? (x.ujian === 'UTS' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)') : judulPertemuan(x);
    B.push({ k: 'br' });
    B.push({ k: 'tbl', w: [2600, W - 2600], sz: 18, rows: [
      [{ t: `**SATUAN ACARA PEMBELAJARAN (SAP)**\n${jdl}`, span: 2, shade: GEL, color: PUTIH, al: 'c', sz: 22 }],
      [{ t: '**Matakuliah**', shade: ABU }, m.nama], [{ t: '**Kode Matakuliah**', shade: ABU }, m.kode],
      [{ t: '**Pertemuan**', shade: ABU }, `Ke-${x.m}`], [{ t: '**Waktu**', shade: ABU }, waktuTeks()], [{ t: '**Dosen Pengampu**', shade: ABU }, peng],
    ] });

    /* I. Sub-CPMK dan capaian */
    const subs = (x.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean);
    const subTeks = subs.map(s => { const b = bloomDari(s.teks, k.prak); return `${s.kode}${b ? ` (${b.code} — ${b.nama})` : ''}`; }).join('\n') || '-';
    const cpmkIds = Array.from(new Set(subs.map(s => s.cpmk))), cpmkObj = cpmkIds.map(id => S.cpmk.find(c => c.id === id)).filter(Boolean);
    const cplObj = Array.from(new Set(cpmkObj.flatMap(c => c.cpl || []))).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
    let cap;
    if (ujianP) {
      const cakup = k.pert.filter(q => !q.ujian && (x.ujian === 'UTS' ? q.m < x.m : q.m > 8 && q.m < x.m));
      cap = [`Mahasiswa mampu menyelesaikan soal evaluasi yang mencakup materi pertemuan ${cakup.length ? `${cakup[0].m} sampai ${cakup[cakup.length - 1].m}` : '-'}.`, ...subs.map(s => `Mahasiswa mampu mencapai ${s.kode}: ${s.teks.replace(/\.$/, '').replace(/^Mampu\s+/i, '').replace(/^./, c => c.toLowerCase())}.`)];
    } else cap = capaianPertemuan(x);
    B.push({ k: 'tbl', w: [2600, W - 2600], sz: 18, rows: [
      judulTabel('I.  SUB-CPMK & CAPAIAN PEMBELAJARAN PERTEMUAN'),
      [{ t: '**Sub-CPMK**', shade: ABU }, { t: `**${subTeks}**` }],
      [{ t: '**CPL / CPMK**', shade: ABU }, `${cplObj.map(cplSingkat).join(', ') || '-'} / ${cpmkObj.map(c => c.kode).join(', ') || '-'}`],
      [{ t: '**Capaian Pembelajaran**', shade: ABU }, cap.length ? nomori(cap) : '-'],
    ] });

    /* II. Bahan kajian */
    let bahan;
    if (ujianP) {
      const cakup = k.pert.filter(q => !q.ujian && (x.ujian === 'UTS' ? q.m < x.m : q.m > 8 && q.m < x.m));
      bahan = cakup.map(q => `Pertemuan ${q.m}: ${judulPertemuan(q)}`);
    } else bahan = butirMateri(x);
    B.push({ k: 'tbl', w: [700, W - 700], sz: 18, rows: [
      judulTabel('II.  BAHAN KAJIAN / MATERI PEMBELAJARAN'),
      ...(bahan.length ? bahan : ['']).map((b, n) => [{ t: `**${bahan.length ? n + 1 : ''}**`, al: 'c', shade: ABU }, b]),
    ] });

    /* III. Metode dan IV. Media */
    const metode = daftarTeks(x.metode).concat(ujianP ? [] : []);
    const media = daftarTeks((x.sap || {}).media);
    B.push({ k: 'tbl', w: [W / 2, W / 2], sz: 18, rows: [
      [{ t: '**III.  METODE PEMBELAJARAN**', shade: GEL, color: PUTIH, al: 'c' }, { t: '**IV.  MEDIA PEMBELAJARAN**', shade: GEL, color: PUTIH, al: 'c' }],
      [butir(metode.length ? metode : ['']), butir(media.length ? media : [''])],
    ] });

    /* V. Skenario pembelajaran */
    const tot = k.menitPert, ujung = tot >= 60 ? 10 : 5, tengah = Math.max(tot - 2 * ujung, 10), sp = x.sap || {};
    const pend = sp.pendahuluan || (ujianP ? 'Pengecekan kehadiran, pengarahan tata tertib, dan pembagian soal ujian.' : '');
    const inti = sp.inti || (ujianP ? `Mahasiswa mengerjakan soal ${x.ujian === 'UTS' ? 'tengah' : 'akhir'} semester secara mandiri sesuai tata tertib ujian; dosen dan pengawas memantau pelaksanaan.` : '');
    const tutup = sp.penutup || (ujianP ? 'Pengumpulan lembar jawaban, pengecekan kelengkapan, dan penyampaian jadwal pengumuman nilai.' : '');
    const metodeStr = metode.join('\n');
    B.push({ k: 'p', t: '**V.  SKENARIO PEMBELAJARAN**', sz: 22, sb: 120, sa: 60, al: 'l', keep: true });
    B.push({ k: 'tbl', w: [1500, 4400, 2438, 1300], sz: 18, rows: [
      ['Tahap', 'Kegiatan Pembelajaran', 'Metode & Media', 'Waktu'].map(t => ({ t: `**${t}**`, shade: GEL, color: PUTIH, al: 'c' })),
      [{ t: '**Pendahuluan**', shade: ABU, al: 'c', va: 'center' }, pend, 'Ceramah\nTanya jawab', { t: `**${ujung} menit**`, al: 'c', va: 'center' }],
      [{ t: '**Penyajian**', shade: ABU, al: 'c', va: 'center' }, inti, [ujianP ? 'Ujian tertulis' : metodeStr, media.slice(0, 3).join('\n')].filter(Boolean).join('\n'), { t: `**${tengah} menit**`, al: 'c', va: 'center' }],
      [{ t: '**Penutup & Tindak Lanjut**', shade: ABU, al: 'c', va: 'center' }, tutup, ujianP ? 'Pengumpulan jawaban' : 'Tanya jawab\nPenugasan', { t: `**${ujung} menit**`, al: 'c', va: 'center' }],
    ] });

    /* VI. Penilaian */
    const pn = penilaianPertemuan(x), ind = indikatorBernomor(x), soal = String((x.sap || {}).soal || '').split(/\n+/).map(t => t.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean);
    B.push({ k: 'tbl', w: [2600, W - 2600], sz: 18, rows: [
      judulTabel('VI.  PENILAIAN'),
      [{ t: '**1.  Jenis Penilaian**', shade: ABU }, pn.jenis.length ? pn.jenis.join('  /  ') : 'Formatif (tanpa nilai angka)'],
      [{ t: '**2.  Bentuk Penilaian**', shade: ABU }, [pn.bentuk.length ? butir(pn.bentuk) : (pn.teks ? butir([pn.teks]) : '-'), (+x.bobot ? `Bobot penilaian pertemuan ini: ${pc(x.bobot)} dari nilai akhir` : 'Tidak diberi bobot nilai')].join('\n')],
      ...(ind.length ? [[{ t: '**3.  Indikator Penilaian**', shade: ABU }, ind.join('\n')]] : []),
      [{ t: `**${ind.length ? '4' : '3'}.  Butir Soal / Non Tes**`, shade: ABU }, soal.length ? nomori(soal) : ''],
    ] });
    const sb = ujianP ? '' : sumberBelajar(x, r);
    if (sb) B.push({ k: 'p', t: `**Sumber Belajar:** ${sb}`, sz: 20, al: 'l', sb: 60, sa: 60 });
    B.push({ k: 'p', t: `${KOTA}, ${tahun}\nDosen Pengampu,\n\n\n**${k.pengampu.join('\n') || '..............................'}**`, al: 'r', sz: 20, sb: 200 });
  });
  void subKode;
  return B;
}

export async function berkasDocxSap(m, r) {
  const logo = await muatBerkas('assets/img/logo-rps.png');
  return buatDocx({ blocks: modelSap(m, r), logo, landscape: false, margin: 1134, footer: `SAP ${m.kode} ${m.nama} · PEM Akamigas`, judul: `SAP ${m.nama}` });
}
export const badanSap = (m, r, logo = false) => htmlBlok(modelSap(m, r), logo ? 'assets/img/logo-rps.png' : '');
