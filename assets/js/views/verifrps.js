/* KUREKAM · Verifikasi dan catatan perbaikan RPS, serta daftar "Perlu tindakan".
   Catatan disimpan di koleksi jadwal (jenis 'verif'), satu catatan terakhir per mata kuliah per peran.
   SPM, Kasubbag Akademik, Wakil Direktur I, dan kaprodi dapat memberi catatan; dosen melihat dan menindaklanjuti. */
import { S, ctx, save, esc, icon, toast } from '../app.js';
import { PERAN } from '../config.js';
import { rpsOf, rpsLengkap } from '../rules.js';
import { formDrawer, prodiTag, short } from './ui.js';

const NAMA = { prodi: 'Kaprodi', spm: 'SPM', akademik: 'Kasubbag AK', wadir: 'Wakil Direktur I', pimpinan: 'Pimpinan', admin: 'Admin', developer: 'Pengembang' };
export const STATUS_V = { perbaiki: ['bad', 'Perlu perbaikan'], terverifikasi: ['ok', 'Terverifikasi'], diperbaiki: ['near', 'Sudah diperbaiki, menunggu cek ulang'] };
const hariIni = () => new Date().toISOString().slice(0, 10);

export const verifOf = (mkId) => (S.jadwal || []).filter(x => x.jenis === 'verif' && x.mk === mkId).sort((a, b) => String(b.tgl).localeCompare(String(a.tgl)));
const akad = (m) => !/magang|tugas akhir/i.test(m.kel || '');
/** Boleh memberi catatan verifikasi pada MK ini? */
export const bolehVerif = (m) => ['spm', 'akademik', 'wadir', 'admin', 'developer'].includes(ctx.role) || (ctx.role === 'prodi' && m.prodi === ctx.prodi);

export async function simpanVerif(m, peran, status, catatan, oleh) {
  const doc = { id: `verif-${m.id}-${peran}`, jenis: 'verif', mk: m.id, prodi: m.prodi, peran, status, catatan: catatan || '', oleh: oleh || NAMA[peran] || peran, tgl: hariIni() };
  await save('jadwal', doc, `Catatan verifikasi RPS ${m.nama} (${NAMA[peran] || peran}): ${STATUS_V[status] ? STATUS_V[status][1] : status}`);
  return doc;
}
/** Formulir catatan. wajib: catatan harus diisi (misalnya saat mengembalikan RPS). */
export function formVerif(m, { statusAwal = 'perbaiki', wajib = false, judul = 'Catatan verifikasi RPS', onDone } = {}) {
  const peran = ctx.role === 'admin' || ctx.role === 'developer' ? 'spm' : ctx.role;
  const lama = (S.jadwal || []).find(x => x.id === `verif-${m.id}-${peran}`) || {};
  formDrawer({ title: judul, sub: `${m.nama} · semester ${m.smt}`, obj: { status: lama.status === 'diperbaiki' ? statusAwal : (lama.status || statusAwal), catatan: lama.catatan || '' },
    fields: [{ k: 'status', label: 'Hasil verifikasi', type: 'select', opts: [{ v: 'perbaiki', t: 'Perlu perbaikan' }, { v: 'terverifikasi', t: 'Terverifikasi (sudah sesuai)' }] },
      { k: 'catatan', label: 'Catatan untuk dosen dan prodi', type: 'textarea', rows: 4, ph: 'Tulis butir yang perlu diperbaiki, sebutkan bagian RPS-nya.', help: wajib ? 'Wajib diisi (sedikitnya 10 huruf) agar dosen tahu apa yang harus diperbaiki.' : 'Wajib bila hasilnya Perlu perbaikan.' }],
    onSave: async (o) => {
      if (o.status === 'perbaiki' && String(o.catatan).trim().length < 10) return 'Isi catatan sedikitnya 10 huruf agar jelas apa yang harus diperbaiki.';
      await simpanVerif(m, peran, o.status, o.catatan); if (onDone) await onDone(o); toast('Catatan verifikasi tersimpan.');
    } });
}

/** Kartu catatan verifikasi pada halaman RPS. */
export function kartuVerif(m) {
  const v = verifOf(m.id), boleh = bolehVerif(m);
  const baris = v.map(x => { const [k, t] = STATUS_V[x.status] || ['na', x.status]; return `<div class="note-card"><span class="st ${k}">${t}</span> <b>${esc(x.oleh || NAMA[x.peran] || x.peran)}</b> <span class="muted small">${esc(x.tgl)}</span>${x.catatan ? `<div>${esc(x.catatan)}</div>` : ''}</div>`; }).join('');
  const buka = v.filter(x => x.status === 'perbaiki').length;
  return `<div style="margin-top:12px"><div class="filters" style="margin:0 0 6px"><b>Catatan verifikasi</b>${buka ? `<span class="st bad">${buka} perlu perbaikan</span>` : (v.length ? '<span class="st ok">Tidak ada catatan terbuka</span>' : '<span class="st na">Belum ada catatan</span>')}<div class="sp"></div>${boleh ? `<button class="btn sm" id="verif-add">${icon('plus')} Beri catatan atau verifikasi</button>` : ''}</div>${baris || '<div class="empty small">Belum ada catatan dari SPM, Akademik, atau kaprodi.</div>'}</div>`;
}
export function ikatVerif(R, m, draw) {
  const b = R.querySelector('#verif-add'); if (b) b.onclick = () => formVerif(m, { onDone: draw });
}

