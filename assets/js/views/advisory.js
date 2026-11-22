/* KUREKAM · Advisory Board industri dan praktisi: bukti pelibatan pemangku kepentingan dalam pengembangan kurikulum. */
import { S, ctx, can, save, remove, saveMany, rerender, esc, icon, toast } from '../app.js';
import { DB } from '../db.js';
import { head, formDrawer, ro, kpi, animateCounts, stTag } from './ui.js';
import { UNSUR, BENTUK, OBJEK, STATUS, abRekap } from '../advisorylogic.js';

let tab = 'ringkas';
const TABS = [['ringkas', 'Ringkasan dan syarat'], ['anggota', 'Anggota'], ['pertemuan', 'Kegiatan'], ['masukan', 'Masukan dan tindak lanjut']];
const today = () => new Date().toISOString().slice(0, 10);
const baru = (pid, j) => `AB-${pid}-${j[0].toUpperCase()}-${Date.now().toString(36)}`;
const httpsOk = (u) => !u || /^https:\/\//i.test(u);
const tautan = (u) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">Buka</a>` : '–';
const opt = (arr) => arr.map(v => ({ v, t: v }));

export default function advisoryView(el) {
  const pid = ctx.prodi, p = S.prodi.find(x => x.id === pid);
  if (!p) { el.innerHTML = '<div class="card empty">Pilih prodi terlebih dahulu.</div>'; return; }
  const ed = can('susun', { prodi: pid }), R = abRekap(S, pid), ilus = (S.ab || []).some(x => x.prodi === pid && x.ilustratif);
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span>Menu ini menyimpan <b>bukti keterlibatan industri, praktisi, dan profesi dalam pengembangan kurikulum</b>: siapa anggotanya, kapan bertemu, apa masukannya, dan apa yang dilakukan prodi. Cocok untuk LAM Teknik (kurikulum dan pelibatan pemangku kepentingan), IABEE (masukan konstituen untuk CPL), dan AMI. Nama anggota boleh berupa inisial dan jabatan bila belum ada izin; dokumen lengkap disimpan di Google Drive, di sini cukup tautannya.</span></div>
  ${ilus ? `<div class="ribbon warn">${icon('info')} <span>Ada data <b>contoh ilustratif</b> untuk peragaan. Hapus dan ganti dengan catatan sungguhan sebelum dipakai sebagai bukti.</span></div>` : ''}
  <div class="seg scroll" style="margin-bottom:14px">${TABS.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div><div id="ab-b"></div>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; rerender(); });
  const b = el.querySelector('#ab-b');
  ({ anggota: tAnggota, pertemuan: tPertemuan, masukan: tMasukan }[tab] || tRingkas)(b, pid, p, ed, R);
}

