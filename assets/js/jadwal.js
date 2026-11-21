/* KUREKAM · Jadwal tahapan evaluasi kurikulum dan pemantauan progres.
   Wakil Direktur I menetapkan tanggal mulai; tanggal tiap tahap dihitung dari hari ke-n sejak tanggal mulai (dapat diatur).
   Progres dihitung otomatis dari isi aplikasi, kecuali tahap verifikasi yang ditandai pemiliknya (koleksi `jadwal`).
   Fungsi di sini murni (menerima S) agar dapat diuji dan dipakai pengingat. */
import { cekStruktur, rpsOf, rpsLengkap, byProdi } from './rules.js';

export const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const PELAKSANA = { prodi: 'Prodi', dosen: 'Dosen', spm: 'SPM', akademik: 'Kasubbag Akademik', wadir: 'Wakil Direktur I', semua: 'Semua' };

/** Tahap bawaan. offset = hari ke-n sejak tanggal mulai (0 = hari mulai), durasi dalam hari. mode: auto dihitung dari data, tanda ditandai pemiliknya. */
export const TAHAP_BAWAAN = [
  { id: 't1', nama: 'Verifikasi CPL dan peta CPL ke mata kuliah', peran: 'prodi', offset: 0, durasi: 4, mode: 'auto', ket: 'Setiap mata kuliah sudah terpetakan ke CPL.' },
  { id: 't2', nama: 'Rapikan struktur mata kuliah', peran: 'prodi', offset: 0, durasi: 8, mode: 'auto', ket: 'Struktur, SKS, kode, dan aturan pedoman tanpa pelanggaran.' },
  { id: 't3', nama: 'Dosen mengisi RPS', peran: 'dosen', offset: 3, durasi: 9, mode: 'auto', ket: 'Tiap dosen mengisi RPS sesuai target minimal.' },
  { id: 't4', nama: 'Verifikasi SPM per prodi', peran: 'spm', offset: 8, durasi: 3, mode: 'tanda', ket: 'SPM menandai prodi yang sudah diverifikasi.' },
  { id: 't5', nama: 'Cek beban dosen dan kelas', peran: 'akademik', offset: 8, durasi: 3, mode: 'tanda', ket: 'Kasubbag Akademik menandai prodi yang sudah dicek.' },
  { id: 't6', nama: 'Finalisasi bahan paparan', peran: 'wadir', offset: 11, durasi: 2, mode: 'tanda', global: true, ket: 'Wakil Direktur I menyiapkan bahan rapat.' },
  { id: 't7', nama: 'Rapat evaluasi kurikulum', peran: 'semua', offset: 13, durasi: 1, mode: 'tonggak', ket: 'Prodi dan dosen menampilkan hasil.' }
];
export const JADWAL_BAWAAN = { mulai: '', rpsMin: 2, rpsLengkap: 80 };

/** Pengaturan jadwal yang berlaku: bawaan digabung dengan S.settings.jadwal. */
export function jadwalOf(S) {
  const j = (S.settings && S.settings.jadwal) || {};
  const sim = new Map((j.tahap || []).map(t => [t.id, t]));
  return {
    mulai: j.mulai || '', rpsMin: +j.rpsMin || JADWAL_BAWAAN.rpsMin, rpsLengkap: +j.rpsLengkap || JADWAL_BAWAAN.rpsLengkap,
    tahap: TAHAP_BAWAAN.map(t => { const x = sim.get(t.id) || {}; return { ...t, offset: x.offset != null ? +x.offset : t.offset, durasi: x.durasi != null ? +x.durasi : t.durasi }; })
  };
}

/* ---------- tanggal (ISO yyyy-mm-dd, waktu lokal) ---------- */
const dari = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d, 12); };
const keIso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
export const hariIni = () => keIso(new Date());
export const tambahHari = (iso, n) => { const d = dari(iso); d.setDate(d.getDate() + n); return keIso(d); };
export const selisihHari = (a, b) => Math.round((dari(b) - dari(a)) / 864e5);
export const fmtTgl = (iso, tahun = false) => { if (!iso) return '–'; const d = dari(iso); return `${d.getDate()} ${BULAN[d.getMonth()]}${tahun ? ' ' + d.getFullYear() : ''}`; };

