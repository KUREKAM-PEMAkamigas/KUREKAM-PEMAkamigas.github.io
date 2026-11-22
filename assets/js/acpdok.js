/* KUREKAM · Dokumen Analisis Capaian Pembelajaran (ACP) per mata kuliah: identitas, CPL, CPMK, Sub-CPMK dengan level Bloom, diagram hierarki,
   matriks keselarasan CPL, CPMK, Sub-CPMK, dan penilaian, distribusi bobot, target ketercapaian CPL, indikator kinerja IABEE, dan landasan.
   Seluruhnya dihitung dari data kurikulum dan RPS; tidak ada isian terpisah. Berkas Word potret A4 dengan logo. */
import { S } from './app.js';
import { buatDocx, muatBerkas } from './docxlib.js';
import { htmlBlok, CATATAN_JUDUL } from './rpsdok.js';
import { kriteriaPi, iabeeOf } from './rules.js';
import { teknikDari } from './rubrik.js';
import { APP } from './config.js';
import { konteksMk, bloomDari, bobotRingkas, bobotSubPenuh, bobotCpmk, rentang, daftarPustaka, tahunDari, pc, namaBerkas, RANAH_NAMA, cplSingkat, BIRU, ABU, BELUM, isiAtau, kepalaFormulir, statusDok } from './dokbantu.js';
import { acpEfektif } from './dokgen.js';
import { tglPanjang } from './sapdok.js';

