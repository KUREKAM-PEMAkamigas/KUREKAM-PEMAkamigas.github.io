/* KUREKAM · Impor RPS dari berkas Word (format FM-BPPAK.01-06).
   Berkas dibaca di peramban (tanpa pustaka luar, tanpa dikirim ke server), hasilnya ditampilkan sebagai draf untuk ditinjau. */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, toast, openDrawer, addLog } from './app.js';
import { prodiTag } from './views/ui.js';

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
const rapi = (s) => String(s == null ? '' : s).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const satu = (s) => rapi(s).replace(/\n+/g, ' ');

/* ---------- membuka .docx (zip) tanpa pustaka ---------- */
async function bacaZipEntri(buf, nama) {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  let e = u8.length - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Berkas bukan format Word (.docx) yang valid.');
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  for (let i = 0; i < n; i++) {
    const met = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const nm = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    if (nm === nama) {
      const lh = off, dstart = lh + 30 + v.getUint16(lh + 26, true) + v.getUint16(lh + 28, true), data = u8.subarray(dstart, dstart + csize);
      if (met === 0) return new TextDecoder().decode(data);
      const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(data); w.close();
      return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
    }
    p += 46 + nl + el + cl;
  }
  throw new Error('Isi dokumen Word tidak ditemukan.');
}

