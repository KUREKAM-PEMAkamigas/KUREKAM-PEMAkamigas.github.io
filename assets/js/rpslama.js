/* KUREKAM · Pembaca RPS lama (.docx) yang tidak baku.
   Tingkat 1: format baku KUREKAM (bacaRps). Tingkat 2: pengenalan longgar, yaitu label identitas di sel atau paragraf mana pun,
   tabel rencana pembelajaran dikenali dari judul kolom (sinonim), sel gabungan, dan rentang minggu. Tingkat 3: pemetaan kolom
   dapat dikoreksi pengguna pada layar tinjau (terapkanPeta). Hasil memakai bentuk yang sama dengan bacaRps agar alur simpan sama.
   Teks yang tidak dikenali tidak dibuang: dicatat pada o.sisa. Berkas dibaca di peramban dan tidak dikirim ke server. */
import { bacaRps, bacaDokumenDocx } from './rpsimpor.js';

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const rapi = (s) => String(s == null ? '' : s).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const satu = (s) => rapi(s).replace(/\n+/g, ' ');
const angka = (s) => { const m = String(s || '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? +m[0] : 0; };

export const BIDANG = { m: 'Minggu / pertemuan', sub: 'Kemampuan akhir / Sub-CPMK', materi: 'Materi / pokok bahasan', indikator: 'Indikator', metode: 'Metode / bentuk pembelajaran', asesmen: 'Penilaian / asesmen', asesmenindikator: 'Penilaian dan indikator (satu kolom)', bobot: 'Bobot (%)', abaikan: 'Abaikan kolom ini' };

/** Judul kolom → bidang. Urutan = prioritas bila judul memuat beberapa kata. */
const SINONIM = [
  ['bobot', /bobot|persen|\(%\)|^%$/],
  ['indikator', /indikator/],
  ['materi', /materi|pokok ?bahasan|bahan ?kajian|topik|uraian|sub ?pokok|isi ?pembelajaran/],
  ['metode', /metode|bentuk|strategi|model ?pembelajaran|aktivitas|kegiatan ?pembelajaran|pengalaman ?belajar|tatap ?muka/],
  ['asesmen', /penilaian|asesmen|assessment|evaluasi|kriteria|teknik|tagihan|instrumen/],
  ['sub', /sub.?cpmk|kemampuan ?akhir|capaian|cpmk|kompetensi|learning ?outcome|tujuan/],
  ['m', /^(minggu|mg|pertemuan|pert|ke|week|sesi|no)\b|minggu ?ke|pertemuan ?ke/]
];
const bidangDari = (judul) => { const t = String(judul || '').toLowerCase().replace(/\s+/g, ' ').trim(); if (!t) return ''; if (/indikator/.test(t) && /penilaian|asesmen|kriteria|evaluasi/.test(t)) return 'asesmenindikator'; const h = SINONIM.find(([, re]) => re.test(t)); return h ? h[0] : ''; };
const RE_MINGGU = /^\s*(\d{1,2})\s*(?:[-–—,&]|s\.?d\.?|sampai)?\s*(\d{1,2})?\s*$/;
const RE_UJIAN = /\b(uts|uas|ujian tengah|ujian akhir|evaluasi tengah|evaluasi akhir|midterm|final exam)\b/i;

/** Mengubah daftar blok dokumen menjadi data RPS. blok: [{k:'p'|'tbl', t | grid}] */
function dariBlok(blok, namaBerkas) {
  const o = { file: namaBerkas, longgar: true, cpl: [], cpmk: [], sub: [], korelasi: [], minggu: [], ujian: [], peringatan: [], kepercayaan: [], sisa: [], deskripsi: '', bahan: '', pustaka: '', pengampu: '', syarat: '', prodiTeks: '' };
  const teks = []; blok.forEach(b => { if (b.k === 'p') teks.push(rapi(b.t)); else b.grid.forEach(r => r.forEach(c => { if (c) teks.push(rapi(c)); })); });
  const yakin = (bagian, ok, ket = '') => o.kepercayaan.push({ bagian, tingkat: ok === 'ragu' ? 'ragu' : ok ? 'yakin' : 'kosong', ket });

  /* --- identitas: pasangan label dan nilai (sel berurutan, atau "Label : nilai") --- */
  const pasang = [];
  blok.forEach(b => {
    if (b.k === 'p') { const m = rapi(b.t).match(/^([^:]{3,40}?)\s*[:：]\s*(.+)$/s); if (m) pasang.push([m[1], m[2]]); return; }
    b.grid.forEach(r => r.forEach((c, i) => { const t = rapi(c); const m = t.match(/^([^:\n]{3,40}?)\s*[:：]\s*(.+)$/s); if (m) pasang.push([m[1], m[2]]); else if (t && t.length < 45 && r[i + 1] && rapi(r[i + 1])) pasang.push([t, r[i + 1]]); }));
  });
  const ambil = (re) => { const p = pasang.find(([k]) => re.test(norm(k))); return p ? rapi(p[1]) : ''; };
  o.nama = satu(ambil(/^(nama)?matakuliah$|^(nama)?mk$|^coursename$|^mata ?kuliah/));
  const kd = ambil(/^kode(mk|matakuliah)?$|^coursecode$/), mKode = (kd.match(/[A-Za-z]{2,4}\s?\d{3,5}/) || [])[0];
  o.kode = (mKode || '').replace(/\s/g, '').toUpperCase();
  if (!o.kode) { const f = (namaBerkas.match(/[A-Za-z]{2,4}\s?-?\d{3,5}/) || [])[0]; if (f) o.kode = f.replace(/[\s-]/g, '').toUpperCase(); }
  if (!o.nama) { const t = teks.find(x => /^mata ?kuliah\s*[:：]?\s*\S/i.test(x)); if (t) o.nama = satu(t.replace(/^mata ?kuliah\s*[:：]?\s*/i, '')); }
  const sks = ambil(/^(bobot)?sks|^credits?|^bobotsks/); if (sks) { const t = (sks.match(/(\d+)\s*\(?\s*t\b|t\s*[=:]\s*(\d+)/i) || []), p = (sks.match(/(\d+)\s*\(?\s*p\b|p\s*[=:]\s*(\d+)/i) || []); if (t[0] || p[0]) { o.T = +(t[1] || t[2] || 0); o.P = +(p[1] || p[2] || 0); } else { const n = angka(sks); if (n) { o.T = n; o.P = 0; o.sksTunggal = true; } } }
  const sm = ambil(/^semester|^smt/); if (sm) o.smt = angka(sm) || undefined;
  o.pengampu = satu(ambil(/^dosen|^pengampu|^timpengajar|^koordinator/));
  o.syarat = satu(ambil(/^(mata ?kuliah)?syarat|^prasyarat/));
  const pr = ambil(/^programstudi|^prodi|^studyprogram/); if (pr) o.prodiTeks = 'Program Studi ' + satu(pr);
  else { const t = teks.find(x => /program studi/i.test(x)); if (t) o.prodiTeks = satu((t.match(/program studi[^\n]*/i) || [''])[0]); }
  yakin('Identitas MK', o.nama && o.kode ? true : o.nama || o.kode ? 'ragu' : false, o.nama ? '' : 'nama MK tidak ditemukan');

  /* --- deskripsi, bahan kajian, pustaka: paragraf setelah judulnya, atau sel berlabel --- */
  const bagian = (judulRe, henti) => {
    const dari = pasang.find(([k, v]) => judulRe.test(norm(k)) && rapi(v).length > 25); if (dari) return rapi(dari[1]);
    for (let i = 0; i < blok.length; i++) { const b = blok[i]; if (b.k !== 'p') continue; const t = satu(b.t); if (!judulRe.test(norm(t)) || t.length > 60) continue; const isi = []; for (let j = i + 1; j < blok.length && isi.length < 40; j++) { const c = blok[j]; if (c.k !== 'p') break; const u = satu(c.t); if (!u) continue; if (henti.test(norm(u)) && u.length < 60) break; isi.push(rapi(c.t)); } if (isi.length) return isi.join('\n'); }
    return '';
  };
  const HENTI = /^(deskripsi|capaian|cpl|cpmk|bahan ?kajian|pustaka|referensi|daftar ?pustaka|rencana|penilaian|tugas|dosen|mata ?kuliah ?syarat)/;
  const HENTI_N = /^(deskripsi|capaian|cpl|cpmk|bahankajian|pustaka|referensi|daftarpustaka|rencana|penilaian|tugas|dosen|matakuliahsyarat)/;
  o.deskripsi = bagian(/^deskripsi(singkat)?(matakuliah|mk)?$|^deskripsi/, HENTI_N);
  o.bahan = bagian(/^bahankajian|^pokokbahasan$|^materipokok/, HENTI_N);
  o.pustaka = bagian(/^pustaka|^referensi|^daftarpustaka/, /^(dosen|capaian|rencana|penilaian|mata ?kuliah ?syarat)/);
  void HENTI;
  yakin('Deskripsi', o.deskripsi.length > 30, ''); yakin('Pustaka', o.pustaka.length > 10, '');

  /* --- CPL, CPMK, Sub-CPMK dari kalimat berlabel --- */
  const kumpul = (re, tujuan, awalan) => { const lihat = new Set(); teks.forEach(t => t.split('\n').forEach(baris => { const m = baris.trim().match(re); if (!m) return; const no = String(m[1]).replace(/^0+(?=\d)/, ''), isi = satu(m[2]); if (isi.length < 20 || lihat.has(no + isi)) return; lihat.add(no + isi); tujuan.push({ kode: awalan + no, teks: isi }); })); };
  kumpul(/^cpl[\s\-_.]*([A-Za-z]*\d+(?:[.\-]\w+)?)\s*[:.)\-–]?\s+(.{20,})$/i, o.cpl, 'CPL-');
  kumpul(/^cp-?mk[\s\-_.]*(\d+)\s*[:.)\-–]?\s*(.{20,})$/i, o.cpmk, 'CPMK-');
  kumpul(/^sub[\s\-_]*cp-?mk[\s\-_.]*(\d+(?:\.\d+)?)\s*[:.)\-–]?\s*(.{20,})$/i, o.sub, 'Sub-CPMK-');
  o.cpl.forEach(c => { c.kode = c.kode.toUpperCase(); }); o.cpmk.forEach(c => { c.kode = c.kode.toUpperCase().replace('CPMK-', 'CPMK-'); });
  yakin('CPMK', o.cpmk.length > 0, o.cpmk.length ? `${o.cpmk.length} CPMK` : 'CPMK tidak ditemukan; CPMK yang sudah ada di aplikasi dipakai');

  /* --- tabel rencana pembelajaran --- */
  let terbaik = null;
  blok.filter(b => b.k === 'tbl').forEach(b => {
    const g = b.grid; let mulai = g.findIndex(r => r[0] !== undefined && RE_MINGGU.test(rapi(r[0])) && r.filter(c => rapi(c)).length >= 3); if (mulai < 0) { const ix = g.findIndex(r => r.some(c => RE_MINGGU.test(rapi(c)))); mulai = ix; }
    if (mulai < 1) return;
    const kep = []; const lebar = Math.max(...g.map(r => r.length));
    for (let c = 0; c < lebar; c++) kep.push(satu(g.slice(0, mulai).map(r => r[c] || '').filter(Boolean).join(' ')));
    const peta = {}; kep.forEach((k, c) => { const f = bidangDari(k); if (f && !Object.values(peta).includes(f)) peta[c] = f; else peta[c] = peta[c] || ''; });
    const kolMinggu = Object.keys(peta).find(c => peta[c] === 'm'); const cm = kolMinggu !== undefined ? +kolMinggu : g.slice(mulai).map(r => r.findIndex(c => RE_MINGGU.test(rapi(c)))).find(i => i >= 0);
    if (cm === undefined || cm < 0) return; peta[cm] = 'm';
    const nilai = g.slice(mulai).filter(r => RE_MINGGU.test(rapi(r[cm] || ''))).length;
    if (!terbaik || nilai > terbaik.nilai) terbaik = { grid: g, mulai, kep, peta, cm, nilai };
  });
  if (terbaik && terbaik.nilai >= 4) { o._grid = terbaik.grid; o._mulai = terbaik.mulai; o.tabel = { kepala: terbaik.kep, contoh: terbaik.grid.slice(terbaik.mulai, terbaik.mulai + 3).map(r => r.map(c => satu(c).slice(0, 80))) }; o.peta = terbaik.peta; terapkanPeta(o); }
  else { o.peringatan.push('Tabel rencana pembelajaran (minggu, materi, penilaian) tidak ditemukan. Gunakan templat Excel dokumen MK, atau pastikan tabel RPS ada dalam berkas.'); yakin('Tabel pertemuan', false); }
  o.sisa = teks.filter(t => t.length > 60 && ![o.deskripsi, o.bahan, o.pustaka].some(x => x && x.includes(t))).slice(0, 6);
  if (!o.nama) o.peringatan.push('Nama mata kuliah tidak terbaca. Pilih mata kuliahnya secara manual.');
  return o;
}

/** Membangun ulang minggu, ujian, dan Sub-CPMK dari tabel mentah dengan pemetaan kolom o.peta. */
export function terapkanPeta(o) {
  const g = o._grid, peta = o.peta, cm = +Object.keys(peta).find(c => peta[c] === 'm'), minggu = [], ujian = [], teksSub = [];
  o.kepercayaan = o.kepercayaan.filter(k => !/^Tabel pertemuan|^Pemetaan kolom/.test(k.bagian));
  const kol = (f) => Object.keys(peta).filter(c => peta[c] === f).map(Number);
  const ambil = (r, f, sep = '\n') => kol(f).concat(f === 'indikator' || f === 'asesmen' ? kol('asesmenindikator') : []).map(c => rapi(r[c] || '')).filter(Boolean).join(sep);
  let akhir = null;
  g.slice(o._mulai).forEach(r => {
    const mg = rapi(r[cm] || '').match(RE_MINGGU);
    if (!mg) { if (akhir && r.some(c => rapi(c))) Object.keys(peta).forEach(c => { if (peta[c] && peta[c] !== 'm' && peta[c] !== 'abaikan' && rapi(r[c] || '')) akhir.mentah[peta[c]] = (akhir.mentah[peta[c]] ? akhir.mentah[peta[c]] + '\n' : '') + rapi(r[c]); }); return; }
    const a = +mg[1], z = mg[2] && +mg[2] > a ? +mg[2] : a, mentah = {}; const nr = z - a + 1;
    ['sub', 'materi', 'indikator', 'metode', 'asesmen', 'bobot'].forEach(f => { const v = ambil(r, f); if (v) mentah[f] = v; });
    akhir = { a, z, mentah, nr }; minggu.push(akhir);
  });
  const rows = [];
  minggu.forEach(x => { for (let w = x.a; w <= x.z && w <= 16; w++) rows.push({ m: w, nr: x.nr, ...x.mentah }); });
  rows.forEach(x => {
    const tu = satu(x.materi || x.sub || ''), gabung = [x.materi, x.sub, x.asesmen].join(' ');
    if (tu.length < 120 && /\b(uts|uas)\b|ujian (tengah|akhir)|evaluasi (tengah|akhir)|midterm|final exam/i.test(tu)) {
      const bb = angka(x.bobot) || angka((String(x.asesmen || '').match(/(\d+(?:[.,]\d+)?)\s*%/) || [])[1]);
      ujian.push({ m: x.m, jenis: /akhir|uas|final/i.test(gabung) ? 'UAS' : 'UTS', teks: satu(x.asesmen || x.materi || 'Ujian'), bobot: bb }); return;
    }
    let sk = ''; if (x.sub) { const t = satu(x.sub); let i = teksSub.findIndex(s => norm(s) === norm(t)); if (i < 0) { teksSub.push(t); i = teksSub.length - 1; } sk = String(i + 1); }
    let bobot = angka(x.bobot); if (!bobot && x.asesmen) { const p = String(x.asesmen).match(/(\d+(?:[.,]\d+)?)\s*%/); if (p) bobot = angka(p[1]); } if (x.nr > 1) bobot = Math.round(bobot / x.nr * 100) / 100;
    x._hasil = { m: x.m, subKode: sk, capaian: x.sub ? satu(x.sub) : '', indikator: rapi(x.indikator || ''), asesmen: satu(String(x.asesmen || '').replace(/\d+(?:[.,]\d+)?\s*%/g, '')), tatap: rapi(x.metode || ''), daring: '', bentuk: '', metode: satu(x.metode || ''), materi: rapi(x.materi || ''), bobot };
  });
  o.minggu = rows.filter(x => x._hasil).map(x => x._hasil); o.ujian = ujian;
  if ((!o.sub.length || o._subAuto) && teksSub.length) { o._subAuto = true; o.sub = teksSub.map((t, i) => ({ kode: 'Sub-CPMK-' + (i + 1), teks: t.length >= 25 ? t : t + ' (rumusan singkat, mohon dilengkapi)' })); }
  const n = o.minggu.length + o.ujian.length;
  o.kepercayaan.push({ bagian: 'Tabel pertemuan', tingkat: n >= 14 ? 'yakin' : n >= 6 ? 'ragu' : 'kosong', ket: `${n} pertemuan terbaca` });
  const dipakai = Object.values(peta).filter(Boolean).flatMap(f => f === 'asesmenindikator' ? ['asesmen', 'indikator'] : [f]); const tak = ['materi', 'indikator', 'asesmen', 'bobot'].filter(f => !dipakai.includes(f));
  o.kepercayaan.push({ bagian: 'Pemetaan kolom', tingkat: tak.length ? 'ragu' : 'yakin', ket: tak.length ? 'kolom ' + tak.map(f => BIDANG[f]).join(', ') + ' belum dikenali: periksa pemetaan kolom' : 'semua kolom penting dikenali' });
  if (o.minggu.length && !o.minggu.some(w => w.bobot)) o.peringatan = o.peringatan.filter(p => !/^Bobot/.test(p)).concat('Bobot penilaian tidak terbaca pada tabel. Isi bobot di RPS setelah disimpan.');
  return o;
}

/** Titik masuk: baku dulu, lalu longgar bila hasil baku tidak lengkap. */
export async function bacaRpsLama(file) {
  if (/\.doc$/i.test(file.name)) throw new Error('Berkas .doc (format lama) belum dapat dibaca. Buka di Word lalu Simpan Sebagai .docx.');
  let baku = null;
  try { baku = await bacaRps(file); } catch (e) { if (/bukan format/i.test(e.message)) throw e; }
  if (baku && baku.nama && baku.minggu.length + baku.ujian.length >= 10) { baku.kepercayaan = [{ bagian: 'Format', tingkat: 'yakin', ket: 'format baku' }]; return baku; }
  const blok = await bacaDokumenDocx(file);
  const o = dariBlok(blok, file.name); o.formatLama = true;
  if (baku && baku.nama && !o.nama) o.nama = baku.nama;
  return o;
}
