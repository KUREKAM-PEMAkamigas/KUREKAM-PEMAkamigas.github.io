/* KUREKAM · Panduan pengisian 10 indikator kesiapan IABEE: langkah, contoh, dan status terkini tiap prodi. */
import { S, ctx, esc, icon } from '../app.js';
import { kesiapan } from '../rules.js';
import { PANDUAN, PRINSIP, ALUR, PERAN_ISI } from '../panduan.js';
import { head, stTag, prodiTag } from './ui.js';

const ST = { ok: 'Sesuai target', near: 'Sebagian', bad: 'Jauh dari target', na: 'Belum diukur' };

export default function panduanView(el) {
  const pid = ctx.prodi, ind = kesiapan(S, pid);
  el.innerHTML = `
  <div class="card">${head('Cara mengisi 10 indikator kesiapan IABEE', 'Satu pemahaman untuk Kaprodi, Sekprodi, SPM, Wakil Direktur I, dan Subbagian Akademik', 'audit', '#8b5cf6', `<button class="btn sm no-print" id="pg-buka">${icon('eye')} Buka semua</button><button class="btn sm no-print" id="pg-cetak">${icon('download')} Cetak</button>`)}
    <p>${esc(PRINSIP)}</p>
    <div class="pg-alur">${ALUR.map(([t, d], i) => `<div class="pg-step"><span class="n">${i + 1}</span><b>${esc(t)}</b><span class="small muted">${esc(d)}</span></div>`).join('')}</div></div>
  <div class="card" style="margin-top:18px">${head('Siapa mengisi apa', 'Pembagian peran usulan. Dikunci pada RTM Desember 2026.', 'user', '#f5a524')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Peran</th><th>Tugas</th><th>Indikator</th></tr></thead><tbody>
    ${PERAN_ISI.map(r => `<tr><td><b>${esc(r[0])}</b></td><td class="small">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="ribbon info" style="margin-top:18px">${icon('info')} <span>Status di bawah menunjukkan kondisi prodi ${prodiTag(pid)} saat ini. Ganti prodi di pojok kanan atas. Contoh hanya memperlihatkan bentuk isian, bukan data prodi.</span></div>
  <div class="pg-list">${PANDUAN.map(p => { const v = ind[p.no - 1]; return `
    <details class="pg-item ${v.k}" ${p.no === 1 ? 'open' : ''}><summary><span class="ind-no">${p.no}</span><b>${esc(v.nama)}</b>${stTag(v.k, ST[v.k])}</summary>
      <div class="pg-body">
        <p><b>Tujuan.</b> ${esc(p.tujuan)}</p>
        <p class="small"><b>Status prodi ${esc(pid)}:</b> ${v.k === 'na' ? 'Belum diukur. ' : esc(v.teks) + '. '}${esc(v.ket || '')}</p>
        <h4>Langkah</h4><ol>${p.langkah.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <div class="grid g2" style="gap:12px">
          <div class="pg-box"><h4>Contoh bentuk isian</h4><ul>${p.contoh.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div class="pg-box"><h4>Bukti yang disimpan</h4><p class="small">${esc(p.bukti)}</p><h4>Penanggung jawab dan waktu (usulan)</h4><p class="small">${esc(p.pj)}</p><h4>Cara aplikasi menilai</h4><p class="small">${esc(p.nilai)}</p></div></div>
        <p style="margin-top:10px">${p.menu ? `<a class="btn sm pri no-print" href="#${p.menu}">${icon('link')} Buka: ${esc(p.nama)}</a>` : `<span class="tag">Diisi di ${esc(p.nama)}</span>`}</p>
      </div></details>`; }).join('')}</div>`;
  const semua = () => el.querySelectorAll('details.pg-item');
  el.querySelector('#pg-buka').onclick = (e) => { const buka = [...semua()].some(d => !d.open); semua().forEach(d => { d.open = buka; }); e.currentTarget.lastChild.textContent = buka ? ' Tutup semua' : ' Buka semua'; };
  el.querySelector('#pg-cetak').onclick = () => { semua().forEach(d => { d.open = true; }); window.print(); };
}
