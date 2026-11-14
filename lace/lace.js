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
import { lines } from './lines.js?v=3';
import { enter as enterPage } from './enter.js?v=5';

const { gsap, Lenis } = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;


const foot = document.querySelector('.foot');

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

// --- About ----------------------------------------------------------------------
// The butterfly lands on the layout's [data-perch-on]: its perch is set from
// that element's untransformed box, so it holds at any width.
const about = document.querySelector('.about'), aboutPerch = about.querySelector('.perch');
function placePerch() {
  const el = about.querySelector('[data-perch-on]');
  let x = el.offsetWidth / 2, y = el.offsetHeight / 2;
  for (let n = el; n && n !== about; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  aboutPerch.style.left = x + 'px'; aboutPerch.style.top = y + 'px';
}
placePerch(); addEventListener('resize', placePerch);

// deck: the trip photos as a stack of prints. Clicking the top one throws it
// off to the left and slips it under the others; the rest move up a place.
const deck = about.querySelector('.deck');
if (deck) {
  const cards = [...deck.querySelectorAll('.deck__card')].reverse();     // top first
  const turns = [-1.5, 4, -6, 2, 5, -4, 3];
  let shown = 0;
  const lay = (instant) => cards.forEach((c, d) => {
    c.style.zIndex = cards.length - d;
    c.tabIndex = d ? -1 : 0;
    gsap.to(c, { x: d * 7.6, y: d * 7.6, rotation: turns[(d + shown) % turns.length], scale: 1 - d * .025, opacity: d > 3 ? 0 : 1,
      duration: instant || reduce ? 0 : .55, ease: 'power3.out' });
  });
  lay(true);
  deck.addEventListener('click', (e) => {
    const top = cards[0];
    if (!top.contains(e.target) || gsap.isTweening(top)) return;
    shown = (shown + 1) % cards.length;
    gsap.to(top, { x: -260, y: -30, rotation: -16, duration: reduce ? 0 : .32, ease: 'power2.in', onComplete: () => { cards.push(cards.shift()); lay(); cards[0].focus({ preventScroll: true }); } });
  });
}

// --- the page: a plain vertical scroll, smoothed --------------------------------
// lerp: how much of the way to the target the page moves each frame (Lenis'
// default is .1); lower glides longer. Values from her tuning, 2026-11-04.
const lenis = new Lenis({ autoRaf: false, lerp: .05, wheelMultiplier: 1, touchMultiplier: 1.3 });
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

const heroText = [...document.querySelectorAll('.hero .line, .hero .intro')];

// --- the About statements: they rise in line by line from behind a mask as
// they come up the screen (lines.js); the About me pill follows the last line.
const sayPill = about.querySelector('.about__text .pill');
if (sayPill && !reduce) gsap.set(sayPill, { opacity: 0, translate: '0 12px' });   // translate, not transform: the hover owns that
const says = [...about.querySelectorAll('.about__say')];
lines(says, { after: (p) => { if (p === says[says.length - 1] && sayPill) gsap.to(sayPill, { opacity: 1, translate: '0 0px', duration: .8, ease: 'power3.out', delay: .1, clearProps: 'translate' }); } });

// --- the services band ----------------------------------------------------------
// One big line of the services running across the page. It drifts on its
// own; scrolling speeds it up and turns it the way the page is going.
const BAND = { speed: 85, boost: .5, max: 680 };          // px a second
const track = document.querySelector('.band__track');
track.innerHTML += track.innerHTML;                       // the words twice, so the line can loop
let runX = 0, runDir = 1, runVel = 0, runY = null;
function rollBand(dt) {
  const y = lenis.scroll;
  if (runY !== null && Math.abs(y - runY) > .5) runDir = Math.sign(y - runY);
  if (runY !== null) runVel += (Math.abs(y - runY) / Math.max(dt, .001) - runVel) * Math.min(1, dt * 8);
  runY = y;
  if (reduce) return;
  const half = track.scrollWidth / 2;
  runX = ((runX + (BAND.speed + Math.min(BAND.max, runVel * BAND.boost)) * runDir * dt) % half + half) % half;
  track.style.transform = `translate3d(${-runX}px, 0, 0)`;
}

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
  rollWorks(dt);
  rollStage(dt);
  rollBand(dt);
  rollFoot();
  // the hero's text fades as it nears the menu, so the two never overlap
  for (const el of heroText) { const r = el.getBoundingClientRect(); el.style.opacity = Math.min(1, Math.max(0, (r.top - 80) / (F.H * .3))); }
});

