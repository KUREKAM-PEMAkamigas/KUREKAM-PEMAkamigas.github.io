/* KUREKAM · Dasbor pimpinan (Wadir 1), mutu (SPM), dan akademik (Kasubbag AK) */
import { S, ctx, saveCtx, esc, icon } from '../app.js';
import { chart, AX, grad } from '../charts.js';
import { mountOrbit } from '../hero3d.js';
import { struktur, progres, cekStruktur, cekTrace, trace, bloomAudit, beban, mkTanpaPengampu, param, fmt, TAHAP, kelasOf, jpOf, byProdi } from '../rules.js';
import { head, kpi, animateCounts, statusTag, prodiTag, pctColor, bar, stTag } from './ui.js';
import { umpanSimantap } from './evaluasi.js';

const jump = (el) => el.querySelectorAll('[data-go]').forEach(a => a.onclick = () => { if (a.dataset.p) { ctx.prodi = a.dataset.p; saveCtx(); } location.hash = '#' + a.dataset.go; });
const all = () => S.prodi.map(p => { const ck = cekStruktur(S, p.id).concat(cekTrace(S, p.id)); return { p, R: struktur(S, p.id), g: progres(S, p.id), ck, t: trace(S, p.id), b: bloomAudit(S, p.id), ok: ck.filter(c => c.k === 'ok').length }; });

