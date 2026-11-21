/* KUREKAM · Realisasi pembelajaran per mata kuliah (portofolio MK): logika murni.
   Koleksi `real`, satu dokumen per mata kuliah per semester (id RL-<mk>-<tahun>-<1|2>).
   Hanya agregat dan tautan bukti; tanpa nama, NIM, atau nilai per mahasiswa. */
import { param } from './rules.js';

export const BUKTI = [['soalUts', 'Soal UTS', true], ['soalUas', 'Soal UAS', true], ['kisi', 'Kisi-kisi soal terhadap CPMK', true], ['rubrik', 'Rubrik penilaian', true], ['sampel', 'Contoh pekerjaan mahasiswa (baik, sedang, kurang)', false], ['bap', 'Daftar hadir atau berita acara perkuliahan', false], ['nilai', 'Rekap nilai anonim', false]];
export const ST_PERT = { belum: 'Belum', sesuai: 'Sesuai RPS', berubah: 'Berubah dari RPS' };
const num = (v) => (v == null || v === '' || Number.isNaN(+v)) ? 0 : +v;

/** Periode semester: kunci "2026-1" (2026/2027 Ganjil) atau "2026-2" (2026/2027 Genap). */
export const periodeNow = (d = new Date()) => { const y = d.getFullYear(), m = d.getMonth() + 1; return m >= 8 ? `${y}-1` : m === 1 ? `${y - 1}-1` : `${y - 1}-2`; };
export const periodeLabel = (k) => { const [y, s] = String(k).split('-'); return `${y}/${+y + 1} ${s === '2' ? 'Genap' : 'Ganjil'}`; };
export const periodeDaftar = (n = 6) => { const out = []; let [y, s] = periodeNow().split('-').map(Number); for (let i = 0; i < n; i++) { out.push(`${y}-${s}`); if (s === 1) { s = 2; y -= 1; } else s = 1; } return out; };
/** Angkatan yang lazimnya menempuh mata kuliah semester `smt` pada periode tertentu. */
export const angkatanLazim = (periode, smt) => { const [y, s] = String(periode).split('-').map(Number); const ke = (+smt || 1); return String(y - Math.floor((ke - (s === 1 ? 1 : 2)) / 2)); };
export const idReal = (mk, periode) => `RL-${mk}-${periode}`;

export const kriteria = (S) => { const P = param(S); return { persen: P.piMinPersen, nilai: P.piMinNilai }; };
export const persen = (r) => r && num(r.n) > 0 ? Math.min(100, num(r.lulus) / num(r.n) * 100) : null;

