/* KUREKAM · Pembantu bersama impor Excel: pilihan mode (perbarui dan tambah, atau ganti semua), konfirmasi ketik GANTI, dan penghapusan aman.
   Mode ganti semua hanya menghapus data prodi yang kodenya tidak ada di Excel dan tidak dipakai data hilir yang berisi pekerjaan
   (misalnya CPL yang sudah dipakai CPMK, MK yang sudah punya CPMK, penugasan dosen, atau RPS yang diajukan). Data seperti itu dipertahankan dan dilaporkan. */
import { S, remove, saveMany, esc } from './app.js';
import { titikOtomatis } from './pulih.js';

export const awalCadangan = () => 'Cadangan_' + new Date().toISOString().slice(0, 10);
const NAMA = { nama: 'nama', teks: 'rumusan', sn: 'unsur SN Dikti', pl: 'profil', iabee: 'butir IABEE', ranah: 'ranah', sumber: 'sumber', bok: 'BoK induk', kedalaman: 'kedalaman', cpl: 'CPL', smt: 'semester', kel: 'kelompok', T: 'SKS teori', P: 'SKS praktik', lokasi: 'lokasi', inti: 'MK inti', bk: 'bahan kajian', prasyarat: 'prasyarat', kompetensi: 'kompetensi', alasanCpl: 'alasan pengecualian' };
/** Ringkasan apa yang berubah antara data lama dan data dari Excel. */
export function bedaRingkas(lama, baru) {
  if (!lama) return '';
  const urut = (v) => JSON.stringify(Array.isArray(v) ? v.slice().sort() : (v == null ? '' : v));
  const beda = Object.keys(NAMA).filter(k => k in baru && urut(lama[k]) !== urut(baru[k]));
  return beda.map(k => k === 'nama' ? `nama "${lama.nama}" menjadi "${baru.nama}"` : NAMA[k]).join(', ');
}
const LENCANA = { baru: ['Baru', '#16a34a'], ubah: ['Diperbarui', '#2563eb'], tetap: ['Tidak berubah', '#64748b'], lewat: ['Dilewati', '#ca8a04'], hapus: ['Akan dihapus', '#dc2626'], tahan: ['Dipertahankan', '#ea580c'] };

/** Pratinjau impor: satu tabel dengan lencana status per baris dan pilihan mode.
    Mengembalikan 'tambah', 'ganti', atau null (batal). */
export function pratinjauImpor({ jenis, baru = [], ubah = [], tetap = 0, lewat = [], catatan = [], boleh = [], tahan = [] }) {
  return new Promise(res => {
    const ada = boleh.length || tahan.length;
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal card wide" role="dialog" aria-modal="true"><h3 style="margin:0 0 8px">Pratinjau impor ${esc(jenis)}</h3><div class="modal-isi">
      <p class="small">${baru.length} baru, ${ubah.length} diperbarui, ${tetap} tidak berubah${lewat.length ? `, ${lewat.length} dilewati` : ''}.</p>
      ${ada ? `<div class="small" style="margin:6px 0"><b>${boleh.length + tahan.length}</b> data di aplikasi tidak ada di Excel. Pilih perlakuannya:
        <label style="display:block;margin:4px 0"><input type="radio" name="md" value="tambah" checked> <b>Perbarui dan tambah</b>: data itu dibiarkan.</label>
        <label style="display:block;margin:4px 0"><input type="radio" name="md" value="ganti"> <b>Ganti semua</b>: ${boleh.length} dihapus${tahan.length ? `, ${tahan.length} dipertahankan karena sudah dipakai` : ''}. Cadangan Excel diunduh otomatis.</label></div>` : ''}
      <div class="tbl-wrap" style="max-height:46vh;overflow:auto"><table class="tbl"><thead><tr><th style="width:130px">Status</th><th>Data</th><th>Keterangan</th></tr></thead><tbody id="pv-isi"></tbody></table></div>
      ${catatan.length ? `<p class="small muted" style="margin-top:6px">Catatan: ${esc(catatan.slice(0, 3).join('; '))}${catatan.length > 3 ? `, dan ${catatan.length - 3} lainnya` : ''}.</p>` : ''}
      <div id="pv-kt" hidden style="margin-top:8px"><p class="small">Ketik <b>GANTI</b> untuk menyetujui penghapusan.</p><input id="kt-ganti" class="inp" autocomplete="off" placeholder="GANTI" style="width:100%"></div></div>
      <div class="drawer-act"><div class="sp"></div><button class="btn ghost" data-n>Batal</button><button class="btn pri" data-y>Simpan</button></div></div>`;
    const done = (v) => { bg.remove(); res(v); }, y = bg.querySelector('[data-y]'), kt = bg.querySelector('#pv-kt'), inp = bg.querySelector('#kt-ganti');
    const mode = () => { const r = bg.querySelector('input[name=md]:checked'); return r ? r.value : 'tambah'; };
    const lb = (k) => `<span class="tag" style="--c:${LENCANA[k][1]}">${LENCANA[k][0]}</span>`, MAKS = 150;
    const baris = () => {
      const g = mode() === 'ganti', r = [];
      baru.forEach(t => r.push([lb('baru'), t, '']));
      ubah.forEach(u => r.push([lb('ubah'), u.label, u.detail || '']));
      if (g) { boleh.forEach(t => r.push([lb('hapus'), t, 'tidak ada di Excel'])); tahan.forEach(u => r.push([lb('tahan'), u.label, u.alasan])); }
      lewat.forEach(t => { const m = /^(.*?): (.*)$/.exec(t); r.push([lb('lewat'), m ? m[1] : t, m ? m[2] : '']); });
      bg.querySelector('#pv-isi').innerHTML = (r.length ? r.slice(0, MAKS).map(x => `<tr><td>${x[0]}</td><td>${esc(x[1])}</td><td class="small">${esc(x[2])}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Tidak ada perubahan.</td></tr>') + (r.length > MAKS ? `<tr><td colspan="3" class="muted">… dan ${r.length - MAKS} baris lainnya</td></tr>` : '');
      kt.hidden = !g; y.className = g ? 'btn danger' : 'btn pri'; y.textContent = g ? `Simpan dan hapus ${boleh.length}` : 'Simpan';
      y.disabled = g && inp.value.trim() !== 'GANTI';
    };
    bg.querySelectorAll('input[name=md]').forEach(i => { i.onchange = baris; }); inp.oninput = baris; baris();
    y.onclick = async () => { const m = mode(); if (m === 'ganti') { y.disabled = true; y.textContent = 'Menyimpan titik pulih…'; await titikOtomatis('Sebelum impor Ganti semua ' + jenis); } done(m); };
    bg.querySelector('[data-n]').onclick = () => done(null);
    document.body.appendChild(bg); y.focus();
  });
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
