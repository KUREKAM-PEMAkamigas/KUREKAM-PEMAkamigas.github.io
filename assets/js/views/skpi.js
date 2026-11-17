/* KUREKAM · SKPI (Surat Keterangan Pendamping Ijazah) dwibahasa dengan grafik laba-laba CPL.
   Pemetaan CPMK -> CPL diambil dari KUREKAM; nilai dibaca dari transkrip PDF SIAKAD di peramban ini saja.
   Nama, NIM, dan nilai per mahasiswa tidak disimpan. Yang tersimpan hanya: pengaturan, terjemahan, padanan kode,
   agregat angkatan tanpa nama (Capaian CPL), dan sidik keaslian tanpa nama untuk QR. */
import { S, ctx, can, save, saveMany, rerender, esc, icon, toast, saveSettings } from '../app.js';
import { DB } from '../db.js';
import { fmt, byProdi } from '../rules.js';
import { head, ro, kpi, animateCounts, stTag, tanya, unduh, loadXLSX, short } from './ui.js';
import { DOMAIN, SKPI_DEF, pengaturan, predikat, susunTranskrip, padankan, hitungSkpi, rataAngkatan, agregatCapaian, angkatanDariNim, sidik, sidikKanonik, kodeBaru, kesiapanSkpi } from '../skpilogic.js';
import { radarSvg, bangunSkpi, perluVerifikasi, tglId, tglEn } from '../skpidoc.js';
import { draftCpl, draftMk, tambahMkEn, kunci } from '../terjemahan.js';

const TABS = [['cetak', 'Cetak SKPI'], ['siap', 'Kesiapan & aturan'], ['terjemah', 'Terjemahan Inggris'], ['setelan', 'Pengaturan']];
let tab = 'cetak', daftar = [], manual = {}, sel = 0, cat = {}, terbit = {}, namaBerkas = '', sedang = false, pesanBaca = '';
const nim = (m) => m.nim || '';
const n2 = (v) => v == null ? '–' : v.toFixed(2).replace('.', ',');
const PRED = { sk: 'ok', k: 'near', ck: 'bad' };
const boleh = () => ['admin', 'developer', 'prodi', 'akademik', 'wadir'].includes(ctx.role);

/* ---------- pemuat pustaka (lokal dulu, lalu CDN) ---------- */
const sekali = {};
function muatJs(kunciP, srcs, cek) {
  if (cek()) return Promise.resolve(cek());
  if (sekali[kunciP]) return sekali[kunciP];
  const coba = (i) => new Promise((res, rej) => { if (i >= srcs.length) return rej(new Error('Gagal memuat pustaka ' + kunciP)); const s = document.createElement('script'); s.src = srcs[i]; s.onload = () => cek() ? res(cek()) : coba(i + 1).then(res, rej); s.onerror = () => coba(i + 1).then(res, rej); document.head.appendChild(s); });
  sekali[kunciP] = coba(0).catch(e => { sekali[kunciP] = null; throw e; });
  return sekali[kunciP];
}
const muatPdf = () => muatJs('pdf', ['assets/vendor/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'], () => window.pdfjsLib).then(l => { l.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdf.worker.min.js', document.baseURI).href; return l; });
const muatQr = () => muatJs('qr', ['assets/vendor/qrcode.js'], () => window.qrcode);

async function bacaPdf(file) {
  const L = await muatPdf(), doc = await L.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, hal = [];
  for (let i = 1; i <= doc.numPages; i++) { const tc = await (await doc.getPage(i)).getTextContent(); hal.push(tc.items.map(t => ({ s: t.str, x: t.transform[4], y: t.transform[5] }))); }
  return susunTranskrip(hal);
}

/* ---------- perhitungan seluruh angkatan yang dimuat ---------- */
function hitungSemua(pid, K) {
  const unik = new Map(); daftar.forEach(m => m.mk.forEach(t => { if (!unik.has(t.kode)) unik.set(t.kode, t); }));
  const padan = padankan(S, pid, [...unik.values()], manual);
  const hasil = daftar.map(m => ({ m, h: hitungSkpi(S, pid, m, padan, K) }));
  return { padan, hasil, rata: rataAngkatan(hasil.map(x => x.h)) };
}

export default function skpiView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid), ed = can('susun', { prodi: pid });
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  el.innerHTML = `<div class="seg scroll" style="margin-bottom:14px">${TABS.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><div id="sk-b"></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  const b = el.querySelector('#sk-b');
  ({ cetak: tCetak, siap: tSiap, terjemah: tTerjemah, setelan: tSetelan })[tab](b, pid, p, ed);
}

/* ================= cetak ================= */
function tCetak(el, pid, p, ed) {
  const K = pengaturan(S, pid), R = daftar.length ? hitungSemua(pid, K) : null;
  const ks = kesiapanSkpi(S, pid);
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>SKPI dicetak dari KUREKAM. Pemetaan nilai ke CPL memakai <b>CPMK → CPL</b> yang sudah disusun di KUREKAM. Transkrip PDF dari SIAKAD <b>dibaca di peramban ini saja</b>: tidak diunggah ke server dan tidak disimpan. Hanya agregat tanpa nama (Capaian CPL) dan sidik keaslian tanpa nama (QR) yang bisa disimpan.</span></div>
  ${ks.ok < ks.syarat.length ? `<div class="ribbon warn">${icon('alert')} <span>Kesiapan struktur SKPI baru <b>${ks.ok} dari ${ks.syarat.length}</b>. SKPI tetap bisa dicoba, tetapi hasil resmi menunggu syarat terpenuhi. <a href="#" id="sk-ks">Lihat rinciannya</a>.</span></div>` : ''}
  <div class="card">${head('1. Muat transkrip', 'Satu PDF boleh berisi banyak mahasiswa (satu halaman per mahasiswa).', 'upload', '#0ea5e9', daftar.length ? `<button class="btn sm" id="sk-reset">${icon('trash')} Bersihkan dari layar</button>` : '')}
    <div class="filters"><button class="btn pri" id="sk-up" ${sedang ? 'disabled' : ''}>${icon('upload')} Pilih transkrip PDF (SIAKAD)</button><span class="small muted">${sedang ? '<span class="spin"></span> Membaca…' : esc(namaBerkas || 'Belum ada berkas.')}</span></div>
    ${pesanBaca ? `<div class="ribbon bad" style="margin-top:8px">${esc(pesanBaca)}</div>` : ''}</div>
  ${R ? isiMuat(pid, p, K, R, ed) : ''}`;
  const lnk = el.querySelector('#sk-ks'); if (lnk) lnk.onclick = (e) => { e.preventDefault(); tab = 'siap'; rerender(); };
  el.querySelector('#sk-up').onclick = () => {
    const f = document.createElement('input'); f.type = 'file'; f.accept = '.pdf,application/pdf';
    f.onchange = async () => {
      if (!f.files[0]) return; sedang = true; pesanBaca = ''; rerender();
      try { daftar = await bacaPdf(f.files[0]); namaBerkas = f.files[0].name; sel = 0; terbit = {}; if (!daftar.length) pesanBaca = 'Tidak ada transkrip terbaca. Pastikan berkas adalah transkrip SIAKAD berformat PDF teks (bukan hasil pindai).'; }
      catch (e) { console.error(e); pesanBaca = 'Gagal membaca PDF: ' + (e.message || e); daftar = []; }
      sedang = false; rerender();
    };
    f.click();
  };
  const rs = el.querySelector('#sk-reset'); if (rs) rs.onclick = () => { daftar = []; manual = {}; cat = {}; terbit = {}; namaBerkas = ''; sel = 0; rerender(); };
  if (R) pasang(el, pid, p, K, R, ed);
  animateCounts(el);
}

