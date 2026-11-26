/* KUREKAM · Cadangan & Keamanan: titik pulih, status cadangan harian ke Drive, dan daftar periksa keamanan */
import { S, ctx, rerender, esc, icon, toast, addLog } from '../app.js';
import { DB } from '../db.js';
import { head, tanya, unduh } from './ui.js';
import { buatTitikPulih, daftarTitikPulih, pulihkan, hapusTitikPulih, berkasTitikPulih } from '../pulih.js';

const JENIS = { manual: ['Manual', '#0ea5e9'], harian: ['Otomatis harian', '#10b981'], sebelum: ['Otomatis sebelum perubahan besar', '#f59e0b'] };
const bisaPulih = () => ['admin', 'developer', 'wadir'].includes(ctx.role);
const bisaHapus = () => ['admin', 'developer'].includes(ctx.role);
const wkt = (t) => t ? new Date(t).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const hariLalu = (t) => t ? (Date.now() - new Date(t).getTime()) / 864e5 : Infinity;
const kb = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const lampu = (k, teks, ket) => `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line,#e2e8f0)"><span class="tag" style="--c:${k === 'ok' ? '#10b981' : k === 'warn' ? '#f59e0b' : '#64748b'};flex:none">${k === 'ok' ? 'Baik' : k === 'warn' ? 'Perlu perhatian' : 'Catatan'}</span><div><b>${teks}</b>${ket ? `<div class="small muted">${ket}</div>` : ''}</div></div>`;

