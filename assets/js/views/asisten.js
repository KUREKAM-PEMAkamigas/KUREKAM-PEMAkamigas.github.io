/* KUREKAM · Asisten (pemandu dan generator) kurikulum dan RPS.
   Generator berbasis aturan: menyusun kerangka dan rumusan awal sesuai Buku Pedoman, SN Dikti,
   LAM Teknik, IABEE, dan Taksonomi Bloom. Hasilnya selalu berstatus usulan dan bisa diedit.
   Isi keilmuan (pokok bahasan, pustaka, penelitian) tetap berasal dari dosen dan prodi. */
import { S, ctx, can, save, saveMany, addLog, esc, icon, toast, uid, openDrawer, rerender } from '../app.js';
import { KELOMPOK, APP } from '../config.js';
import { PRODI_DEF, CPL_T, PL_CPL, GBK, BOK, SPEC_CPL, VERB, OBJ, SUBV, KUNCI, ROT, SCI_SMT, kelompokKunci } from '../seed.js';
import { detect, ANJURAN_SMT } from '../bloom.js';
import { param, struktur, trace, progres, cekStruktur, cekTrace, byProdi, sksOf, durasi, rpsOf, integrasiOf, fmt } from '../rules.js';
import { head, bar, pctColor, kTag, tanya, prodiName, ro } from './ui.js';

const pad = (n) => String(n).padStart(2, '0');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const prakOf = (m) => +m.P > +m.T;
const akad = (m) => !/magang|tugas akhir/i.test(m.kel);
const tanpaMampu = (t) => String(t || '').replace(/^\s*mampu\s+/i, '').replace(/\.\s*$/, '');
const frasa = (w, m) => { const o = OBJ[w] || (w === 'menyebutkan' ? 'pokok-pokok' : ''), n = m.nama.toLowerCase(); return `${w} ${/^prakti/.test(n) && /^(praktik|peralatan pada)$/.test(o) ? (o === 'praktik' ? '' : 'peralatan') : o} ${n}`.replace(/\s+/g, ' '); };
const CONTOH = /\[[^\]]{3,}\]/;   // isian contoh generator yang belum diganti
const KAT = Object.fromEntries(KELOMPOK.map(k => [k.id, k.iabee]));

/* =====================================================================
   A. CPMK dan Sub-CPMK
   ===================================================================== */
export function usulCpmk(m) {
  const prak = prakOf(m), smt = /capstone design iii/i.test(m.nama) ? 8 : m.smt;
  let verbs = (prak ? VERB.p : VERB.t)[smt] || VERB.t[6];
  if (/capstone/i.test(m.nama)) verbs = ['merancang', 'mengevaluasi'];
  const n = sksOf(m) <= 1 ? 1 : 2, cpl = m.cpl || [];
  return Array.from({ length: n }, (_, i) => {
    const v = verbs[i];
    return { id: uid(`${m.id}-CPMK`), mk: m.id, prodi: m.prodi, kode: `CPMK${i + 1}`, usul: true, cpl: cpl.length ? [cpl[i % cpl.length]] : [],
      teks: `Mampu ${frasa(v, m)}${prak ? ' sesuai prosedur dan kaidah K3' : ''}.` };
  });
}
export function usulSub(m, c) {
  const v = (tanpaMampu(c.teks).split(/\s+/)[0] || '').toLowerCase(), sv = SUBV[v] || [v || 'menjelaskan', v || 'menerapkan'];
  const no = (String(c.kode).match(/\d+/) || ['1'])[0];
  return sv.map((w, j) => ({ id: uid(`${c.id}-S`), cpmk: c.id, mk: m.id, prodi: m.prodi, kode: `Sub-CPMK${no}.${j + 1}`, bobot: 0, usul: true,
    teks: `Mampu ${frasa(w, m)}: [pokok bahasan ${j + 1}].` }));
}
function ratakanBobotSub(subs) { if (!subs.length) return; const b = Math.floor(100 / subs.length); subs.forEach((s, i) => { s.bobot = i === subs.length - 1 ? 100 - b * (subs.length - 1) : b; }); }

/* =====================================================================
   B. Asisten RPS
   ===================================================================== */
const AC = { rps: 'Komponen RPS menurut SN Dikti dan LAM Teknik butir 15', obe: 'Kurikulum OBE, IABEE kriteria 1 dan 2', bloom: 'Taksonomi Bloom, Buku Pedoman', pedoman: 'Buku Pedoman Kurikulum 2027', integ: 'SN Dikti standar proses, LAM Teknik (penelitian dan PkM)', vokasi: 'Karakter vokasi, IKU pembelajaran berbasis kasus dan proyek' };

