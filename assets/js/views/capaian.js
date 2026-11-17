/* KUREKAM · Capaian CPL per angkatan (angka agregat) dan catatan tindak lanjut hasil asesmen.
   Hanya jumlah mahasiswa yang dinilai dan jumlah yang mencapai nilai batas. Tanpa nama, NIM, atau nilai per mahasiswa. */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, uid, addLog, toast } from '../app.js';
import { chart, AX } from '../charts.js';
import { fmt, param, byProdi, capaianCpl, tlProdi, TL_STATUS } from '../rules.js';
import { head, formDrawer, ro, kpi, animateCounts, short, stTag, tanya, unduh, loadXLSX } from './ui.js';

let tab = 'capaian';
const TABS = [['capaian', 'Capaian CPL'], ['tl', 'Tindak lanjut']];
const nz = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const TL_WARNA = { rencana: 'na', berjalan: 'near', selesai: 'ok' };
const idCap = (r) => `CP-${r.prodi}-${r.angkatan}-${r.cpl}-${r.pi || 'cpl'}`;

export default function capaianView(el) {
  const pid = ctx.prodi, ed = can('susun', { prodi: pid }), p = S.prodi.find(x => x.id === pid);
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  el.innerHTML = `<div class="seg scroll" style="margin-bottom:14px">${TABS.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><div id="cap-b"></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  const b = el.querySelector('#cap-b');
  (tab === 'tl' ? tTl : tCapaian)(b, pid, p, ed);
}

/* ---------- capaian ---------- */
function tCapaian(el, pid, p, ed) {
  const K = capaianCpl(S, pid), cpl = byProdi(S.cpl, pid), pis = byProdi(S.pi || [], pid);
  const baris = K.hasil;
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Isi dengan <b>angka rekap</b> saja: berapa mahasiswa yang dinilai pada suatu CPL, dan berapa di antaranya yang mencapai nilai batas (${fmt(K.krit)}% mahasiswa dengan nilai minimal ${fmt(param(S).piMinNilai)}, dapat diubah di Data Induk). <b>Jangan</b> mengisi nama, NIM, atau nilai per mahasiswa. Rekap bisa diketik satu per satu atau diimpor dari Excel.</span></div>
  <div class="grid g4">
    ${kpi('CPL terukur', K.terukur.length, `dari ${cpl.length} CPL · ${pid}`, '#0ea5e9', 'target')}
    ${kpi('Memenuhi kriteria', K.ok.length, `angkatan terbaru tiap CPL, minimal ${fmt(K.krit)}%`, K.ok.length ? '#10b981' : '#94a3b8', 'check')}
    ${kpi('Di bawah kriteria', K.bawah.length, 'perlu tindak lanjut', K.bawah.length ? '#f0616d' : '#10b981', 'alert')}
    ${kpi('Angkatan terdata', K.angkatan.length, K.angkatan.join(', ') || 'belum ada data', '#8b5cf6', 'calendar')}
  </div>
  <div class="card" style="margin-top:18px">${head('Rekap capaian CPL · ' + pid, esc(p.nama) + '. Klik angka untuk mengubah.', 'pulse', '#0ea5e9', ed ? `<button class="btn sm" id="c-tpl">${icon('download')} Templat Excel</button><button class="btn sm" id="c-imp">${icon('upload')} Impor Excel</button><button class="btn pri sm" id="c-add">${icon('plus')} Isi capaian</button>` : ro())}
    ${cpl.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>CPL</th>${K.angkatan.map(a => `<th class="num">Angkatan ${esc(a)}</th>`).join('')}<th>Status</th></tr></thead><tbody>
      ${baris.map(h => `<tr><td><b>${esc(h.c.kode)}</b><div class="small muted" style="white-space:normal">${esc(h.c.teks)}</div></td>
        ${K.angkatan.map(a => { const x = h.per.find(q => q.angkatan === a); return x ? `<td class="num ${ed && !x.turunan ? 'click' : ''}" ${ed && !x.turunan ? `data-cap="${esc(x.id)}"` : ''}><b style="color:${x.persen >= K.krit ? '#0f8a5f' : '#b42335'}">${fmt(x.persen, 1)}%</b><div class="small muted">${x.lulus}/${x.n}${x.dari === 'PI' ? ' · PI terendah' : ''}${x.turunan === 'CPMK' ? ' · dari realisasi (CPMK)' : x.turunan ? ' · estimasi dari nilai akhir MK' : ''}</div></td>` : '<td class="num muted">–</td>'; }).join('')}
        <td>${!h.terukur ? stTag('na', 'Belum diukur') : h.ok ? stTag('ok', 'Memenuhi') : stTag('bad', 'Di bawah kriteria')}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">CPL prodi belum ada. Isi dulu di menu Capaian Pembelajaran Lulusan.</div>'}
  </div>
  ${K.terukur.length ? `<div class="card" style="margin-top:18px">${head('Capaian angkatan terbaru terhadap kriteria', 'Garis putus-putus = kriteria ketercapaian', 'target', '#10b981')}<div class="chart" id="c-cap"></div></div>` : ''}`;
  animateCounts(el);
  if (K.terukur.length) chart(el.querySelector('#c-cap'), { tooltip: { trigger: 'axis', valueFormatter: v => fmt(v, 1) + '%' }, grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: K.terukur.map(h => h.c.kode), ...AX }, yAxis: { type: 'value', max: 100, ...AX },
    series: [{ type: 'bar', barWidth: 22, data: K.terukur.map(h => ({ value: +h.akhir.persen.toFixed(1), itemStyle: { color: h.ok ? '#10b981' : '#f0616d', borderRadius: [6, 6, 0, 0] } })),
      markLine: { symbol: 'none', lineStyle: { color: '#6366f1', type: 'dashed' }, label: { formatter: `Kriteria ${fmt(K.krit)}%` }, data: [{ yAxis: K.krit }] } }] });
  if (!ed) return;

  const form = (x) => formDrawer({ title: x.id ? 'Ubah capaian CPL' : 'Isi capaian CPL', sub: `${pid} · angka agregat per angkatan`, obj: x,
    fields: [
      { k: 'angkatan', label: 'Angkatan (tahun masuk)', ph: '2024' },
      { k: 'cpl', label: 'CPL', type: 'select', opts: cpl.map(c => ({ v: c.id, t: `${c.kode} · ${short(c.teks, 50)}` })) },
      { k: 'pi', label: 'Tingkat pengukuran', type: 'select', opts: [{ v: '', t: 'Seluruh CPL' }].concat(pis.map(q => ({ v: q.id, t: `PI ${q.kode} (${(cpl.find(c => c.id === q.cpl) || {}).kode || '?'})` }))), help: 'Pilih PI bila data hanya tersedia per indikator. Bila CPL tidak punya baris sendiri, aplikasi memakai PI dengan capaian terendah.' },
      { k: 'n', label: 'Jumlah mahasiswa yang dinilai', type: 'number' },
      { k: 'lulus', label: 'Jumlah yang mencapai nilai batas', type: 'number', help: 'Hanya angka. Jangan mengetik nama atau NIM.' },
      { k: 'catatan', label: 'Catatan (opsional)', type: 'textarea', ph: 'Misalnya: asesmen memakai UAS dan tugas proyek' }],
    onSave: async (o) => {
      const a = String(o.angkatan || '').trim(), n = +o.n, l = +o.lulus;
      if (!/^(19|20)\d{2}$/.test(a)) return 'Angkatan diisi tahun empat angka, misalnya 2024.';
      if (!o.cpl) return 'CPL wajib dipilih.';
      if (!Number.isInteger(n) || n < 1) return 'Jumlah mahasiswa yang dinilai minimal 1.';
      if (!Number.isInteger(l) || l < 0 || l > n) return 'Jumlah yang mencapai harus antara 0 dan jumlah yang dinilai.';
      const doc = { id: idCap({ prodi: pid, angkatan: a, cpl: o.cpl, pi: o.pi }), prodi: pid, angkatan: a, cpl: o.cpl, pi: o.pi || '', n, lulus: l, catatan: o.catatan || '', tgl: today() };
      if (x.id && x.id !== doc.id) await remove('capaian', x.id);
      await save('capaian', doc, `Simpan capaian CPL ${pid} angkatan ${a}`); rerender();
    },
    onDelete: x.id ? async () => { await remove('capaian', x.id, `Hapus capaian CPL ${pid}`); rerender(); } : null });
  el.querySelector('#c-add').onclick = () => form({ angkatan: String(K.angkatan[K.angkatan.length - 1] || ''), cpl: (cpl[0] || {}).id || '', pi: '' });
  el.querySelectorAll('[data-cap]').forEach(td => td.onclick = () => form({ ...S.capaian.find(r => r.id === td.dataset.cap) }));
  el.querySelector('#c-tpl').onclick = () => templat(pid, cpl, pis);
  el.querySelector('#c-imp').onclick = () => {
    const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls';
    f.onchange = async () => { if (!f.files[0]) return; try { await impor(f.files[0], pid); } catch (e) { console.error(e); toast('Impor gagal: ' + e.message); } };
    f.click();
  };
}

async function templat(pid, cpl, pis) {
  const X = await loadXLSX(), wb = X.utils.book_new();
  const head = ['Prodi', 'Angkatan', 'Kode CPL', 'Kode PI (kosongkan bila seluruh CPL)', 'Jumlah mahasiswa dinilai', 'Jumlah mencapai nilai batas', 'Catatan'];
  const contoh = cpl.slice(0, 2).map((c, i) => [pid, 2024, c.kode, '', 30, 24 + i, 'Contoh, hapus baris ini']);
  const ws = X.utils.aoa_to_sheet([head, ...(contoh.length ? contoh : [[pid, 2024, 'CPL-01', '', 30, 24, 'Contoh, hapus baris ini']])]); ws['!cols'] = [8, 10, 12, 22, 16, 16, 34].map(w => ({ wch: w }));
  X.utils.book_append_sheet(wb, ws, 'CAPAIAN');
  const info = [['Petunjuk'], ['1. Satu baris = satu CPL pada satu angkatan (atau satu PI bila kolom Kode PI diisi).'], ['2. Isi hanya angka rekap. Jangan memasukkan nama, NIM, atau nilai per mahasiswa.'], ['3. Angkatan berupa tahun masuk, misalnya 2024.'], ['4. Hapus baris contoh sebelum mengimpor. Impor ulang pada angkatan dan CPL yang sama akan memperbarui angkanya.'], [''], ['Kode CPL prodi ' + pid], ...cpl.map(c => [c.kode, c.teks]), [''], ['Kode PI'], ...pis.map(q => [q.kode, `${(cpl.find(c => c.id === q.cpl) || {}).kode || ''} · ${q.teks || ''}`])];
  const wi = X.utils.aoa_to_sheet(info); wi['!cols'] = [{ wch: 14 }, { wch: 100 }]; X.utils.book_append_sheet(wb, wi, 'PETUNJUK');
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Template_Capaian_CPL_${pid}.xlsx`);
}

