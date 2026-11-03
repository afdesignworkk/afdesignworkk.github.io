// Home · Lace: the hero, then About below it, and the lace butterfly
// flying from one to the other as the page scrolls.
//
// The whole screen is one fixed grid of dot cells (17 px at 1440 × 900).
// Each frame the butterfly is painted, blurred, into a small mask at its
// place on screen and every cell reads how deep inside it is; cells grow
// fast and shrink slowly, so when it flies it leaves a trail of small dots.
// Cells it covers draw as lace on the top canvas; the rest are the faint
// background dots, which swell as a ring of air passes (one a wingbeat).
//
// Each section has a perch (in About, on the waves polaroid). The scroll position
// between two perches decides where the butterfly is on its way from one to
// the next: it rides up with the first a little, swings out to the side in
// an arc, and lands on the next.
import { lace, butterfly } from './field.js?v=1';

const { gsap, Lenis } = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- the dot field over the whole screen --------------------------------------
const S = 4;                                            // mask pixels a cell
const gl = document.querySelector('.gl'), ctx = gl.getContext('2d');
const bg = document.querySelector('.bg'), bctx = bg.getContext('2d');
const mask = document.createElement('canvas'), m = mask.getContext('2d', { willReadFrequently: true });
const F = { W: 0, H: 0, dpr: 1, bw: 0, c: 10, cols: 0, rows: 0, x: 0, y: 0, cur: null, tgt: null, sw: null };

function size() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio, 2), phone = W < 760;
  const bw = phone ? W * .94 : Math.min(W * .472, H * .756);   // the hero butterfly's width: 40 cells
  const c = bw / 40, cols = Math.ceil(W / c) + 1, rows = Math.ceil(H / c) + 1;
  Object.assign(F, { W, H, dpr, bw, c, cols, rows, x: (W - cols * c) / 2, y: (H - rows * c) / 2,
    cur: new Float32Array(cols * rows), tgt: new Float32Array(cols * rows), sw: new Float32Array(cols * rows) });
  for (const cv of [gl, bg]) { cv.width = W * dpr; cv.height = H * dpr; }
  mask.width = cols * S; mask.height = rows * S;
}
size(); addEventListener('resize', size);

// paint the butterfly at (x, y) on screen, `s` times the hero size
function shape(x, y, s, rot, open) {
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, mask.width, mask.height);
  m.filter = `blur(${S * .8}px)`; m.fillStyle = '#000'; m.strokeStyle = '#000'; m.globalCompositeOperation = 'source-over';
  const k = S / F.c, u = F.bw / 2 * s;
  m.setTransform(k, 0, 0, k, -F.x * k, -F.y * k);
  m.translate(x, y); m.rotate(rot); m.scale(u, u);
  if (s > .01) butterfly(m, open);
  const d = m.getImageData(0, 0, mask.width, mask.height).data, { cols, rows, tgt } = F;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) tgt[j * cols + i] = d[((j * S + S / 2) * mask.width + i * S + S / 2) * 4 + 3] / 255;
}

function step(dt) {
  const f = dt * 60, ku = 1 - Math.pow(.65, f), kd = 1 - Math.pow(.935, f), { cur, tgt } = F;
  for (let n = 0; n < cur.length; n++) { const t = tgt[n], c = cur[n]; cur[n] = c + (t - c) * (t > c ? ku : kd); }
}

const rings = [];                                       // { age, x, y, s }: rings of air
function draw(dt, fade) {
  const { W, H, dpr, c, cols, rows, x, y, cur, sw } = F;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, gl.width, gl.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lace(ctx, cur, cols, rows, { c, x, y }, '#141414');

  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, bg.width, bg.height);
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.fillStyle = '#141414';
  for (let k = rings.length - 1; k >= 0; k--) { rings[k].age += dt; if (rings[k].age > 3.2) rings.splice(k, 1); }
  const ku = 1 - Math.pow(.7, dt * 60), kd = 1 - Math.pow(.95, dt * 60), reach = Math.hypot(W, H) * .6;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const n = j * cols + i;
    if (cur[n] > .03) { sw[n] = 0; continue; }          // the butterfly draws here
    const px = x + (i + .5) * c, py = y + (j + .5) * c;
    let tgt = 0;
    for (const r of rings) {
      const d = Math.hypot(px - r.x, py - r.y), R = 60 * r.s + r.age * 340 * (.5 + r.s * .5);
      tgt = Math.max(tgt, Math.exp(-(((d - R) / 70) ** 2)) * (1 - r.age / 3.2) ** 1.5 * (.4 + r.s * .6));
    }
    sw[n] += (tgt - sw[n]) * (tgt > sw[n] ? ku : kd);
    const v = sw[n], dc = Math.hypot(px - W / 2, py - H * .45);
    bctx.globalAlpha = Math.min(1, (.16 + v * .5) * (1 - .55 * Math.min(1, dc / reach)) * fade);
    bctx.beginPath(); bctx.arc(px, py, c * (.065 + v * .16), 0, 6.2832); bctx.fill();
  }
  bctx.globalAlpha = 1;
}