/** Semua baris tabel pada dokumen, tiap baris berupa daftar teks sel. */
function barisTabel(xml) {
  const d = new DOMParser().parseFromString(xml, 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const kids = (el, tag) => Array.from(el.childNodes).filter(n => n.localName === tag && n.namespaceURI === W);
  const par = (p) => { let t = ''; const walk = (n) => { for (const c of n.childNodes) { if (c.namespaceURI !== W) continue; if (c.localName === 't') t += c.textContent; else if (c.localName === 'tab') t += ' '; else if (c.localName === 'br') t += '\n'; else walk(c); } }; walk(p); return t; };
  const rows = [];
  const body = d.getElementsByTagNameNS(W, 'body')[0];
  kids(body, 'tbl').forEach(tb => kids(tb, 'tr').forEach(tr => rows.push(kids(tr, 'tc').map(tc => rapi(kids(tc, 'p').map(par).join('\n'))))));
  return rows;
}

const kodeProdi = (raw) => { const s = norm(raw); const p = S.prodi.find(x => norm(x.id) === s || norm(x.nama) === s); if (p) return p.id; if (/logistik/.test(s)) return 'LO'; if (/produksi/.test(s)) return 'TP'; if (/pengolahan/.test(s)) return 'TO'; if (/instrumentasi/.test(s)) return 'TI'; if (/mesin/.test(s)) return 'TM'; return null; };
const angka = (s) => { const m = String(s || '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? +m[0] : 0; };

/** Mengurai satu berkas RPS menjadi objek terstruktur. */
export async function bacaRps(file) {
  const buf = await file.arrayBuffer(), xml = await bacaZipEntri(buf, 'word/document.xml'), R = barisTabel(xml);
  const o = { file: file.name, cpl: [], cpmk: [], sub: [], korelasi: [], minggu: [], ujian: [], peringatan: [], deskripsi: '', bahan: '', pustaka: '', pengampu: '', syarat: '', prodiTeks: '' };
  const ada = (r, re) => r.some(c => re.test(c));
  for (let i = 0; i < R.length; i++) {
    const r = R[i], j = r.filter(c => c);
    if (!j.length) continue;
    if (!o.prodiTeks) { const x = j.find(c => /program studi/i.test(c)); if (x) o.prodiTeks = satu(x.match(/program studi[^\n]*/i)[0]); }
    if (r[0] && /^mata kuliah \(mk\)/i.test(r[0]) && R[i + 1]) {
      const d = R[i + 1].filter(c => c !== ''); o.nama = satu(d[0] || ''); o.kode = (d.find(c => /^[A-Za-z]{2,4}\d{3,5}$/.test(satu(c))) || '').trim(); o.rumpun = satu(d[2] || '');
      const idx = d.findIndex(c => /^[A-Za-z]{2,4}\d{3,5}$/.test(satu(c))); const ang = d.slice(idx + 2).filter(c => /^\d+([.,]\d+)?$/.test(satu(c)));
      o.T = angka(ang[0]); o.P = angka(ang[1]); o.smt = angka(ang[2]); o.tgl = satu(d[d.length - 1] || '');
    }
    const kj = j.findIndex(c => /^cpl-?\s*\d+$/i.test(satu(c))); if (kj >= 0 && j[kj + 1] && j[kj + 1].length > 15) o.cpl.push({ kode: satu(j[kj]).toUpperCase(), teks: satu(j[kj + 1]) });
    const kc = j.findIndex(c => /^cpmk-?\s*\d+$/i.test(satu(c))); if (kc >= 0 && j[kc + 1] && j[kc + 1].length > 25) o.cpmk.push({ kode: satu(j[kc]).toUpperCase(), teks: satu(j[kc + 1]) });
    const ks = j.findIndex(c => /^sub-?\s*cpmk-?\s*\d+$/i.test(satu(c))); if (ks >= 0 && j[ks + 1] && j[ks + 1].length > 25) o.sub.push({ kode: satu(j[ks]).replace(/\s+/g, '').replace(/^sub-?cpmk-?/i, 'Sub-CPMK-'), teks: satu(j[ks + 1]) });
    /* korelasi CPMK terhadap Sub-CPMK */
    if (r.filter(c => /^sub-?\s*cpmk-?\s*\d+$/i.test(satu(c))).length >= 2) o._kh = r.map(c => (satu(c).match(/^sub-?\s*cpmk-?\s*(\d+)$/i) || [])[1] || null);
    else if (o._kh && j.length > 1 && /^cpmk-?\s*\d+$/i.test(satu(j[0])) && r.some(c => /[✓✔vV√]/.test(c))) o.korelasi.push({ cpmk: satu(j[0]).toUpperCase().replace(/^CPMK-?/, ''), sub: r.map((c, x) => /[✓✔√]/.test(c) && o._kh[x] ? o._kh[x] : null).filter(Boolean) });
    if (/^dis?kripsi/i.test(r[0])) o.deskripsi = rapi(r[1] || '');
    if (/^bahan kajian/i.test(r[0])) o.bahan = rapi(r[1] || '');
    if (/^dosen pengampu/i.test(r[0])) o.pengampu = satu(r[1] || '');
    if (/^mata ?kuliah syarat/i.test(r[0])) o.syarat = satu(r[1] || '');
    if (/^pustaka/i.test(r[0])) o._pus = true;
    else if (o._pus && !/^dosen pengampu/i.test(r[0])) { const t = j.join('\n'); if (/^(utama|pendukung):?$/i.test(satu(t))) o.pustaka += (o.pustaka ? '\n' : '') + satu(t).replace(':', '') + ':\n'; else o.pustaka += rapi(t) + '\n'; }
    if (/^dosen pengampu/i.test(r[0])) o._pus = false;
    /* tabel 16 pertemuan */
    if (/^\d{1,2}$/.test(satu(r[0])) && r.length >= 7 && /sub-?\s*cpmk/i.test(r[1] || '')) {
      const b = rapi(r[4] || ''), dg = rapi(r[5] || '');
      const bentuk = (b.match(/Bentuk:\s*([^\n]+)/i) || [])[1] || '', metode = (b.match(/Metode:\s*([\s\S]*?)(?=\n\s*(?:\[|Tugas|Bentuk:)|$)/i) || [])[1] || '';
      o.minggu.push({ m: +satu(r[0]), subKode: (satu(r[1]).match(/sub-?\s*cpmk-?\s*(\d+)/i) || [])[1] || '', capaian: rapi(r[1]).split('\n').slice(1).join(' '), indikator: rapi(r[2] || ''), asesmen: satu(r[3] || ''), tatap: b, daring: dg, bentuk: satu(bentuk), metode: satu(metode), materi: rapi(r[6] || ''), bobot: angka(r[r.length - 1]) });
    } else if (/^\d{1,2}$/.test(satu(r[0])) && r.length <= 4 && /(evaluasi|ujian|uts|uas)/i.test(r[1] || '')) {
      o.ujian.push({ m: +satu(r[0]), jenis: /tengah|uts/i.test(r[1]) ? 'UTS' : 'UAS', teks: satu(r[1]), bobot: angka(r[r.length - 1]) });
    }
  }
  delete o._kh; delete o._pus; o.pustaka = o.pustaka.trim();
  if (!o.nama) o.peringatan.push('Nama dan kode mata kuliah tidak terbaca. Pastikan memakai format RPS baku.');
  if (!o.minggu.length) o.peringatan.push('Tabel pertemuan tidak terbaca.');
  return o;
}

/** Mencocokkan hasil bacaan dengan MK rancangan: kode, lalu nama pada prodi yang sama. */
function cariMk(o) {
  const pid = kodeProdi(o.prodiTeks) || (S.prodi.find(p => o.kode && o.kode.toUpperCase().startsWith(p.id)) || {}).id || null;
  const dalam = S.mk.filter(m => !pid || m.prodi === pid);
  let m = dalam.find(x => o.kode && norm(x.kode) === norm(o.kode)); let cara = m ? 'kode' : '';
  if (!m && o.nama) { m = dalam.find(x => norm(x.nama) === norm(o.nama)); cara = m ? 'nama' : ''; }
  if (!m && o.nama) { const n = norm(o.nama); m = dalam.find(x => norm(x.nama).length > 5 && (n.includes(norm(x.nama)) || norm(x.nama).includes(n))); cara = m ? 'nama mirip' : ''; }
  return { prodi: pid, mk: m || null, cara };
}

/** Menyusun CPMK, Sub-CPMK, dan RPS untuk MK terpilih (belum disimpan). */
function susun(o, mk) {
  const penuh = can('susun', mk), ada = S.cpmk.filter(c => c.mk === mk.id);
  const cplP = S.cpl.filter(c => c.prodi === mk.prodi), pes = [];
  const petaCpl = (k) => { const n = parseInt(String(k).replace(/\D/g, ''), 10); const x = cplP.find(c => norm(c.kode) === norm(k)) || cplP[n - 1]; return x ? x.id : null; };
  const cplIds = Array.from(new Set(o.cpl.map(c => petaCpl(c.kode)).filter(Boolean)));
  o.cpl.forEach(c => { if (!petaCpl(c.kode)) pes.push(`${c.kode} tidak ditemukan pada CPL prodi ${mk.prodi}. Hubungkan manual di menu CPMK.`); });
  const cpmk = !penuh ? ada : o.cpmk.map((c, i) => ({ id: `${mk.id}-C${i + 1}`, mk: mk.id, prodi: mk.prodi, kode: c.kode.replace(/^CPMK-?/, 'CPMK-'), teks: c.teks, cpl: cplIds }));
  const noCp = (kodeSub) => { const k = o.korelasi.find(x => x.sub.includes(String(parseInt(kodeSub, 10)).padStart(2, '0')) || x.sub.includes(String(parseInt(kodeSub, 10)))); const c = k && cpmk.find(x => String(parseInt(x.kode.replace(/\D/g, ''), 10)) === String(parseInt(k.cpmk, 10))); return (c || cpmk[0] || {}).id; };
  const tot = {}; o.minggu.forEach(w => { const n = parseInt(w.subKode, 10); tot[n] = (tot[n] || 0) + w.bobot; }); const jum = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  const sub = o.sub.map((s, i) => { const n = parseInt(s.kode.replace(/\D/g, ''), 10); return { id: `${mk.id}-S${i + 1}`, cpmk: noCp(s.kode.replace(/\D/g, '')), mk: mk.id, prodi: mk.prodi, kode: s.kode, teks: s.teks, bobot: Math.round((tot[n] || 0) / jum * 1000) / 10, _n: n }; });
  if (!penuh) pes.push(ada.length ? 'Peran Dosen: hanya Sub-CPMK dan RPS yang diperbarui. CPMK dan CPL milik prodi tidak diubah. Sub-CPMK dikaitkan ke CPMK yang sudah ada, dan Tim Kurikulum Prodi dapat merevisinya.' : 'MK ini belum punya CPMK. Minta Tim Kurikulum Prodi menyusun atau mengunggah RPS-nya terlebih dahulu.');
  else if (!cpmk.length) pes.push('CPMK tidak terbaca.');
  if (!sub.length) pes.push('Sub-CPMK tidak terbaca.');
  const sumB = sub.reduce((a, s) => a + s.bobot, 0); if (sub.length && Math.abs(sumB - 100) > 0.5) { const d = Math.round((100 - sumB) * 10) / 10; sub[sub.length - 1].bobot = Math.round((sub[sub.length - 1].bobot + d) * 10) / 10; }
  const semua = sub.map(s => s.id), subById = (n) => (sub.find(s => s._n === parseInt(n, 10)) || {}).id;
  const per = [];
  o.minggu.forEach(w => per.push({ m: w.m, sub: subById(w.subKode) ? [subById(w.subKode)] : [], materi: w.materi, metode: [w.bentuk, w.metode].filter(Boolean).join('; '), asesmen: w.asesmen, bobot: w.bobot, indikator: w.indikator, tatap: w.tatap, daring: w.daring, integ: '', integUraian: '', sap: {} }));
  o.ujian.forEach(u => per.push({ m: u.m, ujian: u.jenis, sub: semua, materi: u.jenis === 'UTS' ? 'Ujian Tengah Semester' : 'Ujian Akhir Semester', metode: 'Ujian', asesmen: u.teks, bobot: u.bobot, sap: {} }));
  per.sort((a, b) => a.m - b.m);
  if (per.length && per.length !== 16) pes.push(`RPS memuat ${per.length} pertemuan (Pedoman umumnya 16 termasuk UTS dan UAS). Dibaca apa adanya.`);
  const bobotTot = per.reduce((a, p) => a + (+p.bobot || 0), 0); if (per.length && Math.abs(bobotTot - 100) > 0.5) pes.push(`Total bobot penilaian ${bobotTot}% (seharusnya 100%).`);
  if (o.T != null && (+o.T !== +mk.T || +o.P !== +mk.P)) pes.push(`Bobot SKS pada RPS ${o.T}T+${o.P}P berbeda dengan MK rancangan ${mk.T}T+${mk.P}P.`);
  sub.forEach(s => delete s._n);
  const rps = { id: mk.id, mk: mk.id, prodi: mk.prodi, deskripsi: o.deskripsi, bahan: o.bahan, pustaka: o.pustaka, penelitian: '', pkm: '', pengampuRps: o.pengampu, syarat: o.syarat, pertemuan: per, status: 'draf', oleh: 'Impor RPS Word', tgl: new Date().toISOString().slice(0, 10), sumber: o.file };
  return { cpmk, sub, rps, cplIds, pes };
}

/* ---------- antarmuka ---------- */
export function tombolUnggahRps(el, draw) {
  const wadah = el.querySelector('#rps-unggah'); if (!wadah) return;
  wadah.innerHTML = `<button class="btn pri sm" id="rps-up">${icon('upload')} Unggah RPS (Word)</button><input type="file" id="rps-file" accept=".docx" multiple style="display:none"><span class="muted small">Format RPS baku (.docx). Hasilnya ditinjau dulu sebelum disimpan, dan tetap dapat direvisi.</span>`;
  const f = wadah.querySelector('#rps-file'); wadah.querySelector('#rps-up').onclick = () => { f.value = ''; f.click(); };
  f.onchange = async () => {
    const hasil = [];
    for (const file of Array.from(f.files)) { try { const o = await bacaRps(file); hasil.push({ o, ...cariMk(o) }); } catch (e) { console.error(e); hasil.push({ o: { file: file.name, peringatan: [e.message], cpl: [], cpmk: [], sub: [], minggu: [], ujian: [] }, mk: null, prodi: null, cara: '', gagal: true }); } }
    if (hasil.length) tinjau(hasil, draw);
  };
}

function tinjau(hasil, draw) {
  const boleh = S.mk.filter(m => can('rps', { prodi: m.prodi, mk: m.id }) && m.smt <= 8);
  const kartu = (h, i) => {
    const o = h.o, opsi = boleh.filter(m => !h.prodi || m.prodi === h.prodi).sort((a, b) => a.smt - b.smt || a.nama.localeCompare(b.nama));
    const sem = h.mk ? susun(o, h.mk) : null; h.sem = sem;
    const ada = h.mk ? S.cpmk.filter(c => c.mk === h.mk.id).length : 0;
    return `<div class="card" data-k="${i}" style="margin-bottom:12px"><div class="filters" style="margin:0"><label class="cp ${h.mk && !h.gagal ? 'on' : ''}"><input type="checkbox" data-pakai ${h.mk && !h.gagal && boleh.includes(h.mk) ? 'checked' : ''} ${h.gagal ? 'disabled' : ''}>Simpan</label><b>${esc(o.nama || o.file)}</b> <span class="muted small">${esc(o.kode || '')} · ${esc(o.file)}</span></div>
      ${h.gagal ? '' : `<div class="field" style="margin-top:8px"><label>Dicocokkan dengan MK rancangan ${h.cara ? `<span class="muted small">(lewat ${h.cara})</span>` : '<span class="st bad">belum cocok, pilih manual</span>'}${h.mk && !boleh.includes(h.mk) ? '<span class="st bad">peran Anda tidak berwenang atas RPS MK ini (dosen hanya untuk MK yang ditugaskan kepadanya). Ganti ke Admin atau Tim Kurikulum ' + h.mk.prodi + ', atau minta Kaprodi menugaskan Anda pada MK ini di menu Penugasan & Beban Dosen</span>' : ''}</label><select class="inp" data-mk><option value="">— pilih MK —</option>${opsi.map(m => `<option value="${m.id}" ${h.mk && h.mk.id === m.id ? 'selected' : ''}>${m.prodi} · S${m.smt} · ${esc(m.kode)} · ${esc(m.nama)}</option>`).join('')}</select></div>
      <div class="small" style="margin:6px 0">${o.cpl.length} CPL · ${o.cpmk.length} CPMK · ${o.sub.length} Sub-CPMK · ${o.minggu.length + o.ujian.length} pertemuan ${sem ? '· ' + (sem.rps.pertemuan.reduce((a, p) => a + (+p.bobot || 0), 0)) + '% bobot' : ''}${ada ? `<br><span class="st near">MK ini sudah punya ${ada} CPMK. Menyimpan akan menggantikan ${can('susun', h.mk) ? 'CPMK, ' : ''}Sub-CPMK dan RPS yang ada.</span>` : ''}</div>`}
      ${[...(o.peringatan || []), ...((sem && sem.pes) || [])].map(p => `<div class="ribbon bad" style="margin:4px 0">${esc(p)}</div>`).join('')}
      ${sem ? `<details><summary class="small">Lihat hasil bacaan</summary><div class="small" style="margin-top:6px"><b>Deskripsi:</b> ${esc((o.deskripsi || '').slice(0, 260))}…<br>${o.cpmk.map(c => `<b>${esc(c.kode)}</b> ${esc(c.teks)}`).join('<br>')}<br>${o.sub.map(s => `<b>${esc(s.kode)}</b> ${esc(s.teks)}`).join('<br>')}<br><b>Pertemuan:</b> ${sem.rps.pertemuan.map(p => `${p.m}${p.ujian ? ' ' + p.ujian : ''}: ${esc(String(p.materi || '').replace(/^Materi Inti[^\n]*\n?/i, '').replace(/\s*\n\s*/g, ' ').slice(0, 60))}`).join(' · ')}</div></details>` : ''}</div>`;
  };
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('upload')}</span><div><h3>Tinjau RPS yang dibaca</h3><div class="sub">${hasil.length} berkas. Periksa kecocokan MK dan peringatan, lalu simpan sebagai draf. Revisi lanjutan lewat menu CPMK & Sub-CPMK dan RPS.</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div id="tj">${hasil.map(kartu).join('')}</div>
    <div class="drawer-act"><div class="sp"></div><button class="btn ghost" data-close>Batal</button><button class="btn pri" id="tj-ok">${icon('check')} Simpan yang dicentang</button></div>`, (dr) => {
    dr.querySelectorAll('[data-mk]').forEach(sel => sel.onchange = () => { const k = +sel.closest('[data-k]').dataset.k, m = S.mk.find(x => x.id === sel.value); hasil[k].mk = m || null; hasil[k].cara = m ? 'pilihan manual' : ''; dr.querySelector('#tj').innerHTML = hasil.map(kartu).join(''); dr.querySelectorAll('[data-mk]').forEach(s2 => s2.onchange = sel.onchange); });
    dr.querySelector('#tj-ok').onclick = async () => {
      let n = 0;
      for (const [i, h] of hasil.entries()) {
        const kt = dr.querySelector(`[data-k="${i}"]`); if (!kt || !kt.querySelector('[data-pakai]').checked || !h.mk || !h.sem) continue;
        const s = h.sem, mk = h.mk;
        if (!can('susun', mk) && !s.cpmk.length) continue;
        if (can('susun', mk)) for (const c of S.cpmk.filter(x => x.mk === mk.id)) await remove('cpmk', c.id);
        for (const c of S.sub.filter(x => x.mk === mk.id)) await remove('sub', c.id);
        if (can('susun', mk)) await saveMany('cpmk', s.cpmk);
        s.sub.forEach(x => { if (!x.cpmk) x.cpmk = s.cpmk[0].id; });
        await saveMany('sub', s.sub); await save('rps', s.rps);
        if (can('susun', mk) && s.cplIds.length) { mk.cpl = Array.from(new Set([...(mk.cpl || []), ...s.cplIds])); await save('mk', mk); }
        n++;
      }
      await addLog(`Impor RPS Word: ${n} MK`); toast(`${n} RPS disimpan sebagai draf`);
      document.querySelectorAll('[data-close]')[0] && document.querySelectorAll('[data-close]')[0].click(); draw ? draw() : rerender();
    };
  }, true);
  void prodiTag; void ctx;
}
