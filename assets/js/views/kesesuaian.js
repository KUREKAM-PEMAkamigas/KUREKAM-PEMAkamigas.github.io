/* KUREKAM · Kesesuaian Pedoman: satu halaman yang menyandingkan target Pedoman dengan desain kurikulum tiap prodi.
   Semua angka memakai mesin yang sama dengan Pemeriksa (struktur, param). Baris dapat diklik menuju menu yang dituju.
   Target dapat diubah oleh peran yang berwenang (Wadir I, SPM, admin, developer) dengan alasan tercatat, dan dikembalikan ke Pedoman 2027. */
import { S, ctx, saveCtx, bolehMenu, esc, icon, toast, saveSettings, addLog, can, userName } from '../app.js';
import { DB } from '../db.js';
import { PARAM_DEFAULT } from '../config.js';
import { struktur, param, fmt, jpRange, grupOf } from '../rules.js';
import { chart, AX } from '../charts.js';
import { head, prodiTag, stTag, tanya, unduh, loadXLSX } from './ui.js';

const KUNCI_SKALAR = [
  ['totalSksMin', 'Total SKS minimal', 'SKS'], ['mkProdiMin', 'Jumlah MK per prodi, minimal', 'MK'], ['mkProdiMax', 'Jumlah MK per prodi, maksimal', 'MK'],
  ['muatanSpesifikMin', 'Muatan spesifik program (MK kompetensi), minimal', '%'], ['pendidikanUmumMax', 'Pendidikan umum, maksimal', '%'], ['matSainsMin', 'Matematika dan ilmu alam, minimal', 'SKS'],
  ['praktikMin', 'Porsi jam praktik semester 1 sampai 6, minimal', '%'], ['praktikMax', 'Porsi jam praktik semester 1 sampai 6, maksimal', '%']];
const KOLOM_KER = ['SKS', 'Teori min', 'Teori maks', 'Praktik min', 'Praktik maks', 'MK min', 'MK maks'];

/** Status: ok bila memenuhi, near bila selisih kecil, bad bila jauh. */
const nilaiSt = (ok, dekat) => ok ? 'ok' : dekat ? 'near' : 'bad';
const rentang = (v, lo, hi) => nilaiSt(v >= lo && v <= hi, v >= lo - 1 && v <= hi + 1);
const kompetensiOf = (S, pid) => { const mk = S.mk.filter(m => m.prodi === pid), k = mk.filter(m => ['MBE', 'MKK'].includes(grupOf(m))); return { n: k.length, sks: k.reduce((a, m) => a + (+m.T || 0) + (+m.P || 0), 0) }; };

