/* KUREKAM · Kesiapan IABEE: indikator kinerja (PI), matriks CPL ke butir IABEE, dan sepuluh indikator kesiapan. */
import { S, ctx, can, save, remove, rerender, esc, icon, uid, saveSettings, addLog, toast, saveCtx } from '../app.js';
import { APP, BUTIR_IABEE, INDIKATOR_IABEE } from '../config.js';
import { chart, AX } from '../charts.js';
import { detect, badge } from '../bloom.js';
import { kodeBerikut, byProdi, param, fmt, iabeeOf, piOfCpl, piTrace, kriteriaPi, kesiapan, kompetensiInti, lulusanRekap, HURUF_IABEE } from '../rules.js';
import { kirimUmpan, temuanAmi } from '../sinkron.js';
import { DB } from '../db.js';
import { head, formDrawer, ro, kpi, animateCounts, prodiName, short, stTag, prodiTag, unduh, loadXLSX } from './ui.js';

const ST_TEKS = { ok: 'Sesuai target', near: 'Sebagian', bad: 'Jauh dari target', na: 'Belum diukur' };
const stTagI = (k) => stTag(k, ST_TEKS[k] || k);
const butirTag = (k) => `<span class="tag" style="--c:#6366f1" title="${esc((BUTIR_IABEE.find(b => b.k === k) || {}).teks || '')}">(${k})</span>`;
const kodeCpmk = (c) => { const m = S.mk.find(x => x.id === c.mk); return `${m ? m.kode : c.mk}/${c.kode}`; };
const livePi = (v) => { const b = detect(v, 'C'); return b ? `${badge(b.code)} kata kerja "<b>${esc(b.verb)}</b>"${b.kabur ? ' <span class="st near">kurang teramati, ganti kata kerja</span>' : ''}` : (v.trim() ? badge(null) : 'Tulis perilaku yang dapat diamati dan dinilai, diawali kata kerja operasional, misalnya "menghitung", "menyusun", "mengoperasikan".'); };

