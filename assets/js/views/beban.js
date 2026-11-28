/* KUREKAM · Penugasan dan beban dosen (JP total hasil konversi SKS ke jam pelajaran) */
import { S, ctx, can, save, remove, rerender, esc, icon, uid, openDrawer, saveSettings, toast } from '../app.js';
import { bangunTemplatePenugasan } from '../tugasexcel.js';
import { imporPenugasan } from './induk.js';
import { chart, AX } from '../charts.js';
import { gerbangTerbuka, PESAN_BELUM_TETAP, beban, bebanTugas, mkTanpaPengampu, param, fmt, sksOf, kelasOf, durasi, byProdi } from '../rules.js';
import { head, formDrawer, kpi, animateCounts, stTag, prodiTag, short, bar, unduh, loadXLSX } from './ui.js';

let fHome = '', tabB = 'rekap';
const KL = { ok: 'Wajar', near: 'Di bawah batas', bad: 'Melebihi batas' };

export default function bebanView(el) {
  const par = S.settings.paritas || 'ganjil';
  const { rows, P } = beban(S, par);
  const act = rows.filter(r => r.items.length);
  const view = (ctx.role === 'dosen' ? rows.filter(r => r.d.id === ctx.dosen) : rows).filter(r => !fHome || r.d.homebase === fHome).sort((a, b) => b.riil - a.riil);
  const over = act.filter(r => r.k === 'bad'), under = rows.filter(r => r.k === 'near');
  const kosong = mkTanpaPengampu(S, par);
  const avgN = act.reduce((a, r) => a + r.nominal, 0) / Math.max(1, act.length), avgR = act.reduce((a, r) => a + r.riil, 0) / Math.max(1, act.length);
  const homes = Array.from(new Set(S.dosen.map(d => d.homebase)));
  const lintas = act.filter(r => r.prodi.size > 1 || (r.prodi.size === 1 && r.d.homebase !== 'Bersama' && !r.prodi.has(r.d.homebase)));
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span><b>Beban dalam jam pelajaran (JP).</b> JP total per minggu = (SKS teori × ${P.menitTeori} menit + SKS praktik × durasi praktik) ÷ ${(S.settings.jp && S.settings.jp.dur) || 60} menit per JP, dikalikan jumlah kelas dan porsi dosen. Durasi praktik: MKU/MBS ${P.durasiPraktik.MKU} menit, MBE/MKK ${P.durasiPraktik.MKK} menit per SKS praktik. Batas wajar ${P.bebanRiilMin}–${P.bebanRiilMax} JP total per minggu dapat diubah di Data Induk, durasi 1 JP di Parameter.</span></div>
  <div class="grid g5">
    ${kpi('Rata-rata JP total', avgR, `SKS kurikulum rata-rata ${fmt(avgN, 1)}`, '#10b981', 'pulse', 1)}
    ${kpi('Dosen melebihi batas', over.length, `di atas ${P.bebanRiilMax} JP total`, '#f0616d', 'alert')}
    ${kpi('Dosen di bawah batas', under.length, `di bawah ${P.bebanRiilMin} JP total`, '#f5a524', 'arrowDown')}
    ${kpi('MK tanpa pengampu', kosong.length, `semester ${par}`, '#8b5cf6', 'book')}
    ${kpi('Dosen lintas prodi', lintas.length, `mengajar di prodi selain homebase atau di lebih dari satu prodi`, '#14b8a6', 'link')}
  </div>
  <div class="filters" style="margin-top:16px">
    <div class="seg"><button data-p="ganjil" class="${par === 'ganjil' ? 'on' : ''}">Semester ganjil</button><button data-p="genap" class="${par === 'genap' ? 'on' : ''}">Semester genap</button></div>
    <div class="seg"><button data-t="rekap" class="${tabB === 'rekap' ? 'on' : ''}">Rekap beban</button><button data-t="tugas" class="${tabB === 'tugas' ? 'on' : ''}">Penugasan per MK</button><button data-t="jalan" class="${tabB === 'jalan' ? 'on' : ''}">Beban kurikulum berjalan</button></div>
    ${ctx.role !== 'dosen' ? `<select class="inp" id="f-home"><option value="">Semua homebase</option>${homes.map(h => `<option ${h === fHome ? 'selected' : ''}>${h}</option>`).join('')}</select>` : ''}
    <button class="btn sm" id="csv">${icon('download')} Unduh CSV</button>
  </div>
  ${tabB === 'rekap' ? `
  <div class="grid g-21">
    <div class="card">${head('SKS kurikulum dibanding JP total', 'Garis putus-putus = batas maksimal. Selisih keduanya adalah jam praktik yang selama ini tidak terlihat.', 'user', '#f5a524')}<div class="chart" style="height:${Math.max(320, view.filter(r => r.items.length).length * 22 + 60)}px" id="c-b"></div></div>
    <div class="grid" style="align-content:start">
      <div class="card">${head('Sebaran beban', 'Jumlah dosen per rentang JP total', 'sim', '#0ea5e9')}<div class="chart sm" id="c-h"></div></div>
      <div class="card">${head('Teori dan praktik', 'JP per minggu seluruh dosen', 'bolt', '#10b981')}<div class="chart sm" id="c-tp"></div></div>
    </div>
  </div>
  <div class="card" style="margin-top:18px">${head('Rekap beban dosen', `Semester ${par} ${S.settings.tahunAkademik || ''} · klik baris untuk rincian`, 'user', '#f5a524')}
    <div class="tbl-wrap" style="max-height:600px"><table class="tbl"><thead><tr><th>Dosen</th><th>Homebase</th><th>Mengajar di</th><th class="num">MK</th><th class="num">Kelas</th><th class="num">SKS kurikulum</th><th class="num">JP teori</th><th class="num">JP praktik</th><th class="num">JP total per minggu</th><th>Terhadap batas</th><th>Status</th></tr></thead><tbody>
    ${view.map(r => `<tr class="click" data-d="${r.d.id}"><td><b>${esc(r.d.nama)}</b><div class="small muted">${esc(r.d.bidang || '')}</div></td><td>${r.d.homebase === 'Bersama' ? '<span class="tag">Bersama</span>' : prodiTag(r.d.homebase)}</td><td>${Array.from(r.prodi).map(prodiTag).join(' ') || '<span class="muted small">–</span>'}</td><td class="num">${new Set(r.items.map(i => i.m.id)).size}</td><td class="num">${fmt(r.items.reduce((a, i) => a + i.kls, 0))}</td><td class="num">${fmt(r.nominal, 1)}</td><td class="num">${fmt(r.riilT, 1)}</td><td class="num">${fmt(r.riilP, 1)}</td><td class="num"><b>${fmt(r.riil, 1)}</b></td><td>${bar(r.riil / P.bebanRiilMax * 100, r.k === 'bad' ? '#f0616d' : r.k === 'near' ? '#f5a524' : '#10b981', '110px')}</td><td>${r.items.length ? stTag(r.k, KL[r.k]) : stTag('na', 'Belum ditugaskan')}</td></tr>`).join('')}
    </tbody></table></div></div>` : tabB === 'jalan' ? jalanTab(P) : tugasTab(par, P)}`;

  animateCounts(el);
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => { S.settings.paritas = b.dataset.p; await saveSettings(); rerender(); });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tabB = b.dataset.t; rerender(); });
  const fh = el.querySelector('#f-home'); if (fh) fh.onchange = e => { fHome = e.target.value; rerender(); };
  el.querySelector('#csv').onclick = () => {
    const lines = [['Dosen', 'Homebase', 'SKS kurikulum', 'JP teori', 'JP praktik', 'JP total per minggu', 'Status'].join(';')].concat(rows.map(r => [r.d.nama, r.d.homebase, r.nominal.toFixed(2), r.riilT.toFixed(2), r.riilP.toFixed(2), r.riil.toFixed(2), r.items.length ? KL[r.k] : 'Belum ditugaskan'].join(';')));
    unduh(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }), `beban-dosen-${par}.csv`);
  };

  if (tabB === 'rekap') {
    const vv = view.filter(r => r.items.length).slice().reverse();
    chart(el.querySelector('#c-b'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 30, top: 30, bottom: 8, containLabel: true },
      xAxis: { type: 'value', ...AX }, yAxis: { type: 'category', data: vv.map(r => r.d.nama), ...AX, axisLabel: { fontSize: 10, color: '#6b778c' } },
      series: [{ name: 'SKS kurikulum', type: 'bar', barGap: '-100%', barWidth: 12, z: 3, data: vv.map(r => +r.nominal.toFixed(1)), itemStyle: { color: '#0ea5e9', borderRadius: [0, 6, 6, 0] } },
        { name: 'JP total', type: 'bar', barWidth: 12, data: vv.map(r => ({ value: +r.riil.toFixed(1), itemStyle: { color: r.k === 'bad' ? 'rgba(240,97,109,.55)' : 'rgba(16,185,129,.45)', borderRadius: [0, 6, 6, 0] } })), markLine: { symbol: 'none', data: [{ xAxis: P.bebanRiilMax }, { xAxis: P.bebanRiilMin }], lineStyle: { color: '#8b5cf6', type: 'dashed' }, label: { fontSize: 10 } } }] });
    const bins = [0, 4, 8, 12, 16, 20, 24, 30, 99], lab = bins.slice(0, -1).map((b, i) => i === bins.length - 2 ? `>${b}` : `${b}–${bins[i + 1]}`);
    chart(el.querySelector('#c-h'), { tooltip: {}, grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: lab, ...AX }, yAxis: { type: 'value', ...AX },
      series: [{ type: 'bar', barWidth: '62%', data: lab.map((_, i) => ({ value: act.filter(r => r.riil >= bins[i] && r.riil < bins[i + 1]).length, itemStyle: { color: bins[i] >= P.bebanRiilMax ? '#f0616d' : bins[i + 1] <= P.bebanRiilMin ? '#f5a524' : '#10b981', borderRadius: [8, 8, 0, 0] } })) }] });
    chart(el.querySelector('#c-tp'), { tooltip: {}, series: [{ type: 'pie', radius: ['48%', '78%'], itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 }, label: { formatter: '{b}\n{d}%', fontSize: 11 }, data: [{ name: 'Teori', value: +act.reduce((a, r) => a + r.riilT, 0).toFixed(1), itemStyle: { color: '#0ea5e9' } }, { name: 'Praktik', value: +act.reduce((a, r) => a + r.riilP, 0).toFixed(1), itemStyle: { color: '#10b981' } }] }] });
    el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => detail(rows.find(r => r.d.id === tr.dataset.d), P, par));
  } else if (tabB === 'tugas') bindTugas(el, par);
  else el.querySelectorAll('tr[data-j]').forEach(tr => tr.onclick = () => detailJalan(tr.dataset.j, P));
}

/** Rincian MK, prodi, tingkat, kelas, dan jam per dosen dari daftar pengampu kurikulum berjalan. */
function detailJalan(id, P) {
  const d = S.dosen.find(x => x.id === id) || { nama: '(tidak dikenal)' }, dur = (g) => P.durasiPraktik[g] || P.durasiPraktik.MKK, jpm = (S.settings.jp && +S.settings.jp.dur) || 60;
  const rows = S.ajar.filter(a => a.dosen === id).slice().sort((a, b) => a.prodi.localeCompare(b.prodi) || a.smt - b.smt || a.kode.localeCompare(b.kode) || String(a.kelas).localeCompare(String(b.kelas)));
  const h = (a) => ({ t: a.sT * P.menitTeori / jpm, p: a.sP * dur(a.g) / jpm });
  const tot = rows.reduce((o, a) => { const x = h(a); o.t += x.t; o.p += x.p; o.nom += a.sT + a.sP; return o; }, { t: 0, p: 0, nom: 0 });
  const grp = (f) => { const m = {}; rows.forEach(a => { const x = h(a), k = f(a); m[k] = (m[k] || 0) + x.t + x.p; }); return Object.entries(m).map(([k, v]) => `<span class="tag">${esc(k)}: ${fmt(v, 1)}</span>`).join(' '); };
  const tk = (a) => Math.ceil((a.smt || 1) / 2), riil = tot.t + tot.p, k = riil > P.bebanRiilMax ? 'bad' : riil < P.bebanRiilMin ? 'near' : 'ok';
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('user')}</span><div><h3>${esc(d.nama)}</h3><div class="sub">${esc(d.status || 'Dosen internal')} · homebase ${esc(d.homebase || '-')} · kurikulum berjalan, semester ganjil</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="grid g3 mini"><div><small>SKS kurikulum</small><b>${fmt(tot.nom, 1)}</b></div><div><small>JP total per minggu</small><b>${fmt(riil, 1)}</b></div><div><small>Kelas diampu</small><b>${rows.length}</b></div></div>
  <p class="small" style="margin-top:10px"><b>Per prodi (jam):</b> ${grp(a => a.prodi)}<br><b>Per tingkat (jam):</b> ${grp(a => 'Tingkat ' + tk(a))}</p>
  <div class="tbl-wrap" style="margin-top:12px;max-height:420px"><table class="tbl"><thead><tr><th>Prodi</th><th class="num">Tingkat</th><th class="num">Smt</th><th>Kode</th><th>Mata kuliah</th><th>Kelas</th><th class="num">SKS T+P</th><th class="num">JP teori</th><th class="num">JP praktik</th><th class="num">JP total</th></tr></thead><tbody>
  ${rows.map(a => { const x = h(a); return `<tr><td>${prodiTag(a.prodi)}</td><td class="num">${tk(a)}</td><td class="num">${a.smt}</td><td class="small">${esc(a.kode)}</td><td><b>${esc(short(a.nama, 44))}</b><div class="small muted">${esc(a.g)}${a.sP ? ` · praktik ${dur(a.g)} menit/SKS` : ''}</div></td><td>${esc(a.kelas || '-')}</td><td class="num">${a.sT}+${a.sP}</td><td class="num">${fmt(x.t, 1)}</td><td class="num">${fmt(x.p, 1)}</td><td class="num"><b>${fmt(x.t + x.p, 2)}</b></td></tr>`; }).join('')}
  <tr><td colspan="6"><b>Total</b></td><td class="num"><b>${fmt(tot.nom, 1)}</b></td><td class="num"><b>${fmt(tot.t, 1)}</b></td><td class="num"><b>${fmt(tot.p, 1)}</b></td><td class="num"><b>${fmt(riil, 1)}</b></td></tr>
  </tbody></table></div>
  <div class="formula" style="margin-top:14px">JP total = (sks teori × ${P.menitTeori} + sks praktik × durasi praktik) ÷ ${jpm} menit per JP, dijumlah untuk semua kelas<br>Batas wajar: <b>${P.bebanRiilMin}–${P.bebanRiilMax}</b> · Status: <b>${KL[k]}</b></div>`, null, true);
}

