/* KUREKAM · Hitung capaian CPL dari nilai (logika murni, tanpa layar).
   Pengukuran dari CPMK: kolom nilai dipetakan ke CPMK, skor CPMK = rata-rata berbobot kolomnya,
   skor CPL = rata-rata berbobot CPMK yang memuat CPL itu. Capaian CPL = persen mahasiswa dengan skor CPL ≥ ambang. */

const ANGKA = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : parseFloat(String(v).trim().replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const BUKAN_KOMPONEN = /^(no|nomor|nama|namamahasiswa|nim|npm|kelas|class|prodi|programstudi|jk|jumlah|total|nilai|nilaiakhir|nilaiangka|nilaihuruf|na|nh|huruf|grade|angka|mutu|keterangan|ket|status|ip|rata|ratarata|rerata|predikat|absen|kehadiran|hadir)$/;
const NIM_RE = /^(nim|npm|nomorindukmahasiswa)$/;

/** Teks tempelan (dipisah tab, koma, atau titik koma) menjadi baris-baris sel. */
export function bacaTempel(teks) {
  const baris = String(teks || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!baris.length) return [];
  const sep = baris[0].includes('\t') ? '\t' : (baris[0].split(';').length > baris[0].split(',').length ? ';' : (baris[0].includes(',') && !/\d,\d/.test(baris[0]) ? ',' : '\t'));
  return baris.map(l => l.split(sep).map(s => s.trim()));
}

/** Mencari baris judul (berisi NIM), lalu memisahkan kolom NIM, Nama, Kelas, kolom komponen nilai, dan baris mahasiswa. */
export function kenaliTabel(rows) {
  let h = -1;
  for (let i = 0; i < Math.min(rows.length, 25); i++) if ((rows[i] || []).some(c => NIM_RE.test(norm(c)))) { h = i; break; }
  if (h < 0) return { galat: 'Baris judul dengan kolom NIM tidak ditemukan. Salin dari baris judul (No, NIM, Nama, komponen nilai).' };
  const judul = rows[h].map(c => String(c == null ? '' : c).trim()), iNim = judul.findIndex(c => NIM_RE.test(norm(c)));
  const iNama = judul.findIndex(c => /^nama/.test(norm(c))), iKelas = judul.findIndex(c => /^(kelas|class)$/.test(norm(c)));
  const data = rows.slice(h + 1).filter(r => r && String(r[iNim] == null ? '' : r[iNim]).replace(/\D/g, '').length >= 4);
  if (!data.length) return { galat: 'Tidak ada baris mahasiswa di bawah judul.' };
  const kolom = [];
  judul.forEach((c, i) => {
    if (i === iNim || !c || BUKAN_KOMPONEN.test(norm(c))) return;
    const isi = data.map(r => ANGKA(r[i])).filter(v => v != null);
    if (isi.length >= Math.max(2, data.length * 0.5)) kolom.push({ i, nama: c });
  });
  if (!kolom.length) return { galat: 'Tidak ada kolom nilai angka yang dikenali.' };
  return { iNim, ada: { nama: iNama >= 0, kelas: iKelas >= 0 }, kolom,
    mhs: data.map(r => ({ nim: String(r[iNim]).replace(/\D/g, ''), nama: iNama >= 0 ? String(r[iNama] == null ? '' : r[iNama]).trim() : '', kelas: iKelas >= 0 ? String(r[iKelas] == null ? '' : r[iKelas]).trim() : '', v: kolom.map(k => ANGKA(r[k.i])) })) };
}

/** Tahun masuk dari NIM menurut aturan prodi: nimLen digit mulai digit ke-nimPos. Mengembalikan tahun empat angka atau '?'. */
export function angkatanNim(nim, pos = 1, len = 2) {
  const s = String(nim || '').replace(/\D/g, ''), t = s.substr(Math.max(0, pos - 1), len);
  if (t.length !== len) return '?';
  const n = +t; if (len === 2) return String(n >= 0 && n <= 99 ? 2000 + n : '?'); if (len === 4 && n > 1990 && n < 2100) return String(n); return '?';
}

/** Tebakan awal pemetaan kolom ke CPMK dari nama judul. Bobot diambil dari persen di judul bila ada (mis. "UAS (35%)"). */
export function tebakPeta(kolom, cpmk) {
  const peta = {};
  kolom.forEach(k => {
    const m = String(k.nama).match(/cpmk\s*[-_.]?\s*0*(\d+)/i);
    let c = m ? cpmk.find(x => { const d = String(x.kode || '').match(/(\d+)\s*$/); return d && +d[1] === +m[1]; }) : null;
    if (!c && cpmk.length === 1) c = cpmk[0];
    const pct = String(k.nama).match(/(\d+(?:[.,]\d+)?)\s*%/);
    peta[k.nama] = { cpmk: c ? c.id : '', bobot: pct ? parseFloat(pct[1].replace(',', '.')) : 1 };
  });
  return peta;
}

/** Bagian kolom untuk tiap CPMK: [{cpmk, share}] (share 0..1). Tanpa pembagian, seluruh kolom untuk satu CPMK. Satu penilaian boleh mengukur beberapa CPMK dengan persen pembagian. */
export function bagianKolom(p) {
  if (!p) return [];
  const b = (p.bagi || []).filter(x => x && x.cpmk && +x.persen > 0);
  if (b.length) { const t = b.reduce((a, x) => a + +x.persen, 0); return b.map(x => ({ cpmk: x.cpmk, share: +x.persen / t })); }
  return p.cpmk ? [{ cpmk: p.cpmk, share: 1 }] : [];
}

/** Pemeriksaan pemetaan: peringatan bila CPMK lebih banyak dari komponen penilaian, CPMK tak terukur, atau pembagian tidak berjumlah 100. */
export function periksaPeta(kolom, peta, cpmk) {
  const w = [], terukur = new Set();
  let aktif = 0;
  kolom.forEach(k => {
    const p = peta[k.nama], bg = bagianKolom(p); if (bg.length) aktif++;
    bg.forEach(x => terukur.add(x.cpmk));
    const b = (p && p.bagi) || [];
    if (b.length) { const t = b.reduce((a, x) => a + (+x.persen || 0), 0); if (Math.abs(t - 100) > 0.5) w.push(`Pembagian kolom "${k.nama}" berjumlah ${Math.round(t * 10) / 10}%, dinormalkan ke 100%.`); if (b.some(x => !x.cpmk)) w.push(`Kolom "${k.nama}" punya baris pembagian tanpa CPMK.`); }
  });
  if (cpmk.length > aktif) w.push(`CPMK (${cpmk.length}) lebih banyak dari komponen penilaian yang dipakai (${aktif}). Pastikan satu komponen yang mengukur beberapa CPMK memang demikian rancangannya (atur pembagian persen), atau ringkas CPMK menjadi 2–4.`);
  const tak = cpmk.filter(c => !terukur.has(c.id));
  if (tak.length) w.push(`CPMK belum terukur: ${tak.map(c => c.kode || c.id).join(', ')}.`);
  return w;
}

/** Hitung. cpmk: CPMK MK ({id, cpl:[id]}), bobotCpmk: {id: bobot}, peta: {namaKolom: {cpmk, bobot}}. kelasBawaan dipakai bila baris tak punya kelas.
    Hasil: baris agregat per kelas, angkatan, dan CPL; ringkasan per CPL; ringkasan per kelas; dan skor tiap mahasiswa. */
export function hitungCpl({ tabel, cpmk, bobotCpmk, peta, ambang, nimPos, nimLen, kelasBawaan = '' }) {
  const kol = tabel.kolom, per = {}, semua = {}, perKelas = {}, angk = new Set(), kelasSet = new Set(), mahasiswa = [];
  const bg = {}; kol.forEach(k => { bg[k.nama] = bagianKolom(peta[k.nama]); });
  const cpmkAda = cpmk.filter(c => kol.some(k => bg[k.nama].some(x => x.cpmk === c.id)));
  const cplIds = Array.from(new Set(cpmkAda.flatMap(c => c.cpl || [])));
  tabel.mhs.forEach(m => {
    const a = angkatanNim(m.nim, nimPos, nimLen), kelas = m.kelas || kelasBawaan || ''; angk.add(a); kelasSet.add(kelas);
    const skorC = {}, skorL = {};
    cpmkAda.forEach(c => {
      let s = 0, b = 0;
      kol.forEach((k, j) => { const x = bg[k.nama].find(y => y.cpmk === c.id); if (!x || m.v[j] == null) return; const p = peta[k.nama], w = (+p.bobot > 0 ? +p.bobot : 1) * x.share; s += w * m.v[j]; b += w; });
      if (b) skorC[c.id] = s / b;
    });
    cplIds.forEach(id => {
      let s = 0, b = 0;
      cpmkAda.forEach(c => { if (!(c.cpl || []).includes(id) || skorC[c.id] == null) return; const w = +bobotCpmk[c.id] > 0 ? +bobotCpmk[c.id] : 1; s += w * skorC[c.id]; b += w; });
      if (!b) return;
      const skor = s / b; skorL[id] = skor;
      [[per, kelas + '|' + a + '|' + id], [semua, id], [perKelas, kelas + '|' + id]].forEach(([o, key]) => { const x = o[key] || (o[key] = { n: 0, lulus: 0, jum: 0 }); x.n++; x.jum += skor; if (skor >= ambang) x.lulus++; });
    });
    mahasiswa.push({ nim: m.nim, nama: m.nama, kelas, angkatan: a, cpmk: skorC, cpl: skorL });
  });
  const baris = Object.keys(per).map(key => { const [kelas, angkatan, cpl] = key.split('|'), x = per[key]; return { kelas, angkatan, cpl, n: x.n, lulus: x.lulus, rata: x.jum / x.n }; });
  const ringkas = cplIds.map(id => { const x = semua[id] || { n: 0, lulus: 0, jum: 0 }; return { cpl: id, n: x.n, lulus: x.lulus, persen: x.n ? x.lulus / x.n * 100 : null, rata: x.n ? x.jum / x.n : null }; });
  const kelasHasil = Object.keys(perKelas).map(key => { const [kelas, cpl] = key.split('|'), x = perKelas[key]; return { kelas, cpl, n: x.n, lulus: x.lulus, persen: x.lulus / x.n * 100, rata: x.jum / x.n }; });
  return { baris, ringkas, kelasHasil, kelas: Array.from(kelasSet).sort(), cplIds, cpmkAda: cpmkAda.map(c => c.id), mahasiswa, mhs: tabel.mhs.length, angkatan: Array.from(angk).sort(), takTerpetakan: kol.filter(k => !bg[k.nama].length).map(k => k.nama) };
}

/** Status per CPL: 'ok' bila persen ≥ target, 'near' bila selisih ≤ 10 poin, selain itu 'bad'. */
export const statusCapaian = (persen, target) => persen == null ? 'na' : persen >= target ? 'ok' : persen >= target - 10 ? 'near' : 'bad';
