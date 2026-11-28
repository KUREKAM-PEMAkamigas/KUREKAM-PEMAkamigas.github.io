/* KUREKAM · Kesesuaian Pedoman: satu halaman yang menyandingkan target Pedoman dengan desain kurikulum tiap prodi.
   Semua angka memakai mesin yang sama dengan Pemeriksa (struktur, param). Baris dapat diklik menuju menu yang dituju.
   Target dapat diubah oleh peran yang berwenang (Wadir I, SPM, admin, developer) dengan alasan tercatat, dan dikembalikan ke Pedoman 2027. */
import { S, ctx, saveCtx, bolehMenu, esc, icon, toast, saveSettings, addLog, can, userName } from '../app.js';
import { DB } from '../db.js';
import { PARAM_DEFAULT } from '../config.js';
import { struktur, param, fmt, jpRange, grupOf } from '../rules.js';
import { chart, AX } from '../charts.js';
import { kartuPenetapanSemua, pasangPenetapanSemua } from '../penetapan.js';
import { bukaParameter } from './induk.js';
import { head, prodiTag, stTag, tanya, unduh, loadXLSX } from './ui.js';

const KUNCI_SKALAR = [
  ['totalSksMin', 'Total SKS minimal', 'SKS'], ['totalSksMax', 'Total SKS maksimal (aturan Dikti)', 'SKS'], ['mkProdiMin', 'Jumlah MK per prodi, minimal', 'MK'], ['mkProdiMax', 'Jumlah MK per prodi, maksimal', 'MK'],
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
    { label: 'Total SKS', acuan: 'Permen 39/2025 (maks. 156), Pedoman Bab IV', pedoman: `${P.totalSksMin}–${P.totalSksMax}`, desain: d(R.total, 0), st: R.total > P.totalSksMax ? 'bad' : nilaiSt(R.total >= P.totalSksMin, R.total >= P.totalSksMin - 2), go: 'mk', bantu: 'Jumlah seluruh SKS mata kuliah prodi.' },
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

  ${kartuPenetapanSemua(prodi)}
  <div class="card" style="margin-top:14px" id="k-target">${head('Mengubah target Pedoman', 'Semua pengaturan ada di satu tempat: Data Induk > Parameter', 'gear', '#6366f1')}
    <div class="small" style="white-space:normal;margin-bottom:8px">Nilai Pedoman di atas (SKS total minimal dan maksimal, SKS dan rentang tiap semester, jumlah MK, porsi praktik, dan lainnya) diatur di menu <b>Data Induk > Parameter</b>, bersama batas CPMK, Sub-CPMK, dan indikator RPS. Yang dapat mengubah: Wakil Direktur I, SPM, Admin, dan Developer. Setiap perubahan wajib beralasan dan tercatat di riwayat.</div>
    <div class="drawer-act" style="flex-wrap:wrap">${boleh ? `<button class="btn pri" id="k-buka">${icon('gear')} Buka Parameter</button>` : ''}<button class="btn" id="k-xl">${icon('download')} Unduh usulan revisi Pedoman (Excel)</button></div></div>`;

  el.querySelectorAll('[data-go]').forEach(a => { if (!bolehMenu(a.dataset.go)) { a.classList.remove('click'); a.style.cursor = 'default'; return; } a.onclick = () => { if (a.dataset.p) { ctx.prodi = a.dataset.p; saveCtx(); } location.hash = '#' + a.dataset.go; }; });

  const c = el.querySelector('#k-chart');
  if (c) chart(c, { tooltip: { trigger: 'axis' }, legend: { top: 0, data: ['SKS teori', 'SKS praktik', 'Target SKS'] }, grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: B.map(r => 'Smt ' + r.s), ...AX }, yAxis: { type: 'value', ...AX },
    series: [{ name: 'SKS teori', type: 'bar', stack: 's', data: B.map(r => r.x.T), itemStyle: { color: '#0ea5e9' }, barWidth: 22 }, { name: 'SKS praktik', type: 'bar', stack: 's', data: B.map(r => r.x.P), itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] } }, { name: 'Target SKS', type: 'line', data: B.map(r => r.k[0]), symbolSize: 8, lineStyle: { type: 'dashed', color: '#f0616d' }, itemStyle: { color: '#f0616d' } }] });

  pasangPenetapanSemua(el);
  const bx = el.querySelector('#k-xl'); if (bx) bx.onclick = () => unduhRevisi();
  const bk = el.querySelector('#k-buka'); if (bk) bk.onclick = () => { bukaParameter(); location.hash = '#induk'; };
}

/** Daftar nilai target saat ini dan Pedoman 2027 untuk perbandingan: [{kunci, nama, pedoman, berlaku}]. */
export function daftarTarget() {
  const P = param(S), D = PARAM_DEFAULT, o = [];
  for (let s = 1; s <= 8; s++) KOLOM_KER.forEach((kl, i) => { const a = D.kerangka[s][i], b = P.kerangka[s][i]; if (a == null && b == null) return; o.push({ kunci: `kerangka.${s}.${i}`, nama: `Semester ${s}, ${kl}`, pedoman: a == null ? '' : a, berlaku: b == null ? '' : b }); });
  KUNCI_SKALAR.forEach(([k, lb, sat]) => o.push({ kunci: k, nama: `${lb} (${sat})`, pedoman: D[k], berlaku: P[k] }));
  return o;
}

export async function unduhRevisi() {
  const X = await loadXLSX(), wb = X.utils.book_new(), L = daftarTarget(), riw = S.settings.riwayatTarget || [];
  const ws = X.utils.aoa_to_sheet([['Butir', 'Pedoman 2027', 'Berlaku', 'Status'], ...L.map(x => [x.nama, x.pedoman, x.berlaku, String(x.pedoman) !== String(x.berlaku) ? 'DIUBAH, perlu direvisi di Pedoman' : 'Sama'])]); ws['!cols'] = [{ wch: 56 }, { wch: 16 }, { wch: 12 }, { wch: 38 }]; X.utils.book_append_sheet(wb, ws, 'TARGET');
  const wr = X.utils.aoa_to_sheet([['Waktu', 'Oleh', 'Butir', 'Dari', 'Ke', 'Alasan'], ...riw.flatMap(r => (r.ubah || []).map(u => [r.t, r.oleh || '', u.nama, u.dari, u.ke, r.alasan || '']))]); wr['!cols'] = [{ wch: 26 }, { wch: 28 }, { wch: 44 }, { wch: 10 }, { wch: 10 }, { wch: 60 }]; X.utils.book_append_sheet(wb, wr, 'RIWAYAT');
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), 'Usulan_Revisi_Pedoman_Target.xlsx');
}
