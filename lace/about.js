// About page: smooth scroll, the top bar (clock, Projects menu), Roll
// pills, the footer's copy button and Back to top, then the page itself: the
// grey tiles opening up, the column drift and the chapters' lines rising in.

import { lines } from './lines.js?v=2';
const { gsap, Lenis, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) document.documentElement.classList.add('reduce');

const lenis = new Lenis({ autoRaf: false, lerp: .05, wheelMultiplier: 1, touchMultiplier: 1.3 });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);


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
  const st = { p: 0 }, paint = () => { panel.style.clipPath = `inset(0% 0% ${((1 - st.p) * 100).toFixed(2)}% 0% round 20px)`; panel.style.transform = `translateY(${(-6 * (1 - st.p)).toFixed(2)}px)`; };
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

// Roll pills (as lace.js) and the footer's copy button
for (const pill of document.querySelectorAll('.pill')) {
  for (const l of pill.querySelectorAll('[data-label]')) l.innerHTML = `<i>${l.textContent}</i>`;
  const on = () => pill.classList.add('is-on'), off = () => pill.classList.remove('is-on');
  pill.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); });
  pill.addEventListener('pointerleave', off);
  pill.addEventListener('focus', () => { if (pill.matches(':focus-visible')) on(); });
  pill.addEventListener('blur', off);
}
function relabel(pill, text) {
  const l = pill.querySelector('[data-label]'), w0 = pill.offsetWidth;
  gsap.to(l, { yPercent: -110, opacity: 0, duration: .2, ease: 'power2.in', onComplete: () => {
    l.querySelector('i').textContent = text;
    gsap.fromTo(pill, { width: w0 }, { width: pill.offsetWidth, duration: .4, ease: 'power3.out', clearProps: 'width' });
    gsap.fromTo(l, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .4, ease: 'power3.out', clearProps: 'transform,opacity' });
  } });
}
for (const b of document.querySelectorAll('[data-copy]')) {
  const was = b.querySelector('[data-label]').textContent;
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { location.href = `mailto:${b.dataset.copy}`; return; }
    if (!b.classList.contains('copied')) relabel(b, 'Copied');
    b.classList.add('copied'); clearTimeout(b._t);
    b._t = setTimeout(() => { b.classList.remove('copied'); relabel(b, was); }, 2000);
  });
}
document.querySelector('.foot__top')?.addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(0, { duration: reduce ? 0 : 2 }); });

// the line and intro come in out of a soft blur, one after another; then the
// six grey tiles (her Figma placeholders) open up from the bottom edge,
// top row first (after her reference, 21st.dev "Animated Gallery")
const tiles = [...document.querySelectorAll('.ab2-tile')];
const order = [0, 2, 4, 1, 3, 5].map((i) => tiles[i]);           // the top row first, then the bottom
if (!reduce) {
  gsap.from('.ab2-top h1, .ab2-side > *', { opacity: 0, y: 20, filter: 'blur(10px)', duration: 1, ease: 'power3.out', stagger: .12, delay: .1, clearProps: 'filter' });
  gsap.fromTo(order, { clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.1, ease: 'power3.inOut', stagger: .1, delay: .35, clearProps: 'clipPath' });

  // as the page moves, the middle column drifts down against the outer two
  const cols = document.querySelectorAll('.ab2-col');
  const st = { trigger: '.ab2-gal', start: 'top 80%', end: 'bottom top', scrub: .6 };
  gsap.fromTo([cols[0], cols[2]], { y: 0 }, { y: -60, ease: 'none', scrollTrigger: st });
  gsap.fromTo(cols[1], { y: 0 }, { y: 70, ease: 'none', scrollTrigger: { ...st } });

}

// The chapters arrive the way the home page's About statements do: each
// paragraph's lines rise in one after another from behind a mask (lines.js).
lines('.ab2-ch .txt p');

// Scroll down glides to the first chapter
document.querySelector('[data-down]').addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo('#ch1', { offset: -140, duration: reduce ? 0 : 1.6 }); });
  

addEventListener('load', () => ScrollTrigger.refresh());
