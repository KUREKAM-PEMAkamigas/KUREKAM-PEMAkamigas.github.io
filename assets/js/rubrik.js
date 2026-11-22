/* KUREKAM · Pustaka rubrik penilaian untuk RPS (K1 sampai K6) dan pengenal teknik penilaian dari teks.
   Rubrik bersifat umum untuk program studi vokasi teknik. Dosen boleh menyesuaikan di berkas Word. */

export const TEKNIK = [
  { id: 'tulis', nama: 'Tes tulis', rubrik: 'K1', re: /tes tulis|ujian tulis|tertulis|\buts\b|\buas\b|kuis|quiz/i },
  { id: 'laporan', nama: 'Laporan', rubrik: 'K2', re: /laporan|makalah|tugas|resume|jurnal|portofolio/i },
  { id: 'presentasi', nama: 'Presentasi', rubrik: 'K3', re: /presentasi|paparan|seminar/i },
  { id: 'unjuk', nama: 'Unjuk kerja', rubrik: 'K4', re: /unjuk|praktik|praktikum|demonstrasi|simulasi|proyek|project/i },
  { id: 'lisan', nama: 'Tes lisan', rubrik: 'K5', re: /lisan|tanya jawab|wawancara|diskusi|viva/i },
  { id: 'partisipasi', nama: 'Partisipasi dan observasi', rubrik: 'K6', re: /partisipasi|kehadiran|sikap|observasi|keaktifan/i },
];

/** Teknik penilaian yang terbaca dari teks asesmen atau metode. */
export function teknikDari(teks) {
  const t = String(teks || '');
  return TEKNIK.filter(k => k.re.test(t));
}

const L4 = ['Sangat Baik (4)', 'Baik (3)', 'Cukup (2)', 'Kurang (1)'];

