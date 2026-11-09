// The home loader's flight (her storyboard 898:224, "E · Flight"). The butterfly is the progress bar: small, flapping fast, it
// flies across the screen from left to right as the page loads, banking with
// its path and leaving a fading trail of lace dots (cells grow fast and
// shrink slowly, as on the home page). At 100 % it turns, climbs in an arc,
// grows to full size and lands on its perch in the hero; the page appears
// around it.
import { lace, butterfly } from './field.js?v=1';
const { gsap } = window, L = window.LOADER;
if (L) {
const el = L.el, cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), pct = el.querySelector('.ld__pct');
const S = 4, mask = document.createElement('canvas'), m = mask.getContext('2d', { willReadFrequently: true });
const F = {};
function size() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio, 2), phone = W < 760;
  const bw = phone ? W * .94 : Math.min(W * .472, H * .756), c = bw / 40, cols = Math.ceil(W / c) + 1, rows = Math.ceil(H / c) + 1;
  Object.assign(F, { W, H, dpr, bw, c, cols, rows, x: (W - cols * c) / 2, y: (H - rows * c) / 2, cur: new Float32Array(cols * rows), tgt: new Float32Array(cols * rows) });
  cv.width = W * dpr; cv.height = H * dpr; mask.width = cols * S; mask.height = rows * S;
}
size(); addEventListener('resize', size);
const side = () => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;width:var(--side)'; el.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w; };
const pad = side();
const perch = document.querySelector('.hero .perch');
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));   // the shorter way round

// where it is: x, y (px), s (share of the hero size), rot (radians, 0 = head up)
const B = { x: -F.bw * .2, y: F.H * .56, s: .2, rot: Math.PI / 2, open: 1 };
let t = 0, last = performance.now(), live = true, cruising = true, beat = 13, beatAmp = 1;
function shape() {
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, mask.width, mask.height);
  m.filter = `blur(${S * .8}px)`; m.fillStyle = '#000'; m.strokeStyle = '#000';
  const k = S / F.c, u = F.bw / 2 * B.s;
  m.setTransform(k, 0, 0, k, -F.x * k, -F.y * k);
  m.translate(B.x, B.y); m.rotate(B.rot); m.scale(u, u); butterfly(m, B.open);
  const d = m.getImageData(0, 0, mask.width, mask.height).data;
  for (let j = 0; j < F.rows; j++) for (let i = 0; i < F.cols; i++) F.tgt[j * F.cols + i] = d[((j * S + S / 2) * mask.width + i * S + S / 2) * 4 + 3] / 255;
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
  if (cruising) {
    // across the page as the progress goes, on a loose wave, nose along the path
    const tx = pad + (F.W - pad * 2) * L.p, ty = F.H * .56 + Math.sin(t * 1.9) * F.H * .05 + Math.sin(t * 3.7) * F.H * .015;
    const px = B.x, py = B.y, k = 1 - Math.pow(.9, dt * 60);
    B.x += (tx - B.x) * k; B.y += (ty - B.y) * k;
    const vx = B.x - px, vy = B.y - py;
    if (Math.hypot(vx, vy) > .3) B.rot += wrap(Math.atan2(vy, vx) + Math.PI / 2 - B.rot) * (1 - Math.pow(.85, dt * 60));
  }
  B.open = 1 - beatAmp * (.5 - .5 * Math.cos(t * beat));      // wings beat; slower and shallower as it lands
  shape();
  const f = dt * 60, ku = 1 - Math.pow(.65, f), kd = 1 - Math.pow(.95, f);
  for (let n = 0; n < F.cur.length; n++) { const a = F.tgt[n], b = F.cur[n]; F.cur[n] = b + (a - b) * (a > b ? ku : kd); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
  lace(ctx, F.cur, F.cols, F.rows, { c: F.c, x: F.x, y: F.y }, '#141414');
  if (live) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

L.on((p) => { pct.textContent = Math.round(p * 100) + '%'; });
await L.done;

// the landing: it turns back, swoops low across the page and rises onto the
// perch, so it arrives head up, the way it sits in the hero
cruising = false;
const r = perch.getBoundingClientRect(), p0 = { x: B.x, y: B.y }, p1 = { x: F.W * .62, y: F.H * .95 }, p2 = { x: r.left, y: r.top };
const fly = { q: 0 };
let prev = { x: B.x, y: B.y };
gsap.timeline()
  .to(el.querySelectorAll('.ld__name, .ld__pct'), { opacity: 0, duration: .4 }, 0)
  .to(fly, { q: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: () => {
    const q = fly.q, a = (1 - q) * (1 - q), b = 2 * (1 - q) * q, c = q * q;
    B.x = a * p0.x + b * p1.x + c * p2.x; B.y = a * p0.y + b * p1.y + c * p2.y;
    B.s = .2 + .8 * gsap.parseEase('power2.in')(q);
    const vx = B.x - prev.x, vy = B.y - prev.y; prev = { x: B.x, y: B.y };
    const heading = Math.atan2(vy, vx) + Math.PI / 2, settle = gsap.utils.clamp(0, 1, (q - .75) / .25);
    const aim = heading + wrap(0 - heading) * settle;             // head up as it lands
    B.rot += wrap(aim - B.rot) * .25;
  } }, 0)
  .to({}, { duration: 1.6, onUpdate() { const q = this.progress(); beat = 13 - 8 * q; beatAmp = 1 - .55 * q; } }, 0)
  .add(() => L.finish('instant'), 1.6)
  .to(el, { opacity: 0, duration: .55, ease: 'power1.inOut' }, 1.6)
  .add(() => { live = false; el.remove(); });
}
