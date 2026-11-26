/* KUREKAM · Matriks CPL-CPMK-MK tingkat prodi (meniru lembar 13 sampai 15 Excel OBE).
   Prodi merumuskan CPMK sebagai turunan CPL (urut Sikap sampai Keterampilan khusus), lalu memetakan MK ke CPMK.
   Satu CPMK boleh dipakai banyak MK, dan satu MK boleh memuat banyak CPMK. */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, uid, toast, replaceData, addLog } from '../app.js';
import { templatCpmk, imporCpmk } from '../mkexcel.js';
import { RANAH_CPL, byProdi, cpmkProdi, rencanaCpmk, param, bokStandarProdi } from '../rules.js';
import { detect, badge } from '../bloom.js';
import { penyusun } from '../rumusan.js';
import { head, formDrawer, ro, tanya, short, pratinjau, loadXLSX } from './ui.js';

const WARNA = { S: '#10b981', P: '#0ea5e9', KU: '#8b5cf6', KK: '#f5a524' };
const akad = (m) => !/magang|tugas akhir/i.test(m.kel || '');
const kodeMk = (id) => (S.mk.find(m => m.id === id) || {}).kode || id;

/** Menomori ulang CPMK dan Sub-CPMK menurut urutan CPL dan menyimpan kode yang berubah. */
export async function urutkanCpmk(pid) {
  const r = rencanaCpmk(S, pid);
  if (r.cpmk.length) await saveMany('cpmk', r.cpmk, `Urutkan kode CPMK menurut CPL (${pid})`);
  if (r.sub.length) await saveMany('sub', r.sub);
}

const VERBA = { S: [], P: ['mengidentifikasi'], KU: ['menjelaskan'], KK: ['menjelaskan', 'menerapkan'] };
/** Contoh matriks dari CPL dan MK yang ada: tiap CPL diturunkan menjadi beberapa CPMK, lalu MK pemilik CPL dibagi ke CPMK menurut semester. */
async function bangunContoh(pid) {
  const cpl = byProdi(S.cpl, pid), mk = byProdi(S.mk, pid).filter(akad), lama = { cpmk: byProdi(S.cpmk, pid), sub: byProdi(S.sub, pid), rps: S.rps.filter(r => r.prodi === pid) };
  const resmi = lama.rps.filter(r => r.status && r.status !== 'draf').length;
  if (!cpl.length) { toast('Belum ada CPL.'); return; }
  if (!(await tanya(`Isian CPMK, Sub-CPMK, dan RPS lama prodi ini (${lama.cpmk.length} CPMK, ${lama.sub.length} Sub-CPMK, ${lama.rps.length} RPS${resmi ? `, termasuk ${resmi} RPS yang sudah diajukan atau disahkan` : ''}) dihapus, lalu matriks CPL-CPMK-MK disusun ulang sebagai contoh dari CPL dan mata kuliah yang ada. Lanjutkan?`, 'Susun ulang'))) return;
  for (const x of lama.sub) await remove('sub', x.id);
  for (const x of lama.cpmk) await remove('cpmk', x.id);
  for (const x of lama.rps) await remove('rps', x.id);
  const pis = (S.pi || []).filter(p => p.prodi === pid && (p.cpmk || []).length); if (pis.length) await saveMany('pi', pis.map(p => ({ ...p, cpmk: [] })));
  const baruC = [], baruS = [];
  cpl.forEach(c => {
    const kata = String(c.teks || '').trim().split(/\s+/), vc = (kata.shift() || 'menerapkan').toLowerCase(), objek = kata.join(' ').replace(/[.]+$/, ''), vs = [...(VERBA[c.ranah] || []).filter(v => v !== vc), vc];
    const pemilik = mk.filter(m => (m.cpl || []).includes(c.id)).sort((a, b) => a.smt - b.smt || a.nama.localeCompare(b.nama));
    vs.forEach((v, i) => {
      const teks = `Mampu ${v} ${objek}.`;
      pemilik.filter((_, j) => Math.min(vs.length - 1, Math.floor(j * vs.length / Math.max(1, pemilik.length))) === i).forEach(m => {
        const id = uid(m.id + '-CPMK'); baruC.push({ id, mk: m.id, prodi: pid, kode: '', teks, cpl: [c.id] });
        [`Mampu menjelaskan dasar ${objek}.`, `Mampu ${v} ${objek} pada ${m.nama}.`].forEach((t, k) => baruS.push({ id: uid(id + '-S'), cpmk: id, mk: m.id, prodi: pid, kode: '', teks: t, bobot: 50 }));
      });
    });
  });
  await saveMany('cpmk', baruC); await saveMany('sub', baruS); await urutkanCpmk(pid);
  toast(`Contoh disusun: ${cpmkProdi(S, pid).length} CPMK dan ${baruS.length} Sub-CPMK.`);
}

