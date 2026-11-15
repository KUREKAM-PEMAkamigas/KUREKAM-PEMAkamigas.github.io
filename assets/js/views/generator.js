/* KUREKAM · Generator usulan IABEE (berbasis aturan, tanpa biaya, tanpa layanan AI luar).
   Semua hasil berstatus USULAN: tampil bersama analisis kesesuaian terhadap aturan, dapat direvisi, dan baru
   tersimpan setelah disetujui pengguna prodi. Wakil Direktur I dan SPM dapat melihat usulan dan analisisnya. */
import { S, ctx, can, save, saveMany, rerender, esc, icon, uid, toast, addLog } from '../app.js';
import { byProdi, capstoneCek, piTrace, piOfCpl, capaianCpl, tlProdi, param } from '../rules.js';
import { detect, KKO, KABUR, lvNum } from '../bloom.js';
import { head, short, unduh, loadXLSX } from './ui.js';

const TAB = { t: 'inti' };
const ok = (b, t, ket = '') => ({ ok: b, t, ket });
const cek = (a) => `<ul class="gen-cek">${a.map(x => `<li class="${x.ok ? 'ya' : 'tdk'}"><b>${x.ok ? '✓' : '✗'}</b> ${esc(x.t)}${x.ket ? ` <span class="muted">${esc(x.ket)}</span>` : ''}</li>`).join('')}</ul>`;
const valid = (a) => a.every(x => x.ok);
const kodeMk = (m) => m.kode || m.id;

/* ---------- A. Mata kuliah inti ---------- */
function usulInti(pid) {
  const t = piTrace(S, pid), cpl = t.cpl, sudah = new Set(); t.inti.forEach(m => (m.cpl || []).forEach(c => sudah.add(c)));
  const kandidat = t.mk.filter(m => !m.inti && !/magang|tugas akhir/i.test(m.kel || ''));
  const out = [], dipilih = [], tutup = new Set(sudah);
  const capstone = kandidat.filter(m => /capstone/i.test(m.nama + ' ' + (m.kel || '')));
  capstone.forEach(m => { dipilih.push({ m, alasan: 'Capstone design diwajibkan sebagai MK inti oleh standar akreditasi.' }); (m.cpl || []).forEach(c => tutup.add(c)); });
  let sisa = kandidat.filter(m => !dipilih.some(d => d.m.id === m.id));
  for (let guard = 0; guard < 12; guard++) {
    const baru = sisa.map(m => ({ m, n: (m.cpl || []).filter(c => !tutup.has(c)).length, pen: /kompetensi penciri|kompetensi/i.test(m.kel || '') ? 1 : 0 })).filter(x => x.n > 0).sort((a, b) => b.n - a.n || b.pen - a.pen || (+b.m.smt || 0) - (+a.m.smt || 0));
    if (!baru.length) break;
    const x = baru[0]; const kode = (x.m.cpl || []).filter(c => !tutup.has(c)).map(c => (cpl.find(q => q.id === c) || {}).kode).filter(Boolean);
    dipilih.push({ m: x.m, alasan: `Memikul CPL ${kode.join(', ')} yang belum tercakup MK inti lain.` });
    (x.m.cpl || []).forEach(c => tutup.add(c)); sisa = sisa.filter(q => q.id !== x.m.id);
  }
  dipilih.forEach(({ m, alasan }) => {
    const cp = t.cpmk.filter(c => c.mk === m.id);
    out.push({ id: m.id, judul: `${kodeMk(m)} · ${m.nama}`, sub: `Semester ${m.smt || '?'} · ${(+m.T || 0) + (+m.P || 0)} SKS`, isi: alasan, cek: [
      ok(cp.length > 0, 'Sudah punya CPMK', cp.length ? `${cp.length} CPMK` : 'Isi CPMK dahulu agar bisa dihubungkan ke PI'),
      ok((m.cpl || []).length > 0, 'Terhubung ke CPL', (m.cpl || []).length ? `${m.cpl.length} CPL` : 'Hubungkan di Matriks'),
      ok((+m.smt || 0) >= 3, 'Berada di semester 3 atau lebih', `semester ${m.smt || '?'}`)], aplikasi: async () => { m.inti = true; await save('mk', m, `Tandai MK inti ${kodeMk(m)} dari usulan`); } });
  });
  const akhir = new Set([...sudah]); dipilih.forEach(d => (d.m.cpl || []).forEach(c => akhir.add(c)));
  return { out, ringkas: `Setelah usulan disetujui, MK inti memikul ${cpl.filter(c => akhir.has(c.id)).length} dari ${cpl.length} CPL (sekarang ${cpl.filter(c => sudah.has(c.id)).length}).`, sisaCpl: cpl.filter(c => !akhir.has(c.id)) };
}

