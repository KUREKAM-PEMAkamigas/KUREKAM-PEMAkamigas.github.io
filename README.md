# KUREKAM PEM Akamigas

Kurikulum, Rancang, Evaluasi, Kawal Mutu. Aplikasi web statis untuk menyusun kurikulum OBE lima prodi sarjana terapan, dari visi sampai RPS dan SAP, lengkap dengan beban dosen riil dan beban prodi.

## Memasang di GitHub Pages
1. Buat repositori baru, misalnya `kurekam`, di akun atau organisasi yang sama dengan SIMANTAP.
2. Unggah seluruh isi folder ini (index.html dan folder assets) ke cabang utama.
3. Buka Settings, Pages, pilih cabang utama dan folder root, lalu simpan.
4. Aplikasi terbuka di `https://<nama-akun>.github.io/kurekam/`.

## Basis data
- Tanpa pengaturan, aplikasi berjalan dalam mode lokal: data tersimpan di peramban masing-masing.
- Untuk data bersama, masuk sebagai Admin, buka Data Induk & Pengaturan, tab Basis data, lalu tempel konfigurasi Web App Firebase milik SIMANTAP. Koleksi KUREKAM berawalan `kur_`.
- Konfigurasi permanen dapat ditulis di `assets/js/config.js`.

## Data awal
- Rancangan baru berisi data contoh yang mengikuti kerangka Buku Pedoman 2027. Ganti lewat impor Matriks_Kurikulum_D4_PEM_Akamigas.xlsx.
- Kurikulum berjalan (395 MK) dimigrasikan dari Dashboard Evaluasi Beban Perkuliahan dan dapat diganti lewat impor lembar DATA.
