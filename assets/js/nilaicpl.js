/* KUREKAM · Hitung capaian CPL dari nilai (logika murni, tanpa layar).
   Nilai per mahasiswa hanya ada di memori peramban selama halaman terbuka. Yang dikeluarkan hanya agregat per angkatan dan CPL. */

const ANGKA = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : parseFloat(String(v).trim().replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const BUKAN_KOMPONEN = /^(no|nomor|nama|namamahasiswa|nim|npm|kelas|prodi|programstudi|jk|jumlah|total|nilai|nilaiakhir|nilaiangka|nilaihuruf|na|nh|huruf|grade|angka|mutu|keterangan|ket|status|ip|rata|ratarata|rerata|predikat|absen|kehadiran|hadir)$/;

/** Teks tempelan (dipisah tab, koma bila perlu) menjadi baris-baris sel. */
export function bacaTempel(teks) {
  const baris = String(teks || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!baris.length) return [];
  const sep = baris[0].includes('\t') ? '\t' : (baris[0].split(';').length > baris[0].split(',').length ? ';' : (baris[0].includes(',') && !/\d,\d/.test(baris[0]) ? ',' : '\t'));
  return baris.map(l => l.split(sep).map(s => s.trim()));
}

/** Mencari baris judul (berisi NIM) lalu memisahkan kolom NIM, kolom komponen nilai, dan baris mahasiswa. */
export function kenaliTabel(rows) {
  let h = -1;
  for (let i = 0; i < Math.min(rows.length, 25); i++) if ((rows[i] || []).some(c => /^(nim|npm|nomorindukmahasiswa)$/.test(norm(c)))) { h = i; break; }
  if (h < 0) return { galat: 'Baris judul dengan kolom NIM tidak ditemukan. Salin dari baris judul (No, NIM, Nama, komponen nilai).' };
  const judul = rows[h].map(c => String(c == null ? '' : c).trim()), iNim = judul.findIndex(c => /^(nim|npm|nomorindukmahasiswa)$/.test(norm(c)));
  const data = rows.slice(h + 1).filter(r => r && String(r[iNim] == null ? '' : r[iNim]).replace(/\D/g, '').length >= 4);
  if (!data.length) return { galat: 'Tidak ada baris mahasiswa di bawah judul.' };
  const kolom = [];
  judul.forEach((c, i) => {
    if (i === iNim || !c || BUKAN_KOMPONEN.test(norm(c))) return;
    const isi = data.map(r => ANGKA(r[i])).filter(v => v != null);
    if (isi.length >= Math.max(2, data.length * 0.5)) kolom.push({ i, nama: c });
  });
  if (!kolom.length) return { galat: 'Tidak ada kolom nilai angka yang dikenali.' };
  return { iNim, kolom, mhs: data.map(r => ({ nim: String(r[iNim]).replace(/\D/g, ''), v: kolom.map(k => ANGKA(r[k.i])) })) };
}

/** Tahun masuk dari NIM menurut aturan prodi: nimLen digit mulai digit ke-nimPos. Mengembalikan tahun empat angka atau '?'. */
export function angkatanNim(nim, pos = 1, len = 2) {
  const s = String(nim || '').replace(/\D/g, ''), t = s.substr(Math.max(0, pos - 1), len);
  if (t.length !== len) return '?';
  const n = +t; if (len === 2) return String(n >= 0 && n <= 99 ? 2000 + n : '?'); if (len === 4 && n > 1990 && n < 2100) return String(n); return '?';
}

/** Tebakan awal pemetaan kolom ke CPMK dari nama judul. Kolom yang tak dikenali dipetakan ke CPMK tunggal bila MK hanya punya satu. */
export function tebakPeta(kolom, cpmk) {
  const peta = {};
  kolom.forEach(k => {
    const m = String(k.nama).match(/cpmk\s*[-_.]?\s*0*(\d+)/i);
    let c = m ? cpmk.find(x => String(x.kode || '').match(/(\d+)\s*$/) && +String(x.kode).match(/(\d+)\s*$/)[1] === +m[1]) : null;
    if (!c && cpmk.length === 1) c = cpmk[0];
    const pct = String(k.nama).match(/(\d+(?:[.,]\d+)?)\s*%/);
    peta[k.nama] = { cpmk: c ? c.id : '', bobot: pct ? parseFloat(pct[1].replace(',', '.')) : 1 };
  });
  return peta;
}

/** Hitung. cpmk: daftar CPMK MK ({id, cpl:[id]}), bobotCpmk: {id: bobot}, peta: {namaKolom: {cpmk, bobot}}.
    Hasil: baris agregat per angkatan dan CPL, ringkasan per CPL untuk seluruh angkatan, dan jumlah mahasiswa. */
export function hitungCpl({ tabel, cpmk, bobotCpmk, peta, ambang, nimPos, nimLen }) {
  const kol = tabel.kolom, per = {}, semua = {}, angk = new Set();
  const cpmkAda = cpmk.filter(c => kol.some(k => (peta[k.nama] || {}).cpmk === c.id));
  const cplIds = Array.from(new Set(cpmkAda.flatMap(c => c.cpl || [])));
  tabel.mhs.forEach(m => {
    const a = angkatanNim(m.nim, nimPos, nimLen); angk.add(a);
    const skorC = {};
    cpmkAda.forEach(c => {
      let s = 0, b = 0;
      kol.forEach((k, j) => { const p = peta[k.nama]; if (!p || p.cpmk !== c.id || m.v[j] == null) return; const w = +p.bobot > 0 ? +p.bobot : 1; s += w * m.v[j]; b += w; });
      if (b) skorC[c.id] = s / b;
    });
    cplIds.forEach(id => {
      let s = 0, b = 0;
      cpmkAda.forEach(c => { if (!(c.cpl || []).includes(id) || skorC[c.id] == null) return; const w = +bobotCpmk[c.id] > 0 ? +bobotCpmk[c.id] : 1; s += w * skorC[c.id]; b += w; });
      if (!b) return;
      const skor = s / b;
      [[per, a + '|' + id], [semua, id]].forEach(([o, key]) => { const x = o[key] || (o[key] = { n: 0, lulus: 0, jum: 0 }); x.n++; x.jum += skor; if (skor >= ambang) x.lulus++; });
    });
  });
  const baris = Object.keys(per).map(key => { const [angkatan, cpl] = key.split('|'), x = per[key]; return { angkatan, cpl, n: x.n, lulus: x.lulus, rata: x.jum / x.n }; });
  const ringkas = cplIds.map(id => { const x = semua[id] || { n: 0, lulus: 0, jum: 0 }; return { cpl: id, n: x.n, lulus: x.lulus, persen: x.n ? x.lulus / x.n * 100 : null, rata: x.n ? x.jum / x.n : null }; });
  return { baris, ringkas, mhs: tabel.mhs.length, angkatan: Array.from(angk).sort(), takTerpetakan: kol.filter(k => !(peta[k.nama] || {}).cpmk).map(k => k.nama) };
}

/** Status per CPL: 'ok' bila persen ≥ target, 'near' bila selisih ≤ 10 poin, selain itu 'bad'. */
export const statusCapaian = (persen, target) => persen == null ? 'na' : persen >= target ? 'ok' : persen >= target - 10 ? 'near' : 'bad';
