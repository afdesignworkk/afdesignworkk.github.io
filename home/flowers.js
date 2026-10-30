/* The flower bed (index.html): a row of butter-jelly
   flowers (daisies, five-petal blossoms, tulips, buds, a few leaves) growing
   up out of the hero's bottom edge into the band under her intro (the jelly:
   windowgl.js, see-through, her grid bent through it, ripples, caustics, an
   air bubble in each head). Every shape is drawn soft into a mask and added
   together, so where two meet they run into each other like jelly.
   They sway; the pointer brushes them aside as it passes and they swing
   back; pull a flower by its head and it bends and stretches after you,
   then springs back; a click pokes.
   home.js lays it out with the hero, grows the flowers in after the words
   and tells it how far the hero has gone as the page scrolls (all gone:
   nothing is drawn). The canvas covers only the bottom of the hero, the room
   the flowers have and a little over for pulling; everything here is in the
   hero's own pixels, turned into the screen's where the canvas is now. */
import {view, RIPPLES, BUBBLES} from './windowgl.js?v=2';

const {gsap} = window;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = s => document.querySelector(s);

const hero = q('.hero'), canvas = q('.bed'), info = q('.info');
/* the canvas lies this far out past the hero's sides (and below it), so the jelly's soft edge never shows */
const OUT = 80;
const jelly = view(canvas);
if (!jelly) canvas.remove();
/* the hero's jelly */
const V = {
  bevelW: .5, bevelH: 60, wobble: .16, wobbleSpeed: .24, swell: .2,
  light: '#fdefb8', body: '#f8df8e', deep: '#ebc765', rimColour: '#a3823a', dens: 1, milk: 0, glow: .16,
  bend: 26, grid: .24, caustic: .42, causticSize: 1.2, causticSpeed: .45, bubbles: 1, bubbleSize: 1.16,
  spec: .78, sharp: 90, rim: .52, gather: .84,
  ripple: .45, rippleSpeed: 220, rippleWidth: .99, shimmer: .085,
  shadow: 1, shadowX: -3, shadowY: 6,
};
if (jelly) jelly.colours([V.light, V.body, V.deep, V.rimColour]);
const TH = .45;

/* where the canvas starts in the hero, and where the hero's corner is on the screen now */
let top0 = -OUT, gone = 0;
const O = {x: 0, y: 0};
function origin() {
  const c = canvas.getBoundingClientRect();
  O.x = c.left + OUT; O.y = c.top - top0;
  return c;
}

const ripples = new Float32Array(RIPPLES * 4), bubbles = new Float32Array(BUBBLES * 4);
let nextRipple = 0;
/* (x, y in the hero; kept where they are on the screen) */
function ripple(x, y, amp) {
  if (REDUCED || !jelly) return;
  ripples.set([x + O.x, y + O.y, gsap.ticker.time, amp], nextRipple * 4);
  nextRipple = (nextRipple + 1) % RIPPLES;
}

/* where a box is in the hero, with the words at rest (ignoring the way they rise in) */
const at = el => {
  let y = 0;
  for (let e = el; e && e !== hero; e = e.offsetParent) y += e.offsetTop;
  return {top: y, bottom: y + el.offsetHeight};
};

/* the bed: x (part of the width), how tall (part of the room), kind, size, leaf (-1 left,
   1 right, 0 none), lean; phones keep five */
const BED = [
  [.05, .4, 'bud', .8, 0, -.07],
  [.15, .84, 'daisy', 1, 1, .05],
  [.28, .55, 'tulip', .92, -1, -.04],
  [.41, 1, 'blossom', 1.05, 1, .04],
  [.555, .5, 'daisy', .84, -1, -.06],
  [.68, .9, 'tulip', 1, 1, .03],
  [.81, .62, 'blossom', .9, -1, .06],
  [.94, .8, 'daisy', .96, 0, -.04],
];
const PHONE = [[1, .12], [2, .34], [3, .55], [5, .76], [7, .92]];
let flowers = [], popped = REDUCED;

