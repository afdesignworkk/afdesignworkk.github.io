/* Footer (her Figma home-page 617:262): the jelly pool and the word that
   changes. how.js brings the footer in.
     the pool  the hero's butter jelly (home/windowgl.js) filling the room
               under © and Back to top, from side to side and down past the
               bottom, her grid seen through it; slow swells move along its
               top so it never quite keeps one shape. Over it, it swells to the pointer and ripples where
               you move; a press pokes it; and when the footer lands, after
               coming at you, a wave runs through it
     the word  "Got a ___ in mind?": every few seconds the word goes up and
               out and the next comes up into its place, the line closing up
               or opening out round it
   The canvas is a little bigger than the footer, so the jelly's soft edge
   never shows; while the footer is still coming at you (how.js scales it)
   the pool is drawn the same, only smaller. Without motion the pool is
   still and the word stays "product". */
import {view, RIPPLES, BUBBLES} from './windowgl.js?v=1';

const {gsap} = window;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = (s, el = document) => el.querySelector(s);

const end = q('.end'), canvas = q('.end__jelly'), poolBox = q('.end__pool'), foot = q('.foot');
/* the canvas lies this far out past the footer on every side */
const OUT = 80;

const jelly = view(canvas);
if (!jelly) canvas.remove();
/* the hero's settings, the light inside a little calmer (the pool is mostly flat top) */
const V = {
  bevelW: .5, bevelH: 60, wobble: .16, wobbleSpeed: .24, swell: .2,
  light: '#fdefb8', body: '#f8df8e', deep: '#ebc765', rimColour: '#a3823a', dens: 1, milk: 0, glow: .16,
  bend: 26, grid: .24, caustic: .4, causticSize: 1.2, causticSpeed: .4, bubbles: 1, bubbleSize: 1.16,
  spec: .78, sharp: 90, rim: .52, gather: .84,
  ripple: .45, rippleSpeed: 220, rippleWidth: .99, shimmer: .085,
  shadow: 1, shadowX: -3, shadowY: 6,
};
if (jelly) jelly.colours([V.light, V.body, V.deep, V.rimColour]);
const TH = .45;

/* ripples are kept where they are on the canvas, so they go with the footer */
const rip = new Float32Array(RIPPLES * 4), ripples = new Float32Array(RIPPLES * 4), bubbles = new Float32Array(BUBBLES * 4);
let nextRipple = 0;
function ripple(x, y, amp, delay = 0) {
  if (REDUCED || !jelly) return;
  rip.set([x, y, gsap.ticker.time + delay, amp], nextRipple * 4);
  nextRipple = (nextRipple + 1) % RIPPLES;
}

/* the pool's shape, a third of the size: everything from its top down
   (past the canvas's sides, where the jelly fades out unseen) and swells
   along its top, each filled white, softened (by its shadow, cast in from
   off the canvas) and added together */
const K = 1 / 3, SOFT = 6;
const mc = document.createElement('canvas'), mx = mc.getContext('2d');
const SWELLS = [[.08, .7], [.3, .86], [.52, .62], [.74, .8], [.95, .66]];
const pool = {x: 0, y: 0, w: 0, h: 0};
function maskOf(t) {
  const off = mc.width + 40;
  mx.globalCompositeOperation = 'source-over';
  mx.shadowColor = 'transparent';
  mx.fillStyle = '#000';
  mx.fillRect(0, 0, mc.width, mc.height);
  mx.globalCompositeOperation = 'lighter';
  mx.fillStyle = '#fff';
  mx.shadowColor = '#fff'; mx.shadowBlur = SOFT; mx.shadowOffsetX = off;
  const {y, h} = pool, w = mc.width / K;
  mx.fillRect(-off, y * K, mc.width, mc.height);
  SWELLS.forEach(([f, r], i) => {
    const R = r * h, sx = w * (f + .03 * Math.sin(t * (.11 + .03 * i) + i * 2.3));
    const sy = y + R * .84 + h * .03 * Math.sin(t * .4 + i * 1.7);
    mx.beginPath();
    mx.arc(sx * K - off, sy * K, R * K, 0, Math.PI * 2);
    mx.fill();
  });
  return mc;
}

/* where the pool's top is, on the canvas (worked out again on resize), and a few air bubbles held in it */
function layout() {
  pool.x = OUT; pool.y = poolBox.offsetTop + OUT;
  pool.w = poolBox.offsetParent.offsetWidth; pool.h = poolBox.offsetHeight;
  if (jelly) {
    jelly.size();
    mc.width = Math.max(2, Math.round(canvas.clientWidth * K));
    mc.height = Math.max(2, Math.round(canvas.clientHeight * K));
  }
  bubbles.fill(0);
  const n = innerWidth <= 760 ? 4 : 8;
  for (let i = 0; i < n; i++) {
    bubbles.set([pool.x + pool.w * (i + .3 + .4 * Math.random()) / n, pool.y + pool.h * (.35 + .4 * Math.random()),
      i % 3 ? 2.2 + Math.random() : 3.5 + 1.5 * Math.random(), Math.random() * 6.3], i * 4);
  }
}

