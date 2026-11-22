/* KUREKAM · Dokumen Analisis Capaian Pembelajaran (ACP) per mata kuliah: identitas, CPL, CPMK, Sub-CPMK dengan level Bloom, diagram hierarki,
   matriks keselarasan CPL, CPMK, Sub-CPMK, dan penilaian, distribusi bobot, target ketercapaian CPL, indikator kinerja IABEE, dan landasan.
   Seluruhnya dihitung dari data kurikulum dan RPS; tidak ada isian terpisah. Berkas Word potret A4 dengan logo. */
import { S } from './app.js';
import { buatDocx, muatBerkas } from './docxlib.js';
import { htmlBlok, CATATAN_JUDUL } from './rpsdok.js';
import { kriteriaPi, iabeeOf } from './rules.js';
import { teknikDari } from './rubrik.js';
import { APP } from './config.js';
import { konteksMk, bloomDari, bobotRingkas, bobotSubPenuh, bobotCpmk, rentang, daftarPustaka, tahunDari, pc, namaBerkas, KOTA, RANAH_NAMA, cplSingkat, pendek } from './dokbantu.js';

export const namaBerkasAcp = (m) => namaBerkas('ACP', m);
const GEL = '1F3864', PUTIH = 'FFFFFF', ABU = 'F2F2F2', W = 9638;
const WARNA = { 1: 'DCE6F1', 2: 'E2EFDA', 3: 'FFF2CC', 4: 'FCE4D6', 5: 'F8CBAD', 6: 'F4B6B6' };
const kepala = (arr) => arr.map(t => ({ t: `**${t}**`, shade: GEL, color: PUTIH, al: 'c' }));
const sebagaiMampu = (t) => String(t || '').replace(/\.$/, '').replace(/^Mampu\s+/i, '').replace(/^./, c => c.toUpperCase());