/* ================= Pimpinan ================= */
export function pimpinan(el) {
  const A = all(), P = param(S);
  const avg = A.reduce((a, x) => a + x.g.total, 0) / A.length, rule = A.reduce((a, x) => a + x.ok, 0) / A.reduce((a, x) => a + x.ck.length, 0) * 100;
  const rpsSah = A.reduce((a, x) => a + x.g.rpsSah, 0), nMk = A.reduce((a, x) => a + x.g.nMk, 0), tunggu = S.revisi.filter(r => r.status === 'menunggu').length + S.prodi.filter(p => p.status === 'diajukan').length;
  const { rows } = beban(S, S.settings.paritas || 'ganjil');
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Kemajuan penyusunan', avg, 'rata-rata lima prodi (%)', '#10b981', 'pulse', 1)}
    ${kpi('Kesesuaian aturan', rule, 'butir pemeriksa yang sesuai (%)', '#0ea5e9', 'check', 1)}
    ${kpi('RPS disahkan', nMk ? rpsSah / nMk * 100 : 0, `${rpsSah} dari ${nMk} MK (%)`, '#f5a524', 'audit', 1)}
    ${kpi('Menunggu keputusan Anda', tunggu, 'pengesahan kurikulum dan usulan revisi', '#8b5cf6', 'loop')}
  </div>
  <div class="grid g5" style="margin-top:18px">${A.map(x => `<div class="status-card tilt" style="--c:${x.p.c};cursor:pointer" data-go="periksa" data-p="${x.p.id}"><div class="lb">${esc(x.p.nama)}</div><div class="big">${x.g.total}<small style="font-size:18px">%</small></div><div class="nm">${x.p.id} · ${x.ok}/${x.ck.length} aturan</div><div class="lb">Keterlacakan ${fmt(x.t.skor)}% · ${x.p.status}</div></div>`).join('')}</div>
  <div class="grid g-21" style="margin-top:18px">
    <div class="card">${head('Peta kemajuan tahap demi tahap', 'Makin hijau makin lengkap. Klik sel untuk membuka prodi tersebut.', 'grid4', '#10b981')}<div class="chart lg" id="c-heat"></div></div>
    <div class="card">${head('Rantai OBE 3D', 'Besar simpul = jumlah butir di tiap tahap', 'layers', '#6366f1')}<div class="stage3d"><canvas class="h3d" id="orb"></canvas></div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Profil kepatuhan prodi', 'Skala 0–100 pada enam dimensi mutu kurikulum', 'target', '#8b5cf6')}<div class="chart lg" id="c-rad"></div></div>
    <div class="card">${head('Keseragaman JP per minggu', 'Setiap prodi berada dalam rentang yang sama tiap semester (full day)', 'pulse', '#0ea5e9')}<div class="chart lg" id="c-jp"></div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Perlu keputusan', 'Pengesahan dan usulan revisi yang menunggu', 'loop', '#6366f1', `<button class="btn sm" data-go="revisi">Buka</button>`)}
      ${S.prodi.filter(p => p.status === 'diajukan').map(p => `<div class="note-card">${prodiTag(p.id)} <b>Kurikulum ${esc(p.nama)}</b> diajukan untuk disahkan</div>`).join('')}
      ${S.revisi.filter(r => r.status === 'menunggu').map(r => `<div class="note-card">${prodiTag(r.prodi)} <b>${esc(r.uraian)}</b><div class="small muted">${esc(r.alasan)}</div></div>`).join('') || ''}
      ${tunggu ? '' : '<div class="empty small">Tidak ada yang menunggu.</div>'}</div>
    <div class="card">${head('Ringkasan beban dosen', `Semester ${S.settings.paritas || 'ganjil'}, JP total hasil konversi SKS ke jam pelajaran`, 'user', '#f5a524', `<button class="btn sm" data-go="beban">Buka</button>`)}
      <div class="grid g3 mini"><div><small>Melebihi ${P.bebanRiilMax} JP total</small><b style="color:#b42335">${rows.filter(r => r.k === 'bad').length}</b></div><div><small>Wajar</small><b style="color:#047857">${rows.filter(r => r.k === 'ok' && r.items.length).length}</b></div><div><small>Di bawah ${P.bebanRiilMin}</small><b style="color:#b45309">${rows.filter(r => r.k === 'near').length}</b></div></div>
      <div class="chart sm" id="c-bb"></div></div>
  </div>`;
  animateCounts(el); jump(el);
  const heat = []; A.forEach((x, i) => x.g.tahap.forEach((t, j) => heat.push([j, i, t.v])));
  const hc = chart(el.querySelector('#c-heat'), { tooltip: { formatter: q => `${A[q.value[1]].p.id} · ${TAHAP[q.value[0]]}: <b>${q.value[2]}%</b>` }, grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: true }, xAxis: { type: 'category', data: TAHAP, ...AX, axisLabel: { ...AX.axisLabel, rotate: 30 }, splitArea: { show: true } }, yAxis: { type: 'category', data: A.map(x => x.p.id), ...AX },
    visualMap: { min: 0, max: 100, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, inRange: { color: ['#fecdd3', '#fde68a', '#a7f3d0', '#10b981'] }, textStyle: { fontSize: 10 } },
    series: [{ type: 'heatmap', data: heat, label: { show: true, fontSize: 11, formatter: q => q.value[2] }, itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 8 } }] });
  if (hc) hc.on('click', q => { ctx.prodi = A[q.value[1]].p.id; saveCtx(); location.hash = '#' + ['visi', 'visi', 'cpl', 'bk', 'mk', 'peta', 'matriks', 'cpmk', 'cpmk', 'rps', 'rps'][q.value[0]]; });
  mountOrbit(el.querySelector('#orb'), [['Visi', S.prodi.length, '#6ee7b7'], ['PL', S.pl.length, '#5eead4'], ['CPL', S.cpl.length, '#7dd3fc'], ['BK', S.bk.length, '#a5b4fc'], ['MK', S.mk.length, '#c4b5fd'], ['CPMK', S.cpmk.length, '#f9a8d4'], ['Sub-CPMK', S.sub.length, '#fdba74'], ['RPS', S.rps.length, '#fcd34d']].map(([t, n, c]) => ({ t, n, c })));
  chart(el.querySelector('#c-rad'), { tooltip: {}, legend: { top: 0 }, radar: { center: ['50%', '56%'], radius: '66%', indicator: ['Struktur SKS', 'Keterlacakan', 'Taksonomi Bloom', 'CPMK & Sub-CPMK', 'RPS', 'SAP'].map(n => ({ name: n, max: 100 })), axisName: { color: '#3b4760', fontSize: 11 }, splitArea: { areaStyle: { color: ['rgba(255,255,255,.6)', 'rgba(24,35,58,.02)'] } } },
    series: [{ type: 'radar', data: A.map(x => ({ name: x.p.id, value: [x.ok / x.ck.length * 100, x.t.skor, Math.max(0, 100 - x.b.issues.length / Math.max(1, x.b.nStmt) * 400), (x.g.tahap[7].v + x.g.tahap[8].v) / 2, x.g.tahap[9].v, x.g.tahap[10].v].map(v => +v.toFixed(0)), lineStyle: { color: x.p.c, width: 2 }, itemStyle: { color: x.p.c }, areaStyle: { color: x.p.c, opacity: 0.08 } })) }] });
  chart(el.querySelector('#c-jp'), { tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: [1, 2, 3, 4, 5, 6].map(s => 'S' + s), ...AX }, yAxis: { type: 'value', min: 20, ...AX },
    series: A.map(x => ({ name: x.p.id, type: 'line', smooth: true, symbolSize: 7, data: [1, 2, 3, 4, 5, 6].map(s => +x.R.smt[s].jp.toFixed(1)), lineStyle: { color: x.p.c, width: 3 }, itemStyle: { color: x.p.c } })) });
  const homes = Array.from(new Set(S.dosen.map(d => d.homebase)));
  chart(el.querySelector('#c-bb'), { tooltip: { trigger: 'axis' }, grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: homes, ...AX }, yAxis: { type: 'value', ...AX },
    series: [{ type: 'bar', barWidth: 26, data: homes.map(h => { const rr = rows.filter(r => r.d.homebase === h && r.items.length); return +(rr.reduce((a, r) => a + r.riil, 0) / Math.max(1, rr.length)).toFixed(1); }), itemStyle: { color: grad('#f5a524', '#fde68a'), borderRadius: [8, 8, 0, 0] }, label: { show: true, position: 'top', fontSize: 10 }, markLine: { symbol: 'none', data: [{ yAxis: P.bebanRiilMax }], lineStyle: { color: '#f0616d', type: 'dashed' } } }] });
}

/* ================= Mutu (SPM) ================= */
export function mutu(el) {
  const A = all(), umpan = umpanSimantap();
  const putus = A.reduce((a, x) => a + x.t.cplNoMk.length + x.t.mkNoCpl.length + x.t.bkNoMk.length + x.t.cplNoBk.length, 0);
  const grp = ['Total', 'Akreditasi', 'Keterlacakan', 'Pembelajaran'].concat([1, 2, 3, 4, 5, 6].map(s => 'Semester ' + s));
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Keterlacakan rata-rata', A.reduce((a, x) => a + x.t.skor, 0) / A.length, 'rantai visi sampai Sub-CPMK (%)', '#10b981', 'link', 1)}
    ${kpi('Rantai yang putus', putus, 'CPL, BK, atau MK tanpa pasangan', putus ? '#f0616d' : '#10b981', 'alert')}
    ${kpi('Temuan Taksonomi Bloom', A.reduce((a, x) => a + x.b.issues.length, 0), 'rumusan yang perlu diperbaiki', '#8b5cf6', 'sim')}
    ${kpi('Butir belum sesuai', A.reduce((a, x) => a + x.ck.filter(c => c.k === 'bad').length, 0), 'dari pemeriksa otomatis lima prodi', '#f5a524', 'audit')}
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Kesesuaian per kelompok aturan', 'Persentase butir sesuai. Klik sel untuk membuka pemeriksa prodi.', 'grid4', '#f0616d')}<div class="chart lg" id="c-h"></div></div>
    <div class="card">${head('Kriteria akreditasi', 'Batas IABEE 2.1.1 dan LAM Teknik butir 18–19', 'medal', '#10b981')}<div class="chart lg" id="c-a"></div></div>
  </div>
  <div class="card" style="margin-top:18px">${head('Kartu mutu kurikulum per prodi', 'Bahan audit mutu internal butir kurikulum', 'eye', '#f0616d')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>Keterlacakan</th><th>CPL tanpa MK</th><th>MK tanpa CPL</th><th>Temuan Bloom</th><th>Progresi level</th><th>RPS disahkan</th><th>Spesifik</th><th>Praktik</th><th>Status</th><th></th></tr></thead><tbody>
    ${A.map(x => `<tr><td>${prodiTag(x.p.id)}</td><td>${bar(x.t.skor, pctColor(x.t.skor), '80px')} <span class="small">${fmt(x.t.skor)}%</span></td><td class="num">${x.t.cplNoMk.length}</td><td class="num">${x.t.mkNoCpl.length}</td><td class="num">${x.b.issues.length}</td><td>${stTag(x.b.naik ? 'ok' : 'bad', x.b.naik ? 'Naik bertahap' : 'Tidak konsisten')}</td><td class="num">${x.g.rpsSah}/${x.g.nMk}</td><td class="num">${fmt(x.R.spesifik, 1)}%</td><td class="num">${fmt(x.R.praktikJam, 1)}%</td><td>${statusTag(x.p.status)}</td><td><button class="btn sm" data-go="periksa" data-p="${x.p.id}">Periksa</button> <button class="btn sm" data-go="bloom" data-p="${x.p.id}">Bloom</button></td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="card" style="margin-top:18px">${head('Umpan indikator ke SIMANTAP', 'Angka ini dibaca SIMANTAP untuk indikator kurikulum (SP2, SKS basic science, RPS, CPL) tanpa entri ulang', 'link', '#6366f1', `<button class="btn sm" data-go="laporan">Unduh JSON</button>`)}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Unit</th>${Object.keys(umpan[0].indikator).map(k => `<th>${k.replace(/_/g, ' ')}</th>`).join('')}</tr></thead><tbody>${umpan.map(u => `<tr><td>${prodiTag(u.unit)}</td>${Object.values(u.indikator).map(v => `<td class="num">${typeof v === 'number' ? fmt(v, v % 1 ? 1 : 0) : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  animateCounts(el); jump(el);
  const heat = []; A.forEach((x, i) => grp.forEach((g, j) => { const c = x.ck.filter(k => k.grp === g); heat.push([j, i, c.length ? Math.round(c.filter(k => k.k === 'ok').length / c.length * 100) : 100]); }));
  const hc = chart(el.querySelector('#c-h'), { tooltip: { formatter: q => `${A[q.value[1]].p.id} · ${grp[q.value[0]]}: <b>${q.value[2]}%</b> sesuai` }, grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: true }, xAxis: { type: 'category', data: grp, ...AX, axisLabel: { ...AX.axisLabel, rotate: 30 } }, yAxis: { type: 'category', data: A.map(x => x.p.id), ...AX },
    visualMap: { min: 40, max: 100, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, inRange: { color: ['#fecdd3', '#fde68a', '#a7f3d0', '#10b981'] }, textStyle: { fontSize: 10 } }, series: [{ type: 'heatmap', data: heat, label: { show: true, fontSize: 11 }, itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 8 } }] });
  if (hc) hc.on('click', q => { ctx.prodi = A[q.value[1]].p.id; saveCtx(); location.hash = '#periksa'; });
  const P = param(S);
  chart(el.querySelector('#c-a'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: A.map(x => x.p.id), ...AX }, yAxis: { type: 'value', max: 100, ...AX },
    series: [{ name: 'Muatan spesifik %', type: 'bar', barWidth: 16, data: A.map(x => +x.R.spesifik.toFixed(1)), itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] }, markLine: { symbol: 'none', data: [{ yAxis: P.muatanSpesifikMin, name: 'min spesifik' }], lineStyle: { color: '#10b981', type: 'dashed' } } },
      { name: 'JP praktik %', type: 'bar', barWidth: 16, data: A.map(x => +x.R.praktikJam.toFixed(1)), itemStyle: { color: '#0ea5e9', borderRadius: [6, 6, 0, 0] }, markLine: { symbol: 'none', data: [{ yAxis: P.praktikMin }, { yAxis: P.praktikMax }], lineStyle: { color: '#0ea5e9', type: 'dashed' } } },
      { name: 'Pendidikan umum %', type: 'bar', barWidth: 16, data: A.map(x => +x.R.umum.toFixed(1)), itemStyle: { color: '#f5a524', borderRadius: [6, 6, 0, 0] }, markLine: { symbol: 'none', data: [{ yAxis: P.pendidikanUmumMax }], lineStyle: { color: '#f5a524', type: 'dashed' } } }] });
}

