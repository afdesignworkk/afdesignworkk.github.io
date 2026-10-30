/* How I work: a flight forward through her three things.
     1. the way in: as the work ends the whole page dims and softens into her
        ink, like the lights going down; her grid stays where it is, its
        lines going from light to dark, and the first line comes at you out
        of the dark
     2. the flight: each line has a place in depth (data-z, one step each);
        scrolling carries you forward, slowing at each step but never quite
        stopping, so it keeps gliding. A line ahead is small, faint and a
        little soft; at its step it is sharp; once passed it grows past you,
        softens and is gone. Her grid stays flat behind, so the lines come
        off it towards you. The pointer leans the view a little
     3. the way out: past the last line you keep flying, and the footer
        comes at you: a small screen far off where everything was heading,
        faint at first, growing until it is the page (it lies over the track's last screen
        and is held on the screen until the track ends). The menu and the
        clock step aside as it comes
   The section is a tall track (its height is the whole flight); its stage
   stays on screen, so everything here is a function of how far into the
   track you have scrolled. Without motion: the words stand one after
   another on her ink, and the footer simply follows. */

const {gsap} = window;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = (s, el = document) => el.querySelector(s);
const qa = (s, el = document) => [...el.querySelectorAll(s)];
const clamp01 = v => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
/* from one step to the next: slow at the steps (a quarter speed, never still), quick between */
const glide = t => t - .72 * Math.sin(2 * Math.PI * t) / (2 * Math.PI);
const inOut = t => .5 - Math.cos(Math.PI * clamp01(t)) / 2;

const how = q('.how'), dim = q('.how__dim'), ink = q('.how__ink');
const end = q('.end'), endIn = q('.end__in'), foot = q('.foot');
const says = qa('.say');

if (REDUCED) how.classList.add('is-still');

/* the depth: one step, how far the eye is from the screen */
const STEP = 2400, F = 900;
/* the flight, in screens scrolled into the track: [when, where the camera is] */
const ROUTE = [[0, -1100], [.7, 0], [1.5, STEP], [2.3, STEP * 2], [3.1, STEP * 3], [4.5, STEP * 4.3]];
/* the footer coming at you (from 4% of the screen, over well over a screen of scrolling), and where the track ends */
const OUT = [3.15, 4.5], LAST = 4.65, FIRST = .04;

const camAt = u => {
  if (u <= ROUTE[0][0]) return ROUTE[0][1];
  for (let i = 1; i < ROUTE.length; i++) {
    const [u1, c1] = ROUTE[i], [u0, c0] = ROUTE[i - 1];
    if (u <= u1) return lerp(c0, c1, glide((u - u0) / (u1 - u0)));
  }
  return ROUTE[ROUTE.length - 1][1];
};

/* where things are, worked out again on resize */
let W = 0, H = 0, vw = 0, vh = 0, top = 0, fh = 0, phone = false;
const items = says.map(el => ({
  el, z: +el.dataset.z * STEP, x: 0, y: 0, w: 0,
  d: el.dataset.d.split(',').map(Number), m: el.dataset.m.split(',').map(Number),
}));
function layout() {
  vw = innerWidth; vh = innerHeight; phone = vw <= 760;
  const pad = phone ? 16 : vw <= 1100 ? 48 : 100;
  W = Math.min(vw - pad * 2, 1240); H = Math.min(vh * .62, 620);
  how.style.height = `${(1 + LAST) * vh}px`;
  top = how.getBoundingClientRect().top + scrollY;
  endIn.style.transformOrigin = `${vw / 2}px ${vh / 2}px`;
  fh = end.offsetHeight;
  for (const it of items) {
    it.el.style.transform = 'none';
    it.w = it.el.offsetWidth;
    it.el.style.opacity = 0;
    const [fx, fy] = phone ? it.m : it.d;
    it.x = Math.min(Math.max(fx * W, -vw / 2 + pad), vw / 2 - pad - it.w);
    it.y = fy * H;
  }
}

/* the pointer leans the view */
const lean = {x: 0, y: 0, tx: 0, ty: 0};
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  lean.tx = (e.clientX / vw - .5) * -36; lean.ty = (e.clientY / vh - .5) * -24;
}, {passive: true});

/* a window w × h around (cx, cy) with corners r, as a clip on the footer (h tall) */
const windowAt = (cx, cy, w, h, r, fh) =>
  `inset(${Math.max(0, cy - h / 2)}px ${Math.max(0, vw - cx - w / 2)}px ${Math.max(0, fh - cy - h / 2)}px ${Math.max(0, cx - w / 2)}px round ${r}px)`;

