/* KUREKAM · Formulir Satuan Acara Pembelajaran (SAP) per mata kuliah.
   Bentuk mengikuti formulir RPS (FM-BPPAK): kepala berlogo dengan nomor dokumen, tanggal terbit, revisi, jumlah halaman, warna biru RPS, dan blok otorisasi.
   Halaman pertama memuat identitas, daftar SAP, dan otorisasi; berikutnya satu lembar SAP tiap pertemuan
   (Sub-CPMK dan capaian, bahan kajian, metode, media, skenario pembelajaran bertahap dan berwaktu, penilaian, sumber belajar).
   Isi berasal dari RPS dan kurikulum; bagian yang belum disunting dosen diisi hasil susunan otomatis (dokgen.js). Tidak ada teks yang dipotong. Berkas Word potret A4. */
import { S } from './app.js';
import { buatDocx, muatBerkas } from './docxlib.js';
import { htmlBlok } from './rpsdok.js';
import { konteksMk, butirMateri, judulPertemuan, sumberBelajar, capaianPertemuan, indikatorBernomor, penilaianPertemuan, bloomDari, KOTA, tahunDari, pc, namaBerkas, cplSingkat, BIRU, ABU, BELUM, isiAtau, kepalaFormulir, statusDok } from './dokbantu.js';
import { susunSap } from './dokgen.js';

