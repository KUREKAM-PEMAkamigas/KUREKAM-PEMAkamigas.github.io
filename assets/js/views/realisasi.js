/* KUREKAM · Realisasi Pembelajaran: dosen mengisi hasil pembelajaran per mata kuliah mengikuti RPS.
   Bukti untuk IABEE 2.1.3 / 3.1.3 dan LAM Teknik butir 15 dan 16. Hanya agregat dan tautan Drive. */
import { S, ctx, can, save, saveMany, rerender, esc, icon, toast, uid } from '../app.js';
import { DB } from '../db.js';
import { fmt, byProdi, capaianCpl } from '../rules.js';
import { head, ro, kpi, animateCounts, stTag, tanya, unduh, loadXLSX, short, bar } from './ui.js';
import { BUKTI, ST_PERT, periodeNow, periodeLabel, periodeDaftar, angkatanLazim, idReal, kriteria, persen, kelengkapan, rekapProdi } from '../realisasilogic.js';

let tab = 'isi', sel = null, per = periodeNow(), fSmt = '', perAwal = false;
const num = (v) => (v == null || v === '' || Number.isNaN(+v)) ? 0 : +v;
const today = () => new Date().toISOString().slice(0, 10);
const nz = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const akad = (m) => !/magang|tugas akhir/i.test(m.kel || '');

export default function realisasiView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid);
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  if (!perAwal) { perAwal = true; const ada = (S.real || []).map(r => r.periode).sort(); if (ada.length && !(S.real || []).some(r => r.periode === per)) per = ada[ada.length - 1]; }
  const lihatRekap = ctx.role !== 'dosen';
  if (!lihatRekap) tab = 'isi';
  const ilus = (S.real || []).some(r => r.prodi === pid && r.ilustratif);
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Menu ini merekam <b>hasil pembelajaran tiap mata kuliah sesuai RPS</b>: realisasi pertemuan dan metode, hasil per CPMK, hasil akhir, tautan bukti (soal, kisi-kisi, rubrik), serta evaluasi dan tindak lanjut. Itulah yang diminta auditor LAM Teknik (butir 15 dan 16) dan IABEE (aitem 2.1.3 dan 3.1.3). Isi <b>angka agregat dan tautan Drive saja</b>; nilai dan nama mahasiswa tidak disimpan di sini. Seluruh mata kuliah semua prodi diisi.</span></div>
  ${ilus ? `<div class="ribbon warn">${icon('info')} <span>Ada data <b>contoh ilustratif</b> untuk peragaan. Hapus dengan mengisi ulang atau menimpa isiannya sebelum dipakai sebagai bukti.</span></div>` : ''}
  ${lihatRekap ? `<div class="seg scroll" style="margin-bottom:14px">${[['isi', 'Isi per mata kuliah'], ['rekap', 'Rekap prodi']].map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div>` : ''}
  <div id="rl-b"></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  const b = el.querySelector('#rl-b');
  if (tab === 'rekap' && lihatRekap) tRekap(b, pid, p); else tIsi(b, pid, p);
}

