/**
 * Cadangan harian KUREKAM + SIMANTAP ke Google Drive
 * ---------------------------------------------------------------
 * Berjalan di server Google (Apps Script), jadi tidak perlu laptop menyala.
 * Setiap hari membaca seluruh koleksi Firestore proyek simantap-pem, lalu
 * menyimpan satu berkas ZIP bernama unik per hari ke folder Drive tujuan:
 *     Cadangan_KUREKAM-SIMANTAP_2026-11-25_0200.zip
 * Isi ZIP:
 *   - kurekam.json   : format yang sama dengan tombol "Unduh cadangan" KUREKAM,
 *                      sehingga bisa dipulihkan lewat Data Induk > Basis data > Pulihkan.
 *   - simantap.json  : seluruh koleksi SIMANTAP.
 *   - lainnya.json   : jejak aktivitas, sesi, dan koleksi penghubung.
 *   - ringkasan.txt  : jumlah dokumen per koleksi.
 *
 * PENGATURAN (sekali saja): Project Settings > Script Properties, isi:
 *   API_KEY      = apiKey dari konfigurasi Firebase (sama dengan di tautan ?fb=)
 *   PROJECT_ID   = simantap-pem
 *   EMAIL        = email akun KUREKAM yang berperan Admin/Developer/Wadir
 *   PASSWORD     = kata sandi akun tersebut
 *   FOLDER_ID    = 1rpJqtKXn1SfswXSCSnVkQJT-gx7PuAsL
 *   SIMPAN_HARI  = 0   (0 = simpan selamanya; isi 180 bila ingin hapus cadangan > 180 hari)
 * Lalu jalankan fungsi pasangJadwal() sekali, dan izinkan aksesnya.
 */

var KUREKAM = ['prodi', 'dosen', 'pl', 'cpl', 'pi', 'capaian', 'tl', 'capstone', 'lulusan', 'ab', 'real', 'bok', 'bk', 'mk', 'cpmk', 'sub', 'rps', 'tugas', 'revisi', 'lama', 'ajar', 'jadwal', 'riset', 'pengguna', 'log', 'settings'];
var SIMANTAP = ['indikator', 'ami', 'rtl', 'rtm', 'dokumen', 'log', 'settings', 'pengguna', 'iabee', 'led', 'lam', 'ppepp'];
var LAINNYA = ['kur_jejak', 'kur_sesi', 'kur_umpan', 'simantap_led', 'skpi_verif'];

function cadanganHarian() {
  var P = PropertiesService.getScriptProperties().getProperties();
  ['API_KEY', 'PROJECT_ID', 'EMAIL', 'PASSWORD', 'FOLDER_ID'].forEach(function (k) { if (!P[k]) throw new Error('Script Property ' + k + ' belum diisi.'); });
  var token = masuk_(P);
  var hasil = { kurekam: {}, simantap: {}, lainnya: {} }, catatan = [];
  KUREKAM.forEach(function (c) { hasil.kurekam[c] = bacaKoleksi_(P, token, 'kur_' + c); catatan.push('kur_' + c + ': ' + hasil.kurekam[c].length); });
  SIMANTAP.forEach(function (c) { hasil.simantap[c] = bacaKoleksi_(P, token, c); catatan.push(c + ': ' + hasil.simantap[c].length); });
  LAINNYA.forEach(function (c) { hasil.lainnya[c] = bacaKoleksi_(P, token, c); catatan.push(c + ': ' + hasil.lainnya[c].length); });

  var tz = 'Asia/Jakarta', now = new Date();
  var tgl = Utilities.formatDate(now, tz, 'yyyy-MM-dd'), jam = Utilities.formatDate(now, tz, 'HHmm');
  var nama = 'Cadangan_KUREKAM-SIMANTAP_' + tgl + '_' + jam;
  var ring = 'Cadangan ' + Utilities.formatDate(now, tz, 'dd MMM yyyy HH:mm') + ' WIB\nProyek: ' + P.PROJECT_ID + '\n\n' + catatan.join('\n');
  var berkas = [
    Utilities.newBlob(JSON.stringify(hasil.kurekam), 'application/json', 'kurekam.json'),
    Utilities.newBlob(JSON.stringify(hasil.simantap), 'application/json', 'simantap.json'),
    Utilities.newBlob(JSON.stringify(hasil.lainnya), 'application/json', 'lainnya.json'),
    Utilities.newBlob(ring, 'text/plain', 'ringkasan.txt')
  ];
  var zip = Utilities.zip(berkas, nama + '.zip');
  var folder = DriveApp.getFolderById(P.FOLDER_ID);
  folder.createFile(zip);
  bersihkan_(folder, +P.SIMPAN_HARI || 0);
  if (!hasil.kurekam.mk.length) kabari_('Peringatan cadangan KUREKAM', 'Cadangan ' + nama + ' tersimpan, tetapi koleksi mata kuliah kosong. Periksa aplikasi.\n\n' + ring);
  tulisStatus_(P, token, { ok: true, berkas: nama + '.zip' });
  Logger.log(ring);
}