function tRingkas(el, pid, p, ed, R) {
  const demo = DB.mode !== 'firebase', kosong = !R.anggota.length && !R.pertemuan.length && !R.masukan.length;
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('Anggota luar kampus', R.luar, `${R.anggota.length} anggota seluruhnya · ${R.unsurLuar} unsur`, '#0ea5e9', 'user')}
    ${kpi('Kegiatan 12 bulan terakhir', R.dalam12, R.terakhir ? `terakhir ${esc(R.terakhir)}` : 'belum ada', R.dalam12 ? '#10b981' : '#f5a524', 'calendar')}
    ${kpi('Masukan ditanggapi', R.masukan.length - R.belum, `dari ${R.masukan.length} masukan tercatat`, R.masukan.length && !R.belum ? '#10b981' : '#f5a524', 'check')}
    ${kpi('Masukan diterapkan ke revisi', R.terhubung, `${R.dipakai} masukan diterima`, R.terhubung ? '#8b5cf6' : '#f5a524', 'loop')}
  </div>
  <div class="card" style="margin-top:18px">${head(`Syarat bukti · ${pid}`, `${R.ok} dari ${R.syarat.length} syarat terpenuhi`, 'check', '#10b981', ed && demo && kosong ? `<button class="btn sm" id="ab-ct">${icon('spark')} Muat contoh ilustratif</button>` : '')}
    <div class="ind-list">${R.syarat.map(x => `<div class="ind ${x.ok ? 'ok' : 'bad'}"><span class="ind-no">${x.ok ? '✓' : '–'}</span><div><b>${esc(x.t)}</b><div class="small muted">${esc(x.ket)}</div></div>${stTag(x.ok ? 'ok' : 'bad', x.ok ? 'Terpenuhi' : 'Belum')}</div>`).join('')}</div></div>
  <div class="card" style="margin-top:18px">${head('Alur yang dibuktikan', 'Dari industri sampai perubahan kurikulum', 'loop', '#6366f1')}
    <div class="small" style="line-height:1.6">① Dewan penasihat industri ditetapkan (tab Anggota) → ② bertemu atau diundang dalam FGD dan lokakarya (tab Kegiatan) → ③ masukan dicatat per objek: profil lulusan, CPL, bahan kajian, mata kuliah, capstone (tab Masukan) → ④ prodi menanggapi: diterima, sebagian, atau tidak diterapkan dengan alasan → ⑤ yang diterima dihubungkan ke <b>Revisi dan Pengesahan</b> sampai disahkan Wadir 1. Ringkasannya dikirim ke SIMANTAP sebagai bukti.</div></div>`;
  animateCounts(el);
  const c = el.querySelector('#ab-ct'); if (c) c.onclick = async () => { await saveMany('ab', contoh(pid), `Muat contoh dewan penasihat industri ilustratif ${pid}`); toast('Contoh ilustratif dimuat'); rerender(); };
}

function tAnggota(el, pid, p, ed, R) {
  el.innerHTML = `<div class="card">${head('Anggota dewan penasihat industri · ' + pid, 'Industri, praktisi profesi, asosiasi, pengguna lulusan. Klik baris untuk mengubah.', 'user', '#0ea5e9', ed ? `<button class="btn pri sm" id="ab-add">${icon('plus')} Tambah anggota</button>` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Unsur</th><th>Nama atau inisial</th><th>Bidang keahlian</th><th>Instansi</th><th>Sejak</th><th>SK</th></tr></thead><tbody>
    ${R.anggota.map(x => `<tr class="${ed ? 'click' : ''}" data-id="${esc(x.id)}"><td>${esc(x.unsur)}</td><td><b>${esc(x.nama || '–')}</b>${x.ilustratif ? ' <span class="small muted">(contoh)</span>' : ''}</td><td>${esc(x.bidang || '')}</td><td>${esc(x.instansi || '')}</td><td>${esc(x.sejak || '')}</td><td>${tautan(x.tautan)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Belum ada anggota.</td></tr>'}
    </tbody></table></div></div>`;
  if (!ed) return;
  const form = (x) => formDrawer({ title: x.id ? 'Ubah anggota' : 'Anggota dewan penasihat industri', sub: pid, obj: x,
    fields: [{ k: 'unsur', label: 'Unsur', type: 'select', opts: opt(UNSUR) }, { k: 'nama', label: 'Nama atau inisial dan jabatan', ph: 'Mis. Bapak A.S., GM Operasi' }, { k: 'bidang', label: 'Bidang keahlian' }, { k: 'instansi', label: 'Instansi atau perusahaan' }, { k: 'sejak', label: 'Sejak (tahun)', ph: '2026' },
      { k: 'tautan', label: 'Tautan SK atau surat penetapan di Google Drive (opsional)', full: true, ph: 'https://drive.google.com/…' }],
    onSave: async (o) => {
      if (!String(o.nama || '').trim()) return 'Nama atau inisial wajib diisi.'; if (!httpsOk(o.tautan)) return 'Tautan harus diawali https://';
      const d = { ...o, id: x.id || baru(pid, 'anggota'), jenis: 'anggota', prodi: pid, unsur: o.unsur || UNSUR[0], tgl: today() }; delete d.ilustratif;
      await save('ab', d, `Simpan anggota dewan penasihat industri ${pid}`); rerender();
    },
    onDelete: x.id ? async () => { await remove('ab', x.id, `Hapus anggota dewan penasihat industri ${pid}`); rerender(); } : null });
  el.querySelector('#ab-add').onclick = () => form({ unsur: UNSUR[0] });
  el.querySelectorAll('[data-id]').forEach(r => r.onclick = (e) => { if (e.target.closest('a')) return; form({ ...S.ab.find(x => x.id === r.dataset.id) }); });
}

function tPertemuan(el, pid, p, ed, R) {
  const nm = (id) => R.masukan.filter(m => m.pertemuanId === id).length;
  el.innerHTML = `<div class="card">${head('Kegiatan bersama industri · ' + pid, 'Rapat, FGD, lokakarya, kunjungan, survei pemangku kepentingan. Klik baris untuk mengubah.', 'calendar', '#14b8a6', ed ? `<button class="btn pri sm" id="ab-add">${icon('plus')} Tambah kegiatan</button>` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Bentuk</th><th>Agenda</th><th class="num">Hadir dari luar kampus</th><th class="num">Masukan</th><th>Bukti</th></tr></thead><tbody>
    ${R.pertemuan.map(x => `<tr class="${ed ? 'click' : ''}" data-id="${esc(x.id)}"><td><b>${esc(x.tgl)}</b>${x.ilustratif ? ' <span class="small muted">(contoh)</span>' : ''}</td><td>${esc(x.bentuk)}</td><td class="small">${esc(x.agenda || '')}</td><td class="num">${+x.hadir || 0}</td><td class="num">${nm(x.id)}</td><td>${tautan(x.tautan)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Belum ada kegiatan.</td></tr>'}
    </tbody></table></div></div>`;
  if (!ed) return;
  const form = (x) => formDrawer({ title: x.id ? 'Ubah kegiatan' : 'Kegiatan bersama industri', sub: pid, obj: x,
    fields: [{ k: 'tgl', label: 'Tanggal', type: 'date' }, { k: 'bentuk', label: 'Bentuk', type: 'select', opts: opt(BENTUK) }, { k: 'agenda', label: 'Agenda atau topik', type: 'textarea' }, { k: 'hadir', label: 'Jumlah peserta dari luar kampus', type: 'number' },
      { k: 'tautan', label: 'Tautan bukti (notulen, daftar hadir, foto) di Google Drive', full: true, ph: 'https://drive.google.com/…' }],
    onSave: async (o) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(o.tgl || ''))) return 'Tanggal wajib diisi.'; if (o.hadir != null && (o.hadir < 0 || !Number.isInteger(o.hadir))) return 'Jumlah peserta harus bilangan bulat tidak negatif.'; if (!httpsOk(o.tautan)) return 'Tautan harus diawali https://';
      const d = { ...o, id: x.id || baru(pid, 'pertemuan'), jenis: 'pertemuan', prodi: pid, bentuk: o.bentuk || BENTUK[0] }; delete d.ilustratif;
      await save('ab', d, `Simpan kegiatan dewan penasihat industri ${pid}`); rerender();
    },
    onDelete: x.id ? async () => { await remove('ab', x.id, `Hapus kegiatan dewan penasihat industri ${pid}`); rerender(); } : null });
  el.querySelector('#ab-add').onclick = () => form({ tgl: today(), bentuk: BENTUK[0] });
  el.querySelectorAll('[data-id]').forEach(r => r.onclick = (e) => { if (e.target.closest('a')) return; form({ ...S.ab.find(x => x.id === r.dataset.id) }); });
}

function tMasukan(el, pid, p, ed, R) {
  const tg = (id) => { const x = R.pertemuan.find(m => m.id === id); return x ? `${x.tgl} · ${x.bentuk}` : '–'; };
  el.innerHTML = `<div class="card">${head('Masukan dan tindak lanjut · ' + pid, 'Catat masukan, tanggapan prodi, dan keterkaitannya dengan revisi. Klik baris untuk mengubah.', 'loop', '#8b5cf6', ed ? `<button class="btn pri sm" id="ab-add">${icon('plus')} Catat masukan</button>` : ro())}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Kegiatan</th><th>Objek</th><th>Masukan</th><th>Status</th><th>Tanggapan prodi</th><th>Revisi</th></tr></thead><tbody>
    ${R.masukan.map(x => `<tr class="${ed ? 'click' : ''}" data-id="${esc(x.id)}"><td><b>${esc(x.tgl)}</b></td><td class="small">${esc(tg(x.pertemuanId))}</td><td>${esc(x.objek)}</td><td class="small">${esc(x.uraian)}${x.ilustratif ? ' <span class="muted">(contoh)</span>' : ''}</td>
      <td>${stTag(x.status === 'diterima' ? 'ok' : x.status === 'sebagian' ? 'near' : x.status === 'ditolak' ? 'na' : 'bad', STATUS[x.status] || STATUS.menunggu)}</td><td class="small">${esc(x.tanggapan || '–')}</td><td class="small">${x.revisiId ? esc(x.revisiId) : '–'}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada masukan tercatat.</td></tr>'}
    </tbody></table></div></div>`;
  if (!ed) return;
  const rev = S.revisi.filter(r => r.prodi === pid);
  const form = (x) => formDrawer({ title: x.id ? 'Ubah masukan' : 'Catat masukan industri', sub: pid, obj: x,
    fields: [{ k: 'tgl', label: 'Tanggal masukan', type: 'date' },
      { k: 'pertemuanId', label: 'Dari kegiatan', type: 'select', opts: [{ v: '', t: '– tidak terkait kegiatan tertentu –' }, ...R.pertemuan.map(m => ({ v: m.id, t: `${m.tgl} · ${m.bentuk}` }))] },
      { k: 'objek', label: 'Objek yang dikomentari', type: 'select', opts: opt(OBJEK) },
      { k: 'uraian', label: 'Isi masukan', type: 'textarea', rows: 3 },
      { k: 'status', label: 'Status tanggapan', type: 'select', opts: Object.entries(STATUS).map(([v, t]) => ({ v, t })) },
      { k: 'tanggapan', label: 'Tanggapan atau alasan prodi', type: 'textarea', help: 'Wajib bila diterima sebagian atau tidak diterapkan.' },
      { k: 'revisiId', label: 'Hubungkan ke usulan revisi', type: 'select', opts: [{ v: '', t: '– belum dihubungkan –' }, ...rev.map(r => ({ v: r.id, t: `${r.id} · ${String(r.uraian || '').slice(0, 60)}` })), ...(x.id ? [] : [{ v: '__baru', t: '+ buat usulan revisi baru dari masukan ini' }])] }],
    onSave: async (o) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(o.tgl || ''))) return 'Tanggal wajib diisi.'; if (!String(o.uraian || '').trim()) return 'Isi masukan wajib diisi.';
      const st = o.status || 'menunggu'; if (['sebagian', 'ditolak'].includes(st) && !String(o.tanggapan || '').trim()) return 'Tuliskan alasan prodi untuk status ini.';
      if (o.revisiId && o.revisiId !== '__baru' && st === 'menunggu') return 'Masukan yang dihubungkan ke revisi minimal berstatus diterima atau diterima sebagian.';
      let rid = o.revisiId || '';
      if (rid === '__baru') {
        if (!['diterima', 'sebagian'].includes(st)) return 'Usulan revisi baru hanya untuk masukan yang diterima atau diterima sebagian.';
        const n = Math.max(0, ...S.revisi.map(r => +(String(r.id).match(/^REV-(\d+)$/) || [0, 0])[1])) + 1; rid = `REV-${String(n).padStart(3, '0')}`;
        await save('revisi', { id: rid, prodi: pid, objek: o.objek === 'CPL' ? 'CPL' : /Mata kuliah|CPMK|Capstone|Praktik/.test(o.objek) ? 'Mata kuliah' : o.objek, uraian: String(o.uraian).trim().slice(0, 240), alasan: 'Masukan dewan penasihat industri industri' + (o.tanggapan ? '. ' + o.tanggapan : ''), oleh: `Tim Kurikulum ${pid}`, tgl: today(), status: 'menunggu', putusan: '' }, `Usulan revisi ${rid} dari masukan dewan penasihat industri ${pid}`);
      }
      const d = { ...o, id: x.id || baru(pid, 'masukan'), jenis: 'masukan', prodi: pid, status: st, revisiId: rid, objek: o.objek || OBJEK[0] }; delete d.ilustratif;
      await save('ab', d, `Simpan masukan dewan penasihat industri ${pid}`); rerender();
    },
    onDelete: x.id ? async () => { await remove('ab', x.id, `Hapus masukan dewan penasihat industri ${pid}`); rerender(); } : null });
  el.querySelector('#ab-add').onclick = () => form({ tgl: today(), status: 'menunggu', objek: OBJEK[0] });
  el.querySelectorAll('[data-id]').forEach(r => r.onclick = () => form({ ...S.ab.find(x => x.id === r.dataset.id) }));
}

/* contoh ilustratif untuk peragaan (hanya mode demo) */
function contoh(pid) {
  const t = (n) => `AB-${pid}-X-${n}`, ilus = true;
  return [
    { id: t('a1'), jenis: 'anggota', prodi: pid, unsur: 'Industri', nama: 'Contoh A, Manajer Operasi', bidang: 'Operasi dan produksi', instansi: 'Perusahaan mitra (contoh)', sejak: '2025', tgl: today(), ilustratif: ilus },
    { id: t('a2'), jenis: 'anggota', prodi: pid, unsur: 'Praktisi profesi', nama: 'Contoh B, Praktisi senior', bidang: 'Keselamatan proses', instansi: 'Konsultan (contoh)', sejak: '2025', tgl: today(), ilustratif: ilus },
    { id: t('a3'), jenis: 'anggota', prodi: pid, unsur: 'Asosiasi profesi', nama: 'Contoh C, Pengurus asosiasi', bidang: 'Sertifikasi kompetensi', instansi: 'Asosiasi profesi (contoh)', sejak: '2026', tgl: today(), ilustratif: ilus },
    { id: t('p1'), jenis: 'pertemuan', prodi: pid, tgl: '2026-03-12', bentuk: 'FGD kurikulum', agenda: 'Peninjauan profil lulusan dan CPL terhadap kebutuhan industri', hadir: 5, tautan: '', ilustratif: ilus },
    { id: t('p2'), jenis: 'pertemuan', prodi: pid, tgl: '2026-09-18', bentuk: 'Lokakarya kurikulum', agenda: 'Umpan balik capstone dan praktik industri', hadir: 7, tautan: 'https://drive.google.com/contoh', ilustratif: ilus },
    { id: t('m1'), jenis: 'masukan', prodi: pid, pertemuanId: t('p1'), tgl: '2026-03-12', objek: 'CPL', uraian: 'Perlu CPL tentang keselamatan proses dan analisis risiko (contoh).', status: 'diterima', tanggapan: 'Ditambahkan pada CPL keterampilan khusus.', revisiId: '', ilustratif: ilus },
    { id: t('m2'), jenis: 'masukan', prodi: pid, pertemuanId: t('p2'), tgl: '2026-09-18', objek: 'Capstone', uraian: 'Capstone sebaiknya memakai data lapangan dari mitra (contoh).', status: 'sebagian', tanggapan: 'Diterapkan untuk dua kelompok pada tahap awal karena keterbatasan mitra.', revisiId: '', ilustratif: ilus }
  ];
}
