/* KUREKAM · Daftar penelitian dan PKM dosen, dipilih dari daftar di RPS, dengan pemeriksaan kecocokan berbasis kata kunci.
   Tanpa AI dan tanpa biaya: kata kunci diambil dari judul, lalu dicocokkan dengan materi pertemuan, Sub-CPMK, dan bahan kajian MK.
   Fungsi di sini murni (menerima S) agar dapat dipakai tampilan RPS, Asisten RPS, dan dokumen Word. */

export const JENIS = ['Penelitian', 'PKM'];
export const BENTUK = ['Bahan ajar', 'Studi kasus', 'Data praktikum', 'Proyek mahasiswa', 'Keterlibatan mahasiswa di PKM'];
const STOP = new Set(('yang dan atau dari dengan untuk pada dalam oleh serta pada antara terhadap sebagai adalah akan dapat ini itu juga bagi para suatu secara tentang melalui sehingga agar bila saat lebih sangat telah belum tidak bukan ' +
  'penelitian pengabdian masyarakat pengembangan pelatihan pendampingan penerapan implementasi analisis studi kajian rancang bangun berbasis menggunakan upaya model sistem teknik metode kasus hasil mata kuliah program kegiatan uji coba peningkatan optimalisasi ' +
  'politeknik prodi dosen mahasiswa mitra tahun skema pertemuan materi pokok bahasan konsep prinsip dasar topik').split(/\s+/));

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
export const kunciJudul = (judul) => String(judul || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Kata bermakna dari teks: huruf kecil, minimal 4 huruf, bukan kata umum. */
export function tokenisasi(teks) {
  const out = [];
  String(teks || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).forEach(w => { if (w.length >= 4 && !STOP.has(w) && !out.includes(w)) out.push(w); });
  return out;
}
/** Dua kata dianggap sama bila persis atau berawalan sama sepanjang 5 huruf (menyerap imbuhan sederhana). */
const sama = (a, b) => a === b || (a.length >= 6 && b.length >= 6 && a.slice(0, 5) === b.slice(0, 5));

/** Kata kunci otomatis dari judul (maksimal 6 kata). */
export const kataKunciDari = (judul) => tokenisasi(judul).slice(0, 6).join(', ');

/** Merapikan isian entri: spasi, huruf kapital semua, jenis, tahun, dan kata kunci kosong. */
export function rapikanEntri(e) {
  let judul = String(e.judul || '').replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
  if (judul.length > 15 && judul === judul.toUpperCase()) judul = judul.toLowerCase().replace(/(^|\s)([a-z]+)/g, (_, a, w) => a + (/^(dan|atau|pada|di|ke|dari|dengan|untuk|yang|dalam|oleh|serta|terhadap)$/.test(w) && a ? w : w.charAt(0).toUpperCase() + w.slice(1)));
  else if (judul) judul = judul.charAt(0).toUpperCase() + judul.slice(1);
  const jenis = /pkm|pengabdian|masyarakat/i.test(String(e.jenis || '')) ? 'PKM' : 'Penelitian';
  const th = String(e.tahun == null ? '' : e.tahun).match(/(19|20)\d{2}/);
  const kata = String(e.kata || '').replace(/[;\n]+/g, ',').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', ') || kataKunciDari(judul);
  return { ...e, judul, jenis, tahun: th ? +th[0] : null, skema: String(e.skema || '').replace(/\s+/g, ' ').trim(), mitra: String(e.mitra || '').replace(/\s+/g, ' ').trim(), kata, ringkas: String(e.ringkas || '').replace(/\s+/g, ' ').trim() };
}

/** Pengampu mata kuliah dan entri riset yang boleh dipilih untuknya (milik pengampu, atau semua entri prodi bila belum ada pengampu). */
export function opsiRiset(S, m) {
  const peng = S.tugas.filter(t => t.mk === m.id).map(t => t.dosen);
  let ent = (S.riset || []).filter(e => peng.includes(e.dosen));
  if (!peng.length) { const dsn = new Set(S.dosen.filter(d => d.homebase === m.prodi).map(d => d.id)); ent = (S.riset || []).filter(e => dsn.has(e.dosen)); }
  return ent.sort((a, b) => (b.tahun || 0) - (a.tahun || 0));
}
export const riset = (S, id) => (S.riset || []).find(e => e.id === id);
export const labelRiset = (S, e) => { const d = S.dosen.find(x => x.id === e.dosen); return `${e.jenis}: ${e.judul}${e.tahun ? ' (' + e.tahun + ')' : ''}${d ? ' · ' + d.nama : ''}`; };