/* ---------- B. PI per CPL ---------- */
const KATA_AWAL = /^(mampu|dapat|mahasiswa|lulusan|diharapkan|mampu untuk)\s+/i;
function objekCpl(teks, verb) { let s = String(teks || '').trim().replace(KATA_AWAL, '').replace(KATA_AWAL, ''); if (verb && s.toLowerCase().startsWith(verb)) s = s.slice(verb.length).trim(); return s.replace(/[.\s]+$/, ''); }
const kataKerja = (kode) => (KKO[kode] || []).find(v => !KABUR.includes(v));
function usulPi(pid) {
  const t = piTrace(S, pid), P = t.P, out = [];
  t.cpl.filter(c => piOfCpl(S, c.id).length < P.piPerCplMin).forEach(c => {
    const d = detect(c.teks, 'C'), n = d ? d.n : 3, dom = d ? d.d : 'C', obj = objekCpl(c.teks, d && d.verb);
    const butuh = Math.max(P.piPerCplMin - piOfCpl(S, c.id).length, 0); if (!butuh) return;
    const lv = (x) => `${dom}${Math.min(Math.max(x, 1), dom === 'C' ? 6 : 5)}`;
    const rumus = (dom === 'A' ? [
      { kode: lv(n - 1), teks: (v) => `${v} ${obj} dalam kegiatan praktik dan tugas kelompok, dibuktikan dengan rubrik observasi perilaku.` },
      { kode: lv(n), teks: (v) => `${v} ${obj} secara konsisten pada pekerjaan di laboratorium, bengkel, atau lapangan, dibuktikan dengan catatan penilaian dosen.` }
    ] : [
      { kode: lv(n - 1), teks: (v) => `${v} prinsip dan dasar teori yang melandasi ${obj}.` },
      { kode: lv(n), teks: (v) => `${v} ${obj} sesuai prosedur dan standar yang berlaku.` },
      { kode: lv(n), teks: (v) => `${v} hasil pekerjaan terkait ${obj} dan menyajikan alasan yang dapat diperiksa.` }
    ].filter((r, k) => !(n <= 2 && k === 0))).slice(0, Math.min(Math.max(butuh, 2), n >= 4 && dom !== 'A' ? 3 : 2));
    const nomor0 = piOfCpl(S, c.id).length, cpmkCpl = t.cpmk.filter(k => (k.cpl || []).includes(c.id) || (t.mk.find(m => m.id === k.mk) || {}).cpl?.includes(c.id));
    const inti = cpmkCpl.filter(k => (t.mk.find(m => m.id === k.mk) || {}).inti);
    const sumber = inti.length ? inti : cpmkCpl;
    rumus.forEach((r, i) => {
      const v = kataKerja(r.kode) || 'menjelaskan', teks = r.teks(v).replace(/^./, s => s.toUpperCase());
      const ya = sumber.map(k => ({ k, l: (detect(k.teks, dom) || {}).n || 0 })).sort((a, b) => Math.abs(a.l - lvNum(r.kode)) - Math.abs(b.l - lvNum(r.kode)));
      const cp = ya.length ? [ya[0].k.id] : [];
      out.push({ id: `${c.id}#${i}`, judul: `PI ${c.kode}.${nomor0 + i + 1} (${r.kode})`, sub: `CPL ${c.kode}: ${short(c.teks, 90)}`, isi: teks, edit: true, cpmk: cp, cplId: c.id, nomor: nomor0 + i + 1, kodeCpl: c.kode, hitung: (tx) => {
        const dd = detect(tx, dom);
        return [ok(!!dd, 'Diawali kata kerja operasional yang dikenali', dd ? `${dd.verb} (${dd.code})` : 'Awali dengan kata kerja terukur'),
          ok(!!dd && !dd.kabur, 'Kata kerja dapat diamati (bukan "memahami", "menguasai")'),
          ok(!!dd && dd.n <= n + 0, 'Level tidak melebihi level CPL', `CPL ${d ? d.code : '?'}`),
          ok(tx.length >= 40 && tx.length <= 260, 'Panjang rumusan wajar (40 sampai 260 huruf)', `${tx.length} huruf`),
          ok(cp.length > 0, 'Ada CPMK yang dapat mengukurnya', cp.length ? (inti.length ? 'dari MK inti' : 'dari MK biasa, tandai MK inti dahulu') : 'Belum ada CPMK untuk CPL ini'),
          ok(nomor0 + rumus.length >= P.piPerCplMin && nomor0 + rumus.length <= P.piPerCplMax, `Jumlah PI per CPL dalam ${P.piPerCplMin} sampai ${P.piPerCplMax}`)]; },
        aplikasi: async (tx) => { await save('pi', { id: uid(pid + '-PI'), prodi: pid, cpl: c.id, kode: `${c.kode}.${nomor0 + i + 1}`, teks: tx, cpmk: cp }, `Simpan PI ${c.kode}.${nomor0 + i + 1} dari usulan`); } });
    });
  });
  return out;
}

