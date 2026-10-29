/* Home: the jelly window hero, with her settings, and the selected work
   under it.
     1. smooth scroll: Lenis, driven by GSAP's ticker, telling ScrollTrigger
     2. the jelly: a shader on the canvas behind the line (home/windowgl.js);
        its edge breathes on a spring
     3. leaving the hero: everything on it drifts up at half the page's speed
        and goes faint and soft (the corners by a third of a screen, the
        line, its jelly and the tags by ¾), the jelly closing back round
        the words; Selected work comes up over it
     4. the line, its shape for the jelly, the air bubbles
     5. touching: ripples, pokes, waves from the tags (only while it's whole)
     6. the tags: pick one up and throw it, it stays on the hero
     7. Selected work: the title rises out of its line, each picture opens
        out as it comes up
     8. Odesa time in the corner, to the second
     9. the opening: the jelly swells open and wobbles to rest; first, the
        loader: her grid draws in and a drop of the jelly grows in the
        middle as the page comes in, then spreads as the paper lifts */
import {view, RIPPLES, BUBBLES} from './windowgl.js?v=2';

const {gsap, ScrollTrigger, Draggable, InertiaPlugin, Lenis} = window;
gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = s => document.querySelector(s);
const qa = s => [...document.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = v => Math.min(1, Math.max(0, v));

/* 1. smooth scroll; a reload opens at the hero, with its opening */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const lenis = REDUCED ? null : new Lenis({lerp: .08, wheelMultiplier: .9, autoRaf: false});
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
qa('[data-top]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  if (lenis) lenis.scrollTo(0, {duration: 1.6});
  else scrollTo({top: 0});
}));
/* Contact in the menu: all the way down, through How I work, to the footer */
const inOut3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
qa('[data-contact]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const end = document.documentElement.scrollHeight - innerHeight;
  /* (measured afresh: the page grows as How I work sets its track) */
  if (lenis) { lenis.resize(); lenis.scrollTo(end, {duration: Math.min(3.2, 1.4 + Math.abs(end - scrollY) / 4000), easing: inOut3}); }
  else scrollTo({top: end});
}));

/* 2. the jelly */
const canvas = q('.name__glow');
const jelly = view(canvas);
if (!jelly) canvas.remove();

/* her settings (2026-10-29) */
const V = {
  spread: .88, bevelW: .5, bevelH: 60, wobble: .16, wobbleSpeed: .24, swell: .2,
  light: '#fdefb8', body: '#f8df8e', deep: '#ebc765', rimColour: '#a3823a', dens: 1, milk: 0, glow: .16,
  bend: 26, grid: .24, caustic: .6, causticSize: 1, causticSpeed: .45, bubbles: 1, bubbleSize: 1.16,
  spec: .78, sharp: 90, rim: .52, gather: .84,
  ripple: .45, rippleSpeed: 220, rippleWidth: .99, shimmer: .085, bounce: .3,
  shadow: 1, shadowX: -3, shadowY: 6,
};
if (jelly) jelly.colours([V.light, V.body, V.deep, V.rimColour]);

const G = {grow: REDUCED ? 1 : 0};
const breath = [0, 0];
const P = {x: 0, y: 0, tx: 0, ty: 0, on: 0, seen: false};
const ripples = new Float32Array(RIPPLES * 4);
const bubbles = new Float32Array(BUBBLES * 4);
let nextRipple = 0;
const now = () => gsap.ticker.time;
function ripple(x, y, amp) {
  if (REDUCED || !jelly) return;
  ripples.set([x, y, now(), amp], nextRipple * 4);
  nextRipple = (nextRipple + 1) % RIPPLES;
}

addEventListener('pointermove', e => { P.tx = e.clientX; P.ty = e.clientY; P.seen = true; });
document.addEventListener('pointerleave', () => { P.seen = false; });

