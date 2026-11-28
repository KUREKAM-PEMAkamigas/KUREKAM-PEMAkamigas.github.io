/* KUREKAM · Templat dan impor Excel untuk Sub-CPMK, termasuk pemetaan ke pertemuan RPS.
   Templat berisi Sub-CPMK yang sudah ada dan satu baris kosong per CPMK. Kode Sub-CPMK dibuat otomatis (SUB-CPMK + nomor CPMK + urut).
   Impor memakai aturan formulir: MK harus sudah dibebani CPL, level tidak melampaui CPMK induk, pratinjau sebelum simpan.
   Mode "ganti semua" hanya menghapus Sub-CPMK pada MK yang ada di berkas. */
import { S, ctx, can, save, saveMany, remove, rerender, toast, uid } from './app.js';
import { byProdi, kodeBerikut, mkTanpaCpl, rpsOf } from './rules.js';
import { detect, kkoSemester } from './bloom.js';
import { pratinjauImpor, awalCadangan } from './impor.js';
import { nz, norm, spasi, bukaBuku, kolom, hapusContoh, tulisBuku } from './bokexcel.js';
import { blankRps } from './views/ajar.js';

const akad = (m) => !/magang|tugas akhir/i.test(m.kel || '');
const urut = (a, b) => String(a.kode).localeCompare(String(b.kode), 'id', { numeric: true });
const kodeMk = (mk, t) => mk.find(m => norm(m.kode) === norm(t) || norm(m.nama) === norm(t));

/** MK yang boleh diisi pengguna ini (Kaprodi: semua MK prodi; dosen: MK yang diampu). */
export const mkBolehSub = (pid) => byProdi(S.mk, pid).filter(m => akad(m) && !mkTanpaCpl(m) && (can('rps', { prodi: m.prodi, mk: m.id }) || can('susun', m)));

/* ---------- pertemuan <-> teks ---------- */
const ringkasMinggu = (w) => { const a = [...new Set(w)].sort((x, y) => x - y), out = []; for (let i = 0; i < a.length; i++) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(j > i ? `${a[i]}-${a[j]}` : String(a[i])); i = j; } return out.join(', '); };
function bacaMinggu(v) {
  const out = new Set(); let salah = '';
  nz(v).split(/[,;]+/).map(t => t.trim()).filter(Boolean).forEach(t => {
    const r = t.match(/^(\d+)\s*(?:-|–|—|s\.?\s?d\.?|sampai)\s*(\d+)$/i), s = t.match(/^\d+$/);
    if (r) { const a = +r[1], b = +r[2]; if (a > b) salah = t; else for (let k = a; k <= b; k++) out.add(k); } else if (s) out.add(+t); else salah = t;
  });
  return { minggu: [...out].filter(k => k >= 1 && k <= 16), salah, ujian: [...out].filter(k => k === 8 || k === 16), luar: [...out].filter(k => k < 1 || k > 16) };
}
const mingguSub = (mkId, subId) => { const r = rpsOf(S, mkId); return r ? (r.pertemuan || []).filter(p => !p.ujian && (p.sub || []).includes(subId)).map(p => p.m) : []; };