/** Memeriksa satu RPS. Mengembalikan daftar temuan { k, butir, temuan, saran, acuan }. */
export function periksaRps(m, r) {
  const P = param(S), out = [], add = (k, butir, temuan, saran, acuan) => out.push({ k, butir, temuan, saran, acuan });
  const cp = S.cpmk.filter(c => c.mk === m.id), subs = S.sub.filter(s => s.mk === m.id), hint = prakOf(m) ? 'P' : 'C';
  const peng = S.tugas.filter(t => t.mk === m.id);
  add(peng.length ? 'ok' : 'near', 'Dosen pengampu', peng.length ? `${peng.length} penugasan` : 'Belum ada penugasan dosen', 'Tim Kurikulum Prodi menugaskan dosen di menu Penugasan dan Beban Dosen.', AC.rps);
  add((m.cpl || []).length ? 'ok' : 'bad', 'CPL yang dibebankan', (m.cpl || []).length ? `${m.cpl.length} CPL` : 'Mata kuliah belum dibebani CPL', 'CPL ditetapkan Tim Kurikulum Prodi di menu Mata Kuliah atau Matriks Keterlacakan.', AC.obe);
  /* CPMK */
  if (!cp.length) add('bad', 'CPMK', 'Belum ada CPMK', 'CPMK dirumuskan Tim Kurikulum Prodi. Asisten dapat membuat usulan dari CPL dan tingkat semester.', AC.obe);
  else {
    const tak = cp.filter(c => { const b = detect(c.teks, hint); return !b || b.kabur; }), lepas = cp.filter(c => !(c.cpl || []).length);
    add(tak.length ? 'bad' : 'ok', 'Kata kerja CPMK', tak.length ? `${tak.length} CPMK tanpa kata kerja operasional terukur: ${tak.map(c => c.kode).join(', ')}` : 'Semua CPMK memakai kata kerja operasional', 'Awali dengan KKO terukur, misalnya menerapkan, menganalisis, mengoperasikan. Hindari memahami dan mengetahui.', AC.bloom);
    add(lepas.length ? 'bad' : 'ok', 'CPMK terhubung ke CPL', lepas.length ? `${lepas.length} CPMK belum dihubungkan ke CPL: ${lepas.map(c => c.kode).join(', ')}` : 'Semua CPMK terhubung', 'Setiap CPMK mendukung paling sedikit satu CPL yang dibebankan.', AC.obe);
    const rg = ANJURAN_SMT[m.smt], lv = cp.map(c => detect(c.teks, hint)).filter(b => b && b.d === 'C').map(b => b.n);
    if (rg && lv.length) { const mx = Math.max(...lv); add(mx < rg[0] ? 'near' : 'ok', 'Tingkat kognitif', `Tertinggi C${mx}, anjuran semester ${m.smt} C${rg[0]} sampai C${rg[1]}`, mx < rg[0] ? 'Naikkan paling sedikit satu CPMK ke tingkat yang dianjurkan agar progresi antarsemester terjaga.' : '', AC.bloom); }
  }
  /* Sub-CPMK */
  if (!subs.length) add('bad', 'Sub-CPMK', 'Belum ada Sub-CPMK', 'Uraikan tiap CPMK menjadi kemampuan akhir per tahap belajar. Asisten dapat membuat usulan.', AC.rps);
  else {
    const tot = subs.reduce((a, s) => a + (+s.bobot || 0), 0);
    add(Math.abs(tot - 100) > 0.5 ? 'bad' : 'ok', 'Bobot Sub-CPMK', `Total ${fmt(tot, 1)}%`, Math.abs(tot - 100) > 0.5 ? 'Jumlah bobot Sub-CPMK harus 100%.' : '', AC.pedoman);
  }
  if (!r) { add('bad', 'Rencana pertemuan', 'RPS belum dibuat', 'Buat RPS 16 pertemuan, unggah RPS lama dari Word, atau pakai isi otomatis.', AC.rps); return out; }
  const per = r.pertemuan || [], non = per.filter(p => !p.ujian);
  add(per.length === 16 ? 'ok' : 'bad', 'Jumlah pertemuan', `${per.length} pertemuan`, per.length === 16 ? '' : 'Satu semester 16 pertemuan termasuk UTS (pertemuan 8) dan UAS (pertemuan 16).', AC.pedoman);
  add(per.some(p => p.ujian === 'UTS') && per.some(p => p.ujian === 'UAS') ? 'ok' : 'bad', 'UTS dan UAS', per.filter(p => p.ujian).map(p => `${p.ujian} pertemuan ${p.m}`).join(', ') || 'Belum ada', 'Tandai pertemuan 8 sebagai UTS dan pertemuan 16 sebagai UAS.', AC.pedoman);
  const kosong = (f) => non.filter(p => !String(p[f] || '').trim()).map(p => p.m);
  [['materi', 'Bahan kajian atau materi', 'bad', 'Isi pokok bahasan tiap pertemuan.'], ['metode', 'Metode dan bentuk pembelajaran', 'bad', 'Sebut bentuk (kuliah, praktikum, praktik lapangan) dan metodenya.'], ['indikator', 'Indikator penilaian', 'near', 'Tulis bukti terukur ketercapaian Sub-CPMK.'], ['asesmen', 'Kriteria dan teknik asesmen', 'near', 'Sebut kriteria (rubrik) dan tekniknya (tes, unjuk kerja, laporan).']].forEach(([f, n, k, s]) => {
    const z = kosong(f); add(z.length ? k : 'ok', n, z.length ? `Kosong di pertemuan ${z.join(', ')}` : 'Terisi di semua pertemuan', z.length ? s : '', AC.rps);
  });
  const tanpaSub = non.filter(p => !(p.sub || []).length).map(p => p.m), belum = subs.filter(s => !per.some(p => (p.sub || []).includes(s.id)));
  add(tanpaSub.length ? 'near' : 'ok', 'Pertemuan terhubung Sub-CPMK', tanpaSub.length ? `Belum terhubung di pertemuan ${tanpaSub.join(', ')}` : 'Semua terhubung', tanpaSub.length ? 'Pilih Sub-CPMK yang dicapai di tiap pertemuan.' : '', AC.obe);
  if (subs.length) add(belum.length ? 'bad' : 'ok', 'Sub-CPMK terjadwal', belum.length ? `${belum.length} Sub-CPMK belum dijadwalkan: ${belum.map(s => s.kode).join(', ')}` : 'Semua Sub-CPMK terjadwal', belum.length ? 'Setiap Sub-CPMK harus muncul paling sedikit di satu pertemuan.' : '', AC.obe);
  const bobot = per.reduce((a, p) => a + (+p.bobot || 0), 0);
  add(Math.abs(bobot - 100) > 0.5 ? 'bad' : 'ok', 'Bobot penilaian', `Total ${fmt(bobot, 1)}%`, Math.abs(bobot - 100) > 0.5 ? 'Jumlah bobot seluruh pertemuan termasuk UTS dan UAS harus 100%. Pakai tombol Sesuaikan bobot.' : '', AC.rps);
  [['deskripsi', 'Deskripsi mata kuliah', 'bad'], ['bahan', 'Bahan kajian', 'near'], ['pustaka', 'Pustaka', 'bad']].forEach(([f, n, k]) => add(String(r[f] || '').trim() && !/^diisi dosen/i.test(r[f]) ? 'ok' : k, n, String(r[f] || '').trim() && !/^diisi dosen/i.test(r[f]) ? 'Terisi' : 'Belum diisi', f === 'pustaka' ? 'Tulis pustaka utama dan pendukung. Asisten tidak mengarang pustaka.' : 'Bisa diisi otomatis lalu disunting.', AC.rps));
  if (String(r.pustaka || '').trim()) { const th = (r.pustaka.match(/\b(19|20)\d{2}\b/g) || []).map(Number), now = new Date().getFullYear(); if (th.length && !th.some(y => y >= now - 10)) add('near', 'Kemutakhiran pustaka', `Terbitan terbaru ${Math.max(...th)}`, 'Tambahkan paling sedikit satu pustaka atau standar terbitan sepuluh tahun terakhir.', AC.rps); }
  const ni = integrasiOf(r), min = P.integrasiMinPertemuan || 2;
  add(ni >= min ? 'ok' : 'near', 'Integrasi penelitian dan PKM', `${ni} pertemuan, minimal ${min}`, ni >= min ? '' : 'Pilih pertemuan yang memakai hasil penelitian dosen sebagai bahan ajar atau melibatkan mahasiswa di PKM, lalu isi judulnya di Deskripsi dan pustaka.', AC.integ);
  const aktif = non.some(p => /kasus|case|proyek|project|problem|pbl|praktik|praktikum|simulasi/i.test(`${p.metode} ${p.tatap || ''}`));
  add(aktif ? 'ok' : 'near', 'Pembelajaran aktif', aktif ? 'Ada metode kasus, proyek, atau praktik' : 'Belum ada metode kasus, proyek, atau praktik', aktif ? '' : 'Masukkan case method, team-based project, atau praktik terbimbing pada beberapa pertemuan.', AC.vokasi);
  const sap = non.filter(p => !(p.sap && String(p.sap.inti || '').trim())).length;
  add(sap ? 'near' : 'ok', 'SAP', sap ? `${sap} pertemuan belum punya SAP` : 'SAP lengkap', sap ? 'Isi pendahuluan, kegiatan inti, penutup, dan media. Bisa diisi otomatis lalu disunting.' : '', AC.pedoman);
  const ctoh = [r.deskripsi, r.bahan, ...per.map(p => `${p.materi} ${p.indikator || ''}`), ...subs.map(s => s.teks), ...cp.map(c => c.teks)].filter(t => CONTOH.test(t || '')).length;
  if (ctoh) add('near', 'Isian contoh generator', `${ctoh} isian masih bertanda kurung siku`, 'Ganti teks dalam kurung siku, misalnya [pokok bahasan 1], dengan isi sebenarnya.', AC.rps);
  return out;
}

