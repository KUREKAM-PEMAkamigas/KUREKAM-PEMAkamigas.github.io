/* KUREKAM · Penetapan kurikulum prodi.
   Prodi menetapkan rancangannya (CPL, CPMK, Sub-CPMK, MK) lebih dulu. Saat penetapan: syarat diperiksa, nomor CPMK dan Sub-CPMK dirapikan
   otomatis lalu dikunci, cadangan dibuat di basis data (titik pulih) dan diunduh ke komputer prodi (Excel OBE dan berkas cadangan).
   Sebelum ditetapkan, dosen tidak dapat mengisi RPS dan MK belum dapat dibebankan ke dosen. Membuka kembali: prodi mengajukan dengan alasan,
   Wakil Direktur I atau SPM menyetujui. Pemulihan hanya menyentuh rancangan prodi; RPS dan nilai dosen tidak ikut. */
import { S, ctx, can, esc, icon, toast, saveMany, saveSettings, addLog, userName, replaceData, rerender } from './app.js';
import { DB } from './db.js';
import { param, byProdi, mkTanpaCpl, rencanaSelaras, struktur, statusPenetapan, ditetapkanProdi } from './rules.js';
import { daftarTemuan } from './temuan.js';
import { buatTitikPulih, daftarTitikPulih, bacaTitikPulih } from './pulih.js';
import { tabelObe } from './obe.js';
import { head, tanya, unduh, loadXLSX } from './views/ui.js';

export const KOLEKSI_PRODI = ['pl', 'bok', 'bk', 'cpl', 'pi', 'mk', 'cpmk', 'sub'];
const akad = (m) => !/magang|tugas akhir/i.test(m.kel || '');
const tgl = () => new Date().toISOString().slice(0, 10);
const bolehTetapkan = (pid) => can('susun', { prodi: pid });
const bolehSetuju = () => ['wadir', 'spm', 'admin', 'developer'].includes(ctx.role);
const waktu = (t) => t ? new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

/** Syarat penetapan. k: 'bad' menahan penetapan, 'near' hanya peringatan, 'ok' terpenuhi. */
export function syaratPenetapan(pid) {
  const P = param(S), mk = byProdi(S.mk, pid).filter(akad), R = struktur(S, pid), o = [];
  const tanpaCpl = mk.filter(mkTanpaCpl), tanpaCpmk = mk.filter(m => !S.cpmk.some(c => c.mk === m.id)), tanpaSub = mk.filter(m => !S.sub.some(s => s.mk === m.id));
  const daftar = (a) => a.slice(0, 5).map(m => m.kode).join(', ') + (a.length > 5 ? ', …' : '');
  o.push({ k: tanpaCpl.length ? 'bad' : 'ok', teks: tanpaCpl.length ? `${tanpaCpl.length} mata kuliah belum dibebani CPL: ${daftar(tanpaCpl)}` : 'Semua mata kuliah akademik sudah dibebani CPL' });
  o.push({ k: tanpaCpmk.length ? 'bad' : 'ok', teks: tanpaCpmk.length ? `${tanpaCpmk.length} mata kuliah belum punya CPMK: ${daftar(tanpaCpmk)}` : 'Semua mata kuliah akademik sudah punya CPMK' });
  o.push({ k: tanpaSub.length ? 'bad' : 'ok', teks: tanpaSub.length ? `${tanpaSub.length} mata kuliah belum punya Sub-CPMK: ${daftar(tanpaSub)}` : 'Semua mata kuliah akademik sudah punya Sub-CPMK' });
  const mn = +P.totalSksMin || 0, mx = +P.totalSksMax || 156, ok = R.total >= mn && R.total <= mx;
  o.push({ k: ok ? 'ok' : 'bad', teks: `Total ${R.total} SKS (ketentuan ${mn} sampai ${mx})` });
  let merah = 0; try { merah = daftarTemuan(S, pid).filter(c => c.k === 'bad').length; } catch (e) { /* abaikan */ }
  o.push({ k: merah ? 'near' : 'ok', teks: merah ? `${merah} temuan merah di Pemeriksa Kurikulum (sebaiknya dibereskan; tidak menahan penetapan)` : 'Tidak ada temuan merah di Pemeriksa Kurikulum' });
  return o;
}

/** Salinan rancangan satu prodi untuk cadangan berkas. */
export function fotoProdi(pid) {
  const data = {}; KOLEKSI_PRODI.forEach(c => { data[c] = JSON.parse(JSON.stringify((S[c] || []).filter(x => x.prodi === pid))); });
  return { jenis: 'rancangan-prodi', versi: 1, prodi: pid, t: new Date().toISOString(), oleh: userName(), data, profil: S.prodi.filter(x => x.id === pid) };
}
const hitung = (d) => KOLEKSI_PRODI.map(c => `${(d[c] || []).length} ${c}`).join(', ');

