/* KUREKAM · Ruang Pantau (Wakil Direktur I) dan Kinerja Saya (dosen, prodi). */
import { S, ctx, esc, icon, openDrawer, saveSettings, toast, addLog } from '../app.js';
import { DB } from '../db.js';
import { PERAN } from '../config.js';
import { chart, PAL, AX } from '../charts.js';
import { kpi, head, prodiTag, bar, pctColor, unduh, loadXLSX, formDrawer } from './ui.js';
import { JENIS, AKTIF_MENIT, rangkumJejak, pendengar, BOLEH_PANTAU } from '../jejak.js';
import { kinerjaSemua, kinerjaProdi, kinerjaDosen, bobotKinerja, BOBOT_BAWAAN } from '../kinerja.js';

const TABS = [['aktif', 'Aktif & kabar langsung'], ['linimasa', 'Linimasa'], ['partisipasi', 'Partisipasi akun'], ['dosen', 'Grafik kerja dosen'], ['prodi', 'Grafik kerja prodi']];
let tab = 'aktif', rentang = 30, J = [], SESI = [], muatPada = 0, saring = { q: '', prodi: '', peran: '', jenis: '' }, urutDosen = 'skor';
const nmPeran = (k) => (PERAN[k] || {}).nama || k || '-';
const wkt = (iso) => iso ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
const lalu = (iso) => { if (!iso) return 'belum pernah'; const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'baru saja' : m < 60 ? m + ' menit lalu' : m < 1440 ? Math.round(m / 60) + ' jam lalu' : Math.round(m / 1440) + ' hari lalu'; };
const jTag = (j) => { const x = JENIS[j] || [j, '#64748b']; return `<span class="tag" style="--c:${x[1]}">${x[0]}</span>`; };
const skorTag = (v) => v == null ? '<span class="muted small">belum dinilai</span>' : `${bar(v, pctColor(v), '70px')} <b class="small">${v}</b>`;

async function muat(paksa) {
  if (!paksa && Date.now() - muatPada < 120000 && J.length) return;
  const sejak = new Date(Date.now() - rentang * 864e5).toISOString();
  [J, SESI] = await Promise.all([DB.ambilSejak('jejak', sejak, 10000), DB.ambilSemua('sesi')]);
  muatPada = Date.now();
  rawat();
}
/* Perawatan ringan sekali sehari: jejak lebih dari 90 hari dihapus agar kuota Firebase aman. */
async function rawat() {
  try { const k = 'kurekam_rawat_jejak', h = new Date().toISOString().slice(0, 10); if (localStorage.getItem(k) === h) return; localStorage.setItem(k, h); } catch (e) { return; }
  const batas = new Date(Date.now() - 90 * 864e5).toISOString(); let n = 0, x;
  do { x = await DB.hapusSebelum('jejak', batas); n += x; } while (x >= 400 && n < 4000);
}

const aktifKini = () => SESI.filter(s => s.terakhir && Date.now() - new Date(s.terakhir) < AKTIF_MENIT * 60000).sort((a, b) => b.terakhir.localeCompare(a.terakhir));
const hariIniIso = () => new Date().toISOString().slice(0, 10);

export function pantauView(el) {
  if (!BOLEH_PANTAU.includes(ctx.role)) { el.innerHTML = '<div class="card empty">Ruang Pantau hanya untuk Wakil Direktur I.</div>'; return; }
  if (DB.mode !== 'firebase') { el.innerHTML = `<div class="card">${head('Ruang Pantau', 'Aktivitas pengguna', 'eye', '#8b5cf6')}<div class="empty">Ruang Pantau membaca aktivitas akun di Firebase, sehingga hanya berjalan setelah masuk dengan akun (bukan mode demo atau simulasi).</div></div>`; return; }
  el.innerHTML = `<div class="card empty">${icon('pulse')} Memuat aktivitas pengguna...</div>`;
  muat().then(() => gambar(el)).catch(e => { el.innerHTML = `<div class="card empty">Gagal memuat aktivitas: ${esc(e.message)}. Bila ini pertama kali, tunggu pengguna lain membuka aplikasi versi terbaru.</div>`; });
  /* kabar langsung: jejak baru masuk ke daftar tanpa memuat ulang */
  const f = (d) => { if (!document.body.contains(el)) { pendengar.delete(f); return; } if (!J.some(x => x.id === d.id)) J.unshift(d); const s = SESI.find(x => x.uid === d.uid); if (s) { s.terakhir = d.t; s.hal = d.hal; } else SESI.push({ ...d, id: d.uid, terakhir: d.t }); if (tab === 'aktif' || tab === 'linimasa') isiTab(el); };
  pendengar.add(f);
  clearInterval(pantauView.t); pantauView.t = setInterval(() => { if (!document.body.contains(el)) { clearInterval(pantauView.t); return; } DB.ambilSemua('sesi').then(s => { SESI = s; if (tab === 'aktif') isiTab(el); }).catch(() => {}); }, 60000);
}

