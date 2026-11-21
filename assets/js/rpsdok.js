/* KUREKAM · Dokumen RPS berformat templat (FM-BPPAK): kepala, identitas, jam, otorisasi, CPL/CPMK/Sub-CPMK,
   korelasi, deskripsi, pustaka, rencana 16 pertemuan (8 kolom bernomor), dan SAP.
   Dipakai untuk pratinjau cetak dan unduhan Word oleh dosen, Prodi, SPM, Akademik, dan Wakil Direktur I. */
import { S } from './app.js';
import { APP } from './config.js';
import { labelKel } from './kode.js';
import { param, jpOf, durasi, fmt } from './rules.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ba = (s) => esc(s).replace(/\n/g, '<br>');
const kosong = '<span class="kos">......................</span>';

export const namaBerkasRps = (m) => `RPS_${m.kode}_${String(m.nama).replace(/[^A-Za-z0-9]+/g, '_')}.doc`;

const CATATAN_RPS = [
  'Capaian Pembelajaran Lulusan PRODI (CPL-PRODI) adalah kemampuan yang dimiliki oleh setiap lulusan PRODI yang merupakan internalisasi dari sikap, penguasaan pengetahuan dan keterampilan sesuai dengan jenjang prodinya yang diperoleh melalui proses pembelajaran.',
  'CPL yang dibebankan pada mata kuliah adalah beberapa capaian pembelajaran lulusan program studi (CPL-PRODI) yang digunakan untuk pembentukan atau pengembangan sebuah mata kuliah yang terdiri dari aspek sikap, keterampilan umum, keterampilan khusus dan pengetahuan.',
  'CP Mata Kuliah (CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPL yang dibebankan pada mata kuliah, dan bersifat spesifik terhadap bahan kajian atau materi pembelajaran mata kuliah tersebut.',
  'Sub-CP Mata Kuliah (Sub-CPMK) adalah kemampuan yang dijabarkan secara spesifik dari CPMK yang dapat diukur atau diamati dan merupakan kemampuan akhir yang direncanakan pada tiap tahap pembelajaran. Sub-CPMK dalam RPS ini ditulis dengan level kognitif Taksonomi Bloom yang sesuai (C4: Analisis, C5: Evaluasi atau Sintesis, C6: Mencipta).',
  'Indikator penilaian kemampuan dalam proses maupun hasil belajar mahasiswa adalah pernyataan spesifik dan terukur yang mengidentifikasi kemampuan atau kinerja hasil belajar mahasiswa yang disertai bukti-bukti.',
  'Kriteria Penilaian adalah patokan yang digunakan sebagai ukuran atau tolok ukur ketercapaian pembelajaran dalam penilaian berdasarkan indikator-indikator yang telah ditetapkan. Kriteria penilaian merupakan pedoman bagi penilai agar penilaian konsisten dan tidak bias. Kriteria dapat berupa kuantitatif ataupun kualitatif.',
  'Teknik penilaian: Tes tulis, Tes lisan, Observasi, Partisipasi, Laporan, dan Presentasi.',
  'Bentuk pembelajaran: Kuliah, Responsi, Tutorial, Seminar atau yang setara, Praktikum, Praktik Studio, Praktik Bengkel, Praktik Lapangan, Penelitian, Pengabdian Kepada Masyarakat dan/atau bentuk pembelajaran lain yang setara.',
  'Metode Pembelajaran: Small Group Discussion, Role-Play dan Simulation, Discovery Learning, Self-Directed Learning, Cooperative Learning, Collaborative Learning, Contextual Learning, Project-Based Learning, Case-Based Learning, dan metode lainnya yang setara.',
  'Materi Pembelajaran adalah rincian atau uraian dari bahan kajian yang dapat disajikan dalam bentuk beberapa pokok dan sub-pokok bahasan. Setiap pertemuan dalam RPS ini dilengkapi dengan konteks industri migas dan, bila relevan, referensi simulasi untuk memperkuat relevansi industri.',
  'Bobot penilaian adalah persentase penilaian terhadap setiap pencapaian Sub-CPMK yang besarnya proporsional dengan tingkat kesulitan pencapaian Sub-CPMK tersebut, dan totalnya 100%.',
  'TM = Tatap Muka; PT = Penugasan Terstruktur; BM = Belajar Mandiri; TB = Belajar Terbimbing.',
];
const CATATAN_DASAR = 'Catatan ini selaras dengan SN Dikti dalam Permendiktisaintek Nomor 39 Tahun 2025 serta perubahannya dalam Permendiktisaintek Nomor 10 Tahun 2026. Kerangka penurunan CPL ke CPMK dan Sub-CPMK pada kurikulum berbasis capaian (OBE) tetap sama; terdapat penyesuaian pada cakupan kompetensi CPL (Pasal 7), ragam bentuk pembelajaran (Pasal 16), serta penegasan penilaian formatif dan sumatif (Pasal 27).';