function detail(r, P, par) {
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('user')}</span><div><h3>${esc(r.d.nama)}</h3><div class="sub">${esc(r.d.jabatan || '')} · ${esc(r.d.bidang || '')} · semester ${par}</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="grid g3 mini"><div><small>SKS kurikulum</small><b>${fmt(r.nominal, 1)}</b></div><div><small>JP total per minggu</small><b>${fmt(r.riil, 1)}</b></div><div><small>Selisih jam praktik</small><b>+${fmt(r.selisih, 1)}</b></div></div>
  <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Mata kuliah</th><th>Prodi</th><th class="num">T+P</th><th class="num">Kelas</th><th class="num">Porsi T/P</th><th class="num">SKS kur.</th><th class="num">JP total</th></tr></thead><tbody>
  ${r.items.map(i => `<tr><td><b>${esc(i.m.nama)}</b><div class="small muted">Semester ${i.m.smt} · praktik ${durasi(i.m, P)} menit/SKS</div></td><td>${prodiTag(i.m.prodi)}</td><td class="num">${i.m.T}+${i.m.P}</td><td class="num">${i.kls}</td><td class="num">${fmt(i.pT * 100)}% / ${fmt(i.pP * 100)}%</td><td class="num">${fmt(i.nominal, 1)}</td><td class="num"><b>${fmt(i.riil, 2)}</b></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada penugasan pada semester ini.</td></tr>'}
  </tbody></table></div>
  <div class="formula" style="margin-top:14px">JP total = Σ ( T × porsiT × ${P.menitTeori} + P × porsiP × durasi praktik ) ÷ ${(S.settings.jp && S.settings.jp.dur) || 60} × kelas<br>Batas wajar: <b>${P.bebanRiilMin}–${P.bebanRiilMax}</b> JP total per minggu · Status: <b>${r.items.length ? KL[r.k] : 'Belum ditugaskan'}</b></div>`, null, true);
}

