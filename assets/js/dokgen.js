/* KUREKAM · Generator isi SAP dan ACP dari RPS dan data kurikulum.
   Metode: berbasis aturan yang deterministik. Setiap kalimat disusun dari isian yang sudah ada pada RPS (bahan kajian, Sub-CPMK, level Bloom,
   metode, indikator, pustaka, durasi tatap muka) sehingga selalu sinkron dengan RPS dan kurikulum dan tidak mengarang fakta keilmuan.
   Hasilnya berstatus usulan: dosen membaca dan menyunting, lalu menyetujuinya sebelum SAP atau ACP diajukan dan disahkan.
   Semua fungsi murni terhadap data masukan, kecuali lengkapiSap dan lengkapiAcp yang mengubah salinan RPS yang diberikan. */
import { S } from './app.js';
import { detect, ANJURAN_SMT, KKO } from './bloom.js';
import { iabeeOf } from './rules.js';
import { konteksMk, butirMateri, judulPertemuan, sumberBelajar, capaianPertemuan, bobotSubPenuh, bobotCpmk, rentang, pc } from './dokbantu.js';

const kecil = (t) => { t = String(t || '').trim(); return /^[A-Z]{2,}/.test(t) ? t : t.replace(/^./, c => c.toLowerCase()); };
const akhiri = (t) => String(t || '').replace(/[\s.;:,]+$/, '').trim();
const urut = (arr) => arr.map((x, i) => `${i + 1}. ${x}`).join('\n');
const TERPOTONG = /…|\.{3,}|\.{2,}\s*$/;
export const CONTOH = /\[[^\]]{3,}\]/;

const topikDari = (p) => butirMateri(p).filter(b => !/^konteks\s*:/i.test(b)).map(akhiri).filter(Boolean);
const konteksDari = (p) => { const b = butirMateri(p).find(x => /^konteks\s*:/i.test(x)); return b ? akhiri(b.replace(/^konteks\s*:\s*/i, '')) : ''; };
const subDari = (p) => (p.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean);
const levelPert = (subs, prak) => subs.map(s => detect(s.teks, prak ? 'P' : 'C')).filter(Boolean).sort((a, b) => b.n - a.n)[0] || null;
const mampuDari = (s) => `Mahasiswa mampu ${kecil(akhiri(String(s.teks || '').replace(/^Mampu\s+/i, '')))}`;
const KATA_KERJA = new Set(Object.values(KKO).flat());
/** Topik dari rumusan Sub-CPMK: kata kerja operasional di awal dibuang, misalnya "memahami dan menjelaskan prinsip X" menjadi "prinsip X". */
export function topikDariSub(teks) {
  const w = akhiri(String(teks || '').replace(/^Mampu\s+/i, '')).split(/\s+/); let i = 0;
  while (i < w.length && i < 7 && (KATA_KERJA.has(w[i].toLowerCase()) || (i > 0 && /^(dan|serta|atau)$/i.test(w[i]) && KATA_KERJA.has((w[i + 1] || '').toLowerCase())))) i++;
  const t = w.slice(i).join(' ');
  return t || w.join(' ');
}
const nomorPustaka = (p) => { const x = String(p.materi || '').replace(/\*\*/g, '').match(/pustaka\s*:\s*([^\n]+)/i); return x ? Array.from(x[1].matchAll(/\((\d+)\)|\b(\d+)\b/g)).map(y => +(y[1] || y[2])) : []; };
const namaUjian = (u) => (u === 'UTS' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)');

