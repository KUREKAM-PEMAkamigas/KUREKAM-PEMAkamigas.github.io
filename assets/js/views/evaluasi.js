/* KUREKAM · Evaluasi dan kawal mutu: pemeriksa, Taksonomi Bloom, revisi dan pengesahan, laporan */
import { S, ctx, can, save, rerender, esc, icon, uid, toast } from '../app.js';
import { APP, ACUAN } from '../config.js';
import { chart, AX, gaugeOption } from '../charts.js';
import { mountPyramid } from '../hero3d.js';
import { LEVELS, KKO, DOMAIN, badge } from '../bloom.js';
import { cekStruktur, cekTrace, bloomAudit, struktur, progres, param, fmt, byProdi, sksOf, jpOf, trace } from '../rules.js';
import { head, formDrawer, kTag, statusTag, prodiTag, prodiName, kpi, animateCounts, short, tanya, unduh } from './ui.js';

/* ================= Pemeriksa kurikulum ================= */
export function periksaView(el) {
  const ck = cekStruktur(S, ctx.prodi).concat(cekTrace(S, ctx.prodi));
  const n = { ok: ck.filter(c => c.k === 'ok').length, near: ck.filter(c => c.k === 'near').length, bad: ck.filter(c => c.k === 'bad').length };
  const grp = Array.from(new Set(ck.map(c => c.grp)));
  let only = false;
  el.innerHTML = `
  <div class="grid g-12">
    <div class="card">${head('Kesesuaian ' + ctx.prodi, prodiName(), 'check', '#10b981')}<div class="chart" id="c-g"></div>
      <div class="legend" style="justify-content:center"><span><i class="dot" style="--c:#10b981"></i>${n.ok} sesuai</span><span><i class="dot" style="--c:#f5a524"></i>${n.near} perlu perhatian</span><span><i class="dot" style="--c:#f0616d"></i>${n.bad} belum sesuai</span></div></div>
    <div class="card">${head('Kesesuaian per kelompok aturan', 'Buku Pedoman, Permendiktisaintek 39/2025, LAM Teknik, IABEE, dan keterlacakan OBE', 'layers', '#0ea5e9')}<div class="chart" id="c-k"></div></div>
  </div>
  <div class="card" style="margin-top:18px">${head('Daftar periksa otomatis', 'Diperbarui setiap kali data kurikulum berubah', 'audit', '#f0616d', `<label class="small"><input type="checkbox" id="only"> Hanya yang belum sesuai</label>`)}
    <div class="tbl-wrap"><table class="tbl" id="t"></table></div></div>`;
  const draw = () => { el.querySelector('#t').innerHTML = `<thead><tr><th>Kelompok</th><th>Butir yang diperiksa</th><th>Hasil</th><th>Ketentuan</th><th>Acuan</th><th>Status</th></tr></thead><tbody>${ck.filter(c => !only || c.k !== 'ok').map(c => `<tr><td class="small muted">${c.grp}</td><td><b>${c.label}</b></td><td>${esc(c.val)}</td><td>${esc(c.target)}</td><td class="small muted">${c.acuan}</td><td>${kTag(c.k)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Semua butir sudah sesuai.</td></tr>'}</tbody>`; };
  draw(); el.querySelector('#only').onchange = e => { only = e.target.checked; draw(); };
  chart(el.querySelector('#c-g'), gaugeOption(n.ok / ck.length * 100, 100, '% butir sesuai', n.bad ? '#f5a524' : '#10b981', 0));
  chart(el.querySelector('#c-k'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0 }, grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'value', ...AX }, yAxis: { type: 'category', data: grp, inverse: true, ...AX },
    series: [['ok', 'Sesuai', '#10b981'], ['near', 'Perlu perhatian', '#f5a524'], ['bad', 'Belum sesuai', '#f0616d']].map(([k, nm, c]) => ({ name: nm, type: 'bar', stack: 'a', barWidth: 14, data: grp.map(g => ck.filter(x => x.grp === g && x.k === k).length), itemStyle: { color: c } })) });
}

