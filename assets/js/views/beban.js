/* KUREKAM · Penugasan dan beban dosen (SKS riil mengikuti jam pelajaran nyata) */
import { S, ctx, can, save, remove, rerender, esc, icon, uid, openDrawer, saveSettings } from '../app.js';
import { chart, AX } from '../charts.js';
import { beban, bebanTugas, mkTanpaPengampu, param, fmt, sksOf, kelasOf, durasi, byProdi } from '../rules.js';
import { head, formDrawer, kpi, animateCounts, stTag, prodiTag, short, bar, unduh } from './ui.js';

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
  <div class="ribbon info">${icon('info')} <span><b>Beban realistis.</b> SKS riil = SKS teori + SKS praktik × (durasi praktik ÷ 60), dikalikan jumlah kelas dan porsi dosen. Satu SKS riil setara 60 menit tatap muka per minggu, sehingga beban dosen praktik tercermin sesuai jam pelajaran nyata (MKU/MBS ${P.durasiPraktik.MKU} menit, MBE/MKK ${P.durasiPraktik.MKK} menit per SKS praktik). Batas wajar ${P.bebanRiilMin}–${P.bebanRiilMax} SKS riil per semester dapat diubah di Data Induk.</span></div>
  <div class="grid g5">
    ${kpi('Rata-rata SKS riil', avgR, `SKS kurikulum rata-rata ${fmt(avgN, 1)}`, '#10b981', 'pulse', 1)}
    ${kpi('Dosen melebihi batas', over.length, `di atas ${P.bebanRiilMax} SKS riil`, '#f0616d', 'alert')}
    ${kpi('Dosen di bawah batas', under.length, `di bawah ${P.bebanRiilMin} SKS riil`, '#f5a524', 'arrowDown')}
    ${kpi('MK tanpa pengampu', kosong.length, `semester ${par}`, '#8b5cf6', 'book')}
    ${kpi('Dosen lintas prodi', lintas.length, `mengajar di prodi selain homebase atau di lebih dari satu prodi`, '#14b8a6', 'link')}
  </div>
  <div class="filters" style="margin-top:16px">
    <div class="seg"><button data-p="ganjil" class="${par === 'ganjil' ? 'on' : ''}">Semester ganjil</button><button data-p="genap" class="${par === 'genap' ? 'on' : ''}">Semester genap</button></div>
    <div class="seg"><button data-t="rekap" class="${tabB === 'rekap' ? 'on' : ''}">Rekap beban</button><button data-t="tugas" class="${tabB === 'tugas' ? 'on' : ''}">Penugasan per MK</button></div>
    ${ctx.role !== 'dosen' ? `<select class="inp" id="f-home"><option value="">Semua homebase</option>${homes.map(h => `<option ${h === fHome ? 'selected' : ''}>${h}</option>`).join('')}</select>` : ''}
    <button class="btn sm" id="csv">${icon('download')} Unduh CSV</button>
  </div>
  ${tabB === 'rekap' ? `
  <div class="grid g-21">
    <div class="card">${head('SKS kurikulum dibanding SKS riil', 'Garis putus-putus = batas maksimal. Selisih keduanya adalah jam praktik yang selama ini tidak terlihat.', 'user', '#f5a524')}<div class="chart" style="height:${Math.max(320, view.filter(r => r.items.length).length * 22 + 60)}px" id="c-b"></div></div>
    <div class="grid" style="align-content:start">
      <div class="card">${head('Sebaran beban', 'Jumlah dosen per rentang SKS riil', 'sim', '#0ea5e9')}<div class="chart sm" id="c-h"></div></div>
      <div class="card">${head('Teori dan praktik', 'Jam riil per minggu seluruh dosen', 'bolt', '#10b981')}<div class="chart sm" id="c-tp"></div></div>
    </div>
  </div>
  <div class="card" style="margin-top:18px">${head('Rekap beban dosen', `Semester ${par} ${S.settings.tahunAkademik || ''} · klik baris untuk rincian`, 'user', '#f5a524')}
    <div class="tbl-wrap" style="max-height:600px"><table class="tbl"><thead><tr><th>Dosen</th><th>Homebase</th><th>Mengajar di</th><th class="num">MK</th><th class="num">Kelas</th><th class="num">SKS kurikulum</th><th class="num">Jam teori</th><th class="num">Jam praktik</th><th class="num">SKS riil = JP/mg</th><th>Terhadap batas</th><th>Status</th></tr></thead><tbody>
    ${view.map(r => `<tr class="click" data-d="${r.d.id}"><td><b>${esc(r.d.nama)}</b><div class="small muted">${esc(r.d.bidang || '')}</div></td><td>${r.d.homebase === 'Bersama' ? '<span class="tag">Bersama</span>' : prodiTag(r.d.homebase)}</td><td>${Array.from(r.prodi).map(prodiTag).join(' ') || '<span class="muted small">–</span>'}</td><td class="num">${new Set(r.items.map(i => i.m.id)).size}</td><td class="num">${fmt(r.items.reduce((a, i) => a + i.kls, 0))}</td><td class="num">${fmt(r.nominal, 1)}</td><td class="num">${fmt(r.riilT, 1)}</td><td class="num">${fmt(r.riilP, 1)}</td><td class="num"><b>${fmt(r.riil, 1)}</b></td><td>${bar(r.riil / P.bebanRiilMax * 100, r.k === 'bad' ? '#f0616d' : r.k === 'near' ? '#f5a524' : '#10b981', '110px')}</td><td>${r.items.length ? stTag(r.k, KL[r.k]) : stTag('na', 'Belum ditugaskan')}</td></tr>`).join('')}
    </tbody></table></div></div>` : tugasTab(par, P)}`;

  animateCounts(el);
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => { S.settings.paritas = b.dataset.p; await saveSettings(); rerender(); });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tabB = b.dataset.t; rerender(); });
  const fh = el.querySelector('#f-home'); if (fh) fh.onchange = e => { fHome = e.target.value; rerender(); };
  el.querySelector('#csv').onclick = () => {
    const lines = [['Dosen', 'Homebase', 'SKS kurikulum', 'Jam teori', 'Jam praktik', 'SKS riil (JP per minggu)', 'Status'].join(';')].concat(rows.map(r => [r.d.nama, r.d.homebase, r.nominal.toFixed(2), r.riilT.toFixed(2), r.riilP.toFixed(2), r.riil.toFixed(2), r.items.length ? KL[r.k] : 'Belum ditugaskan'].join(';')));
    unduh(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }), `beban-dosen-${par}.csv`);
  };

  if (tabB === 'rekap') {
    const vv = view.filter(r => r.items.length).slice().reverse();
    chart(el.querySelector('#c-b'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 30, top: 30, bottom: 8, containLabel: true },
      xAxis: { type: 'value', ...AX }, yAxis: { type: 'category', data: vv.map(r => r.d.nama), ...AX, axisLabel: { fontSize: 10, color: '#6b778c' } },
      series: [{ name: 'SKS kurikulum', type: 'bar', barGap: '-100%', barWidth: 12, z: 3, data: vv.map(r => +r.nominal.toFixed(1)), itemStyle: { color: '#0ea5e9', borderRadius: [0, 6, 6, 0] } },
        { name: 'SKS riil', type: 'bar', barWidth: 12, data: vv.map(r => ({ value: +r.riil.toFixed(1), itemStyle: { color: r.k === 'bad' ? 'rgba(240,97,109,.55)' : 'rgba(16,185,129,.45)', borderRadius: [0, 6, 6, 0] } })), markLine: { symbol: 'none', data: [{ xAxis: P.bebanRiilMax }, { xAxis: P.bebanRiilMin }], lineStyle: { color: '#8b5cf6', type: 'dashed' }, label: { fontSize: 10 } } }] });
    const bins = [0, 4, 8, 12, 16, 20, 24, 30, 99], lab = bins.slice(0, -1).map((b, i) => i === bins.length - 2 ? `>${b}` : `${b}–${bins[i + 1]}`);
    chart(el.querySelector('#c-h'), { tooltip: {}, grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: lab, ...AX }, yAxis: { type: 'value', ...AX },
      series: [{ type: 'bar', barWidth: '62%', data: lab.map((_, i) => ({ value: act.filter(r => r.riil >= bins[i] && r.riil < bins[i + 1]).length, itemStyle: { color: bins[i] >= P.bebanRiilMax ? '#f0616d' : bins[i + 1] <= P.bebanRiilMin ? '#f5a524' : '#10b981', borderRadius: [8, 8, 0, 0] } })) }] });
    chart(el.querySelector('#c-tp'), { tooltip: {}, series: [{ type: 'pie', radius: ['48%', '78%'], itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 }, label: { formatter: '{b}\n{d}%', fontSize: 11 }, data: [{ name: 'Teori', value: +act.reduce((a, r) => a + r.riilT, 0).toFixed(1), itemStyle: { color: '#0ea5e9' } }, { name: 'Praktik', value: +act.reduce((a, r) => a + r.riilP, 0).toFixed(1), itemStyle: { color: '#10b981' } }] }] });
    el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => detail(rows.find(r => r.d.id === tr.dataset.d), P, par));
  } else bindTugas(el, par);
}

function detail(r, P, par) {
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('user')}</span><div><h3>${esc(r.d.nama)}</h3><div class="sub">${esc(r.d.jabatan || '')} · ${esc(r.d.bidang || '')} · semester ${par}</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="grid g3 mini"><div><small>SKS kurikulum</small><b>${fmt(r.nominal, 1)}</b></div><div><small>SKS riil (JP/minggu)</small><b>${fmt(r.riil, 1)}</b></div><div><small>Selisih jam praktik</small><b>+${fmt(r.selisih, 1)}</b></div></div>
  <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Mata kuliah</th><th>Prodi</th><th class="num">T+P</th><th class="num">Kelas</th><th class="num">Porsi T/P</th><th class="num">SKS kur.</th><th class="num">SKS riil</th></tr></thead><tbody>
  ${r.items.map(i => `<tr><td><b>${esc(i.m.nama)}</b><div class="small muted">Semester ${i.m.smt} · praktik ${durasi(i.m, P)} menit/SKS</div></td><td>${prodiTag(i.m.prodi)}</td><td class="num">${i.m.T}+${i.m.P}</td><td class="num">${i.kls}</td><td class="num">${fmt(i.pT * 100)}% / ${fmt(i.pP * 100)}%</td><td class="num">${fmt(i.nominal, 1)}</td><td class="num"><b>${fmt(i.riil, 2)}</b></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada penugasan pada semester ini.</td></tr>'}
  </tbody></table></div>
  <div class="formula" style="margin-top:14px">SKS riil = Σ ( T × porsiT × 60/60 + P × porsiP × durasi/60 ) × kelas<br>Batas wajar: <b>${P.bebanRiilMin}–${P.bebanRiilMax}</b> SKS riil per semester · Status: <b>${r.items.length ? KL[r.k] : 'Belum ditugaskan'}</b></div>`, null, true);
}

function tugasTab(par, P) {
  const mk = (ctx.role === 'prodi' ? byProdi(S.mk, ctx.prodi) : S.mk).filter(m => m.smt <= 6 && (m.smt % 2 === 1) === (par === 'ganjil')).filter(m => !fHome || fHome === 'Bersama' || m.prodi === fHome).sort((a, b) => a.prodi.localeCompare(b.prodi) || a.smt - b.smt);
  return `<div class="card">${head('Penugasan dosen per mata kuliah', 'Kaprodi menugaskan pengampu; porsi dipakai untuk team teaching atau kelas praktik yang dibagi', 'book', '#14b8a6')}
  <div class="tbl-wrap" style="max-height:640px"><table class="tbl"><thead><tr><th>Prodi</th><th>Smt</th><th>Mata kuliah</th><th class="num">T+P</th><th class="num">Kelas</th><th>Pengampu (kelas · porsi T/P)</th><th class="num">Tertutup</th><th></th></tr></thead><tbody>
  ${mk.map(m => { const ts = S.tugas.filter(t => t.mk === m.id); const kls = kelasOf(S, m.prodi, m.smt); const cT = m.T ? ts.reduce((a, t) => a + (+t.kelas || 0) * (t.porsiT == null ? 1 : +t.porsiT), 0) / Math.max(1, kls) : 1; const cP = m.P ? ts.reduce((a, t) => a + (+t.kelas || 0) * (t.porsiP == null ? 1 : +t.porsiP), 0) / Math.max(1, kls) : 1; const cov = Math.min(cT, cP) * 100;
    return `<tr><td>${prodiTag(m.prodi)}</td><td class="num">${m.smt}</td><td><b>${esc(short(m.nama, 46))}</b></td><td class="num">${m.T}+${m.P}</td><td class="num">${kls}</td><td>${ts.map(t => `<span class="tag pick ${can('susun', m) ? 'click' : ''}" data-tg="${t.id}" style="--c:#0ea5e9">${esc((S.dosen.find(d => d.id === t.dosen) || {}).nama || '?')} · ${t.kelas} kls · ${fmt((t.porsiT == null ? 1 : t.porsiT) * 100)}/${fmt((t.porsiP == null ? 1 : t.porsiP) * 100)}</span>`).join(' ') || '<span class="st bad">Belum ada pengampu</span>'}</td><td class="num"><span class="st ${cov >= 99.5 && cov <= 100.5 ? 'ok' : cov > 100.5 ? 'near' : 'bad'}">${fmt(cov)}%</span></td><td>${can('susun', m) ? `<button class="btn sm" data-add="${m.id}">${icon('plus')}</button>` : ''}</td></tr>`; }).join('')}
  </tbody></table></div><p class="note">Kolom "Tertutup" menunjukkan apakah seluruh kelas dan seluruh porsi teori serta praktik sudah punya pengampu (target 100%).</p></div>`;
}
function bindTugas(el, par) {
  const form = (x, m) => {
    const P = param(S);
    formDrawer({ title: x.id ? 'Ubah penugasan' : 'Tugaskan dosen', sub: `${m.nama} · ${m.T}T + ${m.P}P · ${kelasOf(S, m.prodi, m.smt)} kelas`, obj: x,
      fields: [{ k: 'dosen', label: 'Dosen', type: 'select', opts: S.dosen.filter(d => d.homebase === m.prodi || (d.prodiAjar || []).includes(m.prodi) || d.homebase === 'Bersama').concat(S.dosen.filter(d => d.homebase !== m.prodi && d.homebase !== 'Bersama' && !(d.prodiAjar || []).includes(m.prodi))).map(d => ({ v: d.id, t: `${d.nama} · ${d.homebase === m.prodi ? 'homebase ' + m.prodi : d.homebase === 'Bersama' ? 'Bersama' : (d.prodiAjar || []).includes(m.prodi) ? 'homebase ' + d.homebase + ', juga mengajar di ' + m.prodi : 'lintas prodi, homebase ' + d.homebase}` })) },
        { k: 'kelas', label: 'Jumlah kelas diampu', type: 'number' }, { k: 'porsiT', label: 'Porsi teori (0–1)', type: 'number', step: '0.05' }, { k: 'porsiP', label: 'Porsi praktik (0–1)', type: 'number', step: '0.05', live: () => { const d = document.querySelector('#fd'); if (!d) return ''; const t = { mk: m.id, kelas: d.querySelector('[name=kelas]').value, porsiT: d.querySelector('[name=porsiT]').value, porsiP: d.querySelector('[name=porsiP]').value }; const b = bebanTugas(S, t, P); return b ? `Beban penugasan ini: SKS kurikulum <b>${fmt(b.nominal, 2)}</b>, SKS riil <b>${fmt(b.riil, 2)}</b> (JP/minggu)` : ''; } }],
      onSave: async (o) => { o.id = o.id || uid('T-' + m.id); o.mk = m.id; o.prodi = m.prodi; o.kelas = +o.kelas || 0; o.porsiT = o.porsiT == null ? 1 : +o.porsiT; o.porsiP = o.porsiP == null ? 1 : +o.porsiP; if (!o.kelas) return 'Jumlah kelas wajib diisi.'; await save('tugas', o, `Tugaskan ${(S.dosen.find(d => d.id === o.dosen) || {}).nama} pada ${m.nama}`); rerender(); },
      onDelete: x.id ? async () => { await remove('tugas', x.id, `Hapus penugasan ${m.nama}`); rerender(); } : null });
  };
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const m = S.mk.find(x => x.id === b.dataset.add); form({ kelas: kelasOf(S, m.prodi, m.smt), porsiT: 1, porsiP: 1, dosen: (S.dosen.find(d => d.homebase === m.prodi) || {}).id }, m); });
  el.querySelectorAll('.tag.pick.click').forEach(t => t.onclick = () => { const x = S.tugas.find(y => y.id === t.dataset.tg); form({ ...x }, S.mk.find(m => m.id === x.mk)); });
  void par; void sksOf;
}