/** Butir soal atau tugas non-tes dari satu topik sesuai level Bloom. */
export function soalDari(topik, lv) {
  const x = kecil(akhiri(topik));
  if (lv && lv.d === 'P') return [`Amati dan sebutkan bagian-bagian utama pada ${x}.`, `Siapkan dan lakukan ${x} sesuai prosedur dan kaidah K3.`, `Lakukan ${x} dengan tepat, lalu catat hasilnya pada lembar kerja.`, `Atasi masalah yang muncul pada ${x} dan padukan langkah-langkahnya menjadi satu prosedur utuh.`, `Kelola ${x} secara mandiri sampai hasilnya memenuhi standar.`][Math.min(lv.n, 5) - 1];
  const n = lv && lv.d === 'C' ? lv.n : 2;
  return [`Sebutkan pokok-pokok ${x}.`, `Jelaskan ${x} dengan bahasa sendiri dan berikan satu contoh.`, `Terapkan ${x} untuk menyelesaikan satu kasus dari industri migas yang diberikan dosen.`, `Analisis ${x} pada satu kasus yang diberikan dosen, lalu tunjukkan unsur dan hubungan antarunsurnya.`, `Evaluasi ${x} pada satu kasus yang diberikan dosen, lalu berikan penilaian beserta alasannya.`, `Rancang usulan penyelesaian berdasarkan ${x}, lalu jelaskan dasar rancangannya.`][n - 1];
}

