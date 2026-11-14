// Case study with a rail (her Figma 868:1071): smooth scroll, the top bar
// (clock, Projects menu), Roll pills, the footer's copy button and Back to
// top, then the page: the title and facts come in out of a soft blur, each
// section's text rises in line by line from behind a mask (lines.js), and the
// rail marks the section you are reading. The pictures simply sit in place.

import { lines } from './lines.js?v=3';
import { enter } from './enter.js?v=5';
import './menu.js?v=1';
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
  // the icon's run (.is-run, .7 s) always plays to the end, even if the pointer leaves halfway
  let run = 0;
  const on = () => { pill.classList.add('is-on'); if (run) return; pill.classList.add('is-run'); run = setTimeout(() => { pill.classList.remove('is-run'); run = 0; }, 750); };
  const off = () => pill.classList.remove('is-on');
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

// the first screen comes in as on every page (enter.js): the menu, the title,
// then the facts, the rail and the picture
enter({ title: ['.st-top h1'], rest: ['.st-facts > div', '.st-rail > *', '.st-hero'] });
lines('.st-sec .txt p');

// the rail's index: nothing is marked over the title and the hero; the dot
// comes in when Overview reaches the middle of the screen, then moves to each
// section as its top passes the middle (Outcome stays marked to the end), and a click glides
// there, 48 under the top, where the rail is held
{
  const links = [...document.querySelectorAll('.st-toc a')], secs = links.map((a) => document.querySelector(a.hash));
  let cur = -1;
  const pick = () => {
    const mid = innerHeight * .55; let i = -1;               // above Overview nothing is marked
    secs.forEach((s, j) => { if (s.getBoundingClientRect().top <= mid) i = j; });
    if (i === cur) return; cur = i;
    links.forEach((a, j) => { a.classList.toggle('on', j === i); if (j === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  };
  // Lenis drives the wheel; the native events cover a restored scroll
  // position, keyboard jumps and the first paint
  lenis.on('scroll', pick); addEventListener('scroll', pick, { passive: true });
  addEventListener('resize', pick); addEventListener('load', pick); pick();
  links.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(secs[i], { offset: -48, duration: reduce ? 0 : 1.4 }); }));
}

addEventListener('load', () => ScrollTrigger.refresh());

// Next project: the arrow runs out of its disc and back in once per hover,
// and always plays to the end, even if the pointer leaves halfway
for (const next of document.querySelectorAll('.st-next')) {
  let run = 0;
  const go = () => { if (run) return; next.classList.add('is-run'); run = setTimeout(() => { next.classList.remove('is-run'); run = 0; }, 750); };
  next.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') go(); });
  next.addEventListener('focus', () => { if (next.matches(':focus-visible')) go(); });
}
