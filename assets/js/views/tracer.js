/* KUREKAM · Tracer study dan survei pengguna format LAM Teknik (butir 53 sampai 56).
   Disimpan sebagai jumlah per kategori pada dokumen lulusan yang sama (tanpa duplikasi); berkas tanggapan hanya dibaca di peramban. */
import { S, ctx, save, saveMany, rerender, esc, icon, toast } from '../app.js';
import { DB } from '../db.js';
import { chart, AX } from '../charts.js';
import { fmt } from '../rules.js';
import { head, formDrawer, ro, kpi, animateCounts, stTag, tanya, unduh, loadXLSX } from './ui.js';
import { ASPEK, NILAI, KAT, pasangan, tahunBawaan, hitung, cekBaris } from '../tracerlam.js';

let tsPilih = '';
const nz = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const num = (v) => (v == null || v === '' || Number.isNaN(+v)) ? 0 : +v;
const sm = (o, ks) => ks.reduce((a, k) => a + num(o && o[k]), 0);
const KS = { wt: ['a', 'b', 'c'], ks: ['r', 's', 't'], tk: ['i', 'n', 'w'] };

const warna = (v) => v == null ? 'na' : v >= 3.5 ? 'ok' : v >= 2.5 ? 'near' : 'bad';
const skorTag = (v) => stTag(warna(v), v == null ? 'Belum' : fmt(v, 2));