function place() {
  const W = hero.clientWidth, H = hero.clientHeight, small = W <= 760, base = H + 24;
  const u = small ? .62 : Math.min(1.15, Math.max(.72, W / 1440));
  /* the room above the bottom edge: the heads stay clear of the words */
  const ceiling = at(info).bottom + (small ? 40 : 56);
  const old = flowers;
  flowers = (small ? PHONE.map(([i, x]) => [x, ...BED[i].slice(1)]) : BED).map(([fx, fh, kind, size, leaf, lean], i) => {
    const R = 56 * u * size, was = old[i] || {};
    return {
      kind, R, leaf, lean, L: Math.max(70 * u, (base - ceiling - R) * fh), bx: fx * W, by: base, stem: 10 * u,
      th: was.th ?? lean, om: was.om ?? 0, st: was.st ?? 1, sv: was.sv ?? 0,
      grow: popped ? 1 : 0, bloom: popped ? 1 : 0, ph: was.ph ?? Math.random() * 6.3,
    };
  });
  /* the canvas: from a little above the words' foot (room to pull a head up) to past the bottom */
  top0 = Math.max(-OUT, Math.min(H - 240, ceiling - 140));
  canvas.style.setProperty('--bt', `${top0}px`);
}
/* where a flower's head is now */
const headOf = f => {
  const L = f.L * f.grow * f.st;
  return [f.bx + Math.sin(f.th) * L, f.by - Math.cos(f.th) * L];
};

/* ---- the mask: every shape filled white, softened (by its shadow, cast in from off the canvas)
   and added together, at half the size */
const K = 1 / 2;
const mc = document.createElement('canvas'), mx = mc.getContext('2d');
let shift = 0;
const X = x => (x + OUT) * K - shift, Y = y => (y - top0) * K;
/* an ellipse added to the current path, turned by a around its middle */
const oval = (x, y, rx, ry, a) => {
  mx.moveTo(X(x) + Math.cos(a) * rx * K, Y(y) + Math.sin(a) * rx * K);
  mx.ellipse(X(x), Y(y), rx * K, ry * K, a, 0, Math.PI * 2);
};

function drawFlowers() {
  flowers.forEach(f => {
    if (f.grow < .02) return;
    const L = f.L * f.grow * f.st, [hx, hy] = headOf(f);
    /* the stem bends most near the head */
    const cxp = f.bx + Math.sin(f.th * .3) * L * .5, cyp = f.by - Math.cos(f.th * .3) * L * .5;
    mx.lineCap = 'round';
    mx.lineWidth = f.stem * K;
    mx.beginPath();
    mx.moveTo(X(f.bx), Y(f.by));
    mx.quadraticCurveTo(X(cxp), Y(cyp), X(hx), Y(hy));
    mx.stroke();
    /* a leaf, part way up, pointing out and up */
    if (f.leaf && f.grow > .5) {
      const s = .42, g = Math.min(1, (f.grow - .5) * 2);
      const lx = (1 - s) ** 2 * f.bx + 2 * (1 - s) * s * cxp + s * s * hx;
      const ly = (1 - s) ** 2 * f.by + 2 * (1 - s) * s * cyp + s * s * hy;
      const a = -Math.PI / 2 + f.th * .5 + f.leaf * 1.0, len = f.R * .62 * g;
      mx.beginPath();
      oval(lx + Math.cos(a) * len * .92, ly + Math.sin(a) * len * .92, len, f.R * .24 * g, a);
      mx.fill();
    }
    /* the head, turned with the stem */
    const b = f.bloom, R = f.R * b;
    if (b < .03) return;
    const up = f.th - Math.PI / 2;
    mx.beginPath();
    if (f.kind === 'daisy') {
      for (let i = 0; i < 6; i++) {
        const a = up + i * Math.PI * 2 / 6;
        oval(hx + Math.cos(a) * R * .6, hy + Math.sin(a) * R * .6, R * .42, R * .28, a);
      }
      oval(hx, hy, R * .38, R * .38, 0);
    } else if (f.kind === 'blossom') {
      for (let i = 0; i < 5; i++) {
        const a = up + i * Math.PI * 2 / 5;
        oval(hx + Math.cos(a) * R * .58, hy + Math.sin(a) * R * .58, R * .4, R * .4, 0);
      }
      oval(hx, hy, R * .34, R * .34, 0);
    } else if (f.kind === 'tulip') {
      /* a cup of three petals, opening upward */
      const ux = Math.cos(up), uy = Math.sin(up), sx = -uy, sy = ux;
      oval(hx + ux * R * .12, hy + uy * R * .12, R * .62, R * .4, up);
      oval(hx + sx * R * .3 + ux * R * .02, hy + sy * R * .3 + uy * R * .02, R * .58, R * .3, up + .32);
      oval(hx - sx * R * .3 + ux * R * .02, hy - sy * R * .3 + uy * R * .02, R * .58, R * .3, up - .32);
      oval(hx - ux * R * .2, hy - uy * R * .2, R * .42, R * .46, up);
    } else {
      oval(hx + Math.cos(up) * R * .1, hy + Math.sin(up) * R * .1, R * .5, R * .36, up);
    }
    mx.fill();
  });
}