/** Kelengkapan portofolio satu mata kuliah (enam syarat). */
export function kelengkapan(S, mk, d) {
  const cp = (S.cpmk || []).filter(c => c.mk === mk.id), K = kriteria(S), rps = (S.rps || []).find(r => r.mk === mk.id);
  const nPert = rps && rps.pertemuan ? rps.pertemuan.length : 16;
  const pert = d && d.pert ? d.pert.filter(p => p.st && p.st !== 'belum').length : 0;
  const cpTerisi = d ? cp.filter(c => d.cpmk && num(d.cpmk[c.id] && d.cpmk[c.id].n) > 0).length : 0;
  const wajib = BUKTI.filter(b => b[2]), buktiAda = d ? wajib.filter(b => d.bukti && /^https:\/\//i.test(d.bukti[b[0]] || '')).length : 0;
  const bawah = d ? cp.filter(c => { const p = persen(d.cpmk && d.cpmk[c.id]); return p != null && p < K.persen; }) : [];
  const syarat = [
    { t: 'Realisasi pertemuan tercatat', ok: pert >= Math.min(14, nPert), ket: `${pert} dari ${nPert} pertemuan sudah ditandai (minimal 14).` },
    { t: 'Hasil tiap CPMK terisi', ok: cp.length > 0 && cpTerisi === cp.length, ket: cp.length ? `${cpTerisi} dari ${cp.length} CPMK sudah ada hasilnya.` : 'CPMK mata kuliah ini belum disusun.' },
    { t: 'Hasil akhir mata kuliah terisi', ok: !!d && num(d.akhir && d.akhir.n) > 0, ket: d && num(d.akhir && d.akhir.n) > 0 ? `${d.akhir.lulus}/${d.akhir.n} mahasiswa mencapai batas.` : 'Isi jumlah mahasiswa dan yang mencapai batas.' },
    { t: 'Tautan bukti utama (soal UTS, UAS, kisi-kisi, rubrik)', ok: buktiAda === wajib.length, ket: `${buktiAda} dari ${wajib.length} tautan wajib terisi.` },
    { t: 'Analisis dan rencana perbaikan terisi', ok: !!d && !!String(d.analisis || '').trim() && !!String(d.rencana || '').trim(), ket: 'Analisis ketercapaian dan rencana perbaikan semester berikutnya.' },
    { t: bawah.length ? 'CPMK di bawah kriteria punya catatan tindak lanjut' : 'Tidak ada CPMK di bawah kriteria', ok: !bawah.length || !!(d && d.tl), ket: bawah.length ? `${bawah.length} CPMK di bawah ${K.persen}%: ${bawah.map(c => c.kode).join(', ')}${d && d.tl ? '. Sudah terhubung ke tindak lanjut.' : '. Buat catatan tindak lanjut.'}` : 'Semua CPMK yang terisi memenuhi kriteria.' }
  ];
  const ok = syarat.filter(s => s.ok).length;
  const sesuai = d && d.pert ? d.pert.filter(p => p.st === 'sesuai').length : 0, terisi = pert;
  return { syarat, ok, persen: Math.round(ok / syarat.length * 100), bawah, cp, pertSesuaiPct: terisi ? sesuai / terisi * 100 : null, ada: !!d };
}

/** Baris capaian turunan dari realisasi, dipakai capaianCpl bila prodi belum mengisi rekap manual. */
export function turunanReal(S, pid) {
  const docs = (S.real || []).filter(r => r.prodi === pid && r.angkatan), acc = {};
  const add = (cpl, ang, jenis, n, lulus) => { if (!(n > 0)) return; const k = `${cpl}|${ang}`, a = acc[k] || (acc[k] = { cpl, angkatan: String(ang), langsung: [0, 0], tidak: [0, 0] }); const t = jenis === 'CPMK' ? a.langsung : a.tidak; t[0] += n; t[1] += lulus; };
  for (const r of docs) {
    const mk = (S.mk || []).find(m => m.id === r.mk); if (!mk) continue;
    for (const c of (S.cpmk || []).filter(x => x.mk === r.mk)) { const h = r.cpmk && r.cpmk[c.id]; if (h && num(h.n) > 0) (c.cpl || []).forEach(id => add(id, r.angkatan, 'CPMK', num(h.n), num(h.lulus))); }
    if (r.akhir && num(r.akhir.n) > 0) (mk.cpl || []).forEach(id => add(id, r.angkatan, 'MK', num(r.akhir.n), num(r.akhir.lulus)));
  }
  return Object.values(acc).map(a => {
    const dr = a.langsung[0] > 0, t = dr ? a.langsung : a.tidak;
    return { id: `RL-${pid}-${a.angkatan}-${a.cpl}`, prodi: pid, angkatan: a.angkatan, cpl: a.cpl, n: t[0], lulus: t[1], turunan: dr ? 'CPMK' : 'MK akhir' };
  });
}

/** Ringkasan prodi untuk periode tertentu (atau seluruh periode bila null). */
export function rekapProdi(S, pid, periode) {
  const mks = (S.mk || []).filter(m => m.prodi === pid && !/magang|tugas akhir/i.test(m.kel || ''));
  const docs = (S.real || []).filter(r => r.prodi === pid && (!periode || r.periode === periode));
  const rows = mks.map(m => { const d = docs.find(x => x.mk === m.id) || null; const k = kelengkapan(S, m, d); const t = (S.tugas || []).filter(x => x.mk === m.id).map(x => (S.dosen || []).find(y => y.id === x.dosen)).filter(Boolean); return { m, d, k, dosen: Array.from(new Set(t.map(x => x.nama))).join(', ') }; });
  const isi = rows.filter(r => r.d), lengkap = rows.filter(r => r.k.ok === r.k.syarat.length), inti = rows.filter(r => r.m.inti);
  return { rows, total: rows.length, isi: isi.length, lengkap: lengkap.length, inti: inti.length, intiLengkap: inti.filter(r => r.k.ok === r.k.syarat.length).length, cpmkBawah: rows.reduce((a, r) => a + r.k.bawah.length, 0), cpmkTerukur: rows.reduce((a, r) => a + r.k.cp.filter(c => r.d && num(r.d.cpmk && r.d.cpmk[c.id] && r.d.cpmk[c.id].n) > 0).length, 0), tl: rows.filter(r => r.d && r.d.tl).length };
}

/** Ringkasan untuk umpan ke SIMANTAP (agregat per prodi, periode terbaru yang punya data). */
export function realUmpan(S, pid) {
  const docs = (S.real || []).filter(r => r.prodi === pid); if (!docs.length) return null;
  const per = docs.map(d => d.periode).sort().pop(), R = rekapProdi(S, pid, per);
  const sesuai = R.rows.filter(r => r.k.pertSesuaiPct != null);
  return { periode: per, mk: R.total, isi: R.isi, lengkap: R.lengkap, inti: R.inti, intiLengkap: R.intiLengkap, cpmkTerukur: R.cpmkTerukur, cpmkBawah: R.cpmkBawah, tl: R.tl, sesuaiRps: sesuai.length ? Math.round(sesuai.reduce((a, r) => a + r.k.pertSesuaiPct, 0) / sesuai.length) : null, ilustratif: docs.some(d => d.ilustratif) || undefined };
}