export function tTracer(el, pid, p, ed) {
  const rows = S.lulusan.filter(x => x.prodi === pid).sort((a, b) => String(a.tahun).localeCompare(String(b.tahun)));
  const demo = DB.mode !== 'firebase';
  const th = rows.some(r => String(r.tahun) === tsPilih) ? tsPilih : tahunBawaan(rows);
  const pr = pasangan(rows, th), h = hitung(pr.ts2, pr.ts1), ilus = rows.some(r => r.ilustratif);
  const lengkap = (r) => num(r.tracer) > 0 && ['wt', 'ks', 'tk'].every(f => sm(r[f], KS[f]) === num(r.tracer));
  const butir = [[53, 'Waktu tunggu', h.b53], [54, 'Kesesuaian bidang kerja', h.b54], [55, 'Tingkat tempat kerja', h.b55], [56, 'Kepuasan pengguna lulusan', h.b56]];

  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Bagian ini menyiapkan data <b>tracer study dan survei pengguna dalam format LAM Teknik 2025 (butir 53 sampai 56)</b>. Isi hanya jumlah per kategori, atau impor berkas tanggapan (Google Form diunduh sebagai Excel atau CSV): berkasnya dihitung di peramban dan <b>yang tersimpan hanya jumlah</b>, tanpa nama atau NIM. Jumlah lulusan dan responden diisi di tab <b>Lulusan dan tracer</b>.</span></div>
  ${ilus ? `<div class="ribbon warn">${icon('info')} <span>Ada data <b>contoh ilustratif</b> (untuk peragaan). Ganti dengan hasil tracer sungguhan; mengimpor atau mengisi ulang tahun yang sama otomatis menghapus tanda ilustratif.</span></div>` : ''}
  <div class="card">${head('Tracer dan survei pengguna · ' + pid, esc(p.nama) + '. Klik baris untuk mengisi sebaran.', 'link', '#14b8a6', ed ? `<button class="btn sm" id="t-ins">${icon('download')} Instrumen dan templat</button><button class="btn sm" id="t-it">${icon('upload')} Impor tanggapan tracer</button><button class="btn sm" id="t-ip">${icon('upload')} Impor survei pengguna</button>${demo && !rows.length ? `<button class="btn sm" id="t-ct">${icon('spark')} Muat contoh ilustratif</button>` : ''}` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th rowspan="2">Tahun lulus</th><th rowspan="2" class="num">Lulusan</th><th rowspan="2" class="num">Terlacak</th><th colspan="3" class="num">Waktu tunggu</th><th colspan="3" class="num">Kesesuaian bidang</th><th colspan="3" class="num">Tingkat tempat kerja</th><th rowspan="2" class="num">Pengguna</th><th rowspan="2">Status</th></tr>
      <tr>${[...KAT.wt, ...KAT.ks, ...KAT.tk].map(([, t]) => `<th class="num small">${esc(t.replace('Multinasional atau internasional', 'Multinasional').replace('Wilayah, lokal, atau wirausaha', 'Wilayah/lokal').replace('Kurang dari 3 bulan', '&lt; 3 bln').replace('3 sampai 6 bulan', '3–6 bln').replace('Lebih dari 6 bulan', '&gt; 6 bln'))}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr class="${ed ? 'click' : ''}" data-r="${esc(r.id)}"><td><b>${esc(r.tahun)}</b>${r.ilustratif ? ' <span class="small muted">(contoh)</span>' : ''}</td><td class="num">${num(r.jumlah)}</td><td class="num">${num(r.tracer)}</td>
      ${['wt', 'ks', 'tk'].map(f => KS[f].map(k => `<td class="num">${r[f] && r[f][k] != null ? num(r[f][k]) : '–'}</td>`).join('')).join('')}
      <td class="num">${num(r.pengguna)}${ed ? ` <button class="btn ghost sm" data-kp="${esc(r.id)}" title="Isi kepuasan pengguna">${icon('edit')}</button>` : ''}</td>
      <td>${num(r.tracer) ? (lengkap(r) ? stTag('ok', 'Lengkap') : stTag('near', 'Sebaran belum sama dengan terlacak')) : stTag('na', 'Isi responden tracer dulu')}</td></tr>`).join('') || '<tr><td colspan="13" class="empty">Belum ada data lulusan. Isi jumlah lulusan dan responden di tab Lulusan dan tracer.</td></tr>'}
    </tbody></table></div></div>
  ${rows.length ? `<div class="card" style="margin-top:18px">${head('Perkiraan skor LAM butir 53 sampai 56', 'Dihitung dengan rumus lembar LAM Teknik 2025 dari lulusan TS-2 dan TS-1. Hanya perkiraan; angka resmi tetap diisi di SIMANTAP.', 'target', '#8b5cf6',
      `<label class="small muted">Tahun lulus TS-1 </label><select class="inp" id="t-ts" style="width:auto">${rows.map(r => `<option ${String(r.tahun) === th ? 'selected' : ''}>${esc(r.tahun)}</option>`).join('')}</select>`)}
    <div class="small muted" style="margin-bottom:10px">TS-1 = ${esc(th)} dan TS-2 = ${+th - 1}${pr.ts2 ? '' : ' (data tahun TS-2 belum ada, dihitung dari TS-1 saja)'}. Lulusan ${fmt(h.NL)} · terlacak ${fmt(h.NJ)} (${fmt(h.PJ * 100, 1)}%; batas skor ${fmt(30)}%, responden minimum ${fmt(h.Prmin * 100, 1)}%) · pengguna menanggapi ${fmt(h.NP)} (${fmt(h.PP * 100, 1)}%).</div>
    <div class="grid g4">${butir.map(([no, nm, b]) => kpi(`Butir ${no} · ${nm}`, b.nilai == null ? '–' : fmt(b.nilai, 2), b.ket, b.nilai == null ? '#94a3b8' : b.nilai >= 3.5 ? '#10b981' : b.nilai >= 2.5 ? '#f5a524' : '#f0616d', 'target', 2)).join('')}</div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Kepuasan pengguna per aspek', 'Skor 1 sampai 4 (4 × sangat baik + 3 × baik + 2 × cukup + 1 × kurang)', 'user', '#0ea5e9')}${h.aspek.some(a => a.skor != null) ? '<div class="chart" id="c-kp"></div>' : '<div class="empty">Belum ada tanggapan survei pengguna. Isi lewat tombol pensil di kolom Pengguna atau impor berkas.</div>'}</div>
    <div class="card">${head('Yang menjadi catatan LAM', 'Butir 52 (tracer study) bersifat kualitatif', 'info', '#f5a524')}
      <div class="small" style="line-height:1.55">Butir 52 menilai lima aspek: (1) tracer terkoordinasi di tingkat PT, (2) rutin tiap tahun dan terdokumentasi, (3) kuesioner memuat <b>seluruh pertanyaan inti tracer study DIKTI</b>, (4) sasaran seluruh populasi lulusan TS-4 sampai TS-2, (5) hasilnya dipakai untuk pengembangan kurikulum dan pembelajaran. Instrumen yang diunduh dari tombol <b>Instrumen dan templat</b> perlu dicocokkan dengan kuesioner inti DIKTI terbaru sebelum disebar. Aspek (5) dibuktikan lewat menu <b>Advisory Board Industri</b> dan <b>Revisi dan Pengesahan</b>.</div></div></div>` : ''}`;
  animateCounts(el);
  if (rows.length) {
    const sel = el.querySelector('#t-ts'); if (sel) sel.onchange = () => { tsPilih = sel.value; rerender(); };
    if (h.aspek.some(a => a.skor != null)) chart(el.querySelector('#c-kp'), { tooltip: { trigger: 'axis' }, grid: { left: 8, right: 24, top: 10, bottom: 8, containLabel: true }, xAxis: { type: 'value', min: 0, max: 4, ...AX }, yAxis: { type: 'category', inverse: true, data: h.aspek.map(a => a.nm), ...AX },
      series: [{ type: 'bar', barMaxWidth: 18, itemStyle: { color: '#0ea5e9', borderRadius: [0, 6, 6, 0] }, label: { show: true, position: 'right', formatter: (x) => fmt(x.value, 2) }, data: h.aspek.map(a => a.skor == null ? 0 : +a.skor.toFixed(2)) }] });
  }
  if (!ed) return;
  const q = (id) => el.querySelector(id);
  if (q('#t-ct')) q('#t-ct').onclick = async () => { await saveMany('lulusan', contohLulusan(pid), `Muat contoh tracer ilustratif ${pid}`); toast('Contoh ilustratif dimuat'); rerender(); };
  q('#t-ins').onclick = () => instrumen(pid);
  q('#t-it').onclick = () => pilihBerkas((f) => imporTracer(f, pid));
  q('#t-ip').onclick = () => pilihBerkas((f) => imporPengguna(f, pid));
  el.querySelectorAll('[data-r]').forEach(r => r.onclick = (e) => { if (e.target.closest('[data-kp]')) return; sebaran(S.lulusan.find(x => x.id === r.dataset.r)); });
  el.querySelectorAll('[data-kp]').forEach(b => b.onclick = () => kepuasan(S.lulusan.find(x => x.id === b.dataset.kp)));
}

function pilihBerkas(fn) {
  const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls,.csv';
  f.onchange = async () => { if (!f.files[0]) return; try { await fn(f.files[0]); } catch (e) { console.error(e); toast('Impor gagal: ' + e.message); } };
  f.click();
}

/* ---------- isian sebaran ---------- */
function sebaran(r) {
  if (!r) return;
  const o = { ...r, wt_a: r.wt && r.wt.a, wt_b: r.wt && r.wt.b, wt_c: r.wt && r.wt.c, ks_r: r.ks && r.ks.r, ks_s: r.ks && r.ks.s, ks_t: r.ks && r.ks.t, tk_i: r.tk && r.tk.i, tk_n: r.tk && r.tk.n, tk_w: r.tk && r.tk.w };
  const fl = (f, jud) => KAT[f].map(([k, t]) => ({ k: `${f}_${k}`, label: `${jud} · ${t}`, type: 'number' }));
  formDrawer({ title: `Sebaran tracer · lulusan ${r.tahun}`, sub: `${r.prodi} · terlacak ${num(r.tracer)} dari ${num(r.jumlah)} lulusan. Jumlah tiap kelompok sebaiknya sama dengan terlacak.`, obj: o,
    fields: [...fl('wt', 'Waktu tunggu mendapat pekerjaan pertama'), ...fl('ks', 'Kesesuaian bidang kerja'), ...fl('tk', 'Tingkat tempat kerja')],
    onSave: async (x) => {
      if (!num(r.tracer)) return 'Isi dahulu jumlah responden tracer di tab Lulusan dan tracer.';
      const d = { ...r }; delete d.ilustratif;
      for (const f of ['wt', 'ks', 'tk']) { d[f] = {}; for (const k of KS[f]) { const v = x[`${f}_${k}`]; if (v != null && (!Number.isInteger(v) || v < 0)) return 'Isi bilangan bulat tidak negatif.'; d[f][k] = v == null ? 0 : v; } }
      const e = cekBaris(d); if (e) return e;
      d.tgl = today(); await save('lulusan', d, `Simpan sebaran tracer ${r.prodi} ${r.tahun}`); rerender();
    } });
}

function kepuasan(r) {
  if (!r) return;
  const o = { ...r }; ASPEK.forEach(([id]) => NILAI.forEach(([v]) => { o[`${id}_${v}`] = r.kp && r.kp[id] ? r.kp[id][v] : null; }));
  formDrawer({ title: `Kepuasan pengguna · lulusan ${r.tahun}`, sub: `${r.prodi} · jumlah tanggapan pengguna per aspek (maksimum ${num(r.pengguna)} sesuai responden survei pengguna)`, obj: o,
    fields: ASPEK.flatMap(([id, nm]) => NILAI.map(([v, t]) => ({ k: `${id}_${v}`, label: `${nm} · ${t}`, type: 'number' }))),
    onSave: async (x) => {
      if (!num(r.pengguna)) return 'Isi dahulu jumlah responden survei pengguna di tab Lulusan dan tracer.';
      const d = { ...r }; delete d.ilustratif; d.kp = {};
      for (const [id] of ASPEK) { d.kp[id] = {}; for (const [v] of NILAI) { const n = x[`${id}_${v}`]; if (n != null && (!Number.isInteger(n) || n < 0)) return 'Isi bilangan bulat tidak negatif.'; d.kp[id][v] = n == null ? 0 : n; } }
      const e = cekBaris(d); if (e) return e;
      d.tgl = today(); await save('lulusan', d, `Simpan kepuasan pengguna ${r.prodi} ${r.tahun}`); rerender();
    } });
}

/* ---------- impor berkas tanggapan (hanya dihitung, tidak disimpan) ---------- */
async function bacaTabel(file, wajib) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
  for (const nm of wb.SheetNames) {
    const rows = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: '' });
    const i = rows.findIndex(r => r.some(c => wajib.test(nz(c))));
    if (i >= 0) return { rows: rows.slice(i + 1).filter(r => r.some(v => String(v).trim()) && !r.some(v => /hapus baris ini/i.test(String(v)))), h: rows[i].map(nz) };
  }
  throw new Error('Kolom "Tahun lulus" tidak ditemukan. Pakai templat dari tombol Instrumen dan templat, atau ubah judul kolom di berkas.');
}
const kolom = (h, ...r) => { for (const p of r) { const i = h.findIndex(x => p.test(x)); if (i >= 0) return i; } return -1; };
const tahunDari = (v) => { const m = String(v).match(/(19|20)\d{2}/); return m ? m[0] : ''; };

export const katWT = (v) => {
  const s = String(v == null ? '' : v).toLowerCase().trim(); if (!s || /belum|tidak\s*bekerja|mencari/.test(s)) return null;
  if (/^\d+([.,]\d+)?$/.test(s)) { const x = +s.replace(',', '.'); return x < 3 ? 'a' : x <= 6 ? 'b' : 'c'; }
  if (/\b3\s*(-|–|s\.?d\.?|sampai|hingga)\s*6/.test(s)) return 'b';
  if (/(>|lebih\s*dari|di\s*atas|diatas)\s*6|\b6\s*\+/.test(s)) return 'c';
  if (/(<|kurang\s*dari|dibawah|di\s*bawah)\s*3|\b0\s*(-|–|sampai|s\.?d\.?)\s*3/.test(s)) return 'a';
  const m = s.match(/\d+([.,]\d+)?/); if (m) { const x = +m[0].replace(',', '.'); return x < 3 ? 'a' : x <= 6 ? 'b' : 'c'; }
  return null;
};
export const katKS = (v) => { const s = String(v == null ? '' : v).toLowerCase(); if (!s.trim()) return null; if (/rendah|tidak|kurang/.test(s)) return 'r'; if (/sedang|cukup/.test(s)) return 's'; if (/tinggi|erat|sangat/.test(s)) return 't'; return null; };
export const katTK = (v) => { const s = String(v == null ? '' : v).toLowerCase(); if (!s.trim()) return null; if (/multi|internasional|global|asing/.test(s)) return 'i'; if (/nasional/.test(s)) return 'n'; if (/wilayah|lokal|regional|provinsi|daerah|wirausaha|usaha/.test(s)) return 'w'; return null; };
export const katNilai = (v) => { const s = String(v == null ? '' : v).toLowerCase().trim(); if (!s) return null; if (/^[1-4]$/.test(s)) return { 4: 'sb', 3: 'b', 2: 'c', 1: 'k' }[s]; if (/sangat\s*baik/.test(s)) return 'sb'; if (/kurang|buruk/.test(s)) return 'k'; if (/cukup|sedang/.test(s)) return 'c'; if (/baik/.test(s)) return 'b'; return null; };

async function imporTracer(file, pid) {
  const { rows, h } = await bacaTabel(file, /^tahun(lulus|kelulusan)/);
  const c = { th: kolom(h, /^tahun(lulus|kelulusan)/), wt: kolom(h, /waktutunggu|masatunggu|lamamenunggu|berapabulan/), ks: kolom(h, /kesesuaian|keeratan|eratbidang|bidangpekerjaan|bidangkerja|sesuai/), tk: kolom(h, /tingkattempat|tingkatinstansi|skalatempat|tingkatkerja/) };
  if (c.wt < 0 && c.ks < 0 && c.tk < 0) throw new Error('Tidak ada kolom Waktu tunggu, Kesesuaian bidang kerja, atau Tingkat tempat kerja.');
  const per = {}, abaikan = []; let tanpaTahun = 0;
  for (const r of rows) {
    const th = tahunDari(r[c.th]); if (!th) { tanpaTahun++; continue; }
    const o = per[th] || (per[th] = { n: 0, wt: { a: 0, b: 0, c: 0 }, ks: { r: 0, s: 0, t: 0 }, tk: { i: 0, n: 0, w: 0 } });
    o.n++;
    const a = c.wt >= 0 ? katWT(r[c.wt]) : null, b = c.ks >= 0 ? katKS(r[c.ks]) : null, d = c.tk >= 0 ? katTK(r[c.tk]) : null;
    if (a) o.wt[a]++; if (b) o.ks[b]++; if (d) o.tk[d]++;
  }
  const docs = [], lap = [];
  for (const [th, o] of Object.entries(per).sort()) {
    const ex = S.lulusan.find(x => x.id === `LL-${pid}-${th}`);
    if (!ex || !(num(ex.jumlah) > 0)) { abaikan.push(`${th}: jumlah lulusan belum diisi`); continue; }
    if (o.n > num(ex.jumlah)) { abaikan.push(`${th}: ${o.n} tanggapan melebihi ${ex.jumlah} lulusan`); continue; }
    const d = { ...ex, tracer: o.n, wt: o.wt, ks: o.ks, tk: o.tk, tgl: today() }; delete d.ilustratif; docs.push(d);
    lap.push(`${th}: ${o.n} tanggapan (waktu tunggu ${sm(o.wt, KS.wt)}, kesesuaian ${sm(o.ks, KS.ks)}, tempat kerja ${sm(o.tk, KS.tk)})`);
  }
  if (!docs.length) { toast('Tidak ada yang bisa disimpan. ' + (abaikan[0] || 'Tidak ada baris dengan tahun lulus.')); return; }
  if (!(await tanya(`Akan menyimpan jumlah per kategori:\n${lap.join('; ')}${abaikan.length ? ` Dilewati: ${abaikan.join('; ')}` : ''}${tanpaTahun ? ` ${tanpaTahun} baris tanpa tahun lulus diabaikan.` : ''} Responden tracer pada tahun tersebut akan diganti dengan jumlah tanggapan. Lanjutkan?`, 'Simpan jumlah'))) return;
  await saveMany('lulusan', docs, `Impor tanggapan tracer ${pid}: ${docs.length} tahun`);
  toast(`Tersimpan: ${docs.length} tahun lulus (hanya jumlah)`); rerender();
}

async function imporPengguna(file, pid) {
  const { rows, h } = await bacaTabel(file, /^tahun(lulus|kelulusan)/);
  const th0 = kolom(h, /^tahun(lulus|kelulusan)/);
  const pat = { etika: /etika/, keahlian: /keahlian|bidangilmu/, bahasa: /bahasa/, ti: /teknologi|informasi/, komunikasi: /komunikasi/, kerjasama: /kerjasama|kerjatim|teamwork/, diri: /pengembangan/ };
  const col = Object.fromEntries(ASPEK.map(([id]) => [id, kolom(h, pat[id])]));
  if (Object.values(col).every(v => v < 0)) throw new Error('Kolom aspek (Etika, Keahlian, Bahasa, dst.) tidak ditemukan.');
  const per = {}; let tanpaTahun = 0;
  for (const r of rows) {
    const th = tahunDari(r[th0]); if (!th) { tanpaTahun++; continue; }
    const o = per[th] || (per[th] = { n: 0, kp: Object.fromEntries(ASPEK.map(([id]) => [id, { sb: 0, b: 0, c: 0, k: 0 }])) });
    o.n++;
    for (const [id] of ASPEK) { if (col[id] < 0) continue; const v = katNilai(r[col[id]]); if (v) o.kp[id][v]++; }
  }
  const docs = [], lap = [], abaikan = [];
  for (const [th, o] of Object.entries(per).sort()) {
    const ex = S.lulusan.find(x => x.id === `LL-${pid}-${th}`);
    if (!ex || !(num(ex.jumlah) > 0)) { abaikan.push(`${th}: jumlah lulusan belum diisi`); continue; }
    if (o.n > num(ex.jumlah)) { abaikan.push(`${th}: ${o.n} tanggapan melebihi ${ex.jumlah} lulusan`); continue; }
    const d = { ...ex, pengguna: o.n, kp: o.kp, tgl: today() }; delete d.ilustratif; docs.push(d);
    lap.push(`${th}: ${o.n} pengguna menanggapi`);
  }
  if (!docs.length) { toast('Tidak ada yang bisa disimpan. ' + (abaikan[0] || 'Tidak ada baris dengan tahun lulus.')); return; }
  if (!(await tanya(`Akan menyimpan jumlah tanggapan per aspek:\n${lap.join('; ')}${abaikan.length ? ` Dilewati: ${abaikan.join('; ')}` : ''}${tanpaTahun ? ` ${tanpaTahun} baris tanpa tahun lulus diabaikan.` : ''} Responden survei pengguna pada tahun tersebut akan diganti. Lanjutkan?`, 'Simpan jumlah'))) return;
  await saveMany('lulusan', docs, `Impor survei pengguna ${pid}: ${docs.length} tahun`);
  toast(`Tersimpan: ${docs.length} tahun lulus (hanya jumlah)`); rerender();
}

/* ---------- instrumen dan templat ---------- */
async function instrumen(pid) {
  const X = await loadXLSX(), wb = X.utils.book_new(), add = (nm, aoa, w) => { const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = w.map(x => ({ wch: x })); X.utils.book_append_sheet(wb, ws, nm); };
  add('Pertanyaan tracer', [['No', 'Pertanyaan untuk lulusan', 'Jenis jawaban', 'Dipakai untuk'],
    [1, 'Tahun lulus', 'Angka empat digit', 'Pengelompokan TS-2 dan TS-1 (wajib)'],
    [2, 'Status saat ini', 'Bekerja penuh waktu; Wirausaha; Studi lanjut; Belum bekerja dan masih mencari', 'Butir 52, kelengkapan data'],
    [3, 'Berapa bulan sejak lulus hingga mendapat pekerjaan pertama (isi 0 bila sudah bekerja sebelum lulus)', 'Angka bulan', 'Butir 53 waktu tunggu'],
    [4, 'Seberapa erat bidang pekerjaan pertama dengan bidang studi Anda', 'Tinggi (erat); Sedang (cukup erat); Rendah (kurang erat atau tidak erat)', 'Butir 54 kesesuaian bidang kerja'],
    [5, 'Tingkat tempat kerja Anda', 'Wilayah, lokal, atau wirausaha; Nasional; Multinasional atau internasional', 'Butir 55 tingkat tempat kerja'],
    [6, 'Kompetensi mana dari prodi yang paling terpakai dan mana yang paling kurang (isian bebas)', 'Teks', 'Masukan kurikulum (butir 52 aspek 5)'],
    [7, 'Bersediakah dihubungi untuk survei pengguna lulusan (opsional, kontak disimpan terpisah oleh CDC)', 'Ya; Tidak', 'Penyebaran survei pengguna'],
    ['', 'Catatan: cocokkan dan lengkapi dengan seluruh pertanyaan inti tracer study DIKTI terbaru sebelum disebarkan (butir 52 aspek 3).', '', '']], [5, 80, 60, 38]);
  add('Pertanyaan pengguna', [['No', 'Pertanyaan untuk atasan atau pengguna lulusan', 'Jenis jawaban'],
    [1, 'Tahun lulus alumni yang dinilai', 'Angka empat digit (wajib)'],
    ...ASPEK.map(([, nm], i) => [i + 2, `Penilaian terhadap ${nm} lulusan`, 'Sangat baik; Baik; Cukup; Kurang']),
    [9, 'Saran bagi prodi (isian bebas)', 'Teks']], [5, 70, 45]);
  add('Templat impor tracer', [['Tahun lulus', 'Waktu tunggu (bulan)', 'Kesesuaian bidang kerja', 'Tingkat tempat kerja'], [2025, 2, 'Tinggi', 'Nasional'], [2025, 5, 'Sedang', 'Wilayah', 'Contoh, hapus baris ini']], [12, 22, 24, 24]);
  add('Templat impor pengguna', [['Tahun lulus', ...ASPEK.map(a => a[1])], [2025, ...ASPEK.map(() => 'Baik'), 'Contoh, hapus baris ini']], [12, ...ASPEK.map(() => 16)]);
  add('Petunjuk', [['Petunjuk'], ['1. Sebarkan pertanyaan lewat Google Form. Unduh tanggapan sebagai Excel atau CSV.'], ['2. Judul kolom boleh berbeda; yang dikenali: Tahun lulus, Waktu tunggu, Kesesuaian, Tingkat tempat kerja (tracer) dan Etika, Keahlian, Bahasa, Teknologi Informasi, Komunikasi, Kerjasama, Pengembangan Diri (pengguna).'], ['3. Impor lewat tombol Impor tanggapan tracer atau Impor survei pengguna. Berkas dihitung di peramban; yang disimpan hanya jumlah per kategori.'], ['4. Hapus kolom nama, NIM, dan kontak dari berkas sebelum diimpor. Aplikasi tidak menyimpannya.'], ['5. Tahun lulus harus sudah punya jumlah lulusan di tab Lulusan dan tracer; kalau belum, barisnya dilewati.'], ['6. LAM menghitung waktu tunggu dengan titik tengah 1,5; 4,5; dan 9 bulan untuk kelompok kurang dari 3, 3 sampai 6, dan lebih dari 6 bulan.']], [110]);
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Instrumen_Tracer_${pid}.xlsx`);
}

/* ---------- contoh ilustratif (hanya mode demo) ---------- */
function contohLulusan(pid) {
  const mk = (th, j, tr, w, k, t, pg, kp) => ({ id: `LL-${pid}-${th}`, prodi: pid, tahun: String(th), jumlah: j, obe: 0, tracer: tr, pengguna: pg, wt: { a: w[0], b: w[1], c: w[2] }, ks: { r: k[0], s: k[1], t: k[2] }, tk: { i: t[0], n: t[1], w: t[2] }, kp, ilustratif: true, catatan: 'Contoh ilustratif untuk peragaan, bukan data hasil tracer.', tgl: today() });
  const kp = (a) => Object.fromEntries(ASPEK.map(([id], i) => [id, { sb: a[i][0], b: a[i][1], c: a[i][2], k: a[i][3] }]));
  const A = [[18, 20, 2, 0], [14, 22, 4, 0], [10, 24, 6, 0], [12, 22, 6, 0], [11, 23, 6, 0], [16, 21, 3, 0], [13, 22, 5, 0]];
  const B = [[22, 20, 2, 0], [16, 24, 4, 0], [12, 26, 6, 0], [14, 24, 6, 0], [13, 25, 6, 0], [18, 22, 4, 0], [15, 24, 5, 0]];
  return [mk(2024, 85, 62, [30, 24, 8], [4, 18, 40], [2, 22, 38], 40, kp(A)), mk(2025, 90, 70, [36, 26, 8], [3, 20, 47], [3, 25, 42], 44, kp(B))];
}