/* ================= Taksonomi Bloom ================= */
export function bloomView(el) {
  const A = bloomAudit(S, ctx.prodi);
  const cnt = {}; Object.values(A.cpmkLv).forEach(b => { if (b) cnt[b.code] = (cnt[b.code] || 0) + 1; });
  const col = Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.c]));
  const sm = [1, 2, 3, 4, 5, 6, 8];
  const hots = ['C4', 'C5', 'C6'].reduce((a, k) => a + (cnt[k] || 0), 0), allC = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].reduce((a, k) => a + (cnt[k] || 0), 0);
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Rumusan diperiksa', A.nStmt, 'CPL, CPMK, dan Sub-CPMK', '#8b5cf6', 'sim')}
    ${kpi('Temuan Bloom', A.issues.length, `${A.issues.filter(i => i.k === 'bad').length} KKO tidak dikenali`, A.issues.length ? '#f5a524' : '#10b981', 'alert')}
    ${kpi('CPMK berpikir tingkat tinggi', allC ? hots / allC * 100 : 0, 'C4–C6 dari seluruh CPMK kognitif', '#10b981', 'arrowUp', 1)}
    <div class="card kpi tilt" style="--c:${A.naik ? '#10b981' : '#f0616d'}"><div class="lbl">Progresi antarsemester</div><div class="val" style="font-size:22px">${A.naik ? 'Naik bertahap' : 'Tidak konsisten'}</div><div class="meta">rata-rata level kognitif semester 1 ke 6</div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${head('Piramida Taksonomi Bloom', 'Jumlah CPMK per level kognitif (seret untuk memutar)', 'layers', '#8b5cf6')}<div class="stage3d light"><canvas class="h3d" id="pyr"></canvas></div></div>
    <div class="card">${head('Level CPMK per semester', 'Semester awal C1–C3, semester akhir C4–C6 dan psikomotor P3–P5', 'pulse', '#0ea5e9')}<div class="chart lg" id="c-d"></div></div>
  </div>
  <div class="card" style="margin-top:18px">${head('Temuan dan saran perbaikan', 'Acuan: Anderson & Krathwohl (2001) untuk kognitif, Dave (1970) untuk psikomotor, Krathwohl (1964) untuk afektif', 'alert', '#f5a524')}
    <div class="tbl-wrap" style="max-height:420px"><table class="tbl"><thead><tr><th>Objek</th><th>Rumusan</th><th>Level</th><th>Temuan</th></tr></thead><tbody>
    ${A.issues.map(i => `<tr><td><span class="tag" style="--c:#8b5cf6">${i.obj}</span> <b>${i.kode}</b></td><td>${esc(short(i.teks, 130))}</td><td>${i.b ? badge(i.b.code) : badge(null)}</td><td><span class="st ${i.k}">${esc(i.msg)}</span></td></tr>`).join('') || '<tr><td colspan="4" class="empty">Tidak ada temuan. Semua rumusan memakai KKO yang terukur dan berjenjang.</td></tr>'}
    </tbody></table></div></div>
  <div class="card" style="margin-top:18px">${head('Daftar kata kerja operasional', 'Dipakai aplikasi untuk mendeteksi level saat CPL, CPMK, dan Sub-CPMK ditulis', 'book', '#14b8a6')}
    <div class="kko">${Object.entries(DOMAIN).map(([d, nm]) => `<div><h4>${nm}</h4>${Object.entries(LEVELS).filter(([, v]) => v.d === d).map(([k, v]) => `<div class="kko-r"><span class="tag bloom" style="--c:${v.c}">${k} ${v.nama}</span><span class="small">${KKO[k].join(', ')}</span></div>`).join('')}</div>`).join('')}</div></div>`;
  animateCounts(el);
  mountPyramid(el.querySelector('#pyr'), cnt, col);
  const codes = Object.keys(LEVELS).filter(k => sm.some(s => A.dist[s][k]));
  chart(el.querySelector('#c-d'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { top: 0, textStyle: { fontSize: 10 } }, grid: { left: 8, right: 8, top: 44, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: sm.map(s => 'S' + s), ...AX }, yAxis: [{ type: 'value', ...AX }, { type: 'value', min: 1, max: 6, name: 'rata-rata C', ...AX, splitLine: { show: false } }],
    series: codes.map(k => ({ name: k, type: 'bar', stack: 'a', barWidth: 30, data: sm.map(s => A.dist[s][k] || 0), itemStyle: { color: LEVELS[k].c } })).concat([{ name: 'Rata-rata level kognitif', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 8, data: sm.map(s => A.avg[s] == null ? null : +A.avg[s].toFixed(2)), lineStyle: { width: 3, color: '#18233a' }, itemStyle: { color: '#18233a' } }]) });
}

/* ================= Revisi & pengesahan ================= */
export function revisiView(el) {
  const list = S.revisi.slice().sort((a, b) => (b.tgl || '').localeCompare(a.tgl || ''));
  el.innerHTML = `
  <div class="card">${head('Pengesahan kurikulum program studi', 'Prodi mengajukan setelah pemeriksa bersih; Wadir 1 mengesahkan', 'medal', '#8b5cf6')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>Kemajuan</th><th>Aturan sesuai</th><th>Keterlacakan</th><th>Status</th><th></th></tr></thead><tbody>
    ${S.prodi.map(p => { const g = progres(S, p.id), ck = cekStruktur(S, p.id), t = trace(S, p.id); const ok = ck.filter(c => c.k === 'ok').length;
      return `<tr><td>${prodiTag(p.id)} <b>${esc(p.nama)}</b></td><td>${g.total}%</td><td>${ok}/${ck.length}</td><td>${fmt(t.skor)}%</td><td>${statusTag(p.status)}${p.sahTgl ? `<div class="small muted">${esc(p.sahTgl)}</div>` : ''}</td><td>
        ${ctx.role === 'prodi' && ctx.prodi === p.id && p.status === 'draf' ? `<button class="btn vio sm" data-aju="${p.id}">${icon('upload')} Ajukan</button>` : ''}
        ${can('sahkanKurikulum') && p.status === 'diajukan' ? `<button class="btn pri sm" data-sah="${p.id}">${icon('check')} Sahkan</button> <button class="btn sm danger" data-kem="${p.id}">Kembalikan</button>` : ''}
        ${can('sahkanKurikulum') && p.status === 'disahkan' ? `<button class="btn sm" data-kem="${p.id}">Buka kembali</button>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div></div>
  <div class="card" style="margin-top:18px">${head('Usulan revisi kurikulum', 'Rekaman peninjauan kurikulum untuk LAM Teknik butir 12 dan IABEE', 'loop', '#6366f1', ctx.role === 'prodi' || ['admin', 'developer'].includes(ctx.role) ? `<button class="btn pri sm" id="add">${icon('plus')} Usulan revisi</button>` : '')}
    <div class="trail">${list.map(r => `<div class="tstep"><div class="orbsm" style="--c:${r.status === 'disetujui' ? '#10b981' : r.status === 'ditolak' ? '#f0616d' : '#f5a524'}">${icon(r.status === 'menunggu' ? 'loop' : r.status === 'disetujui' ? 'check' : 'close')}</div><div class="card" style="padding:14px"><div class="filters" style="margin:0 0 6px">${prodiTag(r.prodi)}<span class="tag">${esc(r.objek)}</span>${statusTag(r.status)}<span class="muted small">${esc(r.tgl)} · ${esc(r.oleh)}</span></div><b>${esc(r.uraian)}</b><div class="small muted">Alasan: ${esc(r.alasan)}</div>${r.putusan ? `<div class="small" style="margin-top:4px">${esc(r.putusan)}</div>` : ''}
      ${can('revisi') && r.status === 'menunggu' ? `<div style="margin-top:8px"><button class="btn pri sm" data-ok="${r.id}">Setujui</button> <button class="btn sm danger" data-no="${r.id}">Tolak</button></div>` : ''}</div></div>`).join('') || '<div class="empty">Belum ada usulan revisi.</div>'}</div></div>`;
  const today = () => new Date().toISOString().slice(0, 10);
  const setP = async (id, st, log) => { const p = S.prodi.find(x => x.id === id); p.status = st; p.sahTgl = st === 'disahkan' ? today() : ''; await save('prodi', p, log + ' ' + id); rerender(); };
  el.querySelectorAll('[data-aju]').forEach(b => b.onclick = async () => { const bad = cekStruktur(S, b.dataset.aju).concat(cekTrace(S, b.dataset.aju)).filter(c => c.k === 'bad').length; if (bad && !(await tanya(`Masih ada ${bad} butir yang belum sesuai. Tetap ajukan?`, 'Tetap ajukan'))) return; setP(b.dataset.aju, 'diajukan', 'Ajukan kurikulum'); });
  el.querySelectorAll('[data-sah]').forEach(b => b.onclick = () => setP(b.dataset.sah, 'disahkan', 'Sahkan kurikulum'));
  el.querySelectorAll('[data-kem]').forEach(b => b.onclick = () => setP(b.dataset.kem, 'draf', 'Kembalikan kurikulum'));
  const dec = async (id, st) => { const r = S.revisi.find(x => x.id === id); const c = ''; r.status = st; r.putusan = `${st === 'disetujui' ? 'Disetujui' : 'Ditolak'} Wadir 1, ${today()}${c ? '. ' + c : ''}`; await save('revisi', r, `Usulan revisi ${id} ${st}`); rerender(); };
  el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => dec(b.dataset.ok, 'disetujui'));
  el.querySelectorAll('[data-no]').forEach(b => b.onclick = () => dec(b.dataset.no, 'ditolak'));
  const add = el.querySelector('#add'); if (add) add.onclick = () => formDrawer({ title: 'Usulan revisi kurikulum', sub: prodiName(), obj: { objek: 'Mata kuliah' },
    fields: [{ k: 'objek', label: 'Objek', type: 'select', opts: ['Visi keilmuan', 'Profil lulusan', 'CPL', 'Bahan kajian', 'Mata kuliah', 'CPMK', 'RPS'].map(v => ({ v, t: v })) }, { k: 'uraian', label: 'Uraian perubahan', type: 'textarea' }, { k: 'alasan', label: 'Alasan dan dasar (tracer study, masukan industri, hasil asesmen CPL)', type: 'textarea' }],
    onSave: async (o) => { if (!o.uraian) return 'Uraian wajib diisi.'; await save('revisi', { ...o, id: uid('REV'), prodi: ctx.prodi, oleh: 'Tim Kurikulum ' + ctx.prodi, tgl: today(), status: 'menunggu', putusan: '' }, `Usulan revisi ${ctx.prodi}`); rerender(); } });
}

/* ================= Laporan ================= */
export function laporanView(el) {
  const P = param(S), p = S.prodi.find(x => x.id === ctx.prodi), R = struktur(S, ctx.prodi), mk = byProdi(S.mk, ctx.prodi), cpl = byProdi(S.cpl, ctx.prodi), pl = byProdi(S.pl, ctx.prodi);
  const ck = cekStruktur(S, ctx.prodi).concat(cekTrace(S, ctx.prodi));
  el.innerHTML = `
  <div class="filters no-print"><button class="btn pri" onclick="window.print()">${icon('download')} Cetak / simpan PDF</button><button class="btn" id="x-csv">${icon('download')} Struktur MK (CSV)</button><button class="btn" id="x-sim">${icon('link')} Umpan indikator SIMANTAP (JSON)</button><button class="btn" id="x-all">${icon('db')} Cadangan data (JSON)</button></div>
  <div class="report"><div class="kop"><img src="assets/img/logo-pem-akamigas.png" alt=""><div class="t"><b>POLITEKNIK ENERGI DAN MINERAL AKAMIGAS</b><span>Dokumen Kurikulum ${APP.tahunKurikulum} · Program Sarjana Terapan</span></div><img src="assets/img/logo-esdm.png" alt=""></div>
  <h2>STRUKTUR KURIKULUM PROGRAM STUDI ${esc(p.nama.toUpperCase())}</h2><div class="meta">Dihasilkan KUREKAM pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · Status: ${p.status}</div>
  <h4>A. Visi keilmuan</h4><p>${esc(p.visiKeilmuan)}</p>
  <h4>B. Profil lulusan</h4><ol>${pl.map(x => `<li><b>${esc(x.nama)}.</b> ${esc(x.teks)}</li>`).join('')}</ol>
  <h4>C. Capaian pembelajaran lulusan</h4><table class="tbl"><thead><tr><th>Kode</th><th>Rumusan</th><th>PL</th><th>MK pendukung</th></tr></thead><tbody>${cpl.map(c => `<tr><td>${c.kode}</td><td>${esc(c.teks)}</td><td>${(c.pl || []).map(id => (S.pl.find(x => x.id === id) || {}).kode).join(', ')}</td><td class="num">${mk.filter(m => (m.cpl || []).includes(c.id)).length}</td></tr>`).join('')}</tbody></table>
  <h4>D. Sebaran mata kuliah per semester</h4>
  ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<table class="tbl" style="margin-bottom:10px"><thead><tr><th colspan="7">Semester ${s}</th></tr><tr><th>No</th><th>Kode</th><th>Mata kuliah</th><th>Kelompok</th><th>T</th><th>P</th><th>JP/mg</th></tr></thead><tbody>${R.smt[s].mk.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.kode)}</td><td>${esc(m.nama)}</td><td>${esc(m.kel)}</td><td class="num">${m.T}</td><td class="num">${m.P}</td><td class="num">${fmt(jpOf(m, P), 2)}</td></tr>`).join('')}<tr class="sum"><td colspan="4">Jumlah: ${R.smt[s].sks} SKS, ${R.smt[s].n} MK</td><td class="num">${R.smt[s].T}</td><td class="num">${R.smt[s].P}</td><td class="num">${fmt(R.smt[s].jp, 1)}</td></tr></tbody></table>`).join('')}
  <h4>E. Rekapitulasi</h4><table class="tbl"><tbody><tr><th>Total SKS</th><td>${R.total}</td><th>Jumlah MK</th><td>${R.n}</td></tr><tr><th>Muatan spesifik (MBE + MKK)</th><td>${fmt(R.spesifik, 1)}%</td><th>Pendidikan umum</th><td>${fmt(R.umum, 1)}%</td></tr><tr><th>Matematika dan ilmu alam</th><td>${R.matSains} SKS</td><th>Porsi jam praktik smt 1–6</th><td>${fmt(R.praktikJam, 1)}%</td></tr></tbody></table>
  <h4>F. Hasil pemeriksaan</h4><p>${ck.filter(c => c.k === 'ok').length} dari ${ck.length} butir sesuai.</p>${ck.filter(c => c.k !== 'ok').length ? `<table class="tbl"><thead><tr><th>Butir</th><th>Hasil</th><th>Ketentuan</th><th>Acuan</th></tr></thead><tbody>${ck.filter(c => c.k !== 'ok').map(c => `<tr><td>${c.label}</td><td>${esc(c.val)}</td><td>${esc(c.target)}</td><td>${c.acuan}</td></tr>`).join('')}</tbody></table>` : ''}
  <h4>G. Acuan</h4><ol>${ACUAN.map(a => `<li>${a}</li>`).join('')}</ol>
  <div class="ttd"><div><span>Ketua Program Studi</span><b>....................</b></div><div><span>Wakil Direktur I</span><b>....................</b></div></div></div>`;
  const dl = (name, text, type) => { unduh(new Blob([text], { type }), name); toast('Berkas diunduh: ' + name); };
  el.querySelector('#x-csv').onclick = () => dl(`struktur-mk-${ctx.prodi}.csv`, '﻿' + [['Smt', 'Kode', 'Nama mata kuliah', 'Kelompok', 'Jenis kunci', 'T', 'P', 'SKS', 'JP', 'Kategori IABEE', 'CPL'].join(';')].concat(mk.slice().sort((a, b) => a.smt - b.smt).map(m => [m.smt, m.kode, m.nama, m.kel, m.kunci || 'Ruang prodi', m.T, m.P, sksOf(m), jpOf(m, P), m.kat, (m.cpl || []).map(id => (S.cpl.find(c => c.id === id) || {}).kode).join(',')].join(';'))).join('\n'), 'text/csv');
  el.querySelector('#x-sim').onclick = () => dl('kurekam-indikator-simantap.json', JSON.stringify(umpanSimantap(), null, 2), 'application/json');
  el.querySelector('#x-all').onclick = () => { const o = {}; Object.keys(S).forEach(k => { o[k] = k === 'settings' ? [S.settings] : S[k]; }); dl('kurekam-cadangan.json', JSON.stringify(o), 'application/json'); };
}

/** Indikator kurikulum per prodi untuk dibaca SIMANTAP (koleksi indikator). */
export function umpanSimantap() {
  return S.prodi.map(p => { const R = struktur(S, p.id), g = progres(S, p.id), t = trace(S, p.id), b = bloomAudit(S, p.id);
    return { unit: p.id, sumber: 'KUREKAM', waktu: new Date().toISOString(), indikator: { sks_total: R.total, sks_matematika_sains: R.matSains, persen_muatan_spesifik: +R.spesifik.toFixed(1), persen_pendidikan_umum: +R.umum.toFixed(1), persen_jam_praktik: +R.praktikJam.toFixed(1), persen_rps_disahkan: g.nMk ? +(g.rpsSah / g.nMk * 100).toFixed(1) : 0, persen_keterlacakan: +t.skor.toFixed(1), temuan_bloom: b.issues.length, status_kurikulum: p.status } }; });
}
