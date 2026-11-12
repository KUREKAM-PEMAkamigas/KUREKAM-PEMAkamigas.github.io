/* KUREKAM · Data induk dan pengaturan: prodi dan kelas, dosen, parameter, impor/ekspor, basis data, log */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, toast, uid, saveSettings, addLog, resetData, replaceData } from '../app.js';
import { DB, getFirebaseConfig, saveFirebaseConfig } from '../db.js';
import { PARAM_DEFAULT, KELOMPOK, KAT_IABEE, GRUP, APP } from '../config.js';
import { param, fmt, KMAP } from '../rules.js';
import { head, formDrawer, prodiTag, ro, tanya, unduh, loadXLSX } from './ui.js';
import { DATA_HEAD, JP_DEFAULT } from './bebanprodi.js';

let tab = 'prodi', fH = '', hasil = '';
const TABS = [['prodi', 'Prodi & kelas'], ['dosen', 'Dosen'], ['param', 'Parameter'], ['impor', 'Impor & ekspor'], ['db', 'Basis data'], ['log', 'Log aktivitas']];
const GK = ['MKU', 'MBS', 'MBE', 'MKK'];
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const pad = (n) => String(n).padStart(2, '0');

export default function indukView(el) {
  const edI = can('induk') || ctx.role === 'admin', adm = ctx.role === 'admin';
  el.innerHTML = `<div class="filters"><div class="seg scroll">${TABS.map(([k, t]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('')}</div><div class="sp"></div>${edI ? '' : ro()}</div><div id="ib"></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; hasil = ''; rerender(); });
  const b = el.querySelector('#ib');
  ({ prodi: tProdi, dosen: tDosen, param: tParam, impor: tImpor, db: tDb, log: tLog })[tab](b, edI, adm);
}

/* ---------- prodi & kelas ---------- */
function tProdi(el, ed) {
  el.innerHTML = `<div class="card">${head('Program studi dan kelas paralel', 'Jumlah kelas per tingkat menjadi dasar beban dosen, jam mengajar, dan jadwal', 'grid4', '#6366f1')}
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Program studi</th><th class="num">Tingkat 1</th><th class="num">Tingkat 2</th><th class="num">Tingkat 3</th><th class="num">Tingkat 4</th><th class="num">MK</th><th class="num">Dosen homebase</th><th>Status kurikulum</th></tr></thead><tbody>
  ${S.prodi.map(p => `<tr class="${ed ? 'click' : ''}" data-p="${p.id}"><td>${prodiTag(p.id)}</td><td><b>${esc(p.nama)}</b></td>${[1, 2, 3, 4].map(t => `<td class="num">${p.kelas[t]}</td>`).join('')}<td class="num">${S.mk.filter(m => m.prodi === p.id).length}</td><td class="num">${S.dosen.filter(d => d.homebase === p.id).length}</td><td>${esc(p.status || 'draf')}</td></tr>`).join('')}
  </tbody></table></div><p class="note">Tingkat 1 mencakup semester 1 dan 2, tingkat 2 semester 3 dan 4, dan seterusnya. ${ed ? 'Klik baris untuk mengubah.' : ''}</p></div>`;
  if (ed) el.querySelectorAll('tr[data-p]').forEach(tr => tr.onclick = () => {
    const p = S.prodi.find(x => x.id === tr.dataset.p);
    formDrawer({ title: 'Ubah prodi ' + p.id, sub: 'Nama, warna, dan jumlah kelas paralel', obj: { nama: p.nama, c: p.c, k1: p.kelas[1], k2: p.kelas[2], k3: p.kelas[3], k4: p.kelas[4] },
      fields: [{ k: 'nama', label: 'Nama program studi', full: true }, { k: 'k1', label: 'Kelas tingkat 1', type: 'number' }, { k: 'k2', label: 'Kelas tingkat 2', type: 'number' }, { k: 'k3', label: 'Kelas tingkat 3', type: 'number' }, { k: 'k4', label: 'Kelas tingkat 4', type: 'number' }, { k: 'c', label: 'Warna', type: 'color' }],
      onSave: async (o) => { if (!o.nama) return 'Nama wajib diisi.'; p.nama = o.nama; p.c = o.c || p.c; p.kelas = { 1: +o.k1 || 0, 2: +o.k2 || 0, 3: +o.k3 || 0, 4: +o.k4 || 0 }; await save('prodi', p, `Ubah kelas paralel ${p.id}: ${Object.values(p.kelas).join('/')}`); rerender(); } });
  });
}

/* ---------- dosen ---------- */
function tDosen(el, ed) {
  const homes = ['Bersama'].concat(S.prodi.map(p => p.id));
  const list = S.dosen.filter(d => !fH || d.homebase === fH);
  el.innerHTML = `<div class="card">${head('Dosen', `${S.dosen.length} dosen terdaftar. Homebase "Bersama" untuk dosen MKU dan basic science yang digilir antarprodi.`, 'user', '#0ea5e9', ed ? `<button class="btn sm pri" id="d-add">${icon('plus')} Tambah dosen</button>` : '')}
  <div class="filters"><select class="inp" id="d-h"><option value="">Semua homebase</option>${homes.map(h => `<option ${h === fH ? 'selected' : ''}>${h}</option>`).join('')}</select><span class="muted small">${list.length} dosen tampil</span></div>
  <div class="tbl-wrap" style="max-height:620px"><table class="tbl"><thead><tr><th>Nama</th><th>NIDN/NIP</th><th>Homebase</th><th>Bidang</th><th>Jabatan</th><th class="num">Penugasan</th></tr></thead><tbody>
  ${list.map(d => `<tr class="${ed ? 'click' : ''}" data-d="${d.id}"><td><b>${esc(d.nama)}</b></td><td class="small">${esc(d.nidn || '–')}</td><td>${d.homebase === 'Bersama' ? '<span class="tag">Bersama</span>' : prodiTag(d.homebase)}</td><td>${esc(d.bidang || '')}</td><td>${esc(d.jabatan || '')}</td><td class="num">${S.tugas.filter(t => t.dosen === d.id).length}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Belum ada dosen.</td></tr>'}
  </tbody></table></div></div>`;
  el.querySelector('#d-h').onchange = e => { fH = e.target.value; rerender(); };
  const form = (d) => formDrawer({ title: d.id ? 'Ubah dosen' : 'Tambah dosen', obj: d,
    fields: [{ k: 'nama', label: 'Nama lengkap dan gelar', full: true }, { k: 'nidn', label: 'NIDN atau NIP' }, { k: 'homebase', label: 'Homebase', type: 'select', opts: homes.map(h => ({ v: h, t: h })) }, { k: 'bidang', label: 'Bidang keahlian' }, { k: 'jabatan', label: 'Jabatan fungsional', type: 'select', opts: ['Tenaga Pengajar', 'Asisten Ahli', 'Lektor', 'Lektor Kepala', 'Guru Besar', 'Praktisi'].map(j => ({ v: j, t: j })) }],
    onSave: async (o) => { if (!o.nama) return 'Nama wajib diisi.'; o.id = o.id || uid('D'); await save('dosen', o, `Simpan dosen ${o.nama}`); rerender(); },
    onDelete: d.id ? async () => { const n = S.tugas.filter(t => t.dosen === d.id); for (const t of n) await remove('tugas', t.id); await remove('dosen', d.id, `Hapus dosen ${d.nama} beserta ${n.length} penugasan`); rerender(); } : null });
  if (ed) { el.querySelector('#d-add').onclick = () => form({ homebase: fH || 'Bersama', jabatan: 'Lektor' }); el.querySelectorAll('tr[data-d]').forEach(tr => tr.onclick = () => form({ ...S.dosen.find(x => x.id === tr.dataset.d) })); }
}

/* ---------- parameter ---------- */
function tParam(el, ed, adm) {
  const P = param(S), J = { ...JP_DEFAULT, ...(S.settings.jp || {}) };
  const num = (id, v, step = 1) => `<input class="inp pnum" type="number" step="${step}" id="${id}" value="${v == null ? '' : v}" ${adm ? '' : 'disabled'}>`;
  el.innerHTML = `
  ${adm ? '' : `<div class="ribbon info">${icon('info')} Parameter hanya dapat diubah oleh Admin setelah ditetapkan pimpinan. Peran lain melihat nilai yang berlaku.</div>`}
  <div class="grid g2">
    <div class="card">${head('Konversi SKS ke jam pelajaran', 'Dasar perhitungan JP mahasiswa dan SKS riil dosen', 'calendar', '#f5a524')}
      <div class="pform">
        <div class="pfrow"><span>1 SKS teori</span>${num('p-t', P.menitTeori, 5)}<small>menit per minggu</small></div>
        ${GK.map(g => `<div class="pfrow"><span>1 SKS praktik ${g} <small class="muted">${GRUP[g].nama}</small></span>${num('p-' + g, P.durasiPraktik[g], 5)}<small>menit per minggu</small></div>`).join('')}
        <div class="pfrow"><span>Durasi 1 JP</span>${num('j-dur', J.dur, 5)}<small>menit</small></div>
        <div class="pfrow"><span>JP per hari</span>${num('j-day', J.perDay)}<small>JP</small></div>
        <div class="pfrow"><span>Hari kuliah per minggu</span>${num('j-days', J.days)}<small>hari</small></div>
      </div></div>
    <div class="card">${head('Batas beban dosen dan akreditasi', 'Beban dihitung dari jam pelajaran nyata (SKS riil)', 'user', '#f0616d')}
      <div class="pform">
        <div class="pfrow"><span>Batas bawah beban dosen</span>${num('p-bmin', P.bebanRiilMin, .5)}<small>SKS riil per semester</small></div>
        <div class="pfrow"><span>Batas atas beban dosen</span>${num('p-bmax', P.bebanRiilMax, .5)}<small>SKS riil per semester</small></div>
        <div class="pfrow"><span>Total SKS minimal</span>${num('p-sks', P.totalSksMin)}<small>Permendiktisaintek 39/2025</small></div>
        <div class="pfrow"><span>Jumlah MK per prodi</span><span class="duo">${num('p-mkmin', P.mkProdiMin)}${num('p-mkmax', P.mkProdiMax)}</span><small>minimal dan maksimal</small></div>
        <div class="pfrow"><span>Muatan spesifik minimal</span>${num('p-spes', P.muatanSpesifikMin)}<small>% (IABEE 2.1.1)</small></div>
        <div class="pfrow"><span>Pendidikan umum maksimal</span>${num('p-umum', P.pendidikanUmumMax)}<small>% (IABEE 2.1.1)</small></div>
        <div class="pfrow"><span>Matematika dan sains minimal</span>${num('p-mat', P.matSainsMin)}<small>SKS (LAM Teknik butir 19)</small></div>
        <div class="pfrow"><span>Porsi jam praktik</span><span class="duo">${num('p-prmin', P.praktikMin)}${num('p-prmax', P.praktikMax)}</span><small>% (LAM Teknik butir 18)</small></div>
      </div></div>
  </div>
  <div class="card" style="margin-top:18px">${head('Kerangka per semester', 'Rentang wajib yang seragam untuk semua prodi (Pedoman Bab IV)', 'grid4', '#6366f1')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Semester</th><th class="num">SKS</th><th class="num">T min</th><th class="num">T maks</th><th class="num">P min</th><th class="num">P maks</th><th class="num">MK min</th><th class="num">MK maks</th></tr></thead><tbody>
    ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<tr><td><b>Semester ${s}</b></td>${P.kerangka[s].map((v, i) => `<td class="num">${num(`k-${s}-${i}`, v)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    ${adm ? `<div class="drawer-act"><button class="btn danger" id="p-def">${icon('loop')} Kembalikan ke nilai pedoman</button><div class="sp"></div><button class="btn pri" id="p-save">${icon('check')} Simpan parameter</button></div>` : ''}
    <p class="note">Batas beban dosen ${PARAM_DEFAULT.bebanRiilMin}–${PARAM_DEFAULT.bebanRiilMax} SKS riil adalah nilai awal aplikasi dan perlu ditetapkan pimpinan. Semester 7 dan 8 tidak memakai rentang teori dan praktik.</p></div>`;
  if (!adm) return;
  const v = (id) => { const x = el.querySelector('#' + id).value; return x === '' ? null : +x; };
  el.querySelector('#p-save').onclick = async () => {
    const ker = {}; for (let s = 1; s <= 8; s++) ker[s] = P.kerangka[s].map((_, i) => v(`k-${s}-${i}`));
    if (!(v('p-t') > 0) || GK.some(g => !(v('p-' + g) > 0))) { toast('Durasi harus lebih dari nol'); return; }
    S.settings.param = { menitTeori: v('p-t'), durasiPraktik: Object.fromEntries(GK.map(g => [g, v('p-' + g)])), bebanRiilMin: v('p-bmin'), bebanRiilMax: v('p-bmax'), totalSksMin: v('p-sks'), mkProdiMin: v('p-mkmin'), mkProdiMax: v('p-mkmax'), muatanSpesifikMin: v('p-spes'), pendidikanUmumMax: v('p-umum'), matSainsMin: v('p-mat'), praktikMin: v('p-prmin'), praktikMax: v('p-prmax'), kerangka: ker };
    S.settings.jp = { dur: v('j-dur') || JP_DEFAULT.dur, perDay: v('j-day') || JP_DEFAULT.perDay, days: v('j-days') || JP_DEFAULT.days };
    await saveSettings(); await addLog('Ubah parameter kurikulum'); toast('Parameter tersimpan'); rerender();
  };
  el.querySelector('#p-def').onclick = async () => { if (!(await tanya('Semua parameter dikembalikan ke nilai Buku Pedoman 2027. Lanjutkan?'))) return; S.settings.param = {}; delete S.settings.jp; await saveSettings(); await addLog('Parameter dikembalikan ke nilai pedoman'); rerender(); };
}

/* ---------- impor & ekspor ---------- */
function tImpor(el, ed, adm) {
  const boleh = ed || ctx.role === 'prodi';
  el.innerHTML = `
  ${hasil ? `<div class="ribbon info" style="display:block">${hasil}</div>` : ''}
  <div class="grid g2">
    <div class="card">${head('Impor matriks kurikulum (Excel)', 'Berkas Matriks_Kurikulum_D4_PEM_Akamigas.xlsx yang sudah diisi prodi', 'upload', '#10b981')}
      <p class="small">Lembar <b>TP, TO, TI, TM, LO</b> dibaca sebagai daftar mata kuliah rancangan baru, lembar <b>CPL</b> sebagai rumusan CPL. Hanya prodi yang lembarnya berisi nama mata kuliah yang diganti. ${ctx.role === 'prodi' ? `Peran Tim Kurikulum hanya mengganti data prodi <b>${ctx.prodi}</b>.` : ''}</p>
      <p class="note">Mengganti daftar MK suatu prodi akan menghapus CPMK, Sub-CPMK, RPS, dan penugasan dosen prodi tersebut karena terikat pada MK lama.</p>
      <div class="drawer-act"><button class="btn pri" id="i-mx" ${boleh ? '' : 'disabled'}>${icon('upload')} Pilih berkas matriks</button></div></div>
    <div class="card">${head('Impor kurikulum berjalan (Excel)', 'Format lembar DATA dari dasbor beban prodi lama', 'upload', '#0ea5e9')}
      <p class="small">Kolom: ${DATA_HEAD.map(h => `<span class="tag">${h}</span>`).join(' ')}. Klasifikasi boleh MKWU, MKKK, MBE, MBS (lama) atau MKU, MKK, MBE, MBS. Data ini menjadi pembanding pada menu Beban Prodi & Kapasitas JP.</p>
      <div class="drawer-act"><button class="btn" id="i-tpl">${icon('download')} Template kosong</button><button class="btn pri" id="i-lama" ${ed ? '' : 'disabled'}>${icon('upload')} Pilih berkas data</button></div></div>
    <div class="card">${head('Impor dosen (Excel)', 'Kolom: Nama, NIDN, Homebase, Bidang, Jabatan', 'user', '#f5a524')}
      <p class="small">Homebase diisi kode prodi (TP, TO, TI, TM, LO) atau Bersama. Dosen dengan nama yang sama diperbarui, yang baru ditambahkan.</p>
      <div class="drawer-act"><button class="btn pri" id="i-dsn" ${ed ? '' : 'disabled'}>${icon('upload')} Pilih berkas dosen</button></div></div>
    <div class="card">${head('Cadangan seluruh data', 'Satu berkas JSON berisi semua koleksi KUREKAM', 'db', '#8b5cf6')}
      <p class="small">Unduh cadangan sebelum impor besar. Berkas cadangan dapat dipulihkan kembali oleh Admin.</p>
      <div class="drawer-act"><button class="btn" id="i-bak">${icon('download')} Unduh cadangan</button><button class="btn danger" id="i-res" ${adm ? '' : 'disabled'}>${icon('upload')} Pulihkan dari cadangan</button></div></div>
  </div><input type="file" id="i-file" style="display:none">`;
  const file = el.querySelector('#i-file');
  const pilih = (accept, fn) => { file.value = ''; file.accept = accept; file.onchange = async () => { const f = file.files[0]; if (!f) return; try { await fn(f); } catch (e) { console.error(e); hasil = `<b>Impor gagal.</b> ${esc(e.message)}`; } rerender(); }; file.click(); };
  const buku = async (f) => { const X = await loadXLSX(); return [X, X.read(await f.arrayBuffer(), { type: 'array' })]; };
  el.querySelector('#i-mx').onclick = () => pilih('.xlsx,.xls', async f => { const [X, wb] = await buku(f); hasil = await imporMatriks(X, wb); });
  el.querySelector('#i-lama').onclick = () => pilih('.xlsx,.xls', async f => { const [X, wb] = await buku(f); hasil = await imporLama(X, wb); });
  el.querySelector('#i-dsn').onclick = () => pilih('.xlsx,.xls', async f => { const [X, wb] = await buku(f); hasil = await imporDosen(X, wb); });
  el.querySelector('#i-tpl').onclick = async () => { const X = await loadXLSX(); const wb = X.utils.book_new(); const ws = X.utils.aoa_to_sheet([DATA_HEAD, ['TP', 1, 'CONTOH01', 'Contoh mata kuliah (hapus baris ini)', 'MBE', 1, 1, 'A, B, C']]); ws['!cols'] = [14, 10, 12, 48, 12, 10, 12, 16].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'DATA'); unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), 'Template_Data_Kurikulum_Berjalan.xlsx'); };
  el.querySelector('#i-bak').onclick = () => { const o = {}; Object.keys(S).forEach(k => { o[k] = k === 'settings' ? [S.settings] : S[k]; }); unduh(new Blob([JSON.stringify(o)], { type: 'application/json' }), `kurekam-cadangan-${new Date().toISOString().slice(0, 10)}.json`); };
  el.querySelector('#i-res').onclick = () => pilih('.json', async f => { const d = JSON.parse(await f.text()); if (!Array.isArray(d.mk) || !Array.isArray(d.prodi)) throw new Error('Berkas bukan cadangan KUREKAM.'); if (!(await tanya(`Seluruh data akan diganti dengan isi cadangan (${d.mk.length} MK). Lanjutkan?`))) { hasil = ''; return; } await replaceData(d); await addLog('Pulihkan data dari cadangan'); hasil = '<b>Data dipulihkan dari cadangan.</b>'; });
}

function cariHeader(X, ws, wajib) {
  const rows = X.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  for (let i = 0; i < Math.min(10, rows.length); i++) { const h = rows[i].map(norm); if (wajib.every(w => h.some(x => w.test(x)))) return { rows, hi: i, h }; }
  return null;
}
const kol = (h, ...pats) => { for (const p of pats) { const i = h.findIndex(x => p.test(x)); if (i >= 0) return i; } return -1; };

async function imporMatriks(X, wb) {
  const out = [], mkBaru = [], ganti = [];
  for (const p of S.prodi) {
    if (ctx.role === 'prodi' && p.id !== ctx.prodi) continue;
    const ws = wb.Sheets[p.id]; if (!ws) continue;
    const t = cariHeader(X, ws, [/^smt|^semester/, /^nama/]); if (!t) { out.push(`${p.id}: kepala tabel tidak ditemukan`); continue; }
    const { rows, hi, h } = t, c = { smt: kol(h, /^smt/, /^semester/), kode: kol(h, /^kode/), nama: kol(h, /^nama/), kel: kol(h, /^kelompok/), kunci: kol(h, /^jeniskunci/), T: kol(h, /^t$/, /^sksteori/), P: kol(h, /^p$/, /^skspraktik/), pra: kol(h, /^prasyarat/), kat: kol(h, /^kategori/), lok: kol(h, /^lokasi/), ket: kol(h, /^keterangan/) };
    const cplCols = h.map((x, i) => [/^cpl\d+$/.test(x) ? x.toUpperCase() : null, i]).filter(x => x[0]);
    const cplProdi = S.cpl.filter(x => x.prodi === p.id);
    const list = []; let no = 0;
    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r], nama = String(row[c.nama] || '').trim(), smt = parseInt(row[c.smt], 10); if (!nama || !(smt >= 1 && smt <= 8)) continue;
      no++; const kelRaw = String(row[c.kel] || '').trim(), kel = KMAP[kelRaw] ? kelRaw : (KELOMPOK.find(k => norm(k.id) === norm(kelRaw)) || KELOMPOK.find(k => k.g === kelRaw.slice(0, 3).toUpperCase()) || KELOMPOK[6]).id;
      const kunci = String(c.kunci >= 0 ? row[c.kunci] : '').trim(), T = +row[c.T] || 0, Pp = +row[c.P] || 0, katRaw = String(c.kat >= 0 ? row[c.kat] : '').trim();
      list.push({ id: `${p.id}-MK${pad(no)}`, prodi: p.id, smt, kode: String(row[c.kode] || '').trim() || `${p.id}${smt}${pad(no)}`, nama, kel, kunci: /^ruang/i.test(kunci) ? '' : kunci, T, P: Pp, prasyarat: [], praTxt: String(c.pra >= 0 ? row[c.pra] : '').trim(), kat: KAT_IABEE.includes(katRaw) ? katRaw : KMAP[kel].iabee, lokasi: String(c.lok >= 0 ? row[c.lok] : '').trim() || (Pp > T ? 'Laboratorium' : 'Kampus'), ket: String(c.ket >= 0 ? row[c.ket] : '').trim(), bk: [],
        cpl: cplCols.filter(([, i]) => String(row[i]).trim()).map(([k]) => { const n = parseInt(k.slice(3), 10); const x = cplProdi.find(q => norm(q.kode) === norm(k)) || cplProdi[n - 1]; return x && x.id; }).filter(Boolean) });
    }
    const ruang = list.filter(m => !m.kunci).length;
    if (!ruang) { out.push(`${p.id}: lembar belum berisi mata kuliah ruang prodi, dilewati`); continue; }
    list.forEach(m => { m.prasyarat = m.praTxt.split(/[,;]+/).map(s => s.trim()).filter(Boolean).map(s => (list.find(x => norm(x.kode) === norm(s) || norm(x.nama) === norm(s)) || {}).id).filter(Boolean); delete m.praTxt; });
    mkBaru.push(...list); ganti.push(p.id); out.push(`${p.id}: ${list.length} MK dibaca (${ruang} ruang prodi), ${list.reduce((a, m) => a + m.T + m.P, 0)} SKS`);
  }
  /* lembar CPL */
  let cplBaru = 0; const wc = wb.Sheets.CPL;
  if (wc) { const t = cariHeader(X, wc, [/^kode$/]); if (t) for (const p of S.prodi) {
    if (ctx.role === 'prodi' && p.id !== ctx.prodi) continue;
    const ci = t.h.findIndex(x => x.startsWith(p.id.toLowerCase()) && /rumusan/.test(x)), ii = t.h.findIndex(x => x.startsWith(p.id.toLowerCase()) && /iabee/.test(x)); if (ci < 0) continue;
    const baris = t.rows.slice(t.hi + 1).filter(r => String(r[ci]).trim()); if (!baris.length) continue;
    const docs = baris.map(r => { const kode = String(r[0]).trim(); const old = S.cpl.find(x => x.prodi === p.id && norm(x.kode) === norm(kode)); return { ...(old || { id: `${p.id}-${kode}`, prodi: p.id, kode, ranah: 'Keterampilan khusus', pl: [] }), teks: String(r[ci]).trim(), iabee: ii >= 0 ? String(r[ii]).split(/[,;\s]+/).filter(Boolean) : (old ? old.iabee : []) }; });
    await saveMany('cpl', docs); cplBaru += docs.length;
  } }
  if (!ganti.length && !cplBaru) return '<b>Tidak ada yang diimpor.</b><br>' + out.map(esc).join('<br>');
  if (ganti.length) {
    if (!(await tanya(`Daftar MK prodi ${ganti.join(', ')} akan diganti dengan isi berkas. CPMK, Sub-CPMK, RPS, dan penugasan dosen prodi tersebut ikut dihapus. Lanjutkan?`, 'Ganti data'))) return '<b>Impor dibatalkan.</b>';
    const keep = (arr) => arr.filter(x => !ganti.includes(x.prodi));
    const d = {}; Object.keys(S).forEach(k => { d[k] = k === 'settings' ? [{ ...S.settings, demo: S.settings.demo }] : S[k]; });
    d.mk = keep(S.mk).concat(mkBaru); d.cpmk = keep(S.cpmk); d.sub = keep(S.sub); d.rps = keep(S.rps); d.tugas = keep(S.tugas);
    await replaceData(d);
  }
  await addLog(`Impor matriks kurikulum: ${ganti.join(', ') || 'tanpa MK'}${cplBaru ? `, ${cplBaru} CPL` : ''}`);
  return `<b>Impor matriks selesai.</b>${cplBaru ? ` ${cplBaru} rumusan CPL diperbarui.` : ''}<br>` + out.map(esc).join('<br>') + '<br>Lanjutkan dengan menu Pemeriksa Kurikulum untuk melihat kesesuaian kerangka.';
}

async function imporLama(X, wb) {
  const G = { MKWU: 'MKU', MKU: 'MKU', MKKK: 'MKK', MKK: 'MKK', MBE: 'MBE', MBS: 'MBS' };
  const names = wb.SheetNames.slice().sort((a, b) => (/^data$/i.test(b) ? 1 : 0) - (/^data$/i.test(a) ? 1 : 0));
  let t = null; for (const n of names) { t = cariHeader(X, wb.Sheets[n], [/prodi|programstudi/, /klas|kelompok/]); if (t) break; }
  if (!t) throw new Error('Tidak ditemukan tabel dengan kolom Program Studi dan Klasifikasi. Gunakan template yang disediakan.');
  const h = t.h, c = { prodi: kol(h, /programstudi/, /prodi/), smt: kol(h, /^semester/, /^smt/, /^sem/), kode: kol(h, /^kode/), nama: kol(h, /^nama/, /matakuliah/), g: kol(h, /klasifikasi/, /kelompok/, /^klas/), T: kol(h, /sksteori/, /^teori/, /^t$/), P: kol(h, /skspraktik/, /^praktik/, /^p$/), kelas: kol(h, /kelasparalel/, /rombel/, /^kelas/) };
  const pid = (raw) => { const s = norm(raw); const p = S.prodi.find(x => norm(x.id) === s || norm(x.nama) === s); if (p) return p.id; if (s === 'lg' || /logistik/.test(s)) return 'LO'; if (/produksi/.test(s)) return 'TP'; if (/pengolahan/.test(s)) return 'TO'; if (/instrumentasi/.test(s)) return 'TI'; if (/mesin/.test(s)) return 'TM'; return null; };
  const docs = [], lewat = [];
  for (let r = t.hi + 1; r < t.rows.length; r++) {
    const row = t.rows[r], nama = String(row[c.nama] || '').trim(), kode = String(c.kode >= 0 ? row[c.kode] : '').trim(); if (!nama && !kode) continue;
    if (/^contoh/i.test(kode) || /hapus baris ini/i.test(nama)) continue;
    const p = pid(row[c.prodi]), smt = parseInt(String(row[c.smt]).replace(/\D/g, ''), 10), g = G[String(row[c.g] || '').toUpperCase().replace(/[^A-Z]/g, '')];
    if (!p || !(smt >= 1 && smt <= 8) || !g) { if (lewat.length < 8) lewat.push(`baris ${r + 1}: ${!p ? 'prodi tidak dikenali' : !g ? 'klasifikasi tidak dikenali' : 'semester di luar 1–8'}`); continue; }
    docs.push({ id: 'L' + String(docs.length + 1).padStart(4, '0'), prodi: p, smt, kode: kode || '-', nama: nama || '(tanpa nama)', g, T: Math.max(0, +row[c.T] || 0), P: Math.max(0, +row[c.P] || 0), kelas: String(c.kelas >= 0 ? row[c.kelas] : '').split(/[,;/|\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean) });
  }
  if (!docs.length) throw new Error('Tidak ada baris data yang valid. ' + lewat.join('; '));
  if (!(await tanya(`Data kurikulum berjalan (${S.lama.length} MK) akan diganti dengan ${docs.length} MK dari berkas. Lanjutkan?`, 'Ganti data'))) return '<b>Impor dibatalkan.</b>';
  await DB.replaceAll('lama', docs); S.lama = docs; await addLog(`Impor kurikulum berjalan: ${docs.length} MK`);
  return `<b>Impor kurikulum berjalan selesai.</b> ${docs.length} MK dibaca: ${S.prodi.map(p => `${p.id} ${docs.filter(d => d.prodi === p.id).length}`).join(', ')}.${lewat.length ? '<br>Dilewati: ' + lewat.map(esc).join('; ') : ''}`;
}

async function imporDosen(X, wb) {
  let t = null; for (const n of wb.SheetNames) { t = cariHeader(X, wb.Sheets[n], [/^nama/]); if (t) break; }
  if (!t) throw new Error('Kolom Nama tidak ditemukan.');
  const h = t.h, c = { nama: kol(h, /^nama/), nidn: kol(h, /nidn/, /nip/), home: kol(h, /homebase/, /prodi/), bidang: kol(h, /bidang/, /keahlian/), jab: kol(h, /jabatan/) };
  const docs = []; let baru = 0;
  t.rows.slice(t.hi + 1).forEach(r => { const nama = String(r[c.nama] || '').trim(); if (!nama) return; const old = S.dosen.find(d => norm(d.nama) === norm(nama)); const hb = String(c.home >= 0 ? r[c.home] : '').trim().toUpperCase(); if (!old) baru++;
    docs.push({ ...(old || { id: uid('D') + docs.length }), nama, nidn: String(c.nidn >= 0 ? r[c.nidn] : (old && old.nidn) || '').trim(), homebase: S.prodi.some(p => p.id === hb) ? hb : (old ? old.homebase : 'Bersama'), bidang: String(c.bidang >= 0 ? r[c.bidang] : (old && old.bidang) || '').trim(), jabatan: String(c.jab >= 0 ? r[c.jab] : (old && old.jabatan) || '').trim() }); });
  if (!docs.length) throw new Error('Tidak ada baris dosen yang terbaca.');
  await saveMany('dosen', docs, `Impor dosen: ${docs.length} baris`);
  return `<b>Impor dosen selesai.</b> ${baru} dosen baru ditambahkan dan ${docs.length - baru} diperbarui.`;
}

/* ---------- basis data ---------- */
function tDb(el, ed, adm) {
  const cfg = getFirebaseConfig();
  const n = (k) => S[k].length;
  el.innerHTML = `<div class="grid g2">
    <div class="card">${head('Status basis data', DB.mode === 'firebase' ? 'Terhubung ke Cloud Firestore, data dipakai bersama' : 'Mode lokal: data tersimpan di peramban ini saja', 'db', DB.mode === 'firebase' ? '#10b981' : '#f5a524')}
      <div class="grid g3 mini">${[['Prodi', 'prodi'], ['Dosen', 'dosen'], ['CPL', 'cpl'], ['Bahan kajian', 'bk'], ['MK rancangan', 'mk'], ['MK berjalan', 'lama'], ['CPMK', 'cpmk'], ['Sub-CPMK', 'sub'], ['RPS', 'rps'], ['Penugasan', 'tugas'], ['Usulan revisi', 'revisi'], ['Log', 'log']].map(([t, k]) => `<div><small>${t}</small><b>${fmt(n(k))}</b></div>`).join('')}</div>
      ${DB.error ? `<p class="note">Catatan koneksi: ${esc(DB.error)}</p>` : ''}
      <div class="pform" style="margin-top:12px"><label class="pfrow"><span>Tampilkan pita "Mode demo" di atas setiap halaman</span><input type="checkbox" id="b-demo" ${S.settings.demo !== false ? 'checked' : ''} ${adm ? '' : 'disabled'}><small>matikan setelah data asli diisi</small></label></div>
      <div class="drawer-act"><button class="btn danger" id="b-reset" ${adm ? '' : 'disabled'}>${icon('loop')} Muat ulang data contoh</button></div></div>
    <div class="card">${head('Hubungkan ke Firebase', 'Pakai proyek Firebase yang sama dengan SIMANTAP agar satu ekosistem', 'link', '#0ea5e9')}
      <p class="small">Tempel konfigurasi Web App Firebase (objek <code>firebaseConfig</code>). Koleksi KUREKAM diberi awalan <code>kur_</code> sehingga tidak bercampur dengan koleksi SIMANTAP. Konfigurasi disimpan di peramban ini, atau tulis permanen di <code>assets/js/config.js</code>.</p>
      <textarea class="inp" id="b-cfg" rows="8" style="width:100%;font-family:ui-monospace,monospace;font-size:12px" placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }' ${adm ? '' : 'disabled'}>${cfg ? esc(JSON.stringify({ ...cfg, apiKey: cfg.apiKey ? '••• tersimpan •••' : '' }, null, 2)) : ''}</textarea>
      <div class="drawer-act"><button class="btn ghost" id="b-off" ${adm && cfg ? '' : 'disabled'}>Putuskan</button><div class="sp"></div><button class="btn pri" id="b-on" ${adm ? '' : 'disabled'}>${icon('check')} Simpan dan muat ulang</button></div>
      <p class="note">Saat pertama terhubung, koleksi kosong diisi data contoh. Atur Firestore Security Rules agar hanya akun terdaftar yang dapat menulis.</p></div>
  </div>`;
  if (!adm) return;
  el.querySelector('#b-demo').onchange = async e => { S.settings.demo = e.target.checked; await saveSettings(); rerender(); };
  el.querySelector('#b-reset').onclick = async () => { if (!(await tanya('Seluruh data diganti dengan data contoh awal. Perubahan yang sudah dibuat akan hilang. Lanjutkan?', 'Muat ulang'))) return; await resetData(); toast('Data contoh dimuat ulang'); rerender(); };
  el.querySelector('#b-on').onclick = () => {
    let o; try { const raw = el.querySelector('#b-cfg').value.trim().replace(/^[^{]*/, '').replace(/;?\s*$/, ''); o = JSON.parse(raw.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"').replace(/,\s*}/g, '}')); } catch (e) { toast('Konfigurasi tidak terbaca sebagai JSON'); return; }
    if (!o.projectId || !o.apiKey || /tersimpan/.test(o.apiKey)) { toast('apiKey dan projectId wajib diisi'); return; }
    saveFirebaseConfig(o); location.reload();
  };
  el.querySelector('#b-off').onclick = () => { saveFirebaseConfig(null); location.reload(); };
  void APP;
}

/* ---------- log ---------- */
function tLog(el) {
  el.innerHTML = `<div class="card">${head('Log aktivitas', `${S.log.length} catatan terakhir`, 'audit', '#64748b')}
  <div class="tbl-wrap" style="max-height:640px"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th></tr></thead><tbody>
  ${S.log.slice(0, 300).map(l => `<tr><td class="small" style="white-space:nowrap">${esc(new Date(l.t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }))}</td><td class="small">${esc(l.user || '')}</td><td>${esc(l.aksi || '')}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Belum ada aktivitas.</td></tr>'}
  </tbody></table></div></div>`;
}