export default function cadanganView(el) {
  el.innerHTML = `<div class="card"><div class="empty small">Memuat daftar titik pulih…</div></div>`;
  (async () => {
    let daftar = [], galat = '', drive = null;
    try { daftar = await daftarTitikPulih(); } catch (e) { galat = e.message || String(e); }
    try { drive = await DB.dok.baca('status', 'drive'); } catch (e) { /* belum ada */ }
    const nyata = DB.mode === 'firebase', akun = S.pengguna || [];
    const harian = daftar.find(x => x.jenis === 'harian'), terakhir = daftar[0];
    const sandiAwal = akun.filter(u => u.sandiAwal && !u.sandiDiubah).length;
    const nAdmin = akun.filter(u => (u.peran || []).some(k => k === 'admin' || k === 'developer')).length;
    const cek = [
      lampu(nyata ? 'ok' : 'warn', 'Basis data', nyata ? 'Tersambung ke Cloud Firestore dan memakai login akun.' : 'Mode lokal: data hanya di peramban ini dan tanpa login. Cocok untuk uji coba, bukan untuk data kerja.'),
      lampu(terakhir && hariLalu(terakhir.t) <= 2 ? 'ok' : 'warn', 'Titik pulih di dalam basis data', terakhir ? `Terakhir ${wkt(terakhir.t)} (${JENIS[terakhir.jenis] ? JENIS[terakhir.jenis][0] : terakhir.jenis}).` : 'Belum ada titik pulih. Buat satu sekarang.'),
      nyata ? lampu(harian && hariLalu(harian.t) <= 2 ? 'ok' : 'warn', 'Titik pulih otomatis harian', harian ? `Terakhir ${wkt(harian.t)}. Dibuat otomatis saat admin, developer, atau Wadir I membuka aplikasi.` : 'Belum pernah berjalan. Dibuat otomatis saat admin, developer, atau Wadir I membuka aplikasi.') : '',
      nyata ? lampu(drive && hariLalu(drive.t) <= 2 && drive.ok !== false ? 'ok' : 'warn', 'Cadangan harian ke Google Drive', drive ? `Terakhir ${wkt(drive.t)}${drive.berkas ? ' · ' + esc(drive.berkas) : ''}${drive.ok === false ? ' · GAGAL: ' + esc(drive.galat || '') : ''}.` : 'Belum ada laporan dari skrip Drive. Pasang skrip alat/cadangan-harian.gs lalu jalankan pasangJadwal(), atau skrip belum diperbarui agar melapor ke sini.') : '',
      lampu(sandiAwal ? 'warn' : 'ok', 'Kata sandi awal', sandiAwal ? `${sandiAwal} akun masih memakai kata sandi awal. Pengguna diminta menggantinya saat masuk; ingatkan yang belum.` : 'Tidak ada akun yang masih memakai kata sandi awal.'),
      lampu(nAdmin >= 2 ? 'ok' : 'warn', 'Jumlah akun admin atau developer', nAdmin >= 2 ? `${nAdmin} akun, ada cadangan bila satu akun bermasalah.` : 'Hanya ' + nAdmin + ' akun. Sebaiknya ada minimal dua agar pemulihan tetap bisa dilakukan.'),
      lampu('info', 'Aturan Firestore', 'Pembatasan akses sesungguhnya ada di aturan Firestore (Firebase Console, Firestore, Rules). Usulan aturan ada di berkas alat/firestore.rules. Uji dulu di Rules Playground sebelum diterapkan, karena SIMANTAP memakai proyek yang sama.'),
      lampu('info', 'Perlindungan data pribadi', 'Data per mahasiswa (NIM, nama, nilai) hanya ada di koleksi kur_nilai pada menu Nilai per Mata Kuliah, dan seharusnya hanya terbaca oleh dosen, prodi, dan admin (lihat aturan Firestore). Data itu tidak ikut titik pulih. Titik pulih juga tidak menyalin akun pengguna maupun log.')
    ].join('');

    el.innerHTML = `
    <div class="card">${head('Cadangan & Keamanan', 'Titik pulih otomatis, pemulihan, dan pemeriksaan keamanan data kurikulum', 'db', '#0ea5e9', bisaPulih() ? `<button class="btn pri sm" id="c-buat">${icon('plus')} Buat titik pulih sekarang</button><button class="btn sm" id="c-unduh">${icon('download')} Unduh cadangan (JSON)</button>` : '')}
      <div class="ribbon info" style="margin:10px 0">${icon('info')} Setiap perubahan tersimpan otomatis per data. Titik pulih adalah salinan seluruh data pada satu saat, untuk kembali bila ada kesalahan besar. Titik dibuat otomatis tiap hari dan sebelum tindakan yang menimpa banyak data (impor Ganti semua, impor OBE, pemulihan, contoh CPMK).</div>
      ${galat ? `<div class="ribbon bad" style="margin:10px 0">${icon('alert')} Titik pulih tidak terbaca: ${esc(galat)}. Kemungkinan aturan Firestore belum mengizinkan koleksi kur_pulih dan kur_pulihdata.</div>` : ''}
      ${cek}</div>
    <div class="card" style="margin-top:14px">${head('Daftar titik pulih', `${daftar.length} titik tersimpan. Batas: 14 harian, 12 sebelum perubahan besar, 40 manual.`, 'loop', '#10b981')}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Jenis</th><th>Keterangan</th><th>Oleh</th><th>Isi</th><th>Ukuran</th><th></th></tr></thead><tbody>
      ${daftar.map(x => `<tr><td class="small">${wkt(x.t)}</td><td><span class="tag" style="--c:${(JENIS[x.jenis] || ['', '#64748b'])[1]}">${esc((JENIS[x.jenis] || [x.jenis])[0])}</span></td><td class="small">${esc(x.label)}</td><td class="small">${esc(x.oleh || '')}</td><td class="small">${(x.n || {}).prodi || 0} prodi · ${(x.n || {}).cpl || 0} CPL · ${(x.n || {}).mk || 0} MK · ${(x.n || {}).cpmk || 0} CPMK · ${(x.n || {}).rps || 0} RPS</td><td class="small">${kb(x.ukuran || 0)}</td>
        <td style="white-space:nowrap"><button class="btn sm" data-u="${x.id}">${icon('download')}</button> ${bisaPulih() ? `<button class="btn sm danger" data-p="${x.id}">Pulihkan</button>` : ''} ${bisaHapus() ? `<button class="btn sm" data-h="${x.id}" title="Hapus">${icon('trash')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada titik pulih.</td></tr>'}
      </tbody></table></div>
      <p class="small muted" style="margin-top:8px">Pulihkan mengganti seluruh data kurikulum dengan isi titik tersebut. Akun pengguna dan log tidak diubah. Sebelum memulihkan, titik pengaman dibuat otomatis sehingga pemulihan bisa dibatalkan.</p></div>`;

    const cari = (id) => daftar.find(x => x.id === id);
    const sibuk = async (b, fn) => { const t = b.innerHTML; b.disabled = true; try { await fn(); } catch (e) { toast('Gagal: ' + (e.message || e)); } b.disabled = false; b.innerHTML = t; };
    const bt = el.querySelector('#c-buat');
    if (bt) bt.onclick = () => sibuk(bt, async () => { const m = await buatTitikPulih('Dibuat manual', 'manual'); if (!m) throw new Error('titik pulih tidak dapat disimpan'); await addLog('Buat titik pulih manual'); toast('Titik pulih dibuat.'); rerender(); });
    const bu = el.querySelector('#c-unduh');
    if (bu) bu.onclick = () => { const o = {}; Object.keys(S).forEach(k => { o[k] = k === 'settings' ? [S.settings] : S[k]; }); unduh(new Blob([JSON.stringify(o)], { type: 'application/json' }), `kurekam-cadangan-${new Date().toISOString().slice(0, 10)}.json`); };
    el.querySelectorAll('[data-u]').forEach(b => { b.onclick = () => sibuk(b, async () => { const m = cari(b.dataset.u); unduh(await berkasTitikPulih(m), `kurekam-titik-pulih-${m.t.slice(0, 10)}.json`); }); });
    el.querySelectorAll('[data-h]').forEach(b => { b.onclick = () => sibuk(b, async () => { const m = cari(b.dataset.h); if (!(await tanya(`Hapus titik pulih ${wkt(m.t)}?`, 'Hapus'))) return; await hapusTitikPulih(m); toast('Titik pulih dihapus.'); rerender(); }); });
    el.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => sibuk(b, async () => {
      const m = cari(b.dataset.p);
      if (!(await tanya(`Seluruh data kurikulum akan diganti dengan isi titik pulih ${wkt(m.t)} (${(m.n || {}).mk || 0} MK, ${(m.n || {}).cpmk || 0} CPMK). Perubahan sesudah waktu itu hilang, tetapi titik pengaman dibuat dulu. Lanjutkan?`, 'Pulihkan'))) return;
      const n = await pulihkan(m); await addLog('Pulihkan data dari titik pulih ' + m.t); toast(`${n} kelompok data dipulihkan. Memuat ulang…`); setTimeout(() => location.reload(), 900);
    }); });
  })();
}
