/* KUREKAM · Validasi usulan otomatis.
   Isian buatan Asisten berstatus usulan (usul: true). Selama masih ada usulan yang belum dibaca dan disetujui,
   RPS tidak dapat diajukan atau disahkan dan kurikulum prodi tidak dapat diajukan. */
import { S, save, saveMany, remove, addLog } from './app.js';

export const JENIS = [['pl', 'Profil lulusan'], ['cpl', 'CPL'], ['bok', 'BoK'], ['bk', 'Bahan kajian'], ['mk', 'Mata kuliah'], ['cpmk', 'CPMK'], ['sub', 'Sub-CPMK']];
const uraian = (k, o) => ['pl', 'bok', 'bk', 'mk'].includes(k) ? (o.nama || '') : String(o.teks || '').slice(0, 110);

export function usulanProdi(pid) {
  const out = [];
  JENIS.forEach(([k, j]) => (S[k] || []).filter(o => o.prodi === pid && o.usul).forEach(o => out.push({ k, j, o, kode: o.kode || '', n: uraian(k, o) })));
  return out;
}
export function usulanMk(mkId) {
  const out = [];
  (S.cpmk || []).filter(o => o.mk === mkId && o.usul).forEach(o => out.push({ k: 'cpmk', j: 'CPMK', o }));
  (S.sub || []).filter(o => o.mk === mkId && o.usul).forEach(o => out.push({ k: 'sub', j: 'Sub-CPMK', o }));
  const m = (S.mk || []).find(x => x.id === mkId); if (m && m.usul) out.push({ k: 'mk', j: 'Mata kuliah', o: m });
  return out;
}
/** Alasan RPS belum boleh diajukan atau disahkan, atau '' bila sudah bersih. */
export function alasanRps(m, r) {
  const u = usulanMk(m.id), a = [];
  if (r && r.usulTinjau) a.push('isi RPS dari Asisten belum disetujui dosen');
  if (u.length) a.push(`${u.length} usulan CPMK, Sub-CPMK, atau MK belum disetujui prodi`);
  return a.join('; ');
}
export const bolehSetuju = (it) => !(it.k === 'mk' && /\[[^\]]{3,}\]/.test(it.o.nama || ''));
export async function setujui(items) {
  const per = {}; items.forEach(it => { it.o.usul = false; (per[it.k] = per[it.k] || []).push(it.o); });
  for (const k of Object.keys(per)) await saveMany(k, per[k]);
  await addLog(`Setujui ${items.length} usulan otomatis`);
}
/** Hapus slot MK usulan yang belum dipakai (tanpa CPMK, penugasan, atau RPS). Mengembalikan jumlah yang dihapus. */
export async function hapusSlotKosong(pid) {
  const mk = (S.mk || []).filter(m => m.prodi === pid && m.usul && /\[[^\]]{3,}\]/.test(m.nama || '')
    && !(S.cpmk || []).some(c => c.mk === m.id) && !(S.tugas || []).some(t => t.mk === m.id) && !(S.rps || []).some(r => r.mk === m.id));
  for (const m of mk) await remove('mk', m.id);
  if (mk.length) await addLog(`Hapus ${mk.length} slot MK usulan ${pid}`);
  return mk.length;
}