/* ---------- templat ---------- */
export async function templatSub(pid, mkIds, awal = 'Template', namaTunggal = '') {
  const semua = byProdi(S.mk, pid).filter(m => akad(m) && !mkTanpaCpl(m) && (!mkIds || mkIds.includes(m.id))).sort((a, b) => a.smt - b.smt || urut(a, b));
  const baris = [], smt = new Set(), cpmkRef = [];
  semua.forEach(m => {
    const cp = S.cpmk.filter(c => c.mk === m.id).sort(urut); if (!cp.length) return; smt.add(m.smt);
    cp.forEach(c => {
      cpmkRef.push([`${m.kode} · ${c.kode}`, c.teks]);
      const ss = S.sub.filter(s => s.cpmk === c.id).sort(urut);
      ss.forEach(s => baris.push([m.kode, m.nama, c.kode, c.teks, s.kode, s.teks, s.bobot || '', ringkasMinggu(mingguSub(m.id, s.id))]));
      baris.push([m.kode, m.nama, c.kode, c.teks, '', '', '', '']);
    });
  });
  if (!baris.length) { toast('Belum ada MK dengan CPMK untuk dibuatkan templat. CPMK diisi lebih dulu.'); return; }
  const nama = namaTunggal ? `${awal}_SubCPMK_${namaTunggal}.xlsx` : `${awal}_SubCPMK_${pid}.xlsx`;
  await tulisBuku(nama, ['Kode MK', 'Nama MK', 'Kode CPMK', 'Rumusan CPMK (hanya dibaca, jangan diubah)', 'Kode Sub-CPMK (kosongkan untuk Sub-CPMK baru)', 'Rumusan Sub-CPMK (diawali kata kerja operasional)', 'Bobot penilaian (%)', 'Pertemuan (misalnya 1-2, 4)'], baris, [12, 34, 12, 50, 18, 70, 12, 16],
    ['Petunjuk pengisian Sub-CPMK',
      '1. Satu baris = satu Sub-CPMK. Kolom Kode MK, Nama MK, Kode CPMK, dan Rumusan CPMK jangan diubah: itu penunjuk Sub-CPMK ini milik CPMK yang mana.',
      '2. Baris yang sudah berisi Kode Sub-CPMK adalah Sub-CPMK yang ada: ubah rumusan, bobot, atau pertemuan lalu unggah ulang. Sub-CPMK baru: isi rumusan pada baris kosong di bawah CPMK-nya, dan kosongkan kode (kode dibuat otomatis). Perlu lebih banyak Sub-CPMK: salin baris kosong, tempel di bawahnya, lalu isi.',
      '3. Rumusan diawali kata kerja operasional (lihat lembar DAFTAR). Level Sub-CPMK tidak boleh melampaui CPMK induknya; baris yang melampaui dilewati dan dilaporkan.',
      '4. Bobot dalam persen; jumlah per MK sebaiknya 100. Bila seluruh bobot MK dikosongkan, bobot dibagi rata. Bila tidak 100, tetap disimpan dengan peringatan.',
      '5. Pertemuan: minggu 1 sampai 16 tempat Sub-CPMK diajarkan, misalnya 1-2, 4. Kosongkan bila tidak ingin mengubah pemetaan di RPS. Minggu 8 (UTS) dan 16 (UAS) otomatis memuat semua Sub-CPMK, tidak perlu ditulis.',
      '6. Mata kuliah yang belum dibebani CPL tidak dapat diisi dan tidak ada di templat ini. Dosen hanya memperoleh MK yang diampu.',
      '7. Setelah unggah ada pratinjau (baru, diperbarui, dilewati) dan baru disimpan setelah Anda menyetujuinya. Sub-CPMK tidak dihapus lewat impor, kecuali Kaprodi memilih "Ganti semua" (hanya untuk MK yang ada di berkas).'],
    [['DAFTAR RUJUKAN'], [], ['Semester', 'Anjuran level dan contoh kata kerja operasional'], ...[...smt].sort((a, b) => a - b).map(s => [`Semester ${s}`, kkoSemester(s)]), [], ['Kode MK · Kode CPMK', 'Rumusan CPMK'], ...cpmkRef]);
}

