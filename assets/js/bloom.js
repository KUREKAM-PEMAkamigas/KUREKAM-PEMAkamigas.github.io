/* KUREKAM · Taksonomi Bloom
   Ranah kognitif: revisi Anderson & Krathwohl (2001), C1 sampai C6.
   Ranah psikomotor: Dave (1970), P1 sampai P5.
   Ranah afektif: Krathwohl, Bloom & Masia (1964), A1 sampai A5.
   Kata kerja operasional (KKO) dipakai untuk mendeteksi level rumusan CPL, CPMK, dan Sub-CPMK. */

export const LEVELS = {
  C1: { d: 'C', n: 1, nama: 'Mengingat', en: 'Remember', c: '#94a3b8' },
  C2: { d: 'C', n: 2, nama: 'Memahami', en: 'Understand', c: '#0ea5e9' },
  C3: { d: 'C', n: 3, nama: 'Menerapkan', en: 'Apply', c: '#14b8a6' },
  C4: { d: 'C', n: 4, nama: 'Menganalisis', en: 'Analyze', c: '#10b981' },
  C5: { d: 'C', n: 5, nama: 'Mengevaluasi', en: 'Evaluate', c: '#f5a524' },
  C6: { d: 'C', n: 6, nama: 'Mencipta', en: 'Create', c: '#f0616d' },
  P1: { d: 'P', n: 1, nama: 'Imitasi', en: 'Imitation', c: '#cbd5e1' },
  P2: { d: 'P', n: 2, nama: 'Manipulasi', en: 'Manipulation', c: '#7dd3fc' },
  P3: { d: 'P', n: 3, nama: 'Presisi', en: 'Precision', c: '#5eead4' },
  P4: { d: 'P', n: 4, nama: 'Artikulasi', en: 'Articulation', c: '#fcd34d' },
  P5: { d: 'P', n: 5, nama: 'Naturalisasi', en: 'Naturalization', c: '#fda4af' },
  A1: { d: 'A', n: 1, nama: 'Menerima', en: 'Receiving', c: '#e2e8f0' },
  A2: { d: 'A', n: 2, nama: 'Menanggapi', en: 'Responding', c: '#c7d2fe' },
  A3: { d: 'A', n: 3, nama: 'Menghargai', en: 'Valuing', c: '#a5b4fc' },
  A4: { d: 'A', n: 4, nama: 'Mengorganisasi', en: 'Organization', c: '#818cf8' },
  A5: { d: 'A', n: 5, nama: 'Karakterisasi', en: 'Characterization', c: '#6366f1' }
};
export const DOMAIN = { C: 'Kognitif', P: 'Psikomotor', A: 'Afektif' };

