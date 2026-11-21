/* KUREKAM · Daftar penelitian dan PKM dosen (sumber pilihan integrasi di RPS) */
import { S, ctx, can, save, saveMany, remove, rerender, esc, icon, uid, toast } from '../app.js';
import { JENIS, rapikanEntri, dipakaiDi, normRiset } from '../riset.js';
import { head, formDrawer, prodiTag, stTag, tanya, unduh, loadXLSX, short } from './ui.js';

let fDosen = '', fJenis = '', pesan = '';
const HEAD = ['Nama dosen', 'Jenis (Penelitian atau PKM)', 'Judul', 'Skema', 'Tahun', 'Mitra (untuk PKM)', 'Kata kunci (boleh kosong, terisi otomatis dari judul)', 'Ringkasan temuan atau luaran (boleh kosong)'];

/** Dosen yang daftarnya terlihat oleh peran saat ini. */
function dosenTampak() {
  if (ctx.role === 'dosen') return S.dosen.filter(d => d.id === ctx.dosen);
  if (ctx.role === 'prodi') return S.dosen.filter(d => can('riset', { dosen: d.id }));
  return S.dosen.filter(d => (S.riset || []).some(e => e.dosen === d.id));
}
const namaDosen = (id) => (S.dosen.find(d => d.id === id) || {}).nama || id;

