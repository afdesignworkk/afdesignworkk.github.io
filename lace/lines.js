// Lines rising from behind a mask: each word sits in its own clipped box,
// and when a paragraph comes up the screen its lines rise into view one after
// another, every word of a line together. Links keep working: the words are
// wrapped inside them. Once only; no dots. Used by the home page's About
// statements and the About page's chapters (lines.css rules live in lace.css).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function wrap(node, out) {
  for (const n of [...node.childNodes]) {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      for (const part of n.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(' '); continue; }
        const box = document.createElement('span'), w = document.createElement('span');
        box.className = 'mw'; w.className = 'mw__in'; w.textContent = part;
        box.append(w); frag.append(box); out.push(box);
      }
      n.replaceWith(frag);
    } else if (n.nodeType === 1) wrap(n, out);
  }
  return out;
}

// the words grouped into lines as the text wraps now
export function rows(words) {
  const m = new Map();
  for (const w of words) { const k = Math.round(w.getBoundingClientRect().top); if (!m.has(k)) m.set(k, []); m.get(k).push(w); }
  return [...m.keys()].sort((a, b) => a - b).map((k) => m.get(k));
}

// options: at = how far up the screen the paragraph's top must come (0..1 from
// the top), gap = seconds between lines, after(el) = called as the last line lands
export function lines(targets, { at = .85, gap = .09, after } = {}) {
  const { gsap } = window;
  const els = typeof targets === 'string' ? [...document.querySelectorAll(targets)] : [...targets];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const ls = rows(e.target._mw);
      ls.forEach((row, i) => {
        gsap.to(row.map((w) => w.firstChild), { yPercent: 0, rotation: 0, duration: 1.1, ease: 'expo.out', delay: i * gap,
          onComplete: () => { for (const w of row) w.classList.add('up'); if (i === ls.length - 1) after?.(e.target); } });
      });
    }
  }, { rootMargin: `0px 0px ${-(1 - at) * 100}% 0px` });
  for (const p of els) {
    p._mw = wrap(p, []);
    if (reduce) { for (const w of p._mw) w.classList.add('up'); after?.(p); continue; }
    gsap.set(p._mw.map((w) => w.firstChild), { yPercent: 140, rotation: 2.5, transformOrigin: '0% 100%' });
    io.observe(p);
  }
  return els;
}