export const namaBerkasSap = (m) => namaBerkas('SAP', m);
const W = 9638, LW = 2600;
const butir = (arr, tanda = '• ') => arr.map(x => tanda + x).join('\n');
const nomori = (arr) => arr.map((x, i) => `${i + 1}.  ${x}`).join('\n');
const daftarTeks = (t) => String(t || '').split(/[\n;,]+/).map(x => x.trim()).filter(Boolean);
const judulTabel = (t, span = 2) => [{ t: `**${t}**`, span, shade: BIRU, al: 'c' }];
const lbl = (t) => ({ t: `**${t}**`, shade: ABU });
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const tglPanjang = (t) => { const x = String(t || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return x ? `${+x[3]} ${BULAN[+x[2] - 1]} ${x[1]}` : ''; };
const namaUjian = (u) => (u === 'UTS' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)');
const garis = (t) => String(t || '').split(/\n+/).map(x => x.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean);

/** Isian SAP yang dipakai dokumen: isian tersimpan bila ada, selain itu hasil susunan otomatis. */
export function sapEfektif(m, r, x) {
  const g = susunSap(m, r, x), s = x.sap || {}, pilih = (a, b) => (String(a || '').trim() ? String(a).trim() : b);
  return { pendahuluan: pilih(s.pendahuluan, g.pendahuluan), inti: pilih(s.inti, g.inti), penutup: pilih(s.penutup, g.penutup), media: pilih(s.media, g.media), soal: pilih(s.soal, g.soal), judul: pilih(x.judul, g.judul), cakup: g.cakup };
}

export function modelSap(m, r) {
  const k = konteksMk(m, r), B = [];
  const peng = namaAtau0(k.pengampu, '(dosen pengampu belum ditetapkan)');
  const tahun = tahunDari(r), tglSah = tglPanjang(r && r.sapTgl);
  const sks = `${k.T ? k.T + ' SKS Teori' : ''}${k.T && k.Pr ? ' + ' : ''}${k.Pr ? k.Pr + ' SKS Praktik' : ''}`;
  const waktuTeks = () => {
    const bag = [];
    if (k.T) bag.push(`${k.T} × ${k.P.menitTeori} Menit`);
    if (k.Pr) bag.push(`${k.Pr} × ${k.dp} Menit (Praktik)`);
    return `${bag.join(' + ')} (Tatap Muka), total ${k.menitPert} menit per pertemuan`;
  };
  const efek = k.pert.map(x => ({ x, e: sapEfektif(m, r, x) }));
  const jdl = (x, e) => (x.ujian ? namaUjian(x.ujian) : e.judul);
  const status = statusDok(r && r.sapStatus, tglSah, r && r.sapOleh);

  /* Halaman 1: identitas, daftar SAP, otorisasi */
  B.push(kepalaFormulir(k.p.nama, 'SATUAN ACARA PEMBELAJARAN (SAP)', 'sap'));
  B.push({ k: 'tbl', w: [LW, W - LW], sz: 18, rows: [
    [lbl('Mata Kuliah'), `**${m.nama}**`], [lbl('Kode Mata Kuliah'), m.kode], [lbl('Semester'), String(m.smt)], [lbl('Bobot'), sks], [lbl('Alokasi Waktu'), waktuTeks()],
    [lbl('Dosen Pengampu'), peng], [lbl('Jumlah SAP'), `${k.pert.length} SAP (pertemuan 1 sampai ${k.pert.length})`], [lbl('Tahun Penyusunan'), tahun], [lbl('Status Dokumen'), status],
  ] });
  B.push({ k: 'p', t: '**DAFTAR SAP**', sz: 20, sb: 160, sa: 60, al: 'l', keep: true });
  B.push({ k: 'tbl', w: [900, 1200, 4538, 3000], head: 1, sz: 18, rows: [
    ['SAP', 'Pertemuan', 'Topik', 'Sub-CPMK'].map(t => ({ t: `**${t}**`, shade: BIRU, al: 'c' })),
    ...efek.map(({ x, e }, i) => [{ t: String(i + 1), al: 'c' }, { t: `Ke-${x.m}`, al: 'c' }, jdl(x, e), (x.sub || []).map(id => (S.sub.find(s => s.id === id) || {}).kode).filter(Boolean).join(', ') || '-']),
  ] });
  const nm = (v) => ({ t: `\n\n\n${v}`, al: 'c', va: 'bottom' });
  B.push({ k: 'p', t: '', sz: 8, sa: 60 });
  B.push({ k: 'tbl', w: [W / 3, W / 3, W - 2 * Math.floor(W / 3)], sz: 18, rows: [
    [{ t: '**OTORISASI / PENGESAHAN**', span: 3, al: 'c', shade: BIRU }],
    [{ t: '**Dosen Pengembang SAP**', al: 'c' }, { t: '**Koordinator RMK**', al: 'c' }, { t: '**Ka Prodi**', al: 'c' }],
    [nm(peng), nm(k.koor || '(belum ditetapkan)'), nm(k.kaprodi || '(nama Ketua Program Studi belum diisi)')],
  ] });

  /* Satu lembar per pertemuan */
  efek.forEach(({ x, e }, i) => {
    const ujianP = !!x.ujian, jd = jdl(x, e);
    B.push({ k: 'br' });
    B.push(kepalaFormulir(k.p.nama, 'SATUAN ACARA PEMBELAJARAN (SAP)', 'sap', W, `Pertemuan ke-${x.m}: ${jd}`));
    B.push({ k: 'tbl', w: [LW, W - LW], sz: 18, rows: [
      [lbl('Mata Kuliah'), m.nama], [lbl('Kode Mata Kuliah'), m.kode], [lbl('Pertemuan'), `Ke-${x.m} (SAP ${i + 1} dari ${k.pert.length})`], [lbl('Waktu'), waktuTeks()], [lbl('Dosen Pengampu'), peng],
    ] });

    /* I. Sub-CPMK dan capaian */
    const subs = (x.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean).sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
    const subTeks = subs.map(s => { const b = bloomDari(s.teks, k.prak); return `**${s.kode}**${b ? ` (${b.code} — ${b.nama})` : ''}: ${s.teks}`; }).join('\n') || BELUM;
    const cpmkIds = Array.from(new Set(subs.map(s => s.cpmk))), cpmkObj = cpmkIds.map(id => S.cpmk.find(c => c.id === id)).filter(Boolean);
    const cplObj = Array.from(new Set(cpmkObj.flatMap(c => c.cpl || []))).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
    let cap;
    if (ujianP) {
      const cak = e.cakup || [];
      cap = [`Mahasiswa mampu menyelesaikan soal evaluasi yang mencakup materi pertemuan ${cak.length ? `${cak[0]} sampai ${cak[cak.length - 1]}` : BELUM}.`, ...subs.map(s => `Mahasiswa mampu mencapai ${s.kode}: ${s.teks.replace(/\.$/, '').replace(/^Mampu\s+/i, '').replace(/^./, c => c.toLowerCase())}.`)];
    } else cap = capaianPertemuan(x);
    B.push({ k: 'tbl', w: [LW, W - LW], sz: 18, rows: [
      judulTabel('I.  SUB-CPMK & CAPAIAN PEMBELAJARAN PERTEMUAN'),
      [lbl('Sub-CPMK'), subTeks],
      [lbl('CPL / CPMK'), `${cplObj.map(cplSingkat).join(', ') || BELUM} / ${cpmkObj.map(c => c.kode).join(', ') || BELUM}`],
      [lbl('Capaian Pembelajaran'), cap.length ? nomori(cap) : BELUM],
    ] });

    /* II. Bahan kajian */
    let bahan;
    if (ujianP) bahan = (e.cakup || []).map(mg => { const q = k.pert.find(y => y.m === mg); return `Pertemuan ${mg}: ${judulPertemuan(q)}`; });
    else bahan = butirMateri(x);
    B.push({ k: 'tbl', w: [700, W - 700], sz: 18, rows: [
      judulTabel('II.  BAHAN KAJIAN / MATERI PEMBELAJARAN'),
      ...(bahan.length ? bahan : [BELUM]).map((b, n) => [{ t: `**${bahan.length ? n + 1 : '-'}**`, al: 'c', shade: ABU }, b]),
    ] });

    /* III. Metode dan IV. Media */
    const metode = ujianP ? [k.prak ? 'Ujian praktik' : 'Ujian tertulis'] : daftarTeks(x.metode);
    const media = daftarTeks(e.media);
    B.push({ k: 'tbl', w: [W / 2, W / 2], sz: 18, rows: [
      [{ t: '**III.  METODE PEMBELAJARAN**', shade: BIRU, al: 'c' }, { t: '**IV.  MEDIA PEMBELAJARAN**', shade: BIRU, al: 'c' }],
      [butir(metode.length ? metode : [BELUM]), butir(media.length ? media : [BELUM])],
    ] });

    /* V. Skenario pembelajaran */
    const tot = k.menitPert, ujung = tot >= 60 ? 10 : 5, tengah = Math.max(tot - 2 * ujung, 10);
    B.push({ k: 'p', t: '**V.  SKENARIO PEMBELAJARAN**', sz: 20, sb: 120, sa: 60, al: 'l', keep: true });
    B.push({ k: 'tbl', w: [1500, 4600, 2238, 1300], head: 1, sz: 18, rows: [
      ['Tahap', 'Kegiatan Pembelajaran', 'Metode & Media', 'Waktu'].map(t => ({ t: `**${t}**`, shade: BIRU, al: 'c' })),
      [{ t: '**Pendahuluan**', shade: ABU, al: 'c', va: 'center' }, e.pendahuluan, ujianP ? 'Pengarahan' : 'Ceramah\nTanya jawab', { t: `**${ujung} menit**`, al: 'c', va: 'center' }],
      [{ t: '**Penyajian**', shade: ABU, al: 'c', va: 'center' }, e.inti, [ujianP ? metode.join('\n') : metode.join('\n'), media.slice(0, 3).join('\n')].filter(Boolean).join('\n'), { t: `**${tengah} menit**`, al: 'c', va: 'center' }],
      [{ t: '**Penutup & Tindak Lanjut**', shade: ABU, al: 'c', va: 'center' }, e.penutup, ujianP ? 'Pengumpulan jawaban' : 'Tanya jawab\nPenugasan', { t: `**${ujung} menit**`, al: 'c', va: 'center' }],
    ] });

    /* VI. Penilaian */
    const pn = penilaianPertemuan(x), ind = indikatorBernomor(x), soal = garis(e.soal);
    B.push({ k: 'tbl', w: [LW, W - LW], sz: 18, rows: [
      judulTabel('VI.  PENILAIAN'),
      [lbl('1.  Jenis Penilaian'), pn.jenis.length ? pn.jenis.join('  /  ') : (+x.bobot ? BELUM : 'Formatif (tanpa nilai angka)')],
      [lbl('2.  Bentuk Penilaian'), [pn.bentuk.length ? butir(pn.bentuk) : (pn.teks ? butir([pn.teks]) : BELUM), (+x.bobot ? `Bobot penilaian pertemuan ini: ${pc(x.bobot)} dari nilai akhir` : 'Tidak diberi bobot nilai')].join('\n')],
      ...(ind.length ? [[lbl('3.  Indikator Penilaian'), ind.join('\n')]] : []),
      [lbl(`${ind.length ? '4' : '3'}.  ${ujianP ? 'Kisi-kisi / Butir Soal' : 'Butir Soal / Non Tes'}`), soal.length ? nomori(soal) : BELUM],
    ] });
    const sb = ujianP ? '' : sumberBelajar(x, r);
    B.push({ k: 'tbl', w: [LW, W - LW], sz: 18, rows: [[lbl('Sumber Belajar'), ujianP ? 'Seluruh sumber belajar pada pertemuan yang diujikan (lihat daftar pustaka RPS).' : isiAtau(sb, 'Lihat daftar pustaka pada RPS.')]] });
  });
  void KOTA;
  return B;
}
function namaAtau0(arr, ket) { return arr && arr.length ? arr.join('; ') : ket; }

export async function berkasDocxSap(m, r) {
  const logo = await muatBerkas('assets/img/logo-rps.png');
  return buatDocx({ blocks: modelSap(m, r), logo, landscape: false, margin: 1134, footer: `SAP ${m.kode} ${m.nama} · PEM Akamigas`, judul: `SAP ${m.nama}` });
}
export const badanSap = (m, r, logo = false) => htmlBlok(modelSap(m, r), logo ? 'assets/img/logo-rps.png' : '');
