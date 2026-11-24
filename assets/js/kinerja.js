/* KUREKAM · Grafik kerja dosen dan prodi.
   Yang dinilai hasil kerja di aplikasi, dibandingkan beban mata kuliah yang ditugaskan, bukan banyaknya klik.
   Skor = Hasil x bobot + Tepat waktu x bobot + Mutu x bobot (bobot diatur Wakil Direktur I). Komponen tanpa data tidak dihitung dan bobotnya dibagi ke komponen lain. */
import { jadwalTanggal, hariIni } from './jadwal.js';

export const BOBOT_BAWAAN = { hasil: 50, tepat: 30, mutu: 20 };
export const bobotKinerja = (S) => Object.assign({}, BOBOT_BAWAAN, (S.settings.param || {}).kinerjaBobot || {});

const isi = (p) => !!(p && !p.ujian && String(p.materi || '').trim());
/** Rincian kerja satu mata kuliah. */
export function kerjaMk(S, mkId) {
  const m = S.mk.find(x => x.id === mkId) || { id: mkId, nama: mkId };
  const r = S.rps.find(x => x.mk === mkId);
  const nSub = S.sub.filter(s => s.mk === mkId).length;
  const pert = r ? (r.pertemuan || []).filter(p => !p.ujian) : [];
  const nIsi = pert.filter(isi).length, target = Math.max(14, pert.length || 14);
  const stRps = !r ? 'belum' : (r.status || 'draf');
  const skRps = stRps === 'disahkan' ? 1 : stRps === 'diajukan' ? 0.85 : stRps === 'belum' ? 0 : 0.6 * Math.min(1, nIsi / target);
  const skDok = (st) => st === 'disahkan' ? 1 : st === 'diajukan' ? 0.8 : st === 'disetujui' ? 0.6 : st ? 0.3 : 0;
  const nReal = S.real.filter(x => x.mk === mkId).length;
  const hasil = 0.15 * (nSub ? 1 : 0) + 0.55 * skRps + 0.1 * skDok(r && r.sapStatus) + 0.1 * skDok(r && r.acpStatus) + 0.1 * (nReal ? 1 : 0);
  const verif = (S.jadwal || []).filter(x => x.jenis === 'verif' && x.mk === mkId);
  const mutu = !verif.length ? null : verif.some(v => v.status === 'perbaiki') ? 0.4 : verif.some(v => v.status === 'diperbaiki') ? 0.8 : 1;
  const perbaiki = verif.filter(v => v.status === 'perbaiki').length;
  const langkah = !r ? (nSub ? 'Sub-CPMK siap, RPS belum dibuat' : 'Belum mulai: Sub-CPMK dan RPS belum ada')
    : stRps === 'disahkan' ? 'RPS disahkan' + (r.sapStatus === 'disahkan' ? ', SAP disahkan' : '') + (r.acpStatus === 'disahkan' ? ', ACP disahkan' : '')
    : stRps === 'diajukan' ? 'RPS diajukan, menunggu pengesahan'
    : `RPS draf, ${nIsi} dari ${target} pertemuan terisi`;
  return { m, r, stRps, nSub, nIsi, target, nReal, hasil, mutu, perbaiki, langkah, tglAju: r && r.tgl || '' };
}

/** Kinerja satu dosen. aktif = rangkuman jejak akun dosen itu (boleh kosong). */
export function kinerjaDosen(S, dosenId, aktif) {
  const B = bobotKinerja(S);
  const mkIds = [...new Set(S.tugas.filter(t => t.dosen === dosenId).map(t => t.mk))].filter(id => S.mk.some(m => m.id === id));
  const rinci = mkIds.map(id => kerjaMk(S, id));
  const T = jadwalTanggal(S).find(t => t.id === 't3'), tenggat = T && T.akhir, hari = hariIni();
  const tepatMk = rinci.map(k => {
    if (!tenggat) return null;
    if (k.stRps === 'diajukan' || k.stRps === 'disahkan') return !k.tglAju || k.tglAju <= tenggat ? 1 : 0.5;
    return hari > tenggat ? 0 : null; // belum lewat tenggat: belum dinilai
  });
  const rata = (a) => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const komp = { hasil: rinci.length ? rata(rinci.map(k => k.hasil)) : null, tepat: rata(tepatMk), mutu: rata(rinci.map(k => k.mutu)) };
  let jb = 0, js = 0; Object.keys(komp).forEach(k => { if (komp[k] != null) { jb += +B[k] || 0; js += (+B[k] || 0) * komp[k]; } });
  const skor = jb ? Math.round(js / jb * 100) : null;
  const pct = (v) => v == null ? null : Math.round(v * 100);
  const selesai = rinci.filter(k => k.stRps === 'disahkan').length;
  const status = !rinci.length ? 'Tanpa tugas' : komp.hasil >= 0.9 ? 'Selesai' : komp.hasil >= 0.3 ? 'Berjalan' : komp.hasil > 0 ? 'Mulai' : 'Belum mulai';
  return { id: dosenId, nMk: rinci.length, selesai, rinci, hasil: pct(komp.hasil), tepat: pct(komp.tepat), mutu: pct(komp.mutu), skor, status,
    hariAktif: aktif ? aktif.hari.size : 0, simpan: aktif ? aktif.simpan : 0, terakhir: aktif ? aktif.terakhir : '', tenggat };
}

/** Kinerja semua dosen. per = Map email -> rangkuman jejak, akun = daftar pengguna (untuk menautkan dosen ke email). */
export function kinerjaSemua(S, per) {
  const emailDosen = new Map(); (S.pengguna || []).forEach(u => { if (u.dosen) emailDosen.set(u.dosen, (u.email || '').toLowerCase()); });
  return S.dosen.map(d => {
    const em = emailDosen.get(d.id), a = em && per ? per.get(em) : null;
    return { d, email: em || '', prodi: d.homebase || '', ...kinerjaDosen(S, d.id, a) };
  }).filter(x => x.nMk || x.email);
}

/** Rangkuman per prodi dari kinerja dosen (dosen dihitung pada homebase-nya). */
export function kinerjaProdi(S, semua) {
  return S.prodi.map(p => {
    const ds = semua.filter(x => x.prodi === p.id && x.nMk);
    const ada = ds.filter(x => x.skor != null);
    const mk = S.mk.filter(m => m.prodi === p.id && !/magang|tugas akhir/i.test(m.kel || ''));
    const rpsSah = mk.filter(m => S.rps.some(r => r.mk === m.id && r.status === 'disahkan')).length;
    const rpsAju = mk.filter(m => S.rps.some(r => r.mk === m.id && r.status === 'diajukan')).length;
    return { p, nDosen: ds.length, skor: ada.length ? Math.round(ada.reduce((s, x) => s + x.skor, 0) / ada.length) : null,
      selesai: ds.filter(x => x.status === 'Selesai').length, berjalan: ds.filter(x => x.status === 'Berjalan' || x.status === 'Mulai').length, belum: ds.filter(x => x.status === 'Belum mulai').length,
      nMk: mk.length, rpsSah, rpsAju, hariAktif: ds.reduce((s, x) => s + x.hariAktif, 0) };
  });
}