export const namaBerkasAcp = (m) => namaBerkas('ACP', m);
const W = 9638;
const WARNA = { 1: 'DCE6F1', 2: 'E2EFDA', 3: 'FFF2CC', 4: 'FCE4D6', 5: 'F8CBAD', 6: 'F4B6B6' };
const kepala = (arr) => arr.map(t => ({ t: `**${t}**`, shade: BIRU, al: 'c' }));
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
  const peng = k.pengampu.join('; ') || '(dosen pengampu belum ditetapkan)';
  const ef = acpEfektif(m, r), status = statusDok(r && r.acpStatus, tglPanjang(r && r.acpTgl), r && r.acpOleh);
  const nm = (v) => ({ t: `\n\n\n${v}`, al: 'c', va: 'bottom' });

  /* Kepala formulir dan otorisasi (bentuk mengikuti RPS FM-BPPAK) */
  B.push(kepalaFormulir(k.p.nama, 'ANALISIS CAPAIAN PEMBELAJARAN (ACP)', 'acp'));
  B.push({ k: 'tbl', w: [3000, W - 3000], sz: 20, rows: [
    [{ t: '**Mata Kuliah**', shade: ABU }, `**${m.nama}**  (${m.kode})`], [{ t: '**Kurikulum**', shade: ABU }, `Kurikulum ${APP.tahunKurikulum}`], [{ t: '**Tahun Penyusunan**', shade: ABU }, tahun], [{ t: '**Status Dokumen**', shade: ABU }, status],
  ] });
  B.push({ k: 'p', t: '', sz: 8, sa: 60 });
  B.push({ k: 'tbl', w: [3212, 3213, 3213], sz: 20, rows: [
    [{ t: '**OTORISASI / PENGESAHAN**', span: 3, al: 'c', shade: BIRU }],
    [{ t: '**Dosen Pengembang ACP**', al: 'c' }, { t: '**Koordinator RMK**', al: 'c' }, { t: '**Ka Prodi**', al: 'c' }],
    [nm(k.pengampu.join('\n') || '(dosen pengampu belum ditetapkan)'), nm(k.koor || '(belum ditetapkan)'), nm(k.kaprodi || '(nama Ketua Program Studi belum diisi)')],
  ] });

  /* 1. Identitas */
  B.push({ k: 'h', lvl: 1, t: '1. Identitas Mata Kuliah dan Konteks Kurikulum' });
  B.push({ k: 'p', t: ef.pengantar });
  B.push({ k: 'tbl', w: [3000, W - 3000], sz: 20, rows: [
    [{ t: '**IDENTITAS MATA KULIAH**', span: 2, shade: BIRU, al: 'c' }],
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
  const rowsD = [[{ t: `**${k.cpl.map(c => `${cplSingkat(c)} (${RANAH_NAMA[c.ranah] || c.ranah})`).join('   |   ') || 'CPL'}**\n${k.cpl.map(c => c.teks).join('\n')}`, span: maks + 1, shade: BIRU, al: 'c' }]];
  cpmkUrut.forEach(c => {
    const ss = subUrut.filter(s => s.cpmk === c.id);
    rowsD.push([{ t: `**${c.kode}**\n${c.teks}\n**Bobot ${pc(bCpmk.get(c.id) || 0)}**`, shade: ABU, al: 'c', va: 'center', sz: 17 },
      ...Array.from({ length: maks }, (_, i) => { const s = ss[i]; if (!s) return ''; const b = levelSub(s); return { t: `**${s.kode}**\n${lvl(b)}\n${s.teks.replace(/^Mampu\s+/i, '')}\n**${rentang(mgSub(s.id))} | ${pc(bPenuh.get(s.id) || 0)}**`, shade: WARNA[(b && b.n) || 1] || 'FFFFFF', al: 'c', sz: 16 }; })]);
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
    return [{ t: cplDariCpmk(c).map(cplSingkat).join('\n') || '-', al: 'c' }, { t: c.kode || '-', al: 'c' }, { t: `**${s.kode}**`, al: 'c' }, sebagaiMampu(s.teks), instr.join('; ') || 'Formatif (tanpa bobot)', { t: rubrikId(instr.join(' ')), al: 'c' }, { t: rentang(wk.map(x => x.m)), al: 'c' }, { t: pc(bSub.get(s.id) || 0), al: 'c' }, { t: (levelSub(s) || {}).code || '-', al: 'c' }];
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
  const rowsB = k.pert.filter(x => +x.bobot > 0).map(x => [x.ujian ? (x.ujian === 'UTS' ? 'Ujian Tengah Semester (UTS)' : 'Ujian Akhir Semester (UAS)') : `${String(x.asesmen || '').replace(/^Kriteria:.*?Teknik:\s*/is, '').trim() || BELUM} (Pertemuan ${x.m})`, { t: pc(x.bobot), al: 'c' }, (x.sub || []).map(id => (S.sub.find(q => q.id === id) || {}).kode).filter(Boolean).join(', ') || '-']);
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

  /* 9. Analisis kesesuaian dan tindak lanjut (dihitung dari RPS dan kurikulum; dapat disunting dosen sebelum disahkan) */
  B.push({ k: 'h', lvl: 1, t: '9. Analisis Kesesuaian dan Tindak Lanjut' });
  B.push({ k: 'p', t: '**9.1 Temuan analisis**', al: 'l', sa: 40 });
  ef.analisis.split(/\n+/).filter(Boolean).forEach(t => B.push({ k: 'p', t, ind: 360, hang: 360, al: 'l', sa: 30 }));
  B.push({ k: 'p', t: '**9.2 Rekomendasi tindak lanjut**', al: 'l', sb: 100, sa: 40 });
  ef.rekomendasi.split(/\n+/).filter(Boolean).forEach(t => B.push({ k: 'p', t, ind: 360, hang: 360, al: 'l', sa: 30 }));

  /* 10. Landasan dan referensi */
  B.push({ k: 'h', lvl: 1, t: '10. Landasan dan Referensi' });
  B.push({ k: 'p', t: '**10.1 Landasan hukum**', al: 'l', sa: 40 });
  [CATATAN_JUDUL.replace(/^Catatan sesuai dengan /, '').replace(/:$/, ''), 'Kerangka Kualifikasi Nasional Indonesia (KKNI) Level 6, Peraturan Presiden Nomor 8 Tahun 2012', `Dokumen Kurikulum Program Studi ${k.p.nama} PEM Akamigas ${APP.tahunKurikulum}`].forEach(x => B.push({ k: 'p', t: `–  ${x}`, ind: 360, hang: 300, al: 'l', sa: 20 }));
  const pus = daftarPustaka(r), nomor = Object.keys(pus).map(Number).sort((a, b) => a - b);
  B.push({ k: 'p', t: '**10.2 Referensi keilmuan**', al: 'l', sb: 100, sa: 40 });
  if (nomor.length) nomor.forEach(n => B.push({ k: 'p', t: `${n}.  ${pus[n]}`, ind: 0, hang: 360, al: 'l', sa: 20 })); else B.push({ k: 'p', t: isiAtau((r && r.pustaka) || '', 'Daftar pustaka belum diisi pada RPS.'), al: 'l' });
  return B;
}

export async function berkasDocxAcp(m, r) {
  const logo = await muatBerkas('assets/img/logo-rps.png');
  return buatDocx({ blocks: modelAcp(m, r), logo, landscape: false, margin: 1134, footer: `ACP ${m.kode} ${m.nama} · PEM Akamigas`, judul: `ACP ${m.nama}` });
}
export const badanAcp = (m, r, logo = false) => htmlBlok(modelAcp(m, r), logo ? 'assets/img/logo-rps.png' : '');
