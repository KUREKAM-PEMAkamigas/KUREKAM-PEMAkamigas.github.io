/* KUREKAM · Laci Generator SAP dan ACP pada halaman RPS.
   Menyusun SAP dan ACP otomatis dari RPS dan kurikulum (aturan deterministik, lihat dokgen.js), memeriksa kelengkapannya, lalu menjalankan
   alur dosen menyunting, menyetujui, mengajukan, dan Ketua Program Studi mengesahkan, terpisah dari status RPS. */
import { S, ctx, can, save, esc, icon, toast, openDrawer } from '../app.js';
import { rpsOf } from '../rules.js';
import { kTag, tanya, ro, statusTag } from './ui.js';
import { lengkapiSap, periksaSap, lengkapiAcp, periksaAcp, acpEfektif } from '../dokgen.js';

const tabel = (ck) => `<div class="tbl-wrap" style="max-height:34vh"><table class="tbl"><thead><tr><th>Butir</th><th>Temuan</th><th>Saran</th><th>Status</th></tr></thead><tbody>${ck.map(c => `<tr><td><b>${esc(c.butir)}</b></td><td>${esc(c.temuan)}</td><td class="small">${esc(c.k === 'ok' ? '' : c.saran)}</td><td>${kTag(c.k)}</td></tr>`).join('')}</tbody></table></div>`;
const hitung = (ck) => ({ ok: ck.filter(c => c.k === 'ok').length, near: ck.filter(c => c.k === 'near').length, bad: ck.filter(c => c.k === 'bad').length });
const legenda = (n) => `<div class="legend" style="margin:4px 0 8px"><span><i class="dot" style="--c:#10b981"></i>${n.ok} sesuai</span><span><i class="dot" style="--c:#f5a524"></i>${n.near} perlu perhatian</span><span><i class="dot" style="--c:#f0616d"></i>${n.bad} belum sesuai</span></div>`;

/** Alasan dokumen belum boleh diajukan atau disahkan, atau '' bila bersih. jenis = 'sap' atau 'acp'. */
export function alasanDok(jenis, m, r) {
  const ck = jenis === 'sap' ? periksaSap(m, r) : periksaAcp(m, r), a = [];
  const bad = ck.filter(c => c.k === 'bad').length;
  if (bad) a.push(`${bad} butir pemeriksaan belum sesuai`);
  if (r && r[jenis + 'Tinjau']) a.push('isi hasil susunan otomatis belum disetujui dosen');
  return a.join('; ');
}
/** RPS berubah: SAP dan ACP yang sudah disahkan kembali menjadi draf agar ditinjau ulang. */
export function turunkanDok(r) { if (!r) return; ['sap', 'acp'].forEach(j => { if (r[j + 'Status'] === 'disahkan') { r[j + 'Status'] = 'draf'; r[j + 'Oleh'] = ''; r[j + 'Tgl'] = ''; } }); }