/* ---------- C. Tindak lanjut ---------- */
function usulTl(pid) {
  const cp = capaianCpl(S, pid), tl = tlProdi(S, pid), P = param(S), out = [];
  cp.bawah.filter(h => !tl.some(x => x.cpl === h.c.id)).forEach(h => {
    const mk = byProdi(S.mk, pid).filter(m => (m.cpl || []).includes(h.c.id)).sort((a, b) => (b.inti ? 1 : 0) - (a.inti ? 1 : 0)).slice(0, 2);
    const tgl = new Date(); tgl.setMonth(tgl.getMonth() + 6); const target = tgl.toISOString().slice(0, 10);
    const temuan = `Capaian ${h.c.kode} angkatan ${h.akhir.angkatan}: ${h.akhir.persen.toFixed(1)}% mahasiswa mencapai nilai minimal ${P.piMinNilai}, di bawah kriteria ${cp.krit}% (${h.akhir.lulus} dari ${h.akhir.n}).`;
    const tindakan = `1) Telusuri PI dengan capaian terendah pada CPL ${h.c.kode}. 2) Tambah latihan terbimbing dan umpan balik pada ${mk.length ? mk.map(m => kodeMk(m) + ' ' + m.nama).join(' dan ') : 'MK pendukung CPL ini'}. 3) Tinjau kesesuaian soal, tugas, dan rubrik dengan PI. 4) Ukur ulang pada angkatan berikutnya dan laporkan di rapat evaluasi kurikulum.`;
    out.push({ id: h.c.id, judul: `Tindak lanjut ${h.c.kode}`, sub: short(h.c.teks, 100), isi: tindakan, edit: true, temuan, hitung: (tx) => [
      ok(true, 'Temuan memuat angka capaian dan kriteria', `${h.akhir.persen.toFixed(1)}% terhadap ${cp.krit}%`),
      ok(mk.length > 0, 'Mengarah ke MK yang memikul CPL ini', mk.length ? mk.map(kodeMk).join(', ') : 'Belum ada MK terhubung ke CPL ini'),
      ok(/ukur ulang|diukur ulang/i.test(tx), 'Memuat rencana pengukuran ulang'),
      ok(tx.length >= 80, 'Tindakan cukup rinci')],
      aplikasi: async (tx) => { await save('tl', { id: uid('TL'), prodi: pid, tgl: new Date().toISOString().slice(0, 10), status: 'rencana', cpl: h.c.id, angkatan: h.akhir.angkatan, temuan, tindakan: tx, pj: 'Kaprodi', target }, `Simpan tindak lanjut ${h.c.kode} dari usulan`); } });
  });
  return out;
}


