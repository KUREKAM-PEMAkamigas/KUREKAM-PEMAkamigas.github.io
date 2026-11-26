/* KUREKAM · SKPI (Surat Keterangan Pendamping Ijazah): logika murni.
   Sumber nilai: transkrip PDF dari SIAKAD yang dibaca di peramban (tidak diunggah, tidak disimpan).
   Sumber pemetaan: CPMK -> CPL di KUREKAM. Skor CPL = rata-rata angka mutu tertimbang SKS dan porsi CPMK.
   Yang boleh tersimpan: pengaturan, padanan kode, agregat angkatan tanpa nama, dan sidik keaslian (hash) tanpa nama. */
import { kunci } from './terjemahan.js';

/** Skala SIAKAD. Angka mutu yang dipakai diambil dari kolom Mutu / SKS di transkrip; skala ini hanya pemeriksa silang. */
export const SKALA = { A: 4, AB: 3.5, B: 3, BC: 2.5, C: 2, CD: 1.5, D: 1, E: 0 };
/** Empat ranah capaian pembelajaran SN-Dikti. */
export const DOMAIN = [['S', 'Sikap', 'Attitude'], ['P', 'Pengetahuan', 'Knowledge'], ['KU', 'Keterampilan Umum', 'General Skills'], ['KK', 'Keterampilan Khusus', 'Specific Skills']];
/** Bawaan: ambang predikat mengikuti SKPI PEM sebelumnya; batas "mencapai" untuk rekap angkatan setara nilai 60 (BC). Semua dapat diubah di Pengaturan SKPI. */
export const SKPI_DEF = { sangat: 3.5, kompeten: 3.0, capai: 2.5, gelar: 'S.Tr.T.', gelarEn: 'Bachelor of Applied Science in Engineering', jenjang: 'Sarjana Terapan (D4)', kkni: 6, lamaStudi: '4 tahun / 4 years', tempat: 'Cepu', akred: '', penandatangan: '', jabatan: 'Direktur', nip: '', jabatanEn: 'Director', kurikulum: 'Kurikulum 2023', institusi: 'Politeknik Energi dan Mineral Akamigas', institusiEn: 'Akamigas Polytechnic of Energy and Mineral', badan: 'Badan Pengembangan Sumber Daya Manusia Energi dan Sumber Daya Mineral', badanEn: 'Human Resources Development Agency, Ministry of Energy and Mineral Resources' };