function gambar(el) {
  const hi = hariIniIso(), jHari = J.filter(x => (x.t || '').slice(0, 10) === hi);
  const masukHari = new Set(jHari.filter(x => x.jenis === 'masuk').map(x => x.email)).size;
  const akun = S.pengguna || [], pernah = new Set([...SESI.map(s => s.email), ...J.map(x => x.email)]);
  const belum = akun.filter(u => !pernah.has((u.email || '').toLowerCase()) && !u.sandiDiubah).length;
  el.innerHTML = `<div class="card">${head('Ruang Pantau', 'Siapa yang masuk, apa yang dikerjakan, dan seberapa produktif dosen serta prodi', 'eye', '#8b5cf6', `<button class="btn sm" id="pt-ulang">${icon('loop')} Muat ulang</button><button class="btn sm" id="pt-xls">${icon('download')} Unduh Excel</button>`)}
    <div class="grid g4" style="margin-top:10px">${kpi('Sedang aktif', aktifKini().length, `dalam ${AKTIF_MENIT} menit terakhir`, '#10b981', 'pulse')}${kpi('Masuk hari ini', masukHari, 'akun berbeda', '#0ea5e9', 'user')}${kpi('Simpan hari ini', jHari.filter(x => x.jenis === 'simpan').length, 'perubahan data', '#8b5cf6', 'check')}${kpi('Belum pernah masuk', belum, `dari ${akun.length} akun terdaftar`, '#f0616d', 'alert')}</div>
    <div class="ribbon info small" style="margin-top:10px">${icon('info')} Yang tercatat: masuk, halaman yang dibuka, simpan, dan hapus, sejak fitur ini dipasang (24 Nov 2026). Percobaan masuk yang gagal tidak tercatat. Tidak mencatat IP, lokasi, atau isi ketikan. Catatan lebih dari 90 hari dihapus otomatis.</div></div>
    <div class="filters" style="margin-top:14px"><div class="seg scroll">${TABS.map(([k, t]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('')}</div><div class="sp"></div>
      <select class="inp" id="pt-rentang" style="width:auto">${[7, 30, 90].map(n => `<option value="${n}" ${n === rentang ? 'selected' : ''}>${n} hari terakhir</option>`).join('')}</select></div><div id="pt-isi"></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; el.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); isiTab(el); });
  el.querySelector('#pt-rentang').onchange = async (e) => { rentang = +e.target.value; await muat(true); gambar(el); };
  el.querySelector('#pt-ulang').onclick = async () => { await muat(true); gambar(el); toast('Data aktivitas dimuat ulang.'); };
  el.querySelector('#pt-xls').onclick = () => unduhExcel();
  isiTab(el);
}

function isiTab(el) {
  const box = el.querySelector('#pt-isi'); if (!box) return;
  ({ aktif: tabAktif, linimasa: tabLinimasa, partisipasi: tabPartisipasi, dosen: tabDosen, prodi: tabProdi })[tab](box);
}

function tabAktif(box) {
  const ak = aktifKini(), kabar = J.filter(x => x.jenis !== 'buka').slice(0, 25);
  box.innerHTML = `<div class="grid g2" style="margin-top:12px"><div class="card">${head('Sedang aktif sekarang', 'Diperbarui tiap menit', 'pulse', '#10b981')}
    ${ak.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Peran</th><th>Sedang membuka</th><th>Perangkat</th><th>Terakhir</th></tr></thead><tbody>${ak.map(s => `<tr><td><span class="st ok" title="aktif">●</span> <b>${esc(s.nama)}</b><br><span class="small muted">${esc(s.email)}</span></td><td>${esc(nmPeran(s.peran))} ${s.prodi && !['wadir', 'pimpinan', 'spm', 'akademik'].includes(s.peran) ? prodiTag(s.prodi) : ''}</td><td>${esc(s.hal || '-')}</td><td>${esc(s.perangkat || '-')}</td><td class="small">${lalu(s.terakhir)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Belum ada yang aktif saat ini.</div>'}</div>
    <div class="card">${head('Kabar terbaru', 'Masuk, simpan, dan hapus. Notifikasi juga muncul di layar Anda saat terjadi.', 'spark', '#8b5cf6')}
    ${kabar.length ? `<div class="tl">${kabar.map(x => `<div style="padding:6px 0;border-bottom:1px solid var(--line,#eee)"><div class="small muted">${wkt(x.t)} · ${jTag(x.jenis)}</div><div><b>${esc(x.nama)}</b> <span class="small muted">${esc(nmPeran(x.peran))}${x.prodi ? ' ' + esc(x.prodi) : ''}</span></div><div class="small">${esc(x.aksi)}</div></div>`).join('')}</div>` : '<div class="empty">Belum ada kabar.</div>'}</div></div>`;
}

function tabLinimasa(box) {
  const prodiOpt = S.prodi.map(p => `<option ${saring.prodi === p.id ? 'selected' : ''}>${p.id}</option>`).join('');
  const L = J.filter(x => (!saring.prodi || x.prodi === saring.prodi) && (!saring.peran || x.peran === saring.peran) && (!saring.jenis || x.jenis === saring.jenis)
    && (!saring.q || (x.nama + ' ' + x.email + ' ' + x.aksi).toLowerCase().includes(saring.q.toLowerCase())));
  box.innerHTML = `<div class="card" style="margin-top:12px">${head('Linimasa aktivitas', `${L.length} kejadian dalam ${rentang} hari`, 'calendar', '#0ea5e9')}
    <div class="filters"><input class="inp" id="lf-q" placeholder="Cari nama, email, atau aksi" value="${esc(saring.q)}" style="max-width:260px">
      <select class="inp" id="lf-p" style="width:auto"><option value="">Semua prodi</option>${prodiOpt}</select>
      <select class="inp" id="lf-r" style="width:auto"><option value="">Semua peran</option>${Object.keys(PERAN).map(k => `<option value="${k}" ${saring.peran === k ? 'selected' : ''}>${PERAN[k].nama}</option>`).join('')}</select>
      <select class="inp" id="lf-j" style="width:auto"><option value="">Semua jenis</option>${Object.keys(JENIS).map(k => `<option value="${k}" ${saring.jenis === k ? 'selected' : ''}>${JENIS[k][0]}</option>`).join('')}</select></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Nama</th><th>Peran</th><th>Jenis</th><th>Aksi / halaman</th></tr></thead><tbody>
    ${L.slice(0, 400).map(x => `<tr><td class="small">${wkt(x.t)}</td><td><b>${esc(x.nama)}</b><br><span class="small muted">${esc(x.email)}</span></td><td>${esc(nmPeran(x.peran))} ${x.prodi ? prodiTag(x.prodi) : ''}</td><td>${jTag(x.jenis)}</td><td class="small">${esc(x.aksi || x.hal)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Tidak ada kejadian.</td></tr>'}
    </tbody></table></div>${L.length > 400 ? '<div class="small muted">Ditampilkan 400 kejadian terbaru. Semua kejadian ada di unduhan Excel.</div>' : ''}</div>`;
  const ulang = () => isiTab(box.closest('#view') || document);
  box.querySelector('#lf-q').onchange = (e) => { saring.q = e.target.value; ulang(); };
  box.querySelector('#lf-p').onchange = (e) => { saring.prodi = e.target.value; ulang(); };
  box.querySelector('#lf-r').onchange = (e) => { saring.peran = e.target.value; ulang(); };
  box.querySelector('#lf-j').onchange = (e) => { saring.jenis = e.target.value; ulang(); };
}

function barisPartisipasi() {
  const per = rangkumJejak(J), sesi = new Map(SESI.map(s => [s.email, s]));
  return (S.pengguna || []).map(u => {
    const em = (u.email || '').toLowerCase(), a = per.get(em), s = sesi.get(em);
    const terakhir = [a && a.terakhir, s && s.terakhir].filter(Boolean).sort().pop() || '';
    const pernah = !!terakhir || !!u.sandiDiubah;
    return { u, em, a, terakhir, pernah, sandi: u.sandiDiubah ? 'Sudah diganti' : u.sandiAwal ? 'Masih sandi awal' : '-', hari: a ? a.hari.size : 0, simpan: a ? a.simpan : 0, aksi: a ? a.aksiTerakhir : '' };
  }).sort((x, y) => (x.pernah - y.pernah) || (y.terakhir || '').localeCompare(x.terakhir || ''));
}
function tabPartisipasi(box) {
  const B = barisPartisipasi(), belum = B.filter(x => !x.pernah);
  box.innerHTML = `<div class="card" style="margin-top:12px">${head('Partisipasi akun', `${B.length - belum.length} sudah pernah masuk · ${belum.length} belum pernah`, 'user', '#f5a524')}
    ${belum.length ? `<div class="ribbon bad small">${icon('alert')} Belum pernah masuk: ${belum.slice(0, 40).map(x => esc(x.u.nama || x.em)).join(', ')}${belum.length > 40 ? ' dan lainnya' : ''}.</div>` : ''}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Peran</th><th>Status</th><th>Terakhir aktif</th><th>Hari aktif</th><th>Simpan</th><th>Kata sandi</th><th>Aksi terakhir</th></tr></thead><tbody>
    ${B.map(x => `<tr><td><b>${esc(x.u.nama || '')}</b><br><span class="small muted">${esc(x.em)}</span></td><td class="small">${(x.u.peran || []).map(nmPeran).join(', ')} ${x.u.prodi ? prodiTag(x.u.prodi) : ''}</td><td>${x.pernah ? '<span class="st ok">Pernah masuk</span>' : '<span class="st bad">Belum pernah</span>'}</td><td class="small">${lalu(x.terakhir)}</td><td class="num">${x.hari}</td><td class="num">${x.simpan}</td><td class="small">${x.sandi}</td><td class="small">${esc(x.aksi || '-')}</td></tr>`).join('')}
    </tbody></table></div><div class="small muted" style="margin-top:6px">"Pernah masuk" dihitung dari catatan sejak fitur ini dipasang, atau dari akun yang sudah mengganti kata sandi awal. Riwayat masuk lengkap tetap ada di Firebase Console, Authentication.</div></div>`;
}

function dataDosen() { return kinerjaSemua(S, rangkumJejak(J)); }
function tabDosen(box) {
  const B = bobotKinerja(S), semua = dataDosen(), pf = saring.prodi;
  const L = semua.filter(x => !pf || x.prodi === pf).sort((a, b) => urutDosen === 'tertinggal' ? (a.skor ?? -1) - (b.skor ?? -1) : urutDosen === 'aktif' ? b.hariAktif - a.hariAktif : (b.skor ?? -1) - (a.skor ?? -1));
  const top = L.filter(x => x.skor != null).slice(0, 20);
  box.innerHTML = `<div class="card" style="margin-top:12px">${head('Grafik kerja dosen', `Skor = Hasil ${B.hasil}% + Tepat waktu ${B.tepat}% + Mutu ${B.mutu}%. Hasil dibandingkan jumlah mata kuliah yang ditugaskan.`, 'pulse', '#10b981', `<button class="btn sm" id="kd-bobot">${icon('gear')} Ubah bobot</button>`)}
    <div class="filters"><select class="inp" id="kd-p" style="width:auto"><option value="">Semua prodi (homebase)</option>${S.prodi.map(p => `<option ${pf === p.id ? 'selected' : ''}>${p.id}</option>`).join('')}</select>
      <div class="seg">${[['skor', 'Paling produktif'], ['tertinggal', 'Paling tertinggal'], ['aktif', 'Paling aktif']].map(([k, t]) => `<button data-u="${k}" class="${urutDosen === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <div class="grid g2"><div id="kd-c1" style="height:${Math.max(260, top.length * 22 + 40)}px"></div><div id="kd-c2" style="height:260px"></div></div>
    <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Dosen</th><th>Prodi</th><th>MK</th><th>Status</th><th>Skor</th><th>Hasil</th><th>Tepat waktu</th><th>Mutu</th><th>Hari aktif</th><th>Sedang mengerjakan</th></tr></thead><tbody>
    ${L.map(x => `<tr class="click" data-d="${esc(x.d.id)}"><td><b>${esc(x.d.nama)}</b>${x.email ? '' : '<br><span class="small muted">belum punya akun</span>'}</td><td>${x.prodi ? prodiTag(x.prodi) : ''}</td><td class="num">${x.selesai}/${x.nMk}</td><td>${esc(x.status)}</td><td>${skorTag(x.skor)}</td><td class="num">${x.hasil ?? '-'}</td><td class="num">${x.tepat ?? '-'}</td><td class="num">${x.mutu ?? '-'}</td><td class="num">${x.hariAktif}</td><td class="small">${esc((x.rinci.find(k => k.stRps !== 'disahkan') || x.rinci[0] || {}).langkah || '-')}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">Belum ada dosen bertugas.</td></tr>'}
    </tbody></table></div><div class="small muted" style="margin-top:6px">Klik nama untuk melihat rincian per mata kuliah. "Belum dinilai" berarti belum ada mata kuliah yang ditugaskan atau tenggat belum lewat. Gunakan sebagai bahan pembinaan, bukan satu-satunya dasar penilaian kinerja.</div></div>`;
  chart(box.querySelector('#kd-c1'), { tooltip: { trigger: 'axis' }, grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true }, xAxis: { type: 'value', max: 100, ...AX }, yAxis: { type: 'category', inverse: true, data: top.map(x => x.d.nama.replace(/,.*$/, '')), ...AX },
    series: [{ type: 'bar', data: top.map(x => ({ value: x.skor, itemStyle: { color: pctColor(x.skor), borderRadius: 4 } })), label: { show: true, position: 'right' } }] });
  const st = ['Selesai', 'Berjalan', 'Mulai', 'Belum mulai'];
  chart(box.querySelector('#kd-c2'), { tooltip: { trigger: 'item' }, legend: { bottom: 0 }, series: [{ type: 'pie', radius: ['45%', '70%'], data: st.map((s, i) => ({ name: s, value: L.filter(x => x.status === s).length, itemStyle: { color: ['#10b981', '#0ea5e9', '#f5a524', '#f0616d'][i] } })) }] });
  box.querySelector('#kd-p').onchange = (e) => { saring.prodi = e.target.value; tabDosen(box); };
  box.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { urutDosen = b.dataset.u; tabDosen(box); });
  box.querySelectorAll('[data-d]').forEach(tr => tr.onclick = () => rincianDosen(semua.find(x => x.d.id === tr.dataset.d)));
  box.querySelector('#kd-bobot').onclick = ubahBobot;
}

function rincianDosen(x) {
  if (!x) return;
  const jd = J.filter(j => j.dosen === x.d.id || (x.email && j.email === x.email)), minggu = {};
  jd.filter(j => j.jenis === 'simpan' || j.jenis === 'hapus').forEach(j => { const d = new Date(j.t); const m = new Date(d - ((d.getDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); minggu[m] = (minggu[m] || 0) + 1; });
  const ks = Object.keys(minggu).sort();
  openDrawer(`<div class="card-h"><h3>${esc(x.d.nama)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="grid g4 mini" style="margin:8px 0"><div><small>Skor</small><b>${x.skor ?? '-'}</b></div><div><small>Hasil</small><b>${x.hasil ?? '-'}</b></div><div><small>Tepat waktu</small><b>${x.tepat ?? '-'}</b></div><div><small>Mutu</small><b>${x.mutu ?? '-'}</b></div></div>
    <div class="small muted">${x.email ? esc(x.email) + ' · terakhir aktif ' + lalu(x.terakhir) : 'Belum punya akun masuk'}${x.tenggat ? ' · tenggat RPS ' + esc(x.tenggat) : ''}</div>
    <h4 style="margin:12px 0 6px">Mata kuliah yang ditugaskan</h4>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mata kuliah</th><th>Kemajuan</th><th>Langkah sekarang</th><th>Catatan verifikasi</th></tr></thead><tbody>
    ${x.rinci.map(k => `<tr><td><b>${esc(k.m.kode || '')}</b> ${esc(k.m.nama)}</td><td>${bar(Math.round(k.hasil * 100), pctColor(k.hasil * 100), '70px')} <span class="small">${Math.round(k.hasil * 100)}%</span></td><td class="small">${esc(k.langkah)}</td><td class="small">${k.perbaiki ? `<span class="st bad">${k.perbaiki} perlu perbaikan</span>` : k.mutu === 1 ? '<span class="st ok">Terverifikasi</span>' : '-'}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Belum ada mata kuliah yang ditugaskan.</td></tr>'}
    </tbody></table></div>
    <h4 style="margin:12px 0 6px">Aktivitas per minggu (simpan dan hapus)</h4><div id="rd-c" style="height:200px">${ks.length ? '' : '<div class="empty">Belum ada aktivitas tercatat.</div>'}</div>
    <h4 style="margin:12px 0 6px">Kejadian terakhir</h4><div class="small">${jd.filter(j => j.jenis !== 'buka').slice(0, 15).map(j => `<div>${wkt(j.t)} · ${esc(j.aksi)}</div>`).join('') || '<span class="muted">-</span>'}</div>`, (d) => {
    if (ks.length) chart(d.querySelector('#rd-c'), { tooltip: { trigger: 'axis' }, grid: { left: 8, right: 8, top: 10, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: ks.map(k => k.slice(5)), ...AX }, yAxis: { type: 'value', ...AX }, series: [{ type: 'bar', data: ks.map(k => minggu[k]), itemStyle: { color: '#8b5cf6', borderRadius: 4 } }] });
  }, true);
}

function ubahBobot() {
  const B = bobotKinerja(S);
  formDrawer({ title: 'Bobot skor kinerja', sub: 'Jumlah ketiga bobot sebaiknya 100', obj: { ...B },
    fields: [{ k: 'hasil', label: 'Hasil kerja (RPS, Sub-CPMK, SAP, ACP, realisasi) dibanding beban', type: 'number' }, { k: 'tepat', label: 'Tepat waktu terhadap tenggat jadwal RPS', type: 'number' }, { k: 'mutu', label: 'Mutu (hasil verifikasi SPM, Akademik, Kaprodi)', type: 'number' }],
    onSave: async (o) => { const b = { hasil: +o.hasil || 0, tepat: +o.tepat || 0, mutu: +o.mutu || 0 }; if (b.hasil + b.tepat + b.mutu !== 100) return 'Jumlah bobot harus 100.';
      S.settings.param = { ...(S.settings.param || {}), kinerjaBobot: b }; await saveSettings(); await addLog(`Bobot kinerja diubah: hasil ${b.hasil}, tepat ${b.tepat}, mutu ${b.mutu}`); } });
}

function tabProdi(box) {
  const P = kinerjaProdi(S, dataDosen());
  const hari = []; for (let i = Math.min(rentang, 30) - 1; i >= 0; i--) hari.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  box.innerHTML = `<div class="card" style="margin-top:12px">${head('Grafik kerja prodi', 'Rata-rata skor dosen per homebase, kemajuan RPS, dan aktivitas harian', 'dash', '#0ea5e9')}
    <div class="grid g2"><div id="kp-c1" style="height:260px"></div><div id="kp-c2" style="height:260px"></div></div><div id="kp-c3" style="height:260px;margin-top:10px"></div>
    <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Prodi</th><th>Skor rata-rata</th><th>Dosen bertugas</th><th>Selesai</th><th>Berjalan</th><th>Belum mulai</th><th>RPS disahkan</th><th>RPS diajukan</th><th>Hari-aktif dosen</th></tr></thead><tbody>
    ${P.sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1)).map(x => `<tr><td>${prodiTag(x.p.id)} ${esc(x.p.nama || '')}</td><td>${skorTag(x.skor)}</td><td class="num">${x.nDosen}</td><td class="num">${x.selesai}</td><td class="num">${x.berjalan}</td><td class="num">${x.belum}</td><td class="num">${x.rpsSah}/${x.nMk}</td><td class="num">${x.rpsAju}</td><td class="num">${x.hariAktif}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  const ids = P.map(x => x.p.id);
  chart(box.querySelector('#kp-c1'), { title: { text: 'Skor rata-rata dosen', textStyle: { fontSize: 12 } }, tooltip: { trigger: 'axis' }, grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true }, xAxis: { type: 'category', data: ids, ...AX }, yAxis: { type: 'value', max: 100, ...AX },
    series: [{ type: 'bar', data: P.map(x => ({ value: x.skor ?? 0, itemStyle: { color: (S.prodi.find(p => p.id === x.p.id) || {}).c || PAL[0], borderRadius: 4 } })), label: { show: true, position: 'top' } }] });
  chart(box.querySelector('#kp-c2'), { title: { text: 'Status dosen per prodi', textStyle: { fontSize: 12 } }, tooltip: { trigger: 'axis' }, legend: { bottom: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 30, containLabel: true }, xAxis: { type: 'category', data: ids, ...AX }, yAxis: { type: 'value', ...AX },
    series: [['selesai', 'Selesai', '#10b981'], ['berjalan', 'Berjalan', '#0ea5e9'], ['belum', 'Belum mulai', '#f0616d']].map(([k, n, c]) => ({ name: n, type: 'bar', stack: 's', data: P.map(x => x[k]), itemStyle: { color: c } })) });
  chart(box.querySelector('#kp-c3'), { title: { text: 'Aktivitas simpan per hari', textStyle: { fontSize: 12 } }, tooltip: { trigger: 'axis' }, legend: { bottom: 0 }, grid: { left: 8, right: 8, top: 34, bottom: 30, containLabel: true }, xAxis: { type: 'category', data: hari.map(h => h.slice(5)), ...AX }, yAxis: { type: 'value', ...AX },
    series: ids.map((id, i) => ({ name: id, type: 'line', smooth: true, data: hari.map(h => J.filter(x => x.prodi === id && x.jenis === 'simpan' && (x.t || '').slice(0, 10) === h).length), itemStyle: { color: (S.prodi.find(p => p.id === id) || {}).c || PAL[i % PAL.length] } })) });
}

async function unduhExcel() {
  const X = await loadXLSX(), wb = X.utils.book_new(), add = (n, rows) => X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows.length ? rows : [{ Keterangan: 'Tidak ada data' }]), n);
  add('Kinerja dosen', dataDosen().map(x => ({ Dosen: x.d.nama, Prodi: x.prodi, Email: x.email, 'MK ditugaskan': x.nMk, 'RPS disahkan': x.selesai, Status: x.status, Skor: x.skor, Hasil: x.hasil, 'Tepat waktu': x.tepat, Mutu: x.mutu, 'Hari aktif': x.hariAktif, 'Jumlah simpan': x.simpan, 'Terakhir aktif': x.terakhir })));
  add('Kinerja prodi', kinerjaProdi(S, dataDosen()).map(x => ({ Prodi: x.p.id, 'Skor rata-rata': x.skor, 'Dosen bertugas': x.nDosen, Selesai: x.selesai, Berjalan: x.berjalan, 'Belum mulai': x.belum, 'RPS disahkan': x.rpsSah, 'Jumlah MK': x.nMk, 'RPS diajukan': x.rpsAju })));
  add('Partisipasi akun', barisPartisipasi().map(x => ({ Nama: x.u.nama, Email: x.em, Peran: (x.u.peran || []).join(', '), Prodi: x.u.prodi || '', 'Pernah masuk': x.pernah ? 'Ya' : 'Belum', 'Terakhir aktif': x.terakhir, 'Hari aktif': x.hari, Simpan: x.simpan, 'Kata sandi': x.sandi })));
  add('Linimasa', J.map(x => ({ Waktu: x.t, Nama: x.nama, Email: x.email, Peran: x.peran, Prodi: x.prodi, Jenis: x.jenis, Aksi: x.aksi, Halaman: x.hal, Perangkat: x.perangkat })));
  const out = X.write(wb, { type: 'array', bookType: 'xlsx' });
  unduh(new Blob([out], { type: 'application/octet-stream' }), `Ruang_Pantau_KUREKAM_${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.xlsx`);
}

/* ---------- Kinerja Saya: dosen melihat miliknya, prodi melihat dosen prodinya ---------- */
export function kinerjaView(el) {
  const B = bobotKinerja(S);
  if (ctx.role === 'dosen') {
    if (!ctx.dosen) { el.innerHTML = '<div class="card empty">Akun Anda belum ditautkan ke data dosen. Hubungi admin.</div>'; return; }
    const x = kinerjaDosen(S, ctx.dosen, null);
    el.innerHTML = `<div class="card">${head('Kinerja saya', `Skor = Hasil ${B.hasil}% + Tepat waktu ${B.tepat}% + Mutu ${B.mutu}%`, 'pulse', '#10b981')}
      <div class="grid g4" style="margin-top:10px">${kpi('Skor', x.skor ?? '-', x.status, pctColor(x.skor || 0), 'medal')}${kpi('Hasil', x.hasil ?? '-', `${x.selesai} dari ${x.nMk} RPS disahkan`, '#0ea5e9', 'check')}${kpi('Tepat waktu', x.tepat ?? '-', x.tenggat ? 'tenggat ' + x.tenggat : 'tenggat belum ditetapkan', '#8b5cf6', 'calendar')}${kpi('Mutu', x.mutu ?? '-', 'dari catatan verifikasi', '#f5a524', 'audit')}</div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Mata kuliah</th><th>Kemajuan</th><th>Langkah berikutnya</th></tr></thead><tbody>
      ${x.rinci.map(k => `<tr><td><b>${esc(k.m.kode || '')}</b> ${esc(k.m.nama)}</td><td>${bar(Math.round(k.hasil * 100), pctColor(k.hasil * 100), '80px')} <span class="small">${Math.round(k.hasil * 100)}%</span></td><td class="small">${esc(k.langkah)}${k.perbaiki ? ` · <span class="st bad">${k.perbaiki} catatan perlu diperbaiki</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Belum ada mata kuliah yang ditugaskan.</td></tr>'}
      </tbody></table></div><div class="small muted" style="margin-top:6px">Grafik ini juga dilihat Kaprodi dan Wakil Direktur I sebagai bahan pembinaan.</div></div>`;
    return;
  }
  const pid = ctx.prodi;
  const ds = kinerjaSemua(S, null).filter(x => x.prodi === pid || x.rinci.some(k => k.m.prodi === pid)).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1));
  el.innerHTML = `<div class="card">${head('Kinerja dosen prodi ' + esc(pid), `Skor = Hasil ${B.hasil}% + Tepat waktu ${B.tepat}% + Mutu ${B.mutu}%`, 'pulse', '#10b981')}
    <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Dosen</th><th>MK</th><th>Status</th><th>Skor</th><th>Langkah sekarang</th></tr></thead><tbody>
    ${ds.map(x => `<tr><td><b>${esc(x.d.nama)}</b></td><td class="num">${x.selesai}/${x.nMk}</td><td>${esc(x.status)}</td><td>${skorTag(x.skor)}</td><td class="small">${esc((x.rinci.find(k => k.stRps !== 'disahkan') || x.rinci[0] || {}).langkah || '-')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Belum ada dosen bertugas.</td></tr>'}
    </tbody></table></div></div>`;
}
