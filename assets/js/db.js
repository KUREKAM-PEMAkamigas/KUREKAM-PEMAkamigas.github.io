/* KUREKAM · Lapisan database
   - Mode "firebase": Cloud Firestore (pola sama dengan SIMANTAP; koleksi berawalan "kur_").
   - Mode "local": localStorage peramban (demo/offline).
   Seluruh data dimuat ke memori saat mulai; setiap perubahan ditulis per dokumen. */
import { FIREBASE_CONFIG } from './config.js';

export const COLLECTIONS = ['prodi', 'dosen', 'pl', 'cpl', 'bok', 'bk', 'mk', 'cpmk', 'sub', 'rps', 'tugas', 'revisi', 'lama', 'ajar', 'pengguna', 'log', 'settings'];
const PFX = 'kur_';
const LS = 'kurekam_';
const LS_FBCFG = 'kurekam_firebase_config';
const FB_VER = '10.12.2';

let mode = 'local', fs = null, auth = null, user = null, lastError = null;

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src));
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
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore-compat.js`);
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth-compat.js`);
  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg);
  fs = app.firestore(); auth = app.auth();
  user = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
  if (user) await fs.collection(PFX + 'settings').limit(1).get();
}

export const DB = {
  get mode() { return mode; },
  get user() { return user; },
  get error() { return lastError; },
  get needLogin() { return mode === 'firebase' && !user; },
  async login(email, pass) { const r = await auth.signInWithEmailAndPassword(email, pass); user = r.user; return user; },
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
    for (const c of COLLECTIONS) {
      if (mode === 'firebase') { const snap = await fs.collection(PFX + c).get(); out[c] = snap.docs.map(d => d.data()); }
      else { try { out[c] = JSON.parse(lsGet(LS + c) || '[]'); } catch (e) { out[c] = []; } }
    }
    return out;
  },
  async put(col, doc, all) {
    if (mode === 'firebase') await fs.collection(PFX + col).doc(String(doc.id)).set(JSON.parse(JSON.stringify(doc)));
    else lsSet(LS + col, JSON.stringify(all));
  },
  async del(col, id, all) {
    if (mode === 'firebase') await fs.collection(PFX + col).doc(String(id)).delete();
    else lsSet(LS + col, JSON.stringify(all));
  },
  async replaceAll(col, arr) {
    if (mode === 'firebase') {
      const old = await fs.collection(PFX + col).get();
      let batch = fs.batch(), n = 0;
      const flush = async () => { await batch.commit(); batch = fs.batch(); n = 0; };
      for (const d of old.docs) { batch.delete(d.ref); if (++n >= 400) await flush(); }
      for (const doc of arr) { batch.set(fs.collection(PFX + col).doc(String(doc.id)), JSON.parse(JSON.stringify(doc))); if (++n >= 400) await flush(); }
      if (n) await batch.commit();
    } else lsSet(LS + col, JSON.stringify(arr));
  },
  clearLocal() { COLLECTIONS.forEach(c => { try { localStorage.removeItem(LS + c); } catch (e) { /* abaikan */ } }); }
};