/* ---------- rekap prodi ---------- */
function tRekap(el, pid, p) {
  const R = rekapProdi(S, pid, per), K = capaianCpl(S, pid), demo = DB.mode !== 'firebase';
  const ed = can('susun', { prodi: pid });
  el.innerHTML = `
  <div class="filters"><label class="small muted">Semester </label><select class="inp" id="rl-per" style="width:auto">${periodeDaftar().map(k => `<option value="${k}" ${k === per ? 'selected' : ''}>${periodeLabel(k)}</option>`).join('')}</select>
    ${ed && demo && !(S.real || []).length ? `<button class="btn sm" id="rl-ct">${icon('spark')} Muat contoh ilustratif</button>` : ''}</div>
  <div class="grid g4" style="margin-top:12px">
    ${kpi('Portofolio lengkap', R.lengkap, `dari ${R.total} mata kuliah · ${pid}`, R.lengkap === R.total && R.total ? '#10b981' : '#f5a524', 'check')}
    ${kpi('MK inti lengkap', R.intiLengkap, `dari ${R.inti} mata kuliah inti`, R.intiLengkap === R.inti && R.inti ? '#10b981' : '#f5a524', 'medal')}
    ${kpi('CPMK terukur', R.cpmkTerukur, `${R.cpmkBawah} di bawah kriteria`, R.cpmkBawah ? '#f0616d' : '#0ea5e9', 'target')}
    ${kpi('Sudah mulai diisi', R.isi, `${R.total - R.isi} mata kuliah belum`, R.isi === R.total && R.total ? '#10b981' : '#94a3b8', 'edit')}
  </div>
  <div class="card" style="margin-top:18px">${head(`Kelengkapan per mata kuliah · ${pid} · ${periodeLabel(per)}`, esc(p.nama), 'audit', '#0ea5e9')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sem</th><th>Mata kuliah</th><th>Pengampu</th><th class="num">Kelengkapan</th><th class="num">Sesuai RPS</th><th class="num">CPMK ≥ kriteria</th><th>Tindak lanjut</th></tr></thead><tbody>
    ${R.rows.sort((a, b) => a.m.smt - b.m.smt || a.m.nama.localeCompare(b.m.nama)).map(r => `<tr class="click" data-mk="${esc(r.m.id)}"><td>${r.m.smt}</td><td><b>${esc(short(r.m.nama, 44))}</b>${r.m.inti ? ' <span class="tag" style="--c:#8b5cf6">inti</span>' : ''}${r.d && r.d.ilustratif ? ' <span class="small muted">(contoh)</span>' : ''}</td><td class="small">${esc(short(r.dosen || '–', 36))}</td>
      <td class="num">${r.d ? `${r.k.persen}%` : '–'}</td><td class="num">${r.k.pertSesuaiPct == null ? '–' : fmt(r.k.pertSesuaiPct) + '%'}</td><td class="num">${r.d ? `${r.k.cp.length - r.k.bawah.length}/${r.k.cp.length}` : '–'}</td><td class="small">${r.d && r.d.tl ? stTag('ok', 'Ada') : r.k.bawah.length ? stTag('bad', 'Perlu') : '–'}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada mata kuliah.</td></tr>'}
    </tbody></table></div></div>
  <div class="card" style="margin-top:18px">${head('Ketercapaian CPL turunan dari realisasi', 'Langsung = dari hasil CPMK yang dipetakan ke CPL. Estimasi = dari nilai akhir mata kuliah lewat matriks CPL.', 'pulse', '#8b5cf6')}
    ${K.hasil.some(h => h.per.some(x => x.turunan)) ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>CPL</th>${K.angkatan.map(a => `<th class="num">Angkatan ${esc(a)}</th>`).join('')}</tr></thead><tbody>
      ${K.hasil.filter(h => h.per.length).map(h => `<tr><td><b>${esc(h.c.kode)}</b></td>${K.angkatan.map(a => { const x = h.per.find(q => q.angkatan === a); return x ? `<td class="num"><b style="color:${x.persen >= K.krit ? '#0f8a5f' : '#b42335'}">${fmt(x.persen, 1)}%</b><div class="small muted">${x.turunan === 'CPMK' ? 'langsung (CPMK)' : x.turunan ? 'estimasi tidak langsung' : 'rekap manual'}</div></td>` : '<td class="num muted">–</td>'; }).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="small muted" style="margin-top:8px">Angka ini otomatis masuk ke menu Capaian CPL dan indikator Kesiapan IABEE. Rekap manual tetap didahulukan bila sudah diisi untuk CPL dan angkatan yang sama.</div>` : '<div class="empty">Belum ada hasil yang bisa diturunkan. Isi hasil CPMK atau hasil akhir pada tab Isi per mata kuliah, lengkap dengan angkatannya.</div>'}</div>`;
  const s = el.querySelector('#rl-per'); if (s) s.onchange = () => { per = s.value; rerender(); };
  el.querySelectorAll('[data-mk]').forEach(r => r.onclick = () => { sel = r.dataset.mk; tab = 'isi'; rerender(); });
  const c = el.querySelector('#rl-ct'); if (c) c.onclick = async () => { await saveMany('real', contoh(), 'Muat contoh realisasi pembelajaran ilustratif'); per = '2025-2'; toast('Contoh ilustratif dimuat'); rerender(); };
  animateCounts(el);
}

/* ---------- isi per mata kuliah ---------- */
function tIsi(el, pid, p) {
  const mine = (m) => ctx.role !== 'dosen' || S.tugas.some(t => t.mk === m.id && t.dosen === ctx.dosen);
  const list = (ctx.role === 'dosen' ? S.mk.filter(mine) : byProdi(S.mk, pid)).filter(akad).filter(m => !fSmt || m.smt === +fSmt).sort((a, b) => a.smt - b.smt || a.nama.localeCompare(b.nama));
  if (!sel || !list.some(m => m.id === sel)) sel = list[0] && list[0].id;
  el.innerHTML = `<div class="grid g-12 split-mk"><div class="card" id="rl-l"></div><div id="rl-r"></div></div>`;
  const kiri = el.querySelector('#rl-l');
  const stat = (m) => { const d = (S.real || []).find(x => x.id === idReal(m.id, per)); const k = kelengkapan(S, m, d || null); return d ? `<span class="tag" style="--c:${k.persen === 100 ? '#10b981' : '#f5a524'}">${k.persen}%</span>` : '<span class="tag" style="--c:#94a3b8">belum</span>'; };
  kiri.innerHTML = `<div class="filters"><select class="inp" id="l-smt"><option value="">Semua semester</option>${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<option value="${s}" ${+fSmt === s ? 'selected' : ''}>Semester ${s}</option>`).join('')}</select></div>
    <div class="mklist">${list.map(m => `<div class="mkrow ${m.id === sel ? 'on' : ''}" data-id="${m.id}"><div><b>${esc(short(m.nama, 40))}</b><small>S${m.smt} · ${m.prodi} · ${m.T}T + ${m.P}P${m.inti ? ' · inti' : ''}</small></div>${stat(m)}</div>`).join('') || '<div class="empty">Tidak ada mata kuliah yang Anda ampu.</div>'}</div>`;
  kiri.querySelector('#l-smt').onchange = (e) => { fSmt = e.target.value; rerender(); };
  kiri.querySelectorAll('.mkrow').forEach(r => r.onclick = () => { sel = r.dataset.id; rerender(); });
  const m = S.mk.find(x => x.id === sel), R = el.querySelector('#rl-r');
  if (!m) { R.innerHTML = '<div class="card empty">Pilih mata kuliah.</div>'; return; }
  form(R, m, pid);
}

function form(R, m, pid) {
  const K = kriteria(S), ed = can('real', { prodi: m.prodi, mk: m.id }), rps = S.rps.find(r => r.mk === m.id);
  const id = idReal(m.id, per), d = (S.real || []).find(x => x.id === id) || null, cp = S.cpmk.filter(c => c.mk === m.id).sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
  const pert = (rps && rps.pertemuan && rps.pertemuan.length ? rps.pertemuan : Array.from({ length: 16 }, (_, i) => ({ m: i + 1 }))).map((p, i) => ({ p, ex: (d && d.pert && d.pert.find(x => x.m === (p.m || i + 1))) || {} }));
  const angk = d && d.angkatan ? d.angkatan : angkatanLazim(per, m.smt), dis = ed ? '' : 'disabled';
  const k = kelengkapan(S, m, d), cplKode = (c) => (c.cpl || []).map(i => (S.cpl.find(x => x.id === i) || {}).kode).filter(Boolean).join(', ');
  R.innerHTML = `
  <div class="card">${head(esc(m.nama), `Semester ${m.smt} · ${m.T}T + ${m.P}P · ${periodeLabel(per)}${ed ? '' : ' · hanya baca'}`, 'audit', '#10b981', `<select class="inp" id="f-per" style="width:auto">${periodeDaftar().map(x => `<option value="${x}" ${x === per ? 'selected' : ''}>${periodeLabel(x)}</option>`).join('')}</select>`)}
    <div class="form-grid"><div class="field"><label>Angkatan yang menempuh</label><input class="inp" id="f-ang" value="${esc(angk)}" ${dis} placeholder="2023"></div>
      <div class="field"><label>Kriteria ketercapaian</label><div class="small muted" style="padding-top:8px">Mahasiswa bernilai minimal <b>${K.nilai}</b>; capaian memenuhi bila minimal <b>${K.persen}%</b> mahasiswa mencapainya (pengaturan prodi).</div></div></div>
    <div class="ind-list" style="margin-top:10px">${k.syarat.map(x => `<div class="ind ${x.ok ? 'ok' : 'bad'}"><span class="ind-no">${x.ok ? '✓' : '–'}</span><div><b>${esc(x.t)}</b><div class="small muted">${esc(x.ket)}</div></div></div>`).join('')}</div>
    <div class="small muted" style="margin-top:6px">Kelengkapan dihitung dari data yang sudah disimpan: <b>${k.ok} dari ${k.syarat.length}</b> syarat.</div></div>
  <div class="card" style="margin-top:18px">${head('Realisasi pertemuan dan metode', 'Terisi dari RPS. Tandai apakah pelaksanaan sesuai; bila berubah, catat metode yang dipakai dan alasannya.', 'calendar', '#14b8a6')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mgg</th><th>Rencana (RPS)</th><th>Pelaksanaan</th><th>Metode aktual</th><th>Catatan</th></tr></thead><tbody>
    ${pert.map(({ p, ex }, i) => { const mg = p.m || i + 1; return `<tr data-pm="${mg}"><td>${mg}</td><td class="small" style="white-space:normal;min-width:200px">${p.ujian ? `<b>${esc(p.ujian)}</b>` : esc(short(p.materi || '(belum diisi di RPS)', 70))}<div class="muted">${esc(p.metode || '')}</div></td>
      <td><select class="inp" data-f="st" ${dis}>${Object.entries(ST_PERT).map(([v, t]) => `<option value="${v}" ${(ex.st || 'belum') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
      <td><input class="inp" data-f="metode" value="${esc(ex.metode || '')}" ${dis} placeholder="${esc(short(p.metode || '', 28))}"></td><td><input class="inp" data-f="catatan" value="${esc(ex.catatan || '')}" ${dis}></td></tr>`; }).join('')}
    </tbody></table></div>${ed ? `<div class="filters" style="margin-top:8px"><button class="btn sm" id="p-all">Tandai semua sesuai RPS</button></div>` : ''}</div>
  <div class="card" style="margin-top:18px">${head('Hasil pembelajaran', 'Jumlah mahasiswa yang dinilai dan yang mencapai batas, per CPMK dan akhir mata kuliah.', 'target', '#0ea5e9', ed ? `<button class="btn sm" id="h-tpl">${icon('download')} Templat Excel</button><button class="btn sm" id="h-imp">${icon('upload')} Hitung dari Excel</button>` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>CPMK</th><th>CPL</th><th class="num">Dinilai</th><th class="num">Mencapai batas</th><th class="num">Rata-rata</th><th class="num">Capaian</th></tr></thead><tbody>
    ${cp.map(c => { const h = (d && d.cpmk && d.cpmk[c.id]) || {}, pc = persen(h); return `<tr data-cp="${esc(c.id)}"><td><b>${esc(c.kode)}</b><div class="small muted" style="white-space:normal;min-width:180px">${esc(short(c.teks, 80))}</div></td><td class="small">${esc(cplKode(c))}</td>
      <td><input class="inp num" type="number" min="0" data-f="n" value="${h.n == null ? '' : h.n}" ${dis}></td><td><input class="inp num" type="number" min="0" data-f="lulus" value="${h.lulus == null ? '' : h.lulus}" ${dis}></td><td><input class="inp num" type="number" step="0.1" min="0" max="100" data-f="rata" value="${h.rata == null ? '' : h.rata}" ${dis}></td><td class="num cap">${pc == null ? '–' : `<b style="color:${pc >= K.persen ? '#0f8a5f' : '#b42335'}">${fmt(pc, 1)}%</b>`}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">CPMK mata kuliah ini belum disusun (menu CPMK dan Sub-CPMK).</td></tr>'}
    <tr data-cp="__akhir"><td><b>Nilai akhir mata kuliah</b><div class="small muted">dari SIAKAD atau rekap dosen</div></td><td class="small">${esc((m.cpl || []).map(i => (S.cpl.find(x => x.id === i) || {}).kode).filter(Boolean).join(', '))}</td>
      <td><input class="inp num" type="number" min="0" data-f="n" value="${d && d.akhir && d.akhir.n != null ? d.akhir.n : ''}" ${dis}></td><td><input class="inp num" type="number" min="0" data-f="lulus" value="${d && d.akhir && d.akhir.lulus != null ? d.akhir.lulus : ''}" ${dis}></td><td><input class="inp num" type="number" step="0.1" min="0" max="100" data-f="rata" value="${d && d.akhir && d.akhir.rata != null ? d.akhir.rata : ''}" ${dis}></td><td class="num cap">${d && d.akhir && num(d.akhir.n) ? `<b>${fmt(persen(d.akhir), 1)}%</b>` : '–'}</td></tr>
    </tbody></table></div>
    <div class="small muted" style="margin-top:6px">Hasil CPMK menjadi <b>bukti langsung</b> ketercapaian CPL. Bila hanya nilai akhir yang diisi, ketercapaian CPL dihitung sebagai <b>estimasi tidak langsung</b> dan diberi label itu.</div></div>
  <div class="card" style="margin-top:18px">${head('Tautan bukti (Google Drive)', 'Tempel tautan berkas. Berkas dengan nama atau NIM mahasiswa sebaiknya dianonimkan.', 'link', '#6366f1')}
    <div class="form-grid">${BUKTI.map(([k2, t, w]) => `<div class="field full"><label>${esc(t)}${w ? ' <span class="small muted">(wajib)</span>' : ''}</label><input class="inp" data-b="${k2}" value="${esc((d && d.bukti && d.bukti[k2]) || '')}" ${dis} placeholder="https://drive.google.com/…"></div>`).join('')}</div></div>
  <div class="card" style="margin-top:18px">${head('Evaluasi dan tindak lanjut', 'Analisis hasil dan rencana perbaikan semester berikutnya (siklus penjaminan mutu pembelajaran).', 'loop', '#8b5cf6', ed && k.bawah.length && !(d && d.tl) ? `<button class="btn sm" id="e-tl">${icon('plus')} Buat catatan tindak lanjut</button>` : '')}
    <div class="form-grid"><div class="field full"><label>Analisis ketercapaian CPMK</label><textarea class="inp" id="e-an" rows="3" ${dis}>${esc((d && d.analisis) || '')}</textarea></div>
      <div class="field full"><label>Penyebab bila ada CPMK yang belum tercapai</label><textarea class="inp" id="e-ak" rows="2" ${dis}>${esc((d && d.akar) || '')}</textarea></div>
      <div class="field full"><label>Rencana perbaikan semester berikutnya</label><textarea class="inp" id="e-rc" rows="3" ${dis}>${esc((d && d.rencana) || '')}</textarea></div></div>
    ${d && d.tl ? `<div class="small muted">Terhubung ke catatan tindak lanjut ${esc(d.tl)} (menu Capaian CPL dan Tindak Lanjut).</div>` : ''}</div>
  ${ed ? `<div class="filters" style="margin-top:14px"><button class="btn pri" id="f-save">${icon('check')} Simpan realisasi</button><span class="small muted">Disimpan per mata kuliah dan semester. ${d && d.tgl ? `Terakhir disimpan ${esc(d.tgl)}.` : ''}</span></div>` : ''}`;

  R.querySelector('#f-per').onchange = (e) => { per = e.target.value; rerender(); };
  if (!ed) return;
  const baca = () => {
    const o = { id, mk: m.id, prodi: m.prodi, periode: per, angkatan: R.querySelector('#f-ang').value.trim(), dosen: ctx.role === 'dosen' ? ctx.dosen : (d && d.dosen) || '', batas: K.nilai, tgl: today(), tl: (d && d.tl) || '', ilustratif: undefined };
    o.pert = Array.from(R.querySelectorAll('[data-pm]')).map(tr => ({ m: +tr.dataset.pm, st: tr.querySelector('[data-f=st]').value, metode: tr.querySelector('[data-f=metode]').value.trim(), catatan: tr.querySelector('[data-f=catatan]').value.trim() }));
    const nn = (tr, f) => { const v = tr.querySelector(`[data-f=${f}]`).value; return v === '' ? null : +v; };
    o.cpmk = {}; o.akhir = {};
    R.querySelectorAll('[data-cp]').forEach(tr => { const h = { n: nn(tr, 'n'), lulus: nn(tr, 'lulus'), rata: nn(tr, 'rata') }; if (tr.dataset.cp === '__akhir') o.akhir = h; else if (h.n != null || h.lulus != null || h.rata != null) o.cpmk[tr.dataset.cp] = h; });
    o.bukti = {}; R.querySelectorAll('[data-b]').forEach(i => { if (i.value.trim()) o.bukti[i.dataset.b] = i.value.trim(); });
    o.analisis = R.querySelector('#e-an').value.trim(); o.akar = R.querySelector('#e-ak').value.trim(); o.rencana = R.querySelector('#e-rc').value.trim();
    return o;
  };
  const cek = (o) => {
    if (!/^(19|20)\d{2}$/.test(o.angkatan)) return 'Angkatan diisi empat angka, misalnya 2023.';
    for (const [kd, h] of [...Object.entries(o.cpmk), ['akhir', o.akhir]]) {
      if (h.n == null && h.lulus == null) continue; const t = kd === 'akhir' ? 'nilai akhir' : (S.cpmk.find(c => c.id === kd) || {}).kode;
      if (h.n == null || h.lulus == null) return `Isi jumlah dinilai dan jumlah mencapai batas untuk ${t}.`;
      if (!Number.isInteger(h.n) || !Number.isInteger(h.lulus) || h.n < 0 || h.lulus < 0) return `Jumlah mahasiswa ${t} harus bilangan bulat tidak negatif.`;
      if (h.lulus > h.n) return `Yang mencapai batas melebihi yang dinilai pada ${t}.`;
      if (h.rata != null && (h.rata < 0 || h.rata > 100)) return `Rata-rata ${t} antara 0 dan 100.`;
    }
    for (const [k2, u] of Object.entries(o.bukti)) if (!/^https:\/\//i.test(u)) return `Tautan ${BUKTI.find(b => b[0] === k2)[1]} harus diawali https://`;
    return '';
  };
  const simpan = async (o, aksi) => { const e = cek(o); if (e) { toast(e); return false; } delete o.ilustratif; await save('real', o, aksi || `Simpan realisasi pembelajaran ${m.kode || m.nama} ${periodeLabel(per)}`); return true; };
  R.querySelector('#f-save').onclick = async () => { if (await simpan(baca())) { toast('Realisasi tersimpan'); rerender(); } };
  R.querySelector('#p-all').onclick = () => R.querySelectorAll('[data-pm] [data-f=st]').forEach(s => { if (s.value === 'belum') s.value = 'sesuai'; });
  const tl = R.querySelector('#e-tl');
  if (tl) tl.onclick = async () => {
    const o = baca(); if (!(await simpan(o))) return; const hb = kelengkapan(S, m, o).bawah, c0 = hb[0];
    const doc = { id: uid('TL'), prodi: m.prodi, cpl: (c0.cpl || [])[0] || '', angkatan: o.angkatan, temuan: `${m.nama} ${periodeLabel(per)}: CPMK di bawah ${K.persen}% mahasiswa mencapai nilai ${K.nilai}: ${hb.map(c => `${c.kode} (${fmt(persen(o.cpmk[c.id]), 1)}%)`).join(', ')}.`, tindakan: o.rencana || '', pj: 'Dosen pengampu dan Kaprodi', target: '', status: 'rencana', revisi: '', hasil: '', tgl: today(), sumber: o.id };
    await save('tl', doc, `Tindak lanjut dari realisasi ${m.nama}`); o.tl = doc.id; await save('real', o); toast('Catatan tindak lanjut dibuat'); rerender();
  };
  R.querySelector('#h-tpl').onclick = async () => {
    const X = await loadXLSX(), wb = X.utils.book_new(), hd = ['NIM (anonimkan)', ...cp.map(c => c.kode), 'Nilai akhir MK'];
    const ws = X.utils.aoa_to_sheet([hd, ['M001', ...cp.map(() => 78), 80], ['M002', ...cp.map(() => 55), 58, 'Contoh, hapus baris ini']]); ws['!cols'] = hd.map(() => ({ wch: 16 })); X.utils.book_append_sheet(wb, ws, 'NILAI');
    const pt = X.utils.aoa_to_sheet([['Petunjuk'], ['1. Satu baris = satu mahasiswa. Kolom CPMK diisi nilai 0 sampai 100 untuk CPMK itu (hitung dari komponen penilaian Anda).'], [`2. Mencapai batas = nilai minimal ${K.nilai}. Aplikasi hanya menghitung jumlah dan rata-rata; berkas ini tidak disimpan.`], ['3. Ganti NIM dengan kode anonim atau hapus kolomnya. Hapus baris contoh sebelum dipakai.'], ['4. Kolom boleh dikosongkan bila CPMK tidak diukur pada semester ini.']]); pt['!cols'] = [{ wch: 110 }]; X.utils.book_append_sheet(wb, pt, 'PETUNJUK');
    unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Templat_Nilai_CPMK_${m.kode || m.id}.xlsx`);
  };
  R.querySelector('#h-imp').onclick = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls,.csv'; f.onchange = async () => { if (!f.files[0]) return; try { await hitungExcel(f.files[0], R, cp, K); } catch (e) { console.error(e); toast('Gagal membaca berkas: ' + e.message); } }; f.click(); };
}

/** Membaca berkas nilai di peramban, menghitung jumlah dan rata-rata, mengisi kolom (belum disimpan). */
async function hitungExcel(file, R, cp, K) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' });
  let rows = null, h = null;
  for (const nm of wb.SheetNames) { const r = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: '' }); const i = r.findIndex(x => x.some(c => /^cpmk\d+/.test(nz(c)) || /^nilaiakhir/.test(nz(c)))); if (i >= 0) { h = r[i].map(nz); rows = r.slice(i + 1).filter(x => x.some(v => String(v).trim()) && !x.some(v => /hapus baris ini/i.test(String(v)))); break; } }
  if (!rows) throw new Error('Kolom CPMK1, CPMK2, … atau Nilai akhir tidak ditemukan. Pakai templat dari tombol Templat Excel.');
  const stat = (i) => { const v = rows.map(r => r[i]).filter(x => String(x).trim() !== '' && !Number.isNaN(+x)).map(Number); return v.length ? { n: v.length, lulus: v.filter(x => x >= K.nilai).length, rata: Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 } : null; };
  const lap = []; let terisi = 0;
  const isi = (tr, s) => { if (!tr || !s) return; tr.querySelector('[data-f=n]').value = s.n; tr.querySelector('[data-f=lulus]').value = s.lulus; tr.querySelector('[data-f=rata]').value = s.rata; terisi++; lap.push(`${tr.dataset.cp === '__akhir' ? 'Nilai akhir' : (cp.find(c => c.id === tr.dataset.cp) || {}).kode}: ${s.lulus}/${s.n}`); };
  cp.forEach(c => { const i = h.indexOf(nz(c.kode)); if (i >= 0) isi(R.querySelector(`[data-cp="${c.id}"]`), stat(i)); });
  const ia = h.findIndex(x => /^nilaiakhir/.test(x)); if (ia >= 0) isi(R.querySelector('[data-cp="__akhir"]'), stat(ia));
  if (!terisi) throw new Error('Tidak ada kolom yang cocok dengan CPMK mata kuliah ini.');
  toast(`${terisi} baris hasil terisi dari berkas (${lap.slice(0, 3).join('; ')}${lap.length > 3 ? ', …' : ''}). Periksa lalu tekan Simpan realisasi.`);
}

/* ---------- contoh ilustratif (hanya mode demo) ---------- */
function contoh() {
  const out = [], K = kriteria(S), pr = '2025-2';
  S.prodi.forEach((p, pi) => {
    S.mk.filter(m => m.prodi === p.id && akad(m) && m.smt % 2 === 0 && m.smt <= 6 && S.cpmk.some(c => c.mk === m.id)).slice(0, 4).forEach((m, i) => {
      const cp = S.cpmk.filter(c => c.mk === m.id), n = 28 + (i * 3 + pi) % 9, sedikit = (pi + i) % 5 === 4, rps = S.rps.find(r => r.mk === m.id);
      const d = { id: idReal(m.id, pr), mk: m.id, prodi: p.id, periode: pr, angkatan: angkatanLazim(pr, m.smt), dosen: '', batas: K.nilai, tgl: today(), ilustratif: true, tl: '',
        pert: Array.from({ length: 16 }, (_, j) => ({ m: j + 1, st: j % 7 === 3 ? 'berubah' : 'sesuai', metode: j % 7 === 3 ? 'Diskusi kelompok dan studi kasus (menggantikan kuliah klasikal)' : '', catatan: j % 7 === 3 ? 'Dosen tamu berhalangan, disesuaikan (contoh)' : '' })),
        cpmk: Object.fromEntries(cp.map((c, j) => { const l = Math.round(n * ((sedikit && j === 0) ? 0.55 : 0.8 + ((j + i) % 3) * 0.05)); return [c.id, { n, lulus: Math.min(n, l), rata: Math.round((66 + (j + i) % 4 * 4) * 10) / 10 }]; })),
        akhir: { n, lulus: Math.min(n, Math.round(n * 0.86)), rata: 74.5 },
        bukti: i % 2 === 0 ? { soalUts: 'https://drive.google.com/contoh', soalUas: 'https://drive.google.com/contoh', kisi: 'https://drive.google.com/contoh', rubrik: 'https://drive.google.com/contoh' } : {},
        analisis: i % 2 === 0 ? 'Sebagian besar mahasiswa mencapai CPMK (contoh ilustratif).' : '', akar: sedikit ? 'Praktik terbimbing kurang (contoh).' : '', rencana: i % 2 === 0 ? 'Menambah sesi praktik terbimbing semester berikutnya (contoh).' : '' };
      out.push(d);
    });
  });
  return out;
}