/* 3. leaving the hero: how far (0–1) for the corners and for the line */
const hero = q('.hero'), top = q('.hero > .top'), name = q('.hero > .name'), h1 = q('.name h1');
let gone = 0;
const ease = v => v * v * (3 - 2 * v);
function leave() {
  const y = Math.max(0, scrollY), H = hero.offsetHeight;
  const a = ease(clamp01(y / (H * .34))), b = ease(clamp01(y / (H * .75)));
  gone = b;
  const style = (el, k, scale) => {
    el.style.transform = y > 0 ? `translate3d(0, ${(y * .5).toFixed(1)}px, 0) scale(${(1 - k * scale).toFixed(4)})` : '';
    el.style.opacity = y > 0 ? (1 - k).toFixed(3) : '';
    el.style.filter = k > .01 && !REDUCED ? `blur(${(k * 10).toFixed(1)}px)` : '';
    el.style.visibility = k >= 1 ? 'hidden' : '';
  };
  style(top, a, 0);
  style(name, b, .06);
}
function rest() {
  [top, name].forEach(el => { el.style.transform = el.style.opacity = el.style.filter = el.style.visibility = ''; });
}

/* the outline at rest is where the blurred line crosses .66 − .5 × size; it opens from 1.25 */
/* leaving, the jelly closes back round the words, a third of the way to where it opened from */
const threshold = () => 1.25 + (.66 - .5 * V.spread - 1.25) * G.grow * (1 - gone * .3) + breath[0] * V.bounce;
let lastY = -1;
function frame(t, dt) {
  if (scrollY !== lastY) { leave(); lastY = scrollY; }
  if (!jelly || gone >= 1) return;
  if (dt > 0) {
    breath[1] += (-150 * breath[0] - 7 * breath[1]) * dt;
    breath[0] += breath[1] * dt;
  }
  P.x += (P.tx - P.x) * .12;
  P.y += (P.ty - P.y) * .12;
  const r = canvas.getBoundingClientRect();
  const over = P.seen && inside(P.tx, P.ty);
  P.on += ((over && !REDUCED ? 1 : 0) - P.on) * .08;
  jelly.draw({
    time: t, off: [r.left, r.top], th: threshold(), ptr: [P.x, P.y, P.on], ripples, bubbles, values: V,
    grid: innerWidth > 760 ? document.documentElement.clientWidth / 1440 : 0,
  });
}
gsap.ticker.add((t, ms) => frame(REDUCED ? 8 : t, REDUCED ? 0 : Math.min(ms / 1000, 1 / 30)));

/* 4. the line, each word in its own box; on wide screens it shrinks to fit */
function words() {
  h1.innerHTML = h1.dataset.line.split('|').map(line => '<span class="ln">' + line.trim().split(/\s+/)
    .map(w => `<span class="w">${w}</span>`).join(' ') + '</span>').join(' ');
}
function fit() {
  h1.style.fontSize = '';
  if (innerWidth < 760) return;
  const room = q('.name').clientWidth * .8;
  const widest = Math.max(...qa('.name .ln').map(ln => ln.scrollWidth));
  if (widest > room) h1.style.fontSize = parseFloat(getComputedStyle(h1).fontSize) * room / widest + 'px';
}
words();

