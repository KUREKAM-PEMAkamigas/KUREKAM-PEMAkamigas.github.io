/* KUREKAM · Tracer study dan survei pengguna dalam format LAM Teknik 2025 (butir 53 sampai 56).
   Hanya jumlah per kategori; tidak ada data individu. Rumus mengikuti lembar hitung instrumen LAM Teknik 2025 (STr). */

export const ASPEK = [['etika', 'Etika'], ['keahlian', 'Keahlian'], ['bahasa', 'Bahasa'], ['ti', 'Teknologi Informasi'], ['komunikasi', 'Komunikasi'], ['kerjasama', 'Kerjasama'], ['diri', 'Pengembangan Diri']];
export const NILAI = [['sb', 'Sangat baik'], ['b', 'Baik'], ['c', 'Cukup'], ['k', 'Kurang']];
export const KAT = {
  wt: [['a', 'Kurang dari 3 bulan'], ['b', '3 sampai 6 bulan'], ['c', 'Lebih dari 6 bulan']],
  ks: [['r', 'Rendah'], ['s', 'Sedang'], ['t', 'Tinggi']],
  tk: [['i', 'Multinasional atau internasional'], ['n', 'Nasional'], ['w', 'Wilayah, lokal, atau wirausaha']]
};

const num = (v) => (v == null || v === '' || Number.isNaN(+v)) ? 0 : +v;
const jum = (o, ks) => ks.reduce((a, k) => a + num(o && o[k]), 0);
const adaData = (o, ks) => !!o && jum(o, ks) > 0;

/** Pasangan tahun lulus TS-2 dan TS-1 dari daftar baris lulusan prodi; th = tahun TS-1 (angka atau teks). */
export function pasangan(rows, th) {
  const by = (y) => rows.find(r => String(r.tahun) === String(y)) || null;
  return { ts1: by(th), ts2: by(+th - 1), th: String(th) };
}

/** Tahun TS-1 bawaan: tahun terbaru yang punya data tracer. */
export function tahunBawaan(rows) {
  const ada = rows.filter(r => num(r.tracer) > 0).map(r => +r.tahun).sort((a, b) => b - a);
  return ada.length ? String(ada[0]) : (rows.length ? String(Math.max(...rows.map(r => +r.tahun))) : '');
}

const cocok = (r, f, ks) => !r || num(r.tracer) === 0 || jum(r[f], ks) === num(r.tracer);