/* the pointer: over the pool it swells to it and ripples (once the footer is the page) */
const P = {x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, on: 0, seen: false};
let scale = 1, landed = false, lastMove = 0, last = [0, 0];
const toCanvas = (cx, cy) => { const c = canvas.getBoundingClientRect(); return [(cx - c.left) / scale, (cy - c.top) / scale]; };
const overPool = (px, py) => px > pool.x && px < pool.x + pool.w && py > pool.y - 40 && py < pool.y + pool.h;
addEventListener('pointermove', e => {
  P.x = e.clientX; P.y = e.clientY; P.seen = true;
  if (!landed) return;
  const [px, py] = toCanvas(e.clientX, e.clientY);
  if (!overPool(px, py)) return;
  const t = gsap.ticker.time, dist = Math.hypot(px - last[0], py - last[1]);
  if (t - lastMove > .14 && dist > 22) { ripple(px, py, .35); lastMove = t; last = [px, py]; }
}, {passive: true});
document.addEventListener('pointerleave', () => { P.seen = false; });
end.addEventListener('pointerdown', e => {
  if (!landed || e.target.closest('a, button')) return;
  const [px, py] = toCanvas(e.clientX, e.clientY);
  if (overPool(px, py)) ripple(px, py, 1.2);
});

function frame(t) {
  const e = end.getBoundingClientRect();
  if (REDUCED) foot.classList.toggle('is-away', e.top < innerHeight * .55);
  /* landing: a wave runs through the pool */
  const now = REDUCED || !end.classList.contains('is-dive') || end.classList.contains('is-landed');
  if (now && !landed) {
    const cy = pool.y + pool.h / 2;
    ripple(pool.x + pool.w * .5, cy, .9);
    ripple(pool.x + pool.w * .2, cy, .5, .25);
    ripple(pool.x + pool.w * .8, cy, .5, .4);
  }
  landed = now;
  if (!jelly || getComputedStyle(end).visibility === 'hidden' || e.top > innerHeight || e.bottom < 0) return;
  const c = canvas.getBoundingClientRect();
  scale = c.width / canvas.clientWidth || 1;
  /* where the canvas is on the page; while the footer is still coming at you, where it will be */
  const off = landed ? [c.left, c.top] : [-OUT, -OUT];
  jelly.mask(maskOf(REDUCED ? 8 : t));
  for (let i = 0; i < RIPPLES; i++) ripples.set([rip[i * 4] + off[0], rip[i * 4 + 1] + off[1], rip[i * 4 + 2], rip[i * 4 + 3]], i * 4);
  P.sx += (P.x - P.sx) * .12; P.sy += (P.y - P.sy) * .12;
  const [px, py] = toCanvas(P.x, P.y);
  P.on += ((P.seen && landed && overPool(px, py) && !REDUCED ? 1 : 0) - P.on) * .08;
  jelly.draw({
    time: REDUCED ? 8 : t, off, th: TH, ptr: [P.sx, P.sy, P.on], ripples, bubbles, values: V,
    grid: innerWidth > 760 ? document.documentElement.clientWidth / 1440 : 0,
  });
}

/* the word: up and out, the next up into its place */
const slot = q('.end__word'), WORDS = slot.dataset.words.split('|');
slot.firstElementChild.style.visibility = 'hidden';
const spans = WORDS.map(w => { const sp = document.createElement('span'); sp.textContent = w; slot.append(sp); return sp; });
let shown = 0;
const fitSlot = () => { slot.style.width = spans[shown].offsetWidth + 'px'; };
function turn() {
  const from = spans[shown];
  shown = (shown + 1) % spans.length;
  const to = spans[shown];
  gsap.timeline({defaults: {duration: .8, ease: 'expo.inOut'}})
    .to(from, {yPercent: -140}, 0)
    .fromTo(to, {yPercent: 140}, {yPercent: 0}, 0)
    .to(slot, {width: to.offsetWidth}, 0);
}
function loop() {
  /* only while the footer is the page */
  if (landed && !document.hidden) turn();
  gsap.delayedCall(2.6, loop);
}

document.fonts.ready.then(() => {
  gsap.set(spans.slice(1), {yPercent: 140});
  fitSlot();
  layout();
  let resizing = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizing); resizing = requestAnimationFrame(() => { fitSlot(); layout(); }); });
  gsap.ticker.add(frame);
  if (!REDUCED) gsap.delayedCall(2.6, loop);
});