export function bukaGeneratorDok(m, draw) {
  const r = rpsOf(S, m.id);
  if (!r) { toast('RPS belum dibuat. SAP dan ACP disusun dari RPS.'); return; }
  const ed = can('rps', { prodi: m.prodi, mk: m.id }), sah = can('sahkanRps', m);
  const ckS = periksaSap(m, r), ckA = periksaAcp(m, r), nS = hitung(ckS), nA = hitung(ckA), ef = acpEfektif(m, r);
  const stS = r.sapStatus || 'draf', stA = r.acpStatus || 'draf';
  const aksi = (j, st) => ed || sah ? `<div class="filters" style="margin:8px 0">
      ${ed && st !== 'disahkan' ? `<button class="btn pri sm" id="${j}-isi">${icon('spark')} Susun ${j.toUpperCase()} otomatis (isian kosong)</button><button class="btn sm danger" id="${j}-ulang">Susun ulang seluruh ${j.toUpperCase()}</button>` : ''}
      ${ed && r[j + 'Tinjau'] ? `<button class="btn sm" id="${j}-tinjau">Saya sudah membaca dan menyetujui isi ${j.toUpperCase()}</button>` : ''}
      ${ed && st === 'draf' ? `<button class="btn vio sm" id="${j}-aju">${icon('upload')} Ajukan ke Ketua Program Studi</button>` : ''}
      ${sah && st === 'diajukan' ? `<button class="btn pri sm" id="${j}-sah">${icon('check')} Sahkan ${j.toUpperCase()}</button><button class="btn sm danger" id="${j}-tolak">Kembalikan ke dosen</button>` : ''}
      ${sah && st === 'disahkan' ? `<button class="btn sm danger" id="${j}-batal">Batalkan pengesahan</button>` : ''}</div>` : ro();
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('spark')}</span><div><h3>Generator SAP dan ACP</h3><div class="sub">${esc(m.nama)} · semester ${m.smt} · RPS ${esc(r.status || 'draf')}</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <p class="small muted">Isi disusun otomatis dari RPS dan kurikulum dengan aturan yang tetap (bukan karangan bebas): kalimat SAP dibentuk dari bahan kajian, Sub-CPMK, level Bloom, metode, dan pustaka yang sudah ada di RPS; ACP dihitung dari CPL, CPMK, Sub-CPMK, bobot, dan PI. Semua hasil berstatus usulan. Sunting SAP dengan mengklik pertemuan pada tabel RPS; sunting teks ACP di bawah. Setelah dibaca dan disetujui, dokumen diajukan dan disahkan Ketua Program Studi. Setiap perubahan RPS mengembalikan SAP dan ACP yang sudah disahkan menjadi draf.</p>
    <h4 style="margin:12px 0 4px">SAP ${statusTag(stS)}</h4>${legenda(nS)}${tabel(ckS)}${aksi('sap', stS)}
    <h4 style="margin:16px 0 4px">ACP ${statusTag(stA)}</h4>${legenda(nA)}${tabel(ckA)}
    <div style="margin-top:8px"><label class="small" style="display:block;margin-top:6px"><b>Pengantar</b></label><textarea class="inp" style="width:100%;display:block;margin:4px 0 10px" id="acp-t-pengantar" rows="4" ${ed && stA !== 'disahkan' ? '' : 'disabled'}>${esc(ef.pengantar)}</textarea>
    <label class="small" style="display:block"><b>Temuan analisis</b> (dihitung dari RPS; sunting bila perlu)</label><textarea class="inp" style="width:100%;display:block;margin:4px 0 10px" id="acp-t-analisis" rows="6" ${ed && stA !== 'disahkan' ? '' : 'disabled'}>${esc(ef.analisis)}</textarea>
    <label class="small" style="display:block"><b>Rekomendasi tindak lanjut</b></label><textarea class="inp" style="width:100%;display:block;margin:4px 0 10px" id="acp-t-rekomendasi" rows="4" ${ed && stA !== 'disahkan' ? '' : 'disabled'}>${esc(ef.rekomendasi)}</textarea>
    ${ed && stA !== 'disahkan' ? `<div class="filters" style="margin-top:6px"><button class="btn sm" id="acp-simpan">${icon('check')} Simpan teks ACP</button></div>` : ''}</div>
    ${aksi('acp', stA)}
    <div class="drawer-act"><div class="sp"></div><button class="btn ghost" data-close>Tutup</button></div>`, (dr) => {
    const q = (s) => dr.querySelector(s);
    const ulang = () => { draw(); bukaGeneratorDok(m, draw); };
    const simpan = async (o, cat) => { await save('rps', o, `${cat} ${m.nama}`); ulang(); };
    ['sap', 'acp'].forEach(j => {
      const J = j.toUpperCase(), gen = j === 'sap' ? lengkapiSap : lengkapiAcp;
      const baca = () => { if (j === 'acp') { r.acp = r.acp || {}; ['pengantar', 'analisis', 'rekomendasi'].forEach(f => { const t = q('#acp-t-' + f); if (t && !t.disabled) r.acp[f] = t.value.trim(); }); } };
      if (q(`#${j}-isi`)) q(`#${j}-isi`).onclick = async () => { const h = gen(m, r, false); if (!h.n) { toast(`Tidak ada bagian ${J} yang kosong untuk diisi.`); return; } await simpan(h.r, `Susun ${J} otomatis`); toast(`${h.n} isian ${J} disusun sebagai usulan. Baca, sunting, lalu setujui.`); };
      if (q(`#${j}-ulang`)) q(`#${j}-ulang`).onclick = async () => { if (!(await tanya(`Seluruh isian ${J} diganti dengan hasil susunan otomatis terbaru. Sunting manual Anda pada ${J} ikut hilang. Lanjutkan?`, 'Susun ulang'))) return; const h = gen(m, r, true); await simpan(h.r, `Susun ulang ${J}`); };
      if (q(`#${j}-tinjau`)) q(`#${j}-tinjau`).onclick = async () => { baca(); if (!(await tanya(`Saya sudah membaca seluruh isi ${J} ini, memahaminya, dan menyetujuinya sebagai isian resmi.`, 'Setujui'))) return; r[j + 'Tinjau'] = false; await simpan(r, `Setujui isi ${J}`); };
      if (q(`#${j}-aju`)) q(`#${j}-aju`).onclick = async () => { baca(); const al = alasanDok(j, m, r); if (al) { toast(`Belum bisa diajukan: ${al}.`); return; } r[j + 'Status'] = 'diajukan'; await simpan(r, `Ajukan ${J}`); };
      if (q(`#${j}-sah`)) q(`#${j}-sah`).onclick = async () => { const al = alasanDok(j, m, r); if (al) { toast(`Belum bisa disahkan: ${al}.`); return; } if (r.status !== 'disahkan') { toast(`${J} baru dapat disahkan setelah RPS disahkan, agar keduanya sinkron.`); return; } r[j + 'Status'] = 'disahkan'; r[j + 'Oleh'] = 'Kaprodi ' + m.prodi; r[j + 'Tgl'] = new Date().toISOString().slice(0, 10); await simpan(r, `Sahkan ${J}`); };
      if (q(`#${j}-tolak`)) q(`#${j}-tolak`).onclick = async () => { r[j + 'Status'] = 'draf'; await simpan(r, `Kembalikan ${J} ke dosen`); };
      if (q(`#${j}-batal`)) q(`#${j}-batal`).onclick = async () => { if (!(await tanya(`Pengesahan ${J} dibatalkan dan statusnya kembali menjadi draf. Lanjutkan?`, 'Batalkan pengesahan'))) return; r[j + 'Status'] = 'draf'; r[j + 'Oleh'] = ''; r[j + 'Tgl'] = ''; await simpan(r, `Batalkan pengesahan ${J}`); };
    });
    if (q('#acp-simpan')) q('#acp-simpan').onclick = async () => { r.acp = r.acp || {}; ['pengantar', 'analisis', 'rekomendasi'].forEach(f => { r.acp[f] = q('#acp-t-' + f).value.trim(); }); await simpan(r, 'Ubah teks ACP'); toast('Teks ACP tersimpan.'); };
  }, true);
  void ctx;
}
