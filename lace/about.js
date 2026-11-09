// About page: smooth scroll, the top bar (clock, Projects menu, veil), Roll
// pills, the footer's copy button and Back to top, then the page itself: the
// grey tiles opening up, the column drift and the chapters' dot-to-type reveal.

const { gsap, Lenis, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) document.documentElement.classList.add('reduce');

const lenis = new Lenis({ autoRaf: false, lerp: .05, wheelMultiplier: 1, touchMultiplier: 1.3 });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

// the veil under the menu once the page has moved
const veil = document.querySelector('.veil');
lenis.on('scroll', ({ scroll }) => veil.classList.toggle('on', scroll > 40));

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
  const rows = panel.querySelectorAll('li');
  let open = false, leave = 0;
  const set = (o) => {
    if (o === open) return;
    open = o; drop.classList.toggle('open', o); btn.setAttribute('aria-expanded', o);
    gsap.killTweensOf([panel, rows]);
    if (o) {
      panel.hidden = false;
      gsap.fromTo(panel, { clipPath: 'inset(0% 0% 100% 0% round 20px)', y: -6 }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', y: 0, duration: reduce ? 0 : .55, ease: 'power3.out' });
      gsap.fromTo(rows, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: reduce ? 0 : .4, ease: 'power2.out', stagger: .05, delay: .08 });
    } else {
      gsap.to(panel, { clipPath: 'inset(0% 0% 100% 0% round 20px)', y: -6, duration: reduce ? 0 : .3, ease: 'power2.in', onComplete: () => { panel.hidden = true; } });
    }
  };
  btn.addEventListener('click', () => set(!open));
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  drop.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mouse.matches) { clearTimeout(leave); set(true); } });
  drop.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && mouse.matches) leave = setTimeout(() => set(false), 220); });
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

// The chapters arrive the way the home page's About statements do (lace.js
// rollSay): each word waits as faint pinprick dots, and as a paragraph's top
// runs from SAY.from to SAY.to of the screen its lines swell one after another
// into solid type, each line settling from its left end to its right;
// scrolling back takes them back to dots. Links keep working: their words are
// wrapped inside them.
const SAY = { from: .92, to: .4, spread: 1.4, sweep: .35 };   // the home page's values
const ease = (e) => e * e * e * (e * (e * 6 - 15) + 10);       // smootherstep
function wrapWords(node, out) {
  for (const n of [...node.childNodes]) {
    if (n.nodeType === 3) {
      const parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(' '); continue; }
        const el = document.createElement('span');
        el.className = 'say__w'; el.textContent = part; el._q = -1;
        frag.append(el); out.push(el);
      }
      n.replaceWith(frag);
    } else if (n.nodeType === 1) wrapWords(n, out);
  }
  return out;
}
const says = [...document.querySelectorAll('.ab2-ch .txt p')].map((p) => ({ p, w: wrapWords(p, []), lines: [], cell: 5 }));
function sizeSay() {
  for (const s of says) {
    s.cell = Math.max(3, Math.round(parseFloat(getComputedStyle(s.p).fontSize) / 8));   // ~8 dots across the type's height
    s.p.style.setProperty('--cell', s.cell + 'px');
    const box = s.p.getBoundingClientRect(), width = box.width || 1, rows = new Map();
    for (const el of s.w) { const r = el.getBoundingClientRect(), k = Math.round(r.top - box.top); if (!rows.has(k)) rows.set(k, []); rows.get(k).push({ el, at: (r.left - box.left) / width }); }
    s.lines = [...rows.keys()].sort((x, y) => x - y).map((k) => rows.get(k));
    for (const { el } of s.lines.flat()) el._q = -1;
  }
}
function rollSay() {
  const H = innerHeight;
  for (const s of says) {
    const top = s.p.getBoundingClientRect().top;
    const p = reduce ? 1 : Math.min(1, Math.max(0, (SAY.from * H - top) / ((SAY.from - SAY.to) * H)));
    const L = s.lines.length, k = SAY.spread, full = s.cell * .72;
    s.lines.forEach((line, i) => {
      const u = p * (L + k) - i;
      for (const { el, at } of line) {
        const q = Math.round(ease(Math.min(1, Math.max(0, (u - at * SAY.sweep * k) / (k * (1 - SAY.sweep))))) * 100) / 100;
        if (q === el._q) continue;
        el._q = q;
        el.classList.toggle('set', q >= 1);
        el.style.setProperty('--r', (.5 + q * (full - .5)).toFixed(2) + 'px');
        el.style.setProperty('--o', (.3 + q * .7).toFixed(2));
        el.style.transform = q >= 1 ? '' : `translateY(${((1 - q) * .1).toFixed(3)}em)`;
      }
    });
  }
}
// measured with the transforms off, so the lines are the real ones
const measure = () => { for (const s of says) for (const el of s.w) el.style.transform = ''; sizeSay(); rollSay(); };
measure(); addEventListener('resize', measure); document.fonts?.ready.then(measure);
gsap.ticker.add(rollSay);

// Scroll down glides to the first chapter
document.querySelector('[data-down]').addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo('#ch1', { offset: -140, duration: reduce ? 0 : 1.6 }); });
  

addEventListener('load', () => ScrollTrigger.refresh());
