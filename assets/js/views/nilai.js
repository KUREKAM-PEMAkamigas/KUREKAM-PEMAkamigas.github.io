/* KUREKAM · Nilai per Mata Kuliah: tempel atau buka nilai, petakan komponen ke CPMK, hitung capaian CPL, simpan agregat dan data per mahasiswa.
   Pengukuran dari CPMK. Agregat per kelas, angkatan, dan CPL disimpan di koleksi capaian (kur_capaian);
   data per mahasiswa (NIM, nama, nilai) disimpan per kelas di koleksi kur_nilai yang hanya dibuka bagi dosen, prodi, dan admin. */
import { S, ctx, can, saveMany, remove, rerender, esc, icon, toast, addLog } from '../app.js';
import { DB } from '../db.js';
import { param, fmt } from '../rules.js';
import { head, stTag, tanya, short, loadXLSX, unduh } from './ui.js';
import { chart } from '../charts.js';
import { predikat, rataSkor, narasi, lintasMk, htmlRapor, BATAS_KUAT } from '../rapor.js';
import { SKPI_DEF } from '../skpilogic.js';
import { berkasDocxSkpiWord } from '../skpiword.js';
import { bacaTempel, kenaliTabel, tebakPeta, hitungCpl, statusCapaian, periksaPeta } from '../nilaicpl.js';

const st = { mk: '', smt: '', kelas: '', teks: '', tabel: null, peta: {}, hasil: null, galat: '', membaca: false, kelasLihat: '' };
const smtBawaan = () => { const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1, awal = m >= 7 ? y : y - 1, gj = (S.settings.paritas || 'ganjil') === 'ganjil'; return `${gj ? 'Ganjil' : 'Genap'} ${awal}/${awal + 1}`; };
const kunci = (s) => String(s).replace(/[^A-Za-z0-9]/g, '');
const labelStatus = { ok: 'Tercapai', near: 'Nyaris', bad: 'Di bawah target', na: 'Belum ada data' };
const idDok = (mk, smt, kelas) => `N-${mk}-${kunci(smt)}-${kunci(kelas) || 'semua'}`;

