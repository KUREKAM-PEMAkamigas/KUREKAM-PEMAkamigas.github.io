/* KUREKAM · Jadwal Tahapan dan Pemantauan Progres */
import { S, ctx, save, remove, rerender, esc, icon, saveSettings, addLog } from '../app.js';
import { PERAN } from '../config.js';
import { rpsOf, rpsLengkap } from '../rules.js';
import { TAHAP_BAWAAN, jadwalOf, jadwalTanggal, progresTahap, statusTahap, papan, dosenRps, pengingat, hariIni, tambahHari, selisihHari, fmtTgl, idTanda, PELAKSANA } from '../jadwal.js';
import { head, formDrawer, stTag, prodiTag, bar, pctColor, tanya } from './ui.js';

const bisaAtur = () => ['wadir', 'admin', 'developer'].includes(ctx.role);
const bisaTandai = (t) => ctx.role === 'admin' || ctx.role === 'developer' || ctx.role === t.peran;

/** Banner pengingat untuk Beranda dan RPS & SAP. */
export function bannerPengingat() {
  let h = '';
  try { h = pengingat(S, ctx).slice(0, 3).map(x => `<div class="ribbon ${x.k === 'bad' ? 'bad' : x.k === 'near' ? '' : 'info'}" ${x.k === 'near' ? 'style="background:#fef3c7;border-color:#f59e0b"' : ''}>${icon(x.k === 'bad' ? 'alert' : 'info')} ${esc(x.teks)} <a href="#${x.rute}"><b>Buka</b></a></div>`).join(''); } catch (e) { console.error(e); }
  return h;
}

function gantt(T, mulai) {
  const hari = hariIni(), awal = mulai || '2000-01-01', ak = T.map(t => t.offset + Math.max(1, t.durasi)), total = Math.max(...ak, 1);
  const pos = (t) => ({ l: t.offset / total * 100, w: Math.max(1, t.durasi) / total * 100 });
  const ht = mulai ? selisihHari(awal, hari) : -1, pHari = ht >= 0 && ht <= total ? ht / total * 100 : null;
  const nt = Math.min(total, 14), ticks = Array.from({ length: nt }, (_, i) => Math.round(i * total / nt));
  return `<div class="gantt">
    <div class="g-axis"><div class="g-lbl"></div><div class="g-track">${Array.from(new Set(ticks)).map(d => `<span style="left:${d / total * 100}%">${mulai ? fmtTgl(tambahHari(mulai, d)) : 'H+' + d}</span>`).join('')}</div></div>
    ${T.map(t => { const p = pos(t); return `<div class="g-row"><div class="g-lbl"><b>${esc(t.nama)}</b><small>${esc(PELAKSANA[t.peran])}${mulai ? ` · ${fmtTgl(t.awal)}${t.durasi > 1 ? ' – ' + fmtTgl(t.akhir) : ''}` : ` · hari ke-${t.offset + 1} s.d. ${t.offset + t.durasi}`}</small></div><div class="g-track"><i class="g-bar ${t.mode === 'tonggak' ? 'ms' : ''}" style="left:${p.l}%;width:${p.w}%;--c:#6366f1"></i>${pHari != null ? `<u class="g-now" style="left:${pHari}%"></u>` : ''}</div></div>`; }).join('')}
  </div>`;
}

