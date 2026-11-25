/* KUREKAM · Komponen tampilan bersama */
import { esc, openDrawer, closeDrawer, icon, ctx, S, toast, rerender } from '../app.js';
import { fmt } from '../rules.js';

export const kpi = (lbl, val, meta, c = '#10b981', ic = 'spark', dec = 0) =>
  `<div class="card kpi tilt" style="--c:${c}"><div class="lbl"><span class="ico-badge" style="--c:${c};width:28px;height:28px">${icon(ic)}</span>${lbl}</div><div class="val" data-count="${val}" data-dec="${dec}">${typeof val === 'number' ? fmt(val, dec) : val}</div><div class="meta">${meta || ''}</div></div>`;

export const bar = (v, c = '#10b981', w) => `<div class="bar" ${w ? `style="width:${w}"` : ''}><i style="width:${Math.max(0, Math.min(100, v))}%;--c:${c}"></i></div>`;
export const pctColor = (v) => v >= 85 ? '#10b981' : v >= 60 ? '#f5a524' : '#f0616d';
export const stTag = (k, t) => `<span class="st ${k}">${t}</span>`;
export const STATUS = {
  draf: ['na', 'Draf'], diajukan: ['near', 'Diajukan'], disahkan: ['ok', 'Disahkan'],
  menunggu: ['near', 'Menunggu'], disetujui: ['ok', 'Disetujui'], ditolak: ['bad', 'Ditolak']
};
export const statusTag = (s) => stTag(...(STATUS[s] || ['na', s || 'Belum ada']));
export const kTag = (k) => stTag(k, k === 'ok' ? 'Sesuai' : k === 'near' ? 'Perlu perhatian' : 'Belum sesuai');
export const prodiTag = (pid) => { const p = S.prodi.find(x => x.id === pid); return `<span class="tag" style="--c:${(p && p.c) || '#64748b'}">${pid}</span>`; };
export const head = (title, sub, ic = 'spark', c = '#0ea5e9', right = '') =>
  `<div class="card-h"><span class="ico-badge" style="--c:${c}">${icon(ic)}</span><div><h3>${title}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="sp"></div>${right}</div>`;
export const ro = () => `<span class="tag" style="--c:#64748b">${icon('eye')} Hanya baca untuk peran ini</span>`;
export const prodiName = () => { const p = S.prodi.find(x => x.id === ctx.prodi); return p ? p.nama : ctx.prodi; };

/** Drawer formulir generik.
 *  fields: [{k, label, type: text|textarea|number|select|multi, opts:[{v,t}], help, full, step}] */