/* ---------- Perlu tindakan saya ---------- */
export function perluTindakan() {
  const r = ctx.role, out = [];
  const mkOf = (id) => S.mk.find(m => m.id === id);
  const catBuka = (mkId, tanpa) => verifOf(mkId).filter(x => x.status === 'perbaiki' && x.peran !== tanpa);
  const push = (m, teks, k = 'near') => { if (m) out.push({ m, teks, k }); };
  if (r === 'dosen') {
    const ids = Array.from(new Set(S.tugas.filter(t => t.dosen === ctx.dosen).map(t => t.mk)));
    ids.map(mkOf).filter(m => m && akad(m)).forEach(m => {
      const rp = rpsOf(S, m.id), cb = catBuka(m.id);
      if (cb.length) push(m, `Perlu diperbaiki (${NAMA[cb[0].peran] || cb[0].peran}): ${short(cb[0].catatan, 90)}`, 'bad');
      else if (!rp || (rp.status === 'draf' && rpsLengkap(rp) < 80)) push(m, `RPS baru ${Math.round(rp ? rpsLengkap(rp) : 0)}% terisi`);
    });
  } else if (r === 'prodi') {
    S.rps.filter(x => x.prodi === ctx.prodi && x.status === 'diajukan').forEach(x => push(mkOf(x.mk), 'RPS diajukan dosen, menunggu pengesahan Anda'));
    S.mk.filter(m => m.prodi === ctx.prodi && akad(m)).forEach(m => { const cb = catBuka(m.id, 'prodi'); if (cb.length) push(m, `Catatan ${NAMA[cb[0].peran] || cb[0].peran}: ${short(cb[0].catatan, 90)}`, 'bad'); });
  } else if (r === 'spm' || r === 'akademik') {
    S.rps.filter(x => (x.status === 'diajukan' || x.status === 'disahkan') && !verifOf(x.mk).some(v => v.peran === r)).forEach(x => push(mkOf(x.mk), `RPS ${x.status === 'disahkan' ? 'disahkan' : 'diajukan'}, belum Anda verifikasi`));
    (S.jadwal || []).filter(x => x.jenis === 'verif' && x.peran === r && x.status === 'diperbaiki').forEach(x => push(mkOf(x.mk), 'Sudah diperbaiki, menunggu cek ulang Anda'));
  } else if (r === 'wadir') {
    S.prodi.filter(p => p.status === 'diajukan').forEach(p => out.push({ prodi: p.id, teks: `Kurikulum ${p.nama} diajukan untuk disahkan`, k: 'near', hash: '#revisi' }));
    S.revisi.filter(x => x.status === 'menunggu').forEach(x => out.push({ prodi: x.prodi, teks: `Usulan revisi menunggu putusan: ${short(x.uraian, 70)}`, k: 'near', hash: '#revisi' }));
    const n = (S.jadwal || []).filter(x => x.jenis === 'verif' && x.status === 'perbaiki').length; if (n) out.push({ teks: `${n} RPS masih ber-catatan perlu perbaikan di seluruh prodi`, k: 'bad', hash: '#rps' });
  } else return '';
  const tampil = out.slice(0, 10);
  const c = PERAN[r] ? PERAN[r].c : '#0ea5e9';
  return `<div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:${c}">${icon('alert')}</span><div><h3>Perlu tindakan saya</h3><div class="sub">${out.length ? `${out.length} butir menunggu Anda` : 'Tidak ada yang menunggu. Terima kasih.'}</div></div></div>
    ${tampil.map(x => `<div class="note-card"><a href="${x.hash || '#rps'}" ${x.m ? `data-pilih="${esc(x.m.id)}"` : ''} style="text-decoration:none;color:inherit">${prodiTag(x.prodi || (x.m && x.m.prodi))} <b>${x.m ? esc(short(x.m.nama, 50)) : ''}</b> ${x.m ? '· semester ' + x.m.smt + ' · ' : ''}<span class="st ${x.k}">${esc(x.teks)}</span></a></div>`).join('')}
    ${out.length > tampil.length ? `<div class="muted small" style="margin-top:6px">dan ${out.length - tampil.length} butir lainnya</div>` : ''}</div>`;
}