// the Projects menu: opens on click (and on hover with a mouse), the panel
// unrolls from the top and its rows come in one after another; Escape, a
// click outside or leaving it closes it
{
  const drop = document.querySelector('.drop'), btn = drop.querySelector('.drop__btn'), panel = drop.querySelector('.drop__panel');
  const st = { p: 0 }, paint = () => { panel.style.clipPath = `inset(0% 0% ${((1 - st.p) * 100).toFixed(2)}% 0% round 20px)`; panel.style.transform = `translateY(${(-6 * (1 - st.p)).toFixed(2)}px)`; };
  const rows = panel.querySelectorAll('li');
  let open = false, leave = 0;
  function set(o) {
    if (o === open) return;
    open = o; drop.classList.toggle('open', o); btn.setAttribute('aria-expanded', o);
    gsap.killTweensOf([panel, rows]);
    if (o) {
      panel.hidden = false;
      // one value, 0 shut … 1 open, drives the unroll both ways, so a close that
      // interrupts an open (or the reverse) runs back from where it is
      gsap.to(st, { p: 1, duration: reduce ? 0 : .55, ease: 'power3.out', overwrite: true, onUpdate: paint });
      gsap.fromTo(rows, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduce ? 0 : .4, ease: 'power2.out', stagger: .05, delay: .08 });
    } else {
      gsap.to(st, { p: 0, duration: reduce ? 0 : .3, ease: 'power2.in', overwrite: true, onUpdate: paint, onComplete: () => { if (!open) panel.hidden = true; } });
    }
  }
  // with a mouse the hover already opened it: a click keeps it open instead of
  // shutting it under the pointer; touch and keyboard toggle as before
  btn.addEventListener('click', () => set(drop.matches(':hover') && matchMedia('(hover: hover) and (pointer: fine)').matches ? true : !open));
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  drop.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mouse.matches) { clearTimeout(leave); set(true); } });
  drop.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && mouse.matches) leave = setTimeout(() => set(false), 220); });
  // landing on another tab closes it at once, so two pills never show together
  for (const t of document.querySelectorAll('.top .tab')) if (!drop.contains(t)) t.addEventListener('pointerenter', () => { if (open) { clearTimeout(leave); set(false); } });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { set(false); btn.focus(); } });
  addEventListener('pointerdown', (e) => { if (open && !drop.contains(e.target)) set(false); });
}

// Selected projects, as on her reference (ilyamadzichynau.com): the cards ride
// a drum. The one in the middle of the screen is full size and holds there a
// moment before the next takes over; the others shrink a little, bend away
// round the drum and tip back. The first time the list comes up, the cards fly
// in from below, tipped right over. With a mouse, the top and bottom of the
// screen blur over the list, more the faster it scrolls.
{
  const h = document.querySelector('.work__h');
  gsap.set(h, { opacity: 0, y: reduce ? 0 : 40 });
  const io = new IntersectionObserver((list) => {
    for (const e of list) if (e.isIntersecting) { io.unobserve(e.target); gsap.to(e.target, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }); }
  }, { rootMargin: '0px 0px -12% 0px' });
  io.observe(h);
}
const RIDE = {
  gap: -20, phoneGap: 0,                                   // cards a little closer than laid out
  curve: .16, perspective: 1400,                           // the drum
  tip: 12,                                                 // extra tip back away from the middle
  focus: { scale: 1.11, spread: 2, push: .6, straight: .52 },
  dwell: .2, follow: .5,                                   // how long a card holds, how softly the list follows
  enter: { at: .7, distance: 610, depth: -560, tip: 81, grow: .19, duration: .7, stagger: .1 },
  blur: { zone: .15, max: 16, speed: 16 },
};
const workSec = document.querySelector('.work'), workList = workSec.querySelector('.work__list');
const works = [...workList.children].map((li) => ({ li, shot: li.querySelector('.work__shot'), pic: li.querySelector('.work__pic'), cap: li.querySelector('.work__cap') }));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const sstep5 = (x) => { x = clamp(x, 0, 1); return x * x * x * (x * (6 * x - 15) + 10); };   // flatter at both ends
const erf = (x) => { const q = x * x, k = .147; return Math.sign(x) * Math.sqrt(1 - Math.exp(-q * (4 / Math.PI + k * q) / (1 + k * q))); };
const out3 = (x) => 1 - Math.pow(1 - x, 3);
const fine = matchMedia('(hover: hover) and (pointer: fine)');
let rows = [], cardH = 0, pitch = 0, follow = null, lastY = null, vel = 0;
const enter = { t: -1 };
function measureWorks() {
  const y = lenis.scroll;
  const keep = works.map((w) => w.li.style.transform);
  for (const w of works) w.li.style.transform = '';
  rows = works.map((w) => w.li.getBoundingClientRect().top + y);
  works.forEach((w, i) => { w.li.style.transform = keep[i]; });
  cardH = works[0].li.offsetHeight; pitch = rows[1] - rows[0];
}
addEventListener('resize', measureWorks);
new ResizeObserver(measureWorks).observe(workList);

