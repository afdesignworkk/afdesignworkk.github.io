// Playground: the board, and the top bar's clock, Projects
// menu (the same as on the home page, lace.js).

import { enter } from './enter.js?v=5';

const { gsap } = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const board = document.querySelector('.board'), layer = board.querySelector('.board__layer'), dots = board.querySelector('.board__dots');
const pieces = [...layer.querySelectorAll('.piece')];
const title = layer.querySelector('.board__title'), hint = layer.querySelector('.board__hint');

// --- scale and the table's dots -----------------------------------------------
// --u: board px per Figma px. The dots use the home page's pitch (its hero
// butterfly is 40 cells wide), so the two pages share one grid.
const B = { u: 1, x: 0, y: 0, vx: 0, vy: 0, minX: 0, maxX: 0, minY: 0, maxY: 0, pitch: 17 };
const FRAME = { cx: 720, cy: 520 };            // the frame point that starts in the middle of the screen
const PAD = 100;                                // Figma px kept round the outermost pieces
function size() {
  const W = innerWidth, H = innerHeight, phone = W < 760;
  B.u = phone ? .6 : Math.min(1.2, Math.max(.7, W / 1440));
  root.style.setProperty('--u', B.u);
  const bw = phone ? W * .94 : Math.min(W * .472, H * .756);
  B.pitch = bw / 40;
  dots.style.setProperty('--pitch', `${B.pitch}px`);
  dots.style.setProperty('--dot', `${(B.pitch * .065).toFixed(2)}px`);
  // how far the board may go: its outermost pieces, plus a margin, may reach
  // the screen's edges (the top edge sits under the menu)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pieces) {
    const s = p.style, x = +s.getPropertyValue('--x'), y = +s.getPropertyValue('--y'), w = +s.getPropertyValue('--w'), h = +s.getPropertyValue('--h');
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h + 40);
  }
  const u = B.u, top = 110;                      // clear of the menu
  B.maxX = -(x0 - PAD) * u; B.minX = W - (x1 + PAD) * u;
  B.maxY = top - (y0 - PAD / 2) * u; B.minY = H - (y1 + PAD / 2) * u;
  if (B.minX > B.maxX) B.minX = B.maxX = (B.minX + B.maxX) / 2;
  if (B.minY > B.maxY) B.minY = B.maxY = (B.minY + B.maxY) / 2;
}
function home() { B.x = innerWidth / 2 - FRAME.cx * B.u; B.y = innerHeight / 2 - FRAME.cy * B.u; B.vx = B.vy = 0; }
function paint() {
  layer.style.transform = `translate3d(${B.x}px, ${B.y}px, 0)`;
  dots.style.backgroundPosition = `${B.x}px ${B.y}px`;
}
size(); home(); paint();
addEventListener('resize', () => { const cx = (innerWidth / 2 - B.x) / B.u, cy = (innerHeight / 2 - B.y) / B.u; size(); B.x = innerWidth / 2 - cx * B.u; B.y = innerHeight / 2 - cy * B.u; paint(); });

// --- dragging -----------------------------------------------------------------
// Drag (mouse or touch) with a little inertia when let go; past the edges the
// board gives way at a third of the pull and springs back. The wheel and a
// trackpad move it too, and the arrow keys nudge it.
const FRICTION = .92, RUBBER = .35, SPRING = .18;
let drag = null, shown = null;
const rubber = (v, lo, hi) => (v > hi ? hi + (v - hi) * RUBBER : v < lo ? lo + (v - lo) * RUBBER : v);
board.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: B.x, by: B.y, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: 0, piece: e.target.closest('.piece') };
  B.vx = B.vy = 0;
});
addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
  if (drag.moved > 6 && !root.classList.contains('grabbing')) { root.classList.add('grabbing'); board.setPointerCapture?.(e.pointerId); }
  const now = performance.now(), dt = Math.max(1, now - drag.lt);
  B.vx = B.vx * .5 + (e.clientX - drag.lx) / dt * 16 * .5; B.vy = B.vy * .5 + (e.clientY - drag.ly) / dt * 16 * .5;
  drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
  B.x = rubber(drag.bx + dx, B.minX, B.maxX); B.y = rubber(drag.by + dy, B.minY, B.maxY);
  paint();
});
function release(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  const { moved, piece } = drag;
  drag = null; root.classList.remove('grabbing');
  // on touch there's no hover: a tap shows a piece's line, tapping elsewhere hides it
  if (moved <= 6 && e.type === 'pointerup' && e.pointerType !== 'mouse') {
    if (shown && shown !== piece) shown.classList.remove('is-on');
    shown = piece && piece !== shown ? piece : null;
    if (shown) shown.classList.add('is-on'); else if (piece) piece.classList.remove('is-on');
  }
  if (reduce) { B.vx = B.vy = 0; }
}
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
board.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = e.deltaMode === 1 ? 16 : 1;
  B.vx -= e.deltaX * k * .12; B.vy -= e.deltaY * k * .12;
  if (e.shiftKey && !e.deltaX) { B.vx -= e.deltaY * k * .12; B.vy += e.deltaY * k * .12; }
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.closest?.('.drop')) return;
  const n = 14, map = { ArrowLeft: [n, 0], ArrowRight: [-n, 0], ArrowUp: [0, n], ArrowDown: [0, -n] }[e.key];
  if (map) { e.preventDefault(); B.vx += map[0]; B.vy += map[1]; }
});

