/* KUREKAM · Beranda */
import { S, ctx, icon, esc, bolehMenu } from '../app.js';
import { RUMAH_PERAN, PERAN } from '../config.js';
import { rpsOf } from '../rules.js';
import { periksaRps } from './asisten.js';
import { statusTag, bar } from './ui.js';
import { APP } from '../config.js';
import { chart, AX, grad } from '../charts.js';
import { mountHero } from '../hero3d.js';
import { struktur, progres, grupOf, warnaGrup, sksOf, TAHAP, fmt, cekStruktur, trace } from '../rules.js';
import { kpi, animateCounts, head, pctColor } from './ui.js';

/* Panel kerja sesuai peran: apa yang perlu dikerjakan pengguna ini. */
function panelPeran() {
  const r = ctx.role, c = PERAN[r].c, kepala = (t, s) => `<div class="card-h"><span class="ico-badge" style="--c:${c}">${icon('user')}</span><div><h3>${t}</h3><div class="sub">${s}</div></div></div>`;
  const langkah = (a) => `<ol class="small" style="margin:8px 0 0 18px;line-height:1.7">${a.map(x => `<li>${x}</li>`).join('')}</ol>`;
  if (r === 'dosen') {
    const d = S.dosen.find(x => x.id === ctx.dosen), mk = Array.from(new Set(S.tugas.filter(t => t.dosen === ctx.dosen).map(t => t.mk))).map(id => S.mk.find(m => m.id === id)).filter(m => m && !/magang|tugas akhir/i.test(m.kel)).sort((a, b) => a.smt - b.smt);
    return `<div class="card" style="margin-top:18px">${kepala('Tugas Anda sebagai dosen pengampu', d ? esc(d.nama) + ' · ' + mk.length + ' mata kuliah' : 'Akun belum dipasangkan dengan data dosen')}
      ${mk.length ? `<div class="tbl-wrap" style="margin-top:8px"><table class="tbl"><thead><tr><th>Mata kuliah</th><th>Prodi</th><th>Smt</th><th>SKS</th><th>Status RPS</th><th>Saran asisten</th></tr></thead><tbody>${mk.map(m => { const rp = rpsOf(S, m.id), k = periksaRps(m, rp).filter(x => x.k !== 'ok').length; return `<tr><td><b>${esc(m.nama)}</b></td><td>${m.prodi}</td><td>${m.smt}</td><td>${m.T}T + ${m.P}P</td><td>${statusTag(rp ? rp.status : '')}</td><td>${k ? `<span class="st near">${k} butir</span>` : '<span class="st ok">lengkap</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="empty small">Belum ada mata kuliah yang ditugaskan kepada Anda. Penugasan dibuat Tim Kurikulum Prodi.</p>'}
      ${langkah(['Buka menu <a href="#rps"><b>RPS & SAP</b></a> dan pilih mata kuliah.', 'Unggah RPS lama dari Word supaya tidak mengetik ulang, atau buat draf otomatis dengan Asisten RPS.', 'Buka Asisten RPS, ikuti saran pengisiannya, lalu sunting bagian yang belum sesuai.', 'Ajukan ke kaprodi. RPS yang dikembalikan bisa direvisi lagi.'])}</div>`;
  }
  if (r === 'prodi') {
    const mk = S.mk.filter(m => m.prodi === ctx.prodi), aju = S.rps.filter(x => x.prodi === ctx.prodi && x.status === 'diajukan').length, g = progres(S, ctx.prodi);
    return `<div class="card" style="margin-top:18px">${kepala('Tugas Tim Kurikulum Prodi ' + esc(ctx.prodi), `Kemajuan penyusunan ${g.total}% · ${mk.length} mata kuliah · ${aju} RPS menunggu pengesahan`)}
      <div class="grid g4 mini" style="margin-top:8px">${g.tahap.map(x => `<div><small>${x.n}</small><b>${x.v}%</b>${bar(x.v, x.v >= 85 ? '#10b981' : x.v >= 60 ? '#f5a524' : '#f0616d')}</div>`).join('')}</div>
      ${langkah(['Buka <a href="#asisten"><b>Asisten Kurikulum</b></a> dan kerjakan tujuh langkahnya, dengan mengisi sendiri atau memakai usulan otomatis.', 'Tugaskan dosen pengampu di menu Penugasan dan Beban Dosen.', 'Tinjau dan sahkan RPS yang diajukan dosen di menu RPS & SAP.', 'Periksa di Pemeriksa Kurikulum, lalu ajukan lewat Revisi dan Pengesahan.'])}</div>`;
  }
  const info = { wadir: ['Ruang kerja Wakil Direktur I', `${S.revisi.filter(x => x.status === 'menunggu').length} usulan revisi menunggu putusan · ${S.prodi.filter(p => p.status === 'diajukan').length} kurikulum prodi diajukan`, ['Pantau kemajuan lima prodi di <a href="#pimpinan"><b>Dasbor Pimpinan</b></a>.', 'Putuskan usulan revisi dan sahkan kurikulum di <a href="#revisi"><b>Revisi & Pengesahan</b></a>.', 'Lihat kecukupan dosen di Beban Dosen dan Beban Prodi.']],
    spm: ['Ruang kerja Unit SPM', 'Pemeriksaan kesesuaian terhadap LAM Teknik dan IABEE', ['Lihat kesesuaian tiap prodi di <a href="#mutu"><b>Dasbor Mutu</b></a>.', 'Telusuri temuan di Pemeriksa Kurikulum dan Taksonomi Bloom.', 'Tulis catatan mutu untuk prodi di Revisi & Pengesahan.']],
    akademik: ['Ruang kerja Kasubbag Akademik', 'Data induk, kelas, dosen, dan beban mengajar', ['Mutakhirkan prodi, kelas, dan dosen di <a href="#induk"><b>Data Induk</b></a>.', 'Impor data dosen, pengampu, dan matriks kurikulum dari Excel.', 'Pantau jadwal dan kapasitas di <a href="#akademik"><b>Dasbor Akademik</b></a>.']],
    admin: ['Ruang kerja Admin', 'Semua menu terbuka', ['Daftarkan akun dan perannya di <a href="#induk"><b>Data Induk</b></a>, tab Pengguna & peran.', 'Atur parameter kurikulum dan basis data.', 'Unduh cadangan secara berkala.']] }[r === 'developer' ? 'admin' : r];
  return `<div class="card" style="margin-top:18px">${kepala(info[0], info[1])}${langkah(info[2])}</div>`;
}

export default function beranda(el) {
  const nMk = S.mk.length, nCpl = S.cpl.length, nRps = S.rps.filter(r => r.status === 'disahkan').length;
  const pr = S.prodi.map(p => ({ p, g: progres(S, p.id) }));
  const avg = pr.reduce((a, x) => a + x.g.total, 0) / Math.max(1, pr.length);
  const layers = [];
  for (let s = 1; s <= 8; s++) layers.push({ smt: s, mk: S.mk.filter(m => m.smt === s).map(m => ({ sks: sksOf(m), c: warnaGrup(grupOf(m)) })) });
  const chain = [['Visi', S.prodi.length, '#10b981', 'visi'], ['Profil lulusan', S.pl.length, '#14b8a6', 'visi'], ['CPL', nCpl, '#0ea5e9', 'cpl'], ['BoK', S.bok.length, '#6366f1', 'bk'], ['Bahan kajian', S.bk.length, '#8b5cf6', 'bk'], ['Mata kuliah', nMk, '#a855f7', 'mk'], ['Peta kurikulum', 8, '#f472b6', 'peta'], ['CPMK', S.cpmk.length, '#f0616d', 'cpmk'], ['Sub-CPMK', S.sub.length, '#f97316', 'cpmk'], ['RPS', S.rps.length, '#f5a524', 'rps'], ['SAP', S.rps.filter(r => (r.pertemuan || []).some(p => p.sap && p.sap.inti)).length, '#84cc16', 'rps']];

  el.innerHTML = `
  <section class="hero">
    <canvas class="h3d" id="h3d"></canvas>
    <div class="hcontent">
      <div class="hero-logos"><img src="assets/img/logo-pem-akamigas.png" alt="PEM Akamigas"><i></i><img src="assets/img/logo-esdm.png" alt="ESDM"></div><br>
      <span class="eyebrow">${icon('layers')} Kurikulum ${APP.tahunKurikulum} · OBE · LAM Teknik · IABEE</span>
      <h2>KUREKAM<br><span style="opacity:.85;font-weight:700;font-size:.62em">${APP.panjang}</span></h2>
      <p>Satu tempat untuk merancang kurikulum lima prodi D4, dari visi keilmuan sampai satuan acara perkuliahan. Setiap butir tertelusur ke CPL, diperiksa otomatis terhadap Buku Pedoman, Taksonomi Bloom, LAM Teknik, dan IABEE, lalu dipantau pimpinan secara langsung.</p>
      <div class="hstats">
        <div class="glass"><b data-count="${S.prodi.length}">${S.prodi.length}</b><span class="gl">Program studi D4</span></div>
        <div class="glass"><b data-count="${nMk}">${nMk}</b><span class="gl">Mata kuliah terpetakan</span></div>
        <div class="glass"><b data-count="${nCpl}">${nCpl}</b><span class="gl">Rumusan CPL</span></div>
        <div class="glass"><b data-count="${avg}" data-dec="0">${fmt(avg)}</b><span class="gl">% kemajuan rata-rata</span></div>
      </div>
      <a class="btn pri" href="#${RUMAH_PERAN[ctx.role][0]}">${icon('dash')} ${RUMAH_PERAN[ctx.role][1]}</a><a class="btn ghost" href="#peta">${icon('grid4')} Peta kurikulum</a>
    </div>
    <div class="h3d-space"></div>
  </section>
  ${panelPeran()}
  <div class="card" style="margin-top:18px">${head('Rantai keterlacakan OBE', 'Dari visi sampai SAP. Klik tahap untuk membuka modulnya.', 'link', '#6366f1')}
    <div class="chain">${chain.map(([t, n, c, r], i) => `<a class="cstep" href="#${bolehMenu(r) ? r : 'beranda'}" style="--c:${c}"><span class="orb">${i + 1}</span><b>${t}</b><span class="n">${fmt(n)}</span></a>`).join('<span class="carr"></span>')}</div>
  </div>

  <div class="grid g4" style="margin-top:18px">
    ${kpi('RPS disahkan', nRps, `dari ${S.mk.filter(m => !/magang|tugas akhir/i.test(m.kel)).length} MK akademik`, '#10b981', 'audit')}
    ${kpi('Dosen terdata', S.dosen.length, `${S.tugas.length} penugasan mengajar`, '#f5a524', 'user')}
    ${kpi('Usulan revisi menunggu', S.revisi.filter(r => r.status === 'menunggu').length, 'perlu keputusan Wadir 1', '#8b5cf6', 'loop')}
    ${kpi('Kurikulum disahkan', S.prodi.filter(p => p.status === 'disahkan').length, `${S.prodi.filter(p => p.status === 'diajukan').length} prodi sudah mengajukan`, '#0ea5e9', 'medal')}
  </div>

  <div class="grid g-21" style="margin-top:18px">
    <div class="card">${head('Kemajuan penyusunan per prodi', 'Persentase tiap tahap, dari visi sampai SAP', 'pulse', '#10b981')}<div class="chart lg" id="c-prog"></div></div>
    <div class="card">${head('Status lima prodi', 'Kesesuaian aturan dan keterlacakan', 'check', '#0ea5e9')}
      <div class="plist">${pr.map(({ p, g }) => { const ck = cekStruktur(S, p.id); const ok = ck.filter(c => c.k === 'ok').length; const t = trace(S, p.id); return `<a class="prow" href="#${bolehMenu('periksa') ? 'periksa' : 'peta'}" data-p="${p.id}" style="--c:${p.c}"><span class="pbadge">${p.id}</span><div><b>${esc(p.nama)}</b><div class="small muted">${ok}/${ck.length} aturan sesuai · keterlacakan ${fmt(t.skor)}%</div><div class="bar" style="margin-top:6px"><i style="width:${g.total}%;--c:${pctColor(g.total)}"></i></div></div><span class="pv">${g.total}%</span></a>`; }).join('')}</div>
    </div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Lanskap SKS 3D', 'SKS per prodi dan semester (seret untuk memutar)', 'layers', '#8b5cf6')}<div class="chart lg" id="c-3d"></div></div>
    <div class="card">${head('Komposisi kelompok MK', 'SKS MKU, basic science, basic engineering, dan kompetensi', 'grid4', '#f5a524')}<div class="chart lg" id="c-grp"></div></div>
  </div>

  <div class="card" style="margin-top:18px">${head('Siapa mengerjakan apa', 'Alur peran di KUREKAM', 'user', '#14b8a6')}
    <div class="flow">
      <div class="fbox" style="--c:#10b981"><span class="ico-badge" style="--c:#10b981">${icon('flag')}</span><b>Tim Kurikulum Prodi</b><small>Visi, PL, CPL, BoK, BK, MK, peta, CPMK, penugasan dosen, pengesahan RPS</small></div>
      <div class="fbox"><span class="ico-badge" style="--c:#0ea5e9">${icon('audit')}</span><b>Dosen Pengampu</b><small>Sub-CPMK, RPS 16 pertemuan, SAP per pertemuan</small></div>
      <div class="fbox"><span class="ico-badge" style="--c:#8b5cf6">${icon('medal')}</span><b>Wakil Direktur I</b><small>Pengesahan kurikulum dan keputusan usulan revisi</small></div>
      <div class="fbox"><span class="ico-badge" style="--c:#f0616d">${icon('eye')}</span><b>Unit SPM</b><small>Memantau keterlacakan, Bloom, LAM, IABEE; memberi catatan</small></div>
      <div class="fbox"><span class="ico-badge" style="--c:#f5a524">${icon('calendar')}</span><b>Kasubbag Akademik</b><small>Data induk kelas dan dosen, rekap beban SKS riil dan JP</small></div>
    </div>
  </div>`;

  animateCounts(el);
  mountHero(el.querySelector('#h3d'), layers);

  const prodiIds = S.prodi.map(p => p.id);
  chart(el.querySelector('#c-prog'), {
    tooltip: { trigger: 'axis' }, legend: { top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: TAHAP, ...AX, axisLabel: { ...AX.axisLabel, rotate: 30 } }, yAxis: { type: 'value', max: 100, ...AX },
    series: pr.map(({ p, g }) => ({ name: p.id, type: 'line', smooth: true, symbolSize: 7, data: g.tahap.map(t => t.v), lineStyle: { width: 3, color: p.c }, itemStyle: { color: p.c }, areaStyle: { opacity: 0.06, color: p.c } }))
  });
  const data3 = [];
  S.prodi.forEach((p, i) => { const st = struktur(S, p.id); for (let s = 1; s <= 8; s++) data3.push([s - 1, i, st.smt[s].sks]); });
  if (window.echarts && window.echarts.graphicGL !== undefined || true) {
    chart(el.querySelector('#c-3d'), {
      tooltip: { formatter: (q) => `${prodiIds[q.value[1]]} · Semester ${q.value[0] + 1}: <b>${q.value[2]} SKS</b>` },
      visualMap: { show: false, min: 8, max: 22, inRange: { color: ['#a7f3d0', '#34d399', '#0ea5e9', '#6366f1', '#8b5cf6'] } },
      xAxis3D: { type: 'category', data: [1, 2, 3, 4, 5, 6, 7, 8].map(s => 'S' + s), name: '' }, yAxis3D: { type: 'category', data: prodiIds, name: '' }, zAxis3D: { type: 'value', name: 'SKS' },
      grid3D: { boxWidth: 160, boxDepth: 80, viewControl: { autoRotate: true, autoRotateSpeed: 6, distance: 220, alpha: 22, beta: 30 }, light: { main: { intensity: 1.2, shadow: true }, ambient: { intensity: 0.35 } }, axisLabel: { textStyle: { color: '#6b778c' } }, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: 'rgba(24,35,58,.06)' } } },
      series: [{ type: 'bar3D', data: data3, shading: 'realistic', bevelSize: 0.35, itemStyle: { opacity: 0.95 }, label: { show: false }, emphasis: { label: { show: true, textStyle: { fontSize: 14, color: '#18233a' } } } }]
    });
  }
  chart(el.querySelector('#c-grp'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 },
    grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: prodiIds, ...AX }, yAxis: { type: 'value', ...AX },
    series: ['MKU', 'MBS', 'MBE', 'MKK'].map(g => ({ name: g, type: 'bar', stack: 'a', barWidth: 34, data: S.prodi.map(p => struktur(S, p.id).g[g]), itemStyle: { color: grad(warnaGrup(g), warnaGrup(g) + 'aa'), borderRadius: g === 'MKK' ? [8, 8, 0, 0] : 0 } }))
  });
  el.querySelectorAll('.prow').forEach(a => a.addEventListener('click', () => { ctx.prodi = a.dataset.p; try { localStorage.setItem('kurekam_ctx', JSON.stringify(ctx)); } catch (e) { /* abaikan */ } }));
}
