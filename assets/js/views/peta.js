/* KUREKAM · Peta kurikulum dan matriks keterlacakan */
import { S, ctx, can, save, rerender, esc, icon, toast } from '../app.js';
import { GRUP } from '../config.js';
import { chart, AX, PAL } from '../charts.js';
import { byProdi, struktur, param, jpOf, sksOf, grupOf, warnaGrup, fmt, jpRange, trace } from '../rules.js';
import { head, ro, prodiName, short } from './ui.js';

export function petaView(el) {
  const P = param(S), R = struktur(S, ctx.prodi), mk = byProdi(S.mk, ctx.prodi), ed = can('susun');
  const cell = (s) => {
    const k = P.kerangka[s], x = R.smt[s], jr = jpRange(P, s);
    const ok = x.sks === k[0] && (k[1] == null || (x.T >= k[1] && x.T <= k[2] && x.P >= k[3] && x.P <= k[4]));
    return `<div class="pcol" data-smt="${s}"><div class="pcol-h ${ok ? 'ok' : 'bad'}"><b>Semester ${s}</b><span>${x.sks}/${k[0]} SKS</span><small>T ${x.T}${k[1] != null ? ` (${k[1]}–${k[2]})` : ''} · P ${x.P}${k[3] != null ? ` (${k[3]}–${k[4]})` : ''}</small><small>${x.n} MK · ${fmt(x.jp, 1)} JP/mg${jr ? ` (${fmt(jr[0], 0)}–${fmt(jr[1], 0)})` : ''}</small></div>
      <div class="pcol-b">${x.mk.sort((a, b) => (b.kunci ? 1 : 0) - (a.kunci ? 1 : 0)).map(m => `<div class="mkc ${m.kunci ? 'lock' : ''}" draggable="${ed && !m.kunci}" data-id="${m.id}" style="--c:${warnaGrup(grupOf(m))}" title="${esc(m.nama)} · ${esc(m.kel)}"><b>${esc(short(m.nama, 44))}</b><span>${m.T}T + ${m.P}P · ${fmt(jpOf(m, P), 1)} JP${m.kunci ? ' · kunci' : ''}</span></div>`).join('')}</div></div>`;
  };
  el.innerHTML = `
  <div class="card">${head('Peta kurikulum ' + ctx.prodi, prodiName() + (ed ? ' · seret kartu MK ruang prodi untuk memindah semester' : ''), 'grid4', '#6366f1', `<div class="legend">${Object.entries(GRUP).map(([g, v]) => `<span><i class="dot" style="--c:${v.c}"></i>${g}</span>`).join('')}</div>${ed ? '' : ro()}`)}
    <div class="peta">${[1, 2, 3, 4, 5, 6, 7, 8].map(cell).join('')}</div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Teori, praktik, dan JP per semester', 'Porsi praktik naik bertahap; JP menjaga mahasiswa full day di kampus', 'pulse', '#10b981')}<div class="chart lg" id="c-tp"></div></div>
    <div class="card">${head('Alur prasyarat', 'Garis menghubungkan MK prasyarat ke MK lanjutannya', 'link', '#f472b6')}<div class="chart lg" id="c-pre"></div></div>
  </div>
  <div class="card" style="margin-top:18px">${head('Jaringan CPL → bahan kajian → mata kuliah', 'Lebar pita = SKS. Arahkan kursor untuk menelusuri dukungan suatu CPL.', 'layers', '#8b5cf6')}<div class="chart" style="height:560px" id="c-san"></div></div>`;

  const sm = [1, 2, 3, 4, 5, 6, 7, 8];
  chart(el.querySelector('#c-tp'), { tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: sm.map(s => 'S' + s), ...AX }, yAxis: [{ type: 'value', name: 'SKS', ...AX }, { type: 'value', name: 'JP/mg', ...AX, splitLine: { show: false } }],
    series: [{ name: 'Teori', type: 'bar', stack: 'a', barWidth: 26, data: sm.map(s => R.smt[s].T), itemStyle: { color: '#0ea5e9' } }, { name: 'Praktik', type: 'bar', stack: 'a', data: sm.map(s => R.smt[s].P), itemStyle: { color: '#10b981', borderRadius: [8, 8, 0, 0] } },
      { name: 'JP per minggu', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 8, data: sm.map(s => +R.smt[s].jp.toFixed(1)), lineStyle: { width: 3, color: '#8b5cf6' }, itemStyle: { color: '#8b5cf6' } }] });

  const withPre = mk.filter(m => (m.prasyarat || []).length || mk.some(x => (x.prasyarat || []).includes(m.id)));
  const cnt = {};
  chart(el.querySelector('#c-pre'), { tooltip: {}, series: [{ type: 'graph', layout: 'none', roam: true, label: { show: true, fontSize: 9, position: 'right', formatter: (q) => short(q.name, 22) }, edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 7, lineStyle: { color: '#94a3b8', curveness: 0.15, width: 1.4 },
    data: withPre.map(m => { cnt[m.smt] = (cnt[m.smt] || 0) + 1; return { id: m.id, name: m.nama, x: m.smt * 150, y: cnt[m.smt] * 46, symbolSize: 10 + sksOf(m) * 2.5, itemStyle: { color: warnaGrup(grupOf(m)) } }; }),
    links: withPre.flatMap(m => (m.prasyarat || []).map(p => ({ source: p, target: m.id }))) }] });

  const cpl = byProdi(S.cpl, ctx.prodi), bk = byProdi(S.bk, ctx.prodi);
  const nodes = [], links = [], seen = new Set();
  const add = (name, c, depth) => { if (!seen.has(name)) { seen.add(name); nodes.push({ name, depth, itemStyle: { color: c } }); } };
  cpl.forEach((c, i) => add(c.kode, PAL[i % PAL.length], 0));
  bk.forEach(b => { add(b.kode + ' ' + short(b.nama, 26), '#8b5cf6', 1); (b.cpl || []).forEach(id => { const c = cpl.find(x => x.id === id); if (!c) return; const v = mk.filter(m => (m.bk || []).includes(b.id) && (m.cpl || []).includes(id)).reduce((a, m) => a + sksOf(m), 0); if (v > 0) links.push({ source: c.kode, target: b.kode + ' ' + short(b.nama, 26), value: v }); }); });
  const smtName = (s) => 'MK semester ' + s;
  sm.forEach(s => add(smtName(s), '#10b981', 2));
  bk.forEach(b => sm.forEach(s => { const v = mk.filter(m => m.smt === s && (m.bk || []).includes(b.id)).reduce((a, m) => a + sksOf(m), 0); if (v > 0) links.push({ source: b.kode + ' ' + short(b.nama, 26), target: smtName(s), value: v }); }));
  const used = new Set(links.flatMap(l => [l.source, l.target]));
  chart(el.querySelector('#c-san'), { tooltip: { trigger: 'item' }, series: [{ type: 'sankey', data: nodes.filter(n => used.has(n.name)), links, nodeWidth: 14, nodeGap: 9, left: 8, right: 130, top: 8, bottom: 8, emphasis: { focus: 'adjacency' }, lineStyle: { color: 'gradient', opacity: 0.32, curveness: 0.5 }, label: { fontSize: 11, color: '#3b4760' } }] });

  if (ed) {
    let drag = null;
    el.querySelectorAll('.mkc[draggable=true]').forEach(c => { c.addEventListener('dragstart', e => { drag = c.dataset.id; e.dataTransfer.setData('text/plain', drag); c.classList.add('drag'); }); c.addEventListener('dragend', () => c.classList.remove('drag')); });
    el.querySelectorAll('.pcol').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', async e => { e.preventDefault(); const s = +col.dataset.smt; const m = S.mk.find(x => x.id === drag); if (!m || m.smt === s) return; if (s > 6) { toast('Semester 7 dan 8 hanya berisi magang, capstone, dan tugas akhir.'); return; } const from = m.smt; m.smt = s; await save('mk', m, `Pindah MK ${m.nama} dari semester ${from} ke ${s} (${ctx.prodi})`); rerender(); });
    });
  }
}