export const KKO = {
  C1: ['mengingat', 'menyebutkan', 'mendefinisikan', 'mengidentifikasi', 'mendaftar', 'mendaftarkan', 'menamai', 'mengenali', 'menghafal', 'mereproduksi', 'menuliskan', 'mencatat', 'mengutip'],
  C2: ['menjelaskan', 'menguraikan', 'merangkum', 'mengklasifikasikan', 'mengelompokkan', 'membandingkan', 'menafsirkan', 'mencontohkan', 'menyimpulkan', 'menerjemahkan', 'mendeskripsikan', 'mendiskusikan', 'memparafrasakan', 'menguasai', 'memahami', 'mengetahui'],
  C3: ['menerapkan', 'menggunakan', 'melaksanakan', 'menghitung', 'mengoperasikan', 'menjalankan', 'mengimplementasikan', 'menyelesaikan', 'mempraktikkan', 'menentukan', 'mengukur', 'mengaplikasikan', 'mendemonstrasikan', 'memanfaatkan', 'mengolah', 'melakukan'],
  C4: ['menganalisis', 'membedakan', 'mengorganisasikan', 'menelaah', 'mendiagnosis', 'menguji', 'mengkaji', 'memecahkan', 'menyelidiki', 'mendeteksi', 'mengatribusikan', 'mengkorelasikan', 'menginterpretasikan', 'mengintegrasikan'],
  C5: ['mengevaluasi', 'menilai', 'memeriksa', 'mengkritik', 'memutuskan', 'memvalidasi', 'merekomendasikan', 'membuktikan', 'mempertimbangkan', 'menyeleksi', 'menjustifikasi', 'mengaudit', 'memverifikasi', 'mengambil'],
  C6: ['merancang', 'mendesain', 'menciptakan', 'merumuskan', 'membangun', 'mengembangkan', 'menyusun', 'merencanakan', 'memproduksi', 'menghasilkan', 'memodifikasi', 'mengkombinasikan', 'mengoptimalkan', 'menemukan', 'mengkreasikan'],
  P1: ['meniru', 'mengikuti', 'mengulangi', 'mencontoh', 'mengamati'],
  P2: ['melakukan', 'memasang', 'membongkar', 'mengoperasikan', 'mempraktikkan', 'menjalankan'],
  P3: ['mengkalibrasi', 'menyetel', 'merakit', 'memperbaiki', 'mengukur', 'menginstalasi', 'menguji', 'mendemonstrasikan'],
  P4: ['mengadaptasi', 'memadukan', 'mengoordinasikan', 'merangkai', 'mengatasi', 'menyesuaikan', 'mengintegrasikan'],
  P5: ['mengelola', 'memimpin', 'mengendalikan', 'mengotomasi', 'mengawasi', 'mengoptimalkan'],
  A1: ['menerima', 'menyadari', 'memperhatikan', 'mendengarkan'],
  A2: ['menanggapi', 'mematuhi', 'menaati', 'berpartisipasi', 'melaporkan'],
  A3: ['menghargai', 'menghormati', 'menjunjung', 'bertanggung', 'berperan', 'menunjukkan'],
  A4: ['mengorganisasi', 'memprioritaskan', 'menyeimbangkan', 'berkontribusi', 'bekerja'],
  A5: ['menginternalisasi', 'berperilaku', 'bertakwa', 'berkomitmen', 'menginternalisasikan']
};
/* Kata kerja yang tidak terukur: tetap dikenali, tetapi diberi peringatan. */
export const KABUR = ['memahami', 'mengetahui', 'mengerti', 'menghayati', 'mengenal', 'menguasai'];
const ABAI = new Set(['mampu', 'dapat', 'mahasiswa', 'lulusan', 'peserta', 'didik', 'untuk', 'secara', 'dan', 'yang', 'serta', 'diharapkan', 'akan', 'bisa', 'sanggup']);

const ORDER = { C: ['C', 'P', 'A'], P: ['P', 'C', 'A'], A: ['A', 'C', 'P'] };
const INDEX = {};
Object.entries(KKO).forEach(([lv, arr]) => arr.forEach(v => { (INDEX[v] = INDEX[v] || []).push(lv); }));

/** Deteksi level Bloom dari rumusan. hint: 'C' | 'P' | 'A' (ranah yang diharapkan). */
export function detect(text, hint = 'C') {
  const toks = String(text || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < Math.min(toks.length, 8); i++) {
    const t = toks[i];
    if (ABAI.has(t)) continue;
    const hits = INDEX[t];
    if (!hits) continue;
    const pref = ORDER[hint] || ORDER.C;
    const pick = pref.map(d => hits.filter(h => h[0] === d).sort().pop()).find(Boolean) || hits[0];
    return { code: pick, verb: t, kabur: KABUR.includes(t), ...LEVELS[pick] };
  }
  return null;
}
export const lvNum = (code) => code && LEVELS[code] ? LEVELS[code].n : 0;
export const badge = (code) => code && LEVELS[code]
  ? `<span class="tag bloom" style="--c:${LEVELS[code].c}" title="${DOMAIN[LEVELS[code].d]}: ${LEVELS[code].nama}">${code} ${LEVELS[code].nama}</span>`
  : '<span class="tag" style="--c:#f0616d">KKO tidak dikenali</span>';

/* Level minimal yang diharapkan untuk CPL D4 (KKNI level 6) per ranah CPL. */
export const MIN_CPL = { S: 3, P: 2, KU: 3, KK: 3 };
/* Rentang level kognitif yang dianjurkan per semester (progresi taksonomi). */
export const ANJURAN_SMT = { 1: [1, 3], 2: [2, 3], 3: [2, 4], 4: [3, 4], 5: [3, 5], 6: [4, 6], 7: [3, 6], 8: [5, 6] };
export function saran(code) {
  if (!code) return 'Awali rumusan dengan kata kerja operasional yang terukur, misalnya "menerapkan", "menganalisis", atau "merancang".';
  const L = LEVELS[code];
  if (KABUR.includes((L && L.verb) || '')) return '';
  const next = Object.keys(KKO).filter(k => k[0] === L.d && LEVELS[k].n === L.n);
  return next.length ? `Contoh KKO setara: ${KKO[next[0]].slice(0, 5).join(', ')}` : '';
}
