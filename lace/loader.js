// The home page's loader (her Figma storyboard 898:224, "E · Flight"). A plain
// script at the top of <body>: on the first visit of a session it lays a
// cream sheet over the page, holds the page still and runs the progress
// (about 2.6 s, never 100 % before the page and its fonts have loaded);
// flight.js draws the butterfly. Skipped on later visits in the same session,
// on links to a part of the page (#work …) and with reduced motion.
// LOADER.on(fn) gets 0…1; LOADER.done resolves at 100 %; LOADER.finish(mode)
// releases the page's own intro ('instant' = the butterfly already perched).
(() => {
  const html = document.documentElement;
  let seen = false;
  try { seen = sessionStorage.getItem('af-loader') === '1'; sessionStorage.setItem('af-loader', '1'); } catch (e) { /* storage off: show it */ }
  if (seen || location.hash || matchMedia('(prefers-reduced-motion: reduce)').matches) { window.__loaded = Promise.resolve('soft'); return; }

  const ld = document.createElement('div');
  ld.className = 'ld'; ld.setAttribute('aria-hidden', 'true');
  ld.innerHTML = '<canvas></canvas><p class="ld__name">Loading</p><p class="ld__pct">0%</p>';
  document.body.prepend(ld);
  html.classList.add('ld-on');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  let release; window.__loaded = new Promise((r) => { release = r; });
  const hold = (e) => { if (html.classList.contains('ld-on')) e.preventDefault(); };
  addEventListener('wheel', hold, { passive: false, capture: true });
  addEventListener('touchmove', hold, { passive: false, capture: true });
  addEventListener('keydown', (e) => { if (html.classList.contains('ld-on') && [' ', 'ArrowDown', 'PageDown', 'End', 'ArrowUp', 'PageUp', 'Home'].includes(e.key)) e.preventDefault(); }, true);

  let ready = false;
  Promise.all([new Promise((r) => addEventListener('load', r, { once: true })), document.fonts ? document.fonts.ready : 0]).then(() => { ready = true; });
  const fns = [], D = 2600, t0 = performance.now();
  const L = window.LOADER = { p: 0, el: ld, on: (fn) => { fns.push(fn); fn(L.p); }, finish: (mode = 'soft') => { html.classList.remove('ld-on'); release(mode); } };
  L.done = new Promise((res) => {
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / D);
      let p = 1 - Math.pow(1 - k, 2.2); p = p - Math.sin(p * Math.PI * 4) * .025;   // eased, with two small hesitations
      if (!ready) p = Math.min(p, .94);
      L.p += (Math.max(L.p, p) - L.p) * .25;
      if (k >= 1 && ready && L.p > .995) L.p = 1;
      for (const fn of fns) fn(L.p);
      if (L.p === 1) res(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
})();