/** Menyusun isian SAP satu pertemuan dari RPS. Mengembalikan { judul, pendahuluan, inti, penutup, media, soal }. */
export function susunSap(m, r, p) {
  const k = konteksMk(m, r), pert = k.pert, i = pert.findIndex(x => x.m === p.m);
  const prev = i > 0 ? pert[i - 1] : null, next = i >= 0 && i < pert.length - 1 ? pert[i + 1] : null;
  const subs = subDari(p), lv = levelPert(subs, k.prak), tp = topikDari(p), ket = konteksDari(p);
  const praktis = k.prak || (k.T > 0 && k.Pr > 0);
  const cap = subs.length ? mampuDari(subs[0]) : (capaianPertemuan(p)[0] || '');

  if (p.ujian) {
    const cakup = pert.filter(q => !q.ujian && (p.ujian === 'UTS' ? q.m < p.m : q.m > 8 && q.m < p.m));
    const pend = urut(['Pengecekan kehadiran dan identitas peserta ujian.', 'Pengarahan tata tertib dan waktu ujian, lalu pembagian soal.']);
    const inti = urut([`Mahasiswa mengerjakan soal ${p.ujian === 'UTS' ? 'tengah' : 'akhir'} semester ${k.prak ? 'secara praktik' : 'secara tertulis'} dan mandiri sesuai tata tertib ujian.`, 'Dosen dan pengawas memantau pelaksanaan ujian.']);
    const tutup = urut(['Pengumpulan lembar jawaban dan pengecekan kelengkapannya.', 'Penyampaian jadwal pengumuman nilai dan pembahasan hasil ujian.']);
    const soal = subs.map(s => { const l = detect(s.teks, k.prak ? 'P' : 'C'); return soalDari(topikDariSub(s.teks), l); });
    return { judul: namaUjian(p.ujian), pendahuluan: pend, inti, penutup: tutup, media: k.prak ? 'Lembar soal praktik\nPeralatan praktik sesuai soal\nLembar jawaban' : 'Lembar soal\nLembar jawaban\nAlat tulis', soal: soal.join('\n'), cakup: cakup.map(q => q.m) };
  }

  /* Pendahuluan */
  const l1 = `Dosen membuka perkuliahan dan memeriksa kehadiran${praktis ? ', memeriksa kelengkapan alat pelindung diri, serta menyampaikan ketentuan K3 yang berlaku' : ''}.`;
  const l2 = !prev ? 'Dosen menyampaikan kontrak perkuliahan: capaian mata kuliah, rencana pertemuan, komponen penilaian, dan tata tertib.'
    : prev.ujian ? `Dosen membahas secara umum hasil ${namaUjian(prev.ujian)} dan mengaitkannya dengan topik pertemuan ini.`
      : `Apersepsi: dosen mengaitkan topik pertemuan ini dengan materi pertemuan sebelumnya, yaitu ${akhiri(judulPertemuan(prev))}.`;
  const pend = urut([l1, l2, cap ? `Dosen menyampaikan capaian pembelajaran pertemuan ini. ${cap}.` : 'Dosen menyampaikan tujuan pertemuan ini.']);

  /* Kegiatan inti */
  const mt = `${p.metode || ''} ${p.tatap || ''}`.toLowerCase(), daftar = tp.slice(0, 4), lines = [];
  const bahasan = daftar.length ? daftar.map(kecil).join('; ') : 'topik pertemuan ini';
  if (k.prak) {
    lines.push(`Dosen mendemonstrasikan prosedur dan peralatan untuk: ${bahasan}.`, 'Mahasiswa bekerja berkelompok mempraktikkan prosedur sesuai lembar kerja dan kaidah K3.', 'Mahasiswa mengamati, mengukur, dan mencatat data hasil praktik.', 'Dosen dan asisten membimbing, mengoreksi kesalahan, dan menilai unjuk kerja dengan rubrik.', 'Setiap kelompok membahas hasil praktik dan menyampaikan temuannya.');
  } else {
    if (daftar.length) daftar.forEach(b => lines.push(`Dosen menjelaskan ${kecil(b)} disertai contoh penerapan di industri migas.`)); else lines.push('Dosen menjelaskan materi pertemuan ini disertai contoh penerapan di industri migas.');
    const ekstra = [];
    if (/case|kasus/.test(mt)) ekstra.push(`Mahasiswa berkelompok membahas kasus lapangan${ket ? ` yang berkaitan dengan ${kecil(ket)}` : ' yang berkaitan dengan topik'}, lalu mempresentasikan hasilnya dan ditanggapi kelompok lain.`);
    if (/project|proyek/.test(mt)) ekstra.push('Mahasiswa mengerjakan bagian tugas proyek kelompok yang terkait topik pertemuan dan melaporkan kemajuannya kepada dosen.');
    if (/problem|masalah/.test(mt)) ekstra.push('Mahasiswa merumuskan masalah dari skenario yang diberikan, mencari penyelesaiannya secara berkelompok, dan menyampaikannya.');
    if (/simulasi|role/.test(mt)) ekstra.push('Mahasiswa memerankan skenario kerja yang relevan dengan topik, lalu dosen membahas hasilnya.');
    if (/discovery|penemuan/.test(mt)) ekstra.push('Mahasiswa mengamati contoh, data, atau gambar yang diberikan dosen, menemukan pola atau konsepnya sendiri, lalu menyampaikan kesimpulannya.');
    if (/self-directed|mandiri/.test(mt) && !/tugas mandiri/.test(mt.replace(/self-directed/g, ''))) ekstra.push('Mahasiswa mempelajari bahan secara mandiri sesuai panduan belajar, lalu menyampaikan rangkuman dan pertanyaannya.');
    if (/cooperative/.test(mt)) ekstra.push('Mahasiswa bekerja dalam kelompok dengan pembagian peran yang jelas, saling menjelaskan bagian tugasnya, lalu kelompok menyampaikan hasil bersama.');
    if (/collaborative/.test(mt)) ekstra.push('Mahasiswa menyusun hasil kerja bersama dalam kelompok, saling memberi masukan, lalu menyajikan hasil akhirnya.');
    if (/small group|diskusi|discussion/.test(mt) && !ekstra.length) ekstra.push('Mahasiswa berdiskusi dalam kelompok kecil tentang topik pertemuan dan menyimpulkan hasil diskusi.');
    if (/contextual|kontekstual/.test(mt) && !ekstra.length) ekstra.push(`Dosen mengaitkan topik dengan kondisi nyata${ket ? ` pada ${kecil(ket)}` : ' di industri migas'}, lalu mahasiswa menyampaikan contoh dari pengalamannya.`);
    if (praktis) ekstra.push('Mahasiswa melakukan praktik terbimbing sesuai lembar kerja, mencatat data, dan membahas hasilnya bersama dosen.');
    if (!ekstra.length) ekstra.push('Mahasiswa mengerjakan latihan dan berdiskusi untuk memastikan pemahaman.');
    lines.push(...ekstra.slice(0, 2), 'Mahasiswa mengajukan pertanyaan dan dosen memberikan penegasan.');
  }
  const inti = urut(lines);

  /* Penutup */
  const nomor = nomorPustaka(p), rujuk = nomor.length ? `, dengan rujukan pustaka nomor ${nomor.join(', ')} pada daftar pustaka RPS` : '';
  const tutup = urut([`Dosen bersama mahasiswa merangkum pokok materi: ${daftar.slice(0, 2).map(kecil).join('; ') || 'materi pertemuan ini'}.`, 'Dosen memberikan umpan balik atas hasil pembelajaran dan membuka tanya jawab.', `Dosen memberikan tugas terstruktur dan tugas mandiri sesuai RPS${rujuk}.`,
    !next ? 'Dosen menutup perkuliahan.' : next.ujian ? `Dosen menyampaikan jadwal dan cakupan ${namaUjian(next.ujian)}.` : `Dosen menyampaikan topik pertemuan berikutnya, yaitu ${akhiri(judulPertemuan(next))}.`]);

  /* Media */
  const med = k.prak ? ['Peralatan laboratorium atau bengkel sesuai topik', 'Lembar kerja praktik', 'Alat pelindung diri (APD)'] : ['Proyektor dan layar', 'Bahan tayang dan modul ajar'];
  if (praktis && !k.prak) med.push('Peralatan praktik dan lembar kerja');
  const host = Array.from(new Set((String(p.daring || '').match(/https?:\/\/[^\s,;)]+/g) || []).map(u => { try { return new URL(u).hostname; } catch (e) { return ''; } }).filter(Boolean)));
  med.push(host.length ? `Platform daring: ${host.join(' dan ')}` : 'Sistem pembelajaran daring kampus');

  /* Butir soal atau penugasan non-tes */
  const soal = (daftar.length ? daftar.slice(0, 3) : subs.map(s => topikDariSub(s.teks))).map(t => soalDari(t, lv));
  return { judul: judulPertemuan(p), pendahuluan: pend, inti, penutup: tutup, media: med.join('\n'), soal: soal.join('\n') };
}