/* ================= Akademik ================= */
export function akademik(el) {
  const par = S.settings.paritas || 'ganjil', P = param(S);
  const { rows } = beban(S, par); const act = rows.filter(r => r.items.length), kosong = mkTanpaPengampu(S, par);
  const sem = par === 'ganjil' ? [1, 3, 5] : [2, 4, 6];
  const kelasTotal = S.prodi.reduce((a, p) => a + sem.reduce((b, s) => b + kelasOf(S, p.id, s), 0), 0);
  const jamLab = S.mk.filter(m => sem.includes(m.smt)).reduce((a, m) => a + (m.P ? (jpOf(m, P) - m.T * P.menitTeori / 60) * kelasOf(S, m.prodi, m.smt) : 0), 0);
  const jamKls = S.mk.filter(m => sem.includes(m.smt)).reduce((a, m) => a + m.T * P.menitTeori / 60 * kelasOf(S, m.prodi, m.smt), 0);
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Kelas berjalan', kelasTotal, `semester ${par} (${sem.join(', ')})`, '#f5a524', 'grid4')}
    ${kpi('Jam kelas teori per minggu', jamKls, 'seluruh prodi dan kelas paralel', '#0ea5e9', 'book', 0)}
    ${kpi('Jam laboratorium per minggu', jamLab, 'kebutuhan blok lab seluruh prodi', '#10b981', 'bolt', 0)}
    ${kpi('MK tanpa pengampu', kosong.length, `${act.filter(r => r.k === 'bad').length} dosen melebihi batas`, kosong.length ? '#f0616d' : '#10b981', 'alert')}
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Kebutuhan jam per prodi', `Jam tatap muka per minggu × kelas paralel, semester ${par}`, 'calendar', '#f5a524')}<div class="chart lg" id="c-j"></div></div>
    <div class="card">${head('Dosen dengan beban tertinggi', 'JP total = konversi SKS ke jam pelajaran per minggu', 'user', '#f0616d', `<button class="btn sm" data-go="beban">Rekap lengkap</button>`)}<div class="chart lg" id="c-top"></div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Kelas paralel per tingkat', 'Dasar perhitungan beban dosen dan jadwal', 'grid4', '#6366f1', `<button class="btn sm" data-go="induk">Ubah</button>`)}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th class="num">Tingkat 1</th><th class="num">Tingkat 2</th><th class="num">Tingkat 3</th><th class="num">Tingkat 4</th><th class="num">Dosen homebase</th></tr></thead><tbody>${S.prodi.map(p => `<tr><td>${prodiTag(p.id)} ${esc(p.nama)}</td>${[1, 2, 3, 4].map(t => `<td class="num">${p.kelas[t]}</td>`).join('')}<td class="num">${S.dosen.filter(d => d.homebase === p.id).length}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card">${head('MK yang belum punya pengampu', `Semester ${par}`, 'alert', '#f0616d')}
      ${kosong.map(m => `<div class="note-card">${prodiTag(m.prodi)} <b>${esc(m.nama)}</b> <span class="muted small">Semester ${m.smt} · ${m.T}T + ${m.P}P · ${kelasOf(S, m.prodi, m.smt)} kelas</span></div>`).join('') || '<div class="empty small">Semua MK sudah punya pengampu.</div>'}</div>
  </div>`;
  animateCounts(el); jump(el);
  chart(el.querySelector('#c-j'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: S.prodi.map(p => p.id), ...AX }, yAxis: { type: 'value', ...AX },
    series: [['Teori', '#0ea5e9', m => m.T * P.menitTeori / 60], ['Praktik', '#10b981', m => jpOf(m, P) - m.T * P.menitTeori / 60]].map(([n, c, f]) => ({ name: n, type: 'bar', stack: 'a', barWidth: 34, data: S.prodi.map(p => +byProdi(S.mk, p.id).filter(m => sem.includes(m.smt)).reduce((a, m) => a + f(m) * kelasOf(S, p.id, m.smt), 0).toFixed(0)), itemStyle: { color: c, borderRadius: n === 'Praktik' ? [8, 8, 0, 0] : 0 } })) });
  const top = act.slice().sort((a, b) => b.riil - a.riil).slice(0, 12).reverse();
  chart(el.querySelector('#c-top'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 30, top: 30, bottom: 8, containLabel: true }, xAxis: { type: 'value', ...AX }, yAxis: { type: 'category', data: top.map(r => r.d.nama), ...AX },
    series: [{ name: 'JP teori', type: 'bar', stack: 'a', barWidth: 14, data: top.map(r => +r.riilT.toFixed(1)), itemStyle: { color: '#0ea5e9' } }, { name: 'JP praktik', type: 'bar', stack: 'a', data: top.map(r => +r.riilP.toFixed(1)), itemStyle: { color: '#10b981', borderRadius: [0, 6, 6, 0] }, markLine: { symbol: 'none', data: [{ xAxis: P.bebanRiilMax }], lineStyle: { color: '#f0616d', type: 'dashed' } } }] });
}