export default function risetView(el) {
  const dsn = dosenTampak(), dsnIds = new Set(dsn.map(d => d.id));
  if (ctx.role === 'dosen' && !ctx.dosen) { el.innerHTML = `<div class="card empty">Akun Anda belum dikaitkan dengan data dosen. Hubungi admin.</div>`; return; }
  const semua = (S.riset || []).filter(e => dsnIds.has(e.dosen)).filter(e => (!fDosen || e.dosen === fDosen) && (!fJenis || e.jenis === fJenis)).sort((a, b) => namaDosen(a.dosen).localeCompare(namaDosen(b.dosen)) || (b.tahun || 0) - (a.tahun || 0));
  const bisaTambah = ctx.role === 'dosen' ? !!ctx.dosen : ['prodi', 'admin', 'developer'].includes(ctx.role);
  el.innerHTML = `<div class="card">${head('Penelitian dan PKM dosen', 'Diisi sekali, lalu dipilih dari daftar saat menyusun RPS. Kata kunci terisi otomatis dari judul.', 'book', '#14b8a6',
    bisaTambah ? `<div class="filters"><button class="btn pri sm" id="add">${icon('plus')} Tambah</button><button class="btn sm" id="tpl">${icon('download')} Templat Excel</button><button class="btn sm" id="imp">${icon('upload')} Unggah Excel</button></div>` : '')}
    <input type="file" id="file" accept=".xlsx,.xls" style="display:none">
    <div class="filters" style="margin:8px 0">${ctx.role !== 'dosen' ? `<select class="inp" id="fd"><option value="">Semua dosen</option>${dsn.map(d => `<option value="${d.id}" ${d.id === fDosen ? 'selected' : ''}>${esc(d.nama)}</option>`).join('')}</select>` : ''}
      <select class="inp" id="fj"><option value="">Semua jenis</option>${JENIS.map(j => `<option ${j === fJenis ? 'selected' : ''}>${j}</option>`).join('')}</select><span class="small muted">${semua.length} entri</span></div>
    <div id="hasil">${pesan}</div>
    ${semua.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${ctx.role !== 'dosen' ? '<th>Dosen</th>' : ''}<th>Jenis</th><th>Judul</th><th>Skema, tahun, mitra</th><th>Kata kunci</th><th class="num">Dipakai</th><th></th></tr></thead><tbody>
    ${semua.map(e => `<tr><td data-l="Dosen" ${ctx.role === 'dosen' ? 'hidden' : ''}>${esc(namaDosen(e.dosen))}</td><td data-l="Jenis">${stTag(e.jenis === 'PKM' ? 'near' : 'ok', e.jenis)}</td><td data-l="Judul">${esc(e.judul)}${e.ringkas ? `<div class="small muted">${esc(short(e.ringkas, 110))}</div>` : ''}</td><td class="small" data-l="Skema, tahun, mitra">${esc([e.skema, e.tahun, e.mitra].filter(Boolean).join(' · '))}</td><td class="small" data-l="Kata kunci">${esc(e.kata)}</td><td class="num" data-l="Dipakai">${dipakaiDi(S, e.id)} pertemuan</td><td>${can('riset', { dosen: e.dosen }) ? `<button class="btn sm" data-ed="${e.id}">${icon('edit')}</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : `<div class="empty">Belum ada entri. ${bisaTambah ? 'Klik Tambah, atau unggah Excel (unduh templatnya dulu).' : ''}</div>`}</div>`;
  el.querySelectorAll('#fd, #fj').forEach(x => x.onchange = () => { fDosen = (el.querySelector('#fd') || {}).value || ''; fJenis = el.querySelector('#fj').value; rerender(); });
  const form = (obj) => formDrawer({ title: obj.id ? 'Ubah penelitian atau PKM' : 'Tambah penelitian atau PKM', sub: namaDosen(obj.dosen), obj, wide: true,
    fields: [{ k: 'jenis', label: 'Jenis', type: 'select', opts: JENIS.map(j => ({ v: j, t: j })) }, { k: 'judul', label: 'Judul', type: 'textarea', rows: 2, full: true },
      { k: 'skema', label: 'Skema', ph: 'Contoh: Penelitian Terapan, PKM Mandiri' }, { k: 'tahun', label: 'Tahun', type: 'number', step: '1' }, { k: 'mitra', label: 'Mitra (untuk PKM)' },
      { k: 'kata', label: 'Kata kunci topik', type: 'textarea', rows: 2, help: 'Kosongkan agar terisi otomatis dari judul. Dipakai untuk mencocokkan dengan materi mata kuliah. Pisahkan dengan koma.' },
      { k: 'ringkas', label: 'Ringkasan temuan atau luaran (1 sampai 2 kalimat)', type: 'textarea', rows: 3 }],
    onSave: async (o) => {
      const x = rapikanEntri(o); if (!x.judul) return 'Judul wajib diisi.'; if (!x.id) x.id = uid('RS');
      if ((S.riset || []).some(e => e.id !== x.id && e.dosen === x.dosen && normRiset(e.judul) === normRiset(x.judul))) return 'Judul ini sudah ada di daftar dosen tersebut.';
      await save('riset', x, `${obj.id ? 'Ubah' : 'Tambah'} ${x.jenis} dosen: ${short(x.judul, 60)}`); rerender();
    },
    onDelete: obj.id ? async (o) => { const n = dipakaiDi(S, o.id); if (n) { toast(`Tidak dapat dihapus: dipakai di ${n} pertemuan RPS. Lepaskan dulu di RPS.`); return; } await remove('riset', o.id, `Hapus ${o.jenis} dosen: ${short(o.judul, 60)}`); rerender(); } : null });
  const ab = el.querySelector('#add'); if (ab) ab.onclick = () => {
    const pemilik = ctx.role === 'dosen' ? ctx.dosen : (fDosen || (dsn[0] && dsn[0].id) || '');
    if (!pemilik) { toast('Pilih dosen terlebih dahulu.'); return; }
    form({ id: undefined, dosen: pemilik, jenis: 'Penelitian' });
  };
  el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => form({ ...S.riset.find(e => e.id === b.dataset.ed) }));
  const tp = el.querySelector('#tpl'); if (tp) tp.onclick = async () => {
    const X = await loadXLSX(), wb = X.utils.book_new();
    const contoh = [namaDosen(ctx.role === 'dosen' ? ctx.dosen : (dsn[0] || {}).id) || 'Nama Dosen', 'Penelitian', 'Contoh judul penelitian (hapus baris ini)', 'Penelitian Terapan', 2026, '', '', ''];
    const ws = X.utils.aoa_to_sheet([HEAD, contoh]); ws['!cols'] = [30, 18, 60, 22, 8, 22, 30, 50].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'RISET');
    unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), 'Template_Penelitian_PKM_Dosen.xlsx');
  };
  const im = el.querySelector('#imp'), fi = el.querySelector('#file');
  if (im) { im.onclick = () => { fi.value = ''; fi.click(); };
    fi.onchange = async () => { const f = fi.files[0]; if (!f) return; try { pesan = `<div class="ribbon info">${await imporExcel(f)}</div>`; } catch (e) { console.error(e); pesan = `<div class="ribbon bad">Impor gagal. ${esc(e.message)}</div>`; } rerender(); }; }
}