// the blur at the screen's edges: six layers a side, each blurring twice as
// much as the one before over a narrower strip
const haze = document.createElement('div');
haze.className = 'haze'; haze.setAttribute('aria-hidden', 'true');
const zones = ['top', 'bottom'].map((side) => {
  const zone = document.createElement('div'); zone.className = `haze__zone haze__zone--${side}`;
  const pc = (i) => `${(i / 6 * 100).toFixed(2)}%`;
  const layers = Array.from({ length: 6 }, (_, i) => {
    const l = document.createElement('div'); l.className = 'haze__layer';
    const m = `linear-gradient(${side === 'top' ? 'to top' : 'to bottom'}, transparent ${pc(i)}, #000 ${pc(i + 1)}, #000 ${pc(i + 2)}, transparent ${pc(i + 3)})`;
    l.style.maskImage = l.style.webkitMaskImage = m; zone.append(l); return l;
  });
  haze.append(zone); return { side, zone, layers };
});
workSec.append(haze);
let hazeKey = '';
function setHaze(amount, top, bottom, zoneH) {
  const key = [amount.toFixed(1), Math.round(top), Math.round(bottom), Math.round(zoneH)].join('|');
  if (key === hazeKey) return; hazeKey = key;
  if (amount < .1 || top + bottom >= innerHeight) { haze.style.display = 'none'; return; }
  Object.assign(haze.style, { display: 'block', top: `${top}px`, bottom: `${bottom}px` });
  for (const { side, zone, layers } of zones) {
    zone.style.height = `${zoneH}px`;
    zone.style.top = side === 'top' ? `${-top}px` : '';
    zone.style.bottom = side === 'bottom' ? `${-bottom}px` : '';
    layers.forEach((l, i) => { const f = `blur(${(amount * 2 ** (i - 5)).toFixed(2)}px)`; l.style.backdropFilter = l.style.webkitBackdropFilter = f; });
  }
}