/* the jelly's shape: the line drawn small, fat and blurred */
const K = 1 / 6;
let shape = null;
function maskOf() {
  const r0 = canvas.getBoundingClientRect();
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(r0.width * K));
  c.height = Math.max(2, Math.round(r0.height * K));
  const ctx = c.getContext('2d');
  const size = parseFloat(getComputedStyle(h1).fontSize);
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * K * .16;
  qa('.name .w').forEach(w => {
    const cs = getComputedStyle(w), fs = parseFloat(cs.fontSize);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs * K}px ${cs.fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (parseFloat(cs.letterSpacing) || 0) * K + 'px';
    const r = w.getBoundingClientRect();
    const mt = ctx.measureText(w.textContent);
    const asc = mt.fontBoundingBoxAscent || size * K * .9, desc = mt.fontBoundingBoxDescent || size * K * .25;
    const x = (r.left - r0.left) * K, y = (r.top - r0.top) * K + ((r.height || fs * .92) * K - (asc + desc)) / 2 + asc;
    ctx.strokeText(w.textContent, x, y);
    ctx.fillText(w.textContent, x, y);
  });
  /* three box blurs, alpha into every channel (opaque, so nothing gets premultiplied) */
  const img = ctx.getImageData(0, 0, c.width, c.height), W = c.width, H = c.height;
  let a = new Float32Array(W * H).map((_, i) => img.data[i * 4 + 3] / 255);
  const pass = (src, dx, dy, rad) => {
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let k = -rad; k <= rad; k++) {
        const xx = x + k * dx, yy = y + k * dy;
        n++;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) s += src[yy * W + xx];
      }
      out[y * W + x] = s / n;
    }
    return out;
  };
  for (let i = 0; i < 3; i++) a = pass(pass(a, 1, 0, 2), 0, 1, 2);
  for (let i = 0; i < W * H; i++) {
    const v = Math.round(Math.min(1, a[i] * 1.15) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  shape = {v: a.map(x => Math.min(1, x * 1.15)), W, H, w: r0.width, h: r0.height};
  return c;
}
/* is a point of the page on the jelly (while it's still whole)? */
function inside(x, y) {
  if (!shape || gone > .05) return false;
  const r = canvas.getBoundingClientRect();
  const i = Math.floor((x - r.left) / shape.w * shape.W), j = Math.floor((y - r.top) / shape.h * shape.H);
  if (i < 0 || j < 0 || i >= shape.W || j >= shape.H) return false;
  return shape.v[j * shape.W + i] > threshold() + .04;
}
/* a few air bubbles, set deep in the jelly, apart from each other */
function setBubbles() {
  bubbles.fill(0);
  if (!shape) return;
  const got = [];
  for (let tries = 0; tries < 400 && got.length < BUBBLES; tries++) {
    const i = Math.floor(Math.random() * shape.W), j = Math.floor(Math.random() * shape.H);
    if (shape.v[j * shape.W + i] < .72) continue;
    const x = (i + .5) / shape.W * shape.w, y = (j + .5) / shape.H * shape.h;
    if (got.some(([gx, gy]) => Math.hypot(gx - x, gy - y) < 70)) continue;
    got.push([x, y]);
  }
  got.forEach(([x, y], k) => bubbles.set([x, y, k % 3 === 0 ? rnd(4.5, 6.5) : rnd(2, 3.6), rnd(0, 6.3)], k * 4));
}

/* 5. touching */
let lastMove = 0, last = [0, 0];
addEventListener('pointermove', e => {
  if (!inside(e.clientX, e.clientY) || e.target.closest('.work, .foot')) { document.body.style.cursor = ''; return; }
  document.body.style.cursor = 'pointer';
  const t = now(), d = Math.hypot(e.clientX - last[0], e.clientY - last[1]);
  if (t - lastMove > .14 && d > 22) {
    ripple(e.clientX, e.clientY, .35);
    lastMove = t; last = [e.clientX, e.clientY];
  }
});
addEventListener('pointerdown', e => {
  if (e.target.closest('.chip, a, button, .work') || !inside(e.clientX, e.clientY)) return;
  ripple(e.clientX, e.clientY, 1.3);
  if (!REDUCED) breath[1] -= 2.2;
});

/* 6. the tags */
const chips = qa('.chip');
function placeChips() {
  const small = innerWidth < 760;
  chips.forEach(ch => {
    const [x, y] = ch.dataset[small ? 'm' : 'd'].split(',').map(Number);
    gsap.set(ch, {x: 0, y: 0});
    Object.assign(ch.style, {left: x + '%', top: y + '%'});
  });
}
const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
let lift = 3, dragWave = 0;
Draggable.create(chips, {
  type: 'x,y', bounds: '.hero', inertia: !REDUCED,
  onPress() { this.target.classList.add('is-held'); this.target.style.zIndex = ++lift; },
  onDrag() {
    const [x, y] = centre(this.target);
    if (now() - dragWave > .18 && inside(x, y)) { ripple(x, y, .45); dragWave = now(); }
  },
  onRelease() {
    this.target.classList.remove('is-held');
    const [x, y] = centre(this.target);
    if (inside(x, y)) { ripple(x, y, .9); if (!REDUCED) breath[1] -= 1; }
  },
});

/* measured with the hero at rest, then put back where the scroll has it */
function layout() {
  rest();
  fit();
  const r = h1.getBoundingClientRect();
  const small = innerWidth < 760;
  q('.name').style.setProperty('--gw', Math.round(r.width + (small ? 80 : 280)) + 'px');
  q('.name').style.setProperty('--gh', Math.round(r.height + (small ? 100 : 220)) + 'px');
  if (jelly) { jelly.size(); jelly.mask(maskOf()); setBubbles(); }
  placeChips();
  lastY = -1;
  ScrollTrigger.refresh();
}
let resizing = 0;
addEventListener('resize', () => { cancelAnimationFrame(resizing); resizing = requestAnimationFrame(layout); });

/* 7. Selected work */
function work() {
  if (REDUCED) return;
  gsap.from('.work__title .mask > span', {
    yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: .08,
    scrollTrigger: {trigger: '.work__title', start: 'top 88%', toggleActions: 'play none none reverse'},
  });
  qa('.item').forEach(item => {
    gsap.fromTo(item.querySelector('.item__pic'), {clipPath: 'inset(7% 9% 7% 9% round 12px)'}, {
      clipPath: 'inset(0% 0% 0% 0% round 12px)', ease: 'none',
      scrollTrigger: {trigger: item, start: 'top bottom', end: 'top 45%', scrub: true},
    });
    gsap.from(item.querySelector('.item__cap'), {
      y: 14, opacity: 0, duration: .9, ease: 'expo.out',
      scrollTrigger: {trigger: item.querySelector('.item__cap'), start: 'top 96%', toggleActions: 'play none none reverse'},
    });
  });
}
qa('.item[aria-disabled="true"], .item[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

/* 8. Odesa time, to the second */
const opts = {hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'};
let fmt;
try { fmt = new Intl.DateTimeFormat('en-GB', {...opts, timeZone: 'Europe/Kyiv'}); }
catch (e) { fmt = new Intl.DateTimeFormat('en-GB', {...opts, timeZone: 'Europe/Kiev'}); }
const clock = q('[data-clock]');
const tick = () => { clock.textContent = fmt.format(new Date()); };
tick();
setInterval(tick, 1000);

/* 9. the loader: her grid draws in on the paper; a drop of the jelly grows
   in the middle (it takes at least a second and a half, and waits for the
   line's face, which the hero's jelly is shaped from), the count going to
   100 under it; then it spreads and fades, and the paper lifts as the hero
   opens underneath */
function loader(fontsIn) {
  const load = q('.load');
  if (!load) return Promise.resolve(false);
  if (REDUCED) { load.remove(); return Promise.resolve(false); }
  load.style.animation = 'none';
  if (lenis) lenis.stop();
  let ready = false;
  fontsIn.then(() => { ready = true; });
  const cv = q('.load__drop'), count = q('.load__count'), drop = view(cv);
  if (drop) drop.colours([V.light, V.body, V.deep, V.rimColour]);
  else cv.remove();
  /* its shape: a circle, softened, at half the size */
  const KD = 1 / 2, mk = document.createElement('canvas'), mx = mk.getContext('2d');
  if (drop) { drop.size(); mk.width = Math.round(cv.clientWidth * KD); mk.height = Math.round(cv.clientHeight * KD); }
  const still = new Float32Array(RIPPLES * 4), held = new Float32Array(BUBBLES * 4);
  const S = {p: 0, r: 0};
  const t0 = performance.now();
  gsap.to('.load__grid', {clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut'});
  return new Promise(done => {
    let leaving = false;
    function tick(t) {
      const el = (performance.now() - t0) / 1000;
      const goal = Math.min(ready ? 1 : .9, smoothstep(.1, 1.5, el));
      S.p = Math.abs(goal - S.p) < .003 ? goal : S.p + (goal - S.p) * .1;
      count.textContent = Math.round(S.p * 100);
      if (!leaving) S.r = 4 + 30 * S.p;
      if (drop) {
        const w = mk.width, h = mk.height, off = w + 40;
        mx.shadowColor = 'transparent';
        mx.fillStyle = '#000';
        mx.fillRect(0, 0, w, h);
        mx.fillStyle = mx.shadowColor = '#fff';
        mx.shadowBlur = Math.min(5, S.r * KD * .8); mx.shadowOffsetX = off;
        mx.beginPath();
        mx.arc(w / 2 - off, h / 2, Math.max(0, S.r) * KD, 0, Math.PI * 2);
        mx.fill();
        drop.mask(mk);
        held.set([cv.clientWidth / 2 - S.r * .35, cv.clientHeight / 2 + S.r * .25, S.r > 18 ? 2.6 : 0, 1]);
        const r = cv.getBoundingClientRect();
        drop.draw({
          time: t, off: [r.left, r.top], th: .45, ptr: [0, 0, 0], ripples: still, bubbles: held, values: V,
          grid: innerWidth > 760 ? document.documentElement.clientWidth / 1440 : 0,
        });
      }
      if (!leaving && S.p >= 1) { leaving = true; leave(); }
    }
    function leave() {
      if (lenis) lenis.start();
      gsap.timeline({onComplete: () => { gsap.ticker.remove(tick); load.remove(); }})
        .to(S, {r: 80, duration: .8, ease: 'expo.out'}, 0)
        .to(cv, {opacity: 0, duration: .5, ease: 'power2.in'}, .05)
        .to(count, {opacity: 0, y: -6, duration: .4, ease: 'power2.in'}, 0)
        .to(load, {opacity: 0, duration: 1, ease: 'power2.inOut'}, .15);
      done(true);
    }
    gsap.ticker.add(tick);
  });
}
function smoothstep(a, b, v) { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }

/* the opening, once the line's face has loaded (the jelly is shaped from it) and the loader lifts */
const fontsIn = Promise.all(['500 100px "Hanken Grotesk"', '400 16px "Hanken Grotesk"'].map(f => document.fonts.load(f).catch(() => null)))
  .then(() => document.fonts.ready);
const loaded = loader(fontsIn);
fontsIn.then(() => { layout(); work(); });
Promise.all([fontsIn, loaded]).then(([, fromLoader]) => {
  if (REDUCED) return;
  /* the opening plays only at the top; further down, the hero is already there */
  if (scrollY > 10) { G.grow = 1; return; }
  const open = gsap.timeline();
  /* (after the loader her grid is already there) */
  if (!fromLoader) open.from('.grid', {opacity: 0, duration: 1.2, ease: 'power2.out'}, 0);
  open
    .from('.name .w', {y: 50, opacity: 0, filter: 'blur(10px)', duration: 1.3, ease: 'expo.out', stagger: .08}, .25)
    .to(G, {grow: 1, duration: 2.2, ease: 'elastic.out(1, .45)'}, .55)
    .from('.top > *, .foot > *', {y: 12, opacity: 0, duration: .9, ease: 'expo.out', stagger: .06}, .6)
    .from(chips, {scale: 0, duration: .8, ease: 'back.out(2)', stagger: .08}, 1.3);
});
