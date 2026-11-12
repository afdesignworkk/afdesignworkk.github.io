// About page (her 830:489, 2026-11-12): smooth scroll, the top bar (clock,
// Projects menu), Roll pills, the footer's copy button and Back to top, then
// the page itself: the opening room of tiles and the chapters' lines rising in.

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

// The opening: her twelve photo tiles, set where her frame has them, are one
// real size at four depths (the big ones near, the small ones far). They come
// in out of the depth and lean a few degrees with the mouse. The screen
// holds while you scroll and you move forward through the room: each tile
// grows, slides outward and fades as it passes you, until her line is alone
// in the middle; then the page goes on.
{
  const sec = document.querySelector('.ab3-top'), top = sec.querySelector('.ab3-stage'), room = top.querySelector('.ab3-room'), title = top.querySelector('h1'), hint = top.querySelector('.ab3-hint');
  const cam = document.createElement('div'); cam.className = 'ab3-cam';
  const tiles = [...room.querySelectorAll('.ab3-tile')];
  cam.append(...tiles); room.append(cam);
  const F = 1000, NEAR = 187, TRAVEL = 1500;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  let ts = [];
  const lay = () => {
    const W = top.offsetWidth, H = top.offsetHeight, phone = W < 700;
    const kx = W / 1440 * (phone ? 1.3 : 1), ky = H / 900, ks = phone ? .5 : Math.min(W / 1440, H / 900);
    // the clear space her line needs (its lines, not its box), plus air
    const g = document.createRange(); g.selectNodeContents(title);
    const tr = top.getBoundingClientRect(), lines = [...g.getClientRects()].map((r) => ({ l: r.left - tr.left - 16, r: r.right - tr.left + 16, t: r.top - tr.top - 16, b: r.bottom - tr.top + 16 }));
    ts = tiles.map((el, i) => {
      const w = +el.dataset.w, h = +el.dataset.h;
      const sx = (+el.dataset.x + w / 2 - 720) * kx, sy = (+el.dataset.y + h / 2 - 450) * ky;   // its centre, from the middle
      const sw = w * ks, sh = h * ks;
      const hit = lines.some((l) => W / 2 + sx + sw / 2 > l.l && W / 2 + sx - sw / 2 < l.r && H / 2 + sy + sh / 2 > l.t && H / 2 + sy - sh / 2 < l.b);
      el.style.display = hit ? 'none' : '';
      const z = F * (1 - NEAR / w), k = (F - z) / F;                       // depth from its size
      el.style.width = `${(sw * k).toFixed(1)}px`; el.style.height = `${(sh * k).toFixed(1)}px`;
      el.style.borderRadius = `${(Math.max(10, 16 * ks) * k).toFixed(1)}px`;
      return { el, x: sx * k, y: sy * k, z, ph: i * 1.7, hit };
    }).filter((t) => !t.hit);
  };
  lay(); addEventListener('resize', lay);
  const place = (t, z, o, dx = 0, dy = 0) => {
    t.el.style.opacity = o.toFixed(3);
    t.el.style.visibility = o <= .002 ? 'hidden' : '';
    t.el.style.transform = `translate(-50%, -50%) translate3d(${(t.x + dx).toFixed(1)}px, ${(t.y + dy).toFixed(1)}px, ${z.toFixed(1)}px)`;
  };
  const OP = .974;
  if (reduce) {
    for (const t of ts) place(t, t.z, OP);
  } else {
    const intro = { t: 0 };
    // wait until her photos are ready (at most 2.5 s) so no tile flies in empty
    const ready = Promise.all(tiles.map((t) => t.querySelector('img')?.decode().catch(() => {})));
    Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]).then(() => gsap.to(intro, { t: 1, duration: 2.4, ease: 'power2.out', delay: .1 }));
    gsap.from(title, { opacity: 0, filter: 'blur(10px)', duration: 1.4, ease: 'power3.out', delay: .35, clearProps: 'filter' });
    const rx = gsap.quickTo(cam, 'rotationX', { duration: 1.6, ease: 'power3.out' }), ry = gsap.quickTo(cam, 'rotationY', { duration: 1.6, ease: 'power3.out' });
    addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; ry((e.clientX / innerWidth - .5) * 6); rx(-(e.clientY / innerHeight - .5) * 4); });
    const render = (time) => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < 0) return;
      // through the room over the first 85% of the hold; the last of it is her line alone
      const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1), f = clamp(p / .85, 0, 1);
      ts.forEach((t, i) => {
        const e = 1 - Math.pow(1 - clamp(intro.t * 1.5 - i * .04, 0, 1), 3);
        const z = t.z + TRAVEL * f - (1 - e) * 900;
        const o = OP * e * (z > 250 ? clamp(1 - (z - 250) / 450, 0, 1) : 1);
        place(t, z, o, Math.sin(time * .35 + t.ph) * 4, Math.cos(time * .28 + t.ph * 1.3) * 4);
      });
      hint.style.opacity = ((1 - smooth(p / .08)) * smooth((intro.t - .5) / .5)).toFixed(3);
    };
    gsap.ticker.add(render); render(0);
  }
}

// The chapters arrive the way the home page's About statements do: each
// paragraph's lines rise in one after another from behind a mask (lines.js).
lines('.ab3-ch .txt p');

addEventListener('load', () => ScrollTrigger.refresh());