/** Mengisi SAP semua pertemuan pada salinan RPS. timpa = true menulis ulang isian yang sudah ada. Mengembalikan { r, n }. */
export function lengkapiSap(m, r0, timpa) {
  const r = JSON.parse(JSON.stringify(r0)); delete r.cadangan; let n = 0;
  (r.pertemuan || []).forEach(p => {
    const g = susunSap(m, r, p); p.sap = p.sap || {};
    const isi = (o, key, v) => { if (v && (timpa || !String(o[key] || '').trim())) { if (o[key] !== v) { o[key] = v; n++; } } };
    if (!p.ujian) isi(p, 'judul', g.judul);
    ['pendahuluan', 'inti', 'penutup', 'media', 'soal'].forEach(f => isi(p.sap, f, g[f]));
  });
  if (n > 0) { r.sapTinjau = true; if (r.sapStatus === 'disahkan') r.sapStatus = 'draf'; }
  return { r, n };
}

/** Pemeriksaan kelengkapan dan kesesuaian SAP terhadap RPS. Mengembalikan daftar { k: 'ok' | 'near' | 'bad', butir, temuan, saran }. */
export function periksaSap(m, r) {
  const out = [], add = (k, butir, temuan, saran = '') => out.push({ k, butir, temuan, saran });
  if (!r || !(r.pertemuan || []).length) { add('bad', 'RPS', 'RPS belum dibuat', 'SAP disusun dari RPS. Buat atau unggah RPS lebih dulu.'); return out; }
  const kk = konteksMk(m, r), non = kk.pert.filter(p => !p.ujian), uji = kk.pert.filter(p => p.ujian);
  add(kk.pengampu.length ? 'ok' : 'near', 'Dosen pengampu', kk.pengampu.length ? kk.pengampu.join('; ') : 'Belum ada penugasan dosen', 'Prodi menugaskan dosen di menu Penugasan dan Beban Dosen agar nama dosen tercantum pada SAP.');
  const per = (f, z) => non.filter(z || ((p) => !String(p[f] || '').trim())).map(p => p.m);
  [['materi', 'Bahan kajian (dari RPS)', 'bad', 'Isi bahan kajian pertemuan pada RPS. SAP mengambilnya dari sana.'], ['metode', 'Metode pembelajaran (dari RPS)', 'bad', 'Isi metode pada RPS.'], ['indikator', 'Indikator penilaian (dari RPS)', 'near', 'Isi indikator pada RPS, tiga per Sub-CPMK.']].forEach(([f, n, k, s]) => { const z = per(f); add(z.length ? k : 'ok', n, z.length ? `Kosong di pertemuan ${z.join(', ')}` : 'Terisi di semua pertemuan', z.length ? s : ''); });
  const tanpaSub = per('', (p) => !(p.sub || []).length); add(tanpaSub.length ? 'bad' : 'ok', 'Sub-CPMK tiap pertemuan', tanpaSub.length ? `Belum dipilih di pertemuan ${tanpaSub.join(', ')}` : 'Terhubung di semua pertemuan', tanpaSub.length ? 'Pilih Sub-CPMK pada pertemuan terkait di RPS.' : '');
  [['pendahuluan', 'Pendahuluan'], ['inti', 'Kegiatan inti'], ['penutup', 'Penutup'], ['media', 'Media pembelajaran'], ['soal', 'Butir soal atau penugasan']].forEach(([f, n]) => { const z = per('', (p) => !String((p.sap || {})[f] || '').trim()); add(z.length ? 'bad' : 'ok', `SAP · ${n}`, z.length ? `Kosong di pertemuan ${z.join(', ')}` : 'Terisi di semua pertemuan', z.length ? 'Klik Susun SAP otomatis, lalu sunting hasilnya.' : ''); });
  const ujKos = uji.filter(p => !String((p.sap || {}).soal || '').trim()).map(p => p.m); add(ujKos.length ? 'near' : 'ok', 'Kisi-kisi UTS dan UAS', ujKos.length ? `Belum ada di pertemuan ${ujKos.join(', ')}` : 'Terisi', ujKos.length ? 'Klik Susun SAP otomatis untuk membuat kisi-kisi dari Sub-CPMK.' : '');
  const tanpaPus = non.filter(p => !sumberBelajar(p, r)).map(p => p.m); add(tanpaPus.length ? 'near' : 'ok', 'Sumber belajar', tanpaPus.length ? `Tanpa rujukan pustaka di pertemuan ${tanpaPus.join(', ')}` : 'Ada di semua pertemuan', tanpaPus.length ? 'Tambahkan baris "Pustaka: (nomor)" pada bahan kajian di RPS dan isi daftar pustaka.' : '');
  const semua = kk.pert.flatMap(p => [p.judul, p.materi, p.indikator, ...Object.values(p.sap || {})]);
  const pot = kk.pert.filter(p => [p.judul, p.indikator, ...Object.values(p.sap || {})].some(t => TERPOTONG.test(String(t || '')))).map(p => p.m);
  add(pot.length ? 'bad' : 'ok', 'Teks terpotong atau titik-titik', pot.length ? `Ada di pertemuan ${pot.join(', ')}` : 'Tidak ada', pot.length ? 'Lengkapi kalimat yang berakhir "..." atau "…".' : '');
  const ct = semua.filter(t => CONTOH.test(String(t || ''))).length; add(ct ? 'near' : 'ok', 'Isian contoh bertanda kurung siku', ct ? `${ct} isian` : 'Tidak ada', ct ? 'Ganti teks dalam kurung siku dengan isi sebenarnya.' : '');
  add(r.sapTinjau ? 'near' : 'ok', 'Peninjauan dosen', r.sapTinjau ? 'Isi hasil susunan otomatis belum disetujui dosen' : 'Sudah ditinjau', r.sapTinjau ? 'Baca seluruh SAP, sunting bila perlu, lalu setujui.' : '');
  return out;
}