/* ================= Matriks ================= */
const TABS = [['plcpl', 'PL × CPL'], ['cplbk', 'CPL × BK'], ['bkmk', 'BK × MK'], ['cplmk', 'CPL × MK'], ['cplcpmk', 'CPL × CPMK per MK']];
let tab = 'cplmk';
export function matriksView(el) {
  const ed = can('susun'), t = trace(S, ctx.prodi);
  const pl = t.pl, cpl = t.cpl, bk = t.bk, mk = t.mk.slice().sort((a, b) => a.smt - b.smt);
  const M = {
    plcpl: { rows: cpl, cols: pl, has: (r, c) => (r.pl || []).includes(c.id), tog: (r, c) => ['cpl', r, 'pl', c.id], rl: r => `${r.kode}`, rt: r => r.teks, ct: c => c.nama },
    cplbk: { rows: bk, cols: cpl, has: (r, c) => (r.cpl || []).includes(c.id), tog: (r, c) => ['bk', r, 'cpl', c.id], rl: r => `${r.kode} ${short(r.nama, 34)}`, rt: r => r.nama, ct: c => c.teks },
    bkmk: { rows: mk, cols: bk, has: (r, c) => (r.bk || []).includes(c.id), tog: (r, c) => ['mk', r, 'bk', c.id], rl: r => `S${r.smt} · ${short(r.nama, 34)}`, rt: r => r.nama, ct: c => c.nama },
    cplmk: { rows: mk, cols: cpl, has: (r, c) => (r.cpl || []).includes(c.id), tog: (r, c) => ['mk', r, 'cpl', c.id], rl: r => `S${r.smt} · ${short(r.nama, 34)}`, rt: r => r.nama, ct: c => c.teks }
  };
  const warn = [[t.cplNoMk, 'CPL tanpa MK'], [t.cplNoBk, 'CPL tanpa BK'], [t.bkNoMk, 'BK belum dipakai MK'], [t.mkNoCpl, 'MK tanpa CPL'], [t.plNoCpl, 'PL tanpa CPL']].filter(x => x[0].length);
  let body;
  if (tab === 'cplcpmk') {
    const cp = t.cpmk;
    body = `<div class="tbl-wrap" style="max-height:640px"><table class="tbl mx"><thead><tr><th>Mata kuliah</th><th>CPMK</th>${cpl.map(c => `<th class="mxh" title="${esc(c.teks)}">${c.kode}</th>`).join('')}</tr></thead><tbody>
      ${mk.filter(m => cp.some(c => c.mk === m.id)).map(m => cp.filter(c => c.mk === m.id).map((c, i, a) => `<tr>${i === 0 ? `<td rowspan="${a.length}"><b>S${m.smt} · ${esc(short(m.nama, 34))}</b></td>` : ''}<td class="small" title="${esc(c.teks)}">${c.kode}</td>${cpl.map(x => { const on = (c.cpl || []).includes(x.id), allow = (m.cpl || []).includes(x.id); return `<td class="mxc ${on ? (allow ? 'on' : 'err') : (allow ? 'pot' : '')}">${on ? '●' : ''}</td>`; }).join('')}</tr>`).join('')).join('')}
      </tbody></table></div><p class="note">Titik hijau: CPMK mendukung CPL yang dibebankan pada MK. Kotak abu-abu: CPL dibebankan pada MK tetapi belum punya CPMK. Merah: CPMK menunjuk CPL di luar yang dibebankan.</p>`;
  } else {
    const m = M[tab];
    const colSum = m.cols.map(c => m.rows.filter(r => m.has(r, c)).length);
    body = `<div class="tbl-wrap" style="max-height:640px"><table class="tbl mx"><thead><tr><th>${tab === 'plcpl' ? 'CPL' : tab === 'cplbk' ? 'Bahan kajian' : 'Mata kuliah'}</th>${m.cols.map(c => `<th class="mxh" title="${esc(m.ct(c))}">${c.kode}</th>`).join('')}<th class="num">Σ</th></tr></thead><tbody>
      ${m.rows.map((r, ri) => { const n = m.cols.filter(c => m.has(r, c)).length; return `<tr><td title="${esc(m.rt(r))}" class="${n ? '' : 'mxwarn'}">${esc(m.rl(r))}</td>${m.cols.map((c, ci) => `<td class="mxc ${m.has(r, c) ? 'on' : ''} ${ed ? 'ed' : ''}" data-r="${ri}" data-c="${ci}">${m.has(r, c) ? '●' : ''}</td>`).join('')}<td class="num"><b>${n}</b></td></tr>`; }).join('')}
      <tr class="sum"><td>Jumlah</td>${colSum.map(v => `<td class="num" style="text-align:center;color:${v ? 'inherit' : '#b42335'}">${v}</td>`).join('')}<td></td></tr></tbody></table></div>`;
  }
  el.innerHTML = `
  <div class="card">${head('Matriks keterlacakan ' + ctx.prodi, prodiName() + (ed && tab !== 'cplcpmk' ? ' · klik sel untuk menambah atau menghapus hubungan' : ''), 'link', '#f472b6', `<span class="st ${t.skor >= 99 ? 'ok' : t.skor >= 70 ? 'near' : 'bad'}">Keterlacakan ${fmt(t.skor)}%</span>`)}
    <div class="filters"><div class="seg scroll">${TABS.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${warn.map(([a, n]) => `<span class="st bad">${n}: ${a.length}</span>`).join('') || '<span class="st ok">Tidak ada rantai yang putus</span>'}</div>
    ${body}
  </div>
  <div class="card" style="margin-top:18px">${head('Kekuatan dukungan CPL', 'Jumlah MK dan SKS yang mendukung tiap CPL', 'pulse', '#0ea5e9')}<div class="chart" id="c-cpl"></div></div>`;
  el.querySelectorAll('.seg button').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  if (ed && tab !== 'cplcpmk') {
    const m = M[tab];
    el.querySelectorAll('.mxc.ed').forEach(td => td.onclick = async () => {
      const r = m.rows[+td.dataset.r], c = m.cols[+td.dataset.c]; const [col, doc, key, id] = m.tog(r, c);
      const arr = new Set(doc[key] || []); arr.has(id) ? arr.delete(id) : arr.add(id); doc[key] = Array.from(arr);
      await save(col, doc); td.classList.toggle('on'); td.textContent = td.classList.contains('on') ? '●' : '';
    });
  }
  chart(el.querySelector('#c-cpl'), { tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: cpl.map(c => c.kode), ...AX }, yAxis: [{ type: 'value', name: 'MK', ...AX }, { type: 'value', name: 'SKS', ...AX, splitLine: { show: false } }],
    series: [{ name: 'Jumlah MK', type: 'bar', barWidth: 22, data: cpl.map(c => mk.filter(m => (m.cpl || []).includes(c.id)).length), itemStyle: { color: '#0ea5e9', borderRadius: [8, 8, 0, 0] } }, { name: 'SKS', type: 'line', yAxisIndex: 1, smooth: true, data: cpl.map(c => mk.filter(m => (m.cpl || []).includes(c.id)).reduce((a, m) => a + sksOf(m), 0)), lineStyle: { width: 3, color: '#f5a524' }, itemStyle: { color: '#f5a524' } }] });
}