const num = (v) => { if (v == null || v === '') return NaN; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const r2 = (v) => Math.round(v * 100) / 100;
const ROMAWI = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const GRADE = new Set(Object.keys(SKALA));

export const pengaturan = (S, pid) => ({ ...SKPI_DEF, ...(((S.settings || {}).skpi || {})[pid] || {}) });
export const predikat = (v, K) => v == null ? null : r2(v) > K.sangat ? ['Sangat Kompeten', 'Highly Competent', 'sk'] : r2(v) >= K.kompeten ? ['Kompeten', 'Competent', 'k'] : ['Cukup Kompeten', 'Sufficiently Competent', 'ck'];

/* ---------- membaca transkrip ---------- */

/** Kelompokkan potongan teks ({s,x,y}) menjadi baris berdasarkan y (dari atas ke bawah) lalu x. */
export function barisDari(items, tol = 2) {
  const it = items.filter(i => String(i.s).trim()).slice().sort((a, b) => b.y - a.y || a.x - b.x), rows = [];
  for (const i of it) { const r = rows.find(q => Math.abs(q.y - i.y) <= tol); if (r) r.items.push(i); else rows.push({ y: i.y, items: [i] }); }
  rows.forEach(r => r.items.sort((a, b) => a.x - b.x));
  return rows.sort((a, b) => b.y - a.y);
}
const teks = (r) => r.items.map(i => i.s.trim()).join(' ').replace(/\s+/g, ' ');
const dwi = (s) => { const [a, ...b] = String(s || '').split('/'); return [a.trim(), b.join('/').trim()]; };

/** Baca satu halaman transkrip SIAKAD (satu mahasiswa per halaman; halaman lanjutan digabung oleh susunTranskrip). */
export function bacaHalaman(items) {
  const rows = barisDari(items), out = { mk: [], masalah: [] };
  const iPrest = rows.findIndex(r => /Prestasi Akademik/i.test(teks(r)));
  const iTotal = rows.findIndex(r => /Jumlah\s*\/\s*Total/i.test(teks(r)));
  const head = rows.slice(0, iPrest < 0 ? rows.length : iPrest);
  /* identitas */
  const rNama = head.find(r => /Nama Mahasiswa/i.test(teks(r)));
  if (rNama) {
    const colons = rNama.items.filter(i => i.s.trim() === ':'), x1 = colons[0] ? colons[0].x : 150, x2 = colons[1] ? colons[1].x : 428;
    const idLab = rNama.items.find(i => /Nomor Induk/i.test(i.s));
    out.nama = rNama.items.filter(i => i.x > x1 + 2 && (!idLab || i.x < idLab.x - 1)).map(i => i.s.trim()).join(' ').trim();
    const nim = rNama.items.filter(i => i.x > x2).map(i => i.s.trim()).join('').replace(/\D/g, ''); out.nim = nim;
    const rTtl = head.find(r => /Tempat dan Tanggal Lahir/i.test(teks(r)));
    const rTtl2 = head.find(r => /Place, Date of Birth/i.test(teks(r)));
    const labProdi = rTtl && rTtl.items.find(i => /^Program Studi/i.test(i.s.trim()));
    const lim = labProdi ? labProdi.x - 1 : 295;
    if (rTtl) out.ttl = dwi(rTtl.items.filter(i => i.x > x1 + 2 && i.x < lim).map(i => i.s.trim()).join(' '))[0];
    if (rTtl2) out.ttlEn = rTtl2.items.filter(i => i.x > x1 + 2 && i.x < lim).map(i => i.s.trim()).join(' ').trim();
    const iP = head.findIndex(r => /Program Studi/i.test(teks(r))), iG = head.findIndex(r => /^Program\s*\//i.test(r.items.filter(i => i.x > 295).map(i => i.s.trim()).join(' ')) || /Program \/ Program/i.test(teks(r)));
    if (iP >= 0) {
      const sl = head.slice(iP, iG > iP ? iG : iP + 2).map(r => r.items.filter(i => i.x > x2).map(i => i.s.trim()).join(' ')).join(' ');
      [out.prodi, out.prodiEn] = dwi(sl.replace(/\s+/g, ' '));
    }
    if (iG >= 0) { const gl = head.slice(iG).map(r => r.items.filter(i => i.x > x2).map(i => i.s.trim()).join(' ')).join(' '); [out.program, out.programEn] = dwi(gl); }
  }
  const nomor = head.map(teks).join(' ').match(/Transcript Number\s*:\s*(\S+)/i); if (nomor) out.nomorTranskrip = nomor[1];

  /* tabel dua kolom */
  const rH = rows.find(r => r.items.filter(i => /^Kode\s*\//.test(i.s.trim())).length >= 1 && /Mata Kuliah/i.test(teks(r)));
  const kodeX = rH ? rH.items.filter(i => /^Kode\s*\//.test(i.s.trim())).map(i => i.x) : [];
  const batas = kodeX.length >= 2 ? kodeX[1] - 15 : 306;
  const yAtas = rH ? rH.y - 8 : Infinity, yBawah = iTotal >= 0 ? rows[iTotal].y + 1 : -Infinity;
  const badan = items.filter(i => String(i.s).trim() && i.y < yAtas && i.y > yBawah);
  const kolom = [badan.filter(i => i.x < batas), badan.filter(i => i.x >= batas)];
  let smt = 0, terakhir = null;
  for (const k of kolom) {
    for (const r of barisDari(k)) {
      const t = r.items, first = t[0].s.trim(), sm = teks(r).match(/^Semester\s+([IVX]+)$/i);
      if (sm) { smt = ROMAWI[sm[1].toUpperCase()] || smt; terakhir = null; continue; }
      if (/^[A-Z]{2}\d{4}$/.test(first) && t.length >= 5) {
        const mutu = num(t[t.length - 1].s), nilai = t[t.length - 2].s.trim(), sks = num(t[t.length - 3].s);
        const nama = t.slice(1, t.length - 3).map(i => i.s.trim()).join(' ').trim();
        if (!GRADE.has(nilai) || !(sks >= 0) || !Number.isFinite(mutu)) { out.masalah.push(`Baris tidak terbaca: ${first}`); terakhir = null; continue; }
        terakhir = { kode: first, nama, namaEn: '', sks, nilai, mutu, smt, am: sks > 0 ? mutu / sks : SKALA[nilai] };
        out.mk.push(terakhir); continue;
      }
      if (terakhir && t[0].x > 60 && !/^Semester/i.test(first)) terakhir.namaEn = (terakhir.namaEn + ' ' + teks(r)).trim();
    }
  }
  /* penutup */
  if (iTotal >= 0) { const n = rows[iTotal].items.map(i => num(i.s)).filter(Number.isFinite); out.totalSks = n[0]; out.totalMutu = n[1]; }
  const yT = iTotal >= 0 ? rows[iTotal].y : Infinity;
  for (const r of barisDari(items.filter(i => i.x > 340 && i.y < yT - 1), 3)) {
    const x = teks(r);
    const ipk = x.match(/Indeks Prestasi Kumulatif.*?:\s*([\d.,]+)/i); if (ipk) out.ipk = num(ipk[1]);
    const pr = x.match(/Predicate\s*:\s*(.+)$/i); if (pr) [out.predikatLulus, out.predikatLulusEn] = dwi(pr[1]);
    const yd = x.match(/Date of Judicium\s*:\s*(.+)$/i); if (yd) [out.yudisium, out.yudisiumEn] = dwi(yd[1]);
  }
  return out;
}

/** Gabungkan halaman menjadi daftar mahasiswa. Halaman tanpa header "TRANSKRIP" dianggap lanjutan. */
export function susunTranskrip(halaman) {
  const hasil = [];
  halaman.forEach((items, i) => {
    const adaHead = items.some(x => /Nomor Transkrip/i.test(x.s) || /^TRANSKRIP/i.test(x.s.trim()));
    const h = bacaHalaman(items);
    if (adaHead || !hasil.length) { h.halaman = [i + 1]; hasil.push(h); }
    else { const m = hasil[hasil.length - 1]; m.mk.push(...h.mk); m.masalah.push(...h.masalah); m.halaman.push(i + 1); ['totalSks', 'totalMutu', 'ipk', 'predikatLulus', 'predikatLulusEn', 'yudisium', 'yudisiumEn'].forEach(k => { if (h[k] != null) m[k] = h[k]; }); }
  });
  hasil.forEach(periksaTranskrip);
  return hasil;
}

/** Baca transkrip hasil konversi PDF ke Excel. sheets = daftar lembar, tiap lembar daftar baris (daftar sel).
   Semua lembar digabung berurutan lalu dipecah per mahasiswa pada baris "Nama Mahasiswa" (header mahasiswa berikutnya
   biasanya ada di dasar lembar sebelumnya). Letak kolom boleh bergeser: nilai huruf dicari, mutu = angka setelahnya. */
export function bacaTranskripXlsx(sheets) {
  const out = []; let m = null, smt = 0, terakhir = null, nl = 0;
  const kosong = () => ({ mk: [], masalah: [], halaman: [] });
  sheets.forEach((sh, si) => (sh || []).forEach((r) => {
    const c = (r || []).map(x => x == null ? '' : String(x).trim());
    if (!c.some(Boolean)) return;
    const gabung = c.filter(Boolean).join(' ');
    if (/Nama Mahasiswa/i.test(gabung) && /Name of Student/i.test(gabung)) {
      m = kosong(); out.push(m); smt = 0; terakhir = null; nl = 0; m.halaman.push(si + 1);
      const t = c.find(x => /Name of Student/i.test(x)) || gabung;
      const nm = t.match(/Name of Student\s*:\s*(.+?)\s{2,}Nomor Induk/i) || t.match(/Name of Student\s*:\s*(.+?)\s*Nomor Induk/i); if (nm) m.nama = nm[1].trim();
      const ni = t.match(/Student ID Number\s*:\s*(\d+)/i); if (ni) m.nim = ni[1];
      const tl = t.match(/Tempat dan Tanggal Lahir[^:]*:\s*(.+?)\s*\/?\s{2,}Program Studi/i); if (tl) m.ttl = tl[1].replace(/\s*\/\s*$/, '').trim();
      const ps = t.match(/Study Program\s*:\s*(.+)$/im); if (ps) [m.prodi, m.prodiEn] = dwi(ps[1].replace(/\s+/g, ' '));
      return;
    }
    if (!m) return;
    if (nl < 4) {
      const te = (c.find(x => /Place, Date of Birth/i.test(x)) || '').match(/Place, Date of Birth\s*:\s*([^\n]+?)\s*$/im); if (te && !m.ttlEn) { m.ttlEn = te[1].trim(); nl++; }
      const pg = (c.find(x => /Program\s*\/\s*Program\s*:/i.test(x)) || '').match(/^([^\n]*)\n\s*Program\s*\/\s*Program\s*:\s*(.+)$/i);
      if (pg) { m.prodiEn = (m.prodiEn || '') + ' ' + pg[1].trim(); m.prodiEn = m.prodiEn.trim(); [m.program, m.programEn] = dwi(pg[2]); nl++; }
    }
    const sm = (c[0] || '').match(/^Semester\s+([IVX]+)$/i);
    if (sm) { smt = ROMAWI[sm[1].toUpperCase()] || smt; terakhir = null; return; }
    if (/^[A-Z]{2}\d{4}$/.test(c[0])) {
      const rest = c.slice(2), iN = rest.findIndex(x => GRADE.has(x)), nums = rest.map(num);
      const sks = nums.slice(0, iN < 0 ? rest.length : iN).find(Number.isFinite), mutu = iN < 0 ? NaN : nums.slice(iN + 1).find(Number.isFinite);
      if (iN < 0 || !(sks >= 0) || !Number.isFinite(mutu)) { m.masalah.push(`Baris tidak terbaca: ${c[0]}`); terakhir = null; return; }
      const nilai = rest[iN];
      terakhir = { kode: c[0], nama: c[1], namaEn: '', sks, nilai, mutu, smt, am: sks > 0 ? mutu / sks : SKALA[nilai] };
      m.mk.push(terakhir); return;
    }
    if (/^Jumlah\s*\/\s*Total/i.test(c[0])) { const n = c.slice(1).map(num).filter(Number.isFinite); m.totalSks = n[0]; m.totalMutu = n[1]; terakhir = null; return; }
    if (!c[0] && c[1] && terakhir && !terakhir.namaEn && !c.slice(2).some(Boolean)) { terakhir.namaEn = c[1]; return; }
    const ipk = gabung.match(/GPA\s*:\s*([\d.,]+)/i); if (ipk) m.ipk = num(ipk[1]);
    const pr = gabung.match(/Predicate\s*:\s*(.+?)\s*(?:Tanggal Yudisium|$)/i); if (pr) [m.predikatLulus, m.predikatLulusEn] = dwi(pr[1]);
    const yd = gabung.match(/Date of Judicium\s*:\s*(.+)$/i); if (yd) [m.yudisium, m.yudisiumEn] = dwi(yd[1]);
  }));
  out.forEach(periksaTranskrip);
  return out;
}

/** Pemeriksaan keutuhan transkrip. Hasil: m.cek = [{ok, t}], m.valid = semua lolos. */
export function periksaTranskrip(m) {
  const sks = m.mk.reduce((a, x) => a + x.sks, 0), mutu = m.mk.reduce((a, x) => a + x.mutu, 0), cek = [];
  const salahSkala = m.mk.filter(x => SKALA[x.nilai] != null && Math.abs(x.sks * SKALA[x.nilai] - x.mutu) > 0.01);
  cek.push({ ok: m.mk.length > 0, t: m.mk.length ? `${m.mk.length} mata kuliah terbaca.` : 'Tidak ada mata kuliah terbaca.' });
  cek.push({ ok: !!m.nim && !!m.nama, t: m.nim && m.nama ? 'Nama dan NIM terbaca.' : 'Nama atau NIM tidak terbaca.' });
  cek.push({ ok: m.totalSks != null && Math.abs(sks - m.totalSks) < 0.01, t: m.totalSks != null ? `Jumlah SKS ${sks} ${Math.abs(sks - m.totalSks) < 0.01 ? 'sama dengan' : 'BERBEDA dari'} jumlah di transkrip (${m.totalSks}).` : 'Jumlah SKS di transkrip tidak terbaca.' });
  cek.push({ ok: m.totalMutu != null && Math.abs(mutu - m.totalMutu) < 0.01, t: m.totalMutu != null ? `Jumlah mutu ${r2(mutu)} ${Math.abs(mutu - m.totalMutu) < 0.01 ? 'sama dengan' : 'BERBEDA dari'} jumlah di transkrip (${m.totalMutu}).` : 'Jumlah mutu di transkrip tidak terbaca.' });
  const ipk = sks ? mutu / sks : NaN;
  cek.push({ ok: m.ipk != null && Math.abs(ipk - m.ipk) <= 0.01, t: m.ipk != null ? `IPK hitung ${r2(ipk).toFixed(2)} ${Math.abs(ipk - m.ipk) <= 0.01 ? 'sama dengan' : 'BERBEDA dari'} IPK di transkrip (${m.ipk.toFixed(2)}).` : 'IPK di transkrip tidak terbaca.' });
  cek.push({ ok: !salahSkala.length, t: salahSkala.length ? `Mutu tidak sesuai skala nilai pada: ${salahSkala.map(x => x.kode).join(', ')}.` : 'Mutu tiap mata kuliah sesuai skala nilai SIAKAD (A=4 … E=0).' });
  if (m.masalah.length) cek.push({ ok: false, t: m.masalah.join(' ') });
  m.sks = sks; m.cek = cek; m.valid = cek.every(c => c.ok);
  return m;
}

/* ---------- padanan mata kuliah transkrip dengan KUREKAM ---------- */

const alias = (m) => [m.kode, ...(Array.isArray(m.kodeSiakad) ? m.kodeSiakad : String(m.kodeSiakad || '').split(/[,;\s]+/))].map(x => String(x || '').trim().toUpperCase()).filter(Boolean);

/** Padankan semua MK pada transkrip dengan MK prodi di KUREKAM. Urutan: padanan manual, kode (atau kodeSiakad), lalu nama yang sama persis. */
export function padankan(S, pid, daftar, manual = {}) {
  const mks = (S.mk || []).filter(m => m.prodi === pid), byKode = new Map(), byNama = new Map();
  mks.forEach(m => { alias(m).forEach(k => { if (!byKode.has(k)) byKode.set(k, m); }); const kn = kunci(m.nama); if (kn && !byNama.has(kn)) byNama.set(kn, m); });
  const map = new Map();
  for (const t of daftar) {
    if (map.has(t.kode)) continue;
    let m = null, via = '';
    if (manual[t.kode] && (m = mks.find(x => x.id === manual[t.kode]))) via = 'manual';
    else if ((m = byKode.get(String(t.kode).toUpperCase()))) via = 'kode';
    else if ((m = byNama.get(kunci(t.nama)))) via = 'nama';
    map.set(t.kode, { t, mk: m || null, via: m ? via : '' });
  }
  return map;
}

/* ---------- pemetaan CPMK -> CPL dan perhitungan skor ---------- */

/** Porsi tiap CPL pada satu MK. Bobot CPMK memakai jumlah bobot Sub-CPMK bila lengkap, bila tidak sama rata; tanpa CPMK memakai pemetaan MK->CPL (porsi 1). */
export function porsiMk(S, mk) {
  const cp = (S.cpmk || []).filter(c => c.mk === mk.id), out = new Map();
  if (cp.length) {
    const subs = (S.sub || []).filter(s => s.mk === mk.id);
    const bobot = cp.map(c => subs.filter(s => s.cpmk === c.id).reduce((a, s) => a + (num(s.bobot) || 0), 0));
    const pakaiSub = subs.length > 0 && bobot.every(b => b > 0), tot = pakaiSub ? bobot.reduce((a, b) => a + b, 0) : cp.length;
    cp.forEach((c, i) => (c.cpl || []).forEach(id => out.set(id, (out.get(id) || 0) + (pakaiSub ? bobot[i] : 1) / tot)));
    return { porsi: out, sumber: pakaiSub ? 'bobot Sub-CPMK' : 'CPMK sama rata', adaCpmk: true };
  }
  (mk.cpl || []).forEach(id => out.set(id, 1));
  return { porsi: out, sumber: 'pemetaan MK→CPL (belum ada CPMK)', adaCpmk: false };
}

/** Hitung profil CPL satu mahasiswa. Hasil: per CPL {cpl, skor, den, rincian[]}, ringkasan per ranah, cakupan, masalah. */
export function hitungSkpi(S, pid, m, padan, K = SKPI_DEF) {
  const cpls = (S.cpl || []).filter(c => c.prodi === pid), acc = new Map(cpls.map(c => [c.id, { cpl: c, num: 0, den: 0, rincian: [] }]));
  const tanpaCpl = [], tanpaPadanan = [], cache = new Map();
  let sksPeta = 0, sksTotal = 0;
  for (const t of m.mk) {
    sksTotal += t.sks; const p = padan.get(t.kode);
    if (!p || !p.mk) { tanpaPadanan.push(t); continue; }
    if (!cache.has(p.mk.id)) cache.set(p.mk.id, porsiMk(S, p.mk));
    const pm = cache.get(p.mk.id); let ada = false;
    pm.porsi.forEach((por, id) => {
      const a = acc.get(id); if (!a || !(por > 0) || !(t.sks > 0)) return; ada = true;
      a.num += t.am * t.sks * por; a.den += t.sks * por; a.rincian.push({ t, mk: p.mk, porsi: por, sumber: pm.sumber });
    });
    if (ada) sksPeta += t.sks; else tanpaCpl.push(t);
  }
  const hasil = cpls.map(c => { const a = acc.get(c.id); return { cpl: c, skor: a.den > 0 ? a.num / a.den : null, den: a.den, num: a.num, rincian: a.rincian, jumlahMk: a.rincian.length, pred: a.den > 0 ? predikat(a.num / a.den, K) : null }; });
  const domain = DOMAIN.map(([k, id, en]) => {
    const h = hasil.filter(x => x.cpl.ranah === k && x.den > 0), den = h.reduce((a, x) => a + x.den, 0), nm = h.reduce((a, x) => a + x.num, 0);
    return { k, id, en, skor: den > 0 ? nm / den : null, n: hasil.filter(x => x.cpl.ranah === k).length, terisi: h.length, pred: den > 0 ? predikat(nm / den, K) : null };
  });
  const sembarang = hasil.filter(x => x.jumlahMk === 1).map(x => x.cpl.kode);
  return { hasil, domain, tanpaCpl, tanpaPadanan, sksPeta, sksTotal, cakupan: sksTotal ? sksPeta / sksTotal * 100 : 0, cplKosong: hasil.filter(x => x.skor == null).map(x => x.cpl.kode), satuMk: sembarang };
}

/** Rata-rata angkatan (tanpa nama) untuk lapisan pembanding pada grafik laba-laba. */
export function rataAngkatan(daftarHasil) {
  const acc = new Map();
  daftarHasil.forEach(h => h.hasil.forEach(x => { if (x.skor == null) return; const a = acc.get(x.cpl.id) || [0, 0]; a[0] += x.skor; a[1]++; acc.set(x.cpl.id, a); }));
  return new Map([...acc].map(([k, [s, n]]) => [k, s / n]));
}

/** Agregat untuk Capaian CPL: tiap CPL, berapa lulusan yang dinilai dan berapa yang skornya mencapai batas. Hanya angka. */
export function agregatCapaian(daftar, K = SKPI_DEF) {
  const acc = new Map();
  daftar.forEach(({ h }) => h.hasil.forEach(x => { if (x.skor == null) return; const a = acc.get(x.cpl.id) || { cpl: x.cpl, n: 0, lulus: 0 }; a.n++; if (r2(x.skor) >= K.capai) a.lulus++; acc.set(x.cpl.id, a); }));
  return [...acc.values()];
}

/** Angkatan dari dua digit pertama NIM (22141… -> 2022). Dapat ditimpa pengguna. */
export const angkatanDariNim = (nim) => { const d = String(nim || '').match(/^(\d{2})/); return d ? String(2000 + +d[1]) : ''; };

/* ---------- sidik keaslian (QR) ---------- */

/** Urutan kanonik: kode CPL terurut abjad (Firestore tidak menjaga urutan kunci), sehingga halaman verifikasi dapat menyusun ulang teks yang sama. */
export const sidikKanonik = (nim, kode, hasil) => [nim, kode, ...hasil.filter(x => x.skor != null).map(x => [x.cpl.kode, x.skor.toFixed(2)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).map(([k, v]) => `${k}=${v}`)].join('|');
export async function sidik(teksKanonik) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kurekam-skpi:' + teksKanonik));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
export const kodeBaru = (pid, tahun) => { const a = new Uint8Array(5); crypto.getRandomValues(a); return `SKPI-${pid}-${tahun}-${Array.from(a).map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`; };

/* ---------- kesiapan struktur kurikulum untuk SKPI (tidak butuh transkrip) ---------- */

export function kesiapanSkpi(S, pid) {
  const mks = (S.mk || []).filter(m => m.prodi === pid), cpls = (S.cpl || []).filter(c => c.prodi === pid), cps = (S.cpmk || []).filter(c => c.prodi === pid);
  const mkTanpaCpmk = mks.filter(m => !cps.some(c => c.mk === m.id)), cpmkTanpaCpl = cps.filter(c => !(c.cpl || []).length);
  const cplTanpaMk = cpls.filter(c => !cps.some(x => (x.cpl || []).includes(c.id)) && !mks.some(m => (m.cpl || []).includes(c.id)));
  const cplEn = cpls.filter(c => c.tekEn), cplOk = cpls.filter(c => c.tekEn && c.enStatus === 'ok'), mkEn = mks.filter(m => m.namaEn), mkOk = mks.filter(m => m.namaEn && m.enStatus === 'ok');
  const syarat = [
    { t: 'Setiap CPL punya mata kuliah atau CPMK pembentuk', ok: cpls.length > 0 && !cplTanpaMk.length, ket: cpls.length ? (cplTanpaMk.length ? `${cplTanpaMk.length} CPL tanpa pembentuk: ${cplTanpaMk.map(c => c.kode).join(', ')}.` : `${cpls.length} CPL semuanya punya pembentuk.`) : 'CPL prodi belum disusun.' },
    { t: 'Setiap CPMK terhubung ke minimal satu CPL', ok: cps.length > 0 && !cpmkTanpaCpl.length, ket: cps.length ? (cpmkTanpaCpl.length ? `${cpmkTanpaCpl.length} CPMK belum dipetakan ke CPL.` : `${cps.length} CPMK semuanya terpetakan.`) : 'CPMK belum disusun.' },
    { t: 'Setiap mata kuliah punya CPMK (bobot CPL berbasis CPMK)', ok: mks.length > 0 && !mkTanpaCpmk.length, ket: mkTanpaCpmk.length ? `${mkTanpaCpmk.length} dari ${mks.length} MK belum punya CPMK; sementara dihitung dari pemetaan MK→CPL.` : `${mks.length} MK semuanya punya CPMK.` },
    { t: 'Terjemahan CPL (Inggris) sudah diverifikasi Kaprodi', ok: cpls.length > 0 && cplOk.length === cpls.length, ket: `${cplEn.length} CPL punya terjemahan, ${cplOk.length} terverifikasi dari ${cpls.length}.` },
    { t: 'Terjemahan nama mata kuliah sudah diverifikasi Kaprodi', ok: mks.length > 0 && mkOk.length === mks.length, ket: `${mkEn.length} MK punya terjemahan, ${mkOk.length} terverifikasi dari ${mks.length}.` }
  ];
  return { syarat, ok: syarat.filter(s => s.ok).length, mks, cpls, mkTanpaCpmk, cplTanpaMk, cplEn: cplEn.length, cplOk: cplOk.length, mkEn: mkEn.length, mkOk: mkOk.length };
}