/** Kecocokan satu entri dengan satu pertemuan. k: ok (cocok dengan materi pertemuan), near (cocok dengan MK atau dijelaskan dosen), bad (tidak ada kaitan dan belum dijelaskan). */
export function kecocokan(S, m, r, p, e) {
  const subs = S.sub.filter(s => (p.sub || []).includes(s.id)), semuaSub = S.sub.filter(s => s.mk === m.id), cp = S.cpmk.filter(c => c.mk === m.id);
  const kunci = tokenisasi(`${e.kata || ''} ${e.judul || ''}`);
  const tokP = tokenisasi(`${p.materi || ''} ${p.indikator || ''} ${subs.map(s => s.teks).join(' ')}`);
  const tokM = tokenisasi(`${m.nama} ${r.bahan || ''} ${r.deskripsi || ''} ${(r.pertemuan || []).map(x => x.materi || '').join(' ')} ${semuaSub.map(s => s.teks).join(' ')} ${cp.map(c => c.teks).join(' ')}`);
  const cocokP = kunci.filter(k => tokP.some(t => sama(k, t))), cocokM = kunci.filter(k => tokM.some(t => sama(k, t)));
  const catatan = [];
  if (e.tahun && e.tahun < new Date().getFullYear() - 5) catatan.push(`tahun ${e.tahun}, lebih dari 5 tahun`);
  const uraian = String(p.integUraian || '').trim();
  if (cocokP.length) return { k: 'ok', kata: cocokP, t: `Sesuai dengan materi (${cocokP.slice(0, 3).join(', ')})`, catatan };
  if (cocokM.length) return { k: 'near', kata: cocokM, t: `Cocok dengan MK (${cocokM.slice(0, 3).join(', ')}) tetapi belum dengan materi pertemuan ini`, catatan };
  if (uraian.length >= 40) return { k: 'near', kata: [], t: 'Tidak ada kata kunci yang sama, kaitan dijelaskan dosen', catatan };
  return { k: 'bad', kata: [], t: 'Tidak ada kata kunci yang sama dengan materi. Ganti entri atau jelaskan kaitannya', catatan };
}

/** Rangkuman integrasi satu RPS: jumlah pertemuan, daftar entri terpakai, dan temuan kecocokan. */
export function ringkasIntegrasi(S, m, r) {
  const items = [], pakai = new Map();
  (r.pertemuan || []).filter(p => !p.ujian).forEach(p => (p.riset || []).forEach(id => {
    const e = riset(S, id); if (!e) return;
    const c = kecocokan(S, m, r, p, e); items.push({ m: p.m, e, c, p }); pakai.set(id, e);
  }));
  const dipilih = (r.pertemuan || []).filter(p => !p.ujian && ((p.riset || []).length || p.integ)).length;
  return { items, entri: Array.from(pakai.values()), pertemuan: dipilih, bad: items.filter(x => x.c.k === 'bad'), near: items.filter(x => x.c.k === 'near') };
}
/** Teks ringkas untuk kotak "Penelitian dan PKM yang diintegrasikan" (otomatis dari entri terpakai). */
export function teksRiset(S, entri, jenis) {
  return entri.filter(e => e.jenis === jenis).map(e => `${e.judul}${e.skema ? ', ' + e.skema : ''}${e.tahun ? ' ' + e.tahun : ''}${e.mitra ? ', mitra ' + e.mitra : ''}`).join('; ');
}
/** Jenis integrasi pertemuan dari entri terpilih. */
export function jenisInteg(S, ids) {
  const j = new Set(ids.map(id => (riset(S, id) || {}).jenis).filter(Boolean));
  return j.size === 2 ? 'Penelitian dan PKM' : j.has('PKM') ? 'PKM' : j.has('Penelitian') ? 'Penelitian' : '';
}
export const dipakaiDi = (S, id) => S.rps.reduce((a, r) => a + (r.pertemuan || []).filter(p => (p.riset || []).includes(id)).length, 0);
export { norm as normRiset };