/** Beban riil dari daftar pengampu kurikulum berjalan (semester ganjil), dihitung per dosen. */
function jalanTab(P) {
  if (!S.ajar.length) return `<div class="card">${head('Beban kurikulum berjalan', 'Data pengampu per kelas dari berkas beban mengajar', 'user', '#8b5cf6')}<p class="empty">Belum ada data. Unggah berkas daftar pengampu di Data Induk & Pengaturan, tab Impor & ekspor, kartu "Impor pengampu MK kurikulum berjalan".</p></div>`;
  const dur = (g) => P.durasiPraktik[g] || P.durasiPraktik.MKK, jpm = (S.settings.jp && +S.settings.jp.dur) || 60;
  const by = {};
  S.ajar.forEach(a => { const r = by[a.dosen] || (by[a.dosen] = { id: a.dosen, d: S.dosen.find(x => x.id === a.dosen) || { nama: '(tidak dikenal)', homebase: '-' }, nom: 0, riil: 0, riilT: 0, riilP: 0, mk: new Set(), prodi: new Set(), kelas: 0 }); r.nom += a.sT + a.sP; r.riilT += a.sT * P.menitTeori / jpm; r.riilP += a.sP * dur(a.g) / jpm; r.riil = r.riilT + r.riilP; r.mk.add(a.prodi + a.kode); r.prodi.add(a.prodi); r.kelas++; });
  let list = Object.entries(by).filter(([id]) => ctx.role !== 'dosen' || id === ctx.dosen).map(([, r]) => r).filter(r => !fHome || r.d.homebase === fHome || r.prodi.has(fHome)).sort((a, b) => b.riil - a.riil);
  const all = Object.values(by), lin = all.filter(r => r.prodi.size > 1), luar = all.filter(r => r.d.status && /luar biasa|purna|capstone/i.test(r.d.status)), tot = all.reduce((a, r) => a + r.riil, 0), totLuar = luar.reduce((a, r) => a + r.riil, 0);
  const st = (r) => r.riil > P.bebanRiilMax ? 'bad' : r.riil < P.bebanRiilMin ? 'near' : 'ok';
  return `<div class="grid g4" style="margin-bottom:16px">
    ${kpi('Dosen mengampu', all.length, `${S.ajar.length} baris kelas, semester ganjil`, '#8b5cf6', 'user')}
    ${kpi('Mengajar lintas prodi', lin.length, 'di lebih dari satu prodi', '#14b8a6', 'link')}
    ${kpi('Beban dosen luar biasa', tot ? totLuar / tot * 100 : 0, `% jam riil oleh ${luar.length} dosen luar biasa, purna, atau tim capstone`, '#f5a524', 'alert', 1)}
    ${kpi('Melebihi batas', all.filter(r => st(r) === 'bad').length, `di atas ${P.bebanRiilMax} JP total`, '#f0616d', 'alert')}
  </div>
  <div class="card">${head('JP total kurikulum berjalan per dosen', 'JP total = (sks teori × menit teori + sks praktik × durasi praktik jenis MK) ÷ menit per JP. Klik nama dosen untuk melihat MK, prodi, tingkat, kelas, dan jam.', 'user', '#8b5cf6')}
    <div class="tbl-wrap" style="max-height:640px"><table class="tbl"><thead><tr><th>Dosen</th><th>Status</th><th>Homebase</th><th>Mengajar di</th><th class="num">MK</th><th class="num">Kelas</th><th class="num">SKS kurikulum</th><th class="num">JP teori</th><th class="num">JP praktik</th><th class="num">JP total</th><th>Status beban</th></tr></thead><tbody>
    ${list.map(r => `<tr class="click" data-j="${r.id}"><td><b>${esc(r.d.nama)}</b></td><td class="small">${esc(r.d.status || 'Dosen internal')}</td><td>${r.d.homebase === 'Bersama' ? '<span class="tag">Bersama</span>' : prodiTag(r.d.homebase)}</td><td>${Array.from(r.prodi).map(prodiTag).join(' ')}</td><td class="num">${r.mk.size}</td><td class="num">${r.kelas}</td><td class="num">${fmt(r.nom, 1)}</td><td class="num">${fmt(r.riilT, 1)}</td><td class="num">${fmt(r.riilP, 1)}</td><td class="num"><b>${fmt(r.riil, 1)}</b></td><td>${stTag(st(r), KL[st(r)])}</td></tr>`).join('')}
    </tbody></table></div>${ctx.role === 'dosen' && !list.length ? '<p class="empty">Nama Anda belum tercatat sebagai pengampu pada berkas yang diimpor.</p>' : ''}<p class="note">Data satu semester ganjil dari berkas beban mengajar. Dosen luar biasa tidak dinilai terhadap batas dosen tetap, abaikan statusnya bila tidak relevan.</p></div>`;
}