/** Tanggal mulai dan tenggat tiap tahap (kosong bila tanggal mulai belum ditetapkan). Tenggat = hari terakhir tahap. */
export function jadwalTanggal(S) {
  const J = jadwalOf(S);
  return J.tahap.map(t => ({ ...t, awal: J.mulai ? tambahHari(J.mulai, t.offset) : '', akhir: J.mulai ? tambahHari(J.mulai, t.offset + Math.max(1, t.durasi) - 1) : '' }));
}

/* ---------- progres ---------- */
const tandaDi = (S, tahap, pid) => (S.jadwal || []).find(x => x.tahap === tahap && x.prodi === pid);
export const idTanda = (tahap, pid) => `${tahap}|${pid}`;

/** Dosen bertugas di satu prodi, dengan jumlah RPS terisi dan target. pid kosong berarti semua prodi. */
export function dosenRps(S, pid) {
  const J = jadwalOf(S), per = new Map();
  S.tugas.forEach(t => {
    const m = S.mk.find(x => x.id === t.mk); if (!m || (pid && m.prodi !== pid)) return;
    if (/magang|tugas akhir/i.test(m.kel)) return;
    const e = per.get(t.dosen) || { dosen: t.dosen, mk: new Set() }; e.mk.add(m.id); per.set(t.dosen, e);
  });
  return Array.from(per.values()).map(e => {
    const ds = S.dosen.find(d => d.id === e.dosen) || {};
    const terisi = Array.from(e.mk).filter(id => rpsLengkap(rpsOf(S, id)) >= J.rpsLengkap).length;
    const target = Math.min(J.rpsMin, e.mk.size);
    return { id: e.dosen, nama: ds.nama || e.dosen, nMk: e.mk.size, terisi, target, ok: terisi >= target };
  }).sort((a, b) => a.ok - b.ok || a.nama.localeCompare(b.nama));
}

/** Progres satu tahap untuk satu prodi: { done, pct, teks, rinci }. */
export function progresTahap(S, tahapId, pid) {
  if (tahapId === 't1') {
    const mk = byProdi(S.mk, pid).filter(m => !/magang|tugas akhir/i.test(m.kel));
    const ok = mk.filter(m => (m.cpl || []).length).length, n = S.cpl.filter(c => c.prodi === pid).length;
    const pct = mk.length ? ok / mk.length * 100 : 0;
    return { done: !!mk.length && ok === mk.length && n > 0, pct, teks: n ? `${ok} dari ${mk.length} MK terpetakan ke CPL` : 'CPL prodi belum ada' };
  }
  if (tahapId === 't2') {
    const bad = cekStruktur(S, pid).filter(x => x.k === 'bad').length, near = cekStruktur(S, pid).filter(x => x.k === 'near').length;
    return { done: bad === 0, pct: null, teks: bad ? `${bad} butir belum sesuai${near ? `, ${near} perlu perhatian` : ''}` : 'Semua butir pedoman sesuai', bad };
  }
  if (tahapId === 't3') {
    const dr = dosenRps(S, pid), ok = dr.filter(d => d.ok).length;
    return { done: !!dr.length && ok === dr.length, pct: dr.length ? ok / dr.length * 100 : 0, teks: dr.length ? `${ok} dari ${dr.length} dosen memenuhi target` : 'Belum ada penugasan dosen', rinci: dr };
  }
  const td = tandaDi(S, tahapId, tahapId === 't6' ? '*' : pid);
  return { done: !!td, pct: null, teks: td ? `Selesai ${fmtTgl(td.tgl)}${td.oleh ? ' · ' + td.oleh : ''}` : 'Belum ditandai', tanda: td };
}