function maskOf() {
  shift = mc.width + 40;
  mx.globalCompositeOperation = 'source-over';
  mx.shadowColor = 'transparent';
  mx.fillStyle = '#000';
  mx.fillRect(0, 0, mc.width, mc.height);
  mx.globalCompositeOperation = 'lighter';
  mx.fillStyle = mx.strokeStyle = mx.shadowColor = '#fff';
  /* (on a phone the shapes are small, so softer edges would eat them) */
  mx.shadowBlur = hero.clientWidth <= 760 ? 3 : 5;
  mx.shadowOffsetX = shift;
  drawFlowers();
  return mc;
}

/* ---- touching (the pointer, in the hero) */
const P = {x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, vx: 0, on: 0, seen: false};
/* the nearest flower head, and how far from its edge */
function nearest(x, y) {
  let best = {p: null, e: Infinity};
  flowers.forEach(f => {
    const [hx, hy] = headOf(f), e = Math.hypot(x - hx, y - hy) - f.R * .95;
    if (f.bloom > .5 && e < best.e) best = {p: f, e};
  });
  return best;
}
const live = () => jelly && gone < .05;

let held = null, from = [0, 0], moved = false, lastWave = 0, last = [0, 0], lastMoveT = 0, cursor = false;
addEventListener('pointermove', e => {
  if (!jelly) return;
  origin();
  const x = e.clientX - O.x, y = e.clientY - O.y;
  const t = gsap.ticker.time, dt = Math.max(.008, t - lastMoveT);
  P.vx += ((x - P.x) / dt - P.vx) * .5;
  lastMoveT = t;
  P.x = x; P.y = y;
  if (!P.seen) { P.sx = P.x; P.sy = P.y; P.vx = 0; }
  P.seen = true;
  if (held) {
    if (Math.hypot(e.clientX - from[0], e.clientY - from[1]) > 4) moved = true;
    return;
  }
  const d = live() ? nearest(x, y).e : Infinity;
  /* (only its own cursor: the page's links keep theirs) */
  if ((d < 4) !== cursor) { cursor = d < 4; document.body.style.cursor = cursor ? 'grab' : ''; }
  if (d < 0 && t - lastWave > .14 && Math.hypot(x - last[0], y - last[1]) > 22) {
    ripple(x, y, .35);
    lastWave = t; last = [x, y];
  }
}, {passive: true});
document.addEventListener('pointerleave', () => { P.seen = false; P.vx = 0; });
addEventListener('pointerdown', e => {
  if (!live() || e.target.closest('a, button')) return;
  origin();
  const x = e.clientX - O.x, y = e.clientY - O.y;
  const {p, e: d} = nearest(x, y);
  if (!p || d > 4) return;
  e.preventDefault();
  held = p; from = [e.clientX, e.clientY]; moved = false;
  P.x = x; P.y = y;
  gsap.killTweensOf(p);
  p.grow = p.bloom = 1;
  document.documentElement.classList.add('is-grabbing');
  ripple(x, y, .7);
});
function letGo() {
  if (!held) return;
  const p = held;
  held = null;
  document.documentElement.classList.remove('is-grabbing');
  /* the springs take it back (see sway); a click is a poke */
  const [hx, hy] = headOf(p);
  if (moved) gsap.delayedCall(.15, () => ripple(hx, hy, .8));
  else { ripple(P.x, P.y, 1.1); if (!REDUCED) { p.om += (Math.random() < .5 ? -1 : 1) * 2.2; p.sv -= 1.2; } }
}
addEventListener('pointerup', letGo);
addEventListener('pointercancel', letGo);

/* the springs: each leans where it likes, sways a little, leans away from the pointer and is
   swung along by it as it passes; held, it bends and stretches after the pointer */