export default function nilaiView(el) {
  const P = param(S), ambang = P.piMinNilai, target = P.piMinPersen;
  const bisa = S.mk.filter(m => can('rps', { mk: m.id, prodi: m.prodi }) && S.cpmk.some(c => c.mk === m.id));
  if (!st.smt) st.smt = smtBawaan();
  if (st.mk && !bisa.some(m => m.id === st.mk)) st.mk = '';
  if (!window.XLSX) loadXLSX().catch(() => { }); /* dimuat di latar agar tombol Excel tidak menunggu */
  const mk = () => S.mk.find(m => m.id === st.mk);
  const cpmkMk = () => S.cpmk.filter(c => c.mk === st.mk);
  const kodeCpl = (id) => (S.cpl.find(c => c.id === id) || {}).kode || id;
  const tersimpan = S.capaian.filter(r => r.mk && (ctx.prodi === r.prodi || bisa.some(m => m.id === r.mk)));
  const grup = {}; tersimpan.forEach(r => { const k = [r.mk, r.smt, r.kelas || ''].join('|'), g = grup[k] || (grup[k] = { mk: r.mk, smt: r.smt, kelas: r.kelas || '', tgl: r.tgl, baris: [] }); g.baris.push(r); });
  const daftarGrup = Object.values(grup);
  const adaTeks = () => !!(st.teks && st.teks.trim());

  const tampilTabel = () => { const t = st.tabel; return `<div class="small" style="margin:10px 0 6px"><b>${t.mhs.length} mahasiswa</b> dan <b>${t.kolom.length} kolom nilai</b> terbaca${t.ada && t.ada.kelas ? ', kolom Kelas ditemukan' : ''}. Seluruh daftar di bawah, gulir untuk melihat semua:</div>
    <div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr style="position:sticky;top:0;background:var(--card,#fff);z-index:1"><th>No</th><th>NIM</th><th>Nama</th>${t.ada && t.ada.kelas ? '<th>Kelas</th>' : ''}${t.kolom.map(k => `<th class="num">${esc(k.nama)}</th>`).join('')}</tr></thead><tbody>${t.mhs.map((m, i) => `<tr><td class="small">${i + 1}</td><td class="small">${esc(m.nim)}</td><td>${esc(m.nama)}</td>${t.ada && t.ada.kelas ? `<td class="small">${esc(m.kelas)}</td>` : ''}${m.v.map(v => `<td class="num">${v == null ? '<span class="muted">-</span>' : fmt(v, 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; };

  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Tempel atau buka nilai dari Excel/SIAKAD, petakan tiap kolom ke CPMK, lalu aplikasi menghitung capaian CPL. <b>Capaian CPL diukur dari CPMK</b>: skor CPMK adalah rata-rata berbobot kolom nilainya, skor CPL adalah rata-rata berbobot CPMK yang memuat CPL itu. CPL tercapai bagi mahasiswa bila skornya ≥ ${fmt(ambang)}, dan CPL tercapai bagi kelas atau prodi bila minimal ${fmt(target)}% mahasiswa mencapainya. Ambang, target, dan aturan angkatan dari NIM dapat diubah di Data Induk, Parameter.</span></div>
  <div class="card" style="margin-top:14px;overflow:hidden">${head('1 · Pilih mata kuliah dan masukkan nilai', bisa.length ? 'Hanya mata kuliah yang Bapak/Ibu ampu atau kelola prodinya, dan sudah memiliki CPMK' : 'Belum ada mata kuliah yang bisa diisi nilainya', 'pulse', '#0ea5e9')}
    ${bisa.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:10px">
        <label class="small" style="min-width:0">Mata kuliah<select class="inp" id="n-mk" style="width:100%;box-sizing:border-box"><option value="">— pilih —</option>${bisa.map(m => `<option value="${esc(m.id)}" ${m.id === st.mk ? 'selected' : ''}>${esc(m.prodi)} · ${esc(m.kode || m.id)} · ${esc(m.nama)}</option>`).join('')}</select></label>
        <label class="small" style="min-width:0">Semester<input class="inp" id="n-smt" value="${esc(st.smt)}" placeholder="Ganjil 2026/2027" style="width:100%;box-sizing:border-box"></label>
        <label class="small" style="min-width:0">Kelas bila Excel tak punya kolom Kelas<input class="inp" id="n-kelas" value="${esc(st.kelas)}" placeholder="A, B, C, atau kosong" style="width:100%;box-sizing:border-box"></label></div>
      ${st.tabel ? tampilTabel() : `<textarea class="inp" id="n-teks" rows="6" wrap="off" style="width:100%;max-width:100%;box-sizing:border-box;margin-top:10px;font-family:monospace;font-size:12px;overflow:auto" placeholder="Salin dari Excel/SIAKAD termasuk baris judul: No, NIM, Nama, komponen nilai ...">${esc(st.teks)}</textarea>`}
      <div class="drawer-act" style="margin-top:8px;flex-wrap:wrap">${st.tabel ? '' : `<button class="btn pri sm" id="n-baca" ${adaTeks() ? '' : 'disabled'}>${icon('check')} Baca nilai</button>`}<button class="btn sm" id="n-xl" ${st.membaca ? 'disabled' : ''}>${icon('upload')} ${st.membaca ? 'Membaca berkas…' : 'Buka berkas Excel'}</button><input type="file" id="n-file" accept=".xlsx,.xls,.csv" hidden>${st.teks || st.tabel ? `<button class="btn sm" id="n-kosong">Kosongkan dan mulai lagi</button>` : ''}</div>
      ${st.galat ? `<div class="ribbon bad" style="margin-top:8px">${icon('alert')} ${esc(st.galat)}</div>` : ''}` : '<div class="empty small">Mata kuliah muncul di sini bila Bapak/Ibu ditugaskan sebagai pengampu, atau sebagai prodi yang kurikulumnya sudah memiliki CPMK.</div>'}
  </div>
  <div id="n-peta"></div><div id="n-hasil"></div>
  <div class="card" style="margin-top:14px">${head('Hasil yang sudah tersimpan', 'Per mata kuliah, semester, dan kelas. Menyimpan ulang kombinasi yang sama mengganti hasil lama. Kelas berbeda digabung otomatis pada rekap.', 'loop', '#10b981')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mata kuliah</th><th>Semester</th><th>Kelas</th><th>CPL terukur</th><th>Mahasiswa</th><th>Disimpan</th><th></th></tr></thead><tbody>
    ${daftarGrup.map((g, i) => { const m = S.mk.find(x => x.id === g.mk) || {}, n = Math.max(...g.baris.map(r => +r.n || 0)); return `<tr><td><b>${esc(m.kode || g.mk)}</b> ${esc(m.nama || '')}</td><td>${esc(g.smt)}</td><td>${esc(g.kelas || 'Semua')}</td><td class="small">${esc(Array.from(new Set(g.baris.map(r => kodeCpl(r.cpl)))).join(', '))}</td><td class="num">${n}</td><td class="small">${esc(g.tgl || '')}</td><td style="white-space:nowrap">${bisa.some(x => x.id === g.mk) ? `<button class="btn sm" data-buka="${i}">Buka data</button> <button class="btn sm" data-hapus="${i}" title="Hapus">${icon('trash')}</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Belum ada hasil tersimpan.</td></tr>'}
    </tbody></table></div></div>`;

  const petaEl = el.querySelector('#n-peta'), hasilEl = el.querySelector('#n-hasil');
  const ulang = () => { const y = window.scrollY; nilaiView(el); window.scrollTo(0, y); };

  function gambarPeta() {
    if (!st.tabel) { petaEl.innerHTML = ''; hasilEl.innerHTML = ''; return; }
    const c = cpmkMk(), t = st.tabel;
    const opsi = (pilih) => `<option value="">Abaikan kolom ini</option>${c.map(x => `<option value="${esc(x.id)}" ${x.id === pilih ? 'selected' : ''}>${esc(x.kode || '')} · ${esc(short(x.teks || '', 70))} (${esc((x.cpl || []).map(kodeCpl).join(', ') || 'tanpa CPL')})</option>`).join('')}`;
    petaEl.innerHTML = `<div class="card" style="margin-top:14px">${head('2 · Petakan kolom nilai ke CPMK', 'Pilih CPMK yang diukur tiap kolom. Satu kolom boleh mengukur beberapa CPMK: pilih "+ CPMK lain" lalu atur persen pembagian (awalnya rata). Bobot dipakai bila beberapa kolom mengukur CPMK yang sama.', 'link', '#6366f1')}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kolom</th><th>Contoh nilai</th><th>CPMK yang diukur</th><th>Bobot</th></tr></thead><tbody>
      ${t.kolom.map((k, j) => { const p = st.peta[k.nama] || { cpmk: '', bobot: 1 }, bagi = p.bagi || [], kn = esc(k.nama);
        const sel = (v, attr) => `<select class="inp" ${attr} style="max-width:420px">${opsi(v)}</select>`;
        const sel2 = bagi.length ? bagi.map((x, i) => `<div style="display:flex;gap:6px;align-items:center;margin:2px 0">${sel(x.cpmk, `data-bk="${kn}" data-i="${i}"`)}<input class="inp pnum" type="number" min="0" max="100" step="any" data-bp="${kn}" data-i="${i}" value="${x.persen}" style="width:70px" title="Persen"><span class="small">%</span><button class="btn sm" data-bx="${kn}" data-i="${i}" title="Hapus">×</button></div>`).join('') + `<div class="small muted">Total ${Math.round(bagi.reduce((a, x) => a + (+x.persen || 0), 0) * 10) / 10}% · <a href="#" data-bt="${kn}">+ CPMK lain</a> · <a href="#" data-br="${kn}">bagi rata</a> · <a href="#" data-b1="${kn}">satu CPMK saja</a></div>` : sel(p.cpmk, `data-k="${kn}"`) + (p.cpmk ? ` <a href="#" class="small" data-bt="${kn}">+ CPMK lain</a>` : '');
        return `<tr><td><b>${kn}</b></td><td class="small">${esc(t.mhs.slice(0, 3).map(m => m.v[j] == null ? '-' : m.v[j]).join(', '))}</td>
        <td>${sel2}</td>
        <td><input class="inp pnum" type="number" min="0" step="any" data-b="${kn}" value="${p.bobot == null ? '' : p.bobot}" style="width:80px"></td></tr>`; }).join('')}
      </tbody></table></div>
      ${(() => { const w = periksaPeta(t.kolom, st.peta, c); return w.length ? `<div class="ribbon warn" style="margin-top:8px">${icon('alert')} <div>${w.map(esc).join('<br>')}</div></div>` : ''; })()}
      <div class="drawer-act" style="margin-top:8px"><button class="btn pri" id="n-hitung">Hitung capaian CPL →</button></div></div>`;
    petaEl.querySelectorAll('[data-k]').forEach(s => s.onchange = () => { (st.peta[s.dataset.k] = st.peta[s.dataset.k] || { bobot: 1 }).cpmk = s.value; gambarPeta(); });
    const pk = (n) => (st.peta[n] = st.peta[n] || { cpmk: '', bobot: 1 });
    const rata = (b) => { const n = b.length; b.forEach(x => { x.persen = Math.round(10000 / n) / 100; }); };
    petaEl.querySelectorAll('[data-bt]').forEach(a => a.onclick = (e) => { e.preventDefault(); const p = pk(a.dataset.bt); if (!(p.bagi || []).length) p.bagi = [{ cpmk: p.cpmk, persen: 100 }]; p.bagi.push({ cpmk: '', persen: 0 }); rata(p.bagi); gambarPeta(); });
    petaEl.querySelectorAll('[data-br]').forEach(a => a.onclick = (e) => { e.preventDefault(); rata(pk(a.dataset.br).bagi); gambarPeta(); });
    petaEl.querySelectorAll('[data-b1]').forEach(a => a.onclick = (e) => { e.preventDefault(); const p = pk(a.dataset.b1); p.cpmk = ((p.bagi || [])[0] || {}).cpmk || ''; delete p.bagi; gambarPeta(); });
    petaEl.querySelectorAll('[data-bk]').forEach(x => x.onchange = () => { pk(x.dataset.bk).bagi[+x.dataset.i].cpmk = x.value; gambarPeta(); });
    petaEl.querySelectorAll('[data-bp]').forEach(x => x.oninput = () => { pk(x.dataset.bp).bagi[+x.dataset.i].persen = +x.value || 0; });
    petaEl.querySelectorAll('[data-bp]').forEach(x => x.onchange = () => gambarPeta());
    petaEl.querySelectorAll('[data-bx]').forEach(x => x.onclick = () => { const p = pk(x.dataset.bx); p.bagi.splice(+x.dataset.i, 1); if (p.bagi.length <= 1) { p.cpmk = (p.bagi[0] || {}).cpmk || ''; delete p.bagi; } else rata(p.bagi); gambarPeta(); });
    petaEl.querySelectorAll('[data-b]').forEach(i => i.oninput = () => { (st.peta[i.dataset.b] = st.peta[i.dataset.b] || { cpmk: '' }).bobot = i.value === '' ? 1 : +i.value; });
    petaEl.querySelector('#n-hitung').onclick = () => { hitung(); hasilEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    gambarHasil();
    if (st.auto) { st.auto = false; hitung(); hasilEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function hitung() {
    const c = cpmkMk(), bobotCpmk = {};
    c.forEach(x => { const b = S.sub.filter(s => s.cpmk === x.id).reduce((a, s) => a + (+s.bobot || 0), 0); bobotCpmk[x.id] = b || 1; });
    st.hasil = hitungCpl({ tabel: st.tabel, cpmk: c, bobotCpmk, peta: st.peta, ambang, nimPos: P.nimPos, nimLen: P.nimLen, kelasBawaan: st.kelas.trim() });
    st.kelasLihat = '';
    gambarHasil();
  }

  function unduhExcel(h) {
    loadXLSX().then(X => {
      const cpl = h.cplIds, cp = h.cpmkAda.map(id => S.cpmk.find(c => c.id === id) || { id, kode: id });
      const aoa = [['No', 'NIM', 'Nama', 'Kelas', 'Angkatan'].concat(cp.map(c => c.kode || c.id), cpl.map(kodeCpl), ['Jumlah CPL belum tercapai'])]
        .concat(h.mahasiswa.map((m, i) => [i + 1, m.nim, m.nama, m.kelas, m.angkatan].concat(cp.map(c => m.cpmk[c.id] == null ? '' : +m.cpmk[c.id].toFixed(1)), cpl.map(id => m.cpl[id] == null ? '' : +m.cpl[id].toFixed(1)), [cpl.filter(id => m.cpl[id] != null && m.cpl[id] < ambang).length])));
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), 'Per mahasiswa');
      const ring = [['CPL', 'Rumusan', 'Mahasiswa', `% ≥ ${ambang}`, 'Rata-rata', 'Status']].concat(h.ringkas.map(r => [kodeCpl(r.cpl), (S.cpl.find(c => c.id === r.cpl) || {}).teks || '', r.n, +(r.persen || 0).toFixed(1), +(r.rata || 0).toFixed(1), labelStatus[statusCapaian(r.persen, target)]]));
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(ring), 'Ringkasan CPL');
      unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Capaian_CPL_${(mk() || {}).kode || st.mk}_${kunci(st.smt)}.xlsx`);
    }).catch(e => toast('Gagal membuat Excel: ' + (e.message || e)));
  }

  function gambarHasil() {
    const h = st.hasil; if (!h) { hasilEl.innerHTML = ''; return; }
    if (!h.ringkas.length) { hasilEl.innerHTML = `<div class="ribbon bad" style="margin-top:14px">${icon('alert')} Belum ada kolom yang dipetakan ke CPMK yang memuat CPL. Petakan minimal satu kolom ke CPMK yang punya CPL.</div>`; return; }
    const angk = h.angkatan.filter(a => a !== '?'), asing = h.angkatan.includes('?'), banyakKelas = h.kelas.length > 1;
    const lihat = h.mahasiswa.map((m, i) => [m, i]).filter(([m]) => !st.kelasLihat || m.kelas === st.kelasLihat);
    const cplAll = Array.from(new Set(cpmkMk().flatMap(c => c.cpl || []))).sort((a, b) => kodeCpl(a).localeCompare(kodeCpl(b), 'id', { numeric: true }));
    const sel = (v) => v == null ? '<td class="kosong" title="Belum diisi">–</td>' : `<td class="num" style="font-weight:700;color:${v >= ambang ? '#0f8a5f' : '#b42335'}">${fmt(v, 1)}</td>`;
    hasilEl.innerHTML = `<div class="card" style="margin-top:14px">${head('3 · Hasil capaian CPL', `${esc((mk() || {}).nama || '')} · ${esc(st.smt)} · ${h.mhs} mahasiswa${banyakKelas ? ' · ' + h.kelas.length + ' kelas' : ''} · ambang ${fmt(ambang)}, target ${fmt(target)}%`, 'target', '#10b981', `<button class="btn sm" id="n-xlsx">${icon('download')} Unduh Excel</button>${can('rps', { mk: st.mk, prodi: (mk() || {}).prodi }) ? `<button class="btn pri sm" id="n-simpan">${icon('check')} Simpan hasil</button>` : ''}`)}
      ${asing ? `<div class="ribbon" style="background:#fef3c7;border-color:#f59e0b;margin:8px 0">${icon('alert')} Sebagian NIM tidak cocok dengan aturan angkatan (digit ke-${P.nimPos}, ${P.nimLen} digit). Baris itu masuk angkatan "?" dan tidak ikut rekap. Periksa aturan di Data Induk, Parameter.</div>` : ''}
      ${h.takTerpetakan.length ? `<div class="small muted" style="margin:6px 0">Kolom diabaikan: ${esc(h.takTerpetakan.join(', '))}</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;align-items:start">
        <div class="tbl-wrap" style="min-width:0"><table class="tbl"><thead><tr><th>CPL</th><th class="num">Mhs</th><th class="num">% ≥ ${fmt(ambang)}</th><th class="num">Rata-rata</th><th>Status</th></tr></thead><tbody>
        ${h.ringkas.map(r => { const s = statusCapaian(r.persen, target); return `<tr><td><b>${esc(kodeCpl(r.cpl))}</b><div class="small muted" style="white-space:normal">${esc(short((S.cpl.find(c => c.id === r.cpl) || {}).teks || '', 80))}</div></td><td class="num">${r.n}</td><td class="num"><b>${fmt(r.persen, 1)}%</b></td><td class="num">${fmt(r.rata, 1)}</td><td>${stTag(s, labelStatus[s])}</td></tr>`; }).join('')}
        </tbody></table></div>
        ${h.ringkas.length >= 3 ? '<div id="n-rad" style="height:340px;min-width:0"></div>' : `<div class="small muted">Spider chart tampil bila minimal 3 CPL terukur pada mata kuliah ini. Gambaran seluruh prodi ada di tab Rekap dan tindak lanjut.</div>`}
      </div>
      ${banyakKelas ? `<h4 style="margin:14px 0 6px">Per kelas</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>CPL</th>${h.kelas.map(k => `<th class="num">Kelas ${esc(k || '-')}</th>`).join('')}</tr></thead><tbody>
      ${h.ringkas.map(r => `<tr><td><b>${esc(kodeCpl(r.cpl))}</b></td>${h.kelas.map(k => { const x = h.kelasHasil.find(b => b.kelas === k && b.cpl === r.cpl); return x ? `<td class="num" style="color:${x.persen >= target ? '#0f8a5f' : '#b42335'}"><b>${fmt(x.persen, 1)}%</b> <span class="small muted">(${x.lulus}/${x.n})</span></td>` : '<td class="num muted">-</td>'; }).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
      ${angk.length > 1 ? `<h4 style="margin:14px 0 6px">Per angkatan</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>CPL</th>${angk.map(a => `<th class="num">Angkatan ${esc(a)}</th>`).join('')}</tr></thead><tbody>
      ${h.ringkas.map(r => `<tr><td><b>${esc(kodeCpl(r.cpl))}</b></td>${angk.map(a => { const x = h.baris.filter(b => b.angkatan === a && b.cpl === r.cpl), n = x.reduce((s, b) => s + b.n, 0), l = x.reduce((s, b) => s + b.lulus, 0); return n ? `<td class="num">${fmt(l / n * 100, 1)}% <span class="small muted">(${l}/${n})</span></td>` : '<td class="num muted">-</td>'; }).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
      <style>.n-rp th,.n-rp td{padding:3px 7px!important;font-size:12px!important;white-space:nowrap}.n-rp tbody tr{cursor:pointer}.n-rp tbody tr:hover{background:rgba(14,165,233,.08)}.n-rp .kosong{background:repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 4px,#f1f5f9 4px,#f1f5f9 8px);color:#94a3b8;text-align:center}.n-rp .nm{max-width:210px;overflow:hidden;text-overflow:ellipsis}</style>
      <h4 style="margin:14px 0 6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">Per mahasiswa <span class="small muted" style="font-weight:400">${lihat.length} mahasiswa · hijau ≥ ${fmt(ambang)} · merah di bawah · <span style="display:inline-block;width:26px;height:10px;vertical-align:middle;background:repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 3px,#f1f5f9 3px,#f1f5f9 6px)"></span> belum diisi · klik nama untuk rapor</span>${banyakKelas ? `<select class="inp" id="n-kl" style="width:auto"><option value="">Semua kelas</option>${h.kelas.map(k => `<option value="${esc(k)}" ${k === st.kelasLihat ? 'selected' : ''}>Kelas ${esc(k || '-')}</option>`).join('')}</select>` : ''}</h4>
      <div class="tbl-wrap" style="max-height:460px;overflow:auto"><table class="tbl n-rp"><thead><tr style="position:sticky;top:0;background:var(--card,#fff);z-index:1"><th>No</th><th>NIM</th><th>Nama</th>${banyakKelas ? '<th>Kls</th>' : ''}<th>Angk.</th>${cplAll.map(id => `<th class="num">${esc(kodeCpl(id))}</th>`).join('')}<th class="num">Rata-rata CPL</th><th class="num">Belum</th><th>Predikat</th></tr></thead><tbody>
      ${lihat.map(([m, ix], i) => { const ada = cplAll.filter(id => m.cpl[id] != null), gagal = ada.filter(id => m.cpl[id] < ambang).length, rt = rataSkor(m.cpl, ada), pr = predikat(rt, ambang); return `<tr data-rp="${ix}"><td>${i + 1}</td><td>${esc(m.nim)}</td><td class="nm" title="${esc(m.nama)}"><b>${esc(m.nama)}</b></td>${banyakKelas ? `<td>${esc(m.kelas)}</td>` : ''}<td>${esc(m.angkatan)}</td>${cplAll.map(id => sel(m.cpl[id])).join('')}<td class="num"><b>${rt == null ? '–' : fmt(rt, 1)}</b></td><td class="num">${gagal ? `<b style="color:#b42335">${gagal}</b>` : '<span class="muted">0</span>'}</td><td><b style="color:${pr.w}">${pr.t}</b></td></tr>`; }).join('')}
      </tbody></table></div>
    </div>`;
    const bs = hasilEl.querySelector('#n-simpan'); if (bs) bs.onclick = simpan;
    hasilEl.querySelector('#n-xlsx').onclick = () => unduhExcel(h);
    hasilEl.querySelectorAll('[data-rp]').forEach(tr => tr.onclick = () => bukaRapor(+tr.dataset.rp));
    const kl = hasilEl.querySelector('#n-kl'); if (kl) kl.onchange = () => { st.kelasLihat = kl.value; gambarHasil(); };
    const rad = hasilEl.querySelector('#n-rad');
    if (rad) chart(rad, { tooltip: {}, legend: { bottom: 0, data: ['Capaian (% mahasiswa ≥ ambang)', 'Target'] },
      radar: { radius: '62%', center: ['50%', '46%'], indicator: h.ringkas.map(r => ({ name: kodeCpl(r.cpl), max: 100 })) },
      series: [{ type: 'radar', symbolSize: 5, data: [
        { name: 'Capaian (% mahasiswa ≥ ambang)', value: h.ringkas.map(r => +(r.persen || 0).toFixed(1)), areaStyle: { opacity: .18 }, lineStyle: { width: 2, color: '#0ea5e9' }, itemStyle: { color: '#0ea5e9' } },
        { name: 'Target', value: h.ringkas.map(() => target), lineStyle: { type: 'dashed', color: '#6366f1' }, itemStyle: { color: '#6366f1' }, symbol: 'none' }] }] });
  }

  /* ---------- rapor mahasiswa: level 2 (mata kuliah ini) dan level 3 (lintas mata kuliah) ---------- */
  const lintasBoleh = () => ['admin', 'developer'].includes(ctx.role) || (ctx.role === 'prodi' && ctx.prodi === (mk() || {}).prodi);
  const rata = (arr) => { const a = arr.filter(v => v != null); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; };
  function cetakHtml(html, judul) {
    const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(15,23,42,.7);display:flex;flex-direction:column';
    ov.innerHTML = `<div style="display:flex;gap:8px;padding:8px 12px;background:#0f172a;align-items:center;flex-wrap:wrap"><b style="color:#fff">${esc(judul)}</b><div style="flex:1"></div><span class="small" style="color:#cbd5e1">Di jendela cetak pilih “Simpan sebagai PDF”, ukuran A4.</span><button class="btn pri sm" id="rp-print">Cetak atau simpan PDF</button><button class="btn sm" id="rp-tutup">Tutup</button></div><iframe style="flex:1;border:0;background:#fff"></iframe>`;
    document.body.appendChild(ov); ov.querySelector('iframe').srcdoc = html;
    ov.querySelector('#rp-tutup').onclick = () => ov.remove();
    ov.querySelector('#rp-print').onclick = () => { const w = ov.querySelector('iframe').contentWindow; w.focus(); w.print(); };
  }
  async function bukaRapor(ix) {
    const h = st.hasil, m = h.mahasiswa[ix], rec = mk(); if (!m || !rec) return;
    const sekelas = h.mahasiswa.filter(x => x.kelas === m.kelas);
    const cplAll = Array.from(new Set(cpmkMk().flatMap(c => c.cpl || []))).sort((a, b) => kodeCpl(a).localeCompare(kodeCpl(b), 'id', { numeric: true }));
    const cplRows = cplAll.map(id => ({ id, kode: kodeCpl(id), teks: short((S.cpl.find(c => c.id === id) || {}).teks || '', 120), skor: m.cpl[id] == null ? null : m.cpl[id], rataKelas: rata(sekelas.map(x => x.cpl[id])) }));
    const cpmkRows = cpmkMk().map(c => ({ id: c.id, kode: c.kode || c.id, teks: short(c.teks || '', 110), skor: m.cpmk[c.id] == null ? null : m.cpmk[c.id], rataKelas: rata(sekelas.map(x => x.cpmk[c.id])), cpl: (c.cpl || []).map(kodeCpl) }));
    const kal = narasi({ nama: m.nama, cplRows, cpmkRows, ambang });
    const bar = (v) => { const p = predikat(v, ambang); return v == null ? '<span class="muted">belum diisi</span>' : `<span style="display:inline-block;width:120px;height:8px;background:#e2e8f0;border-radius:4px;vertical-align:middle"><i style="display:block;height:8px;width:${Math.min(100, v)}%;background:${p.w};border-radius:4px"></i></span> <b>${fmt(v, 1)}</b>`; };
    const tag = (v) => { const p = predikat(v, ambang); return `<b style="color:${p.w}">${p.t}</b>`; };
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    const meta = { institusi: SKPI_DEF.institusi || 'Politeknik Energi dan Mineral Akamigas', prodiNama: (S.prodi.find(x => x.id === rec.prodi) || {}).nama || rec.prodi, logo: new URL('assets/img/logo-pem-akamigas.png', document.baseURI).href, mhs: { nim: m.nim, nama: m.nama, kelas: m.kelas, angkatan: m.angkatan }, mk: { kode: rec.kode || rec.id, nama: rec.nama }, smt: st.smt, ambang };
    let lintas = null;
    const tutup = () => bg.remove();
    function tampil2() {
      const rt = rata(cplRows.map(r => r.skor)), pr = predikat(rt, ambang);
      bg.innerHTML = `<div class="modal card wide" role="dialog" aria-modal="true" style="max-width:920px;width:96vw"><div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3 style="margin:0">${esc(m.nama || m.nim)}</h3><div class="small muted">NIM ${esc(m.nim)} · ${m.kelas ? 'Kelas ' + esc(m.kelas) + ' · ' : ''}Angkatan ${esc(m.angkatan)} · ${esc(rec.kode || '')} ${esc(rec.nama)}</div></div><div style="text-align:right"><div class="small muted">Rata-rata CPL</div><div style="font-size:22px;font-weight:800;color:${pr.w}">${fmt(rt, 1)}</div>${tag(rt)}</div></div>
        <div class="modal-isi" style="max-height:70vh;overflow:auto"><p class="small" style="background:rgba(14,165,233,.08);border-left:3px solid #0ea5e9;padding:8px 10px;margin:10px 0">${esc(kal)}</p>
        <h4 style="margin:10px 0 4px">CPL</h4><div class="tbl-wrap"><table class="tbl n-rp"><thead><tr><th>CPL</th><th>Skor</th><th class="num">Rata-rata kelas</th><th>Predikat</th></tr></thead><tbody>${cplRows.map(r => `<tr style="cursor:default"><td><b>${esc(r.kode)}</b> <span class="small muted" style="white-space:normal">${esc(r.teks)}</span></td><td>${bar(r.skor)}</td><td class="num">${fmt(r.rataKelas, 1)}</td><td>${tag(r.skor)}</td></tr>`).join('')}</tbody></table></div>
        <h4 style="margin:12px 0 4px">CPMK</h4><div class="tbl-wrap"><table class="tbl n-rp"><thead><tr><th>CPMK</th><th>Skor</th><th class="num">Rata-rata kelas</th><th>Predikat</th></tr></thead><tbody>${cpmkRows.map(r => `<tr style="cursor:default"><td><b>${esc(r.kode)}</b> <span class="small muted" style="white-space:normal">${esc(r.teks)} (${esc(r.cpl.join(', '))})</span></td><td>${bar(r.skor)}</td><td class="num">${fmt(r.rataKelas, 1)}</td><td>${tag(r.skor)}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="drawer-act" style="margin-top:10px;flex-wrap:wrap">${lintasBoleh() ? '<button class="btn sm" id="rp-lintas">Lihat lintas mata kuliah →</button>' : ''}<button class="btn sm" id="rp-cetak">${icon('download')} Cetak rapor</button><button class="btn pri sm" id="rp-x">Tutup</button></div></div>`;
      bg.querySelector('#rp-x').onclick = tutup;
      bg.querySelector('#rp-cetak').onclick = () => cetakHtml(htmlRapor({ ...meta, cplRows, cpmkRows, narasi: kal, lintas }), 'Rapor kompetensi · ' + (m.nama || m.nim));
      const bl = bg.querySelector('#rp-lintas'); if (bl) bl.onclick = tampil3;
    }
    async function tampil3() {
      bg.querySelector('#rp-lintas').disabled = true;
      let docs = []; try { docs = (await DB.dok.daftar('nilai')).filter(d => d.prodi === rec.prodi); } catch (e) { toast('Data MK lain tidak terbaca: ' + (e.message || e)); }
      const cur = { id: idDok(st.mk, st.smt, m.kelas), mk: st.mk, prodi: rec.prodi, smt: st.smt, kelas: m.kelas, kolom: st.tabel.kolom.map(c => c.nama), peta: st.peta, mhs: st.tabel.mhs };
      docs = docs.filter(d => d.id !== cur.id).concat([cur]);
      const L = lintasMk(S, m.nim, docs, ambang, P.nimPos, P.nimLen);
      const cplP = S.cpl.filter(c => c.prodi === rec.prodi).sort((a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true }));
      const rows3 = cplP.map(c => ({ id: c.id, kode: c.kode, teks: short(c.teks || '', 120), skor: L.cpl[c.id] ? L.cpl[c.id].skor : null, n: L.cpl[c.id] ? L.cpl[c.id].dari.length : 0 }));
      const mkR = L.mkRows.slice().sort((a, b) => (b.rata || 0) - (a.rata || 0));
      const menguatkan = mkR.filter(r => r.rata != null && r.rata >= BATAS_KUAT).slice(0, 3).map(r => r.mk.nama), melemahkan = mkR.filter(r => r.rata != null && r.rata < ambang).map(r => r.mk.nama);
      const kal3 = narasi({ nama: m.nama, cplRows: rows3, cpmkRows: [], ambang, lintas: { menguatkan, melemahkan } });
      lintas = { narasi: kal3, cplRows: rows3.filter(r => r.skor != null), mkRows: mkR.map(r => ({ kode: r.mk.kode || r.mk.id, nama: r.mk.nama, smt: r.smt, rata: r.rata, cpl: Object.keys(r.cpl).map(id => ({ kode: kodeCpl(id), skor: r.cpl[id] })) })) };
      bg.innerHTML = `<div class="modal card wide" role="dialog" aria-modal="true" style="max-width:980px;width:96vw"><h3 style="margin:0">${esc(m.nama || m.nim)} · lintas mata kuliah</h3><div class="small muted">NIM ${esc(m.nim)} · ${mkR.length} mata kuliah sudah dinilai. Hanya mata kuliah yang datanya sudah tersimpan ikut dihitung.</div>
        <div class="modal-isi" style="max-height:72vh;overflow:auto"><p class="small" style="background:rgba(14,165,233,.08);border-left:3px solid #0ea5e9;padding:8px 10px;margin:10px 0">${esc(kal3)}</p>
        <h4 style="margin:10px 0 4px">CPL gabungan (berbobot SKS)</h4><div class="tbl-wrap"><table class="tbl n-rp"><thead><tr><th>CPL</th><th>Skor</th><th class="num">Jumlah MK</th><th>Predikat</th></tr></thead><tbody>${rows3.map(r => `<tr style="cursor:default"><td><b>${esc(r.kode)}</b> <span class="small muted" style="white-space:normal">${esc(r.teks)}</span></td><td>${bar(r.skor)}</td><td class="num">${r.n || '–'}</td><td>${tag(r.skor)}</td></tr>`).join('')}</tbody></table></div>
        <h4 style="margin:12px 0 4px">Mata kuliah: menguatkan dan melemahkan</h4><div class="tbl-wrap"><table class="tbl n-rp"><thead><tr><th>Mata kuliah</th><th>Semester</th><th class="num">Rata-rata CPL</th><th>Skor per CPL</th></tr></thead><tbody>${mkR.map(r => `<tr style="cursor:default"><td><b>${esc(r.mk.kode || r.mk.id)}</b> ${esc(r.mk.nama)}</td><td>${esc(r.smt)}</td><td class="num">${tag(r.rata)} <b>${fmt(r.rata, 1)}</b></td><td style="white-space:normal">${Object.keys(r.cpl).map(id => `${esc(kodeCpl(id))} <b style="color:${predikat(r.cpl[id], ambang).w}">${fmt(r.cpl[id], 1)}</b>`).join(' · ')}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="drawer-act" style="margin-top:10px;flex-wrap:wrap"><button class="btn sm" id="rp-kembali">← Kembali ke mata kuliah ini</button><button class="btn sm" id="rp-cetak">${icon('download')} Cetak rapor lengkap</button><button class="btn sm" id="rp-word">${icon('download')} Unduh SKPI (Word)</button><button class="btn pri sm" id="rp-x">Tutup</button></div></div>`;
      bg.querySelector('#rp-x').onclick = tutup; bg.querySelector('#rp-kembali').onclick = tampil2;
      bg.querySelector('#rp-word').onclick = async (ev) => { const bt = ev.currentTarget; bt.disabled = true; try { const pr = S.prodi.find(x => x.id === rec.prodi) || {}; unduh(await berkasDocxSkpiWord({ institusi: meta.institusi, prodiNama: meta.prodiNama, mhs: meta.mhs, ambang, rata: rata(rows3.map(r => r.skor)), narasi: kal3, kaprodi: pr.kaprodi || '', cplRows: rows3.map(r => ({ kode: r.kode, teks: ((S.cpl.find(c => c.id === r.id) || {}).teks) || '', skor: r.skor, n: r.n })), mkRows: lintas.mkRows }), `SKPI_${m.nim}.docx`); } catch (e) { toast('Gagal membuat Word: ' + (e.message || e)); } bt.disabled = false; };
      bg.querySelector('#rp-cetak').onclick = () => cetakHtml(htmlRapor({ ...meta, cplRows, cpmkRows, narasi: kal, lintas }), 'Rapor kompetensi lengkap · ' + (m.nama || m.nim));
    }
    bg.onclick = (e) => { if (e.target === bg) tutup(); };
    tampil2(); document.body.appendChild(bg);
  }

  async function simpan() {
    const m = mk(), smt = st.smt.trim(), h = st.hasil;
    if (!m || !smt || !h) return;
    if (h.angkatan.includes('?') && !(await tanya('Sebagian mahasiswa tidak terbaca angkatannya dan tidak ikut rekap, tetapi datanya tetap tersimpan per mahasiswa. Lanjutkan?', 'Simpan'))) return;
    const peta = {}; st.tabel.kolom.forEach(k => { const p = st.peta[k.nama]; if (p && (p.cpmk || (p.bagi || []).length)) peta[k.nama] = { cpmk: p.cpmk || ((p.bagi || [])[0] || {}).cpmk || '', bobot: +p.bobot || 1, ...((p.bagi || []).length ? { bagi: p.bagi.filter(x => x.cpmk).map(x => ({ cpmk: x.cpmk, persen: +x.persen || 0 })) } : {}) }; });
    const tgl = new Date().toISOString().slice(0, 10), pre = `CN-${m.id}-${kunci(smt)}-`, kelasSet = new Set(h.kelas);
    const baru = h.baris.filter(b => b.angkatan !== '?').map(b => ({ id: `${pre}${kunci(b.kelas) || 'semua'}-${b.angkatan}-${b.cpl}`, prodi: m.prodi, angkatan: b.angkatan, cpl: b.cpl, pi: '', mk: m.id, smt, kelas: b.kelas, n: b.n, lulus: b.lulus, rata: +b.rata.toFixed(1), ambang, peta: Object.fromEntries(Object.entries(peta).map(([k, v]) => [k.slice(0, 40), v])), catatan: `Dari nilai ${m.nama}, ${smt}${b.kelas ? ', kelas ' + b.kelas : ''}`, tgl }));
    if (!baru.length) { toast('Tidak ada angkatan yang terbaca dari NIM.'); return; }
    for (const r of S.capaian.filter(r => r.id.startsWith(pre) && kelasSet.has(r.kelas || '') && !baru.some(b => b.id === r.id))) await remove('capaian', r.id);
    await saveMany('capaian', baru, `Simpan capaian CPL dari nilai ${m.kode || m.id} ${smt}`);
    /* data per mahasiswa, satu dokumen per kelas */
    let gagalDok = '';
    for (const k of h.kelas) {
      const ms = h.mahasiswa.filter(x => x.kelas === k).map(x => x.nim);
      const mhs = st.tabel.mhs.filter(x => ms.includes(x.nim)).map(x => ({ nim: x.nim, nama: x.nama, kelas: k, v: x.v }));
      try { await DB.dok.tulis('nilai', { id: idDok(m.id, smt, k), mk: m.id, prodi: m.prodi, smt, kelas: k, t: new Date().toISOString(), oleh: (DB.user && DB.user.email) || ctx.role || '', ambang, kolom: st.tabel.kolom.map(c => c.nama), peta, mhs }); }
      catch (e) { gagalDok = e.message || String(e); }
    }
    await addLog(`Simpan nilai dan capaian CPL ${m.kode || m.id} ${smt}`);
    st.teks = ''; st.tabel = null; st.hasil = null;
    toast(gagalDok ? 'Rekap tersimpan, tetapi data per mahasiswa gagal disimpan: ' + gagalDok + '. Periksa aturan Firestore kur_nilai.' : `Tersimpan: ${baru.length} baris rekap dan data ${h.mhs} mahasiswa.`); rerender();
  }

  function baca(rows) {
    st.galat = ''; st.hasil = null;
    if (!st.mk) { st.galat = 'Pilih mata kuliah dulu.'; st.tabel = null; return ulang(); }
    const t = kenaliTabel(rows);
    if (t.galat) { st.galat = t.galat; st.tabel = null; return ulang(); }
    st.tabel = t; st.teks = '';
    const simpanan = S.capaian.find(r => r.mk === st.mk && r.peta), tebak = tebakPeta(t.kolom, cpmkMk());
    st.peta = {}; t.kolom.forEach(k => { const s = simpanan && simpanan.peta[k.nama.slice(0, 40)]; st.peta[k.nama] = s ? JSON.parse(JSON.stringify(s)) : tebak[k.nama]; });
    ulang();
  }

  const sm = el.querySelector('#n-mk');
  if (sm) {
    sm.onchange = () => { st.mk = sm.value; st.tabel = null; st.hasil = null; st.peta = {}; ulang(); };
    el.querySelector('#n-smt').oninput = (e) => { st.smt = e.target.value; };
    el.querySelector('#n-kelas').oninput = (e) => { st.kelas = e.target.value; };
    const ta = el.querySelector('#n-teks'), bb = el.querySelector('#n-baca');
    if (ta) { ta.oninput = () => { st.teks = ta.value; bb.disabled = !ta.value.trim(); }; bb.onclick = () => baca(bacaTempel(ta.value)); }
    const kb = el.querySelector('#n-kosong'); if (kb) kb.onclick = () => { st.teks = ''; st.tabel = null; st.hasil = null; st.galat = ''; ulang(); };
    const fi = el.querySelector('#n-file');
    el.querySelector('#n-xl').onclick = () => { if (!st.mk) { st.galat = 'Pilih mata kuliah dulu.'; return ulang(); } fi.click(); };
    fi.onchange = async () => {
      const f = fi.files[0]; if (!f) return;
      st.membaca = true; ulang();
      try { const X = await loadXLSX(), wb = X.read(await f.arrayBuffer(), { type: 'array' }); st.membaca = false; baca(X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' })); }
      catch (e) { st.membaca = false; st.galat = 'Berkas tidak terbaca: ' + (e.message || e); ulang(); }
    };
  }
  el.querySelectorAll('[data-buka]').forEach(b => b.onclick = async () => {
    const g = daftarGrup[+b.dataset.buka];
    try {
      const d = await DB.dok.baca('nilai', idDok(g.mk, g.smt, g.kelas));
      if (!d) { toast('Data per mahasiswa untuk hasil ini tidak ditemukan. Hanya rekap yang tersimpan.'); return; }
      st.mk = g.mk; st.smt = g.smt; st.kelas = g.kelas; st.galat = '';
      st.tabel = { ada: { nama: true, kelas: true }, kolom: d.kolom.map((nama, i) => ({ i, nama })), mhs: d.mhs };
      st.peta = d.peta || {}; st.hasil = null; st.auto = true; ulang();
    } catch (e) { toast('Data tidak terbaca: ' + (e.message || e)); }
  });
  el.querySelectorAll('[data-hapus]').forEach(b => b.onclick = async () => {
    const g = daftarGrup[+b.dataset.hapus]; if (!(await tanya(`Hapus hasil dan data mahasiswa ${g.smt}${g.kelas ? ' kelas ' + g.kelas : ''} untuk mata kuliah ini?`, 'Hapus'))) return;
    for (const r of g.baris) await remove('capaian', r.id);
    try { await DB.dok.hapus('nilai', idDok(g.mk, g.smt, g.kelas)); } catch (e) { /* belum ada atau tidak berhak */ }
    await addLog(`Hapus capaian CPL dari nilai ${g.mk} ${g.smt}`); rerender();
  });
  gambarPeta();
}