// --- the polaroids in About ---------------------------------------------------
// Two prints placed by CSS (her frame). As they scroll through the screen
// they drift a little against the page (by depth) and turn a touch; hovering
// one lifts it. The butterfly lands on the photo of the first (waves): its
// perch is set from that card's untransformed box, so it holds at any width.
const about = document.querySelector('.about'), aboutPerch = about.querySelector('.perch');
const pols = [...about.querySelectorAll('.pol')].map((el) => {
  const p = { el, lift: 0, hover: false, d: +getComputedStyle(el).getPropertyValue('--d') || .2 };
  el.addEventListener('pointerenter', () => { p.hover = true; }); el.addEventListener('pointerleave', () => { p.hover = false; });
  return p;
});
function placePerch() {
  const el = pols[0].el, abs = getComputedStyle(el).position === 'absolute';
  const cx = el.offsetLeft + (abs ? 0 : el.offsetWidth / 2), cy = el.offsetTop + (abs ? 0 : el.offsetHeight / 2);
  const img = el.querySelector('img'), photoCy = img.offsetTop + img.offsetHeight / 2 - el.offsetHeight / 2;
  aboutPerch.style.left = cx + 'px'; aboutPerch.style.top = cy + photoCy + 'px';
}
placePerch(); addEventListener('resize', placePerch);

function movePols(dt) {
  const H = innerHeight, k = 1 - Math.pow(.82, dt * 60);
  for (const c of pols) {
    c.lift += ((c.hover ? 1 : 0) - c.lift) * k;
    const r = c.el.getBoundingClientRect(), off = (r.top + r.height / 2 - H / 2) / H;   // −… above the middle, +… below
    const abs = getComputedStyle(c.el).position === 'absolute';
    const base = abs ? 'translate(-50%, -50%) ' : '';
    c.el.style.transform = `${base}translateY(${off * c.d * 120 - c.lift * 10}px) rotate(calc(var(--r) * ${1 - c.lift * .5} + ${off * c.d * 6}deg)) scale(${1 + c.lift * .03})`;
    c.el.style.zIndex = c.lift > .05 ? 3 : '';
  }
}

// --- the page: a plain vertical scroll, smoothed --------------------------------
const lenis = new Lenis({ autoRaf: false });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

let perches = [];
const maxTy = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);

// perches, in page coordinates; `settle` = the scroll at which the butterfly
// sits on it (its perch is then `at` of the way down the screen)
function measure() {
  const max = maxTy(), sy = scrollY;
  let last = -1;
  perches = [...document.querySelectorAll('.perch')].map((el) => {
    const r = el.getBoundingClientRect(), x = r.left, y = r.top + sy;
    const settle = Math.max(last + 1, Math.min(max, Math.max(0, y - (+el.dataset.at || 0) * innerHeight)));
    last = settle;
    return { x, y, s: +el.dataset.scale || .5, settle };
  });
}
measure(); addEventListener('resize', measure); addEventListener('load', () => { placePerch(); measure(); });

