/* KUREKAM · Capstone, lulusan OBE, tracer, dan survei pengguna (hanya angka agregat).
   Tanpa nama lulusan, NIM, atau nama perusahaan. */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, toast } from '../app.js';
import { chart, AX } from '../charts.js';
import { fmt, capstoneCek, lulusanRekap, RUBRIK_ST } from '../rules.js';
import { head, formDrawer, ro, kpi, animateCounts, stTag, tanya, unduh, loadXLSX } from './ui.js';
import { tTracer } from './tracer.js';

let tab = 'capstone';
const TABS = [['capstone', 'Capstone'], ['lulusan', 'Lulusan dan tracer'], ['tracer', 'Tracer format LAM']];
const nz = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

export default function lulusanView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid);
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  el.innerHTML = `<div class="seg scroll" style="margin-bottom:14px">${TABS.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><div id="ll-b"></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  const b = el.querySelector('#ll-b');
  if (tab === 'tracer') tTracer(b, pid, p, can('susun', { prodi: pid }) || ctx.role === 'akademik');
  else if (tab === 'lulusan') tLulusan(b, pid, p, can('susun', { prodi: pid }) || ctx.role === 'akademik');
  else tCapstone(b, pid, p, can('susun', { prodi: pid }));
}

/* ---------- capstone ---------- */
function tCapstone(el, pid, p, ed) {
  const C = capstoneCek(S, pid), d = C.d, rows = S.capstone.filter(x => x.prodi === pid).sort((a, b) => String(b.tahun).localeCompare(String(a.tahun)));
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>IABEE meminta capstone yang jelas bobotnya, memakai rubrik penilaian, dan berbasis masalah nyata. Isi di sini <b>angkanya saja</b>: bobot penilaian, status rubrik, jumlah proyek, dan jumlah mitra industri. Rubrik dan dokumen lengkap disimpan di Google Drive, cukup tempelkan tautannya. Jangan menulis nama mahasiswa. Nama mitra tidak perlu dicantumkan.</span></div>
  <div class="grid g4">
    ${kpi('Syarat terpenuhi', C.ok, `dari ${C.syarat.length} syarat · ${pid}`, C.ok === 4 ? '#10b981' : '#f5a524', 'check')}
    ${kpi('MK capstone', C.mkCap.length, `${C.sks} SKS di kurikulum`, '#14b8a6', 'book')}
    ${kpi('Proyek nyata', d ? +d.proyek || 0 : 0, d ? `tahun akademik ${esc(d.tahun)}` : 'belum diisi', '#8b5cf6', 'target')}
    ${kpi('Rubrik', d ? RUBRIK_ST[d.rubrik] || 'Belum ada' : 'Belum ada', 'status terbaru', '#0ea5e9', 'audit')}
  </div>
  <div class="card" style="margin-top:18px">${head('Syarat dokumentasi capstone · ' + pid, esc(p.nama), 'check', '#10b981')}
    <div class="ind-list">${C.syarat.map(x => `<div class="ind ${x.ok ? 'ok' : 'bad'}"><span class="ind-no">${x.ok ? '✓' : '–'}</span><div><b>${esc(x.t)}</b><div class="small muted">${esc(x.ket)}</div></div>${stTag(x.ok ? 'ok' : 'bad', x.ok ? 'Terpenuhi' : 'Belum')}</div>`).join('')}</div></div>
  <div class="card" style="margin-top:18px">${head('Catatan capstone per tahun akademik', 'Klik baris untuk mengubah', 'layers', '#14b8a6', ed ? `<button class="btn pri sm" id="cs-add">${icon('plus')} Isi data capstone</button>` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahun akademik</th><th class="num">Bobot (%)</th><th>Rubrik</th><th class="num">Proyek nyata</th><th class="num">Mitra industri</th><th>Dokumen</th></tr></thead><tbody>
    ${rows.map(x => `<tr class="${ed ? 'click' : ''}" data-cs="${esc(x.id)}"><td><b>${esc(x.tahun)}</b></td><td class="num">${x.bobot != null && x.bobot !== '' ? fmt(+x.bobot, 1) : '–'}</td><td>${stTag(x.rubrik === 'disahkan' ? 'ok' : x.rubrik === 'draf' ? 'near' : 'na', RUBRIK_ST[x.rubrik] || 'Belum ada')}</td><td class="num">${x.proyek || 0}</td><td class="num">${x.mitra || 0}</td><td class="small">${x.tautan ? `<a href="${esc(x.tautan)}" target="_blank" rel="noopener">Buka di Drive</a>` : '–'}${x.catatan ? `<div class="muted">${esc(x.catatan)}</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Belum ada data capstone.</td></tr>'}
    </tbody></table></div></div>`;
  animateCounts(el);
  if (!ed) return;
  const form = (x) => formDrawer({ title: x.id ? 'Ubah data capstone' : 'Data capstone', sub: pid, obj: x,
    fields: [
      { k: 'tahun', label: 'Tahun akademik', ph: '2026/2027' },
      { k: 'bobot', label: 'Bobot capstone dalam penilaian (%)', type: 'number', step: '0.1', help: 'Misalnya porsi nilai capstone terhadap penilaian kompetensi akhir.' },
      { k: 'rubrik', label: 'Rubrik penilaian', type: 'select', opts: Object.entries(RUBRIK_ST).map(([v, t]) => ({ v, t })) },
      { k: 'proyek', label: 'Jumlah proyek berbasis masalah nyata', type: 'number' },
      { k: 'mitra', label: 'Jumlah mitra industri terlibat', type: 'number', help: 'Hanya jumlah. Nama mitra tidak perlu ditulis.' },
      { k: 'tautan', label: 'Tautan dokumen capstone di Google Drive', full: true, ph: 'https://drive.google.com/…' },
      { k: 'catatan', label: 'Catatan (opsional)', type: 'textarea' }],
    onSave: async (o) => {
      const th = String(o.tahun || '').trim();
      if (!/^(19|20)\d{2}(\/(19|20)?\d{2})?$/.test(th)) return 'Tahun akademik diisi seperti 2026/2027.';
      if (o.bobot != null && (o.bobot < 0 || o.bobot > 100)) return 'Bobot antara 0 dan 100.';
      if ((o.proyek != null && o.proyek < 0) || (o.mitra != null && o.mitra < 0)) return 'Jumlah tidak boleh negatif.';
      if (o.tautan && !/^https:\/\//i.test(o.tautan)) return 'Tautan harus diawali https://';
      const doc = { ...o, id: `CS-${pid}-${th.replace('/', '-')}`, prodi: pid, tahun: th, rubrik: o.rubrik || 'belum', tgl: today() };
      if (x.id && x.id !== doc.id) await remove('capstone', x.id);
      await save('capstone', doc, `Simpan data capstone ${pid} ${th}`); rerender();
    },
    onDelete: x.id ? async () => { await remove('capstone', x.id, `Hapus data capstone ${pid}`); rerender(); } : null });
  el.querySelector('#cs-add').onclick = () => form({ rubrik: 'belum', tahun: d ? d.tahun : '' });
  el.querySelectorAll('[data-cs]').forEach(r => r.onclick = (e) => { if (e.target.closest('a')) return; form({ ...S.capstone.find(x => x.id === r.dataset.cs) }); });
}

/* ---------- lulusan dan tracer ---------- */
function tLulusan(el, pid, p, ed) {
  const L = lulusanRekap(S, pid), pct = (v) => v == null ? '–' : fmt(v, 1) + '%';
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Isi dengan <b>jumlah</b> per tahun kelulusan: berapa lulusan, berapa lulusan dari kurikulum OBE, berapa yang mengisi tracer, dan berapa pengguna lulusan yang mengisi survei. Bagian Akademik mengisi jumlah lulusan, CDC memberi angka tracer dan survei pengguna. Jangan memasukkan nama atau NIM lulusan.</span></div>
  <div class="grid g4">
    ${kpi('Lulusan terdata', L.jumlah, `${L.rows.length} tahun kelulusan · ${pid}`, '#0ea5e9', 'user')}
    ${kpi('Lulusan kurikulum OBE', L.obe, 'dari seluruh lulusan terdata', '#10b981', 'medal')}
    ${kpi('Respons tracer', L.rTracer == null ? '–' : Math.round(L.rTracer), L.rTracer == null ? 'belum ada data' : '% dari lulusan, target 70%', L.rTracer >= 70 ? '#10b981' : '#f5a524', 'target')}
    ${kpi('Respons survei pengguna', L.rPengguna == null ? '–' : Math.round(L.rPengguna), L.rPengguna == null ? 'belum ada data' : '% dari lulusan, target 70%', L.rPengguna >= 70 ? '#10b981' : '#f5a524', 'link')}
  </div>
  <div class="card" style="margin-top:18px">${head('Data lulusan dan tracer · ' + pid, esc(p.nama) + '. Klik baris untuk mengubah.', 'user', '#0ea5e9', ed ? `<button class="btn sm" id="l-tpl">${icon('download')} Templat Excel</button><button class="btn sm" id="l-imp">${icon('upload')} Impor Excel</button><button class="btn pri sm" id="l-add">${icon('plus')} Isi data</button>` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahun lulus</th><th class="num">Lulusan</th><th class="num">Lulusan OBE</th><th class="num">Responden tracer</th><th class="num">Responden pengguna</th><th class="num">Bekerja atau studi ≤ 6 bulan</th><th class="num">Respons tracer</th></tr></thead><tbody>
    ${L.rows.map(r => `<tr class="${ed ? 'click' : ''}" data-ll="${esc(r.id)}"><td><b>${esc(r.tahun)}</b></td><td class="num">${r.jumlah || 0}</td><td class="num">${r.obe || 0}</td><td class="num">${r.tracer || 0}</td><td class="num">${r.pengguna || 0}</td><td class="num">${r.bekerja == null || r.bekerja === '' ? '–' : r.bekerja}</td><td class="num">${pct(+r.jumlah ? (+r.tracer || 0) / +r.jumlah * 100 : null)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada data lulusan.</td></tr>'}
    </tbody></table></div></div>
  ${L.rows.length ? `<div class="card" style="margin-top:18px">${head('Lulusan dan respons per tahun', 'Batang = jumlah lulusan dan responden tracer', 'pulse', '#10b981')}<div class="chart" id="c-ll"></div></div>` : ''}`;
  animateCounts(el);
  if (L.rows.length) chart(el.querySelector('#c-ll'), { tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: L.rows.map(r => String(r.tahun)), ...AX }, yAxis: { type: 'value', ...AX },
    series: [['Lulusan', 'jumlah', '#0ea5e9'], ['Lulusan OBE', 'obe', '#10b981'], ['Responden tracer', 'tracer', '#8b5cf6']].map(([n, f, c]) => ({ name: n, type: 'bar', barMaxWidth: 22, itemStyle: { color: c, borderRadius: [6, 6, 0, 0] }, data: L.rows.map(r => +r[f] || 0) })) });
  if (!ed) return;
  const FLD = [['jumlah', 'Jumlah lulusan'], ['obe', 'Jumlah lulusan kurikulum OBE'], ['tracer', 'Responden tracer study'], ['pengguna', 'Responden survei pengguna lulusan'], ['bekerja', 'Lulusan bekerja, wirausaha, atau studi lanjut dalam 6 bulan (opsional)']];
  const cek = (o) => {
    const n = (k) => o[k] == null || o[k] === '' ? null : +o[k];
    if (!/^(19|20)\d{2}$/.test(String(o.tahun || '').trim())) return 'Tahun lulus diisi empat angka, misalnya 2027.';
    if (!(n('jumlah') >= 0) || n('jumlah') == null) return 'Jumlah lulusan wajib diisi.';
    for (const [k, t] of FLD.slice(1)) { if (n(k) != null && (!Number.isInteger(n(k)) || n(k) < 0)) return `${t}: isi bilangan bulat tidak negatif.`; }
    if (!Number.isInteger(n('jumlah'))) return 'Jumlah lulusan harus bilangan bulat.';
    for (const k of ['obe', 'tracer', 'pengguna']) if (n(k) != null && n(k) > n('jumlah')) return `${FLD.find(f => f[0] === k)[1]} tidak boleh melebihi jumlah lulusan.`;
    if (n('bekerja') != null && n('bekerja') > (n('tracer') != null ? n('tracer') : n('jumlah'))) return 'Jumlah yang bekerja tidak boleh melebihi responden tracer.';
    return '';
  };
  const form = (x) => formDrawer({ title: x.id ? 'Ubah data lulusan' : 'Data lulusan dan tracer', sub: `${pid} · angka agregat`, obj: x,
    fields: [{ k: 'tahun', label: 'Tahun lulus', ph: '2027' }, ...FLD.map(([k, label]) => ({ k, label, type: 'number' })), { k: 'catatan', label: 'Catatan (opsional)', type: 'textarea' }],
    onSave: async (o) => { const e = cek(o); if (e) return e; const th = String(o.tahun).trim(); const doc = { ...o, id: `LL-${pid}-${th}`, prodi: pid, tahun: th, tgl: today() }; if (x.id && x.id !== doc.id) await remove('lulusan', x.id); await save('lulusan', doc, `Simpan data lulusan ${pid} ${th}`); rerender(); },
    onDelete: x.id ? async () => { await remove('lulusan', x.id, `Hapus data lulusan ${pid}`); rerender(); } : null });
  el.querySelector('#l-add').onclick = () => form({});
  el.querySelectorAll('[data-ll]').forEach(r => r.onclick = () => form({ ...S.lulusan.find(x => x.id === r.dataset.ll) }));
  el.querySelector('#l-tpl').onclick = async () => {
    const X = await loadXLSX(), wb = X.utils.book_new(), hd = ['Prodi', 'Tahun lulus', 'Jumlah lulusan', 'Lulusan kurikulum OBE', 'Responden tracer', 'Responden survei pengguna', 'Bekerja/wirausaha/studi lanjut 6 bulan', 'Catatan'];
    const ws = X.utils.aoa_to_sheet([hd, [pid, 2027, 100, 100, 75, 72, 60, 'Contoh, hapus baris ini']]); ws['!cols'] = [8, 11, 14, 18, 16, 20, 26, 30].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'LULUSAN');
    const pt = X.utils.aoa_to_sheet([['Petunjuk'], ['1. Satu baris = satu tahun lulus untuk satu prodi.'], ['2. Isi hanya angka. Jangan memasukkan nama atau NIM lulusan.'], ['3. Responden tidak boleh melebihi jumlah lulusan.'], ['4. Hapus baris contoh sebelum mengimpor. Impor ulang pada tahun yang sama memperbarui angkanya.']]); pt['!cols'] = [{ wch: 90 }]; X.utils.book_append_sheet(wb, pt, 'PETUNJUK');
    unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Template_Lulusan_Tracer_${pid}.xlsx`);
  };
  el.querySelector('#l-imp').onclick = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls'; f.onchange = async () => { if (!f.files[0]) return; try { await impor(f.files[0], pid); } catch (e) { console.error(e); toast('Impor gagal: ' + e.message); } }; f.click(); };
}

async function impor(file, pid) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
  let baris = null, h = null, mulai = 0;
  for (const nm of wb.SheetNames) { const rows = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: '' }); const i = rows.findIndex(r => r.some(c => /^tahunlulus/.test(nz(c)))); if (i >= 0) { baris = rows; h = rows[i].map(nz); mulai = i + 1; break; } }
  if (!baris) throw new Error('Kolom Tahun lulus tidak ditemukan. Gunakan templat dari tombol Templat Excel.');
  const kol = (...r) => { for (const p of r) { const i = h.findIndex(x => p.test(x)); if (i >= 0) return i; } return -1; };
  const c = { prodi: kol(/^prodi/), th: kol(/^tahunlulus/), j: kol(/^jumlahlulusan/, /^lulusan$/), obe: kol(/obe/), tr: kol(/tracer/), pg: kol(/pengguna/), bk: kol(/bekerja/), cat: kol(/^catatan/) };
  if (c.j < 0) throw new Error('Kolom Jumlah lulusan tidak ditemukan.');
  const admin = ['admin', 'developer'].includes(ctx.role), docs = [], lewat = []; let asing = 0;
  const num = (v) => v === '' || v == null ? null : Number(v);
  for (let r = mulai; r < baris.length; r++) {
    const row = baris[r]; if (!row.some(v => String(v).trim()) || row.some(v => /hapus baris ini/i.test(String(v)))) continue;
    const no = r + 1, pr = c.prodi >= 0 ? String(row[c.prodi]).trim().toUpperCase() : pid;
    if (pr && pr !== pid && !(admin && S.prodi.some(x => x.id === pr))) { asing++; continue; }
    const th = String(row[c.th]).trim().replace(/\.0$/, ''), o = { tahun: th, jumlah: num(row[c.j]), obe: c.obe >= 0 ? num(row[c.obe]) : null, tracer: c.tr >= 0 ? num(row[c.tr]) : null, pengguna: c.pg >= 0 ? num(row[c.pg]) : null, bekerja: c.bk >= 0 ? num(row[c.bk]) : null };
    const vals = [o.jumlah, o.obe, o.tracer, o.pengguna, o.bekerja].filter(v => v != null);
    if (!/^(19|20)\d{2}$/.test(th)) { lewat.push(`baris ${no}: tahun "${th}" bukan tahun`); continue; }
    if (o.jumlah == null || vals.some(v => !Number.isInteger(v) || v < 0)) { lewat.push(`baris ${no}: angka tidak valid`); continue; }
    if ([o.obe, o.tracer, o.pengguna].some(v => v != null && v > o.jumlah) || (o.bekerja != null && o.bekerja > (o.tracer != null ? o.tracer : o.jumlah))) { lewat.push(`baris ${no}: jumlah melebihi lulusan atau responden`); continue; }
    docs.push({ ...o, id: `LL-${pr || pid}-${th}`, prodi: pr || pid, catatan: c.cat >= 0 ? String(row[c.cat] || '').trim() : '', tgl: today() });
  }
  if (!docs.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : 'Tidak ada baris data terbaca.'); return; }
  const baru = docs.filter(d => !S.lulusan.some(x => x.id === d.id)).length;
  if (!(await tanya(`${docs.length} baris akan disimpan (${baru} baru, ${docs.length - baru} memperbarui).${lewat.length ? ` ${lewat.length} baris dilewati.` : ''}${asing ? ` ${asing} baris prodi lain diabaikan.` : ''} Lanjutkan?`, 'Simpan data'))) return;
  await saveMany('lulusan', docs, `Impor data lulusan ${pid}: ${docs.length} baris`);
  toast(`Data lulusan tersimpan: ${docs.length} baris${lewat.length ? `, dilewati ${lewat.length}: ${lewat.slice(0, 2).join('; ')}` : ''}`); rerender();
}
