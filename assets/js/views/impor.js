/* KUREKAM · Impor dan ekspor: jalur bertahap templat Excel dengan urutan runtun, prasyarat, dan penanda berkas yang sudah diunggah.
   Tiap tahap memakai templat dan pratinjau impor yang sama dengan menu aslinya. Halaman ini hanya mengumpulkan dan mengurutkannya. */
import { S, ctx, can, addLog, rerender, esc, icon, toast } from '../app.js';
import { byProdi, mkTanpaCpl } from '../rules.js';
import { templatCpl, imporCpl } from '../cplexcel.js';
import { templatBok, imporBok, templatBk, imporBk } from '../bokexcel.js';
import { templatMk, imporMk, templatCpmk, imporCpmk } from '../mkexcel.js';
import { templatSub, imporSub, mkBolehSub } from '../subexcel.js';
import { LANGKAH_DOKMK } from '../dokmkexcel.js';
import { head, stTag, ro } from './ui.js';

const akad = (m) => !/magang|tugas akhir/i.test(m.kel || '');

/** Daftar tahap. hitung: jumlah data yang sudah ada. syarat: pesan bila tahap sebelumnya belum siap (kosong = siap). */
function langkah(pid) {
  const n = (k) => byProdi(S[k] || [], pid).length, mk = byProdi(S.mk, pid);
  return [
    { id: 'cpl', no: 1, nama: 'Capaian Pembelajaran Lulusan (CPL)', ket: 'CPL per ranah dengan unsur SN Dikti dan butir IABEE.', hitung: n('cpl'), satuan: 'CPL', tpl: () => templatCpl(pid), imp: (f) => imporCpl(f, pid), buka: '#cpl' },
    { id: 'bok', no: 2, nama: 'Body of Knowledge (BoK)', ket: 'Rumpun keilmuan prodi.', hitung: n('bok'), satuan: 'BoK', tpl: () => templatBok(pid), imp: (f) => imporBok(f, pid), buka: '#bk' },
    { id: 'bk', no: 3, nama: 'Bahan kajian', ket: 'Bahan kajian beserta kedalaman dan keterkaitan dengan CPL.', hitung: n('bk'), satuan: 'bahan kajian', syarat: n('cpl') ? '' : 'Isi CPL lebih dulu.', tpl: () => templatBk(pid), imp: (f) => imporBk(f, pid), buka: '#bk' },
    { id: 'mk', no: 4, nama: 'Mata kuliah dan SKS', ket: 'Daftar MK, SKS teori dan praktik, semester, dan CPL yang dibebankan.', hitung: mk.length, satuan: 'MK', syarat: n('cpl') ? '' : 'Isi CPL lebih dulu.', tpl: () => templatMk(pid), imp: (f) => imporMk(f, pid), buka: '#mk' },
    { id: 'cpmk', no: 5, nama: 'CPMK prodi', ket: 'CPMK milik prodi dan pemetaannya ke MK dan CPL.', hitung: n('cpmk'), satuan: 'CPMK', syarat: mk.some(m => akad(m) && !mkTanpaCpl(m)) ? '' : 'Bebankan CPL pada mata kuliah lebih dulu (tahap 4).', tpl: () => templatCpmk(pid), imp: (f) => imporCpmk(f, pid), buka: '#cpmkprodi' },
    { id: 'sub', no: 6, nama: 'Sub-CPMK', ket: 'Sub-CPMK per CPMK beserta bobot dan pertemuan.', hitung: n('sub'), satuan: 'Sub-CPMK', syarat: n('cpmk') ? '' : 'Isi CPMK lebih dulu (tahap 5).', tpl: () => templatSub(pid, mkBolehSub(pid).map(m => m.id)), imp: (f) => imporSub(f, pid), buka: '#cpmk' },
    ...LANGKAH_DOKMK(pid, n)
  ];
}

const logKey = (id, pid) => `Unggah Excel (jalur) · ${id} · ${pid}`;
const terakhir = (id, pid) => (S.log || []).find(l => String(l.aksi || '').startsWith(logKey(id, pid)));
const fmtTgl = (t) => { try { return new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

export default function imporView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid), ed = can('susun', { prodi: pid });
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  const L = langkah(pid);
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Isi kurikulum <b>bertahap sesuai urutan</b>. Tiap tahap punya templat Excel sendiri yang sudah memuat data yang ada, jadi siklusnya: unduh, lengkapi, unggah, periksa pratinjau, simpan. Tahap berikutnya terbuka setelah tahap yang dibutuhkannya terisi. Untuk penyusunan sekaligus dalam satu berkas, pakai <a href="#obe">Tabel OBE</a> (paket multi-lembar). Penugasan dosen ada di <a href="#induk">Data Induk</a>.</span></div>
  <div class="card" style="margin-top:14px">${head('Impor dan ekspor · ' + esc(pid), esc(p.nama) + ' · satu baris per tahap', 'upload', '#6366f1', ed ? '' : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahap</th><th>Status</th><th>Terakhir diunggah</th><th></th></tr></thead><tbody>
    ${L.map(s => { const lg = terakhir(s.id, pid), kunci = !!s.syarat, adaDok = !!s.segera;
      return `<tr style="cursor:default"><td><b>${s.no}. ${esc(s.nama)}</b><div class="small muted" style="white-space:normal">${esc(s.ket)}</div>${kunci ? `<div class="small" style="color:#b42335;margin-top:2px">${icon('alert')} ${esc(s.syarat)}</div>` : ''}</td>
        <td>${s.hitung ? stTag('ok', `${s.hitung} ${esc(s.satuan)}`) : stTag('na', 'Belum ada')}</td>
        <td class="small">${lg ? `${esc(fmtTgl(lg.t))}<div class="muted">${esc(String(lg.aksi).split(' · ').slice(3).join(' · '))}</div>` : '<span class="muted">Belum pernah lewat halaman ini</span>'}</td>
        <td style="white-space:nowrap"><button class="btn sm" data-tpl="${s.id}" ${ed && !adaDok ? '' : 'disabled'}>${icon('download')} Templat</button> <button class="btn sm pri" data-imp="${s.id}" ${ed && !kunci && !adaDok ? '' : 'disabled'}>${icon('upload')} Unggah</button> <a class="btn sm ghost" href="${s.buka}">Buka menu</a></td></tr>`; }).join('')}
    </tbody></table></div>
    <input type="file" id="im-file" accept=".xlsx,.xls" hidden>
  </div>`;
  const fi = el.querySelector('#im-file'); let aktif = null;
  el.querySelectorAll('[data-tpl]').forEach(b => b.onclick = async () => { const s = L.find(x => x.id === b.dataset.tpl); try { await s.tpl(); } catch (e) { console.error(e); toast('Templat gagal dibuat: ' + (e.message || e)); } });
  el.querySelectorAll('[data-imp]').forEach(b => b.onclick = () => { aktif = L.find(x => x.id === b.dataset.imp); fi.value = ''; fi.click(); });
  fi.onchange = async () => {
    const f = fi.files[0]; if (!f || !aktif) return; const s = aktif, sebelum = s.hitung, l0 = ((S.log || [])[0] || {}).id;
    try { await s.imp(f); } catch (e) { console.error(e); toast('Impor gagal: ' + (e.message || e)); return; }
    const sesudah = langkah(pid).find(x => x.id === s.id).hitung;
    if (sesudah !== sebelum || ((S.log || [])[0] || {}).id !== l0) await addLog(`${logKey(s.id, pid)} · ${f.name} · ${sebelum} → ${sesudah} ${s.satuan}`);
    rerender();
  };
}