async function excelObe(pid) {
  const X = await loadXLSX(), wb = X.utils.book_new(), dipakai = new Set();
  tabelObe(S, pid).forEach(t => {
    const ws = X.utils.aoa_to_sheet([[t.judul], [`Program Studi ${pid}`], [], t.kolom, ...t.baris]);
    let nama = String(t.sheet || t.no).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    while (dipakai.has(nama)) nama = nama.slice(0, 29) + '_' + dipakai.size;
    dipakai.add(nama); X.utils.book_append_sheet(wb, ws, nama);
  });
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Penetapan_${pid}_${tgl()}_TabelOBE.xlsx`);
}
const berkasCadangan = (pid) => unduh(new Blob([JSON.stringify(fotoProdi(pid))], { type: 'application/json' }), `Penetapan_${pid}_${tgl()}_cadangan.json`);

const catat = (pid, aksi, alasan) => { const x = statusPenetapan(S, pid) || {}; return [...(x.riwayat || []), { t: new Date().toISOString(), oleh: userName(), aksi, alasan: alasan || '' }].slice(-50); };
const simpanStatus = async (pid, isi) => { S.settings.penetapan = { ...(S.settings.penetapan || {}), [pid]: { ...(statusPenetapan(S, pid) || {}), ...isi } }; await saveSettings(); };

/** Merapikan nomor CPL, CPMK, dan Sub-CPMK menurut aturan baku. Hanya kode berganti; ID dan keterkaitan tetap. */
async function rapikanKode(pid) {
  const r = rencanaSelaras(S, pid);
  if (r.cpl.length) await saveMany('cpl', r.cpl, `Penetapan ${pid}: rapikan kode CPL`);
  if (r.pi.length) await saveMany('pi', r.pi);
  if (r.cpmk.length) await saveMany('cpmk', r.cpmk, `Penetapan ${pid}: rapikan kode CPMK`);
  if (r.sub.length) await saveMany('sub', r.sub);
  return r.total || 0;
}

export async function tetapkan(pid) {
  if (!bolehTetapkan(pid)) { toast('Hanya Prodi pemilik yang dapat menetapkan.'); return false; }
  const sy = syaratPenetapan(pid), tahan = sy.filter(x => x.k === 'bad');
  if (tahan.length) { toast(`Belum dapat ditetapkan: ${tahan.length} syarat belum terpenuhi.`); return false; }
  if (!(await tanya(`Tetapkan kurikulum prodi ${pid}?\n\nNomor CPMK dan Sub-CPMK dirapikan otomatis lalu dikunci. Cadangan dibuat di basis data dan diunduh ke komputer ini (Excel OBE dan berkas cadangan). Sesudah itu dosen dapat mengisi RPS dan dibebani mata kuliah.`, 'Ya, tetapkan'))) return false;
  const n = await rapikanKode(pid);
  const meta = await buatTitikPulih(`Penetapan ${pid} ${tgl()}`, 'penetapan');
  if (!meta) toast('Cadangan di basis data gagal dibuat; berkas cadangan tetap diunduh. Simpan berkas itu dengan baik.');
  try { await excelObe(pid); berkasCadangan(pid); } catch (e) { console.warn(e); toast('Unduhan berkas gagal; ulangi lewat tombol Unduh cadangan.'); }
  await simpanStatus(pid, { status: 'ditetapkan', t: new Date().toISOString(), oleh: userName(), titik: meta ? meta.id : '', kodeDirapikan: n, usulBuka: null, riwayat: catat(pid, 'Ditetapkan') });
  await addLog(`Penetapan kurikulum prodi ${pid}: kode dirapikan ${n}, cadangan ${meta ? 'tersimpan' : 'hanya berkas'}`);
  toast(`Kurikulum ${pid} ditetapkan. Simpan berkas cadangan yang terunduh di komputer prodi (dan satu salinan lain).`);
  return true;
}

export async function ajukanBuka(pid, alasan) {
  await simpanStatus(pid, { usulBuka: { t: new Date().toISOString(), oleh: userName(), alasan }, riwayat: catat(pid, 'Mengajukan buka kembali', alasan) });
  await addLog(`Ajukan buka kembali penetapan ${pid}: ${alasan}`);
}
export async function setujuiBuka(pid) {
  const u = (statusPenetapan(S, pid) || {}).usulBuka;
  await simpanStatus(pid, { status: 'draf', usulBuka: null, riwayat: catat(pid, 'Dibuka kembali (disetujui)', u && u.alasan) });
  await addLog(`Penetapan ${pid} dibuka kembali oleh ${userName()}`);
}
export async function tolakBuka(pid) {
  await simpanStatus(pid, { usulBuka: null, riwayat: catat(pid, 'Pengajuan buka kembali ditolak') });
  await addLog(`Pengajuan buka kembali ${pid} ditolak`);
}

/** Pemulihan rancangan prodi dari cadangan (objek hasil fotoProdi atau isi titik pulih penuh). RPS dan nilai tidak disentuh. */
export async function pulihkanProdi(pid, cad) {
  const d = cad && cad.data ? cad.data : cad;
  if (cad && cad.prodi && cad.prodi !== pid) { toast(`Berkas ini milik prodi ${cad.prodi}, bukan ${pid}.`); return false; }
  if (!d || !Array.isArray(d.mk) || !Array.isArray(d.cpmk)) { toast('Isi cadangan tidak sah.'); return false; }
  const dari = {}; KOLEKSI_PRODI.forEach(c => { dari[c] = (d[c] || []).filter(x => x.prodi === pid); });
  if (!dari.mk.length) { toast('Cadangan tidak memuat mata kuliah prodi ini.'); return false; }
  const kini = {}; KOLEKSI_PRODI.forEach(c => { kini[c] = (S[c] || []).filter(x => x.prodi === pid); });
  if (!(await tanya(`Kembalikan rancangan prodi ${pid} dari cadangan?\n\nSaat ini: ${hitung(kini)}\nCadangan: ${hitung(dari)}\n\nHanya CPL, CPMK, Sub-CPMK, MK, dan data rancangan prodi yang diganti. RPS dan nilai dosen tidak disentuh, namun RPS yang merujuk Sub-CPMK yang hilang perlu dikaitkan ulang. Titik pengaman dibuat lebih dulu.`, 'Ya, kembalikan'))) return false;
  const aman = await buatTitikPulih(`Otomatis sebelum memulihkan rancangan ${pid}`, 'sebelum');
  if (!aman) { toast('Titik pengaman gagal dibuat, pemulihan dibatalkan agar data sekarang tidak hilang.'); return false; }
  const baru = {}; KOLEKSI_PRODI.forEach(c => { baru[c] = (S[c] || []).filter(x => x.prodi !== pid).concat(dari[c]); });
  await replaceData(baru);
  await addLog(`Pemulihan rancangan prodi ${pid} dari cadangan (${hitung(dari)})`);
  toast(`Rancangan prodi ${pid} dipulihkan.`);
  return true;
}

/* ---------- tampilan ---------- */
const WARNA = { ok: '#10b981', near: '#f5a524', bad: '#f0616d' }, TANDA = { ok: '✓', near: '!', bad: '✕' };
export function kartuPenetapan(pid) {
  const x = statusPenetapan(S, pid), tetap = ditetapkanProdi(S, pid), ed = bolehTetapkan(pid), sy = syaratPenetapan(pid), siap = !sy.some(q => q.k === 'bad');
  const wajib = param(S).penetapanWajib !== false;
  const riw = ((x && x.riwayat) || []).slice(-5).reverse();
  return `<div class="card" id="pt-kartu" style="margin-top:14px;${tetap ? '' : 'border:2px solid #f5a524'}">${head('Penetapan kurikulum prodi ' + esc(pid), tetap ? `Ditetapkan ${esc(waktu(x.t))} oleh ${esc(x.oleh || '-')}` : 'Belum ditetapkan', tetap ? 'check' : 'flag', tetap ? '#10b981' : '#f5a524')}
    <p class="small" style="white-space:normal;margin:6px 0">${tetap ? 'Nomor CPMK dan Sub-CPMK sudah final. Dosen dapat mengisi RPS dan dibebani mata kuliah.' : `Sebelum ditetapkan, ${wajib ? 'dosen <b>belum dapat</b> mengisi RPS dan mata kuliah belum dapat dibebankan ke dosen.' : 'penetapan belum diwajibkan oleh pengaturan (Data Induk > Parameter).'} Saat menekan Tetapkan, nomor dirapikan otomatis lalu dikunci, dan cadangan dibuat di basis data serta diunduh ke komputer prodi.`}</p>
    ${tetap ? '' : `<div class="small" style="margin:6px 0">${sy.map(q => `<div style="color:${WARNA[q.k]}">${TANDA[q.k]} ${esc(q.teks)}</div>`).join('')}</div>`}
    ${x && x.usulBuka ? `<div class="ribbon info">${icon('info')} <span>Pengajuan buka kembali (${esc(waktu(x.usulBuka.t))}, ${esc(x.usulBuka.oleh || '')}): ${esc(x.usulBuka.alasan || '')}. Menunggu persetujuan Wakil Direktur I atau SPM.</span></div>` : ''}
    <div class="drawer-act" style="flex-wrap:wrap;margin-top:6px">
      ${ed && !tetap ? `<button class="btn pri" id="pt-tetap" ${siap ? '' : 'disabled'}>${icon('check')} Tetapkan kurikulum prodi</button>` : ''}
      ${ed && tetap && !(x && x.usulBuka) ? `<button class="btn" id="pt-buka">Ajukan buka kembali</button>` : ''}
      ${ed ? `<button class="btn" id="pt-xl">${icon('download')} Unduh cadangan sekarang</button><button class="btn" id="pt-pulih">Kembalikan dari cadangan</button>` : ''}
    </div>
    ${riw.length ? `<div class="small muted" style="margin-top:8px">${riw.map(r => `${esc(waktu(r.t))} · ${esc(r.aksi)} · ${esc(r.oleh || '')}${r.alasan ? ' · ' + esc(r.alasan) : ''}`).join('<br>')}</div>` : ''}
  </div>`;
}
export function pasangPenetapan(el, pid) {
  const q = (s) => el.querySelector(s);
  const t = q('#pt-tetap'); if (t) t.onclick = async () => { t.disabled = true; try { await tetapkan(pid); } finally { rerender(); } };
  const b = q('#pt-buka'); if (b) b.onclick = async () => { const a = (window.prompt('Alasan membuka kembali kurikulum yang sudah ditetapkan:') || '').trim(); if (!a) { toast('Alasan wajib diisi.'); return; } await ajukanBuka(pid, a); toast('Pengajuan dikirim ke Wakil Direktur I dan SPM.'); rerender(); };
  const x = q('#pt-xl'); if (x) x.onclick = async () => { await excelObe(pid); berkasCadangan(pid); };
  const p = q('#pt-pulih'); if (p) p.onclick = () => dialogPulih(pid);
}
async function dialogPulih(pid) {
  let titik = []; try { titik = (await daftarTitikPulih()).filter(m => m.jenis === 'penetapan' && String(m.label).includes(pid)); } catch (e) { /* abaikan */ }
  const pilih = titik.length ? titik.map((m, i) => `${i + 1}. ${m.label} (${waktu(m.t)})`).join('\n') : 'Belum ada titik pulih penetapan di basis data.';
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  const dari = (window.prompt(`Kembalikan dari mana?\n\n${pilih}\n\nKetik nomor titik pulih di atas, atau kosongkan lalu pilih berkas cadangan (.json) dari komputer:`) || '').trim();
  if (/^\d+$/.test(dari) && titik[+dari - 1]) { try { const cad = await bacaTitikPulih(titik[+dari - 1]); if (await pulihkanProdi(pid, cad)) rerender(); } catch (e) { toast('Titik pulih gagal dibaca: ' + (e.message || e)); } return; }
  if (dari !== '') return;
  inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { if (await pulihkanProdi(pid, JSON.parse(await f.text()))) rerender(); } catch (e) { toast('Berkas tidak dapat dibaca.'); } };
  inp.click();
}
/** Baris ringkasan untuk Wakil Direktur I dan SPM: status tiap prodi dan persetujuan buka kembali. */
export function kartuPenetapanSemua(prodiList) {
  const bs = bolehSetuju();
  return `<div class="card" style="margin-top:14px">${head('Status penetapan kurikulum prodi', 'Dosen baru dapat mengisi RPS setelah prodinya menetapkan', 'flag', '#6366f1')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>Status</th><th>Ditetapkan</th><th>Pengajuan buka kembali</th></tr></thead><tbody>${prodiList.map(p => { const x = statusPenetapan(S, p.id), tetap = ditetapkanProdi(S, p.id); return `<tr style="cursor:default"><td><b>${esc(p.id)}</b></td><td><span class="st ${tetap ? 'ok' : 'near'}">${tetap ? 'Ditetapkan' : 'Belum ditetapkan'}</span></td><td class="small">${tetap ? esc(waktu(x.t)) + ' · ' + esc(x.oleh || '') : '-'}</td><td class="small">${x && x.usulBuka ? `${esc(x.usulBuka.alasan || '')}${bs ? ` <button class="btn sm" data-bk="${esc(p.id)}">Setujui</button> <button class="btn sm" data-tk="${esc(p.id)}">Tolak</button>` : ''}` : '-'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
export function pasangPenetapanSemua(el) {
  el.querySelectorAll('[data-bk]').forEach(b => b.onclick = async () => { if (!(await tanya(`Setujui pembukaan kembali kurikulum prodi ${b.dataset.bk}? Dosen tidak dapat mengisi RPS sampai prodi menetapkan lagi.`, 'Ya, setujui'))) return; await setujuiBuka(b.dataset.bk); rerender(); });
  el.querySelectorAll('[data-tk]').forEach(b => b.onclick = async () => { await tolakBuka(b.dataset.tk); rerender(); });
}
void DB;
