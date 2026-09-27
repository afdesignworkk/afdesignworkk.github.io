/* Responsive layout — shared by every page, loaded in the <head> so the scale
   is set before the first paint.

   The pages are designed on a 1440px frame (the Figma files). Three widths:

     1440 and up     the design as it is, centred
     1200 – 1439     the same design scaled down to fit the window: every
                     length in the stylesheets is a number of design pixels
                     times --px, which is 1px here and window/1440 below
     under 1200      the compact layout (responsive.css): one column on
                     phones, two where tablets have the room, with a menu
                     button under 768

   window.RS tells the page scripts which one is showing: RS.compact, RS.s
   (the size of one design pixel, which they multiply their own design
   numbers by) and RS.len(name) (a length custom property, in px). Crossing
   into or out of the compact layout reloads the page, since its scripts are
   set up for one layout or the other. */
(function(){
  const root = document.documentElement;
  const COMPACT = matchMedia('(max-width: 1199.98px)');
  const PHONE = matchMedia('(max-width: 767.98px)');
  const playground = root.classList.contains('playground');

  const RS = window.RS = {
    compact: COMPACT.matches,
    get phone(){ return PHONE.matches; },
    /* One design pixel, in px. Looked at once more the first time a page
       script asks, since by then the page is there and has its scrollbar. */
    get s(){
      if (!checked && document.body) { checked = true; rescale(); }
      return size;
    },
    /* A length custom property (which may be a calc() of --px) in px. */
    len(name){
      const probe = document.createElement('div');
      probe.style.cssText = `position:absolute;visibility:hidden;left:var(${name})`;
      document.body.append(probe);
      const value = parseFloat(getComputedStyle(probe).left) || 0;
      probe.remove();
      return value;
    },
    /* The compact grid: the page gutter, and the three lines — one just
       outside each gutter and one down the middle (responsive.css draws them
       the same way). Rows run at 277 + 279k, as on the design. */
    gutter(width){ return Math.min(48, Math.max(20, 0.052 * width)); },
    gridColumns(width){
      const x = Math.round(RS.gutter(width)) - 8;
      return [x, Math.floor(width / 2), width - x - 1];
    }
  };
  if (RS.compact) root.classList.add('is-compact');
  let size = 1, checked = false;

  /* One design pixel: the window's width over 1440, up to 1px. In the
     compact layout the pages are laid out in real pixels (1px), except the
     playground's board, which keeps the design's arrangement at half size on
     a phone and grows to full size by 1100. */
  function scale(){
    const width = root.clientWidth || innerWidth;
    const s = RS.compact
      ? (playground ? Math.min(1, Math.max(0.5, width / 1100)) : 1)
      : Math.min(1, width / 1440);
    if (RS.compact) {
      // The gutter and the grid lines, to the pixel, for the loading screen's
      // grid to land on.
      const [l, c, r] = RS.gridColumns(width);
      root.style.setProperty('--g', RS.gutter(width) + 'px');
      root.style.setProperty('--grid-l', l + 'px');
      root.style.setProperty('--grid-c', c + 'px');
      root.style.setProperty('--grid-r', r + 'px');
    }
    if (s === size && root.style.getPropertyValue('--px')) return false;
    size = s;
    root.style.setProperty('--px', s + 'px');
    return true;
  }
  scale();
  // Registered before any page script's, so they all read the new scale.
  addEventListener('resize', scale);
  // A scrollbar coming or going changes the width without a resize event:
  // the page's own scrollbar arrives once there is a page, so look again then.
  const rescale = () => { if (scale()) dispatchEvent(new Event('resize')); };
  if (window.ResizeObserver) new ResizeObserver(rescale).observe(root);
  document.addEventListener('DOMContentLoaded', rescale);
  addEventListener('load', rescale);

  COMPACT.addEventListener('change', () => location.reload());
  // A frame can start at another size than it ends up at; if the layout the
  // scripts were set up for is not the one showing, start again (once).
  document.addEventListener('DOMContentLoaded', () => {
    if (COMPACT.matches === RS.compact) return;
    try {
      const last = +sessionStorage.getItem('rs-restart') || 0;
      if (Date.now() - last < 10000) return;
      sessionStorage.setItem('rs-restart', Date.now());
    } catch (err) { return; }
    location.reload();
  });

  /* The headline shapes on About and the case study are SVG text in a
     clipPath, laid out in design pixels; scaled with the page. */
  function knockout(){
    document.querySelectorAll('clipPath#knockout').forEach(clip => {
      if (size === 1) clip.removeAttribute('transform');
      else clip.setAttribute('transform', `scale(${size})`);
    });
  }
  addEventListener('resize', knockout);
  document.addEventListener('DOMContentLoaded', knockout);


  /* ---------- The menu (phones) ----------

     MENU in the top bar opens a black screen that rises in the site's twelve
     bars (in order from the left, each 0.42 long with power2.inOut, 0.035
     apart) with the top bar's links set large and the ways to get in touch
     at the foot. CLOSE, Esc or a link drops it back. A link does what the
     same link in the top bar does, so it glides to its part of the page or
     opens its page. */
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.topbar__menu');
    const nav = document.querySelector('.topbar__nav');
    if (!button || !nav) return;
    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const links = [...nav.querySelectorAll('a')];
    const email = document.querySelector('a[href^="mailto:"]');
    const social = [...document.querySelectorAll('.footer__links a, .ab-footer__links a')];

    const menu = document.createElement('div');
    menu.className = 'rs-menu';
    menu.id = 'site-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Menu');
    menu.hidden = true;
    menu.innerHTML = `
      <div class="rs-menu__top">
        <span class="type-mono-16">AF / DESIGN</span>
        <button class="rs-menu__close type-mono-16" type="button"><span>CLOSE</span><span aria-hidden="true">X</span></button>
      </div>
      <nav class="rs-menu__nav" aria-label="Menu"></nav>
      <div class="rs-menu__foot">
        <p class="rs-menu__status type-mono-12"><span class="rs-menu__dot"></span>OPEN TO WORK</p>
        <div class="rs-menu__contact"></div>
      </div>`;
    const list = menu.querySelector('.rs-menu__nav');
    const items = links.map(link => {
      const a = document.createElement('a');
      a.href = link.getAttribute('href');
      a.className = 'rs-menu__link';
      if (link.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page');
      const inner = document.createElement('span');
      inner.textContent = link.textContent.trim();
      a.append(inner);
      // What the top bar's own link does: its handlers glide down the page,
      // or it opens its page.
      a.addEventListener('click', e => {
        e.preventDefault();
        shut(true);
        link.click();
      });
      list.append(a);
      return inner;
    });
    const contact = menu.querySelector('.rs-menu__contact');
    if (email) {
      const a = email.cloneNode(true);
      a.className = 'rs-menu__email';
      contact.append(a);
    }
    if (social.length) {
      const row = document.createElement('p');
      row.className = 'rs-menu__social type-mono-12';
      social.forEach(link => {
        const a = link.cloneNode(true);
        a.removeAttribute('class');
        row.append(a);
      });
      contact.append(row);
    }
    document.body.append(menu);
    const close = menu.querySelector('.rs-menu__close');
    const fades = [menu.querySelector('.rs-menu__top'), menu.querySelector('.rs-menu__foot')];

    const SLOT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], DUR = 0.42, EACH = 0.035, SPAN = DUR + EACH * 11;
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
    const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const outExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
    function bars(t){
      const W = innerWidth, H = innerHeight, bw = W / 12, pts = [];
      for (let i = 0; i < 12; i++) {
        const y = H * (1 - ease(clamp((t - EACH * SLOT[i]) / DUR, 0, 1)));
        pts.push(`${bw * i}px ${y}px`, `${bw * (i + 1)}px ${y}px`);
      }
      return `polygon(0px ${H}px, ${pts.join(', ')}, ${W}px ${H}px)`;
    }
    // The words come up through their own masks once the bars are most of the way.
    function words(t){
      items.forEach((el, i) => {
        const x = outExpo(clamp((t - 0.3 - i * 0.06) / 0.7, 0, 1));
        el.style.transform = x < 1 ? `translateY(${105 * (1 - x)}%)` : '';
      });
      const f = clamp((t - 0.45) / 0.4, 0, 1);
      fades.forEach(el => { el.style.opacity = f; });
    }
    let anim = 0;
    // Opening runs past the bars (to SPAN + 0.6) so the words can finish;
    // closing only drops the bars.
    function play(from, to, seconds, done){
      const id = ++anim;
      let start = null;
      const frame = t => {
        menu.style.clipPath = bars(t);
        if (to > from) words(t);
      };
      frame(from);
      requestAnimationFrame(function step(now){
        if (id !== anim) return;
        if (start === null) start = now;
        const p = REDUCED ? 1 : clamp((now - start) / 1000 / seconds, 0, 1);
        frame(from + (to - from) * p);
        if (p < 1) return requestAnimationFrame(step);
        if (to > 0) { menu.style.clipPath = ''; words(2); }
        if (done) done();
      });
    }

    let lastFocus = null;
    function open(){
      if (!menu.hidden && root.classList.contains('rs-menu-open')) return;
      lastFocus = document.activeElement;
      menu.hidden = false;
      root.classList.add('rs-menu-open');
      button.setAttribute('aria-expanded', 'true');
      if (window.lenis) window.lenis.stop();
      close.focus({preventScroll: true});
      play(0, SPAN + 0.6, 0.75 + 0.6);
    }
    // At once when a link was chosen, so the page can move under it.
    function shut(quick){
      if (!root.classList.contains('rs-menu-open')) return;
      root.classList.remove('rs-menu-open');
      button.setAttribute('aria-expanded', 'false');
      if (window.lenis) window.lenis.start();
      const done = () => {
        menu.hidden = true;
        if (!quick && lastFocus) lastFocus.focus({preventScroll: true});
      };
      play(SPAN, 0, 0.55, done);
    }
    button.setAttribute('aria-controls', menu.id);
    button.addEventListener('click', open);
    close.addEventListener('click', () => shut(false));
    addEventListener('keydown', e => { if (e.key === 'Escape') shut(false); });
    // A wider window has the menu in the top bar again.
    PHONE.addEventListener('change', () => { if (!PHONE.matches) shut(true); });
  });
})();
