/* KUREKAM · Komponen tampilan bersama */
import { esc, openDrawer, closeDrawer, icon, ctx, S, toast } from '../app.js';
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
export function formDrawer({ title, sub = '', fields, obj = {}, onSave, onDelete, wide, extra = '' }) {
  const f = fields.map(x => {
    const v = obj[x.k];
    let inp;
    if (x.type === 'textarea') inp = `<textarea class="inp" name="${x.k}" rows="${x.rows || 3}" placeholder="${esc(x.ph || '')}">${esc(v || '')}</textarea>`;
    else if (x.type === 'select') inp = `<select class="inp" name="${x.k}">${x.opts.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(v) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
    else if (x.type === 'multi') {
      const sel = new Set(v || []);
      inp = `<div class="chips-pick" data-multi="${x.k}">${x.opts.length ? x.opts.map(o => `<label class="cp ${sel.has(o.v) ? 'on' : ''}" title="${esc(o.title || o.t)}"><input type="checkbox" value="${esc(o.v)}" ${sel.has(o.v) ? 'checked' : ''}>${esc(o.t)}</label>`).join('') : '<span class="muted small">Belum ada pilihan.</span>'}</div>`;
    } else inp = `<input class="inp" name="${x.k}" type="${x.type || 'text'}" value="${esc(v == null ? '' : v)}" ${x.step ? `step="${x.step}"` : ''} placeholder="${esc(x.ph || '')}">`;
    return `<div class="field ${x.full || x.type === 'textarea' || x.type === 'multi' ? 'full' : ''}"><label>${x.label}</label>${inp}${x.help ? `<div class="hint" data-help="${x.k}">${x.help}</div>` : `<div class="hint" data-help="${x.k}"></div>`}</div>`;
  }).join('');
  openDrawer(`<div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('edit')}</span><div><h3>${title}</h3><div class="sub">${sub}</div></div><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <form class="form-grid" id="fd">${f}</form>${extra}
    <div class="drawer-act">${onDelete ? `<button class="btn danger" id="fd-del">${icon('trash')} Hapus</button>` : ''}<div class="sp"></div><button class="btn ghost" data-close>Batal</button><button class="btn pri" id="fd-save">${icon('check')} Simpan</button></div>`, (dr) => {
    dr.querySelectorAll('.cp input').forEach(i => i.onchange = () => i.parentElement.classList.toggle('on', i.checked));
    dr.querySelector('#fd-save').onclick = async () => {
      const out = { ...obj };
      fields.forEach(x => {
        if (x.type === 'multi') out[x.k] = Array.from(dr.querySelectorAll(`[data-multi="${x.k}"] input:checked`)).map(i => i.value);
        else { const el = dr.querySelector(`[name="${x.k}"]`); out[x.k] = x.type === 'number' ? (el.value === '' ? null : +el.value) : el.value.trim(); }
      });
      const err = await onSave(out);
      if (err) { const h = dr.querySelector('.drawer-act'); h.insertAdjacentHTML('beforebegin', `<div class="ribbon bad">${esc(err)}</div>`); return; }
      closeDrawer();
    };
    const del = dr.querySelector('#fd-del'); if (del) del.onclick = async () => { if (!(await tanya('Hapus data ini?', 'Hapus'))) return; await onDelete(obj); closeDrawer(); };
    fields.filter(x => x.live).forEach(x => { const el = dr.querySelector(`[name="${x.k}"]`); const h = dr.querySelector(`[data-help="${x.k}"]`); const up = () => { h.innerHTML = x.live(el.value); }; el.addEventListener('input', up); up(); });
  }, wide);
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