function rollWorks(dt) {
  if (reduce) return;
  if (!rows.length) measureWorks();
  const y = lenis.scroll, H = innerHeight, mid = H / 2, n = works.length;
  if (lastY !== null) vel += (Math.abs(y - lastY) / Math.max(dt, .001) - vel) * Math.min(1, dt * 12);
  lastY = y;

  // which card is in the middle: a float index, held a moment at each card
  const at = (y + mid - (rows[0] + cardH / 2)) / pitch, i0 = clamp(at, 0, n - 1);
  const base = Math.min(Math.floor(i0), n - 2), fr = i0 - base, hold = .35 * RIDE.dwell;
  const want = base + fr + (sstep((fr - hold) / Math.max(.001, 1 - 2 * hold)) - fr) * RIDE.dwell;
  follow = follow === null ? want : follow + (want - follow) * (1 - Math.exp(-dt * (1 - RIDE.follow) * 30));
  const anchor = mid - (at - i0) * pitch;                  // the middle, until the list runs out

  const E = RIDE.enter;
  if (enter.t < 0 && rows[0] - y < H * E.at) gsap.to(enter, { t: E.duration + E.stagger * (n - 1), duration: E.duration + E.stagger * (n - 1), ease: 'none', startAt: { t: 0 } });

  const space = pitch + (innerWidth < 1024 ? RIDE.phoneGap : RIDE.gap), spread = Math.max(.05, RIDE.focus.spread) * space;
  const shrink = 1 - 1 / Math.max(1, RIDE.focus.scale);
  const push = (r) => r - RIDE.focus.push * (cardH / space) * shrink * (r - Math.sqrt(Math.PI) / 2 * spread * erf(r / spread));
  const bend = RIDE.curve * Math.PI / Math.max(1, H);
  workList.style.perspective = `${RIDE.perspective}px`;
  workList.style.perspectiveOrigin = `50% ${anchor - workList.getBoundingClientRect().top}px`;

  works.forEach(({ li, shot }, i) => {
    const r = (i - follow) * space, near = Math.exp(-((r / spread) ** 2));
    const sc = 1 - shrink * (1 - near), o = push(r), ang = o * bend;
    const ly = Math.sin(ang) / bend, lz = (1 - Math.cos(ang)) / bend;
    const m = clamp(o / mid, -1.5, 1.5), tip = RIDE.tip * Math.tanh(m * 6) * (1 - RIDE.focus.straight * near);
    const home = rows[i] - y + cardH / 2;
    const k = enter.t < 0 ? 0 : clamp((enter.t - i * E.stagger) / E.duration, 0, 1), go = out3(k), left = 1 - go;
    const grow = out3(clamp(k / E.grow, 0, 1));
    li.style.visibility = go <= 0 ? 'hidden' : '';
    li.style.transform = `translate3d(0, ${anchor + ly - home + left * E.distance}px, ${lz - left * E.depth}px) rotateX(${ang * 180 / Math.PI + tip + left * E.tip}deg) scale(${Math.max(1e-4, sc * grow)})`;
  });

  const sec = workSec.getBoundingClientRect(), amount = RIDE.blur.max + RIDE.blur.speed * Math.min(1, vel / 2500);
  const top = Math.min(workList.getBoundingClientRect().top, works[0].li.getBoundingClientRect().top) - amount * 3;
  setHaze(fine.matches && sec.bottom > 0 && top < H ? amount : 0, Math.max(0, top), Math.max(0, H - sec.bottom), RIDE.blur.zone * H);
}

// The stage. Hero and About are calm; the projects are the show, so the
// lights go down for them: as About ends, the whole page fades from the
// paper colour to ink with the scroll (About fading with it, the projects'
// type coming up light), and before the footer the lights come back up.
// On the dark lies the page's dot grid again, in faint paper-coloured dots
// as on the footer, resting: the rings that used to run out from each project
// as it settled are off (2026-11-10, her call), the code is kept.
// The stage's grid is the page's at half the pitch: every other dot of it is
// one of the page's (those rest; the ones between only show in a ring).
const STAGE = {
  down: [.7, .3],                                         // the section's top, as a share of the screen: lights start … are down
  up: [.85, .3],                                          // its bottom: lights start … are up
  ease: .9,                                               // how much the lights lag the scroll each frame (0 = locked to it)
  dot: { r: .065, a: .1, grow: .3, glow: .5 },            // a resting dot (radius in page cells, alpha), and how much a lit one grows / brightens
  ripple: { life: 2.8, width: 70, speed: .12, peak: .7 },  // speed: share of the screen's diagonal a second; peak: how lit at most
  clear: 22,                                              // px kept free of the ring round the heading and each project's name
};
const stage = document.createElement('div');
stage.className = 'stage'; stage.setAttribute('aria-hidden', 'true');
document.querySelector('.gl').after(stage);              // over the butterfly, under the page
const field = document.createElement('canvas'), fq = field.getContext('2d');
stage.append(field);