/* ---------- D. Rubrik capstone ---------- */
const tahunAkad = () => { const d = new Date(), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return `${y}/${y + 1}`; };
function usulRubrik(pid) {
  const t = piTrace(S, pid), cs = capstoneCek(S, pid), cplId = new Set(); cs.mkCap.forEach(m => (m.cpl || []).forEach(c => cplId.add(c)));
  const cpl = t.cpl.filter(c => cplId.has(c.id)).slice(0, 6), dim = cpl.map(c => `Capaian ${c.kode}: ${short(c.teks, 110)}`);
  dim.push('Komunikasi dan dokumentasi: laporan teknis, presentasi, dan jawaban saat sidang');
  const w = Math.floor(100 / dim.length), sisa = 100 - w * dim.length;
  const baris = dim.map((d, i) => `${d} | bobot ${w + (i === 0 ? sisa : 0)}%`);
  const lv = ['4 Sangat baik: memenuhi seluruh indikator, argumen dan data lengkap, tanpa bimbingan berarti', '3 Baik: memenuhi sebagian besar indikator, kekurangan kecil tidak memengaruhi hasil', '2 Cukup: memenuhi indikator dasar, banyak bagian perlu perbaikan atau bimbingan', '1 Kurang: indikator belum terpenuhi atau tidak dapat dipertanggungjawabkan'];
  const isi = `RUBRIK PENILAIAN CAPSTONE DESIGN ${pid}\nKriteria dan bobot:\n${baris.join('\n')}\n\nTingkat capaian tiap kriteria:\n${lv.join('\n')}`;
  return [{ id: 'rubrik', judul: `Rubrik capstone ${pid}`, sub: cs.mkCap.length ? `Dari CPL pada ${cs.mkCap.map(m => kodeMk(m)).join(', ')}` : 'MK capstone belum ada di kurikulum', isi, edit: true,
    hitung: (tx) => { const bobot = (tx.match(/bobot\s+(\d+)%/g) || []).map(x => +x.replace(/\D/g, '')), jum = bobot.reduce((a, b) => a + b, 0);
      return [ok(cs.mkCap.length > 0, 'MK capstone ada di kurikulum'), ok(cpl.length > 0, 'Kriteria diturunkan dari CPL MK capstone', `${cpl.length} CPL`), ok(jum === 100, 'Jumlah bobot kriteria 100%', `${jum}%`),
        ok(/4 .*3 .*2 .*1 /s.test(tx), 'Ada empat tingkat capaian'), ok(/komunikasi/i.test(tx), 'Memuat kriteria komunikasi dan dokumentasi')]; },
    aplikasi: async (tx) => { const ada = (S.capstone || []).filter(x => x.prodi === pid).sort((a, b) => String(a.tahun).localeCompare(String(b.tahun))).pop(); const th = ada ? ada.tahun : tahunAkad();
      await save('capstone', { ...(ada || {}), id: `CS-${pid}-${String(th).replace('/', '-')}`, prodi: pid, tahun: th, rubrik: ada && ada.rubrik === 'disahkan' ? 'disahkan' : 'draf', rubrikIsi: tx, tgl: new Date().toISOString().slice(0, 10) }, `Simpan rubrik capstone ${pid} dari usulan`); } }];
}