/* ================= Indikator kinerja (PI) ================= */
export function piView(el) {
  const ed = can('susun'), pid = ctx.prodi, t = piTrace(S, pid), P = t.P;
  const cplPi = t.cpl.length - t.cplNoPi.length;
  const saran = t.mk.filter(m => !m.inti && (/kompetensi penciri|capstone/i.test(m.kel) || /capstone/i.test(m.nama)));
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span><b>Apa itu PI?</b> Indikator kinerja (PI) memecah satu CPL menjadi 2 sampai 4 perilaku yang dapat diamati dan dinilai. Setiap PI dihubungkan ke CPMK yang mengukurnya. Nilai dari instrumen penilaian CPMK kemudian dihitung naik menjadi capaian PI, lalu capaian CPL. Kriteria bawaan: PI tercapai bila minimal <b>${P.piMinPersen}% mahasiswa</b> bernilai minimal <b>${P.piMinNilai}</b>. Nilai per mahasiswa tetap diolah di Excel prodi dan tidak disimpan di aplikasi.</span></div>
  <div class="grid g4">
    ${kpi('CPL ber-PI', cplPi, `dari ${t.cpl.length} CPL ${prodiName()}`, cplPi === t.cpl.length && t.cpl.length ? '#10b981' : '#f5a524', 'target')}
    ${kpi('Jumlah PI', t.pi.length, `${P.piPerCplMin}–${P.piPerCplMax} PI per CPL`, '#0ea5e9', 'spark')}
    ${kpi('PI tanpa CPMK', t.piNoCpmk.length, 'harus nol agar rantai ukur utuh', t.piNoCpmk.length ? '#f0616d' : '#10b981', 'link')}
    ${kpi('Mata kuliah inti', t.inti.length, `${t.intiLengkap.length} sudah lengkap PI`, '#8b5cf6', 'medal')}
  </div>
  <div class="grid g-21" style="margin-top:18px">
    <div class="card">${head('Indikator kinerja per CPL', prodiName() + (ed ? ' · klik PI untuk mengubah' : ''), 'target', '#0ea5e9', ed ? '' : ro())}
      <div id="pi-list">${t.cpl.map(c => {
        const ps = piOfCpl(S, c.id), n = ps.length, k = n >= P.piPerCplMin && n <= P.piPerCplMax ? 'ok' : n ? 'near' : 'bad';
        return `<div class="pi-cpl">
          <div class="pi-h"><span class="tag" style="--c:#0ea5e9">${esc(c.kode)}</span><div class="pi-t"><b>${esc(c.teks)}</b><div class="small muted">Butir IABEE: ${iabeeOf(c).map(butirTag).join(' ') || '<span class="st bad">belum diisi</span>'}</div></div>${stTag(k, `${n} PI`)}</div>
          ${ps.map(p => { const kr = kriteriaPi(p, P), cs = (p.cpmk || []).map(id => S.cpmk.find(x => x.id === id)).filter(Boolean); return `<div class="pi-row ${ed ? 'click' : ''}" data-pi="${p.id}"><span class="pi-k">${esc(p.kode)}</span><div><div>${esc(p.teks)}</div><div class="small muted">CPMK: ${cs.map(x => `<span title="${esc((S.mk.find(m => m.id === x.mk) || {}).nama || '')}: ${esc(x.teks)}">${esc(kodeCpmk(x))}</span>`).join(', ') || '<span class="st bad">belum dihubungkan</span>'} · Kriteria: ≥ ${fmt(kr.persen)}% mahasiswa bernilai ≥ ${fmt(kr.nilai)}</div></div></div>`; }).join('')}
          ${ed ? `<button class="btn ghost sm" data-add="${c.id}">${icon('plus')} PI untuk ${esc(c.kode)}</button>` : ''}
        </div>`; }).join('') || '<div class="empty">CPL prodi belum ada. Isi dulu di menu Capaian Pembelajaran Lulusan.</div>'}</div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="card">${head('Mata kuliah inti', 'Tempat utama pengukuran CPL', 'medal', '#8b5cf6')}
        ${t.inti.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mata kuliah</th><th class="num">CPMK</th><th class="num">Ber-PI</th></tr></thead><tbody>${t.inti.map(m => { const cs = t.cpmk.filter(c => c.mk === m.id), ok = cs.filter(c => t.pi.some(p => (p.cpmk || []).includes(c.id))).length; return `<tr><td><b>${esc(short(m.nama, 38))}</b><div class="small muted">S${m.smt} · ${esc(m.kode)}</div></td><td class="num">${cs.length}</td><td class="num"><b style="color:${cs.length && ok === cs.length ? '#047857' : '#b42335'}">${ok}</b></td></tr>`; }).join('')}</tbody></table></div>`
          : '<div class="empty small">Belum ada MK inti. Tandai di menu Mata Kuliah &amp; SKS, kolom Inti.</div>'}
        ${saran.length ? `<p class="note">Kandidat MK inti yang belum ditandai (MK kompetensi penciri dan capstone): ${saran.slice(0, 8).map(m => esc(short(m.nama, 30))).join(', ')}${saran.length > 8 ? `, dan ${saran.length - 8} lainnya` : ''}. Pilih yang benar-benar menjadi tempat pengukuran CPL, tidak harus semuanya.</p>` : ''}
      </div>
      <div class="card">${head('Jumlah PI per CPL', `Batas ${P.piPerCplMin}–${P.piPerCplMax}`, 'pulse', '#10b981')}<div class="chart" id="c-pi"></div></div>
    </div>
  </div>`;
  animateCounts(el);
  chart(el.querySelector('#c-pi'), { grid: { left: 8, right: 20, top: 10, bottom: 8, containLabel: true }, tooltip: {}, xAxis: { type: 'value', minInterval: 1, ...AX }, yAxis: { type: 'category', data: t.cpl.map(c => c.kode), inverse: true, ...AX },
    series: [{ type: 'bar', barWidth: 14, label: { show: true, position: 'right', fontSize: 11 }, data: t.cpl.map(c => { const n = piOfCpl(S, c.id).length; return { value: n, itemStyle: { color: n >= P.piPerCplMin && n <= P.piPerCplMax ? '#10b981' : n ? '#f5a524' : '#f0616d', borderRadius: [0, 8, 8, 0] } }; }),
      markLine: { symbol: 'none', data: [{ xAxis: P.piPerCplMin }], lineStyle: { color: '#8b5cf6', type: 'dashed' }, label: { formatter: 'min ' + P.piPerCplMin } } }] });
  if (!ed) return;
  const form = (x) => {
    const c = S.cpl.find(y => y.id === x.cpl); const ps = piOfCpl(S, c.id);
    const mkCpl = new Set(t.mk.filter(m => (m.cpl || []).includes(c.id)).map(m => m.id));
    const pil = t.cpmk.filter(k => (k.cpl || []).includes(c.id) || mkCpl.has(k.mk)).sort((a, b) => kodeCpmk(a).localeCompare(kodeCpmk(b), 'id', { numeric: true }));
    formDrawer({ title: x.id ? 'Ubah PI ' + x.kode : 'PI baru untuk ' + c.kode, sub: short(c.teks, 120), obj: x,
      fields: [{ k: 'kode', label: 'Kode PI', type: 'kode', ph: x.kode || kodeBerikut(S, 'pi', pid, { cpl: c }) },
        { k: 'teks', label: 'Rumusan PI (perilaku yang dapat diamati dan dinilai)', type: 'textarea', rows: 3, live: livePi },
        { k: 'cpmk', label: 'CPMK yang mengukur PI ini', type: 'multi', opts: pil.map(k => ({ v: k.id, t: kodeCpmk(k), title: `${(S.mk.find(m => m.id === k.mk) || {}).nama || ''}: ${k.teks}` })), help: pil.length ? 'Pilihan berasal dari CPMK yang mendukung CPL ini atau dari MK yang dibebani CPL ini. Arahkan kursor untuk membaca rumusan CPMK.' : 'Belum ada CPMK yang terkait dengan CPL ini. Bebankan CPL ke MK di menu Mata Kuliah, lalu isi CPMK-nya.' },
        { k: 'minPersen', label: 'Kriteria: minimal % mahasiswa', type: 'number', ph: String(P.piMinPersen), help: `Kosongkan untuk memakai nilai bawaan ${P.piMinPersen}%.` },
        { k: 'minNilai', label: 'Kriteria: nilai minimal', type: 'number', ph: String(P.piMinNilai), help: `Kosongkan untuk memakai nilai bawaan ${P.piMinNilai}.` }],
      onSave: async (o) => {
        if (!o.teks) return 'Rumusan PI wajib diisi.';
        o.kode = o.kode || kodeBerikut(S, 'pi', pid, { cpl: c });
        if (!o.id && ps.length >= P.piPerCplMax) return `Satu CPL maksimal ${P.piPerCplMax} PI (Parameter). Ubah PI yang ada atau minta batas dinaikkan.`;
        if (o.minPersen != null && (o.minPersen < 0 || o.minPersen > 100)) return 'Persentase harus 0 sampai 100.';
        o.id = o.id || uid(pid + '-PI'); o.prodi = pid; o.cpl = c.id;
        await save('pi', o, `Simpan PI ${o.kode} (${pid})`); rerender();
      },
      onDelete: x.id ? async () => { await remove('pi', x.id, `Hapus PI ${x.kode} (${pid})`); rerender(); } : null });
  };
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => form({ cpl: b.dataset.add, cpmk: [] }));
  el.querySelectorAll('.pi-row.click').forEach(r => r.onclick = () => form({ ...S.pi.find(p => p.id === r.dataset.pi) }));
}

