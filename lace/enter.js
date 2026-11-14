// The first screen, the same on every page and on the same clock (her pick,
// "Soft"): the top bar fades in, the page's title floats up as a whole and
// fades in, then the rest of what is on the first screen (the facts, the
// rail, a hint, the picture) follows the same way. Nothing is masked. Until
// it runs, these are hidden (html.pre-in, set in each page's <head>, with a
// timeout so nothing can stay hidden).
//   enter({ title, rest, wait })  title: the title (and any line that goes
//   with it); rest: what comes up after; wait: a promise to start after.
import { wrap } from './lines.js?v=3';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const all = (x) => [].concat(x || []).flatMap((t) => (typeof t === 'string' ? [...document.querySelectorAll(t)] : t ? [t] : []));

// the one clock, in seconds from the start
const T = { top: 0, title: .1, next: .08, rest: .35, stagger: .07, spread: .21 };   // spread: the most the rest's stagger may add up to

export function enter({ title = [], rest = [], wait = Promise.resolve() } = {}) {
  const { gsap } = window, html = document.documentElement;
  const top = all('.top > *'), heads = all(title), soft = all(rest);
  if (reduce) { html.classList.remove('pre-in'); return Promise.resolve(); }
  // the title's words move together (the words, not the title itself, so a
  // page can still fade the title on scroll)
  const words = heads.map((h) => wrap(h, []));
  for (const ws of words) for (const w of ws) w.style.overflow = 'visible';
  const inner = (ws) => ws.map((w) => w.firstChild);
  gsap.set(top, { opacity: 0 });
  gsap.set(words.flatMap(inner), { opacity: 0, y: 32 });
  gsap.set(soft, { opacity: 0, y: 20 });
  html.classList.remove('pre-in');

  return Promise.all([wait, document.fonts ? document.fonts.ready : 0]).then(() => new Promise((done) => {
    const tl = gsap.timeline({ onComplete: () => { for (const ws of words) for (const w of ws) { w.classList.add('up'); w.style.overflow = ''; } done(); } });
    tl.to(top, { opacity: 1, duration: .8, ease: 'power2.out' }, T.top);
    words.forEach((ws, k) => tl.to(inner(ws), { opacity: 1, y: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' }, T.title + k * T.next));
    tl.to(soft, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: { amount: Math.min(T.spread, T.stagger * Math.max(0, soft.length - 1)) }, clearProps: 'transform' }, T.rest);
  }));
}