let SF = { cols: 0, rows: 0, c: 0, x: 0, y: 0, pc: 0, cur: null };
function sizeField() {
  const dpr = Math.min(devicePixelRatio, 2), W = innerWidth, H = innerHeight;
  field.width = Math.round(W * dpr); field.height = Math.round(H * dpr);
  fq.setTransform(dpr, 0, 0, dpr, 0, 0);
  const c = F.c / 2, cols = F.cols * 2, rows = F.rows * 2;
  SF = { cols, rows, c, x: F.x - c / 2, y: F.y - c / 2, pc: F.cols, cur: new Float32Array(cols * rows) };
  field._rest = false;                                    // the canvas is blank again: draw the grid next frame
}
sizeField(); addEventListener('resize', () => requestAnimationFrame(sizeField));

const ripples = [], workHead = workSec.querySelector('.work__h');
let stageInk = false, lastLt = -1, settled = -1, ltS = 0;
const paper = [247, 247, 244], ink = [27, 27, 27];
function rollStage(dt) {
  const H = innerHeight, W = innerWidth, r = workSec.getBoundingClientRect(), D = STAGE.down, U = STAGE.up;
  const down = sstep5((D[0] * H - r.top) / ((D[0] - D[1]) * H)), up = sstep5((r.bottom - U[1] * H) / ((U[0] - U[1]) * H));
  // the lights follow the scroll with a little lag, so a fast flick still
  // dims and lifts them gently instead of snapping
  ltS += (Math.min(down, up) - ltS) * (1 - Math.pow(STAGE.ease, dt * 60));
  const lt = Math.round(ltS * 1000) / 1000;
  stageInk = lt > .6;
  if (lt !== lastLt) {
    lastLt = lt;
    stage.style.opacity = lt;
    stage.style.visibility = lt > 0 ? 'visible' : 'hidden';
    workSec.style.setProperty('--lt', sstep((lt - .25) / .5));         // the type turns from ink to paper round the middle
    const fade = r.top < H ? 1 - sstep((lt - .2) / .65) : 1;
    about.style.opacity = fade; gl.style.opacity = fade;               // the butterfly perched there goes with it
  }
  if (lt <= 0) return;
  if (SF.pc !== F.cols) sizeField();

  // a project has settled in the middle (the first one too, once the lights are down): send out a ring
  const n = works.length, f = clamp(follow ?? 0, 0, n - 1), near = Math.round(f);
  if (Math.abs(f - near) < .06 && near !== settled && lt > .7) {
    settled = near;
    const q = works[near].pic.getBoundingClientRect();
    // (no ring any more: she asked for the stage to stay still while scrolling)
    void q;
  }
  for (let k = ripples.length - 1; k >= 0; k--) { ripples[k].age += dt; if (ripples[k].age > STAGE.ripple.life) ripples.splice(k, 1); }

  // how lit each dot is: rings running out from the card's edge, never over the heading or the names
  const { cols, rows, c, x: ox, y: oy, cur } = SF, R = STAGE.ripple, Dt = STAGE.dot, diag = Math.hypot(W, H);
  const caps = [workHead, ...works.map((w) => w.cap)].map((e) => e.getBoundingClientRect()).filter((q) => q.bottom > -30 && q.top < H + 30);
  const ku = 1 - Math.pow(.6, dt * 60), kd = 1 - Math.pow(.85, dt * 60);
  let any = false;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i;
    let t = 0;
    if (ripples.length) {
      const px = ox + (i + .5) * c, py = oy + (j + .5) * c;
      for (const p of ripples) {
        const d = Math.hypot(Math.max(0, Math.abs(px - p.x) - p.w), Math.max(0, Math.abs(py - p.y) - p.h)), rad = p.age * diag * R.speed;
        t = Math.max(t, R.peak * Math.exp(-(((d - rad) / R.width) ** 2)) * (1 - p.age / R.life) ** 1.5);
      }
      if (t > 0) for (const q of caps) t *= clamp(Math.hypot(Math.max(0, q.left - px, px - q.right), Math.max(0, q.top - py, py - q.bottom)) / STAGE.clear, 0, 1);
    }
    if (t === 0 && cur[k] < .001) { cur[k] = 0; continue; }
    cur[k] += (t - cur[k]) * (t > cur[k] ? ku : kd);
    any = true;
  }
  if (!any && !ripples.length && field._rest) return;     // nothing moving: the resting grid is already drawn

  // draw: the resting grid and the lit dots, in paper, in a few strengths
  fq.clearRect(0, 0, W, H);
  const LV = 8, paths = Array.from({ length: LV }, () => new Path2D()), pc = c * 2;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = cur[j * cols + i], own = i & j & 1;         // own: one of the page's dots (odd row, odd column)
    if (v < .02 && !own) continue;                        // between them: only when lit
    const px = ox + (i + .5) * c, py = oy + (j + .5) * c, rr = (own ? pc * Dt.r : 0) + c * Dt.grow * 1.6 * v;
    if (rr < .25) continue;
    const p = paths[Math.min(LV - 1, Math.floor(v * LV))];
    p.moveTo(px + rr, py); p.arc(px, py, rr, 0, 6.2832);
  }
  fq.fillStyle = `rgb(${paper})`;
  paths.forEach((p, lv) => { fq.globalAlpha = Dt.a + Dt.glow * (lv / (LV - 1)); fq.fill(p); });
  fq.globalAlpha = 1;
  field._rest = !any && !ripples.length;
}

