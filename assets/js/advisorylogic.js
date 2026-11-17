/* KUREKAM · Advisory Board industri dan praktisi profesi: bukti pelibatan dalam pengembangan kurikulum.
   Satu koleksi `ab` dengan tiga jenis dokumen: anggota, pertemuan, masukan. Tanpa data pribadi selain nama atau inisial yang dipilih prodi. */

export const UNSUR = ['Industri', 'Praktisi profesi', 'Asosiasi profesi', 'Pengguna lulusan', 'Alumni', 'Pemerintah', 'Akademisi atau peneliti'];
export const LUAR = new Set(['Industri', 'Praktisi profesi', 'Asosiasi profesi', 'Pengguna lulusan', 'Pemerintah']);
export const BENTUK = ['Rapat advisory board', 'FGD kurikulum', 'Lokakarya kurikulum', 'Kunjungan atau kuliah industri', 'Survei pemangku kepentingan'];
export const OBJEK = ['Profil lulusan', 'CPL', 'Bahan kajian', 'Mata kuliah', 'CPMK dan RPS', 'Capstone', 'Praktik industri', 'Lainnya'];
export const STATUS = { menunggu: 'Menunggu tanggapan', diterima: 'Diterima', sebagian: 'Diterima sebagian', ditolak: 'Tidak diterapkan' };

const bln12 = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); };

export function abProdi(S, pid) {
  const a = (S.ab || []).filter(x => x.prodi === pid);
  return {
    anggota: a.filter(x => x.jenis === 'anggota'),
    pertemuan: a.filter(x => x.jenis === 'pertemuan').sort((x, y) => String(y.tgl).localeCompare(String(x.tgl))),
    masukan: a.filter(x => x.jenis === 'masukan').sort((x, y) => String(y.tgl).localeCompare(String(x.tgl)))
  };
}

/** Rekap dan syarat bukti. Setiap syarat: { t, ok, ket }. */
export function abRekap(S, pid) {
  const d = abProdi(S, pid), luar = d.anggota.filter(x => LUAR.has(x.unsur)), unsurLuar = new Set(luar.map(x => x.unsur));
  const terakhir = d.pertemuan[0] ? d.pertemuan[0].tgl : '', dalam12 = d.pertemuan.filter(x => String(x.tgl) >= bln12());
  const tanpaBukti = d.pertemuan.filter(x => !x.tautan), belum = d.masukan.filter(x => x.status === 'menunggu' || !x.status);
  const dipakai = d.masukan.filter(x => ['diterima', 'sebagian'].includes(x.status)), terhubung = dipakai.filter(x => x.revisiId && (S.revisi || []).some(r => r.id === x.revisiId));
  const keProfil = d.masukan.filter(x => ['Profil lulusan', 'CPL'].includes(x.objek));
  const syarat = [
    { t: 'Ada anggota dari luar kampus (industri, praktisi, asosiasi profesi, pengguna lulusan, pemerintah)', ok: luar.length >= 3, ket: `${luar.length} anggota dari luar kampus, ${unsurLuar.size} unsur berbeda. Disarankan minimal 3 anggota.` },
    { t: 'Penetapan advisory board terdokumentasi (SK atau surat tugas)', ok: d.anggota.some(x => x.tautan), ket: d.anggota.some(x => x.tautan) ? 'Ada tautan SK atau penetapan.' : 'Tempel tautan SK pada salah satu anggota.' },
    { t: 'Pertemuan atau kegiatan dalam 12 bulan terakhir', ok: dalam12.length >= 1, ket: `${dalam12.length} kegiatan dalam 12 bulan terakhir${terakhir ? `, terakhir ${terakhir}` : ''}.` },
    { t: 'Setiap kegiatan punya bukti (notulen, daftar hadir, foto)', ok: d.pertemuan.length > 0 && !tanpaBukti.length, ket: d.pertemuan.length ? (tanpaBukti.length ? `${tanpaBukti.length} kegiatan belum ada tautan bukti.` : 'Semua kegiatan ada tautan bukti.') : 'Belum ada kegiatan tercatat.' },
    { t: 'Masukan industri tercatat dan semuanya sudah ditanggapi', ok: d.masukan.length > 0 && !belum.length, ket: d.masukan.length ? (belum.length ? `${belum.length} masukan masih menunggu tanggapan.` : `${d.masukan.length} masukan, semuanya sudah ditanggapi.`) : 'Belum ada masukan tercatat.' },
    { t: 'Masukan diterapkan dan terhubung ke usulan revisi kurikulum', ok: terhubung.length >= 1, ket: `${dipakai.length} masukan diterima, ${terhubung.length} terhubung ke menu Revisi dan Pengesahan.` },
    { t: 'Masukan menyentuh perumusan profil lulusan atau CPL', ok: keProfil.length >= 1, ket: `${keProfil.length} masukan tentang profil lulusan atau CPL.` }
  ];
  return { ...d, luar: luar.length, unsurLuar: unsurLuar.size, terakhir, dalam12: dalam12.length, belum: belum.length, dipakai: dipakai.length, terhubung: terhubung.length, syarat, ok: syarat.filter(x => x.ok).length };
}

/** Ringkasan untuk umpan ke SIMANTAP. */
export function abUmpan(S, pid) {
  const r = abRekap(S, pid);
  if (!r.anggota.length && !r.pertemuan.length && !r.masukan.length) return null;
  return { anggota: r.anggota.length, luar: r.luar, unsur: r.unsurLuar, pertemuan: r.pertemuan.length, dalam12: r.dalam12, terakhir: r.terakhir || null, masukan: r.masukan.length, ditanggapi: r.masukan.length - r.belum, diterima: r.dipakai, terhubungRevisi: r.terhubung, syaratOk: r.ok, syaratTotal: r.syarat.length, ilustratif: (S.ab || []).some(x => x.prodi === pid && x.ilustratif) || undefined };
}