export default function jadwalView(el) {
  const J = jadwalOf(S), T = jadwalTanggal(S), mulai = J.mulai, hari = hariIni();
  const lihatSemua = ['wadir', 'spm', 'akademik', 'admin', 'developer'].includes(ctx.role);
  const prodiList = lihatSemua ? S.prodi : S.prodi.filter(p => p.id === ctx.prodi);
  const rapat = T.find(t => t.id === 't7');
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
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th>${kol.map(t => `<th>${esc(t.nama)}<br><span class="small muted">${esc(PELAKSANA[t.peran])}${mulai ? ' · ' + fmtTgl(t.akhir) : ''}</span></th>`).join('')}</tr></thead><tbody>
      ${prodiList.map(p => `<tr><td data-l="Prodi">${prodiTag(p.id)}</td>${kol.map(t => { const pr = progresTahap(S, t.id, p.id), st = statusTahap(t, pr, hari); const tom = t.mode === 'tanda' && bisaTandai(t) && (mulai || ctx.role === 'admin') ? `<div style="margin-top:4px">${pr.done ? `<button class="btn sm ghost" data-batal="${t.id}|${p.id}">Batalkan tanda</button>` : `<button class="btn sm pri" data-tanda="${t.id}|${p.id}">${icon('check')} Tandai selesai</button>`}</div>` : ''; return `<td data-l="${esc(t.nama)}">${stTag(st.k, st.t)}<div class="small muted" style="margin-top:3px">${esc(pr.teks)}</div>${pr.pct != null ? bar(pr.pct, pctColor(pr.pct)) : ''}${tom}</td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>
      ${(() => { const t6 = T.find(t => t.id === 't6'); const pr = progresTahap(S, 't6', '*'), st = statusTahap(t6, pr, hari); return `<div class="filters" style="margin-top:12px"><b>${esc(t6.nama)}</b> ${stTag(st.k, st.t)} <span class="small muted">${esc(pr.teks)}</span>${bisaTandai(t6) ? (pr.done ? `<button class="btn sm ghost" data-batal="t6|*">Batalkan tanda</button>` : `<button class="btn sm pri" data-tanda="t6|*">${icon('check')} Tandai selesai</button>`) : ''}</div>`; })()}</div>
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
  const t3 = jadwalTanggal(S).find(t => t.id === 't3'), pr = sa ? { done: sa.ok, pct: sa.target ? Math.min(100, sa.terisi / sa.target * 100) : 100 } : null, st = statusTahap(t3, pr, hariIni());
  const mk = S.tugas.filter(t => t.dosen === ctx.dosen).map(t => S.mk.find(m => m.id === t.mk)).filter(m => m && !/magang|tugas akhir/i.test(m.kel));
  if (!ctx.dosen || !sa) return `<div class="card" style="margin-top:14px">${head('Tugas saya', '', 'user', '#0ea5e9')}<div class="empty">Belum ada mata kuliah yang ditugaskan kepada Anda. Hubungi Prodi.</div></div>`;
  return `<div class="card" style="margin-top:14px">${head('Tugas saya', 'Isi RPS mata kuliah yang Anda ampu', 'user', '#0ea5e9', stTag(st.k, st.t))}
    <div class="grid g3 mini"><div><small>Target minimal</small><b>${sa.target} RPS</b></div><div><small>Sudah terisi (minimal ${J.rpsLengkap}%)</small><b>${sa.terisi}</b></div><div><small>Tenggat</small><b>${t3.akhir ? fmtTgl(t3.akhir) : 'belum ditetapkan'}</b></div></div>
    <div style="margin:10px 0">${bar(pr.pct, pctColor(pr.pct))}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mata kuliah</th><th class="num">Semester</th><th class="num">RPS terisi</th><th>Status</th></tr></thead><tbody>${mk.map(m => { const r = rpsOf(S, m.id), l = rpsLengkap(r); return `<tr><td data-l="Mata kuliah">${esc(m.nama)} <span class="muted small">${esc(m.kode)}</span></td><td class="num" data-l="Semester">${m.smt}</td><td class="num" data-l="RPS terisi">${Math.round(l)}%</td><td data-l="Status">${l >= J.rpsLengkap ? stTag('ok', 'Memenuhi') : l > 0 ? stTag('near', 'Sebagian') : stTag('bad', 'Belum diisi')}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="filters" style="margin-top:10px"><a class="btn pri" href="#rps">${icon('edit')} Isi RPS sekarang</a></div></div>`;
}

function aturJadwal(J) {
  const f = [{ k: 'mulai', label: 'Tanggal mulai evaluasi (tahap berjalan setelah diisi)', type: 'date', full: true },
    { k: 'rpsMin', label: 'Target minimal RPS per dosen', type: 'number', step: '1' },
    { k: 'rpsLengkap', label: 'RPS dianggap terisi bila pertemuan terisi minimal (%)', type: 'number', step: '5' }];
  const o = { mulai: J.mulai, rpsMin: J.rpsMin, rpsLengkap: J.rpsLengkap };
  J.tahap.forEach(t => { f.push({ k: t.id + '_o', label: `${t.nama}: mulai hari ke- (0 = hari mulai)`, type: 'number', step: '1' }, { k: t.id + '_d', label: `${t.nama}: lama (hari)`, type: 'number', step: '1' }); o[t.id + '_o'] = t.offset; o[t.id + '_d'] = t.durasi; });
  formDrawer({ title: 'Atur jadwal tahapan', sub: 'Tanggal tiap tahap = tanggal mulai + hari ke-n. Dapat diubah kapan saja; semua pengguna langsung melihat jadwal baru.', fields: f, obj: o, wide: true, onSave: async (x) => {
    if (x.mulai && !/^\d{4}-\d{2}-\d{2}$/.test(x.mulai)) return 'Tanggal mulai tidak valid.';
    const tahap = TAHAP_BAWAAN.map(t => ({ id: t.id, offset: Math.max(0, Math.round(+x[t.id + '_o'] || 0)), durasi: Math.max(1, Math.round(+x[t.id + '_d'] || 1)) }));
    S.settings.jadwal = { mulai: x.mulai || '', rpsMin: Math.max(1, Math.round(+x.rpsMin || 2)), rpsLengkap: Math.min(100, Math.max(10, Math.round(+x.rpsLengkap || 80))), tahap };
    await saveSettings(); await addLog(x.mulai ? `Atur jadwal tahapan, mulai ${x.mulai}` : 'Atur jadwal tahapan (tanggal mulai dikosongkan)'); rerender();
  } });
}
