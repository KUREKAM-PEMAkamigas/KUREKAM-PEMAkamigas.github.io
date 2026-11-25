/* KUREKAM · Penyusun rumusan CPMK dan Sub-CPMK.
   Dosen atau prodi memilih tingkat Bloom dan kata kerja operasional, lalu aplikasi membuat narasi awal
   dari rumusan induknya (CPL untuk CPMK, CPMK untuk Sub-CPMK) dan bahan kajian atau topik mata kuliah.
   Narasi hanya usulan: selalu bisa disunting. */
import { esc } from './app.js';
import { LEVELS, KKO, KABUR, ANJURAN_SMT, detect, objekDari } from './bloom.js';

const kodeLevel = (ranah, prak) => ranah === 'S' ? ['A1', 'A2', 'A3', 'A4', 'A5'] : prak ? ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'P1', 'P2', 'P3', 'P4', 'P5'] : ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

/** opsi: { jenis: 'cpmk' | 'sub', ranah, prak, smt, basis: () => teks induk, topik: [teks], konteks: [bahan kajian], batas: level induk (kode) | null, ph } */
export function penyusun(opsi) {
  const kode = kodeLevel(opsi.ranah, opsi.prak), anj = ANJURAN_SMT[+opsi.smt];
  const batasN = opsi.batas && LEVELS[opsi.batas] ? LEVELS[opsi.batas].n : 9, batasD = opsi.batas && LEVELS[opsi.batas] ? LEVELS[opsi.batas].d : '';
  const lvTombol = kode.map(k => { const L = LEVELS[k], blk = batasD && L.d === batasD && L.n > batasN, bintang = anj && L.d === 'C' && L.n >= anj[0] && L.n <= anj[1]; return `<label class="cp ${blk ? 'blk' : ''}" data-lv="${k}" title="${esc(L.en)}${bintang ? ' · dianjurkan untuk semester ' + opsi.smt : ''}${blk ? ' · melampaui induknya' : ''}"><input type="checkbox" ${blk ? 'disabled' : ''}>${k} ${esc(L.nama)}${bintang ? ' ★' : ''}</label>`; }).join('');
  const html = `<div class="rmsn"><div class="small muted" style="margin-bottom:6px">Pilih tingkat Bloom dan kata kerja, lalu klik <b>Buat narasi awal</b>. Narasi dibuat dari ${opsi.jenis === 'sub' ? 'CPMK induk dan topik' : 'CPL dan bahan kajian'}, lalu Bapak/Ibu sunting.</div>
    <div class="rmsn-b"><b>1. Tingkat Bloom</b>${anj ? `<span class="small muted"> · ★ dianjurkan semester ${opsi.smt}: C${anj[0]} sampai C${anj[1]}</span>` : ''}<div class="chips-pick" id="rm-lv">${lvTombol}</div></div>
    <div class="rmsn-b"><b>2. Kata kerja operasional</b><div class="chips-pick" id="rm-kko"><span class="muted small">Pilih tingkat Bloom dulu.</span></div></div>
    ${opsi.jenis === 'sub' ? `<div class="rmsn-b"><b>3. Topik atau bahan kajian</b><input class="inp" id="rm-topik" list="rm-topik-l" placeholder="Pilih dari daftar atau tulis sendiri" style="width:100%"><datalist id="rm-topik-l">${(opsi.topik || []).map(t => `<option value="${esc(t)}">`).join('')}</datalist></div>` : ''}
    <button type="button" class="btn sm vio" id="rm-buat">Buat narasi awal</button> <span class="small muted" id="rm-ket"></span></div>`;
  const pasang = (dr) => {
    let lv = '', kk = '';
    const ta = dr.querySelector('textarea[name="teks"]'), kko = dr.querySelector('#rm-kko'), ket = dr.querySelector('#rm-ket');
    const pilihLv = (k) => {
      lv = k; kk = '';
      dr.querySelectorAll('#rm-lv .cp').forEach(c => c.classList.toggle('on', c.dataset.lv === k));
      const daftar = (KKO[k] || []).filter(v => !KABUR.includes(v)).slice(0, 10);
      kko.innerHTML = daftar.map(v => `<label class="cp" data-v="${esc(v)}"><input type="checkbox">${esc(v)}</label>`).join('');
      kko.querySelectorAll('.cp').forEach(c => { c.onclick = (e) => { e.preventDefault(); kk = c.dataset.v; kko.querySelectorAll('.cp').forEach(x => x.classList.toggle('on', x === c)); }; });
      const first = kko.querySelector('.cp'); if (first) { first.classList.add('on'); kk = first.dataset.v; }
    };
    dr.querySelectorAll('#rm-lv .cp').forEach(c => { c.onclick = (e) => { e.preventDefault(); if (c.classList.contains('blk')) return; pilihLv(c.dataset.lv); }; });
    const awal = detect(ta.value, opsi.prak ? 'P' : 'C') || null;
    pilihLv(awal && kode.includes(awal.code) ? awal.code : (opsi.batas && kode.includes(opsi.batas) ? opsi.batas : (anj && opsi.jenis === 'cpmk' ? 'C' + anj[0] : kode[Math.min(2, kode.length - 1)])));
    dr.querySelector('#rm-buat').onclick = () => {
      if (!lv || !kk) { ket.textContent = 'Pilih tingkat Bloom dan kata kerja dulu.'; return; }
      const basis = String(opsi.basis() || '').trim(); let objek = '';
      if (opsi.jenis === 'sub') { const tp = (dr.querySelector('#rm-topik').value || '').trim(); objek = tp ? tp.charAt(0).toLowerCase() + tp.slice(1) : objekDari(basis); if (tp && basis) { const o = objekDari(basis); if (o && o.length <= 110) objek += ` untuk mendukung ${o}`; } }
      else { objek = objekDari(basis); const bk = (opsi.konteks || []).slice(0, 2); if (bk.length) objek += ` pada bahan kajian ${bk.join(' dan ')}`; }
      if (!objek) { ket.textContent = opsi.jenis === 'sub' ? 'Isi topik atau pastikan CPMK induk sudah ada.' : 'Isi rumusan CPL dulu.'; return; }
      ta.value = `Mahasiswa mampu ${kk} ${objek}.`;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ket.textContent = `Narasi awal dibuat (${lv} ${LEVELS[lv].nama}). Sunting agar sesuai materi.`;
      ta.focus();
    };
  };
  return { field: { k: '_penyusun', type: 'html', label: 'Penyusun rumusan', html }, pasang };
}
