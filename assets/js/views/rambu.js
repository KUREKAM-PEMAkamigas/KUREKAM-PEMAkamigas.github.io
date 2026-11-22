/* KUREKAM · Rambu pengisian: aturan penempatan semester, level Bloom, isian RPS, dan alur verifikasi. */
import { esc, icon } from '../app.js';
import { ANJURAN_SMT, BATAS_CPL_SMT, KKO, KABUR, LEVELS } from '../bloom.js';
import { head } from './ui.js';

const rentang = (s) => { const r = ANJURAN_SMT[s]; return r ? `C${r[0]}–C${r[1]}` : '–'; };
const batas = (d, s) => { const m = (BATAS_CPL_SMT[d] || {})[s]; return m ? `${d}${m}` : 'tanpa batas'; };
const kko = (n) => (KKO['C' + n] || []).filter(x => !KABUR.includes(x)).slice(0, 4).join(', ');

export default function rambuView(el) {
  el.innerHTML = `
  <div class="card">${head('Rambu pengisian kurikulum dan RPS', 'Supaya pemetaan semester dan tingkat Taksonomi Bloom benar sejak awal', 'audit', '#f5a524')}
    <p>Aplikasi memeriksa setiap isian terhadap rambu di bawah. Rambu dipasang agar mata kuliah semester awal tidak memikul CPL tingkat tinggi dan rumusan CPMK naik bertahap dari semester ke semester. <b>Pengecualian boleh</b>, tetapi harus diberi alasan tertulis oleh prodi.</p>
    <div class="grid g3" style="gap:12px;margin-top:10px">
      <div class="pg-box"><h4>1. CPL pada mata kuliah</h4><p class="small">CPL tingkat tinggi tidak dapat dibebankan pada mata kuliah semester awal. Pilihannya otomatis tidak aktif di formulir Mata Kuliah dan SKS menurut semester yang dipilih.</p></div>
      <div class="pg-box"><h4>2. CPMK dan Sub-CPMK</h4><p class="small">Level CPMK harus berada dalam rentang semesternya dan tidak melampaui CPL yang ditopang. Sub-CPMK tidak melampaui CPMK induknya. Level dan kata kerja disarankan langsung di formulir.</p></div>
      <div class="pg-box"><h4>3. Alasan tertulis</h4><p class="small">Selisih 2 level atau lebih dari rentang semester, atau CPL di atas batas semester, memerlukan alasan (sedikitnya 10 huruf). Tanpa alasan, mata kuliah tidak dapat disimpan dan RPS tidak dapat diajukan atau disahkan.</p></div>
    </div></div>

  <div class="card" style="margin-top:18px">${head('Batas level menurut semester', 'Rentang level CPMK yang dianjurkan dan level CPL tertinggi yang boleh dibebankan', 'sim', '#8b5cf6')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Semester</th><th>Rentang level CPMK (kognitif)</th><th>CPL kognitif tertinggi yang boleh dibebankan</th><th>CPL psikomotor tertinggi</th></tr></thead><tbody>
    ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `<tr><td class="num"><b>${s}</b></td><td>${rentang(s)}</td><td>${batas('C', s)}</td><td>${batas('P', s)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="small muted" style="margin-top:8px">CPL ranah sikap tidak dibatasi. Mata kuliah magang dan tugas akhir serta mata kuliah bersama yang dikunci tidak diperiksa dengan rambu CPL.</p></div>

  <div class="card" style="margin-top:18px">${head('Kata kerja operasional per level', 'Awali rumusan dengan kata kerja yang terukur. Kata seperti memahami atau mengetahui kurang terukur.', 'spark', '#0ea5e9')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Level</th><th>Nama</th><th>Contoh kata kerja</th></tr></thead><tbody>
    ${[1, 2, 3, 4, 5, 6].map(n => `<tr><td><b>C${n}</b></td><td>${esc(LEVELS['C' + n].nama)}</td><td class="small">${esc(kko(n))}</td></tr>`).join('')}
    </tbody></table></div></div>

  <div class="card" style="margin-top:18px">${head('Aturan isian RPS', 'Sama dengan Pedoman Kurikulum Edisi 2027, bagian 11.19', 'book', '#10b981')}
    <ul>
      <li>Jam, SKS, dan CPL yang dibebankan mengikuti data prodi; dosen tidak mengubahnya.</li>
      <li>CPMK hanya memilih CPL yang dibebankan pada mata kuliah itu.</li>
      <li>Setiap Sub-CPMK berasal dari tepat satu CPMK, dan bobot Sub-CPMK berjumlah 100.</li>
      <li>Setiap Sub-CPMK memiliki paling sedikit 3 indikator, bernomor pertemuan.urutan (3.1, 3.2, 3.3).</li>
      <li>RPS tepat 16 pertemuan, termasuk UTS dan UAS.</li>
      <li>Kode CPL pada RPS ditulis singkat, misalnya CPL04-P03.</li>
    </ul></div>

  <div class="card" style="margin-top:18px">${head('Alur verifikasi dan catatan', 'Siapa memeriksa apa, dan ke mana catatan pergi', 'check', '#14b8a6')}
    <ol>
      <li><b>Dosen</b> mengisi RPS lalu menekan Ajukan ke kaprodi.</li>
      <li><b>SPM</b>, <b>Kasubbag Akademik</b>, dan <b>kaprodi</b> dapat memberi catatan pada RPS: <i>Perlu perbaikan</i> atau <i>Terverifikasi</i>. Catatan perbaikan wajib menyebut bagian yang harus diperbaiki.</li>
      <li><b>Kaprodi</b> mengesahkan RPS, atau mengembalikannya ke dosen dengan alasan tertulis.</li>
      <li>Dosen melihat catatan di RPS dan di daftar <b>Perlu tindakan saya</b> pada Beranda, memperbaiki, lalu mengajukan lagi. Pemberi catatan lalu diminta memeriksa ulang.</li>
    </ol>
    <p class="small muted">Rambu ini bertujuan memandu pengisian, bukan menghukum. Target sampai 23 Desember 2026 adalah progres, bukan kurikulum 100 persen.</p></div>`;
}