const DAFTAR = ['list', 'listsub', 'listpus'];
/** Satu baris isian pada daftar kotak (list, listsub, listpus). */
function barisDaftar(x, it, i) {
  const no = x.nomor === false ? '' : `<span class="lno">${esc(x.nomor ? x.nomor(i) : (i + 1) + '.')}</span>`;
  const hapus = `<button type="button" class="btn ghost sm ld" title="Hapus baris" aria-label="Hapus baris">${icon('close')}</button>`;
  if (x.type === 'listpus') {
    const v = (it && it.n) || '';
    return `<div class="lrow">${no}<select class="inp lp"><option value="">Pilih pustaka…</option>${(x.opts || []).map(o => `<option value="${esc(o.v)}" ${o.v === v ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select><input class="inp lb" placeholder="Bab atau halaman, misalnya Bab 3" value="${esc((it && it.bab) || '')}">${hapus}</div>`;
  }
  const teks = typeof it === 'string' ? it : (it && it.t) || '', pilih = new Set((it && typeof it === 'object' && Array.isArray(it.sub)) ? it.sub : []);
  const chips = x.type === 'listsub' ? `<div class="chips-pick lsub" title="Sub-CPMK yang dicakup butir ini">${(x.sub || []).length ? x.sub.map(o => `<label class="cp ${pilih.has(o.v) ? 'on' : ''}" data-v="${esc(o.v)}" title="${esc(o.title || o.t)}"><input type="checkbox" value="${esc(o.v)}" ${pilih.has(o.v) ? 'checked' : ''}>${esc(o.t)}</label>`).join('') : '<span class="muted small">Belum ada Sub-CPMK untuk dipetakan.</span>'}</div>` : '';
  return `<div class="lrow">${no}<div class="lcol"><textarea class="inp lt" rows="1" placeholder="${esc(x.ph || '')}">${esc(teks)}</textarea>${chips}</div>${hapus}</div>`;
}
export function formDrawer({ title, sub = '', fields, obj = {}, onSave, onDelete, wide, full, extra = '', onOpen }) {
  const f = fields.map(x => {
    const v = obj[x.k];
    /* isian satu baris yang ternyata berisi baris baru dibuka sebagai kotak teks agar baris tidak menyatu */
    if (!x.type && typeof v === 'string' && v.includes('\n')) x = { ...x, type: 'textarea', rows: Math.min(6, v.split('\n').length + 1) };
    let inp;
    if (x.type === 'html') inp = x.html;
    else if (DAFTAR.includes(x.type)) {
      const arr = Array.isArray(v) ? v : [];
      inp = `<div class="lbox" data-list="${x.k}"><div class="lrows">${arr.map((it, i) => barisDaftar(x, it, i)).join('')}</div><div class="lact"><button type="button" class="btn sm pri" data-ladd>${icon('plus')} ${esc(x.tambah || 'Tambah isian')}</button>${(x.paket || []).length ? `<button type="button" class="btn sm vio" data-paket>${icon('spark')} ${esc(x.paketLabel || 'Isi baris standar')}</button>` : ''}${(x.quick || []).length ? `<span class="muted small">atau pilih cepat:</span>${x.quick.map(q => `<button type="button" class="cp" data-q="${esc(q)}">+ ${esc(q.length > 48 ? q.slice(0, 47) + '…' : q)}</button>`).join('')}` : ''}</div></div>`;
    } else if (x.type === 'kode') inp = `<div class="kode-lock" data-kode="${x.k}"><span class="tag" style="--c:#0ea5e9">${esc(v || x.ph || '–')}</span><span class="small muted">dibuat otomatis sesuai pedoman, tidak diketik</span></div>`;
    else if (x.type === 'textarea') inp = `<textarea class="inp" name="${x.k}" rows="${x.rows || 3}" placeholder="${esc(x.ph || '')}">${esc(v || '')}</textarea>`;
    else if (x.type === 'select') inp = `<select class="inp" name="${x.k}" ${x.lock ? 'disabled' : ''}>${x.opts.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(v) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
    else if (x.type === 'multi') {
      const sel = new Set(v || []);
      inp = `<div class="chips-pick" data-multi="${x.k}">${x.opts.length ? x.opts.map(o => `<label class="cp ${sel.has(o.v) ? 'on' : ''} ${o.dim ? 'dim' : ''}" data-v="${esc(o.v)}" title="${esc(o.title || o.t)}"><input type="checkbox" value="${esc(o.v)}" ${sel.has(o.v) ? 'checked' : ''}>${esc(o.t)}</label>`).join('') : '<span class="muted small">Belum ada pilihan.</span>'}</div>${x.info ? `<div class="subinfo" data-info="${x.k}"></div>` : ''}`;
    } else inp = `<input class="inp" name="${x.k}" type="${x.type || 'text'}" value="${esc(v == null ? '' : v)}" ${x.step ? `step="${x.step}"` : ''} placeholder="${esc(x.ph || '')}">`;
    return `<div class="field ${x.full || x.type === 'textarea' || x.type === 'multi' || x.type === 'html' || DAFTAR.includes(x.type) ? 'full' : ''}"><label>${x.label || ''}</label>${inp}${x.help ? `<div class="hint" data-help="${x.k}">${x.help}</div>` : `<div class="hint" data-help="${x.k}"></div>`}</div>`;
  }).join('');
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('edit')}</span><div><h3>${title}</h3><div class="sub">${sub}</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <form class="form-grid" id="fd">${f}</form>${extra}
    <div class="drawer-act">${onDelete ? `<button class="btn danger" id="fd-del">${icon('trash')} Hapus</button>` : ''}<div class="sp"></div><button class="btn ghost" data-close>Batal</button><button class="btn pri" id="fd-save">${icon('check')} Simpan</button></div>`, (dr) => {
    dr.querySelectorAll('.cp input').forEach(i => i.onchange = () => i.parentElement.classList.toggle('on', i.checked));
    const sibuk = (b, on, teks) => { dr.querySelectorAll('.drawer-act .btn').forEach(x => { x.disabled = on; }); if (b) { if (on) { b.dataset.t = b.innerHTML; b.innerHTML = '<span class="spin"></span> ' + teks; } else if (b.dataset.t) b.innerHTML = b.dataset.t; } };
    const galat = (m) => { dr.querySelectorAll('.ribbon.bad').forEach(x => x.remove()); dr.querySelector('.drawer-act').insertAdjacentHTML('beforebegin', `<div class="ribbon bad">${esc(m)}</div>`); };
    const ambil = () => {
      const out = { ...obj };
      fields.forEach(x => {
        if (x.type === 'kode' || x.type === 'html') return;
        if (DAFTAR.includes(x.type)) {
          const baris = Array.from(dr.querySelectorAll(`[data-list="${x.k}"] .lrow`));
          out[x.k] = baris.map(r => x.type === 'listpus' ? { n: r.querySelector('.lp').value, bab: r.querySelector('.lb').value.trim() } : x.type === 'listsub' ? { t: r.querySelector('.lt').value.trim(), sub: Array.from(r.querySelectorAll('.cp input:checked')).map(i => i.value) } : r.querySelector('.lt').value.trim()).filter(b => x.type === 'listpus' ? b.n : x.type === 'listsub' ? b.t : b);
        } else if (x.type === 'multi') out[x.k] = Array.from(dr.querySelectorAll(`[data-multi="${x.k}"] input:checked`)).map(i => i.value);
        else { const el = dr.querySelector(`[name="${x.k}"]`); out[x.k] = x.type === 'number' ? (el.value === '' ? null : +el.value) : el.value.trim(); }
      });
      return out;
    };
    dr.querySelector('#fd-save').onclick = async () => {
      const btn = dr.querySelector('#fd-save'), out = ambil();
      sibuk(btn, true, 'Menyimpan…');
      let err; try { err = await onSave(out); } catch (e) { console.error(e); err = 'Gagal menyimpan: ' + e.message; }
      if (err) { sibuk(btn, false); galat(err); return; }
      closeDrawer(); rerender();
    };
    const del = dr.querySelector('#fd-del'); if (del) del.onclick = async () => {
      if (!(await tanya('Hapus data ini?', 'Hapus'))) return;
      sibuk(del, true, 'Menghapus…');
      try { await onDelete(obj); } catch (e) { console.error(e); sibuk(del, false); galat('Gagal menghapus: ' + e.message); return; }
      closeDrawer(); rerender();
    };
    /* layar lebar: perubahan ditandai, disimpan otomatis tiap 2 menit, dan penutupan selalu bertanya bila belum disimpan */
    if (full) {
      let kotor = false, jalan = false; const form = dr.querySelector('#fd'), st = document.createElement('span'); st.className = 'small muted'; st.id = 'fd-status'; dr.querySelector('.drawer-act .sp').before(st);
      const jam = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const tandai = () => { if (!kotor) { kotor = true; st.textContent = 'Ada perubahan belum disimpan'; } };
      form.addEventListener('input', tandai); form.addEventListener('change', tandai); form.addEventListener('click', e => { if (e.target.closest('button,.cp')) tandai(); });
      const otomatis = async () => {
        if (!kotor || jalan || !document.body.contains(dr)) return; jalan = true;
        const out = ambil(); st.textContent = 'Menyimpan otomatis…';
        try { const err = await onSave(out); if (err) st.textContent = 'Belum bisa simpan otomatis: ' + err; else { kotor = false; st.textContent = 'Tersimpan otomatis pukul ' + jam(); } } catch (e) { st.textContent = 'Simpan otomatis gagal, tekan Simpan'; }
        jalan = false;
      };
      const timer = setInterval(() => { if (!document.body.contains(dr)) clearInterval(timer); else otomatis(); }, 120000);
      dr.__flush = () => { if (kotor) otomatis(); };
      dr.__kotor = () => kotor;
      const xb = dr.querySelector('.card-h [data-close]'); if (xb) { xb.innerHTML = `${icon('close')} Tutup`; xb.classList.add('tutup-besar'); }
      dr.__tutup = async () => {
        if (!kotor) { closeDrawer(); return; }
        const j = await tanya3('Ada perubahan yang belum disimpan. Apa yang ingin dilakukan?', 'Simpan dan tutup', 'Buang perubahan', 'Kembali mengedit');
        if (j === 'ya') dr.querySelector('#fd-save').click(); else if (j === 'buang') closeDrawer();
      };
      dr.querySelectorAll('[data-close]').forEach(b => { b.onclick = dr.__tutup; });
    }
    /* daftar kotak: tambah, hapus, pilihan cepat, tinggi kotak mengikuti isi */
    dr.querySelectorAll('[data-list]').forEach(box => {
      const x = fields.find(f => f.k === box.dataset.list), rows = box.querySelector('.lrows');
      const auto = (t) => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
      const nomori = () => rows.querySelectorAll('.lrow').forEach((r, i) => { const n = r.querySelector('.lno'); if (n) n.textContent = x.nomor ? x.nomor(i) : (i + 1) + '.'; });
      const ikat = (r) => { r.querySelector('.ld').onclick = () => { r.remove(); nomori(); }; const t = r.querySelector('textarea'); if (t) { t.addEventListener('input', () => auto(t)); auto(t); } r.querySelectorAll('.cp input').forEach(i => { i.onchange = () => i.parentElement.classList.toggle('on', i.checked); }); };
      const tambah = (it) => { rows.insertAdjacentHTML('beforeend', barisDaftar(x, it, rows.children.length)); const r = rows.lastElementChild; ikat(r); nomori(); const f = r.querySelector('textarea,select'); if (f) f.focus(); };
      rows.querySelectorAll('.lrow').forEach(ikat);
      box.querySelector('[data-ladd]').onclick = () => tambah(x.type === 'listpus' ? {} : '');
      box.querySelectorAll('[data-q]').forEach(b => { b.onclick = () => tambah(b.dataset.q); });
      const pk = box.querySelector('[data-paket]'); if (pk) pk.onclick = () => (x.paket || []).forEach(t => tambah(t));
    });
    /* keterangan di bawah pilihan (misalnya isi Sub-CPMK yang dipilih) */
    fields.filter(x => x.info).forEach(x => { const el = dr.querySelector(`[data-info="${x.k}"]`), pil = () => Array.from(dr.querySelectorAll(`[data-multi="${x.k}"] input:checked`)).map(i => i.value); const up = () => { el.innerHTML = x.info(pil()); }; dr.querySelectorAll(`[data-multi="${x.k}"] input`).forEach(i => i.addEventListener('change', up)); up(); });
    fields.filter(x => x.live && x.type !== 'kode').forEach(x => { const el = dr.querySelector(`[name="${x.k}"]`); const h = dr.querySelector(`[data-help="${x.k}"]`); const up = () => { h.innerHTML = x.live(el.value); }; el.addEventListener('input', up); up(); });
    if (onOpen) onOpen(dr);
  }, full ? 'full' : wide);
}

/** Animasi angka KPI. */
export function animateCounts(root) {
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count); if (Number.isNaN(to)) return;
    const dec = +el.dataset.dec || 0, t0 = performance.now(), dur = 1200;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e, dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
export const opts = (arr, label = (x) => `${x.kode} · ${x.nama || x.teks || ''}`) => arr.map(x => ({ v: x.id, t: x.kode, title: label(x) }));
export const short = (s, n = 90) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/** Dialog konfirmasi sendiri (confirm() bawaan dapat diblokir di dalam bingkai). */
export function tanya(pesan, ya = 'Ya, lanjutkan') {
  return new Promise(res => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal card" role="alertdialog" aria-modal="true"><p>${esc(pesan)}</p><div class="drawer-act"><div class="sp"></div><button class="btn ghost" data-n>Batal</button><button class="btn pri" data-y>${esc(ya)}</button></div></div>`;
    const done = (v) => { bg.remove(); res(v); };
    bg.querySelector('[data-y]').onclick = () => done(true); bg.querySelector('[data-n]').onclick = () => done(false);
    bg.addEventListener('click', e => { if (e.target === bg) done(false); });
    document.body.appendChild(bg); bg.querySelector('[data-y]').focus();
  });
}
/** Dialog tiga pilihan: 'ya', 'buang', atau 'batal'. */
export function tanya3(pesan, ya, buang, batal) {
  return new Promise(res => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal card" role="alertdialog" aria-modal="true"><p>${esc(pesan)}</p><div class="drawer-act"><button class="btn danger" data-b>${esc(buang)}</button><div class="sp"></div><button class="btn ghost" data-n>${esc(batal)}</button><button class="btn pri" data-y>${esc(ya)}</button></div></div>`;
    const done = (v) => { bg.remove(); res(v); };
    bg.querySelector('[data-y]').onclick = () => done('ya'); bg.querySelector('[data-b]').onclick = () => done('buang'); bg.querySelector('[data-n]').onclick = () => done('batal');
    document.body.appendChild(bg); bg.querySelector('[data-y]').focus();
  });
}
/** Dialog pratinjau berisi HTML (sudah di-escape oleh pemanggil), dengan isi yang dapat digulir. */
export function pratinjau(judul, isiHtml, ya = 'Ya, lanjutkan') {
  return new Promise(res => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal card wide" role="dialog" aria-modal="true"><h3 style="margin:0 0 8px">${esc(judul)}</h3><div class="modal-isi">${isiHtml}</div><div class="drawer-act"><div class="sp"></div><button class="btn ghost" data-n>Batal</button><button class="btn pri" data-y>${esc(ya)}</button></div></div>`;
    const done = (v) => { bg.remove(); res(v); };
    bg.querySelector('[data-y]').onclick = () => done(true); bg.querySelector('[data-n]').onclick = () => done(false);
    bg.addEventListener('click', e => { if (e.target === bg) done(false); });
    document.body.appendChild(bg); bg.querySelector('[data-y]').focus();
  });
}
export const DALAM_BINGKAI = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
/** Unduh berkas dari Blob. */
export function unduh(blob, nama) {
  if (DALAM_BINGKAI) toast('Pratinjau ini tidak dapat mengunduh berkas. Unduhan berjalan pada versi yang dipasang di GitHub Pages.');
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
/** Muat SheetJS saat pertama kali diperlukan. */
let xlsxP = null;
export function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  const muat = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => window.XLSX ? res(window.XLSX) : rej(new Error('Pustaka Excel tidak terbaca')); s.onerror = () => rej(new Error('Gagal memuat pustaka Excel')); document.head.appendChild(s); });
  if (!xlsxP) xlsxP = muat('assets/vendor/xlsx.full.min.js').catch(() => muat('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')).catch(e => { xlsxP = null; throw e; });
  return xlsxP;
}