async function impor(file, pid) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
  let baris = null, h = null, mulai = 0;
  for (const nm of wb.SheetNames) { const rows = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: '' }); const i = rows.findIndex(r => r.some(c => /^angkatan/.test(nz(c))) && r.some(c => /cpl/.test(nz(c)))); if (i >= 0) { baris = rows; h = rows[i].map(nz); mulai = i + 1; break; } }
  if (!baris) throw new Error('Kolom Angkatan dan Kode CPL tidak ditemukan. Gunakan templat dari tombol Templat Excel.');
  const kol = (...r) => { for (const p of r) { const i = h.findIndex(x => p.test(x)); if (i >= 0) return i; } return -1; };
  const c = { prodi: kol(/^prodi/), ang: kol(/^angkatan/), cpl: kol(/^kodecpl/, /^cpl/), pi: kol(/^kodepi/, /^pi/), n: kol(/dinilai/, /^jumlahmahasiswa/, /^n$/), l: kol(/mencapai/, /lulus/, /tercapai/), cat: kol(/^catatan/) };
  if (c.n < 0 || c.l < 0) throw new Error('Kolom jumlah mahasiswa dinilai dan jumlah mencapai nilai batas tidak ditemukan.');
  const admin = ['admin', 'developer'].includes(ctx.role), docs = [], lewat = []; let asing = 0;
  for (let r = mulai; r < baris.length; r++) {
    const row = baris[r]; if (!row.some(v => String(v).trim())) continue; if (row.some(v => /hapus baris ini/i.test(String(v)))) continue;
    const no = r + 1, pr = c.prodi >= 0 ? String(row[c.prodi]).trim().toUpperCase() : pid;
    if (pr && pr !== pid && !(admin && S.prodi.some(x => x.id === pr))) { asing++; continue; }
    const pt = pr || pid, ang = String(row[c.ang]).trim().replace(/\.0$/, ''), kc = nz(row[c.cpl]), kp = c.pi >= 0 ? nz(row[c.pi]) : '';
    const cp = byProdi(S.cpl, pt).find(x => nz(x.kode) === kc); if (!cp) { lewat.push(`baris ${no}: CPL "${row[c.cpl]}" tidak ada di prodi ${pt}`); continue; }
    let pi = ''; if (kp) { const q = byProdi(S.pi || [], pt).find(x => x.cpl === cp.id && nz(x.kode) === kp); if (!q) { lewat.push(`baris ${no}: PI "${row[c.pi]}" tidak ada pada ${cp.kode}`); continue; } pi = q.id; }
    const n = Number(row[c.n]), l = Number(row[c.l]);
    if (!/^(19|20)\d{2}$/.test(ang)) { lewat.push(`baris ${no}: angkatan "${ang}" bukan tahun`); continue; }
    if (!Number.isInteger(n) || n < 1 || !Number.isInteger(l) || l < 0 || l > n) { lewat.push(`baris ${no}: jumlah tidak valid (dinilai ${row[c.n]}, mencapai ${row[c.l]})`); continue; }
    const d = { prodi: pt, angkatan: ang, cpl: cp.id, pi, n, lulus: l, catatan: c.cat >= 0 ? String(row[c.cat] || '').trim() : '', tgl: today() }; d.id = idCap(d); docs.push(d);
  }
  if (!docs.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : 'Tidak ada baris data terbaca.'); return; }
  const baru = docs.filter(d => !S.capaian.some(x => x.id === d.id)).length;
  if (!(await tanya(`${docs.length} baris capaian akan disimpan (${baru} baru, ${docs.length - baru} memperbarui angka yang ada).${lewat.length ? ` ${lewat.length} baris dilewati.` : ''}${asing ? ` ${asing} baris prodi lain diabaikan.` : ''} Lanjutkan?`, 'Simpan capaian'))) return;
  await saveMany('capaian', docs, `Impor capaian CPL ${pid}: ${docs.length} baris`);
  toast(`Capaian tersimpan: ${docs.length} baris${lewat.length ? `, dilewati ${lewat.length}: ${lewat.slice(0, 2).join('; ')}` : ''}`); rerender();
}