gsap.ticker.add((t, dms) => {
  if (drag) return;
  const f = Math.min(dms, 50) / 16.667;
  if (Math.abs(B.vx) < .02 && Math.abs(B.vy) < .02 && B.x >= B.minX && B.x <= B.maxX && B.y >= B.minY && B.y <= B.maxY) return;
  B.x += B.vx * f; B.y += B.vy * f;
  const fr = Math.pow(FRICTION, f); B.vx *= fr; B.vy *= fr;
  // past an edge: the push dies quickly and a spring pulls it back
  const sp = 1 - Math.pow(1 - SPRING, f);
  if (B.x > B.maxX) { B.vx *= .5; B.x += (B.maxX - B.x) * sp; } else if (B.x < B.minX) { B.vx *= .5; B.x += (B.minX - B.x) * sp; }
  if (B.y > B.maxY) { B.vy *= .5; B.y += (B.maxY - B.y) * sp; } else if (B.y < B.minY) { B.vy *= .5; B.y += (B.minY - B.y) * sp; }
  paint();
});
gsap.ticker.lagSmoothing(0);

// --- coming in ------------------------------------------------------------------
// The first screen comes in as on every page (enter.js): the menu, the title,
// then the hint; the pieces fade up from the middle out.
enter({ title: [title], rest: [hint] });
if (!reduce) {
  gsap.set(pieces, { opacity: 0, y: 30 });
  const cx = FRAME.cx, cy = FRAME.cy;
  const order = pieces.map((p) => { const s = p.style; return Math.hypot(+s.getPropertyValue('--x') + +s.getPropertyValue('--w') / 2 - cx, +s.getPropertyValue('--y') + +s.getPropertyValue('--h') / 2 - cy); });
  const start = () => {
    pieces.forEach((p, k) => gsap.to(p, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', delay: .25 + order[k] / 1400, clearProps: 'transform' }));
  };
  document.fonts.ready.then(start, start);
}

// --- the top bar: the Projects menu and the clock (as lace.js) -------------------
{
  const drop = document.querySelector('.drop'), btn = drop.querySelector('.drop__btn'), panel = drop.querySelector('.drop__panel');
  const st = { p: 0 }, paint = () => { panel.style.clipPath = `inset(0% 0% ${((1 - st.p) * 100).toFixed(2)}% 0% round 20px)`; panel.style.transform = `translateY(${(-6 * (1 - st.p)).toFixed(2)}px)`; };
  const rows = panel.querySelectorAll('li');
  let isOpen = false, leave = 0;
  function set(o) {
    if (o === isOpen) return;
    isOpen = o; drop.classList.toggle('open', o); btn.setAttribute('aria-expanded', o);
    gsap.killTweensOf([panel, rows]);
    if (o) {
      panel.hidden = false;
      // one value, 0 shut … 1 open, drives the unroll both ways, so a close that
      // interrupts an open (or the reverse) runs back from where it is
      gsap.to(st, { p: 1, duration: reduce ? 0 : .55, ease: 'power3.out', overwrite: true, onUpdate: paint });
      gsap.fromTo(rows, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduce ? 0 : .4, ease: 'power2.out', stagger: .05, delay: .08 });
    } else {
      gsap.to(st, { p: 0, duration: reduce ? 0 : .3, ease: 'power2.in', overwrite: true, onUpdate: paint, onComplete: () => { if (!isOpen) panel.hidden = true; } });
    }
  }
  // with a mouse the hover already opened it: a click keeps it open instead of
  // shutting it under the pointer; touch and keyboard toggle as before
  btn.addEventListener('click', () => set(drop.matches(':hover') && matchMedia('(hover: hover) and (pointer: fine)').matches ? true : !isOpen));
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  drop.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mouse.matches) { clearTimeout(leave); set(true); } });
  drop.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && mouse.matches) leave = setTimeout(() => set(false), 220); });
  // landing on another tab closes it at once, so two pills never show together
  for (const t of document.querySelectorAll('.top .tab')) if (!drop.contains(t)) t.addEventListener('pointerenter', () => { if (isOpen) { clearTimeout(leave); set(false); } });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) { set(false); btn.focus(); } });
  addEventListener('pointerdown', (e) => { if (isOpen && !drop.contains(e.target)) set(false); });
}
{
  const clocks = document.querySelectorAll('.clock time');
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'shortOffset' });
  const tick = () => { const now = new Date(), text = fmt.format(now).replace(/ | /g, ' '); for (const c of clocks) { c.textContent = text; c.dateTime = now.toISOString(); } };
  tick(); setInterval(tick, 1000);
}