/** Impor Excel: tiap baris dirapikan otomatis, dedup per dosen dan judul, dosen dicocokkan lewat nama. */
async function imporExcel(file) {
  const X = await loadXLSX(), wb = X.read(await file.arrayBuffer(), { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]];
  const rows = X.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  const hi = rows.findIndex(r => r.some(c => /^judul/i.test(String(c).trim())));
  if (hi < 0) throw new Error('Kolom Judul tidak ditemukan. Pakai templat dari tombol Templat Excel.');
  const h = rows[hi].map(c => String(c).toLowerCase());
  const kol = (re) => h.findIndex(x => re.test(x));
  const c = { d: kol(/nama dosen|dosen/), j: kol(/jenis/), t: kol(/^judul/), s: kol(/skema/), y: kol(/tahun/), m: kol(/mitra/), k: kol(/kata kunci/), r: kol(/ringkas/) };
  const masuk = [], lewat = [], baru = [], adaKey = new Set((S.riset || []).map(e => e.dosen + '|' + normRiset(e.judul)));
  let diKoreksi = 0;
  rows.slice(hi + 1).forEach((r, i) => {
    const judul0 = String(r[c.t] || '').trim(); if (!judul0 || /hapus baris ini/i.test(judul0)) return;
    let dosen = ctx.role === 'dosen' ? ctx.dosen : '';
    if (ctx.role !== 'dosen') { const nm = normRiset(r[c.d]); const d = nm ? S.dosen.find(x => normRiset(x.nama) === nm) : null; if (!d) { lewat.push(`baris ${hi + i + 2}: dosen "${String(r[c.d] || '').trim() || '(kosong)'}" tidak ditemukan`); return; } if (!can('riset', { dosen: d.id })) { lewat.push(`baris ${hi + i + 2}: tidak berwenang atas dosen ${d.nama}`); return; } dosen = d.id; }
    const mentah = { dosen, jenis: r[c.j], judul: judul0, skema: r[c.s], tahun: r[c.y], mitra: r[c.m], kata: c.k >= 0 ? r[c.k] : '', ringkas: c.r >= 0 ? r[c.r] : '' };
    const e = rapikanEntri(mentah); if (e.judul !== judul0) diKoreksi++;
    const key = dosen + '|' + normRiset(e.judul); if (adaKey.has(key)) { lewat.push(`baris ${hi + i + 2}: judul sudah ada, dilewati`); return; }
    adaKey.add(key); baru.push({ ...e, id: uid('RS') + masuk.length });
    masuk.push(e);
  });
  if (baru.length) await saveMany('riset', baru, `Impor ${baru.length} penelitian dan PKM dosen dari Excel`);
  return `<b>${baru.length} entri ditambahkan.</b>${diKoreksi ? ` ${diKoreksi} judul dirapikan otomatis (spasi, huruf kapital).` : ''}${lewat.length ? `<br>${lewat.length} baris dilewati: ${esc(lewat.slice(0, 6).join('; '))}${lewat.length > 6 ? '; …' : ''}` : ''}`;
}
