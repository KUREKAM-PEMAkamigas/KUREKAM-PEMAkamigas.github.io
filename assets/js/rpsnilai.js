/* KUREKAM · RPS sebagai sumber pemetaan penilaian: komponen penilaian dibaca dari pertemuan berbobot di RPS,
   dipakai sebagai pemetaan bawaan kolom nilai ke CPMK, dan sebagai kepala kolom templat nilai.
   Tidak memuat data mahasiswa sama sekali. */
import { loadXLSX, unduh } from './views/ui.js';

const bersih = (t) => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9]/g, '');
const pertama = (t) => String(t || '').split(/[;\n,]/)[0].trim().slice(0, 32);

/** Komponen penilaian dari RPS: [{nama, bobot, bagi:[{cpmk,persen}], cpmk}] (CPMK satu bila tunggal). */
export function komponenRps(S, mkId) {
  const r = S.rps.find(x => x.mk === mkId); if (!r || !r.pertemuan) return [];
  const sub = (id) => S.sub.find(s => s.id === id);
  const idx = {}, out = [];
  r.pertemuan.filter(p => +p.bobot > 0).forEach(p => {
    const nama = p.ujian || pertama(p.asesmen) || `Penilaian P${p.m}`;
    /* penilaian bernama sama (mis. Kuis, Tugas) digabung menjadi satu kolom: bobot dijumlah, CPMK dibobot */
    let c = idx[nama]; if (!c) { c = idx[nama] = { nama, m: p.m, bobot: 0, w: {} }; out.push(c); }
    c.bobot = Math.round((c.bobot + +p.bobot) * 100) / 100;
    const subs = (p.sub || []).map(sub).filter(s => s && s.cpmk), tot = subs.reduce((a, s) => a + (+s.bobot || 1), 0) || 1;
    subs.forEach(s => { c.w[s.cpmk] = (c.w[s.cpmk] || 0) + (+p.bobot) * (+s.bobot || 1) / tot; });
  });
  out.forEach(c => {
    const ks = Object.keys(c.w), tot = Object.values(c.w).reduce((a, b) => a + b, 0);
    c.bagi = ks.length > 1 ? ks.map(k => ({ cpmk: k, persen: Math.round(c.w[k] / tot * 1000) / 10 })) : [];
    if (c.bagi.length) { const d = Math.round((100 - c.bagi.reduce((a, b) => a + b.persen, 0)) * 10) / 10; c.bagi[0].persen = Math.round((c.bagi[0].persen + d) * 10) / 10; }
    c.cpmk = ks.length === 1 ? ks[0] : ''; delete c.w;
  });
  return out;
}

/** Cocokkan kolom nilai dengan komponen RPS menurut nama (UTS, UAS, Tugas 1, dan sebagainya). Mengembalikan komponen atau null. */
export function cocokKomponen(namaKolom, komponen) {
  const k = bersih(namaKolom); if (k.length < 3) return null;
  return komponen.find(c => bersih(c.nama) === k) || komponen.find(c => { const n = bersih(c.nama).replace(/p\d+$/, ''); return n.length >= 3 && (k.includes(n) || n.includes(k)); }) || null;
}

/** Pemetaan bawaan dari RPS untuk kolom yang dikenali: {namaKolom: {cpmk, bobot, bagi?}}; kolom lain tidak ikut. */
export function petaDariRps(S, mkId, kolom) {
  const komp = komponenRps(S, mkId), hasil = {}, dipakai = new Set();
  kolom.forEach(k => {
    const c = cocokKomponen(k.nama, komp.filter(x => !dipakai.has(x.nama))); if (!c || !(c.cpmk || c.bagi.length)) return;
    dipakai.add(c.nama);
    hasil[k.nama] = c.bagi.length ? { cpmk: c.bagi[0].cpmk, bobot: c.bobot, bagi: c.bagi.map(b => ({ ...b })) } : { cpmk: c.cpmk, bobot: c.bobot };
  });
  return hasil;
}

/** Templat nilai dari RPS: kolom NIM, Nama, Kelas lalu satu kolom per komponen penilaian RPS. Lembar PEMETAAN menjelaskan komponen dan CPMK-nya. */
export async function templatNilaiRps(S, mk) {
  const komp = komponenRps(S, mk.id); if (!komp.length) throw new Error('RPS belum memiliki pertemuan berbobot.');
  const cpmk = (id) => { const c = S.cpmk.find(x => x.id === id); return c ? c.kode : id; };
  const X = await loadXLSX(), wb = X.utils.book_new();
  const kepala = ['NIM', 'Nama', 'Kelas', ...komp.map(c => c.nama)];
  const ws = X.utils.aoa_to_sheet([kepala]); ws['!cols'] = [14, 30, 8, ...komp.map(() => 14)].map(w => ({ wch: w })); ws['!freeze'] = { xSplit: 3, ySplit: 1 };
  X.utils.book_append_sheet(wb, ws, 'NILAI');
  const pm = [['Kolom nilai', 'Bobot RPS (%)', 'CPMK yang diukur'], ...komp.map(c => [c.nama, c.bobot, c.bagi.length ? c.bagi.map(b => `${cpmk(b.cpmk)} ${b.persen}%`).join('; ') : cpmk(c.cpmk)])];
  const wp = X.utils.aoa_to_sheet([...pm, [], ['Isi nilai (0 sampai 100) per mahasiswa pada lembar NILAI. Jangan ubah nama kolom agar pemetaan ke CPMK terbawa otomatis saat dibaca di menu Capaian CPL.']]);
  wp['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 60 }]; X.utils.book_append_sheet(wb, wp, 'PEMETAAN');
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Templat_Nilai_${mk.kode || mk.id}.xlsx`);
}