/** Melapor ke aplikasi (koleksi kur_status, dokumen drive) agar menu Cadangan & Keamanan menampilkan status Drive. Gagal menulis tidak menggagalkan cadangan. */
function tulisStatus_(P, token, s) {
  try {
    var f = { t: { stringValue: new Date().toISOString() }, ok: { booleanValue: s.ok !== false }, berkas: { stringValue: s.berkas || '' }, galat: { stringValue: s.galat || '' } };
    UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + P.PROJECT_ID + '/databases/(default)/documents/kur_status/drive', {
      method: 'patch', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
      payload: JSON.stringify({ fields: Object.assign({ id: { stringValue: 'drive' } }, f) })
    });
  } catch (e) { Logger.log('Status tidak terkirim: ' + e); }
}

function masuk_(P) {
  var r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + P.API_KEY, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ email: P.EMAIL, password: P.PASSWORD, returnSecureToken: true })
  });
  var j = JSON.parse(r.getContentText());
  if (!j.idToken) throw new Error('Gagal masuk ke Firebase: ' + r.getContentText());
  return j.idToken;
}

function bacaKoleksi_(P, token, col) {
  var out = [], halaman = '', base = 'https://firestore.googleapis.com/v1/projects/' + P.PROJECT_ID + '/databases/(default)/documents/' + col + '?pageSize=300';
  do {
    var r = UrlFetchApp.fetch(base + (halaman ? '&pageToken=' + encodeURIComponent(halaman) : ''), { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
    if (r.getResponseCode() === 403) { Logger.log('Tidak punya izin membaca ' + col); return out; }
    if (r.getResponseCode() !== 200) throw new Error('Gagal membaca ' + col + ': ' + r.getContentText().slice(0, 300));
    var j = JSON.parse(r.getContentText());
    (j.documents || []).forEach(function (d) { out.push(nilaiMap_(d.fields || {})); });
    halaman = j.nextPageToken || '';
  } while (halaman);
  return out;
}

function nilai_(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return nilaiMap_(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(nilai_);
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('bytesValue' in v) return v.bytesValue;
  return null;
}
function nilaiMap_(f) { var o = {}; Object.keys(f).forEach(function (k) { o[k] = nilai_(f[k]); }); return o; }

function bersihkan_(folder, hari) {
  if (!hari) return;
  var batas = Date.now() - hari * 864e5, it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); if (/^Cadangan_KUREKAM-SIMANTAP_/.test(f.getName()) && f.getDateCreated().getTime() < batas) f.setTrashed(true); }
}
function kabari_(judul, isi) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), judul, isi); } catch (e) { Logger.log(e); } }

/** Jalankan sekali: membuat jadwal harian pukul 02.00 WIB, dan langsung membuat cadangan pertama. */
function pasangJadwal() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'cadanganHarian' || t.getHandlerFunction() === 'cadanganAman') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cadanganAman').timeBased().everyDays(1).atHour(2).inTimezone('Asia/Jakarta').create();
  cadanganHarian();
}
/** Dipanggil jadwal: bila gagal, pemilik skrip dikirimi email. */
function cadanganAman() {
  try { cadanganHarian(); } catch (e) {
    kabari_('Cadangan KUREKAM gagal', String(e && e.stack || e));
    try { var P = PropertiesService.getScriptProperties().getProperties(); tulisStatus_(P, masuk_(P), { ok: false, galat: String(e && e.message || e).slice(0, 200) }); } catch (x) { /* abaikan */ }
    throw e;
  }
}
