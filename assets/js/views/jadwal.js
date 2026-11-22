/* KUREKAM · Jadwal Tahapan dan Pemantauan Progres */
import { S, ctx, save, remove, rerender, esc, icon, saveSettings, addLog } from '../app.js';
import { PERAN } from '../config.js';
import { rpsOf, rpsLengkap } from '../rules.js';
import { TAHAP_BAWAAN, TAHAP_AUTO, TARGET_BAWAAN, jadwalOf, jadwalTanggal, progresTahap, statusTahap, papan, dosenRps, pengingat, hariIni, tambahHari, selisihHari, fmtTgl, idTanda, PELAKSANA, perans, pelaksanaTeks } from '../jadwal.js';
import { head, formDrawer, stTag, prodiTag, bar, pctColor, tanya } from './ui.js';

const bisaAtur = () => ['wadir', 'admin', 'developer'].includes(ctx.role);
const bisaTandai = (t) => ctx.role === 'admin' || ctx.role === 'developer' || perans(t).includes(ctx.role) || (perans(t).includes('semua') && ctx.role === 'wadir');

/** Banner pengingat untuk Beranda dan RPS & SAP. */
export function bannerPengingat() {
  let h = '';
  try { h = pengingat(S, ctx).slice(0, 3).map(x => `<div class="ribbon ${x.k === 'bad' ? 'bad' : x.k === 'near' ? '' : 'info'}" ${x.k === 'near' ? 'style="background:#fef3c7;border-color:#f59e0b"' : ''}>${icon(x.k === 'bad' ? 'alert' : 'info')} ${esc(x.teks)} <a href="#${x.rute}"><b>Buka</b></a></div>`).join(''); } catch (e) { console.error(e); }
  return h;
}

function gantt(T, mulai) {
  if (!T.length) return '<div class="empty small">Belum ada tahap. Tambahkan lewat tombol Atur jadwal.</div>';
  const hari = hariIni(), awal = mulai || '2000-01-01', ak = T.map(t => t.offset + Math.max(1, t.durasi)), total = Math.max(...ak, 1);
  const pos = (t) => ({ l: t.offset / total * 100, w: Math.max(1, t.durasi) / total * 100 });
  const ht = mulai ? selisihHari(awal, hari) : -1, pHari = ht >= 0 && ht <= total ? ht / total * 100 : null;
  const nt = Math.min(total, 14), ticks = Array.from({ length: nt }, (_, i) => Math.round(i * total / nt));
  return `<div class="gantt">
    <div class="g-axis"><div class="g-lbl"></div><div class="g-track">${Array.from(new Set(ticks)).map(d => `<span style="left:${d / total * 100}%">${mulai ? fmtTgl(tambahHari(mulai, d)) : 'H+' + d}</span>`).join('')}</div></div>
    ${T.map(t => { const p = pos(t); return `<div class="g-row"><div class="g-lbl"><b>${esc(t.nama)}</b><small>${esc(pelaksanaTeks(t))}${mulai ? ` · ${fmtTgl(t.awal)}${t.durasi > 1 ? ' – ' + fmtTgl(t.akhir) : ''}` : ` · hari ke-${t.offset + 1} s.d. ${t.offset + t.durasi}`}</small></div><div class="g-track"><i class="g-bar ${t.mode === 'tonggak' ? 'ms' : ''}" style="left:${p.l}%;width:${p.w}%;--c:#6366f1"></i>${pHari != null ? `<u class="g-now" style="left:${pHari}%"></u>` : ''}</div></div>`; }).join('')}
  </div>`;
}

