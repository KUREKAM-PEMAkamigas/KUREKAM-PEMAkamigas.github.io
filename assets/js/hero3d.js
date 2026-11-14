/* KUREKAM · Visual 3D (Three.js)
   - mountHero: menara kurikulum 8 semester, tiap balok = satu MK (tinggi = SKS, warna = kelompok).
   - mountPyramid: piramida Taksonomi Bloom C1–C6, lebar lapisan = jumlah rumusan.
   - mountOrbit: rantai OBE (Visi → SAP) berupa simpul pada lintasan spiral.
   Ringan, berhenti saat tab tersembunyi, dibersihkan saat pindah halaman. */
/* Three.js (670 KB) dimuat saat pertama dibutuhkan agar halaman masuk dan beranda tidak menunggu. */
let THREE = null;
const muatThree = () => THREE ? Promise.resolve() : import('../vendor/three.module.min.js').then(m => { THREE = m; });

const stops = new Set();
export function disposeHero() { stops.forEach(s => s()); stops.clear(); }

function engine(canvas, { cam = [0, 2, 10], fov = 40, onTick, build, interact = true }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); }
  catch (e) { console.warn('WebGL tidak tersedia', e); canvas.insertAdjacentHTML('afterend', '<div class="muted small" style="position:absolute;bottom:8px;left:12px">Tampilan 3D tidak didukung peramban ini.</div>'); return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200); camera.position.set(...cam); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(5, 8, 6); scene.add(d1);
  const p1 = new THREE.PointLight(0x6ee7b7, 40, 30); p1.position.set(-5, 3, 4); scene.add(p1);
  const p2 = new THREE.PointLight(0xa78bfa, 40, 30); p2.position.set(5, -2, 3); scene.add(p2);
  const world = new THREE.Group(); scene.add(world);
  const ctx = { THREE, scene, camera, world, renderer, canvas };
  build(ctx);
  let mx = 0, my = 0, drag = false, lx = 0, rotY = 0, auto = true;
  const host = canvas.parentElement;
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; if (drag) { rotY += (e.clientX - lx) * 0.01; lx = e.clientX; } };
  const onDown = (e) => { if (!interact) return; drag = true; auto = false; lx = e.clientX; };
  const onUp = () => { drag = false; };
  host.addEventListener('pointermove', onMove); host.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp);
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (ctx.onResize) ctx.onResize(w, h); };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  let raf, t0 = performance.now(), running = true;
  const tick = (t) => {
    const s = (t - t0) / 1000;
    if (auto) rotY += 0.0035;
    world.rotation.y += ((rotY + mx * 0.4) - world.rotation.y) * 0.06;
    world.rotation.x += ((my * 0.2) - world.rotation.x) * 0.05;
    if (onTick) onTick(s, ctx);
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const vis = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', vis);
  const stop = () => {
    running = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis);
    host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp);
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    renderer.dispose();
  };
  stops.add(stop);
  return ctx;
}

function label(THREE, text, color = '#ffffff', size = 64) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `800 ${size}px Plus Jakarta Sans, sans-serif`; const w = Math.ceil(g.measureText(text).width) + 24;
  c.width = w; c.height = size + 24; g.font = `800 ${size}px Plus Jakarta Sans, sans-serif`; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 12, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(w / c.height * 0.42, 0.42, 1); return sp;
}

/** Menara kurikulum: layers = [{smt, mk:[{sks, c}]}] */
function mountHero0(canvas, layers) {
  const anim = [];
  return engine(canvas, {
    cam: [0, 3.2, 11.5],
    build: ({ THREE, world, camera }) => {
      const tower = new THREE.Group(); tower.position.y = -2.6; world.add(tower);
      layers.forEach((L, li) => {
        const y = li * 0.62;
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.05, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 }));
        plate.position.y = y; tower.add(plate);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.01, 6, 120), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = y; tower.add(ring);
        const n = Math.max(1, L.mk.length);
        L.mk.forEach((m, i) => {
          const h = 0.1 + Math.min(10, m.sks) * 0.05;
          const geo = new THREE.BoxGeometry(0.28, 1, 0.28); geo.translate(0, 0.5, 0);
          const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(m.c), roughness: 0.3, metalness: 0.2, emissive: new THREE.Color(m.c), emissiveIntensity: 0.18 }));
          const a = (i / n) * Math.PI * 2 + li * 0.35; const r = 1.2 + (i % 3) * 0.42;
          mesh.position.set(Math.cos(a) * r, y + 0.03, Math.sin(a) * r); mesh.scale.y = 0.01; mesh.userData = { h, d: li * 0.18 + i * 0.015 };
          tower.add(mesh); anim.push(mesh);
        });
        const lb = label(THREE, 'S' + L.smt, 'rgba(255,255,255,.85)', 52); lb.position.set(2.95, y + 0.15, 0); tower.add(lb);
      });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, layers.length * 0.62, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.1, clearcoat: 1, emissive: 0x0ea5e9, emissiveIntensity: 0.25 }));
      core.position.y = layers.length * 0.31; tower.add(core);
      const N = 300, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 24; pos[i * 3 + 1] = (Math.random() - .5) * 12; pos[i * 3 + 2] = (Math.random() - .5) * 10 - 3; }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      world.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.55 })));
      camera.lookAt(0, 0, 0);
    },
    onTick: (s, { world, canvas }) => {
      anim.forEach(m => { const p = Math.min(1, Math.max(0, (s - 0.2 - m.userData.d) / 0.9)); m.scale.y = 0.01 + (m.userData.h - 0.01) * (1 - Math.pow(1 - p, 3)); });
      const w = canvas.clientWidth; world.position.x = w > 900 ? 3.1 : 0; world.position.y = w > 900 ? 0 : 1.6; world.scale.setScalar(w > 900 ? 1 : (w < 600 ? 0.62 : 0.8));
    }
  });
}