export const RUBRIK = {
  K1: { id: 'K1', judul: 'Rubrik Penilaian Ujian Tulis', teknik: 'tulis', kolom: ['Nilai 20 (Sangat Baik)', 'Nilai 10 sampai 19 (Baik)', 'Nilai 5 sampai 9 (Cukup)', 'Nilai 0 sampai 4 (Kurang)'],
    baris: [1, 2].map(n => [`Soal No. ${n}`, 'Menjawab dengan benar dan lengkap (lebih dari 3 kata kunci), menunjukkan hubungan konsep yang tepat, dan mampu mengaitkan dengan penerapan di industri.', 'Menjawab benar tetapi kurang lengkap (kurang dari 3 kata kunci), hubungan antarkonsep benar.', 'Menjawab benar tetapi tidak lengkap (kurang dari 2 kata kunci), hubungan antarkonsep kurang tepat.', 'Jawaban kurang tepat dan tidak lengkap (kurang dari 1 kata kunci), tidak menunjukkan hubungan konsep yang benar.']).concat([['Dst. (sesuai jumlah soal)', 'Kriteria sama dengan soal sebelumnya; skor maksimum tiap soal ditetapkan dosen dan dijumlahkan.', '', '', '']]),
    akhir: 'Nilai Akhir = (Jumlah nilai yang diperoleh ÷ Jumlah nilai maksimum) × 100' },
  K2: { id: 'K2', judul: 'Rubrik Penilaian Laporan (Praktikum atau Tugas)', teknik: 'laporan', kolom: L4,
    baris: [
      ['Struktur dan kelengkapan laporan (20%)', 'Laporan sistematis dan lengkap (tujuan, dasar teori, alat dan bahan, prosedur, data, analisis, kesimpulan, daftar pustaka).', 'Laporan cukup terorganisir; sebagian besar bagian lengkap.', 'Laporan kurang terstruktur; beberapa bagian penting tidak ada.', 'Laporan tidak sistematis; banyak bagian tidak disertakan.'],
      ['Ketepatan data dan perhitungan (30%)', 'Data lengkap dan konsisten; perhitungan benar, satuan tepat, dan sesuai prosedur atau standar.', 'Data lengkap dan perhitungan benar; ada sedikit kekeliruan satuan atau pembulatan.', 'Data kurang lengkap atau ada kekeliruan pada sebagian perhitungan.', 'Data tidak lengkap dan perhitungan tidak dapat dipertanggungjawabkan.'],
      ['Analisis dan interpretasi hasil (35%)', 'Analisis mendalam, membandingkan hasil dengan teori atau standar, dan menarik kesimpulan yang tepat serta rekomendasi.', 'Analisis relevan dan sebagian dibandingkan dengan teori; kesimpulan sesuai data.', 'Analisis bersifat dasar; interpretasi hasil kurang tajam.', 'Analisis dangkal atau tidak sesuai dengan data yang diperoleh.'],
      ['Tata bahasa, sitasi, dan referensi (15%)', 'Tidak ada kesalahan ejaan dan tata bahasa; sitasi dan daftar pustaka konsisten.', 'Kurang dari 5 kesalahan ketik; sitasi dan daftar pustaka cukup konsisten.', 'Lebih dari 5 kesalahan; sitasi tidak konsisten.', 'Banyak kesalahan; sitasi dan daftar pustaka tidak ada.'],
    ], akhir: 'Nilai = Σ (skor komponen ÷ 4 × bobot komponen). Skor 0 diberikan bila komponen tidak dikerjakan.' },
  K3: { id: 'K3', judul: 'Rubrik Penilaian Presentasi', teknik: 'presentasi', kolom: L4,
    baris: [
      ['Organisasi penyajian (20%)', 'Penyajian runtut, mudah diikuti, pembagian peran anggota jelas, waktu tepat.', 'Cukup runtut; transisi sedikit terputus tetapi masih dapat diikuti.', 'Urutan kurang jelas; transisi antaranggota terlihat canggung.', 'Tidak terorganisasi; waktu tidak terkendali.'],
      ['Kedalaman materi teknis (40%)', 'Penguasaan materi sangat kuat; konsep, perhitungan, dan penerapan dijelaskan dengan benar dan lengkap.', 'Sebagian besar materi dipahami; ada kesalahan kecil yang tidak mengubah kesimpulan.', 'Pemahaman terbatas; beberapa kesalahan teknis; penjelasan banyak membaca teks.', 'Pemahaman materi sangat kurang; banyak kesalahan teknis.'],
      ['Kemampuan menjawab pertanyaan (30%)', 'Menjawab pertanyaan teknis dengan tepat, rinci, dan disertai dasar.', 'Menjawab sebagian besar pertanyaan dengan baik.', 'Jawaban kurang tepat atau tidak lengkap.', 'Tidak mampu menjawab pertanyaan teknis.'],
      ['Media dan visual (10%)', 'Slide jelas, grafik dan diagram informatif, teks ringkas, mudah dibaca.', 'Slide cukup jelas; sebagian grafik kurang terbaca.', 'Slide biasa; terlalu banyak teks.', 'Slide sangat sederhana atau terlalu padat.'],
    ], akhir: 'Nilai = Σ (skor aspek ÷ 4 × bobot aspek). Nilai kelompok dapat dibedakan per anggota berdasarkan peran dan jawaban individu.' },
  K4: { id: 'K4', judul: 'Rubrik Penilaian Unjuk Kerja Praktik', teknik: 'unjuk', kolom: L4,
    baris: [
      ['Persiapan alat, bahan, dan K3 (20%)', 'Menyiapkan alat, bahan, dan data lengkap; memakai APD dan memeriksa kondisi alat sebelum bekerja tanpa diingatkan.', 'Persiapan lengkap; sesekali perlu diingatkan soal K3.', 'Persiapan kurang lengkap; K3 belum konsisten.', 'Persiapan tidak memadai; mengabaikan prosedur K3.'],
      ['Prosedur kerja (30%)', 'Bekerja mandiri, runtut, dan sesuai prosedur atau SOP.', 'Bekerja sesuai prosedur dengan sedikit arahan.', 'Masih sering memerlukan bimbingan; urutan kerja kurang tepat.', 'Belum mampu mengikuti prosedur.'],
      ['Ketepatan hasil dan penggunaan peralatan (30%)', 'Mengoperasikan peralatan dengan benar; hasil kerja tepat, akurat, dan terdokumentasi.', 'Penggunaan peralatan benar; hasil sesuai dengan toleransi kecil.', 'Penggunaan peralatan masih perlu bimbingan; hasil kurang akurat.', 'Belum mampu mengoperasikan peralatan; hasil tidak sesuai.'],
      ['Ketertiban dan kerja sama (20%)', 'Tertib sesuai jadwal, aktif menjalankan peran, merapikan area kerja.', 'Tertib dan menjalankan peran dengan baik.', 'Kontribusi dalam kelompok terbatas.', 'Tidak menjalankan peran dan tidak berkontribusi.'],
    ], akhir: 'Nilai = Σ (skor aspek ÷ 4 × bobot aspek). Pelanggaran K3 berat dapat menggugurkan penilaian sesi tersebut.' },
  K5: { id: 'K5', judul: 'Rubrik Penilaian Tes Lisan dan Diskusi', teknik: 'lisan', kolom: L4,
    baris: [
      ['Penguasaan konsep (40%)', 'Menjelaskan konsep dengan benar dan lengkap serta memberi contoh yang tepat.', 'Konsep benar; contoh kurang lengkap.', 'Konsep sebagian benar; penjelasan kurang runtut.', 'Konsep salah atau tidak dapat dijelaskan.'],
      ['Penalaran dan ketepatan jawaban (30%)', 'Jawaban logis, disertai alasan dan dasar yang jelas.', 'Jawaban benar dengan alasan terbatas.', 'Jawaban kurang tepat; alasan lemah.', 'Jawaban tidak tepat dan tanpa alasan.'],
      ['Komunikasi (20%)', 'Menyampaikan dengan jelas, bahasa baku, dan percaya diri.', 'Cukup jelas; sesekali ragu.', 'Kurang jelas; sering terhenti.', 'Sulit dipahami.'],
      ['Sikap dan etika diskusi (10%)', 'Menghargai pendapat, aktif, dan sopan.', 'Sopan dan cukup aktif.', 'Pasif.', 'Tidak menghargai pendapat orang lain.'],
    ], akhir: 'Nilai = Σ (skor aspek ÷ 4 × bobot aspek).' },
  K6: { id: 'K6', judul: 'Rubrik Penilaian Partisipasi dan Observasi Sikap', teknik: 'partisipasi', kolom: L4,
    baris: [
      ['Kehadiran (30%)', 'Hadir 95 persen atau lebih dari pertemuan.', 'Hadir 85 sampai kurang dari 95 persen.', 'Hadir 75 sampai kurang dari 85 persen.', 'Hadir kurang dari 75 persen.'],
      ['Keaktifan dan kontribusi (30%)', 'Aktif bertanya, menjawab, dan membantu kelompok pada hampir setiap pertemuan.', 'Aktif pada sebagian besar pertemuan.', 'Aktif bila diminta.', 'Pasif.'],
      ['Disiplin dan kepatuhan K3 (20%)', 'Tepat waktu, berpakaian dan berperilaku sesuai tata tertib serta K3.', 'Sesekali terlambat; tata tertib dipatuhi.', 'Beberapa kali melanggar tata tertib.', 'Sering melanggar tata tertib.'],
      ['Kerja sama dan integritas (20%)', 'Bekerja sama dengan baik, jujur, dan bertanggung jawab atas tugas.', 'Bekerja sama dengan baik; tanggung jawab cukup.', 'Kerja sama terbatas.', 'Tidak mau bekerja sama atau ada pelanggaran kejujuran.'],
    ], akhir: 'Nilai = Σ (skor aspek ÷ 4 × bobot aspek). Pelanggaran kejujuran akademik diproses sesuai peraturan akademik.' },
};

/** Rubrik yang dipakai satu RPS: dari teks asesmen tiap pertemuan; bila kosong, pakai bawaan menurut jenis MK. */
export function rubrikDipakai(r, praktik) {
  const set = new Set();
  (r.pertemuan || []).forEach(p => teknikDari(`${p.asesmen || ''} ${p.ujian ? (p.metode || '') : ''}`).forEach(k => set.add(k.rubrik)));
  if (!set.size) (praktik ? ['K2', 'K4'] : ['K1', 'K2']).forEach(k => set.add(k));
  return Array.from(set).sort().map(k => RUBRIK[k]);
}
