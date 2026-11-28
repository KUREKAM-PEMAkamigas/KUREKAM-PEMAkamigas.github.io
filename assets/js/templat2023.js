/* KUREKAM · Templat Excel Kurikulum 2023 (bahan pendukung PA IABEE 2027).
   Isinya sama dengan format Tabel OBE prodi (lembar 1 sampai 18, dibaca oleh Impor Tabel OBE),
   ditambah lembar "Pemetaan MK 2023 ke 2027" dan lembar "Petunjuk". Tidak memuat data apa pun. */
import { lembarImpor, KOLOM_PEMETAAN, JENIS_PADANAN } from './templatobe.js';
import { loadXLSX, unduh } from './views/ui.js';


const PETUNJUK = [
  ['Templat Kurikulum 2023 (bahan pendukung PA IABEE 2027)'],
  [''],
  ['Cara mengisi'],
  ['1. Isi lembar 1 sampai 18 seperti Tabel Kurikulum OBE biasa, berdasarkan dokumen Kurikulum 2023 yang berlaku. Kode CPL, BK, MK, CPMK, dan Sub-CPMK ditulis apa adanya dari dokumen asli.'],
  ['2. Bila dokumen 2023 belum memakai CPMK atau Sub-CPMK, biarkan lembar 13 sampai 18 kosong; isi hanya yang memang ada. Jangan mengarang data.'],
  ['3. Lembar "Pemetaan MK 2023 ke 2027": untuk tiap MK 2023, tulis padanannya di Kurikulum 2027 (kode dan nama) serta jenis padanan. Kosongkan bila belum diputuskan.'],
  ['4. Ganti nama berkas sesuai prodi, lalu unggah di KUREKAM: pilih Kurikulum 2023 di bagian atas, buka Data Induk, Impor, Impor Tabel OBE.'],
  [''],
  ['Catatan jujur untuk akreditasi'],
  ['Data yang diisi dari dokumen 2023 adalah penyusunan ulang (retro-mapping) mengikuti Pedoman. RPS asli dan nilai mahasiswa yang sudah ada tidak diubah.'],
  ['Jangan mengisi nama, NIM, atau nilai per mahasiswa pada berkas ini.'],
  [''],
  ['Jenis padanan yang dikenali: ' + JENIS_PADANAN.join(', ')],
];

/** Membuat dan mengunduh templat Excel Kurikulum 2023 untuk satu prodi. */
export async function unduhTemplat2023(pid) {
  const X = await loadXLSX(), wb = X.utils.book_new();
  const lembar = (nama, aoa, lebar) => { const ws = X.utils.aoa_to_sheet(aoa); if (lebar) ws['!cols'] = lebar.map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, nama.slice(0, 31)); };
  lembar('Petunjuk', PETUNJUK, [120]);
  const dipakai = new Set(['Petunjuk']);
  lembarImpor({}).forEach(t => {
    let nama = String(t.sheet || t.no).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    while (dipakai.has(nama)) nama = nama.slice(0, 29) + '_' + dipakai.size;
    dipakai.add(nama);
    lembar(nama, [[t.judul + ' (Kurikulum 2023)'], [`Program Studi ${pid}`], [], t.kolom, ...(t.catatan || []).map(c => ['Catatan: ' + c])], t.kolom.map((_, i) => (i === 0 ? 18 : 24)));
  });
  lembar('Pemetaan MK 2023 ke 2027', [['Pemetaan Mata Kuliah Kurikulum 2023 ke Kurikulum 2027'], [`Program Studi ${pid}`], [], KOLOM_PEMETAAN], [16, 36, 10, 12, 16, 36, 18, 40]);
  unduh(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `templat-kurikulum-2023-${pid}.xlsx`);
}