export function cpmkMatriksView(el) {
  const pid = ctx.prodi, ed = can('susun'), cpl = byProdi(S.cpl, pid), grup = cpmkProdi(S, pid), mkAll = byProdi(S.mk, pid).filter(akad);
  const tanpa = cpl.filter(c => !grup.some(g => g.cpl === c.id));
  const bagian = (c) => {
    const gs = grup.filter(g => g.cpl === c.id), w = WARNA[c.ranah] || '#64748b', b = detect(c.teks, c.ranah === 'S' ? 'A' : 'C');
    return `<div class="card" style="margin-top:14px;border-left:4px solid ${w}">${head(`${c.kode} · ${RANAH_CPL[c.ranah] || c.ranah}`, esc(c.teks), 'target', w, ed ? `<button class="btn pri sm" data-baru="${c.id}">${icon('plus')} CPMK</button>` : '')}
      ${gs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>CPMK</th><th>Rumusan CPMK</th><th>Bloom</th><th>Mata kuliah yang memuat</th></tr></thead><tbody>${gs.map(g => { const bb = detect(g.teks, 'C'); return `<tr class="${ed ? 'click' : ''}" data-k="${esc(g.kunci)}"><td><b>${g.kode}</b></td><td>${esc(g.teks)}</td><td>${bb ? badge(bb.code) : badge(null)}</td><td class="small">${g.rec.map(r => `<span class="tag" style="--c:${w}">${esc(kodeMk(r.mk))}</span>`).join(' ')} <span class="muted">${g.rec.length} MK</span></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty small">Belum ada CPMK untuk ${c.kode}.${ed ? ' Klik tombol CPMK di kanan atas.' : ''}</div>`}</div>`;
  };
  el.innerHTML = `<div class="card">${head('Matriks CPL, CPMK, dan mata kuliah', `${prodiNama()} · mengikuti lembar 13 sampai 15 Excel OBE`, 'link', '#f472b6', ed ? `<button class="btn sm" id="cpmk-tpl">${icon('download')} Templat Excel</button> <button class="btn sm" id="cpmk-imp">${icon('upload')} Impor Excel</button><input type="file" id="cpmk-file" accept=".xlsx,.xls" hidden> <button class="btn sm" id="contoh">${icon('spark')} Susun contoh dari CPL dan MK</button><button class="btn sm" id="urut">${icon('loop')} Urutkan kode</button>` : ro())}
    <div class="filters"><span class="st ${tanpa.length ? 'bad' : 'ok'}">${tanpa.length ? `${tanpa.length} CPL belum punya CPMK: ${tanpa.map(c => c.kode).join(', ')}` : 'Semua CPL sudah punya CPMK'}</span><span class="st na">${grup.length} CPMK</span></div>
    <p class="note">Urutan kerja: (1) CPL, (2) matriks CPL dan mata kuliah di menu Mata Kuliah &amp; SKS, (3) CPMK diturunkan dari CPL di halaman ini dan dipetakan ke mata kuliah (satu CPMK boleh dipakai banyak mata kuliah), (4) dosen memilih CPMK yang sesuai, menyusun Sub-CPMK, indikator, dan RPS, (5) kaprodi dan SPM memvalidasi. Kode CPMK mengikuti urutan CPL: dimulai dari Sikap sampai Keterampilan khusus.</p></div>
    ${cpl.map(bagian).join('') || '<div class="card empty">Belum ada CPL. Susun CPL di menu Capaian Pembelajaran Lulusan.</div>'}`;
  if (!ed) return;
  const form = (g, c) => {
    const opsiMk = mkAll.filter(m => (m.cpl || []).includes(c.id) || (g && g.rec.some(r => r.mk === m.id))).sort((a, b) => a.smt - b.smt || a.nama.localeCompare(b.nama));
    const x = g ? { kode: g.kode, teks: g.teks, cpl: c.id, mk: g.rec.map(r => r.mk) } : { cpl: c.id, mk: [] };
    const py = penyusun({ jenis: 'cpmk', ranah: c.ranah, prak: false, smt: 0, konteks: [], basis: () => c.teks });
    formDrawer({ onOpen: (dr) => py.pasang(dr), title: g ? 'Ubah ' + g.kode : 'CPMK baru untuk ' + c.kode, sub: short(c.teks, 120), obj: x,
      fields: [{ k: 'kode', label: 'Kode', type: 'kode', ph: g ? g.kode : 'otomatis menurut urutan CPL' }, py.field, { k: 'teks', label: 'Rumusan CPMK (turunan dari ' + c.kode + ')', type: 'textarea', rows: 3, live: (v) => { const b = detect(v, 'C'); return b ? `${badge(b.code)} kata kerja "<b>${esc(b.verb)}</b>"` : (v.trim() ? badge(null) : 'Awali dengan kata kerja operasional.'); } },
        { k: 'mk', label: 'Mata kuliah yang memuat CPMK ini (hanya MK yang dibebani ' + c.kode + ')', type: 'multi', opts: opsiMk.map(m => ({ v: m.id, t: `${m.kode} · ${short(m.nama, 34)} (S${m.smt})`, title: m.nama })), help: opsiMk.length ? 'Satu CPMK boleh dipakai banyak mata kuliah.' : 'Belum ada mata kuliah yang dibebani ' + c.kode + '. Bebankan dulu di menu Mata Kuliah & SKS.' }],
      onSave: async (o) => {
        if (!o.teks) return 'Rumusan wajib diisi.'; if (!(o.mk || []).length) return 'Pilih minimal satu mata kuliah. Bebankan ' + c.kode + ' pada mata kuliah dulu bila daftar kosong.';
        const ada = g ? g.rec : [], pilih = new Set(o.mk);
        const lepas = ada.filter(r => !pilih.has(r.mk)); const subLepas = S.sub.filter(s => lepas.some(r => r.id === s.cpmk));
        for (const s of subLepas) await remove('sub', s.id);
        for (const r of lepas) await remove('cpmk', r.id, `Lepas ${r.kode} dari ${kodeMk(r.mk)}`);
        const tetap = ada.filter(r => pilih.has(r.mk)).map(r => ({ ...r, teks: o.teks })); if (tetap.length) await saveMany('cpmk', tetap, `Ubah rumusan ${g.kode}`);
        const baru = o.mk.filter(id => !ada.some(r => r.mk === id)).map(id => { const m = S.mk.find(y => y.id === id); return { id: uid(id + '-CPMK'), mk: id, prodi: pid, kode: g ? g.kode : '', teks: o.teks, cpl: [c.id] }; });
        if (baru.length) await saveMany('cpmk', baru, `Tambah CPMK ${o.teks.slice(0, 30)}`);
        await urutkanCpmk(pid); rerender();
      },
      onDelete: g ? async () => { for (const r of g.rec) { for (const s of S.sub.filter(s => s.cpmk === r.id)) await remove('sub', s.id); await remove('cpmk', r.id); } await urutkanCpmk(pid); rerender(); } : null });
  };
  el.querySelectorAll('[data-baru]').forEach(b => b.onclick = () => form(null, cpl.find(c => c.id === b.dataset.baru)));
  el.querySelectorAll('tr.click').forEach(r => r.onclick = () => { const g = grup.find(y => y.kunci === r.dataset.k); form(g, cpl.find(c => c.id === g.cpl) || cpl[0]); });
  el.querySelector('#urut').onclick = async () => { await urutkanCpmk(pid); toast('Kode CPMK dan Sub-CPMK diurutkan menurut CPL.'); rerender(); };
  { const bt = el.querySelector('#cpmk-tpl'), bi = el.querySelector('#cpmk-imp'), fi = el.querySelector('#cpmk-file'); if (bt) { bt.onclick = () => templatCpmk(pid).catch(e => toast('Templat gagal: ' + e.message)); bi.onclick = () => { fi.value = ''; fi.click(); }; fi.onchange = () => { const f = fi.files[0]; if (f) imporCpmk(f, pid).catch(e => toast('Impor gagal: ' + e.message)); }; } }
  el.querySelector('#contoh').onclick = async () => { await bangunContoh(pid); rerender(); };
}
const prodiNama = () => (S.prodi.find(p => p.id === ctx.prodi) || {}).nama || ctx.prodi;