/** Baris metrik prodi: {label, acuan, pedoman, desain, st, go, bantu}. */
function metrik(pid) {
  const P = param(S), R = struktur(S, pid), K = kompetensiOf(S, pid), d = (v, n = 1) => fmt(v, n);
  return [
    { label: 'Total SKS', acuan: 'Permen 39/2025, Pedoman Bab IV', pedoman: `≥ ${P.totalSksMin}`, desain: d(R.total, 0), st: nilaiSt(R.total >= P.totalSksMin, R.total >= P.totalSksMin - 2), go: 'mk', bantu: 'Jumlah seluruh SKS mata kuliah prodi.' },
    { label: 'Jumlah mata kuliah', acuan: 'Pedoman Bab IV', pedoman: `${P.mkProdiMin}–${P.mkProdiMax}`, desain: d(R.n, 0), st: rentang(R.n, P.mkProdiMin, P.mkProdiMax), go: 'mk', bantu: 'Terlalu banyak MK memecah beban belajar; terlalu sedikit membuat MK terlalu besar.' },
    { label: 'Jumlah mata kuliah kompetensi', acuan: 'IABEE 2.1.1, LAM Teknik', pedoman: '(informasi)', desain: `${K.n} MK, ${K.sks} SKS`, st: 'ok', go: 'mk', bantu: 'MK kompetensi = kelompok MK Basic Engineering dan MK Kompetensi.' },
    { label: 'Muatan MK kompetensi terhadap total SKS', acuan: 'IABEE 2.1.1 (minimal 65%)', pedoman: `≥ ${P.muatanSpesifikMin}%`, desain: `${d(R.spesifik)}%`, st: nilaiSt(R.spesifik >= P.muatanSpesifikMin, R.spesifik >= P.muatanSpesifikMin - 3), go: 'peta', bantu: 'Persentase SKS MK kompetensi dari seluruh SKS.' },
    { label: 'Porsi jam praktik (semester 1 sampai 6)', acuan: 'LAM Teknik butir 18 (50 sampai 70%)', pedoman: `${P.praktikMin}–${P.praktikMax}%`, desain: `${d(R.praktikJam)}%`, st: nilaiSt(R.praktikJam >= P.praktikMin && R.praktikJam <= P.praktikMax, R.praktikJam >= P.praktikMin - 3 && R.praktikJam <= P.praktikMax + 3), go: 'peta', bantu: 'Dihitung dari jam: teori 60 menit per SKS, praktik 120 atau 170 menit per SKS menurut jenis MK.' },
    { label: 'Komposisi SKS teori : praktik', acuan: 'Pedoman Bab IV (informasi)', pedoman: '(informasi)', desain: `${d(100 - R.praktikSks, 0)} : ${d(R.praktikSks, 0)}`, st: 'ok', go: 'peta', bantu: 'Perbandingan SKS teori dengan SKS praktik seluruh kurikulum.' },
    { label: 'Pendidikan umum', acuan: 'IABEE 2.1.1 (maksimal 25%)', pedoman: `≤ ${P.pendidikanUmumMax}%`, desain: `${d(R.umum)}%`, st: nilaiSt(R.umum <= P.pendidikanUmumMax, R.umum <= P.pendidikanUmumMax + 2), go: 'mk', bantu: 'Porsi MK pendidikan umum.' },
    { label: 'Matematika dan ilmu alam', acuan: 'IABEE 2.1.1, LAM Teknik butir 19', pedoman: `≥ ${P.matSainsMin} SKS`, desain: `${d(R.matSains, 0)} SKS`, st: nilaiSt(R.matSains >= P.matSainsMin, R.matSains >= P.matSainsMin - 1), go: 'mk', bantu: 'Landasan sains untuk analisis rekayasa.' }
  ];
}

/** Baris per semester: SKS, teori, praktik, jumlah MK, JP. */
function barisSemester(pid) {
  const P = param(S), R = struktur(S, pid), out = [];
  for (let s = 1; s <= 8; s++) {
    const k = P.kerangka[s], x = R.smt[s], jr = k && k[1] != null ? jpRange(P, s) : null;
    out.push({ s, x, k, jr, stSks: nilaiSt(x.sks === k[0], Math.abs(x.sks - k[0]) <= 1), stT: k[1] != null ? rentang(x.T, k[1], k[2]) : 'ok', stP: k[1] != null ? rentang(x.P, k[3], k[4]) : 'ok', stN: k[1] != null ? rentang(x.n, k[5], k[6]) : 'ok', stJp: jr ? rentang(x.jp, jr[0], jr[1]) : 'ok' });
  }
  return out;
}

const sel = (a, b, v) => a[v];
const sk = (st) => stTag(st, { ok: 'Sesuai', near: 'Dekat', bad: 'Perlu perhatian' }[st]);
const SEL = { ok: 'Sesuai', near: 'Perlu perhatian', bad: 'Tidak sesuai' };
const bs = (st, teks) => `<span class="st ${st}">${esc(teks)}</span>`;

