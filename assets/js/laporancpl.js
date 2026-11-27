/* KUREKAM · Laporan Evaluasi Capaian CPL dalam Word: metode, hasil, matriks CPL × MK, analisis per CPL, rencana tindak lanjut.
   Hanya angka agregat. Analisis memuat draf otomatis yang perlu disunting Kaprodi/GPM sebelum dipakai. */
import { buatDocx, muatBerkas } from './docxlib.js';

const W = 9638;
const f1 = (v) => v == null || !Number.isFinite(v) ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ',');
const STAT = { rencana: 'Direncanakan', berjalan: 'Berjalan', selesai: 'Selesai' };

/** d: { prodi, K (capaianCpl), M ({g, mks, cplAda}), tl, par ({piMinNilai, piMinPersen}), tglCetak } → Blob .docx */
export async function laporanCplWord(d) {
  const { prodi, K, M, tl, par } = d, B = [], logo = await muatBerkas('assets/img/logo-pem-akamigas.png');
  const nama = prodi.nama || prodi.id;
  B.push({ k: 'p', t: '**LAPORAN EVALUASI CAPAIAN PEMBELAJARAN LULUSAN (CPL)**', al: 'c', sz: 28, sb: 120 },
    { k: 'p', t: `**Program Studi ${nama}**`, al: 'c', sz: 24 }, { k: 'p', t: `Politeknik Energi dan Mineral Akamigas · ${d.tglCetak}`, al: 'c', sz: 20, sa: 200 });

  B.push({ k: 'h', lvl: 1, t: '1. Maksud dan Metode', sz: 24 },
    { k: 'p', t: `Laporan ini merangkum ketercapaian CPL program studi sebagai bahan evaluasi kurikulum dan perbaikan berkelanjutan. Capaian CPL diukur dari nilai mata kuliah: komponen penilaian dipetakan ke Capaian Pembelajaran Mata Kuliah (CPMK), skor CPMK adalah rata-rata berbobot komponennya, dan skor CPL adalah rata-rata berbobot CPMK yang memuat CPL tersebut.`, al: 'j' },
    { k: 'p', t: `Seorang mahasiswa dinyatakan mencapai suatu CPL bila skornya minimal ${par.piMinNilai}. CPL dinyatakan tercapai bagi program studi bila minimal ${par.piMinPersen}% mahasiswa mencapainya. Data yang dilaporkan hanya berupa angka agregat tanpa identitas mahasiswa.`, al: 'j' });

  B.push({ k: 'h', lvl: 1, t: '2. Hasil Capaian CPL per Angkatan', sz: 24 });
  if (K.hasil.length) {
    const kol = K.angkatan.length ? K.angkatan : [];
    const w0 = 1000, wS = 1500, wa = kol.length ? Math.floor((W - w0 - wS - 3200) / kol.length) : 0;
    B.push({ k: 'tbl', w: [w0, 3200].concat(kol.map(() => wa), [W - w0 - 3200 - wa * kol.length]), sz: 18, head: 1,
      rows: [['CPL', 'Rumusan'].concat(kol.map(a => 'Angkatan ' + a), ['Status'])].concat(K.hasil.map(h => [h.c.kode, h.c.teks || ''].concat(kol.map(a => { const x = h.per.find(q => q.angkatan === a); return x ? f1(x.persen) + '%' : '–'; }), [!h.terukur ? 'Belum diukur' : h.ok ? 'Memenuhi' : 'Di bawah kriteria']))) });
    B.push({ k: 'p', t: `Ringkasan: ${K.terukur.length} dari ${K.hasil.length} CPL telah terukur; ${K.ok.length} memenuhi kriteria ${par.piMinPersen}% dan ${K.bawah.length} di bawah kriteria pada angkatan terbaru.`, sb: 80, al: 'j' });
  } else B.push({ k: 'p', t: 'Belum ada data capaian CPL.' });

  if (M.mks.length) {
    B.push({ k: 'h', lvl: 1, t: '3. Matriks CPL × Mata Kuliah', sz: 24 },
      { k: 'p', t: 'Persentase mahasiswa yang mencapai nilai batas pada tiap CPL di tiap mata kuliah (gabungan semua kelas dan angkatan yang telah dilaporkan).', al: 'j' });
    const n = M.cplAda.length, wk = 3000, wc = Math.floor((W - wk) / Math.max(1, n));
    B.push({ k: 'tbl', w: [W - wc * n].concat(M.cplAda.map(() => wc)), sz: 16, head: 1,
      rows: [['Mata kuliah'].concat(M.cplAda.map(c => c.kode))].concat(M.mks.map(m => [`${m.kode || m.id} ${m.nama}`].concat(M.cplAda.map(c => { const x = M.g[m.id + '|' + c.id]; return x && x.n ? f1(x.lulus / x.n * 100) : '–'; })))) });
  }

  B.push({ k: 'h', lvl: 1, t: '4. Analisis per CPL (draf)', sz: 24 },
    { k: 'p', t: 'Uraian berikut dibuat otomatis dari angka yang tersedia. Mohon disunting dan dilengkapi penyebab serta konteks oleh Kaprodi dan Gugus Penjaminan Mutu sebelum disahkan.', i: true, sz: 18, al: 'j' });
  K.hasil.filter(h => h.terukur).forEach(h => {
    const a = h.akhir, mk = M.mks.map(m => ({ m, x: M.g[m.id + '|' + h.c.id] })).filter(r => r.x && r.x.n).map(r => ({ m: r.m, p: r.x.lulus / r.x.n * 100 })).sort((u, v) => u.p - v.p);
    let t = `**${h.c.kode}** pada angkatan ${a.angkatan} dicapai ${f1(a.persen)}% mahasiswa (${a.lulus} dari ${a.n}), ${h.ok ? 'sehingga memenuhi' : 'sehingga belum memenuhi'} kriteria ${par.piMinPersen}%.`;
    if (mk.length > 1) t += ` Mata kuliah dengan capaian terendah pada CPL ini: ${mk.slice(0, 2).map(r => `${r.m.kode || r.m.id} (${f1(r.p)}%)`).join(', ')}; tertinggi: ${mk[mk.length - 1].m.kode || mk[mk.length - 1].m.id} (${f1(mk[mk.length - 1].p)}%).`;
    else if (mk.length === 1) t += ` Data berasal dari satu mata kuliah (${mk[0].m.kode || mk[0].m.id}); ketercapaian sebaiknya dikonfirmasi dengan mata kuliah lain yang memuat CPL ini.`;
    const per = h.per.slice().sort((u, v) => String(u.angkatan).localeCompare(String(v.angkatan)));
    if (per.length > 1) { const aw = per[0], ak = per[per.length - 1], s = ak.persen - aw.persen; t += ` Dibandingkan angkatan ${aw.angkatan}, capaian ${s >= 0 ? 'naik' : 'turun'} ${f1(Math.abs(s))} poin.`; }
    B.push({ k: 'p', t, al: 'j', sa: 80 });
  });
  if (!K.terukur.length) B.push({ k: 'p', t: 'Belum ada CPL yang terukur.' });

  B.push({ k: 'h', lvl: 1, t: '5. Rencana Tindak Lanjut', sz: 24 });
  const usul = K.bawah.filter(h => !tl.some(x => x.cpl === h.c.id));
  const rows = tl.map(x => { const c = K.hasil.find(h => h.c.id === x.cpl); return [c ? c.c.kode : 'Umum', x.temuan || '', x.tindakan || '', x.pj || '', x.target || '', STAT[x.status] || x.status || '']; })
    .concat(usul.map(h => [h.c.kode, `Capaian ${f1(h.akhir.persen)}% (angkatan ${h.akhir.angkatan}), di bawah kriteria ${par.piMinPersen}%.`, '(Diisi: tindakan perbaikan)', '(Diisi)', '(Diisi)', 'Usulan']));
  if (rows.length) B.push({ k: 'tbl', w: [900, 2600, 2900, 1300, 1000, W - 8700], sz: 17, head: 1, rows: [['CPL', 'Temuan', 'Tindakan perbaikan', 'Penanggung jawab', 'Target', 'Status']].concat(rows) });
  else B.push({ k: 'p', t: 'Seluruh CPL terukur memenuhi kriteria dan belum ada catatan tindak lanjut.' });
  B.push({ k: 'p', t: '', sz: 10 }, { k: 'p', t: 'Baris berstatus "Usulan" dibuat otomatis untuk CPL di bawah kriteria yang belum memiliki catatan tindak lanjut di aplikasi.', i: true, sz: 17 });

  return buatDocx({ blocks: B, logo, landscape: false, margin: 1134, footer: `Laporan Evaluasi CPL ${prodi.id} · PEM Akamigas`, judul: `Laporan Evaluasi CPL ${prodi.id}` });
}