/** Piramida Bloom: counts = {C1..C6: n} */
function mountPyramid0(canvas, counts, colors) {
  const anim = [];
  return engine(canvas, {
    cam: [0, 2.6, 9.5],
    build: ({ THREE, world }) => {
      const keys = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
      const mx = Math.max(1, ...keys.map(k => counts[k] || 0));
      keys.forEach((k, i) => {
        const top = 2.6 - i * 0.42, bot = 2.6 - (i - 1) * 0.42 - 0.42;
        const geo = new THREE.CylinderGeometry(Math.max(0.15, top - 0.42), Math.max(0.3, top), 0.5, 4, 1);
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colors[k]), roughness: 0.35, metalness: 0.15, transparent: true, opacity: 0.35 + 0.65 * ((counts[k] || 0) / mx), emissive: new THREE.Color(colors[k]), emissiveIntensity: 0.15 });
        const m = new THREE.Mesh(geo, mat); m.rotation.y = Math.PI / 4; m.position.y = -1.6 + i * 0.56; m.scale.setScalar(0.01); m.userData = { d: i * 0.12 };
        world.add(m); anim.push(m);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
        m.add(edges);
        const lb = label(THREE, `${k} · ${counts[k] || 0}`, '#18233a', 48); lb.position.set(top + 0.9, -1.6 + i * 0.56, 0); world.add(lb);
        void bot;
      });
    },
    onTick: (s) => { anim.forEach(m => { const p = Math.min(1, Math.max(0, (s - m.userData.d) / 0.8)); const e = 1 - Math.pow(1 - p, 3); m.scale.setScalar(0.01 + 0.99 * e); }); }
  });
}

/** Spiral rantai OBE: nodes = [{t, n, c}] */
function mountOrbit0(canvas, nodes) {
  const balls = [];
  return engine(canvas, {
    cam: [0, 1.5, 11],
    build: ({ THREE, world }) => {
      const pts = [];
      nodes.forEach((nd, i) => {
        const a = i * 0.62, y = 3 - i * (6 / Math.max(1, nodes.length - 1)), r = 2.6;
        const p = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r); pts.push(p);
        const size = 0.18 + Math.min(1, Math.log10(1 + nd.n) / 3) * 0.32;
        const m = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 32), new THREE.MeshStandardMaterial({ color: new THREE.Color(nd.c), roughness: 0.25, metalness: 0.2, emissive: new THREE.Color(nd.c), emissiveIntensity: 0.35 }));
        m.position.copy(p); world.add(m); balls.push(m);
        const lb = label(THREE, `${nd.t} (${nd.n})`, '#ffffff', 44); lb.position.set(p.x, p.y + size + 0.28, p.z); world.add(lb);
      });
      const curve = new THREE.CatmullRomCurve3(pts);
      world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.025, 8, false), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })));
    },
    onTick: (s) => { balls.forEach((b, i) => { const k = 1 + Math.sin(s * 2 + i) * 0.06; b.scale.setScalar(k); }); }
  });
}

export async function mountHero(canvas, ...a) { await muatThree(); if (!canvas || !canvas.isConnected) return; return mountHero0(canvas, ...a); }
export async function mountPyramid(canvas, ...a) { await muatThree(); if (!canvas || !canvas.isConnected) return; return mountPyramid0(canvas, ...a); }
export async function mountOrbit(canvas, ...a) { await muatThree(); if (!canvas || !canvas.isConnected) return; return mountOrbit0(canvas, ...a); }