/** Mengisi bagian RPS yang kosong. timpa = true menyusun ulang seluruh rencana pertemuan. Mengembalikan { r, cpmk, sub, n }. */
export function lengkapiRps(m, r0, blankRps, timpa) {
  const P = param(S), prak = prakOf(m), campur = +m.T > 0 && +m.P > 0, dur = durasi(m, P);
  let n = 0; const baruC = [], baruS = [];
  let cp = S.cpmk.filter(c => c.mk === m.id);
  if (!cp.length && can('susun', { prodi: m.prodi })) { cp = usulCpmk(m); baruC.push(...cp); n += cp.length; }
  let subs = S.sub.filter(s => s.mk === m.id);
  cp.filter(c => !subs.some(s => s.cpmk === c.id)).forEach(c => { const u = usulSub(m, c); baruS.push(...u); n += u.length; });
  if (baruS.length) { subs = subs.concat(baruS); if (subs.every(s => !(+s.bobot))) ratakanBobotSub(subs); }
  const r = JSON.parse(JSON.stringify(r0 || blankRps(m)));
  const isi = (o, k, v) => { if (v && (timpa || !String(o[k] || '').trim() || /^diisi dosen/i.test(o[k]))) { if (o[k] !== v) { o[k] = v; n++; } } };
  const cplKode = (m.cpl || []).map(id => (S.cpl.find(c => c.id === id) || {}).kode).filter(Boolean);
  isi(r, 'deskripsi', `Mata kuliah ${m.nama} (${m.T} SKS teori dan ${m.P} SKS praktik) diberikan pada semester ${m.smt}. Setelah mengikuti mata kuliah ini mahasiswa mampu ${cp.map(c => tanpaMampu(c.teks).replace(/^./, x => x.toLowerCase())).join(' serta ') || '[rumuskan kemampuan akhir]'}.${cplKode.length ? ` Mata kuliah ini mendukung ${cplKode.join(', ')}.` : ''}`);
  isi(r, 'bahan', [...(m.bk || []).map(id => (S.bk.find(b => b.id === id) || {}).nama).filter(Boolean), ...subs.map(s => tanpaMampu(s.teks))].join('; '));
  isi(r, 'syarat', (m.prasyarat || []).map(id => (S.mk.find(x => x.id === id) || {}).nama).filter(Boolean).join(', '));
  /* sebaran Sub-CPMK pada 14 pertemuan non-ujian, sebanding bobotnya */
  const non = r.pertemuan.filter(p => !p.ujian), urut = [];
  if (subs.length) { const tot = subs.reduce((a, s) => a + (+s.bobot || 1), 0) || 1; let acc = 0; subs.forEach((s, i) => { acc += (+s.bobot || 1) / tot * non.length; const sampai = i === subs.length - 1 ? non.length : Math.max(urut.length + 1, Math.round(acc)); while (urut.length < sampai && urut.length < non.length) urut.push(s); }); }
  const METT = ['Kuliah interaktif dan diskusi kelompok', 'Case method: pembahasan kasus lapangan migas', 'Kuliah interaktif, latihan terbimbing, dan diskusi', 'Team-based project: pengerjaan dan presentasi tugas kelompok'];
  non.forEach((p, i) => {
    const s = urut[i], topik = s ? tanpaMampu(s.teks) : '';
    if (timpa || !(p.sub || []).length) { if (s) { p.sub = [s.id]; n++; } }
    const s0 = S.sub.concat(baruS).find(x => x.id === (p.sub || [])[0]) || s, tp = s0 ? tanpaMampu(s0.teks) : topik;
    const met = prak ? 'Praktik terbimbing di laboratorium atau bengkel: demonstrasi, praktik berkelompok, dan pembahasan hasil' : campur ? `${METT[i % 4]}, dilanjutkan praktik terbimbing` : METT[i % 4];
    isi(p, 'materi', tp ? tp.replace(/^./, x => x.toUpperCase()) : '');
    isi(p, 'metode', met);
    isi(p, 'indikator', tp ? `Ketepatan dan kelengkapan dalam ${tp}` : '');
    isi(p, 'asesmen', prak || campur ? 'Kriteria: rubrik unjuk kerja dan kepatuhan K3. Teknik: observasi praktik dan laporan' : `Kriteria: rubrik penilaian dan kunci jawaban. Teknik: ${i % 2 ? 'tugas tertulis' : 'kuis'}`);
    isi(p, 'tatap', `Bentuk: ${prak ? 'praktikum' : campur ? 'kuliah dan praktikum' : 'kuliah'}. Metode: ${met.toLowerCase()}. Waktu: ${+m.T ? `teori ${m.T} x ${P.menitTeori} menit` : ''}${campur ? ' dan ' : ''}${+m.P ? `praktik ${m.P} x ${dur} menit` : ''}. Penugasan terstruktur dan belajar mandiri sesuai topik pertemuan.`);
    p.sap = p.sap || {};
    isi(p.sap, 'pendahuluan', `Apersepsi${prak || campur ? ', pengarahan K3,' : ''} dan penyampaian tujuan pertemuan (10 menit)`);
    isi(p.sap, 'inti', prak ? 'Demonstrasi oleh dosen, praktik berkelompok, pengamatan dan pencatatan data, pembahasan hasil' : campur ? 'Penjelasan konsep, contoh penerapan, lalu praktik terbimbing dan pencatatan hasil' : 'Penjelasan konsep, contoh soal, dan diskusi kasus lapangan');
    isi(p.sap, 'penutup', 'Rangkuman, umpan balik, dan penugasan (10 menit)');
    isi(p.sap, 'media', prak || campur ? 'Peralatan laboratorium, lembar kerja, alat pelindung diri' : 'Proyektor, modul ajar, LMS');
  });
  r.pertemuan.filter(p => p.ujian).forEach(p => { if (timpa || !(p.sub || []).length) p.sub = subs.map(s => s.id); });
  /* bobot: hanya bila pertemuan non-ujian belum berbobot sama sekali */
  if (timpa || non.every(p => !(+p.bobot))) {
    r.pertemuan.filter(p => p.ujian).forEach(p => { if (timpa || !(+p.bobot)) p.bobot = p.ujian === 'UTS' ? 20 : 25; });
    const sisa = 100 - r.pertemuan.filter(p => p.ujian).reduce((a, p) => a + (+p.bobot || 0), 0), b = Math.floor(sisa / non.length * 10) / 10;
    non.forEach((p, i) => { p.bobot = i === non.length - 1 ? Math.round((sisa - b * (non.length - 1)) * 10) / 10 : b; }); n++;
  }
  return { r, cpmk: baruC, sub: baruS, semuaSub: subs, n };
}
function sesuaikanBobot(r) {
  const tot = r.pertemuan.reduce((a, p) => a + (+p.bobot || 0), 0); if (!tot) return false;
  let acc = 0; r.pertemuan.forEach((p, i) => { p.bobot = i === r.pertemuan.length - 1 ? Math.round((100 - acc) * 10) / 10 : Math.round((+p.bobot || 0) / tot * 1000) / 10; acc += p.bobot; });
  return true;
}