/* ---------- E. Templat Excel hitung capaian (rumus otomatis) ---------- */
async function templatHitung(pid) {
  const X = await loadXLSX(), t = piTrace(S, pid), P = t.P, wb = X.utils.book_new();
  const pis = t.pi.slice().sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
  if (!pis.length) { toast('Belum ada PI. Setujui usulan PI dahulu agar templat dapat dibuat.'); return; }
  const h = ['Angkatan', 'Kode CPL', 'Kode PI', 'CPMK pengukur', `Jumlah dinilai (n)`, `Jumlah nilai ≥ ${P.piMinNilai}`, 'Persen mencapai', `Status (kriteria ${P.piMinPersen}%)`];
  const baris = [h]; pis.forEach((p, i) => { const c = t.cpl.find(x => x.id === p.cpl) || {}, r = i + 2; const km = (p.cpmk || []).map(id => { const k = t.cpmk.find(q => q.id === id), m = k && t.mk.find(q => q.id === k.mk); return k ? `${m ? kodeMk(m) : ''}/${k.kode}` : ''; }).filter(Boolean).join('; ');
    baris.push(['', c.kode || '', p.kode, km, '', '', { f: `IF(AND(ISNUMBER(E${r}),E${r}>0),F${r}/E${r}*100,"")` }, { f: `IF(G${r}="","",IF(G${r}>=${P.piMinPersen},"Memenuhi","Di bawah kriteria"))` }]); });
  const ws = X.utils.aoa_to_sheet(baris); ws['!cols'] = [10, 10, 10, 40, 14, 14, 14, 20].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'HITUNG PI');
  const imp = [['Prodi', 'Angkatan', 'Kode CPL', 'Kode PI (kosongkan bila seluruh CPL)', 'Jumlah mahasiswa dinilai', 'Jumlah mencapai nilai batas', 'Catatan']];
  pis.forEach((p, i) => { const r = i + 2; imp.push([pid, { f: `'HITUNG PI'!A${r}` }, { f: `'HITUNG PI'!B${r}` }, { f: `'HITUNG PI'!C${r}` }, { f: `'HITUNG PI'!E${r}` }, { f: `'HITUNG PI'!F${r}` }, '']); });
  const wi = X.utils.aoa_to_sheet(imp); wi['!cols'] = [8, 10, 12, 22, 16, 16, 20].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, wi, 'CAPAIAN');
  const info = [['Cara memakai'], ['1. Di lembar HITUNG PI isi Angkatan (tahun masuk), jumlah dinilai, dan jumlah yang bernilai di atas batas, untuk tiap PI. Boleh satu angkatan per berkas.'], ['2. Kolom persen dan status terhitung otomatis. Jangan menulis nama, NIM, atau nilai per mahasiswa.'], ['3. Lembar CAPAIAN terisi otomatis dari lembar HITUNG PI. Hapus baris PI yang belum terukur, lalu salin sebagai nilai (paste values) bila diperlukan.'], ['4. Di KUREKAM buka Capaian CPL & Tindak Lanjut, tekan Impor Excel, dan pilih berkas ini.']];
  const wp = X.utils.aoa_to_sheet(info); wp['!cols'] = [{ wch: 110 }]; X.utils.book_append_sheet(wb, wp, 'PETUNJUK');
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Template_Hitung_Capaian_${pid}.xlsx`);
}

export default function generatorView(el) {
  const pid = ctx.prodi, ed = can('susun', { prodi: pid });
  const G = { inti: usulInti(pid), pi: usulPi(pid), tl: usulTl(pid), rubrik: usulRubrik(pid), templat: [] };
  const daftar = G[TAB.t === 'inti' ? 'inti' : TAB.t] || [];
  const rows = (TAB.t === 'inti' ? G.inti.out : daftar);
  const tabs = [['inti', 'MK inti', G.inti.out.length], ['pi', 'PI per CPL', G.pi.length], ['tl', 'Tindak lanjut', G.tl.length], ['rubrik', 'Rubrik capstone', G.rubrik.length], ['templat', 'Templat Excel', 1]];
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span><b>Semua isi di sini adalah usulan.</b> Dibuat otomatis dari aturan (taksonomi Bloom, standar IABEE, kriteria capaian), tanpa layanan AI berbayar. Setiap usulan disertai analisis apakah sudah sesuai aturan. Ubah isinya bila perlu, centang yang setuju, lalu tekan <b>Setujui</b>. Yang tidak disetujui tidak disimpan.</span></div>
  <div class="card">${head('Generator usulan · ' + pid, 'Usulan mengikuti data prodi yang sudah ada di KUREKAM. Makin lengkap datanya, makin tepat usulannya.', 'spark', '#8b5cf6')}
    <div class="seg" style="margin-bottom:12px">${tabs.map(([k, n, c]) => `<button data-t="${k}" class="${TAB.t === k ? 'on' : ''}">${n} (${c})</button>`).join('')}</div>
    ${TAB.t === 'inti' ? `<p class="small muted">${esc(G.inti.ringkas)}${G.inti.sisaCpl.length ? ' CPL yang tetap belum tercakup: ' + esc(G.inti.sisaCpl.map(c => c.kode).join(', ')) + ' (hubungkan MK ke CPL di Matriks).' : ''}</p>` : ''}
    ${TAB.t === 'templat' ? `<p>Templat Excel dengan rumus otomatis: dosen atau prodi mengisi jumlah dinilai dan jumlah yang mencapai nilai batas tiap PI, lalu persen dan status terhitung sendiri, dan lembar CAPAIAN siap diimpor ke KUREKAM. Berisi ${piTrace(S, pid).pi.length} PI milik ${pid}.</p><button class="btn pri" id="gen-xl">${icon('download')} Unduh templat hitung capaian</button>` : ''}
    ${TAB.t === 'templat' ? '' : rows.length ? rows.map((u, i) => { const a = u.hitung ? u.hitung(u.isi) : u.cek, v = valid(a); return `<div class="gen-item" data-i="${i}">
      <label class="gen-h"><input type="checkbox" class="gen-ck" ${ed ? '' : 'disabled'}> <b>${esc(u.judul)}</b> <span class="tag" style="--c:${v ? '#10b981' : '#f5a524'}">${v ? 'Sesuai aturan' : 'Perlu perbaikan'}</span></label>
      <div class="small muted">${esc(u.sub)}</div>
      ${u.temuan ? `<div class="small"><b>Temuan:</b> ${esc(u.temuan)}</div>` : ''}
      ${u.edit ? `<textarea class="inp gen-tx" rows="${TAB.t === 'rubrik' ? 10 : TAB.t === 'tl' ? 5 : 3}" ${ed ? '' : 'readonly'}>${esc(u.isi)}</textarea>` : `<div>${esc(u.isi)}</div>`}
      <div class="gen-a">${cek(a)}</div></div>`; }).join('') : `<div class="empty">${TAB.t === 'inti' ? 'Semua MK yang memenuhi syarat sudah ditandai inti, atau MK belum ada.' : TAB.t === 'pi' ? 'Semua CPL sudah punya jumlah PI minimal. Tidak ada usulan baru.' : TAB.t === 'rubrik' ? 'Tidak ada usulan rubrik.' : 'Tidak ada CPL di bawah kriteria tanpa tindak lanjut. Isi rekap capaian lebih dahulu di menu Capaian CPL.'}</div>`}
    ${ed && rows.length ? `<div style="margin-top:12px"><button class="btn pri" id="gen-ok">${icon('check')} Setujui yang dicentang</button> <button class="btn ghost" id="gen-all">Centang yang sudah sesuai aturan</button></div>` : (!ed ? '<div class="small muted" style="margin-top:10px">Hanya akun prodi yang dapat menyetujui. Peran Anda dapat melihat usulan dan analisisnya.</div>' : '')}
  </div>`;
  const xl = el.querySelector('#gen-xl'); if (xl) xl.onclick = () => templatHitung(pid).catch(e => toast('Gagal membuat templat: ' + e.message));
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { TAB.t = b.dataset.t; rerender(); });
  const ga = el.querySelector('#gen-all');
  if (ga) ga.onclick = () => el.querySelectorAll('.gen-item').forEach(it => { it.querySelector('.gen-ck').checked = !it.querySelector('.tdk'); });
  el.querySelectorAll('.gen-tx').forEach(tx => tx.oninput = () => { const it = tx.closest('.gen-item'), u = rows[+it.dataset.i]; u.isi = tx.value; const a = u.hitung(tx.value); it.querySelector('.gen-a').innerHTML = cek(a); const tg = it.querySelector('.gen-h .tag'); tg.textContent = valid(a) ? 'Sesuai aturan' : 'Perlu perbaikan'; tg.style.setProperty('--c', valid(a) ? '#10b981' : '#f5a524'); });
  const sv = el.querySelector('#gen-ok');
  if (sv) sv.onclick = async () => {
    const pilih = Array.from(el.querySelectorAll('.gen-item')).filter(it => it.querySelector('.gen-ck').checked).map(it => rows[+it.dataset.i]);
    if (!pilih.length) { toast('Centang usulan yang disetujui dahulu.'); return; }
    const tdk = pilih.filter(u => !valid(u.hitung ? u.hitung(u.isi) : u.cek));
    if (tdk.length && !confirm(`${tdk.length} usulan yang dicentang belum sesuai aturan. Tetap disetujui?`)) return;
    for (const u of pilih) await u.aplikasi(u.isi);
    await addLog(`Setujui ${pilih.length} usulan generator (${TAB.t}) ${pid}`); toast(`${pilih.length} usulan disetujui dan tersimpan`); rerender();
  };
}