/* ====================================================================== ACP ====================================================================== */
function analisisAcp(m, r) {
  const k = konteksMk(m, r), subs = k.subs, cpmk = k.cpmk, bPenuh = bobotSubPenuh(k.pert), bC = bobotCpmk(k.pert);
  const tot = k.pert.reduce((a, x) => a + (+x.bobot || 0), 0), nama = m.nama;
  const mgSub = (id) => k.pert.filter(x => !x.ujian && (x.sub || []).includes(id)).map(x => x.m);
  const tanpaJadwal = subs.filter(s => !mgSub(s.id).length), tanpaUkur = subs.filter(s => !k.pert.some(x => (x.sub || []).includes(s.id) && +x.bobot > 0));
  const lv = subs.map(s => detect(s.teks, k.prak ? 'P' : 'C')).filter(Boolean), c = lv.filter(l => l.d === 'C').map(l => l.n);
  const rg = ANJURAN_SMT[m.smt], mx = c.length ? Math.max(...c) : 0;
  const besar = cpmk.slice().sort((a, b) => (bC.get(b.id) || 0) - (bC.get(a.id) || 0))[0];
  const cplIds = new Set(k.cpl.map(x => x.id)), idCpmk = new Set(cpmk.map(x => x.id));
  const piMk = (S.pi || []).filter(q => cplIds.has(q.cpl) && (!(q.cpmk || []).length || (q.cpmk || []).some(id => idCpmk.has(id))));
  const temuan = [], saran = [];
  temuan.push(`Mata kuliah ${nama} memuat ${k.cpl.length} CPL, ${cpmk.length} CPMK, dan ${subs.length} Sub-CPMK yang dijadwalkan pada ${k.pert.filter(x => !x.ujian).length} pertemuan pembelajaran serta ${k.pert.filter(x => x.ujian).length} pertemuan evaluasi.`);
  if (!subs.length) { temuan.push('Belum ada Sub-CPMK, sehingga keselarasan belum dapat dianalisis.'); saran.push('Prodi merumuskan Sub-CPMK pada menu Sub-CPMK.'); }
  else {
    if (tanpaJadwal.length) { temuan.push(`Sub-CPMK yang belum muncul pada pertemuan pembelajaran: ${tanpaJadwal.map(s => s.kode).join(', ')}.`); saran.push(`Jadwalkan ${tanpaJadwal.map(s => s.kode).join(', ')} pada pertemuan di RPS.`); } else temuan.push('Seluruh Sub-CPMK telah dijadwalkan pada sedikitnya satu pertemuan pembelajaran.');
    if (tanpaUkur.length) { temuan.push(`Sub-CPMK yang belum diukur oleh penilaian berbobot: ${tanpaUkur.map(s => s.kode).join(', ')}.`); saran.push(`Hubungkan ${tanpaUkur.map(s => s.kode).join(', ')} dengan instrumen berbobot pada RPS agar capaiannya terukur.`); } else temuan.push('Setiap Sub-CPMK diukur oleh sedikitnya satu penilaian berbobot, termasuk UTS dan UAS.');
  }
  if (Math.abs(tot - 100) < 0.05) temuan.push('Jumlah bobot penilaian pada RPS tepat 100%.'); else { temuan.push(`Jumlah bobot penilaian pada RPS adalah ${pc(tot)}, tidak sama dengan 100%.`); saran.push('Sesuaikan bobot penilaian pertemuan pada RPS sampai berjumlah 100%.'); }
  if (besar && (bC.get(besar.id) || 0) > 0) temuan.push(`CPMK dengan bobot terbesar adalah ${besar.kode} (${pc(bC.get(besar.id))}).`);
  if (lv.length) {
    const tinggi = lv.sort((a, b) => b.n - a.n)[0];
    temuan.push(`Level Bloom tertinggi pada Sub-CPMK adalah ${tinggi.code} (${tinggi.nama})${rg && c.length ? `; anjuran untuk semester ${m.smt} adalah C${rg[0]} sampai C${rg[1]}` : ''}.`);
    if (rg && c.length && mx < rg[0]) saran.push(`Naikkan sedikitnya satu Sub-CPMK ke level ${`C${rg[0]}`} atau lebih agar selaras dengan anjuran semester ${m.smt}.`);
  }
  if (piMk.length) temuan.push(`Mata kuliah ini mengukur ${piMk.length} indikator kinerja (PI) IABEE: ${piMk.map(q => q.kode).join(', ')}.`); else if (k.cpl.some(x => iabeeOf(x).length)) { temuan.push('Belum ada indikator kinerja (PI) yang dihubungkan ke CPMK mata kuliah ini.'); saran.push('Hubungkan PI pada menu Indikator Kinerja bila mata kuliah ini menjadi tempat pengukuran CPL.'); }
  if (!saran.length) saran.push('Tidak ditemukan ketidaksesuaian. ACP ini menjadi dasar evaluasi ketercapaian CPL setelah nilai semester tersedia, dan RPS ditinjau kembali bila hasil evaluasi berada di bawah kriteria program studi.');
  return { temuan, saran, besar, bPenuh };
}