/** Isi dokumen RPS sebagai HTML (tanpa gambar). logo=true menambahkan logo untuk pratinjau layar. */
export function badanRps(m, r, logo = false) {
  const P = param(S), p = S.prodi.find(x => x.id === m.prodi) || { nama: m.prodi };
  const cpl = (m.cpl || []).map(id => S.cpl.find(c => c.id === id)).filter(Boolean);
  const cpmk = S.cpmk.filter(c => c.mk === m.id), subs = S.sub.filter(s => s.mk === m.id);
  const peng = S.tugas.filter(t => t.mk === m.id).map(t => (S.dosen.find(d => d.id === t.dosen) || {}).nama).filter(Boolean);
  const T = +m.T || 0, Pr = +m.P || 0, dp = durasi(m, P);
  const tm = (T * P.menitTeori + Pr * dp) * 16;
  const tgl = r.tgl || new Date().toISOString().slice(0, 10);
  const subK = (id) => { const s = S.sub.find(x => x.id === id); return s ? s.kode : ''; };
  const kolSub = Math.max(subs.length, 1);
  const pust = String(r.pustaka || '').trim();
  const kop = `<table class="tbl kopt"><tbody><tr><td class="kl">${logo ? '<img src="assets/img/logo-pem-akamigas.png" alt="">' : ''}</td><td class="kt" align="center"><b>KEMENTERIAN ENERGI DAN SUMBER DAYA MINERAL</b><br><b>BADAN PENGEMBANGAN SUMBER DAYA MANUSIA ENERGI DAN SUMBER DAYA MINERAL</b><br><b>POLITEKNIK ENERGI DAN MINERAL AKAMIGAS</b><br>Program Studi ${esc(p.nama)} · Sarjana Terapan</td><td class="kl">${logo ? '<img src="assets/img/logo-esdm.png" alt="">' : ''}</td></tr><tr><td colspan="3" class="jd" align="center" bgcolor="#D9E2F3"><b>RENCANA PEMBELAJARAN SEMESTER</b></td></tr></tbody></table>`;
  const ident = `<table class="tbl"><thead><tr><th>MATA KULIAH (MK)</th><th>KODE</th><th>Rumpun MK</th><th>BOBOT Teori (sks)</th><th>BOBOT Praktik (sks)</th><th>SEMESTER</th><th>Tgl Penyusunan</th></tr></thead><tbody><tr><td><b>${esc(m.nama)}</b></td><td class="c">${esc(m.kode)}</td><td>${esc(labelKel(m.kel))}</td><td class="c">${T}</td><td class="c">${Pr}</td><td class="c">${m.smt}</td><td class="c">${esc(tgl)}</td></tr></tbody></table>`;
  const jam = `<table class="tbl"><thead><tr><th colspan="2">JUMLAH JAM PEMBELAJARAN</th><th colspan="3">OTORISASI / PENGESAHAN</th></tr></thead><tbody>
    <tr><td>Tatap Muka</td><td>${fmt(tm)} menit (${fmt(jpOf(m, P), 2)} jam per minggu x 16)</td><td class="c"><b>Dosen Pengembang RPS</b></td><td class="c"><b>Koordinator RMK</b></td><td class="c"><b>Ka Prodi</b></td></tr>
    <tr><td>Tugas Terstruktur</td><td>${r.jamTerstruktur ? esc(r.jamTerstruktur) + ' menit' : kosong}</td><td class="ttd">&nbsp;<br>&nbsp;<br>${esc(peng.join('; ')) || kosong}</td><td class="ttd">&nbsp;<br>&nbsp;<br>${kosong}</td><td class="ttd">&nbsp;<br>&nbsp;<br>${kosong}</td></tr>
    <tr><td>Tugas Mandiri</td><td>${r.jamMandiri ? esc(r.jamMandiri) + ' menit' : kosong}</td><td class="mut c" colspan="3">nama dan tanda tangan</td></tr></tbody></table>`;
  const cap = `<table class="tbl"><tbody>
    <tr><th style="width:16%">Capaian Pembelajaran</th><th colspan="2">CPL-PRODI yang dibebankan pada MK</th></tr>
    ${cpl.map(c => `<tr><td></td><td class="c" style="width:12%">${esc(c.kode)}</td><td>${esc(c.teks)}</td></tr>`).join('') || '<tr><td></td><td colspan="2" class="mut">Belum dipetakan ke CPL.</td></tr>'}
    <tr><td></td><th colspan="2">Capaian Pembelajaran Mata Kuliah (CPMK)</th></tr>
    ${cpmk.map(c => `<tr><td></td><td class="c">${esc(c.kode)}</td><td>${esc(c.teks)}</td></tr>`).join('') || '<tr><td></td><td colspan="2" class="mut">Belum ada CPMK.</td></tr>'}
    <tr><td></td><th colspan="2">Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)</th></tr>
    ${subs.map(s => `<tr><td></td><td class="c">${esc(s.kode)}</td><td>${esc(s.teks)}</td></tr>`).join('') || '<tr><td></td><td colspan="2" class="mut">Belum ada Sub-CPMK.</td></tr>'}</tbody></table>`;
  const kor = `<table class="tbl"><thead><tr><th colspan="2">Korelasi CPMK terhadap Sub-CPMK</th>${subs.map(s => `<th>${esc(s.kode)}</th>`).join('') || '<th></th>'}</tr></thead><tbody>
    ${cpmk.map(c => `<tr><td></td><td class="c"><b>${esc(c.kode)}</b></td>${subs.map(s => `<td class="c">${s.cpmk === c.id ? '✓' : ''}</td>`).join('') || '<td></td>'}</tr>`).join('') || `<tr><td colspan="${2 + kolSub}" class="mut">Belum ada CPMK.</td></tr>`}</tbody></table>`;
  const des = `<table class="tbl"><tbody>
    <tr><th style="width:18%">Diskripsi Singkat MK</th><td>${ba(r.deskripsi) || kosong}</td></tr>
    <tr><th>Bahan Kajian: Materi pembelajaran</th><td>${ba(r.bahan) || kosong}</td></tr>
    <tr><th>Pustaka</th><td>${pust ? ba(pust) : kosong}</td></tr>
    <tr><th>Dosen Pengampu</th><td>${esc(peng.join('; ')) || kosong}</td></tr>
    <tr><th>Matakuliah syarat</th><td>${esc(r.syarat) || '-'}</td></tr>
    <tr><th>Integrasi penelitian dan PKM</th><td>${r.penelitian || r.pkm ? `<b>Penelitian:</b> ${ba(r.penelitian) || '-'}<br><b>PKM:</b> ${ba(r.pkm) || '-'}` : kosong}${r.pertemuan.filter(x => x.integ).map(x => `<br>Pertemuan ${x.m}${(x.riset || []).length ? ' (' + x.riset.map(id => { const e = (S.riset || []).find(y => y.id === id); return e ? esc(e.jenis + ': ' + e.judul) : ''; }).filter(Boolean).join('; ') + ')' : ' (' + esc(x.integ) + ')'}: ${esc(x.integUraian || '')}`).join('')}</td></tr></tbody></table>`;
  const baris = (x) => {
    if (x.ujian) return `<tr><td class="c">${x.m}</td><td colspan="6"><b>${esc(x.ujian)}</b>${x.materi ? ' · ' + esc(x.materi) : ''}${(x.sub || []).length ? '<br>' + (x.sub || []).map(subK).filter(Boolean).join(', ') : ''}<br>${esc(x.asesmen || '')} ${x.metode ? '· ' + esc(x.metode) : ''}</td><td class="c">${fmt(x.bobot, 1)}</td></tr>`;
    const sk = (x.sub || []).map(id => S.sub.find(s => s.id === id)).filter(Boolean).map(s => `<b>${esc(s.kode)}</b><br>${esc(s.teks)}`).join('<br>');
    const tmk = x.tatap || (x.metode ? 'Metode: ' + x.metode : '');
    return `<tr><td class="c">${x.m}</td><td>${sk}</td><td>${ba(x.indikator)}</td><td>${x.asesmen ? 'Kriteria dan teknik: ' + ba(x.asesmen) : ''}</td><td>${ba(tmk)}${x.integ ? `<br>Integrasi ${esc(x.integ)}` : ''}</td><td>${ba(x.daring)}</td><td>${ba(x.materi)}</td><td class="c">${fmt(x.bobot, 1)}</td></tr>`;
  };
  const tot = r.pertemuan.reduce((a, x) => a + (+x.bobot || 0), 0);
  const rencana = `<table class="tbl"><thead><tr><th>Mg Ke-</th><th>Kemampuan akhir tiap tahapan belajar (Sub-CPMK)</th><th>Penilaian: Indikator</th><th>Penilaian: Kriteria &amp; Teknik</th><th>Bentuk Pembelajaran; Metode Pembelajaran; Penugasan Mahasiswa [Estimasi Waktu]<br>Tatap Muka</th><th>Daring</th><th>Materi Pembelajaran [Pustaka]</th><th>Bobot Penilaian (%)</th></tr>
    <tr class="no">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<th>(${n})</th>`).join('')}</tr></thead><tbody>${r.pertemuan.map(baris).join('')}<tr><td colspan="7" class="c"><b>Jumlah bobot penilaian</b></td><td class="c"><b>${fmt(tot, 1)}</b></td></tr></tbody></table>`;
  const catH = `<h4>Catatan</h4><ol style="margin-top:0">${CATATAN_RPS.map(c => `<li>${esc(c)}</li>`).join('')}</ol><p>${esc(CATATAN_DASAR)}</p>`;
  const sap = r.pertemuan.filter(x => x.sap && (x.sap.inti || x.sap.pendahuluan));
  const sapH = sap.length ? `<h4>Satuan Acara Perkuliahan (SAP)</h4><table class="tbl"><thead><tr><th>Mg</th><th>Pendahuluan</th><th>Kegiatan inti</th><th>Penutup</th><th>Media dan alat</th></tr></thead><tbody>${sap.map(x => `<tr><td class="c">${x.m}</td><td>${ba(x.sap.pendahuluan)}</td><td>${ba(x.sap.inti)}</td><td>${ba(x.sap.penutup)}</td><td>${ba(x.sap.media)}</td></tr>`).join('')}</tbody></table>` : '';
  return `${kop}${ident}${jam}${cap}${kor}${des}<p></p>${rencana}${catH}${sapH}<p class="mut" style="margin-top:8pt">Kurikulum ${APP.tahunKurikulum} · Status RPS: ${esc(r.status || 'draf')}${r.tgl ? ' · ' + esc(r.tgl) : ''} · Dihasilkan dari KUREKAM.</p>`;
}

/** Berkas Word (HTML berformat Word) lanskap A4. */
export function berkasWordRps(m, r) {
  const css = '@page{size:841.9pt 595.3pt;mso-page-orientation:landscape;margin:36pt 36pt}body{font:9.5pt "Times New Roman",serif}h4{margin:10pt 0 3pt}table{border-collapse:collapse;width:100%;margin-bottom:6pt}td,th{border:1px solid #000;padding:3pt 4pt;vertical-align:top;text-align:left;font:9pt "Times New Roman",serif}th{background:#D9E2F3;text-align:center}tr.no th{background:#fff;font-size:8pt}.c{text-align:center}.mut{color:#666}.kos{color:#888}.kopt td{border:none;text-align:center;font-size:10.5pt}.kopt td.jd{border:1px solid #000;background:#D9E2F3;font-weight:bold;font-size:12pt;padding:5pt}.ttd{height:46pt;text-align:center;vertical-align:bottom}';
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>RPS ${esc(m.nama)}</title><style>${css}</style></head><body>${badanRps(m, r, false).replace(/<table class="tbl kopt"/g, '<table class="tbl kopt" border="0" cellspacing="0" cellpadding="3" width="100%"').replace(/<table class="tbl"/g, '<table class="tbl" border="1" cellspacing="0" cellpadding="3" width="100%"').replace(/<th(?=[ >])/g, '<th bgcolor="#D9E2F3"')}</body></html>`;
}