/* ---------- impor ---------- */
export async function imporSub(file, pid) {
  const b = await bukaBuku(file, (h) => h.some(c => /^rumusansub/.test(c)) && h.some(c => /^kodemk|^namamk/.test(c)));
  if (!b) throw new Error('Kolom Kode MK dan Rumusan Sub-CPMK tidak ditemukan. Gunakan templat dari tombol Template Excel.');
  const k = { mk: kolom(b.h, /^kodemk/, /^namamk/), cpmk: kolom(b.h, /^kodecpmk/), kode: kolom(b.h, /^kodesub/), teks: kolom(b.h, /^rumusansub/), bobot: kolom(b.h, /^bobot/), pert: kolom(b.h, /^pertemuan/) };
  const bolehIds = new Set(mkBolehSub(pid).map(m => m.id)), mkPid = byProdi(S.mk, pid), kaprodi = ['prodi', 'admin', 'developer'].includes(ctx.role);
  const baru = [], ubah = [], lewat = [], catatan = [], tampungKode = [], bob = new Map(), pertMap = new Map(), mkDisebut = new Set(), subDisebut = new Set();
  let tetap = 0;
  const rec = new Map(); /* id sub -> data akhir */
  for (let r = b.mulai; r < b.rows.length; r++) {
    const row = b.rows[r]; if (hapusContoh(row)) continue; const no = r + 1, teks = spasi(row[k.teks]), kd = k.kode >= 0 ? nz(row[k.kode]) : '';
    if (!teks && !kd) continue; /* baris kosong templat */
    const m = kodeMk(mkPid, row[k.mk]); if (!m) { lewat.push(`baris ${no}: MK "${nz(row[k.mk])}" tidak ada di prodi ini`); continue; }
    if (mkTanpaCpl(m)) { lewat.push(`baris ${no} (${m.kode}): MK belum dibebani CPL, belum dapat diisi`); continue; }
    if (!bolehIds.has(m.id)) { lewat.push(`baris ${no} (${m.kode}): di luar MK yang boleh Anda isi`); continue; }
    if (!kaprodi && S.sub.some(x => x.mk === m.id)) { lewat.push(`baris ${no} (${m.kode}): Sub-CPMK sudah dirancang prodi, dosen tidak mengubahnya (pemilihan Sub-CPMK per pertemuan lewat lembar RPS)`); continue; }
    mkDisebut.add(m.id);
    if (!teks) { lewat.push(`baris ${no} (${m.kode}): rumusan Sub-CPMK kosong`); continue; }
    const cps = S.cpmk.filter(c => c.mk === m.id), kc = k.cpmk >= 0 ? nz(row[k.cpmk]) : '';
    const cp = kc ? cps.find(c => norm(c.kode) === norm(kc)) : (cps.length === 1 ? cps[0] : null);
    if (!cp) { lewat.push(`baris ${no} (${m.kode}): ${kc ? `CPMK "${kc}" tidak ada pada MK ini` : 'Kode CPMK kosong'}`); continue; }
    const bs = detect(teks, 'C'), bp = detect(cp.teks, 'C');
    if (!bs) catatan.push(`baris ${no}: tidak diawali kata kerja Bloom`); else if (bs.kabur) catatan.push(`baris ${no}: kata kerja "${bs.verb}" kurang terukur`);
    if (bs && bp && bs.d === bp.d && bs.n > bp.n) { lewat.push(`baris ${no} (${m.kode}): level ${bs.code} melampaui CPMK ${cp.kode} (${bp.code})`); continue; }
    const subCp = S.sub.filter(s => s.cpmk === cp.id);
    let ada = kd ? subCp.find(s => norm(s.kode) === norm(kd)) : null;
    if (!ada && !kd) ada = subCp.find(s => spasi(s.teks).toLowerCase() === teks.toLowerCase() && !subDisebut.has(s.id));
    if (kd && !ada) catatan.push(`baris ${no}: kode "${kd}" belum ada, dibuat sebagai Sub-CPMK baru dengan kode otomatis`);
    const bw = nz(row[k.bobot]) === '' ? null : parseFloat(String(row[k.bobot]).replace(',', '.'));
    if (bw != null && (!Number.isFinite(bw) || bw < 0 || bw > 100)) { lewat.push(`baris ${no} (${m.kode}): bobot harus angka 0 sampai 100`); continue; }
    const pm = k.pert >= 0 ? bacaMinggu(row[k.pert]) : null;
    if (pm && pm.salah) { lewat.push(`baris ${no} (${m.kode}): pertemuan "${pm.salah}" tidak dikenali (contoh 1-2, 4)`); continue; }
    if (pm && pm.luar.length) { lewat.push(`baris ${no} (${m.kode}): pertemuan harus 1 sampai 16`); continue; }
    if (pm && pm.ujian.length) catatan.push(`baris ${no}: minggu 8 dan 16 (ujian) tidak perlu ditulis, otomatis memuat semua Sub-CPMK`);
    let d;
    if (ada) {
      subDisebut.add(ada.id);
      const sama = spasi(ada.teks) === teks && (bw == null || +ada.bobot === bw);
      d = { ...ada, teks, bobot: bw == null ? (+ada.bobot || 0) : bw };
      const mingguLama = ringkasMinggu(mingguSub(m.id, ada.id)), mingguBaru = pm && k.pert >= 0 && nz(row[k.pert]) !== '' ? ringkasMinggu(pm.minggu.filter(x => x !== 8 && x !== 16)) : null;
      if (mingguBaru != null) pertMap.set(ada.id, pm.minggu.filter(x => x !== 8 && x !== 16));
      if (sama && (mingguBaru == null || mingguBaru === mingguLama)) tetap++; else ubah.push({ label: `${ada.kode} (${m.kode})`, detail: [spasi(ada.teks) !== teks ? 'rumusan berubah' : '', bw != null && +ada.bobot !== bw ? `bobot ${ada.bobot || 0}% → ${bw}%` : '', mingguBaru != null && mingguBaru !== mingguLama ? `pertemuan ${mingguLama || '–'} → ${mingguBaru || '–'}` : ''].filter(Boolean).join('; ') });
      rec.set(ada.id, { d, baru: false, ubah: !(sama && (mingguBaru == null || mingguBaru === mingguLama)) });
    } else {
      const kodeBaru = kodeBerikut(S, 'sub', pid, { cpmk: cp, pakai: tampungKode }); tampungKode.push(kodeBaru);
      d = { id: uid(cp.id + '-S'), mk: m.id, prodi: pid, cpmk: cp.id, kode: kodeBaru, teks, bobot: bw == null ? 0 : bw };
      if (pm && nz(row[k.pert]) !== '') pertMap.set(d.id, pm.minggu.filter(x => x !== 8 && x !== 16));
      baru.push(`${kodeBaru} (${m.kode}) ${teks.length > 70 ? teks.slice(0, 69) + '…' : teks}`);
      rec.set(d.id, { d, baru: true, ubah: true });
    }
    if (!bob.has(m.id)) bob.set(m.id, new Set()); bob.get(m.id).add(d.id);
  }
  /* bobot akhir per MK: semua sama dengan nol dibagi rata; jumlah selain 100 diberi peringatan */
  const bagi = [];
  bob.forEach((ids, mkId) => {
    const m = S.mk.find(x => x.id === mkId), semuaSub = S.sub.filter(s => s.mk === mkId && !ids.has(s.id)).map(s => ({ id: s.id, bobot: +s.bobot || 0 })).concat([...ids].map(id => ({ id, bobot: +rec.get(id).d.bobot || 0 }))), jml = semuaSub.reduce((a, s) => a + s.bobot, 0);
    if (jml === 0 && semuaSub.length) {
      const n = semuaSub.length, b0 = Math.floor(10000 / n) / 100; let acc = 0;
      semuaSub.forEach((s, i) => { const v = i === n - 1 ? Math.round((100 - acc) * 100) / 100 : b0; acc += v; if (rec.has(s.id)) { rec.get(s.id).d.bobot = v; rec.get(s.id).ubah = true; } else { const o = S.sub.find(q => q.id === s.id); if (o) bagi.push({ ...o, bobot: v }); } });
      catatan.push(`${m.kode}: bobot kosong, dibagi rata ${n} Sub-CPMK`);
    } else if (Math.abs(jml - 100) > 0.5) catatan.push(`${m.kode}: jumlah bobot Sub-CPMK ${Math.round(jml * 100) / 100}% (seharusnya 100%)`);
  });
  /* mode ganti semua: Sub-CPMK pada MK yang ada di berkas, tetapi tidak disebut, dihapus (hanya Kaprodi) */
  const hapusSub = kaprodi ? S.sub.filter(s => mkDisebut.has(s.mk) && !subDisebut.has(s.id) && !rec.has(s.id)) : [];
  const kMk = (id) => (S.mk.find(x => x.id === id) || {}).kode || '';
  if (!baru.length && !ubah.length && !hapusSub.length && !bagi.length) { toast(lewat.length ? 'Tidak ada baris yang valid. ' + lewat.slice(0, 2).join('; ') : tetap ? 'Tidak ada perubahan: semua baris sama dengan data di aplikasi.' : 'Tidak ada baris data terbaca.'); return; }
  const mode = await pratinjauImpor({ jenis: 'Sub-CPMK', baru, ubah, tetap, lewat, catatan, boleh: hapusSub.map(s => `${s.kode} (${kMk(s.mk)})`), tahan: [] }); if (!mode) return;
  if (mode === 'ganti') await templatSub(pid, [...mkDisebut], awalCadangan());
  const simpan = [...rec.values()].filter(x => x.baru || x.ubah).map(x => x.d).concat(bagi.filter(o => !rec.has(o.id)));
  if (simpan.length) await saveMany('sub', simpan, `Impor Excel Sub-CPMK: ${baru.length} baru, ${ubah.length} diperbarui (${pid})`);
  if (mode === 'ganti') for (const s of hapusSub) await remove('sub', s.id, `Impor Excel (ganti semua): hapus ${s.kode} (${pid})`);
  /* pemetaan ke pertemuan RPS */
  const hapusId = new Set(mode === 'ganti' ? hapusSub.map(s => s.id) : []), mkRps = new Set([...rec.values()].map(x => x.d.mk).concat(mode === 'ganti' ? hapusSub.map(s => s.mk) : []));
  let rpsUbah = 0; const pertKunci = [];
  for (const mkId of mkRps) {
    const m = S.mk.find(x => x.id === mkId), baruMk = [...rec.values()].filter(x => x.baru && x.d.mk === mkId).map(x => x.d.id), petaMk = [...pertMap].filter(([id]) => (S.sub.find(s => s.id === id) || {}).mk === mkId);
    let rr = rpsOf(S, mkId);
    /* RPS adalah pemilik pemetaan pertemuan: RPS yang sudah diajukan atau disahkan tidak diubah oleh impor Sub-CPMK */
    if (rr && rr.status && rr.status !== 'draf' && petaMk.length) { petaMk.length = 0; pertKunci.push(m.kode); }
    if (!rr && !petaMk.length) continue;
    const dibuat = !rr; rr = rr ? JSON.parse(JSON.stringify(rr)) : blankRps(m); let ubahR = dibuat;
    (rr.pertemuan || []).forEach(p => {
      const sebelum = (p.sub || []).join('|'); let ids = (p.sub || []).filter(id => !hapusId.has(id));
      if (p.ujian) baruMk.forEach(id => { if (!ids.includes(id)) ids.push(id); });
      else petaMk.forEach(([id, ws]) => { ids = ids.filter(x => x !== id); if (ws.includes(p.m)) ids.push(id); });
      if (ids.join('|') !== sebelum) { p.sub = ids; ubahR = true; }
    });
    if (ubahR) { await save('rps', rr, `Impor Excel Sub-CPMK: pemetaan pertemuan ${m.nama}`); rpsUbah++; }
  }
  toast(`Sub-CPMK tersimpan: ${baru.length} baru, ${ubah.length} diperbarui${lewat.length ? `, ${lewat.length} dilewati` : ''}${mode === 'ganti' ? `, ${hapusSub.length} dihapus` : ''}${rpsUbah ? `; RPS diperbarui ${rpsUbah} MK` : ''}${pertKunci.length ? `. Pemetaan pertemuan tidak diubah pada RPS yang sudah diajukan atau disahkan (${pertKunci.slice(0, 4).join(', ')}${pertKunci.length > 4 ? ', …' : ''}); ubah lewat menu RPS & SAP` : ''}.`); rerender();
}
