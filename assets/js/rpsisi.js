/* KUREKAM · Pemisah dan penggabung isian RPS.
   Isian RPS tetap disimpan sebagai teks (agar RPS, SAP, dan ACP Word tidak berubah), tetapi diedit per kotak.
   Fungsi pecah* mengubah teks menjadi daftar, fungsi gabung* mengubah daftar kembali menjadi teks. */

const bersih = (x) => String(x == null ? '' : x).replace(/\*\*/g, '');

/* ---------- Bahan kajian (MK): "1. A; 2. B" ---------- */
export function pecahBahan(str) {
  const s = bersih(str).trim(); if (!s) return [];
  let bagian = s.split(/\s*;\s*(?=\d+\s*[.)]\s)/);
  if (bagian.length === 1) bagian = s.split(/\n+/);
  return bagian.map(x => x.trim().replace(/^\d+\s*[.)]\s*/, '').replace(/[;\s]+$/, '')).filter(Boolean).map(t => ({ t, sub: [] }));
}
export const gabungBahan = (daftar) => daftar.map((b, i) => `${i + 1}. ${b.t}`).join('; ');

/* ---------- Pustaka: utama "(1) ..." dan pendukung "(S1) ..." ---------- */
export function pecahPustaka(...teks) {
  const utama = [], pend = [];
  let cur = utama, akhir = null;
  teks.forEach((t, ti) => {
    if (ti === 1) { cur = pend; akhir = null; }
    bersih(t).split(/\n/).forEach(raw => {
      const b = raw.trim(); if (!b) return;
      const h = b.match(/^(utama|pendukung)\s*:?\s*$/i);
      if (h) { cur = /pend/i.test(h[1]) ? pend : utama; akhir = null; return; }
      const n = b.match(/^\(?\s*(S?\d+)\s*[).]\s*(.+)$/i);
      if (n) { const tujuan = /^s/i.test(n[1]) ? pend : cur; tujuan.push(n[2].trim()); akhir = { arr: tujuan, i: tujuan.length - 1 }; return; }
      if (akhir) { akhir.arr[akhir.i] += ' ' + b; return; }
      cur.push(b); akhir = { arr: cur, i: cur.length - 1 };
    });
  });
  return { utama, pend };
}
export const gabungUtama = (d) => d.map((t, i) => `(${i + 1}) ${t}`).join('\n');
export const gabungPend = (d) => d.map((t, i) => `(S${i + 1}) ${t}`).join('\n');
/** Pilihan pustaka untuk pertemuan: nomor "1", "S1" beserta kutipan singkat. */
export function opsiPustaka(r) {
  const { utama, pend } = pecahPustaka(r.pustaka, r.pustakaPendukung);
  const kut = (t) => { const s = String(t).replace(/\s+/g, ' '); return s.length > 90 ? s.slice(0, 89) + '…' : s; };
  return [...utama.map((t, i) => ({ v: String(i + 1), t: `(${i + 1}) ${kut(t)}` })), ...pend.map((t, i) => ({ v: 'S' + (i + 1), t: `(S${i + 1}) ${kut(t)}` }))];
}

/* ---------- Materi pertemuan dengan baris "Pustaka: (1) Bab 1, (3) Bab 1" ---------- */
export function pecahMateri(materi) {
  const t = String(materi == null ? '' : materi), pus = [];
  const baris = t.split('\n'), sisa = [];
  baris.forEach(b => {
    const m = bersih(b).match(/^\s*pustaka\s*:\s*(.+)$/i);
    if (!m) { sisa.push(b); return; }
    const bagian = /\(/.test(m[1]) ? m[1].split(/\s*[;,]\s*(?=\()/) : m[1].split(/\s*;\s*/);
    bagian.forEach(x => { const q = x.trim().match(/^\(?\s*(S?\d+)\s*\)?\s*[,:\-]?\s*(.*)$/i); if (q) pus.push({ n: q[1].toUpperCase(), bab: q[2].trim() }); });
  });
  return { isi: sisa.join('\n').replace(/\s+$/, ''), pus };
}
export const gabungMateri = (isi, pus) => String(isi || '').trim() + (pus.length ? `${String(isi || '').trim() ? '\n' : ''}Pustaka: ${pus.map(x => `(${x.n})${x.bab ? ' ' + x.bab : ''}`).join(', ')}` : '');

/* ---------- Daftar satu baris satu butir ---------- */
export const pecahBaris = (s) => bersih(s).split(/\n+/).map(x => x.trim()).filter(Boolean);
export const pecahIndikator = (s) => pecahBaris(s).map(x => x.replace(/^\d+(\.\d+)*[.)]?\s+/, ''));
export const pecahMetode = (s) => bersih(s).split(/[;\n]+/).map(x => x.trim()).filter(Boolean);

export const METODE_DEF = ['Kuliah Offline', 'Kuliah Daring (teleconference)', 'Praktikum', 'Contextual Learning', 'Collaborative Learning', 'Case-Based Learning', 'Project-Based Learning', 'Problem-Based Learning', 'Diskusi kelompok', 'Studi kasus', 'Demonstrasi', 'Tanya jawab'];
export const DARING_DEF = ['Bentuk: Kuliah Tatap Maya (teleconference)', 'https://akamigas.siakadcloud.com/', 'Metode: Contextual Learning, Collaborative Learning'];
export const tatapDef = (menit) => ['Bentuk: Kuliah Offline', 'Metode: Contextual Learning, Collaborative Learning', `Alokasi waktu: TM ${menit} menit`, 'Penugasan: Tugas terstruktur dan mandiri sesuai materi'];

/** Jam belajar 1 semester: 45 jam per SKS (2700 menit). Sisa setelah tatap muka 16 pertemuan dibagi dua. */
export function jamDefault(m, menitPerPertemuan) {
  const sks = (+m.T || 0) + (+m.P || 0), tm = 16 * menitPerPertemuan, target = sks * 2700, sisa = Math.max(0, target - tm);
  const st = Math.round(sisa / 2 / 10) * 10;
  return { sks, tm, target, terstruktur: st, mandiri: Math.max(0, Math.round((sisa - st) / 10) * 10) };
}

/** Mata kuliah syarat yang dikenali dari teks lama (nama MK). */
export function kenaliSyarat(teks, daftar) {
  const n = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const t = ' ' + n(teks) + ' ';
  return daftar.filter(x => n(x.nama).length > 3 && t.includes(' ' + n(x.nama) + ' ')).map(x => x.id);
}
