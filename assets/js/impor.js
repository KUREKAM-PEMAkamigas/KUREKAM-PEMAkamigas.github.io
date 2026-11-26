/* KUREKAM · Pembantu bersama impor Excel: pilihan mode (perbarui dan tambah, atau ganti semua), konfirmasi ketik GANTI, dan penghapusan aman.
   Mode ganti semua hanya menghapus data prodi yang kodenya tidak ada di Excel dan tidak dipakai data hilir yang berisi pekerjaan
   (misalnya CPL yang sudah dipakai CPMK, MK yang sudah punya CPMK, penugasan dosen, atau RPS yang diajukan). Data seperti itu dipertahankan dan dilaporkan. */
import { S, remove, saveMany, esc } from './app.js';
import { tanya, tanya3 } from './views/ui.js';

export const awalCadangan = () => 'Cadangan_' + new Date().toISOString().slice(0, 10);
const ringkasDaftar = (a, n = 6) => a.slice(0, n).join('; ') + (a.length > n ? `; dan ${a.length - n} lainnya` : '');

function ketikGanti(jenis, boleh, tahan) {
  return new Promise(res => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal card wide" role="alertdialog" aria-modal="true"><h3 style="margin:0 0 8px">Ganti semua ${esc(jenis)} prodi ini?</h3><div class="modal-isi">
      <p>Yang ada di Excel diperbarui atau ditambahkan. <b>${boleh.length}</b> ${esc(jenis)} yang tidak ada di Excel akan <b>dihapus</b>:</p>
      <ul class="small">${boleh.slice(0, 40).map(x => `<li>${esc(x)}</li>`).join('')}${boleh.length > 40 ? `<li>… dan ${boleh.length - 40} lainnya</li>` : ''}</ul>
      ${tahan.length ? `<p><b>${tahan.length}</b> tidak dihapus karena sudah dipakai data lain:</p><ul class="small">${tahan.slice(0, 20).map(x => `<li>${esc(x.label)}: ${esc(x.alasan)}</li>`).join('')}${tahan.length > 20 ? `<li>… dan ${tahan.length - 20} lainnya</li>` : ''}</ul>` : ''}
      <p class="small muted">File cadangan (isi data saat ini) diunduh otomatis lebih dulu. Ketik <b>GANTI</b> untuk melanjutkan.</p>
      <input id="kt-ganti" class="inp" autocomplete="off" placeholder="GANTI" style="width:100%"></div>
      <div class="drawer-act"><div class="sp"></div><button class="btn ghost" data-n>Batal</button><button class="btn danger" data-y disabled>Ganti semua</button></div></div>`;
    const done = (v) => { bg.remove(); res(v); }, inp = bg.querySelector('#kt-ganti'), y = bg.querySelector('[data-y]');
    inp.oninput = () => { y.disabled = inp.value.trim() !== 'GANTI'; };
    y.onclick = () => done(true); bg.querySelector('[data-n]').onclick = () => done(false);
    document.body.appendChild(bg); inp.focus();
  });
}

/** Menanyakan mode. Mengembalikan 'tambah', 'ganti', atau null (batal). */
export async function pilihMode({ pesan, jenis, boleh, tahan }) {
  if (!boleh.length && !tahan.length) { return (await tanya(pesan + ' Lanjutkan?', 'Simpan')) ? 'tambah' : null; }
  const lebih = `${pesan} Ada ${boleh.length + tahan.length} ${jenis} di aplikasi yang tidak ada di Excel. "Perbarui dan tambah" membiarkannya. "Ganti semua" menghapus ${boleh.length} di antaranya${tahan.length ? ` (${tahan.length} dipertahankan karena sudah dipakai: ${ringkasDaftar(tahan.map(x => x.label), 3)})` : ''}${boleh.length ? `: ${ringkasDaftar(boleh, 4)}` : ''}.`;
  const r = await tanya3(lebih, 'Perbarui dan tambah', 'Ganti semua', 'Batal');
  if (r === 'ya') return 'tambah';
  if (r === 'buang') return (await ketikGanti(jenis, boleh, tahan)) ? 'ganti' : null;
  return null;
}

const pakaiCpmk = (id) => S.cpmk.some(c => (c.cpl || []).includes(id));

/** Rencana penghapusan untuk tiap jenis. Hasil: {boleh: [label], tahan: [{label, alasan}], jalan: async () => {}} */
export function rencanaHapus(jenis, kandidat) {
  const boleh = [], tahan = [], ids = [];
  kandidat.forEach(x => {
    const label = `${x.kode || ''} ${x.nama || String(x.teks || '').slice(0, 50)}`.trim(); let alasan = '';
    if (jenis === 'cpl') { if (pakaiCpmk(x.id)) alasan = 'sudah dipakai CPMK'; }
    else if (jenis === 'bok') { const n = S.bk.filter(b => b.bok === x.id).length; if (n) alasan = `masih dipakai ${n} bahan kajian`; }
    else if (jenis === 'mk') {
      if (S.cpmk.some(c => c.mk === x.id)) alasan = 'sudah punya CPMK';
      else if (S.tugas.some(t => t.mk === x.id)) alasan = 'sudah ada penugasan dosen';
      else if (S.rps.some(r => r.mk === x.id && ['diajukan', 'disahkan'].includes(r.status))) alasan = 'RPS sudah diajukan atau disahkan';
    }
    if (alasan) tahan.push({ label, alasan }); else { boleh.push(label); ids.push(x.id); }
  });
  const jalan = async (pid) => {
    for (const id of ids) {
      if (jenis === 'cpl') {
        const mk = S.mk.filter(m => (m.cpl || []).includes(id)).map(m => ({ ...m, cpl: m.cpl.filter(i => i !== id) })); if (mk.length) await saveMany('mk', mk);
        const bk = S.bk.filter(m => (m.cpl || []).includes(id)).map(m => ({ ...m, cpl: m.cpl.filter(i => i !== id) })); if (bk.length) await saveMany('bk', bk);
        for (const p of S.pi.filter(p => p.cpl === id)) await remove('pi', p.id);
      } else if (jenis === 'bk') {
        const mk = S.mk.filter(m => (m.bk || []).includes(id)).map(m => ({ ...m, bk: m.bk.filter(i => i !== id) })); if (mk.length) await saveMany('mk', mk);
      } else if (jenis === 'mk') {
        const pr = S.mk.filter(m => (m.prasyarat || []).includes(id)).map(m => ({ ...m, prasyarat: m.prasyarat.filter(i => i !== id) })); if (pr.length) await saveMany('mk', pr);
        for (const r of S.rps.filter(r => r.mk === id)) await remove('rps', r.id);
      }
      await remove(jenis, id, `Impor Excel (ganti semua): hapus ${jenis} ${id} (${pid})`);
    }
  };
  return { boleh, tahan, jalan };
}