/* 3. the way out: o, how far the footer has come (0 far off, 1 the page) */
let opened = -1;
function footer(u, o, vx, vy, cx, cy) {
  /* held on the screen until the track ends (it lies that far below its top) */
  const hold = Math.max(0, (LAST - u) * vh);
  end.style.transform = hold > 0 && o > 0 ? `translate3d(0, ${(-hold).toFixed(1)}px, 0)` : '';
  foot?.classList.toggle('is-away', o > .5);
  if (o === opened && o >= 1) return;
  opened = o;
  end.style.visibility = o > 0 ? 'visible' : '';
  end.classList.toggle('is-landed', o >= 1);
  if (o <= 0) return;
  /* far off it is faint, like the lines ahead were */
  end.style.opacity = o >= 1 ? '' : smooth(0, .22, o).toFixed(3);
  if (o >= 1) { end.style.clipPath = endIn.style.transform = ''; return; }
  /* growing so that it seems to come at you evenly, from where everything was heading to the middle */
  const k = FIRST * Math.pow(1 / FIRST, o), ox = lerp(vx, cx, o), oy = lerp(vy, cy, o);
  end.style.clipPath = windowAt(ox, oy, vw * k, vh * k, lerp(12, 0, o), fh);
  endIn.style.transform = `translate(${(ox - cx).toFixed(1)}px, ${(oy - cy).toFixed(1)}px) scale(${k.toFixed(4)})`;
}

let dimmed = -1;
function frame() {
  const u = (scrollY - top) / vh;
  if (u < -1.2 || u > LAST + 1) {
    if (dimmed) { dim.style.visibility = 'hidden'; dimmed = 0; }
    footer(u, u > LAST ? 1 : 0, 0, 0, 0, 0);
    return;
  }

  lean.x += (lean.tx - lean.x) * .06; lean.y += (lean.ty - lean.y) * .06;
  /* the stage is still coming up until it reaches the top; until then everything here keeps to the screen */
  const below = Math.max(0, top - scrollY);
  /* where everything heads: the middle, a little low so the lines sit about it */
  const cx = vw / 2, cy = vh / 2 - below, vx = cx + lean.x, vy = cy + H * .08 + lean.y;
  /* 1. the way in: the page dims and softens into her ink (until the footer is the page) */
  const o = inOut((u - OUT[0]) / (OUT[1] - OUT[0]));
  const d = o >= 1 ? 0 : smooth(-.8, -.05, u), appear = smooth(-.35, .1, u);
  if (d !== dimmed) {
    dim.style.visibility = d > 0 ? 'visible' : 'hidden';
    dim.style.opacity = d.toFixed(3);
    dim.style.backdropFilter = dim.style.webkitBackdropFilter = d > 0 && d < 1 ? `blur(${(d * 8).toFixed(1)}px)` : 'none';
    dimmed = d;
  }
  footer(u, o, vx, vy, cx, cy);
  ink.style.visibility = o >= 1 ? 'hidden' : '';
  if (o >= 1) return;

  /* 2. the flight */
  const cam = camAt(u);
  for (const it of items) {
    const rel = it.z - cam;
    if (rel < -F * .5) { it.el.style.opacity = 0; it.el.style.visibility = 'hidden'; continue; }
    const s = F / (F + rel);
    let a, blur;
    /* (the blur is set before the line is scaled, so it is given as it should look, over the scale) */
    if (rel >= 0) { a = 1 - smooth(300, 4200, rel) * .95; blur = smooth(150, 3000, rel) * 1.2 / s; }
    else { a = 1 - smooth(-40, -360, rel); blur = Math.min(10, -rel / 30) / s; }
    a *= appear;
    it.el.style.visibility = a < .01 ? 'hidden' : '';
    it.el.style.opacity = a.toFixed(3);
    it.el.style.filter = blur > .2 ? `blur(${blur.toFixed(1)}px)` : 'none';
    it.el.style.transform = `translate3d(${(vx + it.x * s).toFixed(1)}px, ${(vy + it.y * s).toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
  }
}

if (!REDUCED) {
  end.classList.add('is-dive');
  let resizing = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizing); resizing = requestAnimationFrame(layout); });
  layout();
  document.fonts.ready.then(() => { layout(); gsap.ticker.add(frame); });
}