export default function jadwalView(el) {
  const J = jadwalOf(S), T = jadwalTanggal(S), mulai = J.mulai, hari = hariIni();
  const lihatSemua = ['wadir', 'spm', 'akademik', 'admin', 'developer'].includes(ctx.role);
  const prodiList = lihatSemua ? S.prodi : S.prodi.filter(p => p.id === ctx.prodi);
  const rapat = T.find(t => t.id === 't7') || T.find(t => t.mode === 'tonggak');
  const atur = bisaAtur() ? `<button class="btn pri sm" id="atur">${icon('edit')} Atur jadwal</button>` : '';
  const aturKet = mulai
    ? `Mulai <b>${fmtTgl(mulai, true)}</b>${rapat && rapat.awal ? ` · rapat evaluasi <b>${fmtTgl(rapat.awal, true)}</b>${hari <= rapat.awal ? ` (${selisihHari(hari, rapat.awal)} hari lagi)` : ''}` : ''} · target minimal <b>${J.rpsMin} RPS</b> per dosen (terisi minimal ${J.rpsLengkap}%).`
    : `Tanggal mulai belum ditetapkan, sehingga tahap belum berjalan dan belum ada tenggat. ${bisaAtur() ? 'Tetapkan lewat tombol Atur jadwal.' : 'Wakil Direktur I akan menetapkannya.'}`;
  let h = `<div class="card">${head('Jadwal tahapan evaluasi kurikulum', 'Tanggal tiap tahap dihitung dari tanggal mulai dan dapat digeser Wakil Direktur I', 'calendar', '#8b5cf6', atur)}
    <div class="${mulai ? '' : 'ribbon info'}" style="margin:6px 0 10px">${aturKet}</div>${gantt(T, mulai)}</div>`;

  if (ctx.role === 'dosen') h += kartuDosen(J);
  else {
    const kol = T.filter(t => !t.global && t.mode !== 'tonggak');
    h += `<div class="card" style="margin-top:14px">${head('Papan pemantauan', lihatSemua ? 'Status tiap tahap per prodi, dihitung otomatis dari isi aplikasi' : 'Status tahap untuk prodi Anda', 'pulse', '#0ea5e9')}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th>${kol.map(t => `<th>${esc(t.nama)}<br><span class="small muted">${esc(pelaksanaTeks(t))}${mulai ? ' · ' + fmtTgl(t.akhir) : ''}</span></th>`).join('')}</tr></thead><tbody>
      ${prodiList.map(p => `<tr><td data-l="Prodi">${prodiTag(p.id)}</td>${kol.map(t => { const pr = progresTahap(S, t.id, p.id), st = statusTahap(t, pr, hari); const tom = t.mode === 'tanda' && bisaTandai(t) && (mulai || ctx.role === 'admin') ? `<div style="margin-top:4px">${pr.done ? `<button class="btn sm ghost" data-batal="${t.id}|${p.id}">Batalkan tanda</button>` : `<button class="btn sm pri" data-tanda="${t.id}|${p.id}">${icon('check')} Tandai selesai</button>`}</div>` : ''; return `<td data-l="${esc(t.nama)}">${stTag(st.k, st.t)}<div class="small muted" style="margin-top:3px">${esc(pr.teks)}</div>${pr.pct != null ? bar(pr.pct, pctColor(pr.pct)) : ''}${tom}</td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>
      ${T.filter(t => t.global).map(t6 => { const pr = progresTahap(S, t6.id, '*'), st = statusTahap(t6, pr, hari); return `<div class="filters" style="margin-top:12px"><b>${esc(t6.nama)}</b> ${stTag(st.k, st.t)} <span class="small muted">${esc(pr.teks)}</span>${bisaTandai(t6) ? (pr.done ? `<button class="btn sm ghost" data-batal="${t6.id}|*">Batalkan tanda</button>` : `<button class="btn sm pri" data-tanda="${t6.id}|*">${icon('check')} Tandai selesai</button>`) : ''}</div>`; }).join('')}</div>
      <div class="card" style="margin-top:14px">${head('Dosen yang mengisi RPS', 'Target minimal per dosen: ' + J.rpsMin + ' RPS terisi minimal ' + J.rpsLengkap + '%. MK semester lanjut ikut dihitung.', 'user', '#10b981')}
      ${prodiList.map(p => { const dr = dosenRps(S, p.id), ok = dr.filter(d => d.ok).length; return `<details class="dtl" ${ctx.role === 'prodi' && dr.length && ok < dr.length ? 'open' : ''}><summary>${prodiTag(p.id)} <b>${ok} dari ${dr.length}</b> dosen memenuhi target ${dr.length ? bar(ok / dr.length * 100, pctColor(ok / dr.length * 100), '120px') : ''}</summary>${dr.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dosen</th><th class="num">MK diampu</th><th class="num">RPS terisi</th><th class="num">Target</th><th>Status</th></tr></thead><tbody>${dr.map(d => `<tr><td data-l="Dosen">${esc(d.nama)}</td><td class="num" data-l="MK diampu">${d.nMk}</td><td class="num" data-l="RPS terisi">${d.terisi}</td><td class="num" data-l="Target">${d.target}</td><td data-l="Status">${d.ok ? stTag('ok', 'Memenuhi') : stTag(d.terisi ? 'near' : 'bad', d.terisi ? 'Belum penuh' : 'Belum mengisi')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty small">Belum ada penugasan dosen di prodi ini. Isi di menu Penugasan dan Beban Dosen.</div>'}</details>`; }).join('')}</div>`;
  }
  el.innerHTML = h;

  const ab = el.querySelector('#atur'); if (ab) ab.onclick = () => aturJadwal(J);
  el.querySelectorAll('[data-tanda]').forEach(b => b.onclick = async () => {
    const [tid, pid] = b.dataset.tanda.split('|'), t = T.find(x => x.id === tid);
    if (!(await tanya(`Tandai tahap "${t.nama}"${pid === '*' ? '' : ' untuk prodi ' + pid} sebagai selesai?`, 'Tandai selesai'))) return;
    await save('jadwal', { id: idTanda(tid, pid), tahap: tid, prodi: pid, tgl: hariIni(), oleh: PERAN[ctx.role].nama }, `Tandai selesai ${t.nama} ${pid === '*' ? '' : pid}`); rerender();
  });
  el.querySelectorAll('[data-batal]').forEach(b => b.onclick = async () => {
    const [tid, pid] = b.dataset.batal.split('|'), t = T.find(x => x.id === tid);
    if (!(await tanya(`Batalkan tanda selesai "${t.nama}"${pid === '*' ? '' : ' untuk prodi ' + pid}?`, 'Batalkan'))) return;
    await remove('jadwal', idTanda(tid, pid), `Batalkan tanda ${t.nama} ${pid === '*' ? '' : pid}`); rerender();
  });
}

function kartuDosen(J) {
  const sa = dosenRps(S, '').find(d => d.id === ctx.dosen);
  const t3 = jadwalTanggal(S).find(t => t.id === 't3') || { awal: '', akhir: '' }, pr = sa ? { done: sa.ok, pct: sa.target ? Math.min(100, sa.terisi / sa.target * 100) : 100 } : null, st = statusTahap(t3, pr, hariIni());
  const mk = S.tugas.filter(t => t.dosen === ctx.dosen).map(t => S.mk.find(m => m.id === t.mk)).filter(m => m && !/magang|tugas akhir/i.test(m.kel));
  if (!ctx.dosen || !sa) return `<div class="card" style="margin-top:14px">${head('Tugas saya', '', 'user', '#0ea5e9')}<div class="empty">Belum ada mata kuliah yang ditugaskan kepada Anda. Hubungi Prodi.</div></div>`;
  return `<div class="card" style="margin-top:14px">${head('Tugas saya', 'Isi RPS mata kuliah yang Anda ampu', 'user', '#0ea5e9', stTag(st.k, st.t))}
    <div class="grid g3 mini"><div><small>Target minimal</small><b>${sa.target} RPS</b></div><div><small>Sudah terisi (minimal ${J.rpsLengkap}%)</small><b>${sa.terisi}</b></div><div><small>Tenggat</small><b>${t3.akhir ? fmtTgl(t3.akhir) : 'belum ditetapkan'}</b></div></div>
    <div style="margin:10px 0">${bar(pr.pct, pctColor(pr.pct))}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mata kuliah</th><th class="num">Semester</th><th class="num">RPS terisi</th><th>Status</th></tr></thead><tbody>${mk.map(m => { const r = rpsOf(S, m.id), l = rpsLengkap(r); return `<tr><td data-l="Mata kuliah">${esc(m.nama)} <span class="muted small">${esc(m.kode)}</span></td><td class="num" data-l="Semester">${m.smt}</td><td class="num" data-l="RPS terisi">${Math.round(l)}%</td><td data-l="Status">${l >= J.rpsLengkap ? stTag('ok', 'Memenuhi') : l > 0 ? stTag('near', 'Sebagian') : stTag('bad', 'Belum diisi')}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="filters" style="margin-top:10px"><a class="btn pri" href="#rps">${icon('edit')} Isi RPS sekarang</a></div></div>`;
}

const JENIS = [{ v: 'tanda', t: 'Ditandai selesai per prodi' }, { v: 'global', t: 'Ditandai selesai satu kali (tingkat institusi)' }, { v: 'tonggak', t: 'Tonggak atau rapat (tanpa penandaan)' }];
const baruId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const jenisOf = (t) => t.mode === 'auto' ? 'auto' : t.mode === 'tonggak' ? 'tonggak' : t.global ? 'global' : 'tanda';

/** Satu baris editor tahap: semua isian dalam kartu kecil agar nyaman di layar HP. */
function barisTahap(t, i, n) {
  const auto = t.mode === 'auto', tg = TARGET_BAWAAN[t.id] != null;
  const lbl = t.id === 't1' ? 'Target MK terpetakan ke CPL (%)' : t.id === 't2' ? 'Maksimal butir belum sesuai' : '';
  return `<div class="tj-row card" data-id="${esc(t.id)}" data-mode="${esc(t.mode)}" style="margin:8px 0;padding:12px">
    <div class="form-grid">
      <div class="field full"><label>Nama tahap</label><input class="inp" data-f="nama" value="${esc(t.nama)}"></div>
      <div class="field full"><label>Pelaksana (boleh lebih dari satu)</label><div class="chips-pick" data-perans>${Object.keys(PELAKSANA).map(k => `<label class="cp ${perans(t).includes(k) ? 'on' : ''}"><input type="checkbox" value="${k}" ${perans(t).includes(k) ? 'checked' : ''}>${esc(PELAKSANA[k])}</label>`).join('')}</div></div>
      <div class="field"><label>Jenis penilaian</label>${auto ? '<input class="inp" disabled value="Dihitung otomatis dari isi aplikasi">' : `<select class="inp" data-f="jenis">${JENIS.map(o => `<option value="${o.v}" ${o.v === jenisOf(t) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`}</div>
      <div class="field"><label>Mulai hari ke- (0 = hari mulai)</label><input class="inp" type="number" step="1" min="0" data-f="offset" value="${t.offset}"></div>
      <div class="field"><label>Lama (hari)</label><input class="inp" type="number" step="1" min="1" data-f="durasi" value="${t.durasi}"></div>
      ${tg ? `<div class="field"><label>${lbl}</label><input class="inp" type="number" step="1" min="0" data-f="target" value="${t.target}"></div>` : ''}
      ${t.id === 't3' ? '<div class="field"><label>Target RPS</label><div class="hint">Target RPS per dosen dan persen keterisian diatur pada isian di atas.</div></div>' : ''}
      <div class="field full"><label>Keterangan target</label><input class="inp" data-f="ket" value="${esc(t.ket || '')}" placeholder="Tuliskan target tahap ini"></div>
    </div>
    <div class="filters" style="margin-top:6px"><button type="button" class="btn sm ghost" data-up ${i === 0 ? 'disabled' : ''}>${icon('arrowUp') || '↑'} Naik</button><button type="button" class="btn sm ghost" data-down ${i === n - 1 ? 'disabled' : ''}>${icon('arrowDown') || '↓'} Turun</button><div class="sp"></div><button type="button" class="btn sm danger" data-hapus>${icon('trash')} Hapus tahap</button></div>
  </div>`;
}

function aturJadwal(J) {
  const f = [{ k: 'mulai', label: 'Tanggal mulai evaluasi (tahap berjalan setelah diisi)', type: 'date', full: true },
    { k: 'rpsMin', label: 'Target minimal RPS per dosen', type: 'number', step: '1' },
    { k: 'rpsLengkap', label: 'RPS dianggap terisi bila pertemuan terisi minimal (%)', type: 'number', step: '5' }];
  const o = { mulai: J.mulai, rpsMin: J.rpsMin, rpsLengkap: J.rpsLengkap };
  let daftar = J.tahap.map(t => ({ ...t })), dr = null;
  /* baca nilai isian baris ke daftar sebelum menggambar ulang */
  const baca = () => { if (!dr) return; dr.querySelectorAll('.tj-row').forEach(r => { const t = daftar.find(x => x.id === r.dataset.id); if (!t) return; t.perans = Array.from(r.querySelectorAll('[data-perans] input:checked')).map(i => i.value); if (t.perans.includes('semua')) t.perans = ['semua']; t.peran = t.perans[0] || 'semua'; r.querySelectorAll('[data-f]').forEach(e => { const k = e.dataset.f; if (k === 'jenis') { t.mode = e.value === 'tonggak' ? 'tonggak' : 'tanda'; t.global = e.value === 'global'; } else if (k === 'offset' || k === 'durasi' || k === 'target') t[k] = e.value === '' ? '' : +e.value; else t[k] = e.value; }); }); };
  const gambar = () => {
    const box = dr.querySelector('#tj-list');
    box.innerHTML = daftar.length ? daftar.map((t, i) => barisTahap(t, i, daftar.length)).join('') : '<div class="empty small">Belum ada tahap. Tambahkan tahap baru di bawah.</div>';
    box.querySelectorAll('.tj-row').forEach(r => {
      const id = r.dataset.id, i = daftar.findIndex(x => x.id === id);
      r.querySelectorAll('[data-perans] input').forEach(i => i.onchange = () => { const g = r.querySelector('[data-perans]'); if (i.checked && i.value === 'semua') g.querySelectorAll('input').forEach(o => { if (o !== i) o.checked = false; }); else if (i.checked) g.querySelector('input[value="semua"]').checked = false; g.querySelectorAll('.cp').forEach(c => c.classList.toggle('on', c.querySelector('input').checked)); });
      r.querySelector('[data-up]').onclick = () => { baca(); if (i > 0) { [daftar[i - 1], daftar[i]] = [daftar[i], daftar[i - 1]]; gambar(); } };
      r.querySelector('[data-down]').onclick = () => { baca(); if (i < daftar.length - 1) { [daftar[i + 1], daftar[i]] = [daftar[i], daftar[i + 1]]; gambar(); } };
      r.querySelector('[data-hapus]').onclick = async () => { baca(); const t = daftar[i]; if (!(await tanya(`Hapus tahap "${t.nama}"? Tanda selesai yang sudah tercatat tidak ikut terhapus dan muncul kembali bila tahap dengan kode yang sama ditambahkan lagi.`, 'Hapus tahap'))) return; daftar.splice(i, 1); gambar(); };
    });
  };
  const extra = `<div class="card-h" style="margin-top:14px"><b>Daftar tahap</b><div class="sp"></div><button type="button" class="btn sm" id="tj-pulih">Pulihkan tahap bawaan</button><button type="button" class="btn sm pri" id="tj-tambah">${icon('plus')} Tambah tahap</button></div>
    <div class="hint">Tambah, hapus, urutkan, atau ubah nama, pelaksana, waktu, dan target tiap tahap. Tahap bawaan pertama sampai ketiga dihitung otomatis; tahap lain ditandai selesai oleh pelaksananya.</div><div id="tj-list"></div>`;
  formDrawer({ title: 'Atur jadwal tahapan', sub: 'Tanggal tiap tahap = tanggal mulai + hari ke-n. Dapat diubah kapan saja; semua pengguna langsung melihat jadwal baru.', fields: f, obj: o, wide: true, extra, onOpen: (d) => {
    dr = d; gambar();
    d.querySelector('#tj-tambah').onclick = () => { baca(); const akhir = daftar.length ? Math.max(...daftar.map(t => (+t.offset || 0) + Math.max(1, +t.durasi || 1))) : 0; daftar.push({ id: baruId(), nama: 'Tahap baru', peran: 'prodi', perans: ['prodi'], mode: 'tanda', global: false, offset: akhir, durasi: 3, ket: '' }); gambar(); const r = dr.querySelectorAll('.tj-row'); const last = r[r.length - 1]; if (last) { last.scrollIntoView({ block: 'center' }); last.querySelector('[data-f="nama"]').select(); } };
    d.querySelector('#tj-pulih').onclick = async () => { if (!(await tanya('Kembalikan daftar tahap ke tujuh tahap bawaan? Perubahan pada daftar tahap di formulir ini hilang.', 'Pulihkan'))) return; daftar = TAHAP_BAWAAN.map(t => ({ ...t })); gambar(); };
  }, onSave: async (x) => {
    if (x.mulai && !/^\d{4}-\d{2}-\d{2}$/.test(x.mulai)) return 'Tanggal mulai tidak valid.';
    baca();
    if (daftar.some(t => !String(t.nama || '').trim())) return 'Nama tahap tidak boleh kosong.';
    const tahap = daftar.map(t => { const r = { id: t.id, nama: String(t.nama).trim(), peran: t.peran, perans: (t.perans && t.perans.length ? t.perans : [t.peran]), mode: t.mode, global: t.mode === 'tanda' && !!t.global, offset: Math.max(0, Math.round(+t.offset || 0)), durasi: Math.max(1, Math.round(+t.durasi || 1)), ket: String(t.ket || '').trim() }; if (TARGET_BAWAAN[t.id] != null) r.target = t.target === '' || t.target == null ? TARGET_BAWAAN[t.id] : Math.max(0, +t.target); return r; });
    S.settings.jadwal = { mulai: x.mulai || '', rpsMin: Math.max(1, Math.round(+x.rpsMin || 2)), rpsLengkap: Math.min(100, Math.max(10, Math.round(+x.rpsLengkap || 80))), custom: true, tahap };
    await saveSettings(); await addLog(`Atur jadwal tahapan (${tahap.length} tahap)${x.mulai ? `, mulai ${x.mulai}` : ', tanggal mulai dikosongkan'}`); rerender();
  } });
}