// Hovering a project's picture brings in its second picture the way the
// butterfly is drawn: in dots. They start where the pointer comes in and spread
// out over the card, each growing until they run together into the whole
// picture; leaving, they shrink back to where they began. Only the picture
// reacts. data-hover is the second picture, or a colour until there is one.
const DOTS = { cell: 16, soft: 150, in: .9, out: .6 };
for (const pic of document.querySelectorAll('.work__pic[data-hover]')) {
  const shot = pic.querySelector('.work__shot'), src = pic.dataset.hover;
  const cv = document.createElement('canvas'); cv.className = 'work__dots'; cv.setAttribute('aria-hidden', 'true');
  shot.append(cv);
  const ctx = cv.getContext('2d');
  let img = null;
  if (!src.startsWith('#')) { img = new Image(); img.decoding = 'async'; img.src = src; }
  const st = { k: 0 }, at = { x: 0, y: 0 };
  let W = 0, H = 0, far = 1, tw = null;
  function size() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = shot.offsetWidth; H = shot.offsetHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (st.k <= 0) return;
    const c = DOTS.cell, full = c * .72, front = st.k * (far + DOTS.soft);
    if (st.k >= 1) ctx.fillRect(0, 0, W, H);
    else {
      ctx.beginPath();
      for (let y = c / 2; y < H + c; y += c) for (let x = c / 2; x < W + c; x += c) {
        const d = Math.hypot(x - at.x, y - at.y), r = full * clamp((front - d) / DOTS.soft, 0, 1);
        if (r > .3) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
      }
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-in';
    if (img && img.complete && img.naturalWidth) {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    } else { ctx.fillStyle = img ? '#c4c4c4' : src; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000'; }
  }
  function local(e) {                                     // the pointer in the picture's own pixels
    const r = shot.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  pic.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || reduce) return;
    size();
    if (st.k <= .001) Object.assign(at, local(e));
    far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - at.x, y - at.y)));
    tw?.kill(); tw = gsap.to(st, { k: 1, duration: DOTS.in * (1 - st.k), ease: 'power2.out', onUpdate: draw });
  });
  pic.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    tw?.kill(); tw = gsap.to(st, { k: 0, duration: DOTS.out * st.k, ease: 'power2.in', onUpdate: draw });
  });
  if (img) img.addEventListener('load', () => { if (st.k > 0) draw(); });
}

// --- the pills: About me and Copy email ------------------------------------
// Hovering one, its label rolls up and a fresh copy rolls in from below; the
// round icon swells a little and About me's arrow runs out and back in (all
// CSS, on .is-on). Mouse and keyboard focus only: on touch a tap just goes.
for (const pill of document.querySelectorAll('.pill')) {
  for (const l of pill.querySelectorAll('[data-label]')) l.innerHTML = `<i>${l.textContent}</i>`;
  // the icon's run (.is-run, .7 s) always plays to the end, even if the pointer leaves halfway
  let run = 0;
  const on = () => { pill.classList.add('is-on'); if (run) return; pill.classList.add('is-run'); run = setTimeout(() => { pill.classList.remove('is-run'); run = 0; }, 750); };
  const off = () => pill.classList.remove('is-on');
  pill.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); });
  pill.addEventListener('pointerleave', off);
  pill.addEventListener('focus', () => { if (pill.matches(':focus-visible')) on(); });
  pill.addEventListener('blur', off);
}