const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);  // smootherstep
function target(ty) {
  const P = perches;
  let k = 0; while (k < P.length - 2 && ty >= P[k + 1].settle) k++;
  const a = P[k], b = P[k + 1] || a;
  const u = b === a ? 0 : Math.min(1, Math.max(0, (ty - a.settle) / (b.settle - a.settle)));
  const e = ease(Math.min(1, Math.max(0, (u - .12) / .76)));
  const arc = Math.sin(Math.PI * e), s = (a.s + (b.s - a.s) * e) * (1 - arc * .1);
  return {
    x: a.x + (b.x - a.x) * e - arc * F.W * .06,           // swings out a little to the side
    y: e > 0 && e < 1                                     // in flight it stays under the menu;
      ? Math.max((a.y - ty) + ((b.y - ty) - (a.y - ty)) * e, 96 + F.bw / 2 * s * .9)
      : (a.y - ty) + ((b.y - ty) - (a.y - ty)) * e,       // perched, it rides with the page
    s,
  };
}

const heroText = [...document.querySelectorAll('.hero .line, .hero .intro')], veil = document.querySelector('.veil');

// --- the butterfly -------------------------------------------------------------
const B = { x: 0, y: 0, s: 1, rot: 0 };
{ const t0 = target(0); Object.assign(B, t0); }
let phase = 0, t = 0;
const intro = { k: 0 };
gsap.ticker.add((time, dms) => {
  const dt = Math.min(dms, 50) / 1000;
  t += dt;
  const ty = lenis.scroll, T = target(ty);
  const kf = 1 - Math.pow(.84, dt * 60);                  // a soft lag behind the scroll: it flies, it isn't dragged
  const px = B.x, py = B.y;
  B.x += (T.x - B.x) * kf; B.y += (T.y - B.y) * kf; B.s += (T.s - B.s) * kf;
  const vx = (B.x - px) / Math.max(dt, .001), vy = (B.y - py) / Math.max(dt, .001), speed = Math.hypot(vx, vy);
  B.rot += (Math.max(-.35, Math.min(.35, vx * .0004)) - B.rot) * (1 - Math.pow(.9, dt * 60));   // banks into the turn

  // flapping speed drifts and, sitting still, it now and then glides with
  // wings open; flying, it beats faster and never glides
  const fly = Math.min(1, speed / 250);
  const glide = Math.max(0, Math.sin(t * .23) - .55) / .45 * (1 - fly);
  const beat = Math.floor(phase / 6.2832);
  phase += dt * ((2.6 + Math.sin(t * .7) * .6) * (1 - glide * .92) + fly * 4) * (reduce ? 0 : 1);
  if (Math.floor(phase / 6.2832) > beat && intro.k > .9) rings.push({ age: 0, x: B.x, y: B.y, s: B.s });
  const open = Math.pow(.5 + .5 * Math.cos(phase), .75) * (1 - glide) + glide;

  const u = F.bw / 2 * B.s;
  shape(B.x, B.y + Math.sin(t * .8) * .035 * u, B.s * intro.k, B.rot + Math.sin(t * .37) * .05, open);
  step(dt);
  draw(dt, Math.min(1, intro.k));
  movePols(dt);
  rollWorks();
  veil.classList.toggle('on', ty > 40);
  // the hero's text fades as it nears the menu, so the two never overlap
  for (const el of heroText) { const r = el.getBoundingClientRect(); el.style.opacity = Math.min(1, Math.max(0, (r.top - 80) / (F.H * .3))) * Math.min(1, intro.k * 1.3); }
});

// the menu's About scrolls there smoothly
document.querySelector('.top a[href="#about"]').addEventListener('click', (e) => {
  e.preventDefault();
  lenis.scrollTo('#about', { duration: 1.6 });
});

// the Projects menu: opens on click (and on hover with a mouse), the panel
// unrolls from the top and its rows come in one after another; Escape, a
// click outside or leaving it closes it
{
  const drop = document.querySelector('.drop'), btn = drop.querySelector('.drop__btn'), panel = drop.querySelector('.drop__panel');
  const rows = panel.querySelectorAll('li');
  let open = false, leave = 0;
  function set(o) {
    if (o === open) return;
    open = o; drop.classList.toggle('open', o); btn.setAttribute('aria-expanded', o);
    gsap.killTweensOf([panel, rows]);
    if (o) {
      panel.hidden = false;
      gsap.fromTo(panel, { clipPath: 'inset(0% 0% 100% 0% round 20px)', y: -6 }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', y: 0, duration: reduce ? 0 : .55, ease: 'power3.out' });
      gsap.fromTo(rows, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduce ? 0 : .4, ease: 'power2.out', stagger: .05, delay: .08 });
    } else {
      gsap.to(panel, { clipPath: 'inset(0% 0% 100% 0% round 20px)', y: -6, duration: reduce ? 0 : .3, ease: 'power2.in', onComplete: () => { panel.hidden = true; } });
    }
  }
  btn.addEventListener('click', () => set(!open));
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  drop.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mouse.matches) { clearTimeout(leave); set(true); } });
  drop.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && mouse.matches) leave = setTimeout(() => set(false), 220); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { set(false); btn.focus(); } });
  addEventListener('pointerdown', (e) => { if (open && !drop.contains(e.target)) set(false); });
}

