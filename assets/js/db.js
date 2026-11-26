/* KUREKAM · Lapisan database
   - Mode "firebase": Cloud Firestore (pola sama dengan SIMANTAP; koleksi berawalan "kur_").
   - Mode "local": localStorage peramban (demo/offline).
   Seluruh data dimuat ke memori saat mulai; setiap perubahan ditulis per dokumen. */
import { FIREBASE_CONFIG } from './config.js';

export const COLLECTIONS = ['prodi', 'dosen', 'pl', 'cpl', 'pi', 'capaian', 'tl', 'capstone', 'lulusan', 'ab', 'real', 'bok', 'bk', 'mk', 'cpmk', 'sub', 'rps', 'tugas', 'revisi', 'lama', 'ajar', 'jadwal', 'riset', 'pengguna', 'log', 'settings'];
const PFX = 'kur_';
const LS = 'kurekam_';
const LS_FBCFG = 'kurekam_firebase_config';
const FB_VER = '10.12.2';

let mode = 'local', fs = null, auth = null, user = null, lastError = null;

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.async = false; s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src));
    document.head.appendChild(s);
  });
}
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { lastError = 'Penyimpanan lokal penuh atau terblokir'; return false; } }

export function getFirebaseConfig() {
  try { const c = JSON.parse(lsGet(LS_FBCFG) || 'null'); if (c && c.projectId) return c; } catch (e) { /* abaikan */ }
  return FIREBASE_CONFIG.projectId ? FIREBASE_CONFIG : null;
}
export function saveFirebaseConfig(cfg) {
  try { cfg ? localStorage.setItem(LS_FBCFG, JSON.stringify(cfg)) : localStorage.removeItem(LS_FBCFG); } catch (e) { /* abaikan */ }
}

/** Tautan pengaturan untuk perangkat lain: ?fb=<konfigurasi>. Disimpan di peramban lalu dihapus dari alamat. */
export function buatTautanFirebase() {
  const c = getFirebaseConfig(); if (!c) return '';
  const b = btoa(unescape(encodeURIComponent(JSON.stringify(c))));
  return `${location.origin}${location.pathname}?fb=${encodeURIComponent(b)}#beranda`;
}
export function terimaTautanFirebase() {
  try {
    const q = new URLSearchParams(location.search), v = q.get('fb'); if (!v) return false;
    const c = JSON.parse(decodeURIComponent(escape(atob(v))));
    if (c && c.projectId && c.apiKey) { saveFirebaseConfig(c); q.delete('fb'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); return true; }
  } catch (e) { console.warn('Tautan pengaturan tidak valid'); }
  return false;
}

async function initFirebase(cfg) {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  /* diunduh bersamaan; async=false menjaga urutan eksekusi (app lebih dulu) */
  await Promise.all(['firebase-app-compat.js', 'firebase-firestore-compat.js', 'firebase-auth-compat.js'].map(f => loadScript(base + f)));
  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg);
  fs = app.firestore(); auth = app.auth();
  user = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
}