export default function kesesuaianView(el) {
  const P = param(S), pid = ctx.prodi, prodi = S.prodi, boleh = can('parameter');
  const semua = prodi.map(p => ({ p, m: metrik(p.id) }));
  const semuaUrut = semua; const aktif = prodi.find(p => p.id === pid) || prodi[0], B = barisSemester(aktif.id);
  const M0 = semua[0].m;

  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span><b>Cara membaca halaman ini.</b> Kolom <b>Pedoman</b> adalah target yang berlaku sekarang (Pedoman Edisi 2027, dapat diubah di bagian paling bawah). Kolom <b>Desain</b> dihitung otomatis dari mata kuliah yang sudah dimasukkan prodi. Klik sebuah baris untuk membuka menu tempat angkanya diperbaiki. Pedoman masih berupa usulan: bila disepakati dipakai, dan bila saat pengerjaan perlu revisi, ubah targetnya di sini lalu unduh daftar usulan revisi Pedoman.</span></div>

  <div class="card" style="margin-top:14px">${head('Ringkasan lintas prodi', 'Pedoman dibandingkan dengan desain tiap prodi. Klik sel untuk membuka prodi itu.', 'grid4', '#10b981')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Butir</th><th>Pedoman</th>${prodi.map(p => `<th>${prodiTag(p.id)}</th>`).join('')}</tr></thead><tbody>
    ${M0.map((m0, i) => `<tr style="cursor:default"><td><b>${esc(m0.label)}</b><div class="small muted" style="white-space:normal">${esc(m0.acuan)}</div></td><td class="small"><b>${esc(m0.pedoman)}</b></td>
      ${semua.map(x => { const m = x.m[i]; return `<td class="click" data-go="${m.go}" data-p="${x.p.id}" title="${esc(m.bantu)}">${bs(m.st, m.desain)}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>
    <div class="small muted" style="margin-top:6px">Hijau = sesuai, kuning = dekat dengan target, merah = jauh dari target. Arahkan kursor ke sel untuk penjelasan butir.</div></div>

  <div class="card" style="margin-top:14px">${head(`Per semester · ${esc(aktif.id)}`, 'Pedoman Bab IV dibandingkan dengan desain. Ganti prodi lewat pilihan prodi di bagian atas.', 'calendar', '#0ea5e9')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Smt</th><th>SKS<div class="small muted">Pedoman → Desain</div></th><th>SKS teori</th><th>SKS praktik</th><th>Jumlah MK</th><th>JP per minggu</th></tr></thead><tbody>
    ${B.map(r => `<tr class="click" data-go="mk" data-p="${aktif.id}"><td class="num"><b>${r.s}</b></td>
      <td>${esc(String(r.k[0]))} → ${bs(r.stSks, fmt(r.x.sks, 0))}</td>
      <td>${r.k[1] != null ? `${r.k[1]}–${r.k[2]} → ${bs(r.stT, fmt(r.x.T, 0))}` : `<span class="muted">tanpa rentang</span> ${fmt(r.x.T, 0)}`}</td>
      <td>${r.k[1] != null ? `${r.k[3]}–${r.k[4]} → ${bs(r.stP, fmt(r.x.P, 0))}` : `<span class="muted">tanpa rentang</span> ${fmt(r.x.P, 0)}`}</td>
      <td>${r.k[1] != null ? `${r.k[5]}–${r.k[6]} → ${bs(r.stN, fmt(r.x.n, 0))}` : `<span class="muted">-</span> ${fmt(r.x.n, 0)}`}</td>
      <td>${r.jr ? `${fmt(r.jr[0], 1)}–${fmt(r.jr[1], 1)} → ${bs(r.stJp, fmt(r.x.jp, 1))}` : `<span class="muted">-</span> ${fmt(r.x.jp, 1)}`}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="chart" id="k-chart" style="height:280px;margin-top:10px"></div></div>

  <div class="card" style="margin-top:14px" id="k-target">${head('Target dan Pedoman: cara mengubah nilainya', boleh ? 'Hanya Wakil Direktur I, SPM, admin, dan developer yang dapat mengubah. Berlaku untuk semua prodi.' : 'Hanya Wakil Direktur I, SPM, admin, dan developer yang dapat mengubah. Anda dapat melihat nilai yang berlaku.', 'gear', '#f5a524')}
    ${panelTarget(boleh)}</div>`;

  el.querySelectorAll('[data-go]').forEach(a => { if (!bolehMenu(a.dataset.go)) { a.classList.remove('click'); a.style.cursor = 'default'; return; } a.onclick = () => { if (a.dataset.p) { ctx.prodi = a.dataset.p; saveCtx(); } location.hash = '#' + a.dataset.go; }; });

  const c = el.querySelector('#k-chart');
  if (c) chart(c, { tooltip: { trigger: 'axis' }, legend: { top: 0, data: ['SKS teori', 'SKS praktik', 'Target SKS'] }, grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: B.map(r => 'Smt ' + r.s), ...AX }, yAxis: { type: 'value', ...AX },
    series: [{ name: 'SKS teori', type: 'bar', stack: 's', data: B.map(r => r.x.T), itemStyle: { color: '#0ea5e9' }, barWidth: 22 }, { name: 'SKS praktik', type: 'bar', stack: 's', data: B.map(r => r.x.P), itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] } }, { name: 'Target SKS', type: 'line', data: B.map(r => r.k[0]), symbolSize: 8, lineStyle: { type: 'dashed', color: '#f0616d' }, itemStyle: { color: '#f0616d' } }] });

  if (boleh) pasangTarget(el);
  else { const bx = el.querySelector('#k-xl'); if (bx) bx.onclick = () => unduhRevisi(); }
}

/* ---------------- panel target ---------------- */
function panelTarget(boleh) {
  const P = param(S), D = PARAM_DEFAULT, adaUbah = !!(S.settings.param && Object.keys(S.settings.param).some(k => KUNCI_SKALAR.some(x => x[0] === k) || k === 'kerangka'));
  const riw = (S.settings.riwayatTarget || []).slice(0, 8);
  const inp = (id, v, ro) => `<input class="inp" id="${id}" type="number" step="any" value="${v == null ? '' : v}" ${ro ? 'disabled' : ''} style="width:78px;padding:6px 8px">`;
  const ro = !boleh;
  return `<div class="small" style="white-space:normal;margin-bottom:8px">Nilai di bawah adalah target yang dipakai Pemeriksa, Asisten, dan halaman ini. Kolom <b>Pedoman 2027</b> menunjukkan nilai awal; nilai berlaku yang berbeda diberi tanda ubah. ${adaUbah ? '<b>Saat ini ada target yang sudah diubah dari Pedoman 2027.</b>' : 'Saat ini semua target sama dengan Pedoman 2027.'}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Smt</th>${KOLOM_KER.map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>
    ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<tr style="cursor:default"><td class="num"><b>${s}</b></td>${KOLOM_KER.map((_, i) => { const v = P.kerangka[s][i], d0 = D.kerangka[s][i]; return `<td>${v == null ? '<span class="muted">-</span>' : inp(`k-${s}-${i}`, v, ro)}${v !== d0 ? `<div class="small" style="color:#b45309">ubah (Pedoman ${d0 == null ? '-' : d0})</div>` : ''}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>
    <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Butir</th><th>Pedoman 2027</th><th>Berlaku</th></tr></thead><tbody>
    ${KUNCI_SKALAR.map(([k, lb, sat]) => `<tr style="cursor:default"><td>${esc(lb)} <span class="muted small">(${sat})</span></td><td>${esc(String(D[k]))}</td><td>${inp('s-' + k, P[k], ro)}${P[k] !== D[k] ? ' <span class="small" style="color:#b45309">ubah</span>' : ''}</td></tr>`).join('')}
    </tbody></table></div>
    ${boleh ? `<label class="small" style="display:block;margin-top:10px">Alasan perubahan (wajib, tercatat di riwayat)<textarea class="inp" id="k-alasan" rows="2" style="width:100%;box-sizing:border-box" placeholder="Misalnya: disepakati rapat prodi, semester 6 menjadi 16 SKS karena kebutuhan capstone"></textarea></label>
      <div class="drawer-act" style="flex-wrap:wrap;margin-top:8px"><button class="btn pri" id="k-simpan">${icon('check')} Simpan target</button><button class="btn" id="k-balik" ${adaUbah ? '' : 'disabled'}>Kembalikan ke Pedoman 2027</button><button class="btn" id="k-xl">${icon('download')} Unduh usulan revisi Pedoman (Excel)</button></div>`
      : `<div class="drawer-act" style="margin-top:8px"><button class="btn" id="k-xl">${icon('download')} Unduh daftar target (Excel)</button></div>`}
    <div class="small muted" style="margin-top:8px;white-space:normal">Unduhan memuat nilai Pedoman 2027, nilai berlaku, dan riwayat alasan, sebagai bahan merevisi dokumen Pedoman bila perubahan disepakati.</div>
    ${riw.length ? `<div style="margin-top:10px"><b class="small">Riwayat perubahan target</b><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Oleh</th><th>Perubahan</th><th>Alasan</th></tr></thead><tbody>${riw.map(r => `<tr style="cursor:default"><td class="small">${esc(new Date(r.t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }))}</td><td class="small">${esc(r.oleh || '')}</td><td class="small" style="white-space:normal">${esc((r.ubah || []).slice(0, 6).map(u => `${u.nama}: ${u.dari} → ${u.ke}`).join('; '))}${(r.ubah || []).length > 6 ? ` dan ${(r.ubah || []).length - 6} lainnya` : ''}</td><td class="small" style="white-space:normal">${esc(r.alasan || '')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}

/** Daftar nilai target saat ini dan Pedoman 2027 untuk perbandingan: [{kunci, nama, pedoman, berlaku}]. */
function daftarTarget() {
  const P = param(S), D = PARAM_DEFAULT, o = [];
  for (let s = 1; s <= 8; s++) KOLOM_KER.forEach((kl, i) => { const a = D.kerangka[s][i], b = P.kerangka[s][i]; if (a == null && b == null) return; o.push({ kunci: `kerangka.${s}.${i}`, nama: `Semester ${s}, ${kl}`, pedoman: a == null ? '' : a, berlaku: b == null ? '' : b }); });
  KUNCI_SKALAR.forEach(([k, lb, sat]) => o.push({ kunci: k, nama: `${lb} (${sat})`, pedoman: D[k], berlaku: P[k] }));
  return o;
}

async function unduhRevisi() {
  const X = await loadXLSX(), wb = X.utils.book_new(), L = daftarTarget(), riw = S.settings.riwayatTarget || [];
  const ws = X.utils.aoa_to_sheet([['Butir', 'Pedoman 2027', 'Berlaku', 'Status'], ...L.map(x => [x.nama, x.pedoman, x.berlaku, String(x.pedoman) !== String(x.berlaku) ? 'DIUBAH, perlu direvisi di Pedoman' : 'Sama'])]); ws['!cols'] = [{ wch: 56 }, { wch: 16 }, { wch: 12 }, { wch: 38 }]; X.utils.book_append_sheet(wb, ws, 'TARGET');
  const wr = X.utils.aoa_to_sheet([['Waktu', 'Oleh', 'Butir', 'Dari', 'Ke', 'Alasan'], ...riw.flatMap(r => (r.ubah || []).map(u => [r.t, r.oleh || '', u.nama, u.dari, u.ke, r.alasan || '']))]); wr['!cols'] = [{ wch: 26 }, { wch: 28 }, { wch: 44 }, { wch: 10 }, { wch: 10 }, { wch: 60 }]; X.utils.book_append_sheet(wb, wr, 'RIWAYAT');
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), 'Usulan_Revisi_Pedoman_Target.xlsx');
}

function pasangTarget(el) {
  const bx = el.querySelector('#k-xl'); if (bx) bx.onclick = () => unduhRevisi();
  el.querySelector('#k-simpan').onclick = async () => {
    const P = param(S), alasan = el.querySelector('#k-alasan').value.trim();
    const ker = JSON.parse(JSON.stringify(P.kerangka)), baru = {}, ubah = [];
    for (let s = 1; s <= 8; s++) KOLOM_KER.forEach((kl, i) => { const e = el.querySelector(`#k-${s}-${i}`); if (!e) return; const v = e.value === '' ? null : +e.value; if (v == null || Number.isNaN(v) || v < 0) return; if (v !== P.kerangka[s][i]) { ker[s][i] = v; ubah.push({ nama: `Semester ${s}, ${kl}`, dari: P.kerangka[s][i], ke: v }); } });
    KUNCI_SKALAR.forEach(([k, lb]) => { const e = el.querySelector('#s-' + k), v = e && e.value !== '' ? +e.value : null; if (v == null || Number.isNaN(v) || v < 0) return; if (v !== P[k]) { baru[k] = v; ubah.push({ nama: lb, dari: P[k], ke: v }); } });
    for (let s = 1; s <= 6; s++) { const k = ker[s]; if (k[1] > k[2] || k[3] > k[4] || k[5] > k[6]) { toast(`Semester ${s}: nilai minimal tidak boleh lebih besar dari maksimal.`); return; } }
    if (baru.mkProdiMin != null || baru.mkProdiMax != null) { const lo = baru.mkProdiMin != null ? baru.mkProdiMin : P.mkProdiMin, hi = baru.mkProdiMax != null ? baru.mkProdiMax : P.mkProdiMax; if (lo > hi) { toast('Jumlah MK minimal tidak boleh lebih besar dari maksimal.'); return; } }
    if (!ubah.length) { toast('Tidak ada nilai yang diubah.'); return; }
    if (!alasan) { toast('Isi alasan perubahan lebih dulu.'); return; }
    if (!(await tanya(`Simpan ${ubah.length} perubahan target untuk SEMUA prodi? Pemeriksa dan semua dasbor langsung memakai nilai baru.`, 'Ya, simpan'))) return;
    S.settings.param = { ...(S.settings.param || {}), ...baru, kerangka: ker };
    S.settings.riwayatTarget = [{ t: new Date().toISOString(), oleh: userName(), alasan, ubah }].concat(S.settings.riwayatTarget || []).slice(0, 100);
    await saveSettings(); await addLog(`Ubah target Pedoman (${ubah.length} butir): ${alasan}`);
    toast('Target tersimpan. Pedoman perlu direvisi sesuai daftar perubahan.'); kesesuaianView(el);
  };
  const bb = el.querySelector('#k-balik'); if (bb) bb.onclick = async () => {
    if (!(await tanya('Kembalikan semua target ke nilai Pedoman Edisi 2027? Target lain di Parameter (durasi praktik, kode, dan sebagainya) tidak berubah.', 'Ya, kembalikan'))) return;
    const L = daftarTarget().filter(x => String(x.pedoman) !== String(x.berlaku)), pr = { ...(S.settings.param || {}) };
    KUNCI_SKALAR.forEach(([k]) => delete pr[k]); delete pr.kerangka; S.settings.param = pr;
    S.settings.riwayatTarget = [{ t: new Date().toISOString(), oleh: userName(), alasan: 'Dikembalikan ke Pedoman Edisi 2027', ubah: L.map(x => ({ nama: x.nama, dari: x.berlaku, ke: x.pedoman })) }].concat(S.settings.riwayatTarget || []).slice(0, 100);
    await saveSettings(); await addLog('Target Pedoman dikembalikan ke Edisi 2027'); toast('Target dikembalikan ke Pedoman 2027.'); kesesuaianView(el);
  };
}
