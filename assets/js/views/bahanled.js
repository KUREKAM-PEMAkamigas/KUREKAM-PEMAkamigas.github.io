/* KUREKAM · Bahan LED IABEE: tabel suplemen A1, A2, B1, B2, C1, C2 (lalu B3 sampai B5) dari data kurikulum, plus data OBE
   (angkatan pertama dan wisuda). Narasi LED dan bukti ditulis di SIMANTAP; di sini hanya tabel dan kesiapannya. */
import { S, ctx, can, save, rerender, esc, icon, toast } from '../app.js';
import { APP_LAIN } from '../config.js';
import { ledBahan, obeProdi, URUTAN_TABEL } from '../ledbahan.js';
import { head, kpi, bar, pctColor, stTag, unduh, loadXLSX, animateCounts } from './ui.js';
import { ledSimantap } from '../sinkron.js';

let tab = 'ringkas', simLed = null;
const ST = { ok: ['ok', 'Siap'], near: ['near', 'Sebagian'], bad: ['bad', 'Belum'], na: ['na', 'Belum ada data'] };
const WARNA = { ok: '#10b981', near: '#f5a524', bad: '#f0616d', na: '#94a3b8' };

function tabelHtml(t) {
  const maks = 60;
  return `<div class="tbl-wrap" style="max-height:480px;overflow:auto"><table class="tbl"><thead><tr>${t.kolom.map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>
    ${t.baris.slice(0, maks).map(r => `<tr>${r.map((c, i) => `<td class="small" ${i === 0 && t.kode !== 'B1' ? 'style="min-width:120px"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${t.kolom.length}" class="muted">Belum ada data.</td></tr>`}
    </tbody></table></div>${t.baris.length > maks ? `<div class="small muted">Menampilkan ${maks} dari ${t.baris.length} baris. Unduh Excel untuk seluruhnya.</div>` : ''}`;
}
const cekHtml = (t) => `<div style="margin:10px 0">${t.cek.map(([x, k]) => `<div class="small" style="color:${k === 'ok' ? '#047857' : k === 'near' ? '#92400e' : '#b42335'}">${k === 'ok' ? '✓' : k === 'near' ? '◐' : '○'} ${esc(x)}</div>`).join('')}</div>`;

async function excel(pid, T) {
  const X = await loadXLSX(), wb = X.utils.book_new();
  T.forEach(t => {
    const aoa = [[`Tabel Suplemen ${t.kode}. ${t.judul}`], [`Program Studi ${pid}`], [], t.kolom, ...t.baris, [], ...t.catatan.map(c => [c])];
    const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = t.kolom.map((_, i) => ({ wch: i === 0 ? 34 : 22 }));
    X.utils.book_append_sheet(wb, ws, t.kode);
  });
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `bahan-led-iabee-${pid}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function bahanLedView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid);
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  const T = ledBahan(S, pid), O = obeProdi(S, pid), ed = can('susun', { prodi: pid });
  const utama = T.slice(0, 6), siap = utama.filter(t => t.k === 'ok').length, rata = Math.round(utama.reduce((a, t) => a + t.pct, 0) / utama.length);
  const tabs = [['ringkas', 'Ringkasan dan OBE'], ...T.map(t => [t.kode, t.kode]), ['simantap', 'Status di SIMANTAP']];
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Tabel suplemen LED disusun otomatis dari kurikulum KUREKAM, urut dari hulu ke hilir: A1, A2, B1, B2, C1, C2, lalu B3 sampai B5. Narasi LED dan tautan bukti ditulis di <b>SIMANTAP</b>. Templat resmi IABEE diunduh dari akun Program Representative setelah registrasi; salin isi tabel ke templat itu.</span></div>
  <div class="seg scroll" style="margin:14px 0">${tabs.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><div id="bl-b"></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  const b = el.querySelector('#bl-b');

  if (tab === 'ringkas') {
    const hint = O.angkatan ? `Wisuda PEM Akamigas umumnya bulan Juli. Angkatan ${esc(O.angkatan)} lulus Juli ${+O.angkatan + 4} bila masa studi empat tahun.` : 'Pilih angkatan pertama yang memakai kurikulum OBE (mis. 2023).';
    b.innerHTML = `
    <div class="grid g4">${kpi('Tabel siap (A1–C2)', siap, 'dari 6 tabel utama', '#10b981', 'check')}${kpi('Rata-rata kesiapan', rata, 'persen, enam tabel utama', '#0ea5e9', 'pulse')}${kpi('OBE pertama', O.angkatan ? 'Angkatan ' + O.angkatan : '–', O.wisuda ? 'wisuda ' + O.wisuda : 'tanggal wisuda belum diisi', '#8b5cf6', 'flag')}${kpi('Lulusan OBE tercatat', O.lulusan, 'dari menu Lulusan dan tracer', '#f5a524', 'flag')}</div>
    <div class="card" style="margin-top:16px">${head('Kesiapan tabel suplemen', `Prodi ${esc(pid)}`, 'medal', '#8b5cf6', `<button class="btn sm pri" id="bl-x">${icon('download')} Unduh Excel semua tabel</button>`)}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tabel</th><th>Isi</th><th>Kesiapan</th><th>Status</th></tr></thead><tbody>
      ${T.map(t => `<tr class="click" data-t="${t.kode}"><td><b>${t.kode}</b></td><td class="small">${esc(t.judul)}${t.manual ? ' <span class="tag" style="--c:#64748b">sebagian manual</span>' : ''}</td><td style="min-width:130px">${bar(t.pct, pctColor(t.pct))}<span class="small muted">${t.pct}%</span></td><td>${stTag(...ST[t.k])}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card" style="margin-top:16px">${head('Data OBE untuk LED', 'Dipakai SIMANTAP untuk syarat kelayakan jalur IABEE', 'flag', '#0ea5e9')}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        <div class="field"><label>Angkatan OBE pertama (tahun masuk)</label><input class="inp" id="o-a" type="number" min="2015" max="2035" value="${esc(O.angkatan)}" placeholder="mis. 2023" ${ed ? '' : 'disabled'}></div>
        <div class="field"><label>Tanggal wisuda angkatan pertama</label><input class="inp" id="o-w" type="date" value="${esc(O.wisuda)}" ${ed ? '' : 'disabled'}></div>
        <div class="field"><label>Catatan</label><input class="inp" id="o-c" value="${esc(O.catatan)}" placeholder="mis. SK kurikulum OBE 2023" ${ed ? '' : 'disabled'}></div></div>
      <div class="small muted" style="margin:6px 0 10px">${hint}</div>
      ${ed ? `<button class="btn pri" id="o-s">${icon('check')} Simpan data OBE</button>` : '<span class="small muted">Hanya Prodi yang dapat mengubah.</span>'}</div>`;
    b.querySelector('#bl-x').onclick = () => excel(pid, T).catch(e => toast(e.message));
    b.querySelectorAll('tr[data-t]').forEach(tr => tr.onclick = () => { tab = tr.dataset.t; rerender(); });
    const s = b.querySelector('#o-s');
    if (s) s.onclick = async () => {
      const a = b.querySelector('#o-a').value.trim(), w = b.querySelector('#o-w').value;
      if (a && (+a < 2015 || +a > 2035)) return toast('Angkatan tidak wajar');
      if (a && w && w < `${+a + 3}-01-01`) return toast('Wisuda tidak mungkin kurang dari tiga tahun setelah angkatan masuk');
      p.obe = { angkatan: a, wisuda: w, catatan: b.querySelector('#o-c').value.trim() };
      await save('prodi', p, `Data OBE ${pid}`); toast('Data OBE tersimpan'); rerender();
    };
    animateCounts(b);
  } else if (tab === 'simantap') {
    b.innerHTML = `<div class="card">${head('Status LED di SIMANTAP', 'Ringkasan dibaca dari SIMANTAP (hanya angka)', 'layers', '#0ea5e9')}<div id="bl-s" class="muted">Memuat…</div></div>`;
    (simLed ? Promise.resolve(simLed) : ledSimantap().then(r => (simLed = r))).then(rows => {
      const d = rows.find(x => x.id === pid), box = b.querySelector('#bl-s'); if (!box) return;
      box.innerHTML = d ? `<div class="grid g4">${kpi('Aitem siap diaudit atau lebih', d.siap, 'dari ' + d.n + ' aitem', '#0ea5e9', 'check')}${kpi('Kelengkapan rata-rata', d.pctLengkap, 'persen', '#10b981', 'pulse')}${kpi('Temuan W atau D', (d.nilai.W || 0) + (d.nilai.D || 0), `A ${d.nilai.A || 0} · C ${d.nilai.C || 0}`, '#f0616d', 'alert')}${kpi('Final', d.per.final || 0, 'disahkan', '#8b5cf6', 'flag')}</div><div class="small muted" style="margin-top:8px">Diperbarui ${new Date(d.waktu).toLocaleString('id-ID')}. Rincian narasi dan bukti ada di <a href="${esc(APP_LAIN.simantap.url)}#/led" target="_blank" rel="noopener">SIMANTAP › LED IABEE</a>.</div>` : '<div class="empty">Belum ada ringkasan dari SIMANTAP untuk prodi ini. Muncul setelah prodi mengisi aitem LED di SIMANTAP.</div>';
      animateCounts(box);
    });
  } else {
    const t = T.find(x => x.kode === tab) || T[0];
    b.innerHTML = `<div class="card">${head(`Tabel Suplemen ${t.kode}`, esc(t.judul), 'layers', WARNA[t.k], `<span class="small">${stTag(...ST[t.k])} ${t.pct}%</span><button class="btn sm" id="bl-x">${icon('download')} Excel</button>`)}
      ${cekHtml(t)}${tabelHtml(t)}${t.catatan.length ? `<div class="small muted" style="margin-top:10px">${t.catatan.slice(0, 3).map(esc).join('<br>')}</div>` : ''}</div>`;
    b.querySelector('#bl-x').onclick = () => excel(pid, [t]).catch(e => toast(e.message));
  }
}
void URUTAN_TABEL;