/** Status tampilan: belum (tanggal mulai belum ada), akan, berjalan, tertinggal, terlambat, selesai. k: kelas warna (ok, near, bad, na). */
export function statusTahap(t, prog, hari = hariIni()) {
  if (prog && prog.done) return { s: 'selesai', k: 'ok', t: 'Selesai' };
  if (!t.awal) return { s: 'belum', k: 'na', t: 'Belum dijadwalkan' };
  if (hari < t.awal) return { s: 'akan', k: 'na', t: `Mulai ${fmtTgl(t.awal)}` };
  if (hari > t.akhir) return { s: 'terlambat', k: 'bad', t: `Terlambat ${selisihHari(t.akhir, hari)} hari` };
  const total = Math.max(1, selisihHari(t.awal, t.akhir) + 1), lewat = selisihHari(t.awal, hari) + 1, harap = lewat / total * 100;
  const tertinggal = prog && prog.pct != null ? prog.pct < harap - 25 : lewat / total > 0.75;
  const sisa = selisihHari(hari, t.akhir);
  return tertinggal ? { s: 'tertinggal', k: 'near', t: `Tertinggal, sisa ${sisa} hari` } : { s: 'berjalan', k: 'ok', t: `Berjalan, sisa ${sisa} hari` };
}

/** Papan: untuk tiap prodi, status tiap tahap. */
export function papan(S, hari = hariIni()) {
  const T = jadwalTanggal(S);
  return S.prodi.map(p => ({ prodi: p, sel: T.map(t => { if (t.global || t.mode === 'tonggak') return null; const pr = progresTahap(S, t.id, p.id); return { t, pr, st: statusTahap(t, pr, hari) }; }) }));
}

/** Pengingat untuk peran yang sedang masuk. Mengembalikan daftar { k: 'info'|'near'|'bad', teks, rute }. */
export function pengingat(S, ctx, hari = hariIni()) {
  const T = jadwalTanggal(S), out = [];
  if (!T[0].awal) return out;
  const aktif = (t) => hari >= t.awal && hari <= t.akhir, telat = (t) => hari > t.akhir;
  const sisa = (t) => selisihHari(hari, t.akhir);
  const pakai = (t, pr, teks, rute) => { if (pr.done) return; if (hari < t.awal) return; out.push({ k: telat(t) ? 'bad' : (aktif(t) && sisa(t) <= 2 ? 'near' : 'info'), teks: `${teks} Tenggat ${fmtTgl(t.akhir)}${telat(t) ? ` (terlambat ${selisihHari(t.akhir, hari)} hari)` : ` (sisa ${sisa(t)} hari)`}.`, rute }); };
  const tt = (id) => T.find(x => x.id === id);
  const role = ctx.role;
  if (role === 'dosen' && ctx.dosen) {
    const sa = dosenRps(S, '').find(d => d.id === ctx.dosen); if (sa) pakai(tt('t3'), { done: sa.ok }, `Anda baru mengisi ${sa.terisi} dari ${sa.target} RPS yang ditargetkan.`, 'rps');
  }
  if (role === 'prodi' && ctx.prodi) {
    ['t1', 't2', 't3'].forEach(id => { const pr = progresTahap(S, id, ctx.prodi), t = tt(id); const rute = id === 't3' ? 'jadwal' : id === 't1' ? 'matriks' : 'periksa'; pakai(t, pr, `${t.nama}: ${pr.teks}.`, rute); });
  }
  if (role === 'spm') { const belum = S.prodi.filter(p => !progresTahap(S, 't4', p.id).done); if (belum.length) pakai(tt('t4'), { done: false }, `${belum.length} prodi belum diverifikasi (${belum.map(p => p.id).join(', ')}).`, 'jadwal'); }
  if (role === 'akademik') { const belum = S.prodi.filter(p => !progresTahap(S, 't5', p.id).done); if (belum.length) pakai(tt('t5'), { done: false }, `${belum.length} prodi belum dicek beban dan kelasnya (${belum.map(p => p.id).join(', ')}).`, 'jadwal'); }
  if (role === 'wadir' || role === 'admin' || role === 'developer') {
    const merah = papan(S, hari).reduce((a, r) => a + r.sel.filter(x => x && x.st.s === 'terlambat').length, 0);
    if (merah) out.push({ k: 'bad', teks: `${merah} tahap prodi sudah melewati tenggat. Lihat papan pemantauan.`, rute: 'jadwal' });
    else { const rapat = tt('t7'); if (hari < rapat.awal && selisihHari(hari, rapat.awal) <= 7) out.push({ k: 'info', teks: `Rapat evaluasi kurikulum ${fmtTgl(rapat.awal)} (${selisihHari(hari, rapat.awal)} hari lagi).`, rute: 'jadwal' }); }
  }
  return out;
}