export function modelAcp(m, r) {
  const k = konteksMk(m, r), B = [], tahun = tahunDari(r);
  const subUrut = k.subs.slice().sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
  const cpmkUrut = k.cpmk.slice().sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
  const cplById = (id) => S.cpl.find(c => c.id === id);
  const cplDariCpmk = (c) => (c.cpl || []).map(cplById).filter(Boolean);
  const { sub: bSub, ujian } = bobotRingkas(k.pert);
  const bCpmk = bobotCpmk(k.pert), bPenuh = bobotSubPenuh(k.pert);
  const mgSub = (id) => k.pert.filter(x => !x.ujian && (x.sub || []).includes(id)).map(x => x.m);
  const levelSub = (s) => bloomDari(s.teks, k.prak);
  const lvl = (b) => (b ? `${b.code} — ${b.nama}` : '-');
  const bk = (m.bk || []).map(id => (S.bk.find(b => b.id === id) || {}).nama).filter(Boolean);
  const sks = `${k.T ? k.T + ' SKS Teori' : ''}${k.T && k.Pr ? ' + ' : ''}${k.Pr ? k.Pr + ' SKS Praktik' : ''}`;
  const peng = k.pengampu.join('; ') || '..............................';

  /* Sampul */
  B.push({ k: 'img', img: { w: 300, h: 363 }, sb: 200 });
  B.push({ k: 'p', t: '**POLITEKNIK ENERGI DAN MINERAL AKAMIGAS**', al: 'c', sz: 28, sa: 20 });
  B.push({ k: 'p', t: `**PROGRAM STUDI ${String(k.p.nama).toUpperCase()}**`, al: 'c', sz: 24, sa: 20 });
  B.push({ k: 'p', t: 'Jenjang Sarjana Terapan (D-IV) | KKNI Level 6', al: 'c', sz: 20, sa: 360 });
  B.push({ k: 'p', t: '**ANALISIS CAPAIAN PEMBELAJARAN (ACP)**', al: 'c', sz: 36, sa: 200 });
  B.push({ k: 'p', t: 'Mata Kuliah', al: 'c', sz: 24, sa: 40 });
  B.push({ k: 'p', t: `**${String(m.nama).toUpperCase()}**`, al: 'c', sz: 34, sa: 40 });
  B.push({ k: 'p', t: `Kode: ${m.kode} | Semester ${m.smt} | ${sks}`, al: 'c', sz: 22, sa: 360 });
  B.push({ k: 'tbl', w: [2600, W - 2600], sz: 20, rows: [
    [{ t: '**Dosen Pengembang**', shade: ABU }, peng], [{ t: '**Kurikulum**', shade: ABU }, `Kurikulum ${APP.tahunKurikulum}`],
    [{ t: '**Dasar Hukum**', shade: ABU }, 'SN Dikti (lihat Bagian 9)'], [{ t: '**Tahun Penyusunan**', shade: ABU }, tahun],
  ] });
  B.push({ k: 'p', t: `${KOTA}, ${tahun}`, al: 'c', sz: 20, sb: 240 });

  /* 1. Identitas */
  B.push({ k: 'h', lvl: 1, t: '1. Identitas Mata Kuliah dan Konteks Kurikulum', pb: true });
  B.push({ k: 'p', t: `Mata kuliah ${m.nama} merupakan bagian dari struktur kurikulum Program Studi ${k.p.nama} Politeknik Energi dan Mineral Akamigas (PEM Akamigas), dibebankan ${sks} pada semester ${m.smt}. ACP ini memetakan secara utuh hubungan capaian pembelajaran lulusan (CPL), capaian pembelajaran mata kuliah (CPMK), Sub-CPMK, penilaian, dan indikator kinerja pada mata kuliah ini, sehingga kesesuaiannya dapat diperiksa untuk keperluan penjaminan mutu dan akreditasi.` });
  B.push({ k: 'tbl', w: [3000, W - 3000], sz: 20, rows: [
    [{ t: '**IDENTITAS MATA KULIAH**', span: 2, shade: GEL, color: PUTIH, al: 'c' }],
    ['Nama Mata Kuliah', m.nama], ['Kode Mata Kuliah', m.kode], ['Program Studi', k.p.nama], ['Jenjang / Level KKNI', 'Sarjana Terapan (D-IV) / Level 6'],
    ['Institusi', 'Politeknik Energi dan Mineral Akamigas (PEM Akamigas)'], ['Semester', String(m.smt)], ['Bobot SKS', sks],
    ['CPL yang Dibebankan', k.cpl.map(c => `${cplSingkat(c)} (${RANAH_NAMA[c.ranah] || c.ranah})`).join('\n') || '-'],
    ['CPMK yang Dituju', cpmkUrut.map(c => c.kode).join(', ') || '-'], ['Bahan Kajian', bk.join('; ') || '-'],
    ['Dosen Pengembang', peng], ['Tahun Penyusunan', tahun],
  ].map((x, i) => (i === 0 ? x : [{ t: `**${x[0]}**`, shade: ABU }, x[1]])) });

  /* 2. CPL */
  B.push({ k: 'h', lvl: 1, t: '2. Capaian Pembelajaran Lulusan (CPL) yang Dibebankan' });
  B.push({ k: 'p', t: `Mata kuliah ini dibebankan ${k.cpl.length || 'belum ada'} CPL. Kode CPL ditulis bersama unsur SN Dikti secara singkat (contoh CPL02-P01), dan butir kompetensi IABEE ditulis pada kolom tersendiri.` });
  B.push({ k: 'tbl', w: [1700, 1700, 4838, 1400], sz: 20, rows: [
    kepala(['Kode CPL', 'Kategori', 'Deskripsi CPL', 'Butir IABEE']),
    ...(k.cpl.length ? k.cpl : [{ kode: '', ranah: '', teks: '' }]).map(c => [{ t: `**${cplSingkat(c)}**`, al: 'c' }, { t: RANAH_NAMA[c.ranah] || c.ranah, al: 'c' }, c.teks, { t: iabeeOf(c).map(h => `(${h})`).join(' ') || '-', al: 'c' }]),
  ] });

  /* 3. CPMK */
  B.push({ k: 'h', lvl: 1, t: '3. Capaian Pembelajaran Mata Kuliah (CPMK)' });
  B.push({ k: 'p', t: 'CPMK merupakan turunan langsung dari CPL yang dibebankan pada mata kuliah dan dirumuskan dengan kata kerja operasional Taksonomi Bloom.' });
  B.push({ k: 'tbl', w: [1500, 1800, 5000, 1338], sz: 20, rows: [
    kepala(['Kode CPMK', 'CPL Induk', 'Deskripsi CPMK', 'Level Bloom']),
    ...(cpmkUrut.length ? cpmkUrut : [{ kode: '', teks: '', cpl: [] }]).map(c => [{ t: `**${c.kode}**`, al: 'c' }, { t: cplDariCpmk(c).map(cplSingkat).join(', ') || '-', al: 'c' }, c.teks, { t: (bloomDari(c.teks, k.prak) || {}).code || '-', al: 'c' }]),
  ] });

  /* 4. Sub-CPMK */
  B.push({ k: 'h', lvl: 1, t: '4. Kemampuan Akhir Tahapan Belajar (Sub-CPMK)' });
  B.push({ k: 'p', t: 'Sub-CPMK diturunkan dari CPMK dan menjadi kemampuan akhir yang direncanakan pada tiap tahap pembelajaran. Level Bloom dibaca dari kata kerja operasional pada rumusan.' });
  B.push({ k: 'tbl', w: [1500, 1300, 1700, 4138, 1000], sz: 19, rows: [
    kepala(['Sub-CPMK', 'CPMK Induk', 'Level Bloom', 'Rumusan Sub-CPMK', 'Bobot*']),
    ...(subUrut.length ? subUrut : [{ kode: '', teks: '', cpmk: '' }]).map(s => { const b = levelSub(s), c = S.cpmk.find(x => x.id === s.cpmk) || {}; return [{ t: `**${s.kode}**`, al: 'c' }, { t: c.kode || '-', al: 'c' }, { t: lvl(b), al: 'c' }, s.teks, { t: pc(bPenuh.get(s.id) || 0), al: 'c' }]; }),
  ] });
  B.push({ k: 'p', t: '* Bobot Sub-CPMK mencakup bagiannya pada UTS dan UAS; jumlah seluruh bobot 100%.', sz: 17, i: true, al: 'l' });

  /* 5. Diagram */
  B.push({ k: 'h', lvl: 1, t: '5. Diagram Analisis Capaian Pembelajaran (ACP)' });
  B.push({ k: 'p', t: 'Diagram dibaca dari atas ke bawah: CPL sebagai puncak, CPMK sebagai turunannya, dan Sub-CPMK sebagai kemampuan tahapan yang bermuara pada CPMK. Pada setiap Sub-CPMK tercantum level Bloom, pertemuan, dan bobot penilaian.' });
  const maks = Math.max(1, ...cpmkUrut.map(c => subUrut.filter(s => s.cpmk === c.id).length));
  const wKol = Math.floor((W - 1900) / maks), wd = [1900, ...Array(maks).fill(wKol)]; wd[wd.length - 1] += W - wd.reduce((a, b) => a + b, 0);
  const rowsD = [[{ t: `**${k.cpl.map(c => `${cplSingkat(c)} (${RANAH_NAMA[c.ranah] || c.ranah})`).join('   |   ') || 'CPL'}**\n${k.cpl.map(c => pendek(c.teks, 110)).join('\n')}`, span: maks + 1, shade: GEL, color: PUTIH, al: 'c' }]];
  cpmkUrut.forEach(c => {
    const ss = subUrut.filter(s => s.cpmk === c.id);
    rowsD.push([{ t: `**${c.kode}**\n${pendek(c.teks, 90)}\nBobot ${pc(bCpmk.get(c.id) || 0)}`, shade: '2F5597', color: PUTIH, al: 'c', va: 'center', sz: 17 },
      ...Array.from({ length: maks }, (_, i) => { const s = ss[i]; if (!s) return ''; const b = levelSub(s); return { t: `**${s.kode}**\n${lvl(b)}\n${pendek(s.teks.replace(/^Mampu\s+/i, ''), 60)}\n${rentang(mgSub(s.id))} | ${pc(bPenuh.get(s.id) || 0)}`, shade: WARNA[(b && b.n) || 1] || 'FFFFFF', al: 'c', sz: 16 }; })]);
  });
  B.push({ k: 'tbl', w: wd, sz: 18, rows: rowsD });
  B.push({ k: 'p', t: 'Warna sel Sub-CPMK menunjukkan level Bloom: biru muda (C1), hijau (C2), kuning (C3), jingga muda (C4), jingga (C5), merah muda (C6).', sz: 17, i: true, al: 'l' });

  /* 6. Matriks keselarasan */
  B.push({ k: 'h', lvl: 1, t: '6. Matriks Keselarasan CPL, CPMK, Sub-CPMK, dan Penilaian' });
  B.push({ k: 'p', t: 'Setiap Sub-CPMK harus terukur oleh sedikitnya satu instrumen penilaian pada pertemuan yang jelas. Bobot dihitung dari RPS; ujian dicantumkan pada baris tersendiri.' });
  const rubrikId = (txt) => Array.from(new Set(teknikDari(txt).map(t => t.rubrik))).sort().join(', ') || '-';
  const rowsM = subUrut.map(s => {
    const c = S.cpmk.find(x => x.id === s.cpmk) || {}, wk = k.pert.filter(x => !x.ujian && (x.sub || []).includes(s.id));
    const instr = Array.from(new Set(wk.filter(x => +x.bobot > 0).map(x => String(x.asesmen || '').replace(/^Kriteria:.*?Teknik:\s*/is, '').trim()).filter(Boolean)));
    return [{ t: cplDariCpmk(c).map(cplSingkat).join('\n') || '-', al: 'c' }, { t: c.kode || '-', al: 'c' }, { t: `**${s.kode}**`, al: 'c' }, pendek(sebagaiMampu(s.teks), 110), instr.join('; ') || 'Formatif (tanpa bobot)', { t: rubrikId(instr.join(' ')), al: 'c' }, { t: rentang(wk.map(x => x.m)), al: 'c' }, { t: pc(bSub.get(s.id) || 0), al: 'c' }, { t: (levelSub(s) || {}).code || '-', al: 'c' }];
  });
  ujian.forEach(x => { const ss = (x.sub || []).map(id => (S.sub.find(q => q.id === id) || {}).kode).filter(Boolean); rowsM.push([{ t: '', al: 'c' }, '', { t: ss.length ? `${ss[0]} s.d. ${ss[ss.length - 1]}` : '-', al: 'c' }, `${x.ujian === 'UTS' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)'}, mencakup ${ss.length} Sub-CPMK`, String(x.asesmen || ''), { t: rubrikId(`${x.asesmen || ''} tes tulis`), al: 'c' }, { t: `Mg ${x.m}`, al: 'c' }, { t: pc(x.bobot), al: 'c' }, { t: '—', al: 'c' }]); });
  const totM = k.pert.reduce((a, x) => a + (+x.bobot || 0), 0);
  B.push({ k: 'tbl', w: [900, 800, 1100, 2100, 1700, 700, 900, 700, 738], sz: 16, rows: [
    kepala(['CPL', 'CPMK', 'Sub-CPMK', 'Kemampuan yang Diukur', 'Instrumen Penilaian', 'Rubrik', 'Pertemuan', 'Bobot', 'Bloom']),
    ...rowsM,
    [{ t: '**Jumlah bobot**', span: 7, al: 'r' }, { t: `**${pc(totM)}**`, al: 'c' }, ''],
  ] });
  B.push({ k: 'p', t: 'Keterangan rubrik: K1 = Ujian Tulis; K2 = Laporan; K3 = Presentasi; K4 = Unjuk Kerja dan Proyek; K5 = Tes Lisan dan Diskusi; K6 = Partisipasi dan Observasi Sikap (isi rubrik tercantum pada RPS).', sz: 17, i: true, al: 'l' });

  /* 7. Distribusi bobot */
  B.push({ k: 'h', lvl: 1, t: '7. Distribusi Bobot Penilaian' });
  B.push({ k: 'p', t: `Distribusi bobot selaras dengan RPS. Total bobot ${pc(totM)}${Math.abs(totM - 100) < 0.05 ? ' (memenuhi 100%)' : ', seharusnya 100%'}.` });
  const rowsB = k.pert.filter(x => +x.bobot > 0).map(x => [x.ujian ? (x.ujian === 'UTS' ? 'Ujian Tengah Semester (UTS)' : 'Ujian Akhir Semester (UAS)') : `${pendek(String(x.asesmen || '').replace(/^Kriteria:.*?Teknik:\s*/is, ''), 70)} (Pertemuan ${x.m})`, { t: pc(x.bobot), al: 'c' }, (x.sub || []).map(id => (S.sub.find(q => q.id === id) || {}).kode).filter(Boolean).join(', ') || '-']);
  B.push({ k: 'tbl', w: [4400, 1200, W - 5600], sz: 19, rows: [kepala(['Komponen Penilaian', 'Bobot (%)', 'Cakupan Sub-CPMK']), ...rowsB, [{ t: '**TOTAL BOBOT PENILAIAN**' }, { t: `**${pc(totM)}**`, al: 'c' }, '']] });

  /* 8. Target ketercapaian CPL dan PI */
  B.push({ k: 'h', lvl: 1, t: '8. Target Ketercapaian CPL dan Indikator Kinerja (IABEE)' });
  B.push({ k: 'p', t: `Ketercapaian CPL pada mata kuliah ini dihitung dari nilai CPMK yang membentuknya: jumlah (bobot × nilai) pada CPMK dibagi bobot CPMK. CPL dinyatakan tercapai bila memenuhi kriteria program studi (usulan awal: sedikitnya ${k.P.piMinPersen}% mahasiswa memperoleh nilai minimal ${k.P.piMinNilai}; dapat diubah pada Data Induk bagian Parameter). Skor maksimum mata kuliah adalah 100 poin yang terbagi ke CPMK menurut bobot berikut.` });
  const rowsC = [];
  cpmkUrut.forEach(c => cplDariCpmk(c).forEach(l => rowsC.push([{ t: cplSingkat(l), al: 'c' }, { t: c.kode, al: 'c' }, { t: pc(bCpmk.get(c.id) || 0), al: 'c' }, { t: `${String(Math.round((bCpmk.get(c.id) || 0) * 100) / 100).replace('.', ',')} poin`, al: 'c' }])));
  B.push({ k: 'tbl', w: [2200, 2200, 2600, W - 7000], sz: 19, rows: [kepala(['CPL', 'CPMK', 'Bobot CPMK pada MK', 'Skor maksimum']), ...(rowsC.length ? rowsC : [['', '', '', '']])] });
  const idCpl = new Set(k.cpl.map(c => c.id)), idCpmk = new Set(cpmkUrut.map(c => c.id));
  const piMk = (S.pi || []).filter(q => idCpl.has(q.cpl) && (!(q.cpmk || []).length || (q.cpmk || []).some(id => idCpmk.has(id)))).sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
  B.push({ k: 'p', t: '**Indikator kinerja (PI) yang diukur pada mata kuliah ini**', sb: 120, al: 'l', keep: true });
  if (piMk.length) {
    B.push({ k: 'tbl', w: [1000, 1300, 3700, 900, 1100, 1638], sz: 18, rows: [
      kepala(['Kode PI', 'CPL', 'Rumusan PI', 'Butir IABEE', 'CPMK pengukur', 'Kriteria']),
      ...piMk.map(q => { const c = cplById(q.cpl) || {}, kr = kriteriaPi(q, k.P); return [{ t: q.kode, al: 'c' }, { t: cplSingkat(c), al: 'c' }, q.teks || '', { t: iabeeOf(c).map(h => `(${h})`).join(' ') || '-', al: 'c' }, { t: (q.cpmk || []).map(id => (S.cpmk.find(x => x.id === id) || {}).kode).filter(Boolean).join(', ') || '-', al: 'c' }, `≥ ${kr.nilai} pada ${kr.persen}% mahasiswa`]; }),
    ] });
  } else B.push({ k: 'p', t: 'Belum ada indikator kinerja (PI) yang dihubungkan ke CPMK mata kuliah ini. Hubungkan pada menu Indikator Kinerja.', i: true, al: 'l', sz: 19 });

  /* 9. Landasan dan referensi */
  B.push({ k: 'h', lvl: 1, t: '9. Landasan dan Referensi' });
  B.push({ k: 'p', t: '**9.1 Landasan hukum**', al: 'l', sa: 40 });
  [CATATAN_JUDUL.replace(/^Catatan sesuai dengan /, '').replace(/:$/, ''), 'Kerangka Kualifikasi Nasional Indonesia (KKNI) Level 6, Peraturan Presiden Nomor 8 Tahun 2012', `Dokumen Kurikulum Program Studi ${k.p.nama} PEM Akamigas ${APP.tahunKurikulum}`].forEach(x => B.push({ k: 'p', t: `–  ${x}`, ind: 360, hang: 300, al: 'l', sa: 20 }));
  const pus = daftarPustaka(r), nomor = Object.keys(pus).map(Number).sort((a, b) => a - b);
  B.push({ k: 'p', t: '**9.2 Referensi keilmuan**', al: 'l', sb: 100, sa: 40 });
  if (nomor.length) nomor.forEach(n => B.push({ k: 'p', t: `${n}.  ${pus[n]}`, ind: 0, hang: 360, al: 'l', sa: 20 })); else B.push({ k: 'p', t: String((r && r.pustaka) || '..........'), al: 'l' });
  B.push({ k: 'tbl', w: [W / 2, W / 2], sz: 20, rows: [[{ t: `Mengetahui,\nKetua Program Studi\n\n\n\n**${k.kaprodi || '..............................'}**`, al: 'c' }, { t: `${KOTA}, ${tahun}\nDosen Pengembang\n\n\n\n**${k.pengampu.join('\n') || '..............................'}**`, al: 'c' }]] });
  return B;
}

export async function berkasDocxAcp(m, r) {
  const logo = await muatBerkas('assets/img/logo-rps.png');
  return buatDocx({ blocks: modelAcp(m, r), logo, landscape: false, margin: 1134, footer: `ACP ${m.kode} ${m.nama} · PEM Akamigas`, judul: `ACP ${m.nama}` });
}
export const badanAcp = (m, r, logo = false) => htmlBlok(modelAcp(m, r), logo ? 'assets/img/logo-rps.png' : '');
