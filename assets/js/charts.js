/* SIMANTAP 2.0 · Pembungkus ECharts: tema lembut, auto-resize, animasi saat terlihat. */
const live = new Set();
export const PAL = ['#10b981', '#0ea5e9', '#8b5cf6', '#f5a524', '#f0616d', '#14b8a6', '#6366f1', '#f472b6'];
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

export const BASE = {
  color: PAL,
  textStyle: { fontFamily: FONT, color: '#3b4760' },
  animationDuration: 1300, animationEasing: 'cubicOut', animationDurationUpdate: 700,
  tooltip: { backgroundColor: 'rgba(24,35,58,.92)', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12, fontFamily: FONT }, extraCssText: 'border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:8px 12px' },
  grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true }
};
export const AX = {
  axisLine: { lineStyle: { color: 'rgba(24,35,58,.12)' } }, axisTick: { show: false },
  axisLabel: { color: '#6b778c', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(24,35,58,.06)', type: 'dashed' } }
};
export const grad = (c1, c2, horiz = false) => new window.echarts.graphic.LinearGradient(0, 0, horiz ? 1 : 0, horiz ? 0 : 1, [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]);

function merge(a, b) {
  const o = { ...a };
  for (const k in b) {
    const plain = v => v && typeof v === 'object' && !Array.isArray(v);
    o[k] = plain(b[k]) && plain(a[k]) ? { ...a[k], ...b[k] } : b[k];
  }
  return o;
}

/** Buat grafik; animasi dimulai saat elemen masuk viewport. */
export function chart(el, option) {
  if (!el || !window.echarts) return null;
  const inst = window.echarts.init(el, null, { renderer: 'canvas' });
  live.add(inst);
  const opt = merge(BASE, option);
  let done = false;
  const go = () => { if (done || inst.isDisposed()) return; done = true; inst.setOption(opt, true); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { go(); io.disconnect(); } }, { threshold: 0.1, rootMargin: '80px' });
    io.observe(el);
    setTimeout(() => { go(); io.disconnect(); }, 3500); // cadangan: cetak/tangkapan layar
  } else go();
  if ('ResizeObserver' in window) new ResizeObserver(() => inst.resize()).observe(el);
  return inst;
}
export function disposeAll() { live.forEach(c => { try { c.dispose(); } catch (e) { /* abaikan */ } }); live.clear(); }

export function countUp(el, to, dec = 0, dur = 1400) {
  if (!el) return;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (to * e).toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Efek kemiringan 3D halus mengikuti kursor. */
export function tilt(root) {
  if (matchMedia('(hover: none)').matches) return;
  root.querySelectorAll('.tilt').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-2px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

export function gaugeOption(val, max, label, color = '#10b981', fmtDec = 0) {
  return {
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max, radius: '92%', center: ['50%', '58%'],
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color: grad(color, '#0ea5e9', true), shadowBlur: 12, shadowColor: color + '66' } },
      axisLine: { lineStyle: { width: 16, color: [[1, 'rgba(24,35,58,.07)']] }, roundCap: true },
      pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      anchor: { show: false }, title: { offsetCenter: [0, '32%'], fontSize: 12, color: '#6b778c', fontWeight: 600 },
      detail: { valueAnimation: true, offsetCenter: [0, '-4%'], fontSize: 34, fontWeight: 800, color: '#18233a', formatter: v => Number(v).toLocaleString('id-ID', { maximumFractionDigits: fmtDec }) },
      data: [{ value: val, name: label }]
    }]
  };
}