/* ---------- tindak lanjut ---------- */
function tTl(el, pid, p, ed) {
  const list = tlProdi(S, pid).slice().sort((a, b) => (b.tgl || '').localeCompare(a.tgl || '')), K = capaianCpl(S, pid), cpl = byProdi(S.cpl, pid);
  const usul = K.bawah.filter(h => !list.some(x => x.cpl === h.c.id));
  const revisiDari = (r) => S.revisi.find(x => x.id === r);
  const sl = list.filter(x => x.status === 'selesai').length;
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Catat di sini apa yang ditemukan dari hasil capaian CPL, tindakan perbaikannya, dan hasilnya setelah dijalankan. Satu catatan yang sudah <b>selesai</b> dihitung sebagai satu siklus perbaikan (indikator 7). Bila tindakan berupa perubahan kurikulum, ajukan sebagai usulan revisi supaya terekam di menu Revisi & Pengesahan.</span></div>
  <div class="grid g4">
    ${kpi('Catatan tindak lanjut', list.length, pid, '#6366f1', 'loop')}
    ${kpi('Siklus selesai', sl, 'target minimal 1 per prodi', sl ? '#10b981' : '#f5a524', 'check')}
    ${kpi('Terhubung ke Revisi', list.filter(x => x.revisi).length, 'usulan revisi', '#8b5cf6', 'link')}
    ${kpi('CPL perlu dicatat', usul.length, 'di bawah kriteria, belum ada catatan', usul.length ? '#f0616d' : '#10b981', 'alert')}
  </div>
  ${usul.length ? `<div class="card" style="margin-top:18px">${head('CPL di bawah kriteria yang belum ditindaklanjuti', 'Klik untuk membuat catatan dengan temuan yang sudah terisi', 'alert', '#f0616d')}<div class="filters">${usul.map(h => `<button class="btn sm danger" data-usul="${h.c.id}" ${ed ? '' : 'disabled'}>${esc(h.c.kode)} · ${fmt(h.akhir.persen, 1)}%</button>`).join('')}</div></div>` : ''}
  <div class="card" style="margin-top:18px">${head('Catatan tindak lanjut · ' + pid, 'Temuan, tindakan, dan hasil per siklus perbaikan', 'loop', '#6366f1', ed ? `<button class="btn pri sm" id="t-add">${icon('plus')} Catatan baru</button>` : ro())}
    <div class="trail">${list.map(x => { const c = cpl.find(q => q.id === x.cpl), rv = x.revisi ? revisiDari(x.revisi) : null;
      return `<div class="tstep"><div class="orbsm" style="--c:${x.status === 'selesai' ? '#10b981' : x.status === 'berjalan' ? '#f5a524' : '#94a3b8'}">${icon(x.status === 'selesai' ? 'check' : 'loop')}</div><div class="card ${ed ? 'click' : ''}" style="padding:14px" ${ed ? `data-tl="${x.id}"` : ''}>
        <div class="filters" style="margin:0 0 6px">${c ? `<span class="tag" style="--c:#0ea5e9">${esc(c.kode)}</span>` : '<span class="tag">Umum</span>'}${x.angkatan ? `<span class="tag">Angkatan ${esc(x.angkatan)}</span>` : ''}${stTag(TL_WARNA[x.status] || 'na', TL_STATUS[x.status] || x.status)}${rv ? `<span class="tag" style="--c:#6366f1">Revisi: ${esc(rv.status)}</span>` : ''}<span class="muted small">${esc(x.tgl || '')}${x.pj ? ' · ' + esc(x.pj) : ''}</span></div>
        <div><b>Temuan:</b> ${esc(x.temuan)}</div><div style="margin-top:4px"><b>Tindakan:</b> ${esc(x.tindakan || '–')}</div>
        ${x.target ? `<div class="small muted">Target selesai ${esc(x.target)}</div>` : ''}${x.hasil ? `<div class="small" style="margin-top:4px"><b>Hasil:</b> ${esc(x.hasil)}</div>` : ''}
        ${ed && !x.revisi ? `<div style="margin-top:8px"><button class="btn sm" data-rev="${x.id}">${icon('upload')} Ajukan sebagai usulan revisi</button></div>` : ''}</div></div>`; }).join('') || '<div class="empty">Belum ada catatan tindak lanjut.</div>'}</div></div>`;
  animateCounts(el);
  if (!ed) return;
  const form = (x) => formDrawer({ title: x.id ? 'Ubah tindak lanjut' : 'Catatan tindak lanjut', sub: pid, obj: x, wide: true,
    fields: [
      { k: 'cpl', label: 'CPL terkait', type: 'select', opts: [{ v: '', t: 'Umum, tidak terkait satu CPL' }].concat(cpl.map(c => ({ v: c.id, t: `${c.kode} · ${short(c.teks, 50)}` }))) },
      { k: 'angkatan', label: 'Angkatan yang dinilai', ph: '2024' },
      { k: 'temuan', label: 'Temuan dari hasil capaian', type: 'textarea', full: true, ph: 'Misalnya: CPL P2 hanya dicapai 58% mahasiswa pada angkatan 2024.' },
      { k: 'tindakan', label: 'Tindakan perbaikan', type: 'textarea', full: true, ph: 'Misalnya: menambah praktik terbimbing pada MK inti dan memperbaiki rubrik.' },
      { k: 'pj', label: 'Penanggung jawab', ph: 'Misalnya: Kaprodi atau koordinator MK' },
      { k: 'target', label: 'Target selesai', type: 'date' },
      { k: 'status', label: 'Status', type: 'select', opts: Object.entries(TL_STATUS).map(([v, t]) => ({ v, t })) },
      { k: 'revisi', label: 'Terhubung ke usulan revisi', type: 'select', opts: [{ v: '', t: 'Belum terhubung' }].concat(byProdi(S.revisi, pid).map(r => ({ v: r.id, t: `${r.tgl || ''} · ${r.objek}: ${short(r.uraian, 40)}` }))) },
      { k: 'hasil', label: 'Hasil setelah tindakan dijalankan', type: 'textarea', full: true, ph: 'Diisi setelah tindakan selesai, misalnya capaian angkatan berikutnya.' }],
    onSave: async (o) => { if (!o.temuan) return 'Temuan wajib diisi.'; if (o.status === 'selesai' && !o.tindakan) return 'Tindakan wajib diisi sebelum ditandai selesai.'; const d = { ...o, id: o.id || uid('TL'), prodi: pid, tgl: o.tgl || today() }; await save('tl', d, `Simpan tindak lanjut ${pid}`); rerender(); },
    onDelete: x.id ? async () => { await remove('tl', x.id, `Hapus tindak lanjut ${pid}`); rerender(); } : null });
  el.querySelector('#t-add').onclick = () => form({ status: 'rencana', cpl: '', revisi: '' });
  el.querySelectorAll('[data-tl]').forEach(c => c.onclick = (e) => { if (e.target.closest('button')) return; form({ ...S.tl.find(x => x.id === c.dataset.tl) }); });
  el.querySelectorAll('[data-usul]').forEach(b => b.onclick = () => { const h = K.hasil.find(q => q.c.id === b.dataset.usul); form({ status: 'rencana', cpl: h.c.id, revisi: '', angkatan: h.akhir.angkatan, temuan: `Capaian ${h.c.kode} angkatan ${h.akhir.angkatan} adalah ${fmt(h.akhir.persen, 1)}% (${h.akhir.lulus} dari ${h.akhir.n} mahasiswa), di bawah kriteria ${fmt(K.krit)}%.` }); });
  el.querySelectorAll('[data-rev]').forEach(b => b.onclick = async () => {
    const x = S.tl.find(q => q.id === b.dataset.rev), c = cpl.find(q => q.id === x.cpl);
    if (!x.tindakan) { toast('Isi tindakan perbaikan dulu, karena menjadi uraian usulan revisi.'); return; }
    if (!(await tanya('Catatan ini akan diajukan ke Wakil Direktur I sebagai usulan revisi dan muncul di menu Revisi & Pengesahan. Lanjutkan?', 'Ajukan usulan'))) return;
    const rev = { id: uid('REV'), prodi: pid, objek: c ? 'CPL' : 'Mata kuliah', uraian: x.tindakan, alasan: `Hasil asesmen CPL${c ? ' ' + c.kode : ''}${x.angkatan ? ' angkatan ' + x.angkatan : ''}: ${x.temuan}`, oleh: 'Tim Kurikulum ' + pid, tgl: today(), status: 'menunggu', putusan: '', tl: x.id };
    await save('revisi', rev, `Usulan revisi dari tindak lanjut ${pid}`); await save('tl', { ...x, revisi: rev.id }, `Hubungkan tindak lanjut ke revisi ${pid}`); toast('Usulan revisi diajukan'); rerender();
  });
}