/** Teks bawaan ACP yang bisa disunting dosen: pengantar, analisis kesesuaian, dan tindak lanjut. */
export function susunAcp(m, r) {
  const k = konteksMk(m, r), a = analisisAcp(m, r);
  const sks = `${k.T ? k.T + ' SKS Teori' : ''}${k.T && k.Pr ? ' + ' : ''}${k.Pr ? k.Pr + ' SKS Praktik' : ''}`;
  return {
    pengantar: `Mata kuliah ${m.nama} merupakan bagian dari struktur kurikulum Program Studi ${k.p.nama} Politeknik Energi dan Mineral Akamigas (PEM Akamigas), dibebankan ${sks} pada semester ${m.smt}. ACP ini memetakan hubungan capaian pembelajaran lulusan (CPL), capaian pembelajaran mata kuliah (CPMK), Sub-CPMK, penilaian, dan indikator kinerja pada mata kuliah ini, sehingga kesesuaiannya dapat diperiksa untuk keperluan penjaminan mutu dan akreditasi.`,
    analisis: a.temuan.map((t, i) => `${i + 1}. ${t}`).join('\n'),
    rekomendasi: a.saran.map((t, i) => `${i + 1}. ${t}`).join('\n'),
  };
}
/** Teks ACP yang dipakai dokumen: isian tersimpan bila ada, selain itu hasil susunan otomatis dari RPS dan kurikulum. */
export function acpEfektif(m, r) {
  const g = susunAcp(m, r), s = (r && r.acp) || {};
  return { pengantar: String(s.pengantar || '').trim() || g.pengantar, analisis: String(s.analisis || '').trim() || g.analisis, rekomendasi: String(s.rekomendasi || '').trim() || g.rekomendasi };
}
/** Menyimpan hasil susunan otomatis ACP pada salinan RPS agar dosen dapat menyuntingnya. */
export function lengkapiAcp(m, r0, timpa) {
  const r = JSON.parse(JSON.stringify(r0)); delete r.cadangan; const g = susunAcp(m, r); r.acp = r.acp || {}; let n = 0;
  ['pengantar', 'analisis', 'rekomendasi'].forEach(f => { if (timpa || !String(r.acp[f] || '').trim()) { if (r.acp[f] !== g[f]) { r.acp[f] = g[f]; n++; } } });
  if (n > 0) { r.acpTinjau = true; if (r.acpStatus === 'disahkan') r.acpStatus = 'draf'; }
  return { r, n };
}