function isiMuat(pid, p, K, R, ed) {
  const prodiSama = daftar.every(m => !m.prodi || kunci(m.prodi) === kunci(p.nama) || kunci(p.nama).includes(kunci(m.prodi)) || kunci(m.prodi).includes(kunci(p.nama)));
  const kosong = new Map(); R.hasil.forEach(({ h }) => h.tanpaPadanan.forEach(t => kosong.set(t.kode, t)));
  const mks = byProdi(S.mk, pid).slice().sort((a, b) => (a.smt - b.smt) || String(a.nama).localeCompare(b.nama));
  const via = { kode: 0, nama: 0, manual: 0 }; R.padan.forEach(x => { if (x.via) via[x.via]++; });
  const valid = daftar.filter(m => m.valid).length, sudahTerbit = daftar.filter(m => terbit[nim(m)]).length;
  const cur = R.hasil[Math.min(sel, R.hasil.length - 1)];
  return `
  ${!prodiSama ? `<div class="ribbon bad">${icon('alert')} <span>Program studi pada transkrip (<b>${esc(daftar[0].prodi)}</b>) tidak sama dengan prodi aktif (<b>${esc(p.nama)}</b>). Pilih prodi yang benar di bagian atas sebelum melanjutkan.</span></div>` : ''}
  <div class="grid g4" style="margin-top:14px">
    ${kpi('Transkrip terbaca', daftar.length, `${valid} lolos pemeriksaan SKS, mutu, dan IPK`, valid === daftar.length ? '#10b981' : '#f0616d', 'user')}
    ${kpi('Mata kuliah terpadankan', R.padan.size - kosong.size, `dari ${R.padan.size} kode berbeda · kode ${via.kode}, nama ${via.nama}, manual ${via.manual}`, kosong.size ? '#f5a524' : '#10b981', 'link')}
    ${kpi('Cakupan SKS ke CPL', Math.round(R.hasil.reduce((a, x) => a + x.h.cakupan, 0) / R.hasil.length), 'rata-rata persen SKS transkrip yang terpetakan ke CPL', '#0ea5e9', 'target')}
    ${kpi('Sudah diterbitkan', sudahTerbit, `dari ${daftar.length} (QR terdaftar)`, '#8b5cf6', 'medal')}
  </div>
  ${kosong.size ? `<div class="card" style="margin-top:18px">${head('2. Mata kuliah transkrip yang belum ada padanannya di KUREKAM', 'Skor CPL tidak memakai mata kuliah ini sampai dipadankan. Padanan disimpan sebagai kode SIAKAD pada mata kuliah KUREKAM.', 'link', '#f5a524')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode transkrip</th><th>Nama pada transkrip</th><th class="num">SKS</th><th>Padankan dengan mata kuliah KUREKAM</th></tr></thead><tbody>
    ${[...kosong.values()].map(t => `<tr><td><b>${esc(t.kode)}</b></td><td>${esc(t.nama)}<div class="small muted">${esc(t.namaEn)}</div></td><td class="num">${t.sks}</td><td><select class="inp sk-pad" data-k="${esc(t.kode)}"><option value="">— belum dipadankan —</option>${mks.map(m => `<option value="${esc(m.id)}" ${manual[t.kode] === m.id ? 'selected' : ''}>${esc(m.kode)} · ${esc(short(m.nama, 54))} · smt ${m.smt}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
    ${ed ? `<div class="filters" style="margin-top:8px"><button class="btn sm" id="sk-simpan-pad">${icon('check')} Simpan padanan terpilih ke mata kuliah</button><span class="small muted">Setelah disimpan, transkrip berikutnya langsung cocok.</span></div>` : '<div class="small muted" style="margin-top:6px">Menyimpan padanan permanen hanya untuk Kaprodi atau admin.</div>'}</div>` : ''}
  <div class="card" style="margin-top:18px">${head('3. Mahasiswa', 'Klik baris untuk melihat profil CPL. Nama dan NIM hanya tampil di layar ini.', 'user', '#10b981', `<button class="btn sm" id="sk-semua" ${boleh() ? '' : 'disabled'}>${icon('download')} Terbitkan dan cetak semua (${daftar.length})</button>`)}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>NIM</th><th>Nama</th><th class="num">IPK</th><th class="num">SKS</th><th>Transkrip</th><th class="num">Cakupan CPL</th><th>Terjemahan</th><th>Status</th></tr></thead><tbody>
    ${R.hasil.map(({ m, h }, i) => { const pv = perluVerifikasi(h); return `<tr class="click ${i === sel ? 'sel' : ''}" data-i="${i}"><td>${esc(nim(m))}</td><td>${esc(m.nama)}</td><td class="num">${m.ipk != null ? m.ipk.toFixed(2) : '–'}</td><td class="num">${m.sks}</td><td>${m.valid ? stTag('ok', 'Lolos') : stTag('bad', 'Periksa')}</td><td class="num">${fmt(h.cakupan, 0)}%</td><td>${pv.draf ? stTag('near', 'Draf') : stTag('ok', 'Terverifikasi')}</td><td>${terbit[nim(m)] ? stTag('ok', 'Terbit') : stTag('na', 'Pratinjau')}</td></tr>`; }).join('')}</tbody></table></div></div>
  ${cur ? profil(pid, K, R, cur, ed) : ''}
  ${rekapAngkatan(pid, K, R, ed)}`;
}

function profil(pid, K, R, cur, ed) {
  const { m, h } = cur, pv = perluVerifikasi(h), c = cat[nim(m)] || (cat[nim(m)] = { noIjazah: '', nonAkademik: '', nonAkademikEn: '' });
  const peringatan = [];
  if (h.tanpaPadanan.length) peringatan.push(`${h.tanpaPadanan.length} mata kuliah (${h.tanpaPadanan.reduce((a, t) => a + t.sks, 0)} SKS) belum dipadankan dengan KUREKAM: ${h.tanpaPadanan.map(t => t.kode).join(', ')}.`);
  if (h.tanpaCpl.length) peringatan.push(`${h.tanpaCpl.length} mata kuliah terpadankan tetapi belum terhubung ke CPL manapun: ${h.tanpaCpl.map(t => t.kode).join(', ')}.`);
  const viaNama = m.mk.filter(t => (R.padan.get(t.kode) || {}).via === 'nama').length;
  if (viaNama) peringatan.push(`${viaNama} mata kuliah dipadankan lewat nama yang sama (kode berbeda). Periksa, lalu simpan padanan kode agar pasti.`);
  if (h.cplKosong.length) peringatan.push(`CPL tanpa data nilai: ${h.cplKosong.join(', ')}.`);
  if (h.satuMk.length) peringatan.push(`CPL yang dibentuk hanya satu mata kuliah: ${h.satuMk.join(', ')} (kurang kuat sebagai bukti).`);
  if (h.cakupan < 90) peringatan.push(`Baru ${fmt(h.cakupan, 0)}% SKS transkrip yang terpetakan ke CPL; di bawah 90% skor kurang mewakili.`);
  if (pv.draf) peringatan.push(`Terjemahan belum diverifikasi Kaprodi: ${pv.cpl.length} CPL dan ${pv.mk.length} nama mata kuliah. Dokumen akan bertanda DRAF.`);
  return `<div class="card" style="margin-top:18px">${head(`4. Profil CPL · ${esc(nim(m))}`, esc(m.nama), 'pulse', '#8b5cf6', `<button class="btn sm" id="sk-prev">${icon('eye')} Pratinjau dokumen</button><button class="btn pri sm" id="sk-terbit" ${boleh() ? '' : 'disabled'}>${icon('medal')} Terbitkan dan cetak</button>`)}
    <div class="ind-list">${m.cek.map(x => `<div class="ind ${x.ok ? 'ok' : 'bad'}"><span class="ind-no">${x.ok ? '✓' : '!'}</span><div class="small">${esc(x.t)}</div></div>`).join('')}</div>
    ${peringatan.length ? `<div class="ribbon warn" style="margin-top:10px">${icon('alert')} <span>${peringatan.map(esc).join('<br>')}</span></div>` : ''}
    <div class="grid g4" style="margin-top:12px">${h.domain.filter(x => x.n).map(x => kpi(`${x.id} / ${x.en}`, x.skor == null ? 0 : +x.skor.toFixed(2), x.pred ? `${x.pred[0]} · ${x.terisi}/${x.n} CPL` : 'belum ada data', x.pred ? ({ sk: '#10b981', k: '#0ea5e9', ck: '#f5a524' })[x.pred[2]] : '#94a3b8', 'target', 2)).join('')}</div>
    <div class="grid g2" style="margin-top:12px;align-items:start"><div style="background:#fff;border-radius:12px;padding:8px">${radarSvg(h.hasil, R.rata, K)}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>CPL</th><th class="num">Skor</th><th>Predikat</th><th class="num">MK</th></tr></thead><tbody>${h.hasil.map(x => `<tr><td><b>${esc(x.cpl.kode)}</b><div class="small muted" style="white-space:normal">${esc(short(x.cpl.teks, 70))}</div></td><td class="num"><b>${n2(x.skor)}</b><div class="small muted">rata angk. ${n2(R.rata.get(x.cpl.id))}</div></td><td>${x.pred ? stTag(PRED[x.pred[2]], x.pred[0]) : stTag('na', 'Belum ada')}</td><td class="num">${x.jumlahMk}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="grid g2" style="margin-top:12px"><div class="field"><label>Nomor ijazah (opsional)</label><input class="inp" id="sk-ij" value="${esc(c.noIjazah)}" placeholder="diisi manual"></div><div></div>
    <div class="field"><label>Kegiatan non-akademik (Indonesia), diisi manual oleh tim</label><textarea class="inp" id="sk-na" rows="4" placeholder="Misalnya: Ketua Himpunan Mahasiswa 2024/2025; Juara 2 lomba karya tulis ilmiah tingkat nasional 2025.">${esc(c.nonAkademik)}</textarea></div>
    <div class="field"><label>Non-academic activities (English)</label><textarea class="inp" id="sk-nae" rows="4" placeholder="e.g. Chair of the Student Association 2024/2025; Second place, national scientific paper competition 2025.">${esc(c.nonAkademikEn)}</textarea></div></div>
    <div class="small muted">Isian ini hanya ada di layar dan ikut tercetak; tidak tersimpan di basis data.</div></div>`;
}

function rekapAngkatan(pid, K, R, ed) {
  const per = new Map(); R.hasil.forEach(x => { const a = angkatanDariNim(x.m.nim) || '?'; (per.get(a) || per.set(a, []).get(a)).push(x); });
  const baris = []; per.forEach((arr, ang) => agregatCapaian(arr, K).forEach(a => { const id = `CP-${pid}-${ang}-${a.cpl.id}-cpl`, ada = S.capaian.find(q => q.id === id); baris.push({ id, ang, a, ada }); }));
  if (!baris.length) return '';
  const asing = (b) => b.ada && b.ada.sumber !== 'SKPI';
  return `<div class="card" style="margin-top:18px">${head('5. Rekap angkatan ke Capaian CPL (tanpa nama)', `Per CPL: berapa lulusan yang dinilai dan berapa yang skor CPL-nya mencapai ${n2(K.capai)} (batas dapat diubah di Pengaturan). Termasuk bukti <b>tidak langsung</b> untuk IABEE dan LAM.`, 'target', '#0ea5e9', ed ? `<button class="btn pri sm" id="sk-rekap">${icon('check')} Simpan ke Capaian CPL</button>` : '')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Angkatan</th><th>CPL</th><th class="num">Dinilai</th><th class="num">Mencapai</th><th class="num">Persen</th><th>Keterangan</th></tr></thead><tbody>
    ${baris.map(b => `<tr><td>${esc(b.ang)}</td><td><b>${esc(b.a.cpl.kode)}</b></td><td class="num">${b.a.n}</td><td class="num">${b.a.lulus}</td><td class="num">${fmt(b.a.lulus / b.a.n * 100, 1)}%</td><td>${asing(b) ? stTag('near', 'Ada isian manual, tidak ditimpa') : b.ada ? stTag('na', 'Memperbarui rekap SKPI') : stTag('ok', 'Baru')}</td></tr>`).join('')}</tbody></table></div>
    <div class="small muted" style="margin-top:6px">Angkatan diambil dari dua digit pertama NIM. Hanya jumlah yang tersimpan; tidak ada nama, NIM, atau nilai per mahasiswa. Isian manual yang sudah ada di Capaian CPL tidak ditimpa.</div></div>`;
}

function pasang(el, pid, p, K, R, ed) {
  el.querySelectorAll('tr[data-i]').forEach(tr => tr.onclick = () => { sel = +tr.dataset.i; rerender(); });
  el.querySelectorAll('.sk-pad').forEach(s => s.onchange = () => { if (s.value) manual[s.dataset.k] = s.value; else delete manual[s.dataset.k]; rerender(); });
  const sp = el.querySelector('#sk-simpan-pad');
  if (sp) sp.onclick = async () => {
    const pilih = Object.entries(manual); if (!pilih.length) { toast('Belum ada padanan yang dipilih.'); return; }
    for (const [kode, id] of pilih) { const mk = S.mk.find(x => x.id === id); if (!mk) continue; const ada = new Set([].concat(mk.kodeSiakad || [])); ada.add(kode); await save('mk', { ...mk, kodeSiakad: [...ada] }, `Padanan kode SIAKAD ${kode} → ${mk.kode}`); }
    manual = {}; toast(`${pilih.length} padanan tersimpan.`); rerender();
  };
  const cur = R.hasil[Math.min(sel, R.hasil.length - 1)];
  const sm = el.querySelector('#sk-semua'); if (sm) sm.onclick = () => terbitkan(pid, p, K, R, R.hasil, true);
  if (cur) {
    const c = cat[nim(cur.m)];
    const bind = (id, k) => { const e = el.querySelector(id); if (e) e.oninput = () => { c[k] = e.value; }; };
    bind('#sk-ij', 'noIjazah'); bind('#sk-na', 'nonAkademik'); bind('#sk-nae', 'nonAkademikEn');
    el.querySelector('#sk-prev').onclick = () => tampil(pid, p, K, R, [cur], false);
    el.querySelector('#sk-terbit').onclick = () => terbitkan(pid, p, K, R, [cur], false);
  }
  const rk = el.querySelector('#sk-rekap');
  if (rk) rk.onclick = async () => {
    const per = new Map(); R.hasil.forEach(x => { const a = angkatanDariNim(x.m.nim) || '?'; (per.get(a) || per.set(a, []).get(a)).push(x); });
    const docs = []; let lewat = 0; const tgl = new Date().toISOString().slice(0, 10);
    per.forEach((arr, ang) => { if (ang === '?') return; agregatCapaian(arr, K).forEach(a => { const id = `CP-${pid}-${ang}-${a.cpl.id}-cpl`, ada = S.capaian.find(q => q.id === id); if (ada && ada.sumber !== 'SKPI') { lewat++; return; } docs.push({ id, prodi: pid, angkatan: ang, cpl: a.cpl.id, pi: '', n: a.n, lulus: a.lulus, catatan: `Dari SKPI: skor CPL minimal ${n2(K.capai)} pada transkrip (bukti tidak langsung)`, tgl, sumber: 'SKPI' }); }); });
    if (!docs.length) { toast('Tidak ada baris yang bisa disimpan.'); return; }
    if (!(await tanya(`${docs.length} baris akan disimpan ke Capaian CPL${lewat ? ` (${lewat} baris dilewati karena sudah ada isian manual)` : ''}. Hanya angka agregat tanpa nama. Lanjutkan?`, 'Simpan'))) return;
    await saveMany('capaian', docs, `Rekap SKPI ke Capaian CPL ${pid}: ${docs.length} baris`); toast('Capaian CPL tersimpan.'); rerender();
  };
}

/* ---------- dokumen, penerbitan, dan QR ---------- */
const urlVerif = (kode) => new URL('verifikasi.html', document.baseURI).href + '?k=' + encodeURIComponent(kode);
const logo = (f) => new URL('assets/img/' + f, document.baseURI).href;

async function daftarkan(pid, p, K, x) {
  const n = nim(x.m), kano = (kode) => sidikKanonik(n, kode, x.h.hasil), skor = Object.fromEntries(x.h.hasil.filter(q => q.skor != null).map(q => [q.cpl.kode, +q.skor.toFixed(2)]));
  const lama = terbit[n];
  if (lama) { const h2 = await sidik(kano(lama.kode)); if (h2 === lama.hash) return lama; }
  const yd = (x.m.yudisium || '').match(/(\d{4})/), kode = kodeBaru(pid, yd ? yd[1] : new Date().getFullYear()), hash = await sidik(kano(kode));
  const doc = { id: kode, hash, prodi: pid, prodiNama: p.nama, kur: K.kurikulum, tgl: new Date().toISOString().slice(0, 10), skor, status: 'sah', v: 1 };
  let terdaftar = false; try { terdaftar = await DB.tulisLuar('skpi_verif', doc); } catch (e) { console.warn('QR tidak terdaftar:', e.message); }
  const t = { kode, hash, terdaftar }; terbit[n] = t; return t;
}

async function tampil(pid, p, K, R, daftarX, terbitSemua) {
  let qrLib = null; try { qrLib = await muatQr(); } catch (e) { /* QR dilewati */ }
  const siswa = [];
  for (const x of daftarX) {
    const t = terbit[nim(x.m)] || null; let qr = '';
    if (t && qrLib) { const q = qrLib(0, 'M'); q.addData(urlVerif(t.kode)); q.make(); qr = q.createSvgTag({ cellSize: 3, margin: 1, scalable: true }); }
    siswa.push({ m: x.m, h: x.h, cat: cat[nim(x.m)] || {}, kode: t && t.kode, qr, url: t && urlVerif(t.kode), rata: R.rata, tgl: new Date() });
  }
  const draf = daftarX.some(x => perluVerifikasi(x.h).draf);
  const html = bangunSkpi({ prodiNama: p.nama, K, siswa, logoPem: logo('logo-pem-akamigas.png'), logoEsdm: logo('logo-esdm.png'), draf });
  const ov = document.createElement('div'); ov.id = 'skpi-ov'; ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.7);display:flex;flex-direction:column';
  ov.innerHTML = `<div style="display:flex;gap:8px;padding:8px 12px;background:#0f172a;align-items:center;flex-wrap:wrap"><b style="color:#fff">SKPI · ${siswa.length === 1 ? esc(nim(siswa[0].m)) : siswa.length + ' mahasiswa'}${draf ? ' · DRAF' : ''}</b><div style="flex:1"></div><span class="small" style="color:#cbd5e1">Di jendela cetak pilih “Simpan sebagai PDF”, ukuran A4, tanpa header dan footer.</span><button class="btn pri sm" id="skpi-print">Cetak / simpan PDF</button><button class="btn sm" id="skpi-tutup">Tutup</button></div><iframe id="skpi-fr" style="flex:1;border:0;background:#e2e8f0" title="Pratinjau SKPI"></iframe>`;
  document.body.appendChild(ov);
  ov.querySelector('iframe').srcdoc = html;
  ov.querySelector('#skpi-tutup').onclick = () => { ov.remove(); rerender(); };
  ov.querySelector('#skpi-print').onclick = () => { const w = ov.querySelector('iframe').contentWindow; w.focus(); w.print(); };
  window.__skpiHtml = html;
}

async function terbitkan(pid, p, K, R, daftarX, semua) {
  const draf = daftarX.filter(x => perluVerifikasi(x.h).draf).length;
  const salah = daftarX.filter(x => !x.m.valid).length;
  let pesan = semua ? `Menerbitkan ${daftarX.length} SKPI akan mendaftarkan kode keaslian (QR) tanpa nama ke basis data.` : 'Menerbitkan SKPI ini akan mendaftarkan kode keaslian (QR) tanpa nama ke basis data.';
  if (salah) pesan += ` ${salah} transkrip belum lolos pemeriksaan.`;
  if (draf) pesan += ` ${draf} dokumen masih memuat terjemahan yang belum diverifikasi dan akan bertanda DRAF.`;
  if (!(await tanya(pesan + ' Lanjutkan?', 'Terbitkan'))) return;
  for (const x of daftarX) await daftarkan(pid, p, K, x);
  const tdk = daftarX.filter(x => !terbit[nim(x.m)].terdaftar).length;
  if (tdk) toast(`${tdk} QR belum terdaftar karena aplikasi tidak tersambung ke Firestore (mode simulasi). QR tidak akan lolos verifikasi.`);
  await tampil(pid, p, K, R, daftarX, semua);
}

/* ================= kesiapan ================= */
function tSiap(el, pid, p, ed) {
  const k = kesiapanSkpi(S, pid), K = pengaturan(S, pid);
  el.innerHTML = `<div class="card">${head('Kesiapan struktur untuk SKPI · ' + pid, esc(p.nama), 'check', '#10b981')}
    <div class="ind-list">${k.syarat.map(x => `<div class="ind ${x.ok ? 'ok' : 'bad'}"><span class="ind-no">${x.ok ? '✓' : '–'}</span><div><b>${esc(x.t)}</b><div class="small muted">${esc(x.ket)}</div></div></div>`).join('')}</div>
    <div class="small muted" style="margin-top:6px">Terpenuhi <b>${k.ok} dari ${k.syarat.length}</b>. Penyusunan CPMK dan pemetaannya ke CPL dilakukan di menu CPMK & Sub-CPMK.</div></div>
  <div class="card" style="margin-top:18px">${head('Aturan yang dipakai dan dasarnya', 'Agar nilai di SKPI dapat ditelusuri dan dipertanggungjawabkan.', 'audit', '#8b5cf6')}
    <ol class="small" style="line-height:1.7;padding-left:18px">
      <li><b>Sumber pemetaan.</b> Satu-satunya sumber adalah CPMK → CPL di KUREKAM (prinsip OBE: CPL dibangun oleh CPMK pada tiap mata kuliah). Bila suatu MK belum punya CPMK, dipakai pemetaan MK → CPL dan ditandai pada rincian.</li>
      <li><b>Sumber nilai.</b> Hanya transkrip resmi SIAKAD. Angka mutu = kolom Mutu ÷ SKS, diperiksa silang dengan skala SIAKAD (A=4, AB=3,5, B=3, BC=2,5, C=2, D=1, E=0).</li>
      <li><b>Pemeriksaan transkrip.</b> Jumlah SKS, jumlah mutu, dan IPK dihitung ulang dan harus sama dengan yang tercetak di transkrip; bila tidak, ditandai “Periksa”.</li>
      <li><b>Bobot.</b> Skor CPL = Σ(angka mutu × SKS × porsi) ÷ Σ(SKS × porsi). SKS mencerminkan beban belajar; porsi = bagian CPMK mata kuliah itu yang mendukung CPL tersebut (bobot Sub-CPMK bila lengkap, bila tidak sama rata). Skala 0–4.</li>
      <li><b>Predikat.</b> &gt; ${n2(K.sangat)} Sangat Kompeten; ${n2(K.kompeten)}–${n2(K.sangat)} Kompeten; &lt; ${n2(K.kompeten)} Cukup Kompeten. Ambang mengikuti SKPI PEM sebelumnya dan dapat diubah di Pengaturan oleh yang berwenang.</li>
      <li><b>Ranah.</b> Empat ranah SN-Dikti (Sikap, Pengetahuan, Keterampilan Umum, Keterampilan Khusus); ringkasan per ranah dihitung dari seluruh kontribusi MK pada CPL di ranah itu.</li>
      <li><b>Kualifikasi.</b> Sarjana Terapan (D4) = KKNI level 6.</li>
      <li><b>Terjemahan.</b> Semua terjemahan CPL dan nama MK berstatus draf sampai Kaprodi memverifikasi. Dokumen yang masih memuat butir belum terverifikasi dicetak dengan tanda air DRAF. Nama MK Inggris boleh dari transkrip SIAKAD (resmi institusi).</li>
      <li><b>Keaslian.</b> QR menuju halaman verifikasi yang memuat kode dokumen, prodi, tanggal, dan skor CPL tanpa nama. Pemeriksa yang memasukkan NIM dapat memastikan sidik (SHA-256) cocok; NIM dan nama tidak disimpan.</li>
      <li><b>Kegiatan non-akademik.</b> Diisi manual oleh tim; tidak dibuat otomatis.</li>
    </ol></div>`;
}

/* ================= terjemahan ================= */
function tTerjemah(el, pid, p, ed) {
  const cpl = byProdi(S.cpl, pid), mks = byProdi(S.mk, pid).slice().sort((a, b) => (a.smt - b.smt) || String(a.nama).localeCompare(b.nama));
  const k = kesiapanSkpi(S, pid), tdraf = [...cpl, ...mks].filter(x => (x.tekEn || x.namaEn) && x.enStatus !== 'ok').length;
  const row = (jenis, x, idF, enF) => `<tr data-j="${jenis}" data-id="${esc(x.id)}"><td><b>${esc(x.kode)}</b></td><td style="white-space:normal">${esc(idF)}</td><td><textarea class="inp tj-en" rows="2" ${ed ? '' : 'disabled'}>${esc(enF || '')}</textarea>${jenis === 'cpl' ? `<input class="inp tj-s" style="margin-top:4px" placeholder="Singkat (ID) untuk grafik" value="${esc(x.singkat || '')}" ${ed ? '' : 'disabled'}><input class="inp tj-se" style="margin-top:4px" placeholder="Short name (EN)" value="${esc(x.singkatEn || '')}" ${ed ? '' : 'disabled'}>` : ''}</td><td>${enF ? (x.enStatus === 'ok' ? stTag('ok', 'Terverifikasi') : stTag('near', 'Draf')) : stTag('na', 'Kosong')}${ed && enF ? `<div style="margin-top:6px"><label class="small"><input type="checkbox" class="tj-ok" ${x.enStatus === 'ok' ? 'checked' : ''}> terverifikasi</label></div>` : ''}</td></tr>`;
  el.innerHTML = `<div class="ribbon info">${icon('info')} <span>Terjemahan di bawah dibuat sebagai <b>draf</b> dan <b>wajib diverifikasi Kaprodi</b> (centang “terverifikasi” per butir). Dokumen yang masih memuat butir belum terverifikasi dicetak dengan tanda air DRAF.</span></div>
  <div class="card">${head('Terjemahan Inggris · ' + pid, `${k.cplEn} dari ${cpl.length} CPL dan ${k.mkEn} dari ${mks.length} MK sudah ada terjemahan; ${k.cplOk + k.mkOk} butir terverifikasi, ${tdraf} masih draf.`, 'edit', '#8b5cf6', ed ? `<button class="btn sm" id="tj-draf">${icon('spark')} Isi draf yang kosong</button><button class="btn sm" id="tj-xl">${icon('download')} Excel</button><button class="btn sm" id="tj-imp">${icon('upload')} Impor Excel</button><button class="btn pri sm" id="tj-simpan">${icon('check')} Simpan perubahan</button>` : ro())}
    <h4 style="margin:10px 0 4px">CPL</h4>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Indonesia</th><th>English</th><th>Status</th></tr></thead><tbody>${cpl.map(c => row('cpl', c, c.teks, c.tekEn)).join('')}</tbody></table></div>
    <h4 style="margin:14px 0 4px">Mata kuliah</h4>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Indonesia</th><th>English</th><th>Status</th></tr></thead><tbody>${mks.map(m => row('mk', m, m.nama, m.namaEn)).join('')}</tbody></table></div></div>`;
  if (!ed) return;
  const kumpul = () => {
    const docs = [];
    el.querySelectorAll('tr[data-id]').forEach(tr => {
      const j = tr.dataset.j, x = (j === 'cpl' ? S.cpl : S.mk).find(q => q.id === tr.dataset.id); if (!x) return;
      const en = tr.querySelector('.tj-en').value.trim(), ok = tr.querySelector('.tj-ok'), d = { ...x };
      if (j === 'cpl') { d.tekEn = en; d.singkat = tr.querySelector('.tj-s').value.trim(); d.singkatEn = tr.querySelector('.tj-se').value.trim(); } else d.namaEn = en;
      d.enStatus = en ? (ok ? (ok.checked ? 'ok' : 'draf') : (x.enStatus || 'draf')) : '';
      if (JSON.stringify(d) !== JSON.stringify(x)) docs.push(d);
    });
    return docs;
  };
  el.querySelector('#tj-simpan').onclick = async () => {
    const semua = kumpul(), cplD = semua.filter(d => 'teks' in d), mkD = semua.filter(d => !('teks' in d));
    if (!cplD.length && !mkD.length) { toast('Tidak ada perubahan.'); return; }
    if (cplD.length) await saveMany('cpl', cplD, `Terjemahan CPL ${pid}: ${cplD.length} butir`);
    if (mkD.length) await saveMany('mk', mkD, `Terjemahan MK ${pid}: ${mkD.length} butir`);
    toast(`Tersimpan: ${cplD.length} CPL, ${mkD.length} MK.`); rerender();
  };
  el.querySelector('#tj-draf').onclick = async () => {
    let nc = 0, nm = 0; const pas = []; daftar.forEach(m => m.mk.forEach(t => { if (t.namaEn) pas.push([t.nama, t.namaEn]); })); const dari = tambahMkEn(pas);
    const cD = [], mD = [];
    cpl.forEach(c => { if (c.tekEn) return; const d = draftCpl(c); if (d) { cD.push({ ...c, tekEn: d.en, singkat: c.singkat || d.s, singkatEn: c.singkatEn || d.se, enStatus: 'draf' }); nc++; } });
    mks.forEach(m => { if (m.namaEn) return; const d = draftMk(m); if (d) { mD.push({ ...m, namaEn: d, enStatus: 'draf' }); nm++; } });
    if (!cD.length && !mD.length) { toast('Tidak ada butir kosong yang punya draf. Isi manual atau impor Excel.'); return; }
    if (!(await tanya(`Draf akan mengisi ${nc} CPL dan ${nm} mata kuliah yang masih kosong${dari ? ` (termasuk ${dari} nama dari transkrip SIAKAD)` : ''}. Semua berstatus DRAF sampai Anda memverifikasi. Lanjutkan?`, 'Isi draf'))) return;
    if (cD.length) await saveMany('cpl', cD, `Draf terjemahan CPL ${pid}: ${cD.length}`);
    if (mD.length) await saveMany('mk', mD, `Draf terjemahan MK ${pid}: ${mD.length}`);
    toast(`Draf terisi: ${nc} CPL, ${nm} MK.`); rerender();
  };
  el.querySelector('#tj-xl').onclick = async () => {
    const X = await loadXLSX(), wb = X.utils.book_new();
    const rows = [['Jenis', 'Kode', 'Indonesia', 'English', 'Singkat (ID)', 'Short name (EN)', 'Terverifikasi (ya/tidak)'], ...cpl.map(c => ['CPL', c.kode, c.teks, c.tekEn || '', c.singkat || '', c.singkatEn || '', c.enStatus === 'ok' ? 'ya' : 'tidak']), ...mks.map(m => ['MK', m.kode, m.nama, m.namaEn || '', '', '', m.enStatus === 'ok' ? 'ya' : 'tidak'])];
    const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = [8, 12, 60, 60, 26, 26, 14].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'TERJEMAHAN');
    unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Terjemahan_SKPI_${pid}.xlsx`);
  };
  el.querySelector('#tj-imp').onclick = () => {
    const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls';
    f.onchange = async () => {
      if (!f.files[0]) return;
      try {
        const X = await loadXLSX(), wb = X.read(await f.files[0].arrayBuffer(), { type: 'array' }), rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        const cD = [], mD = [];
        rows.slice(1).forEach(r => {
          const j = String(r[0]).trim().toUpperCase(), kd = String(r[1]).trim(), en = String(r[3]).trim(), ok = /^(ya|y|ok|true|1)$/i.test(String(r[6]).trim());
          if (!kd || !en) return;
          if (j === 'CPL') { const c = cpl.find(x => x.kode === kd); if (c) cD.push({ ...c, tekEn: en, singkat: String(r[4]).trim() || c.singkat || '', singkatEn: String(r[5]).trim() || c.singkatEn || '', enStatus: ok ? 'ok' : 'draf' }); }
          else if (j === 'MK') { const m = mks.find(x => x.kode === kd); if (m) mD.push({ ...m, namaEn: en, enStatus: ok ? 'ok' : 'draf' }); }
        });
        if (!cD.length && !mD.length) { toast('Tidak ada baris yang cocok. Gunakan berkas dari tombol Excel.'); return; }
        if (!(await tanya(`Impor akan memperbarui ${cD.length} CPL dan ${mD.length} mata kuliah. Lanjutkan?`, 'Impor'))) return;
        if (cD.length) await saveMany('cpl', cD, `Impor terjemahan CPL ${pid}`); if (mD.length) await saveMany('mk', mD, `Impor terjemahan MK ${pid}`);
        toast('Terjemahan diimpor.'); rerender();
      } catch (e) { console.error(e); toast('Impor gagal: ' + e.message); }
    };
    f.click();
  };
}

/* ================= pengaturan ================= */
function tSetelan(el, pid, p, ed) {
  const K = pengaturan(S, pid);
  const F = [['institusi', 'Nama perguruan tinggi (Indonesia)'], ['institusiEn', 'Institution name (English)'], ['badan', 'Badan pembina (Indonesia)'], ['badanEn', 'Governing body (English)'], ['gelar', 'Gelar lulusan'], ['gelarEn', 'Title awarded (English)'], ['jenjang', 'Jenis dan jenjang'], ['kkni', 'Level KKNI', 'number'], ['lamaStudi', 'Lama studi resmi'], ['kurikulum', 'Kurikulum yang berlaku'], ['akred', 'Status akreditasi prodi'], ['tempat', 'Kota penerbitan'], ['jabatan', 'Jabatan penandatangan'], ['jabatanEn', 'Signatory title (English)'], ['penandatangan', 'Nama penandatangan'], ['nip', 'NIP penandatangan'], ['sangat', 'Batas Sangat Kompeten (lebih dari)', 'number'], ['kompeten', 'Batas Kompeten (minimal)', 'number'], ['capai', 'Batas “mencapai” untuk rekap Capaian CPL', 'number']];
  el.innerHTML = `<div class="card">${head('Pengaturan SKPI · ' + pid, esc(p.nama), 'edit', '#64748b', ed ? `<button class="btn pri sm" id="st-simpan">${icon('check')} Simpan</button>` : ro())}
    <div class="form-grid">${F.map(([k, l, t]) => `<div class="field ${t ? '' : 'full'}"><label>${l}</label><input class="inp" name="${k}" ${t ? `type="number" step="0.01"` : ''} value="${esc(K[k] == null ? '' : K[k])}" ${ed ? '' : 'disabled'}></div>`).join('')}</div>
    <div class="small muted" style="margin-top:8px">Ambang predikat bawaan mengikuti SKPI PEM sebelumnya (3,50 dan 3,00). Batas “mencapai” 2,50 setara nilai 60 (BC) pada skala SIAKAD umum; sesuaikan bila skala PEM berbeda. Nama resmi institusi dan terjemahannya perlu dipastikan bagian hukum atau akademik.</div></div>`;
  if (!ed) return;
  el.querySelector('#st-simpan').onclick = async () => {
    const o = {}; el.querySelectorAll('[name]').forEach(i => { o[i.name] = i.type === 'number' ? (i.value === '' ? SKPI_DEF[i.name] : +i.value) : i.value.trim(); });
    if (!(o.sangat > o.kompeten && o.kompeten > 0 && o.sangat <= 4)) { toast('Batas Sangat Kompeten harus lebih besar dari batas Kompeten, dan maksimal 4.'); return; }
    S.settings.skpi = { ...(S.settings.skpi || {}), [pid]: o }; await saveSettings(); toast('Pengaturan SKPI tersimpan.'); rerender();
  };
}