/* ================= Matriks CPL ke butir IABEE (dapat dicetak) ================= */
function matriksIabee(pid) {
  const p = S.prodi.find(x => x.id === pid) || { nama: pid }, cpl = byProdi(S.cpl, pid);
  const n = HURUF_IABEE.map(k => cpl.filter(c => iabeeOf(c).includes(k)).length);
  return `<div class="report" id="cetakArea"><div class="kop"><img src="assets/img/logo-pem-akamigas.png" alt=""><div class="t"><b>POLITEKNIK ENERGI DAN MINERAL AKAMIGAS</b><span>Program Studi ${esc(p.nama)} · Sarjana Terapan</span></div><img src="assets/img/logo-esdm.png" alt=""></div>
    <h2>MATRIKS CPL TERHADAP BUTIR KOMPETENSI LULUSAN IABEE</h2><div class="meta">Kurikulum ${APP.tahunKurikulum} · Kriteria IABEE 1.2.2, program teknologi rekayasa (Sarjana Terapan) · dicetak ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div class="tbl-wrap"><table class="tbl mx"><thead><tr><th>Kode</th><th class="hide-sm">Rumusan CPL</th>${HURUF_IABEE.map(k => `<th class="mxh" title="${esc(BUTIR_IABEE.find(b => b.k === k).teks)}">(${k})</th>`).join('')}</tr></thead><tbody>
      ${cpl.map(c => { const s = iabeeOf(c); return `<tr><td title="${esc(c.teks)}"><b>${esc(c.kode)}</b></td><td class="small hide-sm">${esc(c.teks)}</td>${HURUF_IABEE.map(k => `<td class="mxc ${s.includes(k) ? 'on' : ''}">${s.includes(k) ? '●' : ''}</td>`).join('')}</tr>`; }).join('') || `<tr><td colspan="${HURUF_IABEE.length + 2}" class="empty">CPL belum ada.</td></tr>`}
      <tr class="sum"><td>Jumlah</td><td class="hide-sm"></td>${n.map(v => `<td class="num" style="text-align:center;color:${v ? 'inherit' : '#b42335'}">${v}</td>`).join('')}</tr></tbody></table></div>
    <h4>Keterangan butir</h4><ol type="a" class="small">${BUTIR_IABEE.map(b => `<li>${esc(b.teks)}</li>`).join('')}</ol>
    <div class="ttd"><div><span>Ketua Program Studi</span><b>....................</b></div><div><span>Wakil Direktur I</span><b>....................</b></div></div></div>`;
}
function cetak() {
  const lap = document.createElement('div'); lap.id = 'cetakLayer'; lap.appendChild(document.getElementById('cetakArea').cloneNode(true)); lap.firstChild.removeAttribute('id');
  document.body.appendChild(lap); document.body.classList.add('cetak-sel');
  const off = () => { document.body.classList.remove('cetak-sel'); lap.remove(); window.removeEventListener('afterprint', off); };
  window.addEventListener('afterprint', off);
  window.print(); setTimeout(off, 1500);
}


