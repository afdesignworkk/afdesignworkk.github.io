/* Home: her hero (Figma 617:262) with the flower bed under it, the selected
   work, How I work (how.js) and the footer (end.js).
     1. smooth scroll: Lenis, driven by GSAP's ticker, telling ScrollTrigger;
        Projects goes to the work, Contact all the way down to the footer
     2. leaving the hero: everything on it drifts up at half the page's speed
        and goes faint and soft (the top and the flowers by a third of a
        screen, the line and the intro by ¾); Selected projects comes up
        over it
     3. the line, each word in its own box, its first row fitted edge to edge
        (on a phone, the widest of its four rows)
     4. Selected projects: the title rises out of its line, each picture
        opens out as it comes up
     5. Odesa time in the top, to the second
     6. the loader (as on the live site): her grid draws in and a drop of the
        butter jelly grows in the middle as the page comes in, then spreads
        as the paper lifts; then the words rise and the flowers grow up */
import {RIPPLES, BUBBLES, view} from './windowgl.js?v=2';
import {bed} from './flowers.js?v=3';

const {gsap, ScrollTrigger, Lenis} = window;
gsap.registerPlugin(ScrollTrigger);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = s => document.querySelector(s);
const qa = s => [...document.querySelectorAll(s)];
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
qa('[data-work]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  if (lenis) lenis.scrollTo('#work', {duration: 1.4});
  else q('#work').scrollIntoView();
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

/* the hero's jelly (her settings, 2026-10-29), for the loader's drop */
const V = {
  spread: .88, bevelW: .5, bevelH: 60, wobble: .16, wobbleSpeed: .24, swell: .2,
  light: '#fdefb8', body: '#f8df8e', deep: '#ebc765', rimColour: '#a3823a', dens: 1, milk: 0, glow: .16,
  bend: 26, grid: .24, caustic: .6, causticSize: 1, causticSpeed: .45, bubbles: 1, bubbleSize: 1.16,
  spec: .78, sharp: 90, rim: .52, gather: .84,
  ripple: .45, rippleSpeed: 220, rippleWidth: .99, shimmer: .085, bounce: .3,
  shadow: 1, shadowX: -3, shadowY: 6,
};

/* 2. leaving the hero: how far (0–1) for the top and the flowers, and for the words */
const hero = q('.hero'), top = q('.hero > .top'), h1 = q('.hero > .line'), info = q('.hero > .info'), bedEl = q('.hero > .bed');
const ease = v => v * v * (3 - 2 * v);
function leave() {
  const y = Math.max(0, scrollY), H = hero.offsetHeight;
  const a = ease(clamp01(y / (H * .34))), b = ease(clamp01(y / (H * .75)));
  const style = (el, k, scale) => {
    if (!el) return;
    el.style.transform = y > 0 ? `translate3d(0, ${(y * .5).toFixed(1)}px, 0) scale(${(1 - k * scale).toFixed(4)})` : '';
    el.style.opacity = y > 0 ? (1 - k).toFixed(3) : '';
    el.style.filter = k > .01 && !REDUCED ? `blur(${(k * 10).toFixed(1)}px)` : '';
    el.style.visibility = k >= 1 ? 'hidden' : '';
  };
  style(top, a, 0);
  style(bedEl, a, 0);
  style(h1, b, .04);
  style(info, b, 0);
  bed.gone = a;
}
function rest() {
  [top, bedEl, h1, info].forEach(el => { if (el) el.style.transform = el.style.opacity = el.style.filter = el.style.visibility = ''; });
}
let lastY = -1;
gsap.ticker.add(() => { if (scrollY !== lastY) { leave(); lastY = scrollY; } });

/* 3. the line, each word in its own box; sized so its first row runs from side to side
   (on a phone, where it is four rows, the widest of them) */
qa('.line .pt').forEach(pt => { pt.innerHTML = pt.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' '); });
function fit() {
  h1.style.fontSize = '200px';
  const small = innerWidth <= 760;
  const rows = small ? qa('.line .pt') : qa('.line .ln');
  /* (a part on a phone is a block as wide as the line, so it's measured by its words) */
  const width = el => small ? (el.lastElementChild.getBoundingClientRect().right - el.firstElementChild.getBoundingClientRect().left) : el.getBoundingClientRect().width;
  const widest = Math.max(...rows.map(width));
  h1.style.fontSize = widest ? `${(200 * h1.clientWidth / widest).toFixed(2)}px` : '';
}

/* measured with the hero at rest, then put back where the scroll has it */
function layout() {
  rest();
  fit();
  bed.layout();
  lastY = -1;
  ScrollTrigger.refresh();
}
/* (watching the hero, not the window: its width also changes when the scrollbar comes, as the loader lifts) */
let resizing = 0, seen = '';
new ResizeObserver(() => {
  const now = `${hero.clientWidth}×${hero.clientHeight}`;
  if (now === seen) return;
  seen = now;
  cancelAnimationFrame(resizing);
  resizing = requestAnimationFrame(layout);
}).observe(hero);

/* 4. Selected projects */
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

/* 5. Odesa time, to the second: 1:10:12 PM GMT+2 */
const opts = {hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true};
let fmt;
try { fmt = new Intl.DateTimeFormat('en-US', {...opts, timeZone: 'Europe/Kyiv', timeZoneName: 'shortOffset'}); }
catch (e) { fmt = new Intl.DateTimeFormat('en-US', opts); }
const clock = q('[data-clock]');
const tick = () => { clock.textContent = fmt.format(new Date()); };
tick();
setInterval(tick, 1000);

/* 6. the loader: her grid draws in on the paper; a drop of the jelly grows
   in the middle (it takes at least a second and a half, and waits for the
   line's face, which the line is fitted with), the count going to 100 under
   it; then it spreads and fades, and the paper lifts as the hero opens
   underneath */
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

/* the opening, once the line's face has loaded and the loader lifts: the words rise, then the flowers grow up */
const fontsIn = Promise.all(['500 100px "Hanken Grotesk"', '400 16px "Hanken Grotesk"'].map(f => document.fonts.load(f).catch(() => null)))
  .then(() => document.fonts.ready);
const loaded = loader(fontsIn);
fontsIn.then(() => { layout(); work(); });
Promise.all([fontsIn, loaded]).then(([, fromLoader]) => {
  if (REDUCED) { bed.show(); return; }
  /* the opening plays only at the top; further down, the hero is already there */
  if (scrollY > 10) { bed.show(); return; }
  const open = gsap.timeline();
  /* (after the loader her grid is already there) */
  if (!fromLoader) open.from('.grid', {opacity: 0, duration: 1.2, ease: 'power2.out'}, 0);
  open
    .from('.line .w', {y: 50, opacity: 0, filter: 'blur(10px)', duration: 1.3, ease: 'expo.out', stagger: .07}, .25)
    .from('.top > *, .info > *', {y: 12, opacity: 0, duration: .9, ease: 'expo.out', stagger: .06}, .6)
    .add(() => bed.enter(0), 1.05);
});