function sway(t, dt) {
  P.vx *= Math.exp(-dt * 6);
  flowers.forEach(f => {
    const [hx, hy] = headOf(f);
    /* (long stems swing through a smaller angle, so their heads move about as far) */
    const amp = Math.min(1, 240 / f.L);
    let want = f.lean + amp * (.045 * Math.sin(t * .8 + f.ph) + .025 * Math.sin(t * 1.7 + f.ph * 2)), k = 38, stretch = 1;
    if (f === held) {
      const dx = P.x - f.bx, dy = f.by - P.y;
      want = Math.max(-1, Math.min(1, Math.atan2(dx, dy)));
      const s = Math.hypot(dx, dy) / f.L;
      stretch = 1 + Math.max(-.12, Math.min(.2, (s - 1) * .5));
      k = 140;
    } else if (P.seen && gone < .5) {
      /* how near the pointer is to the flower (head or stem), and how high up it touches */
      const ex = hx - f.bx, ey = hy - f.by, len2 = ex * ex + ey * ey || 1;
      const up = Math.max(0, Math.min(1, ((P.x - f.bx) * ex + (P.y - f.by) * ey) / len2));
      const d = Math.min(Math.hypot(P.x - hx, P.y - hy) - f.R * .6, Math.hypot(P.x - f.bx - ex * up, P.y - f.by - ey * up));
      const near = Math.max(0, 1 - d / (f.R * 1.4)) * (.35 + .65 * up);
      want -= Math.sign(P.x - (f.bx + ex * up)) * .4 * near * amp;
      f.om += Math.max(-2500, Math.min(2500, P.vx)) * .02 * near * amp * dt;
    }
    if (REDUCED) { f.th = f === held ? want : f.lean; f.st = stretch; return; }
    f.om += (-k * (f.th - want) - 3.2 * f.om) * dt;
    f.th += f.om * dt;
    f.sv += (-90 * (f.st - stretch) - 5 * f.sv) * dt;
    f.st += f.sv * dt;
  });
}

function frame(t, dms) {
  if (!jelly || !flowers.length || gone >= 1) return;
  const c = origin();
  if (c.bottom < 0 || c.top > innerHeight) return;
  const dt = Math.min(dms / 1000, 1 / 30);
  P.sx += (P.x - P.sx) * .12; P.sy += (P.y - P.sy) * .12;
  sway(t, dt);
  const {e: d} = nearest(P.x, P.y);
  P.on += ((P.seen && !REDUCED && gone < .05 && (held || d < 90) ? 1 : 0) - P.on) * .08;
  jelly.mask(maskOf());
  /* an air bubble in the middle of each open flower */
  bubbles.fill(0);
  let i = 0;
  flowers.forEach(f => {
    if (i >= BUBBLES || f.bloom < .8 || f.kind === 'bud') return;
    const [hx, hy] = headOf(f);
    bubbles.set([hx + OUT, hy - top0, 2.4 + f.R * .05, f.ph], i++ * 4);
  });
  jelly.draw({
    time: REDUCED ? 8 : t, off: [c.left, c.top], th: TH, ptr: [P.sx + O.x, P.sy + O.y, P.on], ripples, bubbles, values: V,
    grid: innerWidth > 760 ? document.documentElement.clientWidth / 1440 : 0,
  });
}

function size() {
  if (!jelly) return;
  jelly.size(1.5);
  mc.width = Math.max(2, Math.round(canvas.clientWidth * K));
  mc.height = Math.max(2, Math.round(canvas.clientHeight * K));
}

/* they grow up and open one after another, each with a wave */
function enter(delay = 0) {
  popped = true;
  if (REDUCED) return;
  [...flowers.keys()].sort(() => Math.random() - .5).forEach((i, n) => {
    const f = flowers[i], when = delay + n * .09;
    gsap.to(f, {grow: 1, duration: 1.3, ease: 'power3.out', delay: when});
    gsap.to(f, {bloom: 1, duration: 1.4, ease: 'elastic.out(1, .42)', delay: when + .75,
      onStart: () => { const [hx, hy] = headOf(f); ripple(hx, hy, .6); }});
  });
}

let ticking = false;
export const bed = {
  /* with the hero at rest: place the flowers in the room the words leave */
  layout() {
    if (!jelly) return;
    place();
    size();
    if (!ticking) { ticking = true; gsap.ticker.add(frame); }
  },
  enter,
  /* already there (the page opened further down) */
  show() { popped = true; flowers.forEach(f => { f.grow = f.bloom = 1; }); },
  /* how far the hero has gone (0 – 1) */
  set gone(v) { gone = v; },
};