const tabelTemuan = (ck) => `<div class="tbl-wrap" style="max-height:52vh"><table class="tbl"><thead><tr><th>Butir</th><th>Temuan</th><th>Saran pengisian</th><th>Acuan</th><th>Status</th></tr></thead><tbody>${ck.map(c => `<tr><td><b>${esc(c.butir)}</b></td><td>${esc(c.temuan)}</td><td class="small">${esc(c.k === 'ok' ? '' : c.saran)}</td><td class="small muted">${esc(c.acuan)}</td><td>${kTag(c.k)}</td></tr>`).join('')}</tbody></table></div>`;

/** Laci Asisten RPS. blankRps disuplai halaman RPS agar bentuk data seragam. */
export function bukaAsistenRps(m, draw, blankRps) {
  const r = rpsOf(S, m.id), ck = periksaRps(m, r);
  const boleh = can('rps', { prodi: m.prodi, mk: m.id }) && (!r || r.status !== 'disahkan' || ctx.role !== 'dosen');
  const n = { ok: ck.filter(c => c.k === 'ok').length, near: ck.filter(c => c.k === 'near').length, bad: ck.filter(c => c.k === 'bad').length };
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('spark')}</span><div><h3>Asisten RPS</h3><div class="sub">${esc(m.nama)} · semester ${m.smt} · ${m.T}T + ${m.P}P</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="legend" style="margin:6px 0 10px"><span><i class="dot" style="--c:#10b981"></i>${n.ok} sesuai</span><span><i class="dot" style="--c:#f5a524"></i>${n.near} perlu perhatian</span><span><i class="dot" style="--c:#f0616d"></i>${n.bad} belum sesuai</span></div>
    ${tabelTemuan(ck)}
    <p class="small muted" style="margin-top:10px">Isi otomatis menyusun kerangka sesuai aturan (16 pertemuan, sebaran Sub-CPMK, metode, asesmen, bobot, SAP). Pokok bahasan, pustaka, serta judul penelitian dan PKM tetap diisi dosen. Semua hasil bisa disunting dengan mengklik baris pertemuan.</p>
    <div class="drawer-act">${boleh ? `<button class="btn pri" id="as-isi">${icon('spark')} Isi otomatis bagian yang kosong</button><button class="btn" id="as-bobot">Sesuaikan bobot ke 100%</button><button class="btn danger" id="as-ulang">Susun ulang seluruh pertemuan</button>` : ro()}<div class="sp"></div><button class="btn ghost" data-close>Tutup</button></div>`, (dr) => {
    const jalankan = async (timpa) => {
      const h = lengkapiRps(m, r, blankRps, timpa);
      if (h.cpmk.length) await saveMany('cpmk', h.cpmk);
      if (h.sub.length) await saveMany('sub', h.semuaSub);
      if (h.r.status === 'disahkan') h.r.status = 'draf';
      await save('rps', h.r, `Asisten RPS ${timpa ? 'menyusun ulang' : 'melengkapi'} ${m.nama}`);
      toast(h.n ? `${h.n} isian ditambahkan sebagai usulan. Silakan tinjau dan sunting.` : 'Tidak ada bagian kosong yang bisa diisi otomatis.');
      draw(); bukaAsistenRps(m, draw, blankRps);
    };
    const q = (s) => dr.querySelector(s);
    if (q('#as-isi')) q('#as-isi').onclick = () => jalankan(false);
    if (q('#as-ulang')) q('#as-ulang').onclick = async () => { if (await tanya('Seluruh rencana pertemuan, bobot, dan SAP mata kuliah ini diganti dengan usulan baru. Deskripsi dan bahan kajian juga ditulis ulang. Pustaka tidak diubah. Lanjutkan?', 'Susun ulang')) jalankan(true); };
    if (q('#as-bobot')) q('#as-bobot').onclick = async () => { if (!r) { toast('RPS belum dibuat.'); return; } if (!sesuaikanBobot(r)) { toast('Bobot masih kosong. Pakai isi otomatis.'); return; } if (r.status === 'disahkan') r.status = 'draf'; await save('rps', r, `Sesuaikan bobot RPS ${m.nama}`); draw(); bukaAsistenRps(m, draw, blankRps); };
  }, true);
}

/* =====================================================================
   C. Asisten Kurikulum (halaman untuk Tim Kurikulum Prodi)
   ===================================================================== */
const defProdi = (pid) => PRODI_DEF.find(p => p.id === pid);
const bidangOf = (p) => (p && p.bidang) || (defProdi(p && p.id) || {}).d || '';

/** MK kunci institusi yang seharusnya ada di prodi ini: [smt, nama, T, P, jenis]. */
function kunciProdi(pid) {
  const out = [];
  Object.entries(KUNCI).forEach(([s, a]) => a.forEach(([n, T, Pp, jk]) => out.push([+s, n, T, Pp, jk])));
  ROT.forEach(([n, T, Pp, a, sa, b, sb]) => { if (a.includes(pid)) out.push([sa, n, T, Pp, 'Kunci bergilir']); else if (b.includes(pid)) out.push([sb, n, T, Pp, 'Kunci bergilir']); });
  Object.entries(SCI_SMT[pid] || {}).forEach(([n, [s, T, Pp]]) => out.push([s, n, T, Pp, 'Kunci prodi']));
  return out;
}
const kodeBaru = (pid, smt, tambah = 0) => { const no = byProdi(S.mk, pid).reduce((a, m) => Math.max(a, +(String(m.kode).match(/(\d{2})$/) || [0, 0])[1]), 0) + 1 + tambah; return `${pid}${smt}${pad(no % 100)}`; };
const mkBaru = (pid, o, i) => ({ id: uid(`${pid}-MK`), prodi: pid, kode: kodeBaru(pid, o.smt, i), prasyarat: [], lokasi: +o.P > +o.T ? 'Laboratorium' : 'Kampus', kunci: '', bk: [], cpl: [], usul: true, kat: KAT[o.kel], ...o });

const GEN = {
  async visi(pid, bidang) {
    const p = S.prodi.find(x => x.id === pid), d = defProdi(pid); let n = 0;
    if (bidang && p.bidang !== bidang) { p.bidang = bidang; n++; }
    if (!String(p.visiKeilmuan || '').trim()) { p.visiKeilmuan = `Menjadi program studi sarjana terapan yang unggul dalam ${bidang}, berwawasan keselamatan dan transisi energi, serta diakui industri nasional dan internasional pada tahun 2035.`; n++; }
    if (n) await save('prodi', p);
    if (!byProdi(S.pl, pid).length) {
      const nama = (d && d.pl) || ['Teknolog atau tenaga ahli terapan', 'Supervisor operasi lapangan', 'Perencana dan technopreneur'];
      const pl = nama.map((x, i) => ({ id: `${pid}-PL${i + 1}`, prodi: pid, kode: `PL${i + 1}`, nama: x, usul: true, teks: `Lulusan berperan sebagai ${x.toLowerCase()} yang kompeten, berintegritas, dan mampu beradaptasi dengan teknologi di bidang ${bidang}.` }));
      await saveMany('pl', pl); n += pl.length;
    }
    return n;
  },
  async cpl(pid, bidang) {
    const ada = byProdi(S.cpl, pid), pl = byProdi(S.pl, pid).sort((a, b) => a.kode.localeCompare(b.kode));
    const ranahAda = new Set(ada.map(c => c.ranah));
    const baru = CPL_T.filter(([ranah, k]) => !ada.length || (!ranahAda.has(ranah) && !ada.some(c => c.kode === k)))
      .map(([ranah, k, t, ia]) => ({ id: `${pid}-${k}${ada.some(c => c.id === `${pid}-${k}`) ? '-' + uid('u') : ''}`, prodi: pid, kode: k, ranah, teks: t.replace('{d}', bidang), iabee: ia, usul: true, pl: PL_CPL.map((a, i) => a.includes(k) && pl[i] ? pl[i].id : null).filter(Boolean) }));
    if (baru.length) await saveMany('cpl', baru);
    /* CPL lama yang belum terhubung profil lulusan dihubungkan ke profil pertama */
    return baru.length;
  },
  async bk(pid) {
    let n = 0; const d = defProdi(pid), p = S.prodi.find(x => x.id === pid);
    if (!byProdi(S.bok, pid).length) { const b = BOK.map(([nm, s], i) => ({ id: `${pid}-BOK${i + 1}`, prodi: pid, kode: `BOK${i + 1}`, nama: i === 2 ? `Keilmuan Inti ${p.nama}` : nm, sumber: s, usul: true })); await saveMany('bok', b); n += b.length; }
    if (!byProdi(S.bk, pid).length) {
      const bok = byProdi(S.bok, pid).sort((a, b) => a.kode.localeCompare(b.kode)), cid = (k) => (byProdi(S.cpl, pid).find(c => c.kode === k) || {}).id;
      const bid = (i) => (bok[i - 1] || bok[0] || {}).id || '';
      const bk = GBK.map(([nm, b, c], i) => ({ id: `${pid}-BK${pad(i + 1)}`, prodi: pid, kode: `BK${pad(i + 1)}`, nama: nm, bok: bid(b), kedalaman: ['C3', 'C2', 'C3', 'A3', 'C6', 'C4'][i], cpl: c.map(cid).filter(Boolean), usul: true }));
      ((d && d.bk) || []).forEach(([nm, b], i) => bk.push({ id: `${pid}-BK${pad(i + 7)}`, prodi: pid, kode: `BK${pad(i + 7)}`, nama: nm, bok: bid(b), kedalaman: b === 2 ? 'C3' : (i % 2 ? 'C5' : 'C4'), cpl: (SPEC_CPL[i] || []).map(cid).filter(Boolean), usul: true }));
      await saveMany('bk', bk); n += bk.length;
    }
    return n;
  },
  async kunci(pid) {
    const ada = new Set(byProdi(S.mk, pid).map(m => norm(m.nama))), bk = byProdi(S.bk, pid);
    const cariBk = (n) => { const s = n.toLowerCase(); const rx = s.includes('k3') ? /k3/i : /matematika|statistika/.test(s) ? /matematika/i : /fisika|kimia|termodinamika|mekanika fluida|rangkaian/.test(s) ? /sains/i : /capstone|tugas akhir/.test(s) ? /perancangan|proyek/i : /magang/.test(s) ? /manajemen/i : /karakter|kebangsaan/i; return bk.find(b => rx.test(b.nama)); };
    const baru = kunciProdi(pid).filter(([, n]) => !ada.has(norm(n))).map(([smt, nama, T, Pp, jk], i) => { const b = cariBk(nama); return mkBaru(pid, { smt, nama, T, P: Pp, kel: kelompokKunci(nama), kunci: jk, bk: b ? [b.id] : [], cpl: b ? (b.cpl || []).slice(0, 2) : [], ...(/magang/i.test(nama) ? { lokasi: 'Industri' } : {}) }, i); });
    if (baru.length) await saveMany('mk', baru);
    return baru.length;
  },
  /** Mengisi sisa ruang SKS semester 1 sampai 6 dengan slot MK usulan bernama bahan kajian inti prodi. */
  async slot(pid) {
    const P = param(S), R = struktur(S, pid), bok = byProdi(S.bok, pid);
    const inti = byProdi(S.bk, pid).filter(b => !GBK.some(([n]) => n === b.nama));
    const baru = []; let bi = 0, adaTi = R.ti > 0;
    for (let s = 1; s <= 6; s++) {
      const k = P.kerangka[s], x = R.smt[s]; if (!k || k[1] == null) continue;
      let Tt = Math.round((k[1] + k[2]) / 2); if (k[0] - Tt > k[4]) Tt = k[0] - k[4]; if (k[0] - Tt < k[3]) Tt = k[0] - k[3];
      const perlu = k[0] - x.sks; if (perlu <= 0) continue;
      let remT = Math.min(perlu, Math.max(0, Tt - x.T)), remP = perlu - remT;
      const lebih = x.P + remP - k[4]; if (lebih > 0) { remP -= lebih; remT += lebih; }
      /* MK teori 2 SKS dan MK praktik 1 sampai 2 SKS dipisah; digabung bila melebihi batas jumlah MK, dipecah bila kurang */
      const slots = []; let t = remT, q = remP;
      while (t > 0) { const a = t === 3 ? 3 : Math.min(2, t); slots.push([a, 0]); t -= a; }
      while (q > 0) { const a = q === 3 ? 3 : Math.min(2, q); slots.push([0, a]); q -= a; }
      while (x.n + slots.length > k[6]) { const i = slots.findIndex(z => z[0] && !z[1]), j = slots.findIndex(z => z[1] && !z[0]); if (i < 0 || j < 0) break; slots[i] = [slots[i][0], slots[j][1]]; slots.splice(j, 1); }
      while (x.n + slots.length < k[5]) { const j = slots.findIndex(z => !z[0] && z[1] >= 2); if (j < 0) break; const v = slots[j][1]; slots.splice(j, 1, [0, v - 1], [0, 1]); }
      let it = 0, ip = 0, no = 0; const awal = bi;
      slots.forEach(([T, Pp]) => {
        const b = inti.length ? inti[(awal + (T ? it++ : ip++)) % inti.length] : null, dasar = b && /dasar keteknikan/i.test((bok.find(o => o.id === b.bok) || {}).nama || '');
        no++;
        if (!adaTi && !T && s <= 3) { adaTi = true; baru.push(mkBaru(pid, { smt: s, nama: `[Usulan] Praktik Aplikasi Komputer dan Pemrograman Dasar (S${s}.${no})`, T, P: Pp, kel: 'MBE - basic engineering', kat: 'Teknologi informasi', bk: b ? [b.id] : [], cpl: b ? (b.cpl || []).slice(0, 2) : [] }, baru.length)); return; }
        baru.push(mkBaru(pid, { smt: s, nama: `[Usulan] ${T ? '' : 'Praktik '}${b ? b.nama : 'Mata Kuliah Kompetensi'} (S${s}.${no})`, T, P: Pp, kel: dasar ? 'MBE - basic engineering' : 'MKK - kompetensi penciri', bk: b ? [b.id] : [], cpl: b ? (b.cpl || []).slice(0, 2) : [] }, baru.length));
      });
      bi += Math.max(it, ip);
    }
    if (baru.length) await saveMany('mk', baru);
    return baru.length;
  },
  async lacak(pid) {
    const ubah = [];
    byProdi(S.mk, pid).filter(akad).filter(m => !(m.cpl || []).length && (m.bk || []).length).forEach(m => { const c = Array.from(new Set((m.bk || []).flatMap(id => (S.bk.find(b => b.id === id) || {}).cpl || []))).slice(0, 3); if (c.length) { m.cpl = c; ubah.push(m); } });
    if (ubah.length) await saveMany('mk', ubah);
    const pl = byProdi(S.pl, pid)[0], cu = pl ? byProdi(S.cpl, pid).filter(c => !(c.pl || []).length) : [];
    cu.forEach(c => { c.pl = [pl.id]; }); if (cu.length) await saveMany('cpl', cu);
    return ubah.length + cu.length;
  },
  async cpmk(pid) {
    const mk = byProdi(S.mk, pid).filter(akad), c0 = [], s0 = [];
    mk.filter(m => (m.cpl || []).length && !S.cpmk.some(c => c.mk === m.id)).forEach(m => c0.push(...usulCpmk(m)));
    if (c0.length) await saveMany('cpmk', c0);
    mk.forEach(m => { const cp = S.cpmk.filter(c => c.mk === m.id), lama = S.sub.filter(s => s.mk === m.id), baru = []; cp.filter(c => !lama.some(s => s.cpmk === c.id)).forEach(c => baru.push(...usulSub(m, c))); if (baru.length) { const all = lama.concat(baru); if (all.every(s => !(+s.bobot))) ratakanBobotSub(all); s0.push(...(lama.every(s => !(+s.bobot)) ? all : baru)); } });
    if (s0.length) await saveMany('sub', s0);
    return c0.length + s0.length;
  }
};

let bidangInp = null;
export default function asistenView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid) || {}, ed = can('susun', { prodi: pid });
  const P = param(S), t = trace(S, pid), R = struktur(S, pid), g = progres(S, pid);
  const ck = cekStruktur(S, pid).concat(cekTrace(S, pid)), nb = ck.filter(c => c.k === 'bad').length, nn = ck.filter(c => c.k === 'near').length;
  const bidang = bidangInp != null ? bidangInp : bidangOf(p);
  const ranah = ['S', 'P', 'KU', 'KK'].filter(x => !t.cpl.some(c => c.ranah === x));
  const cplKabur = t.cpl.filter(c => { const b = detect(c.teks, c.ranah === 'S' ? 'A' : 'C'); return !b || b.kabur; });
  const kunci = kunciProdi(pid), adaMk = new Set(t.mk.map(m => norm(m.nama))), kunciKurang = kunci.filter(([, n]) => !adaMk.has(norm(n)));
  const usulMk = t.mk.filter(m => m.usul && CONTOH.test(m.nama)), intiBk = t.bk.filter(b => !GBK.some(([n]) => n === b.nama));
  const smtRows = [1, 2, 3, 4, 5, 6, 7, 8].map(s => { const k = P.kerangka[s], x = R.smt[s]; return { s, k, x, sisa: k[0] - x.sks }; });
  const sisaTot = smtRows.filter(r => r.s <= 6).reduce((a, r) => a + Math.max(0, r.sisa), 0);
  const mkA = t.mk.filter(akad), tanpaCpmk = t.mkNoCpmk.length, rpsAda = mkA.filter(m => rpsOf(S, m.id)).length;
  const st = (ok, near) => kTag(ok ? 'ok' : near ? 'near' : 'bad');
  const li = (a) => a.filter(Boolean).map(x => `<li>${x}</li>`).join('');
  const tombol = (id, teks, aktif = true) => ed ? `<button class="btn pri sm" data-gen="${id}" ${aktif ? '' : 'disabled'}>${icon('spark')} ${teks}</button>` : '';
  const langkah = (no, judul, status, isi, aksi, c) => `<div class="card" style="margin-top:14px"><div class="card-h"><span class="ico-badge" style="--c:${c}"><b>${no}</b></span><div><h3>${judul}</h3></div><div class="sp"></div>${status}</div><ul class="small" style="margin:8px 0 10px 18px;line-height:1.6">${isi}</ul><div class="filters">${aksi}</div></div>`;

  el.innerHTML = `
  <div class="card">${head('Asisten Kurikulum ' + esc(pid), esc(prodiName()) + ' · pemandu langkah demi langkah dan pembuat usulan otomatis', 'spark', '#f5a524', ed ? '' : ro())}
    <p class="small" style="margin:6px 0 10px">Ikuti tujuh langkah di bawah. Di tiap langkah prodi boleh mengisi sendiri lewat menunya, atau menekan tombol usulan otomatis lalu menyunting hasilnya. Usulan otomatis hanya menambah bagian yang masih kosong dan tidak pernah menimpa isian prodi. Rumusan mengikuti Buku Pedoman Kurikulum ${APP.tahunKurikulum}, SN Dikti, LAM Teknik, IABEE, dan Taksonomi Bloom.</p>
    <div class="grid g4 mini">${g.tahap.slice(0, 9).map(x => `<div><small>${x.n}</small><b>${x.v}%</b>${bar(x.v, pctColor(x.v))}</div>`).join('')}</div>
    <div class="field" style="margin-top:12px;max-width:640px"><label>Bidang keahlian prodi (dipakai dalam rumusan visi, profil lulusan, dan CPL)</label><input class="inp" id="as-bidang" value="${esc(bidang)}" placeholder="Contoh: operasi produksi sumur dan fasilitas produksi migas" ${ed ? '' : 'disabled'}></div>
  </div>
  ${langkah(1, 'Visi keilmuan dan profil lulusan', st(String(p.visiKeilmuan || '').trim() && t.pl.length >= 3, t.pl.length > 0), li([
    String(p.visiKeilmuan || '').trim() ? 'Visi keilmuan sudah diisi.' : 'Visi keilmuan belum diisi. Visi keilmuan menyebut kekhasan prodi dan tahun capaian (LAM Teknik butir 1 sampai 3).',
    `${t.pl.length} profil lulusan. Anjuran paling sedikit 3 profil yang dirumuskan bersama pemangku kepentingan dan didukung tracer study (LAM Teknik butir 13 dan 52).`,
    t.plNoCpl.length ? `${t.plNoCpl.length} profil lulusan belum didukung CPL.` : '']), tombol('visi', 'Buat usulan visi dan profil lulusan', !!bidang.trim()) + `<a class="btn sm ghost" href="#visi">Buka menu Visi dan Profil Lulusan</a>`, '#10b981')}
  ${langkah(2, 'Capaian pembelajaran lulusan', st(t.cpl.length >= 8 && !ranah.length && !cplKabur.length && !t.cplNoPl.length, t.cpl.length > 0), li([
    `${t.cpl.length} rumusan CPL. Anjuran 8 sampai 12 rumusan agar tiap CPL bisa diukur.`,
    ranah.length ? `Ranah yang belum ada: ${ranah.map(x => ({ S: 'sikap', P: 'pengetahuan', KU: 'keterampilan umum', KK: 'keterampilan khusus' })[x]).join(', ')}. CPL memuat sikap, pengetahuan, keterampilan umum, dan keterampilan khusus (SN Dikti, KKNI jenjang 6).` : 'Empat ranah CPL sudah lengkap.',
    cplKabur.length ? `${cplKabur.length} CPL belum diawali kata kerja operasional terukur: ${cplKabur.map(c => c.kode).join(', ')}.` : (t.cpl.length ? 'Semua CPL memakai kata kerja operasional (Taksonomi Bloom).' : ''),
    t.cplNoPl.length ? `${t.cplNoPl.length} CPL belum terhubung ke profil lulusan.` : '',
    'Tiap CPL dipetakan ke capaian IABEE supaya asesmen CPL bisa dilaporkan saat akreditasi.']), tombol('cpl', t.cpl.length ? 'Tambah usulan CPL untuk ranah yang kosong' : 'Buat usulan CPL', !!bidang.trim() && (!t.cpl.length || ranah.length > 0)) + `<a class="btn sm ghost" href="#cpl">Buka menu CPL</a>`, '#0ea5e9')}
  ${langkah(3, 'Body of knowledge dan bahan kajian', st(t.bk.length >= 6 && !t.cplNoBk.length, t.bk.length > 0), li([
    `${byProdi(S.bok, pid).length} BoK dan ${t.bk.length} bahan kajian, ${intiBk.length} di antaranya keilmuan inti prodi.`,
    t.cplNoBk.length ? `${t.cplNoBk.length} CPL belum punya bahan kajian: ${t.cplNoBk.map(c => c.kode).join(', ')}.` : (t.bk.length ? 'Semua CPL sudah punya bahan kajian.' : ''),
    'Bahan kajian inti diturunkan dari SKKNI, standar industri migas, dan masukan pengguna lulusan.']), tombol('bk', 'Buat usulan BoK dan bahan kajian', !byProdi(S.bok, pid).length || !t.bk.length) + `<a class="btn sm ghost" href="#bk">Buka menu BoK dan Bahan Kajian</a>`, '#8b5cf6')}
  ${langkah(4, 'Mata kuliah dan struktur semester', st(!kunciKurang.length && sisaTot === 0 && !usulMk.length && R.total >= P.totalSksMin, t.mk.length > 0), li([
    `${t.mk.length} mata kuliah, total ${R.total} SKS dari minimal ${P.totalSksMin} SKS (Permendiktisaintek 39/2025). Jumlah MK dianjurkan ${P.mkProdiMin} sampai ${P.mkProdiMax}.`,
    kunciKurang.length ? `${kunciKurang.length} MK kunci institusi belum ada: ${kunciKurang.map(([s, n]) => `${esc(n)} (smt ${s})`).join(', ')}.` : 'Semua MK kunci institusi sudah ada (K3 semester 1, MKWK semester 4 sampai 6, capstone bertahap, magang, tugas akhir).',
    `Muatan spesifik ${fmt(R.spesifik, 1)}% dari minimal ${P.muatanSpesifikMin}% dan pendidikan umum ${fmt(R.umum, 1)}% dari maksimal ${P.pendidikanUmumMax}% (IABEE 2.1.1). Praktik ${fmt(R.praktikJam, 1)}% jam dari rentang ${P.praktikMin} sampai ${P.praktikMax}% (LAM Teknik).`,
    usulMk.length ? `${usulMk.length} slot MK usulan masih bernama sementara. Ganti nama, SKS, dan bahan kajiannya di menu Mata Kuliah.` : ''])
    + `</ul><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Smt</th><th class="num">MK</th><th class="num">Teori</th><th class="num">Praktik</th><th class="num">SKS</th><th class="num">Target</th><th>Rentang T / P</th><th>Sisa ruang</th></tr></thead><tbody>${smtRows.map(({ s, k, x, sisa }) => `<tr><td><b>${s}</b></td><td class="num">${x.n}</td><td class="num">${x.T}</td><td class="num">${x.P}</td><td class="num"><b>${x.sks}</b></td><td class="num">${k[0]}</td><td class="small">${k[1] == null ? 'magang, capstone, TA' : `T ${k[1]} sampai ${k[2]}, P ${k[3]} sampai ${k[4]}`}</td><td>${sisa === 0 ? kTag('ok') : `<span class="st ${sisa > 0 ? 'near' : 'bad'}">${sisa > 0 ? 'kurang ' + sisa : 'lebih ' + (-sisa)} SKS</span>`}</td></tr>`).join('')}</tbody></table></div><ul style="display:none">`,
    tombol('kunci', 'Tambahkan MK kunci yang belum ada', kunciKurang.length > 0) + tombol('slot', 'Isi sisa ruang SKS dengan slot MK usulan', sisaTot > 0) + `<a class="btn sm ghost" href="#mk">Buka menu Mata Kuliah</a><a class="btn sm ghost" href="#peta">Peta kurikulum</a>`, '#14b8a6')}
  ${langkah(5, 'Keterlacakan CPL, bahan kajian, dan mata kuliah', st(!t.mkNoCpl.length && !t.cplNoMk.length && !t.mkNoBk.length && !t.cplNoPl.length, t.mk.length > 0), li([
    t.mkNoCpl.length ? `${t.mkNoCpl.length} MK belum dibebani CPL.` : 'Semua MK sudah dibebani CPL.',
    t.mkNoBk.length ? `${t.mkNoBk.length} MK belum punya bahan kajian. Ini diisi prodi di menu Mata Kuliah.` : 'Semua MK sudah punya bahan kajian.',
    t.cplNoMk.length ? `${t.cplNoMk.length} CPL belum didukung mata kuliah: ${t.cplNoMk.map(c => c.kode).join(', ')} (IABEE 1.2, LAM Teknik butir 14).` : 'Semua CPL didukung mata kuliah.']), tombol('lacak', 'Petakan otomatis dari bahan kajian', t.mkNoCpl.length > 0 || (t.cplNoPl.length > 0 && t.pl.length > 0)) + `<a class="btn sm ghost" href="#matriks">Buka Matriks Keterlacakan</a>`, '#f472b6')}
  ${langkah(6, 'CPMK dan Sub-CPMK', st(!tanpaCpmk && !t.cpmkNoSub.length && !t.bobotSalah.length, t.cpmk.length > 0), li([
    tanpaCpmk ? `${tanpaCpmk} dari ${mkA.length} MK belum punya CPMK.` : 'Semua MK sudah punya CPMK.',
    t.cpmkNoSub.length ? `${t.cpmkNoSub.length} CPMK belum diuraikan menjadi Sub-CPMK.` : (t.cpmk.length ? 'Semua CPMK sudah punya Sub-CPMK.' : ''),
    t.bobotSalah.length ? `${t.bobotSalah.length} MK dengan bobot Sub-CPMK tidak 100%.` : '',
    'Usulan memakai kata kerja sesuai tingkat semester: semester awal C2 sampai C3, semester 5 dan 6 C4 sampai C5, capstone C6. MK praktik memakai ranah psikomotor.']), tombol('cpmk', 'Buat usulan CPMK dan Sub-CPMK yang kosong', tanpaCpmk > 0 || t.cpmkNoSub.length > 0) + `<a class="btn sm ghost" href="#cpmk">Buka menu CPMK</a>`, '#0ea5e9')}
  ${langkah(7, 'RPS, pemeriksaan akhir, dan pengajuan', st(nb === 0 && rpsAda === mkA.length, true), li([
    `${rpsAda} dari ${mkA.length} MK sudah punya RPS, ${g.rpsAju} menunggu pengesahan kaprodi, ${g.rpsSah} disahkan. RPS diisi dosen pengampu: unggah RPS lama dari Word atau pakai Asisten RPS di menu RPS dan SAP.`,
    `Pemeriksa otomatis: ${ck.length - nb - nn} butir sesuai, ${nn} perlu perhatian, ${nb} belum sesuai.`,
    'Setelah semua langkah hijau, ajukan kurikulum ke Wakil Direktur I lewat menu Revisi dan Pengesahan.']), `<a class="btn sm ghost" href="#periksa">Buka Pemeriksa Kurikulum</a><a class="btn sm ghost" href="#rps">RPS dan SAP</a><a class="btn sm ghost" href="#revisi">Revisi dan Pengesahan</a>`, '#6366f1')}
  <div class="card" style="margin-top:14px">${head('Templat format baku', 'Agar format seragam di lima prodi', 'download', '#14b8a6')}
    <div class="filters" style="margin-top:8px"><a class="btn sm" href="assets/templat/Templat_RPS_KUREKAM.docx" download>${icon('download')} Templat RPS (Word)</a><a class="btn sm" href="assets/templat/Templat_Matriks_Kurikulum_Prodi.xlsx" download>${icon('download')} Templat matriks kurikulum (Excel)</a><a class="btn sm ghost" href="#laporan">Cetak dokumen kurikulum prodi</a></div>
    <p class="small muted" style="margin-top:8px">Templat RPS yang sudah diisi bisa diunggah kembali lewat tombol Unggah RPS dari Word. Templat matriks yang sudah diisi diimpor admin atau Kasubbag Akademik di Data Induk.</p></div>`;

  const inp = el.querySelector('#as-bidang'); if (inp) inp.onchange = () => { bidangInp = inp.value.trim(); rerender(); };
  const PESAN = { visi: 'visi dan profil lulusan', cpl: 'CPL', bk: 'BoK dan bahan kajian', kunci: 'MK kunci', slot: 'slot MK usulan', lacak: 'pemetaan', cpmk: 'CPMK dan Sub-CPMK' };
  el.querySelectorAll('[data-gen]').forEach(b => b.onclick = async () => {
    const k = b.dataset.gen; b.disabled = true;
    try { const n = await GEN[k](pid, (inp ? inp.value.trim() : bidang)); if (n) await addLog(`Asisten kurikulum ${pid}: ${n} usulan ${PESAN[k]}`);
      toast(n ? `${n} usulan ${PESAN[k]} ditambahkan. Tinjau dan sunting di menunya.` : 'Tidak ada yang perlu ditambahkan.'); } catch (e) { console.error(e); toast('Gagal membuat usulan: ' + e.message); }
    rerender();
  });
}