// a pill's label rolls up and out and the new one rolls in from below; the
// pill eases to its new width
function relabel(pill, text) {
  const labels = pill.querySelectorAll('[data-label]'), w0 = pill.offsetWidth;
  if (reduce) { labels.forEach((l) => { (l.querySelector('i') || l).textContent = text; }); return; }
  gsap.to(labels, { yPercent: -110, opacity: 0, duration: .2, ease: 'power2.in', onComplete: () => {
    labels.forEach((l) => { (l.querySelector('i') || l).textContent = text; });
    const w1 = pill.offsetWidth;
    gsap.fromTo(pill, { width: w0 }, { width: w1, duration: .4, ease: 'power3.out', clearProps: 'width' });
    gsap.fromTo(labels, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .4, ease: 'power3.out', clearProps: 'transform,opacity' });
  } });
}

// Copy email: the address is copied, a faint copy of it lifts off the big
// email and softens away as it rises, the label turns to Copied and the
// icon's two sheets give way to a tick
const email = foot.querySelector('.foot__email');
function liftCopy() {
  if (reduce) return;
  const g = document.createElement('p');
  g.className = 'foot__ghost'; g.setAttribute('aria-hidden', 'true'); g.textContent = email.textContent;
  g.style.left = `${email.offsetLeft}px`; g.style.top = `${email.offsetTop}px`;
  foot.append(g);
  const h = email.offsetHeight;
  gsap.timeline({ onComplete: () => g.remove() })
    .fromTo(g, { y: 0, opacity: .35, filter: 'blur(0px)' }, { y: -h * .4, opacity: 0, filter: 'blur(6px)', duration: 1, ease: 'power2.out' }, 0);
}
for (const b of document.querySelectorAll('[data-copy]')) {
  const was = b.querySelector('[data-label]').textContent;
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); }
    catch { location.href = `mailto:${b.dataset.copy}`; return; }
    liftCopy();
    if (!b.classList.contains('copied')) relabel(b, 'Copied');
    b.classList.add('copied');
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.classList.remove('copied'); relabel(b, was); }, 2000);
  });
}
foot.querySelector('.foot__top').addEventListener('click', (e) => {
  e.preventDefault();
  lenis.scrollTo(0, { duration: reduce ? 0 : 2 });
});

// The footer comes in as the lights come back up: while the stage is still
// dark behind it, its type stays faint, so it is never ink on ink.
let footLt = -1;
function rollFoot() {
  document.body.classList.toggle('on-ink', stageInk);
  if (lastLt === footLt) return;
  footLt = lastLt;
  const k = 1 - sstep5(lastLt / .45);
  foot.style.opacity = k;
  foot.style.transform = k < 1 ? `translateY(${(1 - k) * 40}px)` : '';
}

// Odesa time on a 12-hour clock, as in her frame: 1:10:12 PM GMT+2
const clocks = document.querySelectorAll('.clock time, time[data-clock]');
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'shortOffset' });
function tick() {
  const now = new Date(), text = fmt.format(now).replace(/ | /g, ' ');
  for (const clock of clocks) { clock.textContent = text; clock.dateTime = now.toISOString(); }
}
tick(); setInterval(tick, 1000);

// the intro waits for the loader (loader.js) when there is one; after the
// Flight the butterfly is already on its perch
(window.__loaded || Promise.resolve('first')).then((mode) => {
  const d = mode === 'first' ? .5 : mode === 'instant' ? .1 : .3;
  if (mode === 'instant') intro.k = 1; else gsap.to(intro, { k: 1, duration: 1.8, ease: 'expo.out', delay: d - .3 });
});
// the first screen comes in as on every page (enter.js): the menu, then the
// line and the intro float up
enterPage({ title: ['.hero .line', '.hero .intro'], wait: window.__loaded || Promise.resolve() });