let hasilTugas = '';
const mkTugas = (par) => (ctx.role === 'prodi' ? byProdi(S.mk, ctx.prodi) : S.mk).filter(m => m.smt <= 6 && (m.smt % 2 === 1) === (par === 'ganjil')).filter(m => !fHome || fHome === 'Bersama' || m.prodi === fHome).sort((a, b) => a.prodi.localeCompare(b.prodi) || a.smt - b.smt);
const bolehTugas = () => ['prodi', 'admin', 'developer', 'wadir', 'akademik'].includes(ctx.role);
function tugasTab(par, P) {
  const mk = mkTugas(par);
  return `${hasilTugas ? `<div class="ribbon info" style="display:block;margin-bottom:12px">${hasilTugas}</div>` : ''}<div class="card">${head('Penugasan dosen per mata kuliah', 'Kaprodi menugaskan pengampu; porsi dipakai untuk team teaching atau kelas praktik yang dibagi', 'book', '#14b8a6', `<button class="btn sm" id="tg-tpl">${icon('download')} Template Excel</button><button class="btn sm" id="tg-imp" ${bolehTugas() ? '' : 'disabled'}>${icon('upload')} Impor Excel</button>`)}
  <div class="tbl-wrap" style="max-height:640px"><table class="tbl"><thead><tr><th>Prodi</th><th>Smt</th><th>Mata kuliah</th><th class="num">T+P</th><th class="num">Kelas</th><th>Pengampu (kelas · SKS T/P per kelas)</th><th class="num">Tertutup</th><th></th></tr></thead><tbody>
  ${mk.map(m => { const ts = S.tugas.filter(t => t.mk === m.id); const kls = kelasOf(S, m.prodi, m.smt); const cT = m.T ? ts.reduce((a, t) => a + (+t.kelas || 0) * (t.porsiT == null ? 1 : +t.porsiT), 0) / Math.max(1, kls) : 1; const cP = m.P ? ts.reduce((a, t) => a + (+t.kelas || 0) * (t.porsiP == null ? 1 : +t.porsiP), 0) / Math.max(1, kls) : 1; const cov = Math.min(cT, cP) * 100;
    return `<tr><td>${prodiTag(m.prodi)}</td><td class="num">${m.smt}</td><td><b>${esc(short(m.nama, 46))}</b></td><td class="num">${m.T}+${m.P}</td><td class="num">${kls}</td><td>${ts.map(t => `<span class="tag pick ${can('susun', m) ? 'click' : ''}" data-tg="${t.id}" style="--c:${t.koordinator ? '#f59e0b' : '#0ea5e9'}">${t.koordinator ? '★ Koord. ' : ''}${esc((S.dosen.find(d => d.id === t.dosen) || {}).nama || '?')} · ${t.kelas} kls · T ${fmt((t.porsiT == null ? 1 : t.porsiT) * m.T, 1)} / P ${fmt((t.porsiP == null ? 1 : t.porsiP) * m.P, 1)} SKS</span>`).join(' ') || '<span class="st bad">Belum ada pengampu</span>'}${ts.length && !ts.some(t => t.koordinator) ? '<div class="small muted" style="margin-top:4px">Belum ada koordinator MK</div>' : ''}</td><td class="num"><span class="st ${cov >= 99.5 && cov <= 100.5 ? 'ok' : cov > 100.5 ? 'near' : 'bad'}">${fmt(cov)}%</span></td><td>${can('susun', m) ? `<button class="btn sm" data-add="${m.id}">${icon('plus')}</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div><p class="note">Kolom "Tertutup" menunjukkan apakah seluruh kelas dan seluruh porsi teori serta praktik sudah punya pengampu (target 100%).</p></div>`;
}
function bindTugas(el, par) {
  const tpl = el.querySelector('#tg-tpl'), imp = el.querySelector('#tg-imp');
  if (tpl) tpl.onclick = async () => { const X = await loadXLSX(); unduh(new Blob([X.write(bangunTemplatePenugasan(X, S, mkTugas(par), kelasOf, `semester ${par}`), { bookType: 'xlsx', type: 'array' })]), `Template_Penugasan_${par}${ctx.role === 'prodi' ? '_' + ctx.prodi : ''}.xlsx`); };
  if (imp) imp.onclick = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.xlsx,.xls'; f.onchange = async () => { if (!f.files[0]) return; try { const X = await loadXLSX(); hasilTugas = await imporPenugasan(X, X.read(await f.files[0].arrayBuffer(), { type: 'array' })); } catch (e) { console.error(e); hasilTugas = `<b>Impor gagal.</b> ${esc(e.message)}`; } rerender(); }; f.click(); };
  const form = (x0, m) => {
    const P = param(S), x = { ...x0, peran: x0.koordinator ? 'koordinator' : 'anggota', sksT: x0.porsiT == null ? m.T : +(x0.porsiT * m.T).toFixed(2), sksP: x0.porsiP == null ? m.P : +(x0.porsiP * m.P).toFixed(2) };
    formDrawer({ title: x.id ? 'Ubah penugasan' : 'Tugaskan dosen', sub: `${m.nama} · ${m.T}T + ${m.P}P · ${kelasOf(S, m.prodi, m.smt)} kelas`, obj: x,
      fields: [{ k: 'dosen', label: 'Dosen', type: 'select', opts: S.dosen.filter(d => d.homebase === m.prodi || (d.prodiAjar || []).includes(m.prodi) || d.homebase === 'Bersama').concat(S.dosen.filter(d => d.homebase !== m.prodi && d.homebase !== 'Bersama' && !(d.prodiAjar || []).includes(m.prodi))).map(d => ({ v: d.id, t: `${d.nama} · ${d.homebase === m.prodi ? 'homebase ' + m.prodi : d.homebase === 'Bersama' ? 'Bersama' : (d.prodiAjar || []).includes(m.prodi) ? 'homebase ' + d.homebase + ', juga mengajar di ' + m.prodi : 'lintas prodi, homebase ' + d.homebase}` })) },
        { k: 'peran', label: 'Peran pada MK ini', type: 'select', opts: [{ v: 'anggota', t: 'Dosen anggota' }, { v: 'koordinator', t: 'Dosen koordinator MK' }] },
        { k: 'kelas', label: 'Jumlah kelas diampu (dosen yang membagi kelas mengisi kelas masing-masing)', type: 'number' }, { k: 'sksT', label: `SKS teori yang diampu dosen ini, per kelas (MK ini ${m.T} SKS teori)`, type: 'number', step: '0.5' }, { k: 'sksP', label: `SKS praktik yang diampu dosen ini, per kelas (MK ini ${m.P} SKS praktik)`, type: 'number', step: '0.5', watch: ['sksT', 'kelas'], live: () => { const d = document.querySelector('#fd'); if (!d) return ''; const st = +d.querySelector('[name=sksT]').value || 0, sp = +d.querySelector('[name=sksP]').value || 0, lain = S.tugas.filter(q => q.mk === m.id && q.id !== x.id), pT = m.T ? st / m.T : 0, pP = m.P ? sp / m.P : 0; const t = { mk: m.id, kelas: d.querySelector('[name=kelas]').value, porsiT: pT, porsiP: pP }; const b = bebanTugas(S, t, P); const lT = lain.reduce((a, q) => a + (q.porsiT == null ? 1 : q.porsiT) * m.T, 0), lP = lain.reduce((a, q) => a + (q.porsiP == null ? 1 : q.porsiP) * m.P, 0); return `${b ? `Beban penugasan ini: SKS kurikulum <b>${fmt(b.nominal, 2)}</b>, JP total <b>${fmt(b.riil, 2)}</b> (JP/minggu)<br>` : ''}Dosen lain pada MK ini: teori ${fmt(lT, 1)} SKS, praktik ${fmt(lP, 1)} SKS. Total dengan dosen ini: teori <b>${fmt(lT + st, 1)}</b> dari ${m.T}, praktik <b>${fmt(lP + sp, 1)}</b> dari ${m.P}.`; } }],
      onSave: async (o) => { if (!['admin', 'developer'].includes(ctx.role) && !gerbangTerbuka(S, m.prodi)) return PESAN_BELUM_TETAP; o.id = o.id || uid('T-' + m.id); o.mk = m.id; o.prodi = m.prodi; o.kelas = +o.kelas || 0; const st = +o.sksT || 0, sp = +o.sksP || 0; if (st > m.T + 1e-9 || sp > m.P + 1e-9) return `SKS yang diampu tidak boleh melebihi SKS MK (teori ${m.T}, praktik ${m.P}).`; if (!st && !sp) return 'Isi SKS teori atau praktik yang diampu dosen ini.'; o.porsiT = m.T ? st / m.T : 0; o.porsiP = m.P ? sp / m.P : 0; o.koordinator = o.peran === 'koordinator'; delete o.peran; delete o.sksT; delete o.sksP; if (!o.kelas) return 'Jumlah kelas wajib diisi.'; if (o.koordinator) for (const q of S.tugas.filter(q => q.mk === m.id && q.id !== o.id && q.koordinator)) await save('tugas', { ...q, koordinator: false }, 'Koordinator MK diganti'); await save('tugas', o, `Tugaskan ${(S.dosen.find(d => d.id === o.dosen) || {}).nama} pada ${m.nama}`); rerender(); },
      onDelete: x.id ? async () => { await remove('tugas', x.id, `Hapus penugasan ${m.nama}`); rerender(); } : null });
  };
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const m = S.mk.find(x => x.id === b.dataset.add); form({ kelas: kelasOf(S, m.prodi, m.smt), porsiT: 1, porsiP: 1, koordinator: !S.tugas.some(q => q.mk === m.id && q.koordinator), dosen: (S.dosen.find(d => d.homebase === m.prodi) || {}).id }, m); });
  el.querySelectorAll('.tag.pick.click').forEach(t => t.onclick = () => { const x = S.tugas.find(y => y.id === t.dataset.tg); form({ ...x }, S.mk.find(m => m.id === x.mk)); });
  void par; void sksOf;
}