// Selected projects (Focus): the heading rises in once; then the list holds
// still on screen while the page scrolls through it. The project in the
// middle is open at full size; the others close into strips above and below
// it, a contents list. Scrolling closes the open one into a strip as the next
// one opens, each holding open a moment.
{
  const h = document.querySelector('.work__h');
  gsap.set(h, { opacity: 0, y: reduce ? 0 : 40 });
  const io = new IntersectionObserver((list) => {
    for (const e of list) if (e.isIntersecting) { io.unobserve(e.target); gsap.to(e.target, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }); }
  }, { rootMargin: '0px 0px -12% 0px' });
  io.observe(h);
}
const workSec = document.querySelector('.work'), workList = workSec.querySelector('.work__list');
const works = [...workList.children].map((li) => ({ li, pic: li.querySelector('.work__pic'), cap: li.querySelector('.work__cap') }));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
if (!reduce) workSec.classList.add('focus');
const FOC = { step: .7, strip: 88, phoneStrip: 64, narrow: .72, gap: 24, cap: 36 };
function rollWorks() {
  if (reduce) return;
  const y = lenis.scroll, H = innerHeight, n = works.length, phone = innerWidth < 760;
  const step = FOC.step * H, full = Math.min(818, workList.clientWidth), fullH = full * 416 / 818, strip = phone ? FOC.phoneStrip : FOC.strip;
  workList.style.height = `${(n - 1) * step + H}px`;
  const listTop = workList.getBoundingClientRect().top + y;
  const pin = clamp(y - listTop, 0, (n - 1) * step);
  // which card is open: a float index, eased so each one holds
  const raw = pin / step, base = Math.min(Math.floor(raw), n - 2), fr = raw - base;
  const v = base + sstep((fr - .15) / .7);
  const open = works.map((_, i) => sstep(1 - Math.abs(i - v)));
  const hs = open.map((o) => strip + (fullH - strip) * o);
  const tops = []; let acc = 0;
  hs.forEach((h, i) => { tops[i] = acc; acc += h + FOC.cap + FOC.gap; });
  // line the open point (between two cards' centres) up with the middle of the screen
  const ctr = (i) => tops[i] + (hs[i] + FOC.cap) / 2;
  const b = Math.min(Math.floor(v), n - 2), f = v - b;
  const shift = H / 2 - (ctr(b) + (ctr(b + 1) - ctr(b)) * f);
  works.forEach(({ li, pic, cap }, i) => {
    const o = open[i], w = full * (FOC.narrow + (1 - FOC.narrow) * o);
    li.style.width = `${w}px`;
    li.style.transform = `translate3d(-50%, ${pin + shift + tops[i]}px, 0)`;
    pic.style.height = `${hs[i]}px`;
    cap.style.opacity = .4 + .6 * o;
  });
}

// Odesa time on a 12-hour clock, as in her frame: 1:10:12 PM GMT+2
const clock = document.querySelector('.clock time');
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'shortOffset' });
function tick() {
  const now = new Date();
  clock.textContent = fmt.format(now).replace(/ | /g, ' ');
  clock.dateTime = now.toISOString();
}
tick(); setInterval(tick, 1000);

gsap.to(intro, { k: 1, duration: 1.8, ease: 'expo.out', delay: .2 });
gsap.from('.top, .hero .line, .hero .intro', { y: 8, duration: 1, ease: 'power2.out', stagger: .1, delay: .5 });
gsap.from('.top', { opacity: 0, duration: 1, ease: 'power2.out', delay: .5 });
