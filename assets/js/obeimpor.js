/* KUREKAM · Impor Templat Tabel Kurikulum OBE PEM Akamigas (Excel lembar 1 sampai 18) menjadi data KUREKAM satu prodi.
   Prodi cukup mengunggah berkas OBE yang sudah dimiliki; kode CPL, BK, MK, CPMK, dan Sub-CPMK dipakai apa adanya.
   Fungsi murni: tidak menyentuh S atau basis data. Hasilnya {data, rps, laporan} dipasang oleh pemanggil. */

import { rencanaSelaras, byProdi, tebakBok, kedalamanBk } from './rules.js';

const s = (v) => String(v == null ? '' : v).replace(/ /g, ' ').trim();
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const ya = (v) => /^v$|^x$|^✓$|^√$/i.test(s(v));
const pendek = (t, n) => { t = s(t).replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

const KEL = {
  wajib: 'MKU - wajib kurikulum', sains: 'MBS - matematika dan sains dasar', basic: 'MBE - basic engineering', kompetensi: 'MKK - kompetensi penciri',
};
const KAT = { 'MKU': 'Pendidikan umum', 'MBS': 'Matematika dan ilmu alam', 'MBE': 'Muatan spesifik', 'MKK': 'Muatan spesifik' };
const BUCKET = [
  ['mbkm', /mbkm|magang/i], ['uts', /\buts\b/i], ['uas', /\buas\b/i], ['quiz', /kuis|quiz/i],
  ['unjuk', /unjuk|presentasi|demo|seminar/i], ['part', /parti?sipasi|pratisipasi|praktek|praktik|simulasi/i],
  ['lisan', /lisan/i], ['obs', /observasi|penilaian diri|angket/i],
];
const NAMA_BUCKET = { mbkm: 'Penilaian MBKM', obs: 'Observasi (tugas dan keaktifan)', part: 'Partisipasi dan praktik', unjuk: 'Unjuk kerja', quiz: 'Kuis (tes tulis)', uts: 'Tes tulis UTS', uas: 'Tes tulis UAS', lisan: 'Tes lisan' };
const KOL18 = ['obs', 'part', 'unjuk', 'quiz', 'uts', 'uas', 'lisan']; /* kolom MBKM (D) hanya menandai MK yang dapat dikonversi, bukan bobot */

const NAMA_RANAH = { S: 'sikap', P: 'pengetahuan', KU: 'keterampilan umum', KK: 'keterampilan khusus' };
/** Menebak ranah CPL dari rumusannya bila lembar 2 tidak memuatnya. */
function tebakRanah(t) {
  const x = s(t).toLowerCase();
  if (/^(bertakwa|beriman|menunjukkan sikap|menginternalisasi|menghargai|berperan|berkontribusi|menjunjung|taat|bersikap|memiliki (sikap|etos|integritas))|sikap|etika|integritas|kejuangan|kewirausahaan/.test(x)) return 'S';
  if (/^(menguasai|memahami|menjelaskan)\s+(konsep|teori|prinsip|dasar|pengetahuan)|konsep teoretis|pengetahuan/.test(x)) return 'P';
  if (/bekerja sama|kerja sama|tim\b|berkomunikasi|pemikiran logis|berpikir kritis|mengambil keputusan|mendokumentasikan|mengelola informasi|belajar sepanjang hayat|inovatif/.test(x)) return 'KU';
  return 'KK';
}
/** Baca satu lembar sebagai larik baris. Lembar dicari lewat nomor awal, mis. "13" atau "12a". */
function lembar(X, wb, no) {
  const re = new RegExp('^\\s*' + no + '\\s*[.\\-]', 'i');
  const nama = wb.SheetNames.find(n => re.test(n));
  if (!nama) return null;
  return X.utils.sheet_to_json(wb.Sheets[nama], { header: 1, defval: '', blankrows: false });
}
const cariBaris = (rows, re, kolom = 0) => rows.findIndex(r => re.test(s(r[kolom])));

export function imporObe(X, wb, pid) {
  const lap = [], P = (k) => `${pid}-${k}`;
  const L = (n) => lembar(X, wb, n);
  const l1 = L('1'), l2 = L('2'), l3 = L('3'), l5 = L('5'), l6 = L('6'), l7 = L('7'), l8 = L('8'), l9 = L('9'), l11 = L('11'), l12 = L('12'), l13 = L('13'), l14 = L('14'), l15 = L('15'), l17 = L('17'), l18 = L('18');
  if (!l3 || !l11) throw new Error('Berkas bukan templat Tabel Kurikulum OBE: lembar "3. CPL Prodi" atau "11. Susunan Mata Kuliah" tidak ditemukan.');

  /* 1. Profil lulusan */
  const pl = [];
  (l1 || []).forEach(r => { const k = s(r[0]).toUpperCase(); if (/^PL\d+$/.test(k) && s(r[1])) pl.push({ id: P(k), prodi: pid, kode: k, nama: pendek(r[1], 70), teks: s(r[1]), profesi: s(r[2]) }); });
  if (!pl.length) lap.push('Profil lulusan (lembar 1) belum terbaca.');

  /* 3 dan 2. CPL prodi, ranah, dan kode unsur SN Dikti */
  const cpl = [], cplBy = {};
  l3.forEach(r => { const k = s(r[0]).toUpperCase(); if (/^CPL\d+$/.test(k) && s(r[1])) { const c = { id: P(k), prodi: pid, kode: k, ranah: '', teks: s(r[1]), iabee: [], pl: [], sn: '' }; cpl.push(c); cplBy[k] = c; } });
  let ranah = '';
  (l2 || []).forEach(r => {
    const a = s(r[0]), b = s(r[1]);
    if (/^sikap/i.test(a)) ranah = 'S'; else if (/^pengetahuan/i.test(a)) ranah = 'P'; else if (/^ket[a-z]*\s*umum/i.test(a)) ranah = 'KU'; else if (/^ket[a-z]*\s*khusus/i.test(a)) ranah = 'KK';
    const k = a.toUpperCase();
    if (/^CPL\d+$/.test(k) && /^CPL-/i.test(b) && cplBy[k]) { const c = cplBy[k]; if (!c.ranah) c.ranah = ranah; const sn = b.toUpperCase(); c.sn = c.sn ? `${c.sn}, ${sn}` : sn; }
  });
  cpl.forEach(c => { if (!c.ranah) { c.ranah = tebakRanah(c.teks); lap.push(`${c.kode}: ranah tidak terbaca dari lembar 2, ditebak dari rumusan sebagai ${NAMA_RANAH[c.ranah]}. Periksa di menu CPL.`); } });
  if (!cpl.some(c => c.sn)) lap.push('Kode unsur SN Dikti (lembar 2) belum terbaca.');

  /* 5. CPL terhadap PL */
  if (l5) { const hi = cariBaris(l5, /^cpl/i); if (hi >= 0) { const h = l5[hi].map(s); l5.slice(hi + 1).forEach(r => { const c = cplBy[s(r[0]).toUpperCase()]; if (!c) return; h.forEach((x, i) => { if (i > 0 && /^PL\d+$/i.test(x) && ya(r[i])) c.pl.push(P(x.toUpperCase())); }); }); } }

  /* 6 dan 7. Bahan kajian dan pemetaannya ke CPL */
  const bk = [], bkBy = {};
  (l6 || []).forEach(r => { const k = s(r[0]).toUpperCase(); if (/^BK\d+$/.test(k) && s(r[1])) { const b = { id: P(k), prodi: pid, kode: k, nama: s(r[1]), bok: `${pid}-BOK${tebakBok(s(r[1]))}`, kedalaman: '', cpl: [] }; bk.push(b); bkBy[k] = b; } });
  if (l7) { const hi = cariBaris(l7, /^bk/i); if (hi >= 0) { const h = l7[hi].map(x => s(x).toUpperCase()); l7.slice(hi + 1).forEach(r => { const b = bkBy[s(r[0]).toUpperCase()]; if (!b) return; h.forEach((x, i) => { if (/^CPL\d+$/.test(x) && ya(r[i]) && cplBy[x]) b.cpl.push(cplBy[x].id); }); }); } }

  /* 11, 12. Mata kuliah: kode asli, semester, SKS teori dan praktik, dan kelompok */
  const mk = [], mkBy = {};
  l11.forEach(r => {
    const no = s(r[0]).toUpperCase(); if (!/^MK\d+$/.test(no)) return;
    const smt = [4, 5, 6, 7, 8, 9, 10, 11].findIndex(i => ya(r[i])) + 1, T = num(r[15]), Pp = num(r[16]), sks = num(r[3]);
    const m = { id: P(no), prodi: pid, no, kode: s(r[1]) || no, nama: s(r[2]), smt: smt || 1, T, P: Pp, kel: KEL.kompetensi, kat: '', prasyarat: [], lokasi: Pp > T ? 'Laboratorium' : 'Kampus', bk: [], cpl: [], kunci: '' };
    if (!smt) lap.push(`${m.kode} ${m.nama}: semester tidak terbaca.`);
    if (T + Pp !== sks) lap.push(`${m.kode} ${m.nama}: SKS ${sks} tidak sama dengan teori ${T} ditambah praktik ${Pp}.`);
    mk.push(m); mkBy[no] = m;
  });
  if (l12) {
    const hi = cariBaris(l12, /^smt/i); if (hi >= 0) {
      const h = l12[hi], mulai = h.map((x, i) => [s(x), i]).filter(x => x[0] && !/^smt$|^sks$|^jml/i.test(x[0]));
      l12.slice(hi + 1).forEach(r => { r.forEach((v, i) => {
        const no = s(v).toUpperCase(); if (!/^MK\d+$/.test(no) || !mkBy[no]) return;
        let g = ''; mulai.forEach(([nm, c]) => { if (i >= c) g = nm; });
        const kel = /national|wajib|umum|mku/i.test(g) ? KEL.wajib : /science|sains/i.test(g) ? KEL.sains : /basic eng/i.test(g) ? KEL.basic : KEL.kompetensi;
        mkBy[no].kel = kel;
      }); });
    }
  } else lap.push('Lembar 12 belum ada: kelompok MK dianggap kompetensi.');
  mk.forEach(m => { m.kat = KAT[m.kel.slice(0, 3)] || 'Muatan spesifik'; });

  if (bk.length) lap.push('Bahan kajian dikaitkan ke BoK menurut kata kunci pada namanya (lembar 6 tidak memuat BoK). Periksa di menu BoK dan Bahan Kajian.');
  /* 8. BK terhadap MK, 9. CPL terhadap MK */
  if (l8) { const hi = cariBaris(l8, /^kode mk/i); if (hi >= 0) { const h = l8[hi].map(x => s(x).toUpperCase()); l8.slice(hi + 1).forEach(r => { const m = mkBy[s(r[0]).toUpperCase()]; if (!m) return; h.forEach((x, i) => { if (/^BK\d+$/.test(x) && ya(r[i]) && bkBy[x]) m.bk.push(bkBy[x].id); }); }); } }
  if (l9) { const hi = cariBaris(l9, /^mk\s*\/\s*cpl/i, 1) >= 0 ? cariBaris(l9, /^mk\s*\/\s*cpl/i, 1) : cariBaris(l9, /^mk/i, 0); if (hi >= 0) { const h = l9[hi].map(x => s(x).toUpperCase()); l9.slice(hi + 1).forEach(r => { const m = mkBy[s(r[0]).toUpperCase()]; if (!m) return; h.forEach((x, i) => { if (/^CPL\d+$/.test(x) && ya(r[i]) && cplBy[x]) m.cpl.push(cplBy[x].id); }); }); } }

  /* 13, 14. CPMK: uraian dari lembar 13, kaitan MK dan CPL dari lembar 14 */
  const cpmkTeks = {}, cpmkCpl = {};
  (l13 || []).forEach(r => { const k = s(r[2]).toUpperCase(); if (/^CPMK\d+$/.test(k) && s(r[3])) cpmkTeks[k] = s(r[3]); const kc = s(r[0]).toUpperCase(); if (/^CPMK\d+$/.test(k) && cplBy[kc]) (cpmkCpl[k] = cpmkCpl[k] || []).push(cplBy[kc].id); });
  const cpmk = [], cpmkBy = {};
  const ambilCpmk = (no, kode, cplId) => {
    const key = `${no}|${kode}`; let c = cpmkBy[key];
    if (!c) { c = { id: `${P(no)}-${kode}`, prodi: pid, mk: P(no), kode, teks: cpmkTeks[kode] || '', cpl: [] }; cpmk.push(c); cpmkBy[key] = c; }
    if (cplId && !c.cpl.includes(cplId)) c.cpl.push(cplId);
    return c;
  };
  if (l14) { const hi = cariBaris(l14, /^mk\s*\/\s*cpl/i); if (hi >= 0) { const h = l14[hi].map(x => s(x).toUpperCase()); l14.slice(hi + 1).forEach(r => { const no = s(r[0]).toUpperCase(); if (!mkBy[no]) return; h.forEach((x, i) => { if (!/^CPL\d+$/.test(x) || !cplBy[x]) return; s(r[i]).split(/[,;\s]+/).map(q => q.toUpperCase()).filter(q => /^CPMK\d+$/.test(q)).forEach(q => ambilCpmk(no, q, cplBy[x].id)); }); }); } }
  else lap.push('Lembar 14 (CPL-MK-CPMK) belum ada: CPMK tidak dapat dikaitkan ke MK.');

  /* 15. Sub-CPMK */
  const sub = [];
  (l15 || []).forEach(r => {
    const no = s(r[0]).toUpperCase(), kc = s(r[2]).toUpperCase(), ks = s(r[3]).toUpperCase(); if (!mkBy[no] || !/^CPMK\d+$/.test(kc) || !ks) return;
    const c = ambilCpmk(no, kc, null);
    sub.push({ id: `${c.id}-${ks}`, prodi: pid, cpmk: c.id, mk: P(no), kode: ks, teks: s(r[4]), bobot: 0 });
  });
  cpmk.forEach(c => { if (!c.cpl.length && cpmkCpl[c.kode]) c.cpl.push(...cpmkCpl[c.kode]); });
  cpmk.forEach(c => { if (!c.teks) lap.push(`${c.kode} pada ${c.mk.replace(pid + '-', '')}: uraian CPMK tidak ada di lembar 13.`); if (!c.cpl.length) lap.push(`${c.kode} pada ${c.mk.replace(pid + '-', '')}: tidak terkait CPL pada lembar 14.`); });

  /* Konversi cerdas: (a) satu CPMK mendukung CPL yang sama di semua MK pemuatnya, (b) CPL diurutkan menurut ranah SN Dikti dan dinomori CPL01 dst,
     (c) CPMK dinomori mengikuti urutan CPL dan Sub-CPMK mengikuti nomor CPMK. Hanya kode yang berganti; id dan keterkaitan tetap. */
  const konversi = [];
  { const urutCpl = byProdi(cpl, pid).map(c => c.id), cpmkKode = {};
    cpmk.forEach(c => { (cpmkKode[c.kode] = cpmkKode[c.kode] || []).push(c); });
    Object.values(cpmkKode).forEach(g => { const u = Array.from(new Set(g.flatMap(c => c.cpl))).sort((a, b) => urutCpl.indexOf(a) - urutCpl.indexOf(b)); g.forEach(c => { c.cpl = u.slice(); }); const teks = (g.find(c => c.teks) || {}).teks; if (teks) g.forEach(c => { c.teks = teks; }); });
    const banyak = Object.values(cpmkKode).filter(g => g.length > 1).length; if (banyak) lap.push(`${banyak} CPMK dipakai oleh lebih dari satu mata kuliah (sesuai pola Excel).`);
    /* urutan CPL: ranah SN Dikti, lalu nomor unsur SN Dikti terkecil (S01, P03, KK02...), lalu nomor lama. Nomor sementara dipakai agar rencanaSelaras mengikuti urutan ini. */
    const ORD = { S: 0, P: 1, KU: 2, KK: 3 }, noSn = (c) => { const m = (String(c.sn).toUpperCase().match(/(?:^|[^A-Z])(KU|KK|S|P)(\d+)/g) || []).map(x => x.replace(/^[^A-Z]/, '')).filter(x => x.replace(/\d+/, '') === c.ranah).map(x => +x.replace(/\D/g, '')); return m.length ? Math.min(...m) : 999; };
    const lamaKode = {}; cpl.slice().sort((a, b) => (ORD[a.ranah] - ORD[b.ranah]) || (noSn(a) - noSn(b)) || (parseInt(a.kode.replace(/\D/g, ''), 10) - parseInt(b.kode.replace(/\D/g, ''), 10))).forEach((c, i) => { lamaKode[c.id] = c.kode; c.kode = 'CPL' + String(i + 1).padStart(3, '0'); });
    const S2 = { settings: {}, cpl, mk, cpmk, sub, pi: [], pl, bk };
    const r = rencanaSelaras(S2, pid);
    cpl.forEach(c => { c.kode = lamaKode[c.id]; });
    r.cpl.forEach(n => { const c = cpl.find(x => x.id === n.id); if (c.kode !== n.kode) konversi.push({ jenis: 'CPL', lama: c.kode, baru: n.kode }); c.kode = n.kode; });
    const lamaK = {}; r.cpmk.forEach(n => { const c = cpmk.find(x => x.id === n.id); lamaK[c.kode] = n.kode; c.kode = n.kode; }); Object.entries(lamaK).forEach(([a, b]) => konversi.push({ jenis: 'CPMK', lama: a, baru: b }));
    r.sub.forEach(n => { const c = sub.find(x => x.id === n.id); c.kode = n.kode; });
    if (r.sub.length) konversi.push({ jenis: 'Sub-CPMK', lama: `${r.sub.length} kode`, baru: 'SUB-CPMK + nomor CPMK + urutan' });
    { const kc = konversi.filter(k => k.jenis === 'CPL'); if (kc.length) lap.push(`CPL diurutkan menurut ranah (Sikap, Pengetahuan, Keterampilan Umum, Keterampilan Khusus) lalu nomor unsur SN Dikti, dan dinomori ulang: ${kc.slice(0, 12).map(k => `${k.lama} menjadi ${k.baru}`).join(', ')}${kc.length > 12 ? ', dan lainnya' : ''}.`); }
  }

  /* Kedalaman BK: level Bloom tertinggi dari CPL yang dibentuk BK (lembar 6 tidak memuatnya) */
  { const S3 = { cpl, mk }; bk.forEach(b => { b.kedalaman = kedalamanBk(S3, b); }); if (bk.length) lap.push('Kedalaman bahan kajian diisi otomatis dari level Bloom tertinggi CPL yang dibentuknya. Periksa di menu BoK dan Bahan Kajian.'); }

  /* 17, 18. Teknik, minggu, dan bobot penilaian -> kerangka RPS */
  const teknik = {};
  (l17 || []).forEach(r => {
    const no = s(r[1]).toUpperCase(), kc = s(r[2]).toUpperCase(); if (!mkBy[no]) return;
    const tahap = s(r[3]).split(/\n+/).map(s).filter(Boolean), tek = s(r[4]).split(/\n+/).map(s).filter(Boolean);
    const a = teknik[no] = teknik[no] || {};
    tek.forEach((t, i) => { const b = (BUCKET.find(x => x[1].test(t)) || [])[0]; if (!b) return; const w = (/minggu/i.test(tahap[i] || '') ? (tahap[i].match(/\d+/g) || []).map(Number) : null); a[b] = a[b] || { minggu: w, cpmk: new Set() }; a[b].cpmk.add(kc); if (!a[b].minggu && w) a[b].minggu = w; });
  });
  const bobot = {};
  if (l18) {
    const hi = cariBaris(l18, /^cpl/i); if (hi >= 0) l18.slice(hi + 1).forEach(r => {
      const no = s(r[1]).toUpperCase(); if (!mkBy[no]) return;
      const tot = (bobot[no] = bobot[no] || {}); let jr = 0; KOL18.forEach((b, i) => { const w = num(r[4 + i]); if (w) { tot[b] = (tot[b] || 0) + w; jr += w; } });
      const tt = num(r[11]); if (tt && Math.abs(tt - jr) > 0.05) lap.push(`${mkBy[no].kode} ${s(r[2])}: jumlah bobot teknik ${jr} tidak sama dengan kolom TOTAL ${tt} pada lembar 18.`);
    });
  } else lap.push('Lembar 18 (bobot) belum ada: RPS dibuat tanpa bobot.');

  const rps = [];
  mk.forEach(m => {
    const no = m.no, bw = bobot[no]; if (!bw) return;
    const subs = sub.filter(x => x.mk === m.id);
    const reg = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
    const pert = Array.from({ length: 16 }, (_, i) => ({ m: i + 1, materi: '', sub: [], indikator: '', asesmen: '', metode: '', tatap: '', daring: '', bobot: 0, ujian: '', riset: [], integ: '', integUraian: '', sap: {} }));
    const at = (w) => pert[w - 1], teks = {}, tk = teknik[no] || {};
    const pasang = (b, w, weeks) => { weeks.forEach(k => { at(k).bobot += w / weeks.length; (teks[k] = teks[k] || new Set()).add(NAMA_BUCKET[b]); }); };
    Object.keys(bw).forEach(b => {
      const w = bw[b]; let weeks;
      if (b === 'uts') weeks = [8]; else if (b === 'uas') weeks = [16];
      else if (tk[b] && tk[b].minggu && tk[b].minggu.length) weeks = tk[b].minggu.filter(x => x >= 1 && x <= 16);
      else if (b === 'quiz') weeks = [4, 12]; else if (b === 'lisan') weeks = [16];
      else weeks = [3, 7, 11, 15]; /* "setiap waktu": direkap pada empat titik agar bobot per pertemuan tidak terlalu kecil */
      pasang(b, w, weeks.length ? weeks : reg);
    });
    if (bw.uts) at(8).ujian = 'UTS'; if (bw.uas) at(16).ujian = 'UAS';
    Object.keys(teks).forEach(k => { at(+k).asesmen = Array.from(teks[k]).join('; '); });
    const n = subs.length;
    subs.forEach((x, i) => { const w = reg[Math.min(reg.length - 1, Math.floor(i * reg.length / Math.max(n, 1)))]; at(w).sub.push(x.id); });
    { /* setiap pertemuan bernilai memuat Sub-CPMK yang dinilainya: miliknya sendiri ditambah yang diajarkan sejak penilaian sebelumnya */
      let tunda = []; let terakhir = null; const asli = pert.map(q => q.sub.slice());
      pert.forEach(p => {
        const sendiri = p.sub.slice(); tunda = tunda.concat(sendiri.filter(id => !tunda.includes(id)));
        if (p.bobot > 0) { tunda.forEach(id => { if (!p.sub.includes(id)) p.sub.push(id); }); tunda = []; terakhir = p; }
      });
      if (tunda.length && terakhir) tunda.forEach(id => { if (!terakhir.sub.includes(id)) terakhir.sub.push(id); });
      pert.forEach(p => { if (p.bobot > 0 && !p.sub.length) { const dari = p.m <= 8 ? 1 : 9; for (let w = dari; w < p.m; w++) asli[w - 1].forEach(id => { if (!p.sub.includes(id)) p.sub.push(id); }); } });
    }
    const mentah = pert.reduce((x, p) => x + p.bobot, 0);
    pert.forEach(p => { p.bobot = Math.round(p.bobot * 100) / 100; });
    { const sisa = Math.round((mentah - pert.reduce((x, p) => x + p.bobot, 0)) * 100) / 100; const akhir = pert.slice().reverse().find(p => p.bobot > 0); if (akhir && sisa) akhir.bobot = Math.round((akhir.bobot + sisa) * 100) / 100; }
    pert.forEach(p => { if (!p.ujian && p.sub.length) { const t = subs.find(x => x.id === p.sub[0]); if (t) p.indikator = 'Ketepatan dalam ' + s(t.teks).replace(/^mampu\s+/i, '').replace(/\.$/, '').toLowerCase(); } });
    const jml = Math.round(pert.reduce((a, p) => a + p.bobot, 0) * 100) / 100;
    if (Math.abs(jml - 100) > 0.05) lap.push(`${m.kode} ${m.nama}: jumlah bobot pada lembar 18 adalah ${jml}, bukan 100.`);
    /* bobot Sub-CPMK diturunkan dari bobot pertemuan agar jumlahnya 100 per MK (draf; dosen dapat mengubah) */
    if (subs.length) {
      const bs = {}; pert.forEach(p => { if (p.bobot && p.sub.length) p.sub.forEach(id => { bs[id] = (bs[id] || 0) + p.bobot / p.sub.length; }); });
      const tot = Object.values(bs).reduce((x, y) => x + y, 0) || 1; let acc = 0;
      subs.forEach((x, i) => { const v = i === subs.length - 1 ? Math.round((100 - acc) * 100) / 100 : Math.round((bs[x.id] || 0) / tot * 10000) / 100; x.bobot = v; acc += v; });
    }
    rps.push({ id: m.id, mk: m.id, prodi: pid, deskripsi: '', pustaka: '', pertemuan: pert, status: 'draf', oleh: '', tgl: '', kerangka: true });
  });

  return { data: { pl, cpl, bk, mk, cpmk, sub }, rps, laporan: lap, konversi,
    ringkas: { pl: pl.length, cpl: cpl.length, bk: bk.length, mk: mk.length, sks: mk.reduce((a, m) => a + m.T + m.P, 0), cpmk: cpmk.length, sub: sub.length, rps: rps.length } };
}