export const DB = {
  get mode() { return mode; },
  get user() { return user; },
  get error() { return lastError; },
  get needLogin() { return mode === 'firebase' && !user; },
  /** Kata sandi awal = email huruf kecil. Bila gagal karena huruf besar otomatis atau spasi dari papan ketik HP, dicoba sekali lagi dalam bentuk rapi. */
  async login(email, pass) {
    email = String(email || '').trim().toLowerCase();
    try { const r = await auth.signInWithEmailAndPassword(email, pass); user = r.user; return user; }
    catch (e) {
      const rapi = String(pass || '').trim().toLowerCase();
      if (rapi && rapi !== pass && /wrong-password|invalid-credential|invalid-login/.test(e.code || '')) { const r = await auth.signInWithEmailAndPassword(email, rapi); user = r.user; return user; }
      throw e;
    }
  },
  async logout() { if (auth) await auth.signOut(); user = null; },
  /** Ganti kata sandi akun yang sedang masuk. Kata sandi lama diminta ulang demi keamanan. */
  async gantiSandi(lama, baru) {
    const cred = window.firebase.auth.EmailAuthProvider.credential(user.email, lama);
    await user.reauthenticateWithCredential(cred); await user.updatePassword(baru);
  },
  /** Firebase mengirim email berisi tautan untuk membuat kata sandi baru. */
  async kirimReset(email) { await auth.sendPasswordResetEmail(email); },
  /** Membuat akun masuk baru lewat aplikasi kedua agar sesi admin tidak tergantikan. */
  async buatAkun(email, sandi) {
    const fb = window.firebase, nama = 'kurekam-daftar';
    const app2 = fb.apps.find(a => a.name === nama) || fb.initializeApp(fb.app().options, nama);
    try { await app2.auth().createUserWithEmailAndPassword(email, sandi); return 'baru'; }
    catch (e) { if (e.code === 'auth/email-already-in-use') return 'ada'; throw e; }
    finally { try { await app2.auth().signOut(); } catch (e) { /* abaikan */ } }
  },
  useLocal() { mode = 'local'; },
  /** Kembali ke Firestore setelah mode simulasi developer. Hanya bila Firebase sudah terhubung. */
  useFirebase() { if (fs && auth) mode = 'firebase'; return mode; },
  get tersambung() { return !!(fs && auth); },
  async init() {
    const cfg = getFirebaseConfig();
    if (cfg) {
      try { await initFirebase(cfg); mode = 'firebase'; }
      catch (e) { lastError = e.message || String(e); mode = 'local'; console.warn('Firestore tidak tersedia, memakai database lokal:', lastError); }
    }
    return mode;
  },
  async loadAll() {
    const out = {};
    await Promise.all(COLLECTIONS.map(async (c) => {
      if (mode === 'firebase') { const snap = await fs.collection(PFX + c).get(); out[c] = snap.docs.map(d => d.data()); }
      else { try { out[c] = JSON.parse(lsGet(LS + c) || '[]'); } catch (e) { out[c] = []; } }
    }));
    return out;
  },
  async put(col, doc, all) {
    if (mode === 'firebase') await fs.collection(PFX + col).doc(String(doc.id)).set(JSON.parse(JSON.stringify(doc)));
    else lsSet(LS + col, JSON.stringify(all));
  },
  /** Koleksi lintas aplikasi (SIMANTAP): nama koleksi lengkap, tanpa awalan otomatis. Hanya aktif di mode Firestore. */
  async tulisLuar(col, doc) { if (mode !== 'firebase') return false; await fs.collection(col).doc(String(doc.id)).set(JSON.parse(JSON.stringify(doc))); return true; },
  async bacaLuar(col) { if (mode !== 'firebase') return []; try { const snap = await fs.collection(col).get(); return snap.docs.map(d => d.data()); } catch (e) { console.warn('Koleksi ' + col + ' tidak terbaca:', e.message); return []; } },
  async del(col, id, all) {
    if (mode === 'firebase') await fs.collection(PFX + col).doc(String(id)).delete();
    else lsSet(LS + col, JSON.stringify(all));
  },
  /** Ganti isi satu koleksi. Aman terhadap putus jaringan: dokumen baru ditulis lebih dulu, baru dokumen lama yang tidak dipakai lagi dihapus. */
  async replaceAll(col, arr) {
    if (mode === 'firebase') {
      const ref = fs.collection(PFX + col), old = await ref.get(), baru = new Set(arr.map(d => String(d.id)));
      let batch = fs.batch(), n = 0;
      const flush = async () => { await batch.commit(); batch = fs.batch(); n = 0; };
      for (const doc of arr) { batch.set(ref.doc(String(doc.id)), JSON.parse(JSON.stringify(doc))); if (++n >= 400) await flush(); }
      if (n) await flush();
      for (const d of old.docs) { if (baru.has(d.id)) continue; batch.delete(d.ref); if (++n >= 400) await flush(); }
      if (n) await batch.commit();
    } else lsSet(LS + col, JSON.stringify(arr));
  },
  /* ---- jejak aktivitas dan sesi (koleksi terpisah, tidak dimuat semua pengguna) ---- */
  async tulisJejak(col, doc) { if (mode !== 'firebase') return false; try { await fs.collection(PFX + col).doc(String(doc.id)).set(JSON.parse(JSON.stringify(doc))); return true; } catch (e) { return false; } },
  async ambilSejak(col, sejak, batas = 5000) { batas = Math.min(batas, 10000); if (mode !== 'firebase') return []; const s = await fs.collection(PFX + col).where('t', '>=', sejak).orderBy('t', 'desc').limit(batas).get(); return s.docs.map(d => d.data()); },
  async ambilSemua(col) { if (mode !== 'firebase') return []; const s = await fs.collection(PFX + col).get(); return s.docs.map(d => d.data()); },
  /** Mendengarkan dokumen baru sejak waktu tertentu (tanpa membaca ulang semuanya). Mengembalikan fungsi berhenti. */
  dengar(col, sejak, cb) { if (mode !== 'firebase') return () => {}; return fs.collection(PFX + col).where('t', '>=', sejak).onSnapshot(s => cb(s.docChanges().filter(c => c.type !== 'removed').map(c => c.doc.data())), e => console.warn('Pantau ' + col + ':', e.message)); },
  async hapusSebelum(col, sebelum, batas = 400) { if (mode !== 'firebase') return 0; const s = await fs.collection(PFX + col).where('t', '<', sebelum).limit(batas).get(); if (!s.size) return 0; const b = fs.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); return s.size; },
  /* Dokumen umum untuk koleksi di luar data kurikulum (titik pulih, status cadangan). Mode lokal memakai localStorage. */
  dok: {
    async tulis(col, doc) {
      if (mode === 'firebase') { await fs.collection(PFX + col).doc(String(doc.id)).set(JSON.parse(JSON.stringify(doc))); return; }
      let m = {}; try { m = JSON.parse(lsGet(LS + 'x_' + col) || '{}'); } catch (e) { m = {}; }
      m[doc.id] = doc;
      if (!lsSet(LS + 'x_' + col, JSON.stringify(m))) throw new Error(lastError);
    },
    async baca(col, id) {
      if (mode === 'firebase') { const d = await fs.collection(PFX + col).doc(String(id)).get(); return d.exists ? d.data() : null; }
      try { return (JSON.parse(lsGet(LS + 'x_' + col) || '{}'))[id] || null; } catch (e) { return null; }
    },
    async daftar(col) {
      if (mode === 'firebase') { const s = await fs.collection(PFX + col).get(); return s.docs.map(d => d.data()); }
      try { return Object.values(JSON.parse(lsGet(LS + 'x_' + col) || '{}')); } catch (e) { return []; }
    },
    async hapus(col, id) {
      if (mode === 'firebase') { await fs.collection(PFX + col).doc(String(id)).delete(); return; }
      let m = {}; try { m = JSON.parse(lsGet(LS + 'x_' + col) || '{}'); } catch (e) { m = {}; }
      delete m[id]; lsSet(LS + 'x_' + col, JSON.stringify(m));
    }
  },
  clearLocal() { COLLECTIONS.forEach(c => { try { localStorage.removeItem(LS + c); } catch (e) { /* abaikan */ } }); }
};
