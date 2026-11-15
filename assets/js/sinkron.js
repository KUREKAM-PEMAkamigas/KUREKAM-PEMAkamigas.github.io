/* KUREKAM · Sinkron otomatis dengan SIMANTAP (tanpa impor/ekspor, tanpa biaya).
   - Tulis: ringkasan 10 indikator kesiapan IABEE per prodi -> koleksi kur_umpan (satu dokumen per prodi).
   - Baca : temuan AMI pada indikator prodi di SIMANTAP (koleksi indikator, hanya dibaca).
   Hanya angka agregat dan keterangan; tidak ada NIP, nama, NIM, atau nilai per mahasiswa. */
import { S } from './app.js';
import { DB } from './db.js';
import { kesiapan, progres, struktur, capstoneCek, lulusanRekap } from './rules.js';

const KUNCI = (no) => 'iabee_' + String(no).padStart(2, '0');
const triwulan = () => { const d = new Date(); return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`; };

/** Satu dokumen umpan per prodi. Bagian "simantap" memakai kunci indikator prodi di SIMANTAP. */
export function susunUmpanProdi(pid) {
  const ind = kesiapan(S, pid), ll = lulusanRekap(S, pid), cs = capstoneCek(S, pid), pr = progres(S, pid), st = struktur(S, pid);
  const simantap = {};
  const rps = pr.tahap.find(t => t.n === 'RPS'); if (rps && st.n) simantap.rps = rps.v;
  if (ind[3].nilai != null) simantap.cpl = +ind[3].nilai.toFixed(1);
  if (cs.d && +cs.d.mitra > 0) simantap.mitra = +cs.d.mitra;
  if (st.n) simantap.basic = +st.matSains;
  return {
    id: pid, unit: pid, sumber: 'KUREKAM', jenis: 'kesiapan_iabee', periode: triwulan(), waktu: new Date().toISOString(),
    indikator: Object.fromEntries(ind.map(i => [KUNCI(i.no), i.no === 6 ? (i.k === 'na' ? null : ll.obe) : i.nilai == null ? null : +i.nilai.toFixed(1)])),
    status: Object.fromEntries(ind.map(i => [KUNCI(i.no), i.k === 'na' ? 'belum_diukur' : i.k === 'ok' ? 'sesuai' : i.k === 'near' ? 'sebagian' : 'jauh'])),
    keterangan: Object.fromEntries(ind.map(i => [KUNCI(i.no), `${i.teks || ''}${i.ket ? ' | ' + i.ket : ''}`])),
    simantap
  };
}

let tunda = null, terakhir = '';
/** Kirim umpan semua prodi bila isinya berubah. Dipanggil otomatis (tertunda 4 detik) setelah data tersimpan. */
export async function kirimUmpan() {
  if (DB.mode !== 'firebase' || !DB.user) return { ok: false, alasan: 'Basis data bersama belum aktif.' };
  try {
    const docs = S.prodi.map(p => susunUmpanProdi(p.id));
    const kunci = JSON.stringify(docs.map(d => [d.id, d.indikator, d.status, d.simantap]));
    if (kunci === terakhir) return { ok: true, tanpaPerubahan: true };
    for (const d of docs) await DB.tulisLuar('kur_umpan', d);
    terakhir = kunci; return { ok: true, n: docs.length };
  } catch (e) { console.warn('Umpan SIMANTAP gagal dikirim:', e.message); return { ok: false, alasan: e.code === 'permission-denied' ? 'Aturan Firestore belum mengizinkan koleksi kur_umpan.' : e.message }; }
}
export function jadwalkanUmpan() { clearTimeout(tunda); tunda = setTimeout(kirimUmpan, 4000); }

/** Temuan AMI dari SIMANTAP untuk unit prodi (hanya KTS Minor/Mayor dan Observasi). */
export async function temuanAmi(pid) {
  const rows = await DB.bacaLuar('indikator');
  return rows.filter(i => i.unit === pid && i.ami && ['KTS Minor', 'KTS Mayor', 'Observasi'].includes(i.ami.temuan))
    .map(i => ({ id: i.id, kode: i.kode, teks: i.teks, temuan: i.ami.temuan, uraian: i.ami.uraian || '', tgl: i.ami.tgl || '' }));
}