/** Hitung indikator butir 53 sampai 56 untuk pasangan TS-2 dan TS-1. nilai null = belum bisa dihitung. */
export function hitung(ts2, ts1) {
  const rs = [ts2, ts1].filter(Boolean);
  const NL = rs.reduce((a, r) => a + num(r.jumlah), 0), NJ = rs.reduce((a, r) => a + num(r.tracer), 0), NP = rs.reduce((a, r) => a + num(r.pengguna), 0);
  const PJ = NL ? NJ / NL : 0, PP = NL ? NP / NL : 0, Prmin = NL >= 300 ? 0.3 : 0.5 - NL / 300 * 0.2;
  const k = (f, ks) => ks.reduce((a, x) => (a[x] = rs.reduce((s, r) => s + num(r[f] && r[f][x]), 0), a), {});
  const wt = k('wt', ['a', 'b', 'c']), ks = k('ks', ['r', 's', 't']), tk = k('tk', ['i', 'n', 'w']);
  const out = { NL, NJ, NP, PJ, PP, Prmin, wt, ks, tk, rows: rs.length };

  /* 53 waktu tunggu: rata-rata dengan titik tengah 1,5; 4,5; 9 bulan */
  const sw = wt.a + wt.b + wt.c;
  out.b53 = (() => {
    if (!sw) return { nilai: null, ket: 'Belum ada sebaran waktu tunggu.' };
    const WT = (wt.a * 1.5 + wt.b * 4.5 + wt.c * 9) / sw;
    if (PJ < 0.3) return { nilai: 0, WT, ket: 'Lulusan terlacak kurang dari 30%, skor 0.' };
    if (!cocok(ts2, 'wt', ['a', 'b', 'c']) || !cocok(ts1, 'wt', ['a', 'b', 'c'])) return { nilai: 0, WT, ket: 'Jumlah kategori belum sama dengan jumlah terlacak, skor 0 di lembar LAM.' };
    return { nilai: WT <= 3 ? 4 : WT <= 18 ? (23 - WT) / 5 : 0, WT, ket: `Rata-rata waktu tunggu ${WT.toFixed(1)} bulan.` };
  })();

  /* 54 kesesuaian bidang kerja: bobot rendah 0,3, sedang 0,5, tinggi 1; batas 0,6 */
  const sk = ks.r + ks.s + ks.t;
  out.b54 = (() => {
    if (!sk) return { nilai: null, ket: 'Belum ada sebaran kesesuaian bidang kerja.' };
    const KBK = (ks.r * 0.3 + ks.s * 0.5 + ks.t) / sk;
    if (PJ < 0.3) return { nilai: 0, KBK, ket: 'Lulusan terlacak kurang dari 30%, skor 0.' };
    return { nilai: KBK >= 0.6 ? 4 : 20 * KBK / 3, KBK, ket: `Indeks kesesuaian ${KBK.toFixed(2)} (batas 0,60 untuk skor 4).` };
  })();

  /* 55 tingkat tempat kerja: proporsi terhadap jumlah lulusan (NL), rumus gabungan LAM */
  const st = tk.i + tk.n + tk.w;
  out.b55 = (() => {
    if (!st) return { nilai: null, ket: 'Belum ada sebaran tingkat tempat kerja.' };
    const RI = NL ? tk.i / NL : 0, RN = NL ? tk.n / NL : 0, RW = NL ? tk.w / NL : 0;
    const base = { RI, RN, RW };
    if (PJ < 0.3) return { nilai: 0, ...base, ket: 'Lulusan terlacak kurang dari 30%, skor 0.' };
    const d672 = RI >= 0.05 && RN < 0.2 ? 0.05 : RI, d673 = RI < 0.05 && RN >= 0.2 ? 0.2 : RN, d668 = RW >= 0.9 ? 0.9 : RW;
    const a = d672 / 0.05, b = d673 / 0.2, c = d668 / 0.9;
    const yes = d672 > 0.05 && d673 > 0.2, ada = (d672 > 0 && d672 <= 0.05) || (d673 > 0 && d673 <= 0.2) || (d668 > 0 && d668 <= 0.9);
    const nilai = yes ? 4 : ada ? 3.75 * ((a + b + c / 2) - a * b - a * c / 2 - b * c / 2 + a * b * c / 2) : 0;
    return { nilai, ...base, ket: `Multinasional ${(RI * 100).toFixed(1)}%, nasional ${(RN * 100).toFixed(1)}%, wilayah ${(RW * 100).toFixed(1)}% dari seluruh lulusan.` };
  })();

  /* 56 kepuasan pengguna: tujuh aspek, skor 4*SB + 3*B + 2*C + 1*K */
  const aspek = ASPEK.map(([id, nm]) => {
    const c = NILAI.reduce((o, [v]) => (o[v] = rs.reduce((s, r) => s + num(r.kp && r.kp[id] && r.kp[id][v]), 0), o), {}), t = c.sb + c.b + c.c + c.k;
    return { id, nm, n: t, c, skor: t ? (4 * c.sb + 3 * c.b + 2 * c.c + c.k) / t : null };
  });
  out.aspek = aspek;
  out.b56 = (() => {
    const ada = aspek.filter(x => x.skor != null);
    if (!ada.length) return { nilai: null, ket: 'Belum ada tanggapan kepuasan pengguna.' };
    const rata = aspek.reduce((a, x) => a + (x.skor || 0), 0) / aspek.length;
    if (PP < 0.3) return { nilai: 0, rata, ket: 'Pengguna yang menanggapi kurang dari 30% jumlah lulusan, skor 0.' };
    return { nilai: ada.length < aspek.length ? null : rata, rata, ket: ada.length < aspek.length ? `Baru ${ada.length} dari 7 aspek terisi.` : `Rata-rata tujuh aspek ${rata.toFixed(2)} dari 4.` };
  })();
  return out;
}

/** Pemeriksaan satu baris: kategori tidak boleh melebihi responden. */
export function cekBaris(o) {
  const t = num(o.tracer), p = num(o.pengguna);
  for (const f of ['wt', 'ks', 'tk']) { const s = jum(o[f], KAT[f].map(x => x[0])); if (s > t) return `Jumlah kategori ${f === 'wt' ? 'waktu tunggu' : f === 'ks' ? 'kesesuaian bidang kerja' : 'tingkat tempat kerja'} (${s}) melebihi responden tracer (${t}).`; }
  for (const [id, nm] of ASPEK) { const s = jum(o.kp && o.kp[id], NILAI.map(x => x[0])); if (s > p) return `Tanggapan aspek ${nm} (${s}) melebihi responden pengguna (${p}).`; }
  return '';
}

/** Ringkasan kecil untuk umpan ke SIMANTAP. */
export function ringkasUmpan(rows) {
  const ada = rows.filter(r => num(r.tracer) > 0 || num(r.pengguna) > 0);
  if (!ada.length) return null;
  const th = tahunBawaan(ada), p = pasangan(ada, th), h = hitung(p.ts2, p.ts1);
  const r = (v) => v == null ? null : +(+v).toFixed(3);
  return {
    ts1: th, ts2: String(+th - 1),
    tahun: Object.fromEntries([p.ts2, p.ts1].filter(Boolean).map(r => [String(r.tahun), { NL: num(r.jumlah), NJ: num(r.tracer), NP: num(r.pengguna), wt: r.wt || null, ks: r.ks || null, tk: r.tk || null }])),
    kpc: Object.fromEntries(h.aspek.map(a => [a.id, a.c])),
    NL: h.NL, NJ: h.NJ, NP: h.NP, PJ: r(h.PJ), PP: r(h.PP),
    wt: h.wt, ks: h.ks, tk: h.tk, WT: r(h.b53.WT), KBK: r(h.b54.KBK),
    kp: Object.fromEntries(h.aspek.map(a => [a.id, r(a.skor)])),
    skor: { 53: r(h.b53.nilai), 54: r(h.b54.nilai), 55: r(h.b55.nilai), 56: r(h.b56.nilai) },
    ilustratif: ada.some(x => x.ilustratif) || undefined
  };
}