const KI_ST = { sesuai: ['ok', 'Sesuai'], tidak: ['bad', 'Belum cocok'], data: ['near', 'Bidang dosen belum diisi'], tanpa: ['bad', 'Belum ada pengampu'] };
function kompetensiTabel(pid) {
  const ki = kompetensiInti(S, pid);
  if (!ki.length) return '<div class="empty">Belum ada MK inti. Tandai di menu Mata Kuliah & SKS, kolom Inti.</div>';
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>MK inti</th><th>Kompetensi dicari</th><th>Dosen pengampu</th><th>Status</th></tr></thead><tbody>
    ${ki.map(x => `<tr><td><b>${esc(x.m.kode)}</b><div class="small muted">${esc(x.m.nama)}</div></td><td class="small">${x.kata.map(k => `<span class="tag">${esc(k)}</span>`).join(' ') || '–'}${x.dari === 'nama' ? '<div class="muted">dari nama MK, isi kata kunci agar lebih tepat</div>' : ''}</td>
    <td class="small">${x.dosen.map(d => `${esc(d.nama)}${x.cocok.includes(d) ? ' ✓' : ''}`).join('<br>') || '<span class="muted">belum ada</span>'}</td><td>${stTag(...KI_ST[x.status])}</td></tr>`).join('')}
  </tbody></table></div>`;
}


/* ================= Ekspor triwulan untuk SIMANTAP (angka agregat saja) ================= */
const triwulanIni = () => { const d = new Date(); return { tahun: d.getFullYear(), tw: Math.floor(d.getMonth() / 3) + 1 }; };
export function umpanIabee(periode) {
  return S.prodi.map(p => { const ind = kesiapan(S, p.id);
    return { unit: p.id, sumber: 'KUREKAM', jenis: 'kesiapan_iabee', periode, waktu: new Date().toISOString(),
      indikator: Object.fromEntries(ind.map(i => ['iabee_' + String(i.no).padStart(2, '0'), i.no === 6 ? (i.k === 'na' ? null : lulusanRekap(S, p.id).obe) : i.nilai == null ? null : +i.nilai.toFixed(1)])),
      status: Object.fromEntries(ind.map(i => ['iabee_' + String(i.no).padStart(2, '0'), i.k === 'na' ? 'belum_diukur' : i.k === 'ok' ? 'sesuai' : i.k === 'near' ? 'sebagian' : 'jauh'])),
      keterangan: Object.fromEntries(ind.map(i => ['iabee_' + String(i.no).padStart(2, '0'), `${i.teks || ''}${i.ket ? ' | ' + i.ket : ''}`])) }; });
}
async function eksporExcel(periode) {
  const X = await loadXLSX(), wb = X.utils.book_new(), baris = [['Periode', 'Prodi', 'No', 'Indikator', 'Nilai (%)', 'Status', 'Hasil', 'Target', 'Keterangan']];
  S.prodi.forEach(p => kesiapan(S, p.id).forEach(i => baris.push([periode, p.id, i.no, i.nama, i.nilai == null ? '' : +i.nilai.toFixed(1), i.k === 'na' ? 'Belum diukur' : i.k === 'ok' ? 'Sesuai target' : i.k === 'near' ? 'Sebagian' : 'Jauh dari target', i.teks || '', i.target, i.ket || ''])));
  const ws = X.utils.aoa_to_sheet(baris); ws['!cols'] = [10, 8, 5, 52, 10, 16, 30, 40, 70].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'KESIAPAN IABEE');
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `kurekam-iabee-${periode}.xlsx`);
}

/* ================= Menu Kesiapan IABEE ================= */
export function kesiapanView(el) {
  const semua = S.prodi.map(p => ({ p, ind: kesiapan(S, p.id) }));
  const cur = semua.find(x => x.p.id === ctx.prodi) || semua[0]; if (!cur) { el.innerHTML = '<div class="card empty">Data prodi belum ada.</div>'; return; }
  const adm = ['admin', 'developer'].includes(ctx.role);
  const terukur = cur.ind.filter(i => i.k !== 'na').length, sesuai = cur.ind.filter(i => i.k === 'ok').length;
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Sepuluh indikator ini menunjukkan seberapa siap tiap prodi menghadapi akreditasi IABEE. Indikator yang datanya belum masuk ditulis <b>Belum diukur</b>, bukan nol. Indikator 1 dan 2 dihitung dari isian PI, CPMK, MK inti, dan butir IABEE pada CPL. Indikator 3, 4, dan 7 dihitung dari menu Capaian CPL & Tindak Lanjut, dan indikator 10 dari bidang dan sertifikasi dosen. Indikator 5, 6, dan 8 dari menu Capstone, Lulusan & Tracer. Cara mengisi tiap indikator ada di menu <a href="#panduan"><b>Panduan 10 Indikator</b></a>. Indikator 9 dipantau di SIMANTAP.</span></div>
  <div class="grid g4">
    ${kpi('Indikator terukur', terukur, `dari 10 indikator · ${cur.p.id}`, '#0ea5e9', 'pulse')}
    ${kpi('Sesuai target', sesuai, `${cur.p.id}`, sesuai ? '#10b981' : '#f5a524', 'check')}
    ${kpi('CPL ber-PI', cur.ind[0].nilai == null ? '–' : Math.round(byProdi(S.cpl, cur.p.id).length ? (byProdi(S.cpl, cur.p.id).length - piTrace(S, cur.p.id).cplNoPi.length) / byProdi(S.cpl, cur.p.id).length * 100 : 0), '% CPL yang sudah punya PI', '#8b5cf6', 'target')}
    ${kpi('Butir IABEE tercakup', HURUF_IABEE.length - piTrace(S, cur.p.id).butirKosong.length, `dari ${HURUF_IABEE.length} butir (a)–(${HURUF_IABEE[HURUF_IABEE.length - 1]})`, '#6366f1', 'medal')}
  </div>
  <div class="card" style="margin-top:18px">${head('Ringkasan lima prodi', 'Klik kode prodi untuk melihat rinciannya', 'grid4', '#8b5cf6', adm ? `<button class="btn sm" id="tgt">${icon('edit')} Ubah target</button>` : '')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Indikator</th><th>Target</th>${semua.map(x => `<th><button class="btn ghost sm ${x.p.id === cur.p.id ? 'on' : ''}" data-p="${x.p.id}">${prodiTag(x.p.id)}</button></th>`).join('')}</tr></thead><tbody>
      ${INDIKATOR_IABEE.map((d, i) => `<tr><td class="num">${d.no}</td><td><b>${esc(d.nama)}</b><div class="small muted">${esc(d.sumber)}</div></td><td class="small">${esc(cur.ind[i].target)}</td>${semua.map(x => { const v = x.ind[i]; return `<td title="${esc(v.ket || '')}">${stTagI(v.k)}${v.nilai != null ? `<div class="small">${fmt(v.nilai)}%</div>` : ''}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div></div>
  <div class="grid g-21" style="margin-top:18px">
    <div class="card">${head('Rincian ' + cur.p.id, esc(cur.p.nama), 'audit', '#10b981')}
      <div class="ind-list">${cur.ind.map(v => `<div class="ind ${v.k}"><span class="ind-no">${v.no}</span><div><b>${esc(v.nama)}</b><div class="small">${v.k !== 'na' ? `<b>${esc(v.teks)}</b> · ` : ''}Target: ${esc(v.target)}</div><div class="small muted">${esc(v.ket || '')} Sumber data: ${esc(v.sumber)}.</div></div>${stTagI(v.k)}</div>`).join('')}</div></div>
    <div class="card">${head('Indikator 1 dan 2 per prodi', 'Persentase menuju target 100%', 'pulse', '#0ea5e9')}<div class="chart" id="c-12"></div></div>
  </div>
  <div class="card" style="margin-top:18px">${head('Kompetensi dosen untuk mata kuliah inti · ' + cur.p.id, 'Pengampu dicocokkan dengan bidang S1, S2, S3, dan sertifikasi. Kata kunci diisi pada formulir MK. Tanpa NIP.', 'user', '#f5a524')}${kompetensiTabel(cur.p.id)}</div>
  <div class="card" style="margin-top:18px">${head('Sinkron otomatis dengan SIMANTAP', 'Tanpa impor atau ekspor. Setiap data KUREKAM berubah, ringkasan 10 indikator terkirim sendiri dan terbaca di SIMANTAP.', 'link', '#10b981', `<button class="btn pri sm" id="sk-kirim">${icon('check')} Kirim sekarang</button>`)}
    <div class="small muted" id="sk-st">${DB.mode === 'firebase' ? 'Basis data bersama aktif. Pengiriman otomatis berjalan beberapa detik setelah perubahan tersimpan.' : 'Basis data bersama belum aktif (mode lokal), sehingga belum ada yang terkirim.'}</div>
    <h4 style="margin:14px 0 6px">Temuan AMI dari SIMANTAP · ${cur.p.id}</h4><div id="sk-ami" class="small muted">Memuat…</div></div>
  <div class="card" style="margin-top:18px">${head('Ekspor triwulan untuk SIMANTAP', 'Berisi angka agregat 10 indikator untuk lima prodi. Tanpa nama, NIP, NIM, atau nilai per mahasiswa.', 'download', '#14b8a6')}
    <div class="filters"><select class="inp" id="x-th">${[0, 1, 2].map(k => triwulanIni().tahun - k).map(t => `<option ${t === triwulanIni().tahun ? 'selected' : ''}>${t}</option>`).join('')}</select><select class="inp" id="x-tw">${[1, 2, 3, 4].map(q => `<option value="${q}" ${q === triwulanIni().tw ? 'selected' : ''}>Triwulan ${q}</option>`).join('')}</select>
      <button class="btn pri sm" id="x-json">${icon('download')} Unduh JSON</button><button class="btn sm" id="x-xls">${icon('download')} Unduh Excel</button></div>
    <p class="small muted">JSON berformat sama dengan umpan indikator kurikulum (satu entri per prodi, kolom <code>indikator</code> berisi iabee_01 sampai iabee_10). Nilai kosong berarti belum diukur. Indikator 6 berisi jumlah lulusan OBE, indikator lain berisi persen. Impor berkas ini di SIMANTAP setiap akhir triwulan.</p></div>
  <div class="card" style="margin-top:18px">${head('Matriks CPL ke butir IABEE · ' + cur.p.id, 'Diisi di menu CPL (formulir) atau Matriks Keterlacakan, tab CPL × butir IABEE', 'link', '#6366f1', `<button class="btn pri sm no-print" id="cetak">${icon('download')} Cetak / simpan PDF</button>`)}
    ${matriksIabee(cur.p.id)}</div>`;
  animateCounts(el);
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { if (ctx.kunci && ctx.role === 'prodi' && ctx.akun && ctx.akun.prodi) { toast('Akun prodi hanya dapat melihat rincian prodinya sendiri. Ringkasan lima prodi tetap tampil di tabel.'); return; } ctx.prodi = b.dataset.p; saveCtx(); rerender(); });
  el.querySelector('#cetak').onclick = cetak;
  el.querySelector('#sk-kirim').onclick = async () => { const r = await kirimUmpan(); el.querySelector('#sk-st').textContent = r.ok ? (r.tanpaPerubahan ? 'Sudah terkirim, tidak ada perubahan baru.' : `Terkirim untuk ${r.n} prodi pada ${new Date().toLocaleTimeString('id-ID')}.`) : 'Belum terkirim: ' + r.alasan; toast(r.ok ? 'Umpan SIMANTAP terkirim' : 'Umpan belum terkirim'); };
  (async () => { const box = el.querySelector('#sk-ami'); const rows = await temuanAmi(cur.p.id); const ada = new Set(S.tl.map(t => t.amiId).filter(Boolean));
    box.innerHTML = rows.length ? rows.map(r => `<div style="padding:6px 0;border-top:1px solid var(--line,#0001)"><b>${esc(r.kode)}</b> · ${esc(r.temuan)}<div>${esc(r.teks)}</div>${r.uraian ? `<div class="muted">${esc(r.uraian)}</div>` : ''}${can('susun', { prodi: cur.p.id }) ? (ada.has(r.id) ? '<span class="tag" style="--c:#10b981">Sudah dicatat</span>' : `<button class="btn sm" data-ami="${esc(r.id)}">Catat sebagai tindak lanjut</button>`) : ''}</div>`).join('') : (DB.mode === 'firebase' ? 'Belum ada temuan AMI untuk prodi ini.' : 'Tersedia setelah basis data bersama aktif.');
    box.querySelectorAll('[data-ami]').forEach(b => b.onclick = async () => { const r = rows.find(x => x.id === b.dataset.ami);
      await save('tl', { id: uid('TL'), prodi: cur.p.id, tgl: new Date().toISOString().slice(0, 10), status: 'rencana', amiId: r.id, temuan: `Temuan AMI (${r.temuan}) pada indikator ${r.kode}: ${r.teks}${r.uraian ? '. ' + r.uraian : ''}`, tindakan: '' }, `Catat temuan AMI ${r.kode} sebagai tindak lanjut ${cur.p.id}`); toast('Dicatat di Capaian CPL & Tindak Lanjut'); rerender(); }); })();
  const per = () => `${el.querySelector('#x-th').value}-T${el.querySelector('#x-tw').value}`;
  el.querySelector('#x-json').onclick = async () => { const pr = per(); unduh(new Blob([JSON.stringify(umpanIabee(pr), null, 2)], { type: 'application/json' }), `kurekam-iabee-${pr}.json`); await addLog(`Ekspor kesiapan IABEE ${pr} (JSON)`); toast('Berkas JSON diunduh'); };
  el.querySelector('#x-xls').onclick = async () => { const pr = per(); try { await eksporExcel(pr); await addLog(`Ekspor kesiapan IABEE ${pr} (Excel)`); toast('Berkas Excel diunduh'); } catch (e) { toast('Ekspor gagal: ' + e.message); } };
  chart(el.querySelector('#c-12'), { tooltip: { trigger: 'axis' }, legend: { top: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: semua.map(x => x.p.id), ...AX }, yAxis: { type: 'value', max: 100, ...AX },
    series: [['Indikator 1', 0, '#8b5cf6'], ['Indikator 2', 1, '#0ea5e9']].map(([nm, i, c]) => ({ name: nm, type: 'bar', barWidth: 16, itemStyle: { color: c, borderRadius: [6, 6, 0, 0] }, data: semua.map(x => x.ind[i].nilai == null ? null : +x.ind[i].nilai.toFixed(1)) })) });
  const tg = el.querySelector('#tgt');
  if (tg) tg.onclick = () => formDrawer({ title: 'Target indikator kesiapan IABEE', sub: 'Berlaku untuk semua prodi. Kosongkan untuk memakai target bawaan.', obj: Object.fromEntries(INDIKATOR_IABEE.map(d => ['t' + d.no, ((S.settings.targetIabee || {})[d.no]) || ''])),
    fields: INDIKATOR_IABEE.map(d => ({ k: 't' + d.no, label: `${d.no}. ${d.nama}`, ph: d.target, full: true })),
    onSave: async (o) => { S.settings.targetIabee = Object.fromEntries(INDIKATOR_IABEE.map(d => [d.no, o['t' + d.no]]).filter(([, v]) => v)); await saveSettings(); await addLog('Ubah target indikator kesiapan IABEE'); toast('Target tersimpan'); rerender(); } });
}
