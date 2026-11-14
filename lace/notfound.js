// 404 page ("Flown away"): the top bar (clock, Projects menu), the Back home
// pill's roll and the first screen coming in as on every page (enter.js),
// the same code as the About page's top part; then the lace butterfly, lost,
// fluttering about the screen. It shies from the pointer and leaves a short
// trail of lace; over Back home it flies down and perches on the pill.

import { enter } from './enter.js?v=5';
import './menu.js?v=2';
import { butterfly, lace } from './field.js?v=1';
const { gsap } = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Odesa clock
{
  const clocks = document.querySelectorAll('.clock time');
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'shortOffset' });
  const tick = () => { const now = new Date(), text = fmt.format(now).replace(/ | /g, ' '); for (const c of clocks) { c.textContent = text; c.dateTime = now.toISOString(); } };
  tick(); setInterval(tick, 1000);
}

// the Projects menu (as lace.js)
{
  const drop = document.querySelector('.drop'), btn = drop.querySelector('.drop__btn'), panel = drop.querySelector('.drop__panel');
  const st = { p: 0 }, paint = () => { panel.style.clipPath = `inset(0% 0% ${((1 - st.p) * 100).toFixed(2)}% 0% round 16px)`; panel.style.transform = `translateY(${(-6 * (1 - st.p)).toFixed(2)}px)`; };
  const rows = panel.querySelectorAll('li');
  let open = false, leave = 0;
  const set = (o) => {
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
  };
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

// the Back home pill rolls (as lace.js)
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

enter({ title: ['.nf h1'], rest: ['.nf p', '.nf .pill'] });

// --- the lost butterfly ------------------------------------------------------
{
const cv = document.querySelector('.nf-fly canvas'), ctx = cv.getContext('2d');
const mask = document.createElement('canvas'), m = mask.getContext('2d', { willReadFrequently: true });
const S = 4, F = {};
function size() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio, 2), c = W < 700 ? 8 : 10;
  const cols = Math.ceil(W / c) + 1, rows = Math.ceil(H / c) + 1;
  Object.assign(F, { W, H, dpr, c, cols, rows, x: (W - cols * c) / 2, y: (H - rows * c) / 2, cur: new Float32Array(cols * rows), tgt: new Float32Array(cols * rows), u: Math.min(W, H) * (W < 700 ? .17 : .14) });
  cv.width = W * dpr; cv.height = H * dpr; mask.width = cols * S; mask.height = rows * S;
}
size(); addEventListener('resize', size);
// where it is, where it wants to be, and the pointer it shies from
const B = { x: innerWidth * .78, y: innerHeight * .3, vx: 0, vy: 0, rot: 0 };
const P = { x: -999, y: -999 };
addEventListener('pointermove', (e) => { P.x = e.clientX; P.y = e.clientY; });
const pill = document.querySelector('.nf .pill');
let perch = false;
pill.addEventListener('pointerenter', () => { perch = true; });
pill.addEventListener('pointerleave', () => { perch = false; });
pill.addEventListener('focus', () => { perch = true; });
pill.addEventListener('blur', () => { perch = false; });
let t = 0, last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
  const { W, H, u } = F;
  let tx, ty;
  if (perch) { const r = pill.getBoundingClientRect(); tx = r.left + r.width / 2; ty = r.top - u * .28; }
  else {
    // a lost, looping wander round the screen, never long in one place
    tx = W * (.5 + .38 * Math.sin(t * .23) + .08 * Math.sin(t * .91 + 1));
    ty = H * (.46 + .3 * Math.sin(t * .31 + 2) + .07 * Math.cos(t * 1.13));
  }
  let ax = (tx - B.x) * (perch ? 3.2 : 1.1), ay = (ty - B.y) * (perch ? 3.2 : 1.1);
  const dx = B.x - P.x, dy = B.y - P.y, d = Math.hypot(dx, dy), near = u * 2.2;
  if (!perch && d < near) { const k = (1 - d / near) * 2600; ax += dx / (d || 1) * k; ay += dy / (d || 1) * k; }
  ay += Math.sin(t * 5.3) * 160;                                        // the bob of each wingbeat
  const damp = perch ? 4.5 : 1.6;
  B.vx += (ax - B.vx * damp) * dt; B.vy += (ay - B.vy * damp) * dt;
  B.x += B.vx * dt; B.y += B.vy * dt;
  const sp = Math.hypot(B.vx, B.vy);
  B.rot += ((perch && sp < 40 ? 0 : Math.max(-.6, Math.min(.6, B.vx / 900))) - B.rot) * Math.min(1, dt * 4);
  const open = perch && sp < 40 ? .82 + .18 * Math.sin(t * 2.4) : .5 + .5 * Math.sin(t * (13 + Math.min(8, sp / 80)));
  // paint it into the mask, the cells ease towards it and leave a trail
  m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, mask.width, mask.height);
  m.filter = `blur(${S * .8}px)`; m.fillStyle = '#000'; m.strokeStyle = '#000';
  const k = S / F.c; m.setTransform(k, 0, 0, k, -F.x * k, -F.y * k);
  m.translate(B.x, B.y); m.rotate(B.rot); m.scale(u, u); butterfly(m, open);
  const dd = m.getImageData(0, 0, mask.width, mask.height).data, { cols, rows, cur, tgt } = F;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) tgt[j * cols + i] = dd[((j * S + S / 2) * mask.width + i * S + S / 2) * 4 + 3] / 255;
  const ku = 1 - Math.pow(.6, dt * 60), kd = 1 - Math.pow(.93, dt * 60);
  for (let n = 0; n < cur.length; n++) { const g = tgt[n], c = cur[n]; cur[n] = c + (g - c) * (g > c ? ku : kd); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
  lace(ctx, cur, cols, rows, F, '#141414');
  requestAnimationFrame(frame);
}
if (!reduce) requestAnimationFrame(frame);
}
