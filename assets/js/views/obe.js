/* KUREKAM · Tabel OBE: pemetaan kurikulum per prodi mengikuti Templat Tabel Kurikulum OBE PEM Akamigas (lembar 1 sampai 20)
   dan tabel tambahan IABEE (X1 sampai X4). Semua dihitung dari data KUREKAM; unduh Excel dengan nama lembar seperti templat. */
import { S, ctx, rerender, esc, icon, toast } from '../app.js';
import { tabelObe } from '../obe.js';
import { head, unduh, loadXLSX } from './ui.js';

let tab = 'ringkas';
const ST = { ok: ['#047857', '✓', 'Siap'], near: ['#92400e', '◐', 'Sebagian'], bad: ['#b42335', '○', 'Belum'], na: ['#64748b', '–', 'Belum ada data'] };
const chip = (k) => { const [c, i, t] = ST[k] || ST.na; return `<span class="tag" style="--c:${c}">${i} ${t}</span>`; };
const kode = (t) => (/^X/i.test(t.no) ? t.no : t.no);

function tabelHtml(t) {
  const maks = 120;
  return `<div class="tbl-wrap" style="max-height:520px;overflow:auto"><table class="tbl"><thead><tr>${t.kolom.map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>
    ${t.baris.slice(0, maks).map(r => `<tr>${r.map(c => `<td class="small" style="min-width:90px">${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${t.kolom.length}" class="muted">Belum ada data.</td></tr>`}
    </tbody></table></div>${t.baris.length > maks ? `<div class="small muted">Menampilkan ${maks} dari ${t.baris.length} baris. Unduh Excel untuk seluruhnya.</div>` : ''}`;
}
const cekHtml = (t) => `<div style="margin:10px 0">${t.cek.map(([x, k]) => `<div class="small" style="color:${(ST[k] || ST.na)[0]}">${(ST[k] || ST.na)[1]} ${esc(x)}</div>`).join('')}${(t.catatan || []).map(c => `<div class="small muted">${esc(c)}</div>`).join('')}</div>`;

async function excel(pid, T, hanya) {
  const X = await loadXLSX(), wb = X.utils.book_new(), dipakai = new Set();
  (hanya ? [hanya] : T).forEach(t => {
    const aoa = [[t.judul], [`Program Studi ${pid}`], [], t.kolom, ...t.baris, [], ...(t.catatan || []).map(c => [c])];
    const ws = X.utils.aoa_to_sheet(aoa);
    ws['!cols'] = t.kolom.map((_, i) => ({ wch: i === 0 ? 18 : Math.min(48, 14 + (i === 1 ? 14 : 8)) }));
    let nama = String(t.sheet || t.no).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    while (dipakai.has(nama)) nama = nama.slice(0, 29) + '_' + (dipakai.size);
    dipakai.add(nama); X.utils.book_append_sheet(wb, ws, nama);
  });
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `tabel-obe-${pid}${hanya ? '-' + hanya.no : ''}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function obeView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid);
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  const T = tabelObe(S, pid);
  const inti = T.filter(t => !/^X/i.test(t.no)), iab = T.filter(t => /^X/i.test(t.no));
  if (tab !== 'ringkas' && !T.some(t => t.no === tab)) tab = 'ringkas';
  const siap = T.filter(t => t.k === 'ok').length;
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Pemetaan kurikulum OBE disusun otomatis dari data CPL, BK, MK, CPMK, Sub-CPMK, dan RPS prodi, mengikuti urutan lembar pada templat OBE PEM Akamigas (1 sampai 20) ditambah tabel IABEE X1 sampai X4. Tabel 16 sampai 20 dihitung dari bobot dan teknik penilaian pada RPS dosen. Hasil unduhan Excel memakai nama lembar yang sama dengan templat.</span></div>
  <div class="seg scroll" style="margin:14px 0"><button class="${tab === 'ringkas' ? 'on' : ''}" data-t="ringkas">Ringkasan</button>${T.map(t => `<button class="${t.no === tab ? 'on' : ''}" data-t="${esc(t.no)}">${esc(t.no)}</button>`).join('')}</div><div id="ob-b"></div>`;
  el.querySelectorAll('.seg [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  const b = el.querySelector('#ob-b');
  if (tab === 'ringkas') {
    const baris = (a) => a.map(t => `<tr class="click" data-t="${esc(t.no)}"><td><b>${esc(t.no)}</b></td><td class="small">${esc(t.judul)}</td><td class="small muted">${t.baris.length} baris</td><td>${chip(t.k)}</td></tr>`).join('');
    b.innerHTML = `<div class="card">${head('Tabel pemetaan kurikulum OBE', `Prodi ${esc(pid)} · ${siap} dari ${T.length} tabel siap`, 'grid', '#0ea5e9', `<button class="btn sm pri" id="ob-x">${icon('download')} Unduh Excel semua tabel</button>`)}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Tabel</th><th>Isi</th><th>Status</th></tr></thead><tbody>
      ${baris(inti)}<tr><td colspan="4" class="small muted" style="background:var(--bg2,#f1f5f9)"><b>Tambahan untuk kebutuhan IABEE</b></td></tr>${baris(iab)}
      </tbody></table></div></div>`;
    b.querySelector('#ob-x').onclick = () => excel(pid, T).catch(e => toast(e.message));
    b.querySelectorAll('tr[data-t]').forEach(tr => tr.onclick = () => { tab = tr.dataset.t; rerender(); });
    return;
  }
  const t = T.find(x => x.no === tab);
  b.innerHTML = `<div class="card">${head(`Tabel ${esc(kode(t))}. ${esc(t.judul)}`, `Lembar “${esc(t.sheet)}” · ${t.baris.length} baris`, 'grid', '#0ea5e9', `${chip(t.k)} <button class="btn sm" id="ob-x1">${icon('download')} Unduh lembar ini</button>`)}${cekHtml(t)}${tabelHtml(t)}</div>`;
  b.querySelector('#ob-x1').onclick = () => excel(pid, T, t).catch(e => toast(e.message));
}