/** Pemeriksaan kelengkapan dan keselarasan ACP. */
export function periksaAcp(m, r) {
  const out = [], add = (k, butir, temuan, saran = '') => out.push({ k, butir, temuan, saran });
  if (!r) { add('bad', 'RPS', 'RPS belum dibuat', 'ACP dihitung dari RPS. Buat atau unggah RPS lebih dulu.'); return out; }
  const k = konteksMk(m, r), a = analisisAcp(m, r), tersimpan = !!(r.acp && String(r.acp.analisis || '').trim());
  add(tersimpan ? 'ok' : 'bad', 'Teks ACP tersimpan', tersimpan ? 'Pengantar, temuan, dan rekomendasi tersimpan' : 'Teks ACP belum disimpan oleh dosen', 'Klik Susun ACP otomatis atau Simpan teks ACP agar teks ditinjau dan tersimpan.');
  add(k.cpl.length ? 'ok' : 'bad', 'CPL yang dibebankan', k.cpl.length ? `${k.cpl.length} CPL` : 'Belum ada CPL', 'Prodi menetapkan CPL pada mata kuliah.');
  const lepas = k.cpmk.filter(c => !(c.cpl || []).length); add(!k.cpmk.length ? 'bad' : lepas.length ? 'bad' : 'ok', 'CPMK', !k.cpmk.length ? 'Belum ada CPMK' : lepas.length ? `${lepas.map(c => c.kode).join(', ')} belum dihubungkan ke CPL` : `${k.cpmk.length} CPMK terhubung ke CPL`, 'Rumuskan CPMK dan hubungkan ke CPL.');
  add(k.subs.length ? 'ok' : 'bad', 'Sub-CPMK', k.subs.length ? `${k.subs.length} Sub-CPMK` : 'Belum ada Sub-CPMK', 'Uraikan CPMK menjadi Sub-CPMK.');
  const tak = k.subs.filter(s => { const b = detect(s.teks, k.prak ? 'P' : 'C'); return !b || b.kabur; }); add(tak.length ? 'near' : 'ok', 'Kata kerja Sub-CPMK', tak.length ? `Tanpa kata kerja terukur: ${tak.map(s => s.kode).join(', ')}` : 'Semua memakai kata kerja operasional', 'Awali rumusan dengan kata kerja operasional terukur.');
  const tot = k.pert.reduce((x, p) => x + (+p.bobot || 0), 0); add(Math.abs(tot - 100) < 0.05 ? 'ok' : 'bad', 'Jumlah bobot penilaian', pc(tot), Math.abs(tot - 100) < 0.05 ? '' : 'Sesuaikan bobot pada RPS sampai 100%.');
  const tj = k.subs.filter(s => !k.pert.some(x => !x.ujian && (x.sub || []).includes(s.id))); add(tj.length ? 'bad' : 'ok', 'Sub-CPMK terjadwal', tj.length ? tj.map(s => s.kode).join(', ') + ' belum dijadwalkan' : 'Semua terjadwal', 'Jadwalkan pada RPS.');
  const tu = k.subs.filter(s => !k.pert.some(x => (x.sub || []).includes(s.id) && +x.bobot > 0)); add(tu.length ? 'bad' : 'ok', 'Sub-CPMK terukur', tu.length ? tu.map(s => s.kode).join(', ') + ' belum diukur penilaian berbobot' : 'Semua terukur', 'Hubungkan dengan penilaian berbobot pada RPS.');
  add(k.kaprodi ? 'ok' : 'near', 'Ketua Program Studi', k.kaprodi || 'Nama belum diisi', 'Isi nama Ketua Program Studi pada Data Induk Prodi.');
  add(k.pengampu.length ? 'ok' : 'near', 'Dosen pengembang', k.pengampu.length ? k.pengampu.join('; ') : 'Belum ada penugasan', 'Prodi menugaskan dosen.');
  const pot = [r.acp && r.acp.pengantar, r.acp && r.acp.analisis, r.acp && r.acp.rekomendasi].filter(t => TERPOTONG.test(String(t || ''))).length; add(pot ? 'bad' : 'ok', 'Teks terpotong atau titik-titik', pot ? 'Ada pada isian ACP' : 'Tidak ada', pot ? 'Lengkapi kalimat yang berakhir "..." atau "…".' : '');
  add(r.acpTinjau ? 'near' : 'ok', 'Peninjauan dosen', r.acpTinjau ? 'Teks hasil susunan otomatis belum disetujui dosen' : 'Sudah ditinjau', r.acpTinjau ? 'Baca, sunting bila perlu, lalu setujui.' : '');
  void a; void rentang;
  return out;
}
