// The footer's wordmark: her name across the whole page, cropped by its
// bottom edge, printed in the butterfly's lace dots (field.js lace: round dots
// on a lattice, tiny at the letters' edges, overlapping inside and cut into
// lace where they overlap). The pointer is a small butterfly passing over: the
// dots under it swell and the lattice shows faintly round it, growing fast
// and settling slowly, so it leaves a trail. Hover only: no click effect.

const foot = document.querySelector('.foot');
const WORD = 'Anna Fesenko';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const box = document.createElement('div');
box.className = 'foot__mark';
box.setAttribute('aria-hidden', 'true');
const cv = document.createElement('canvas');
box.append(cv);
foot.append(box);
const ctx = cv.getContext('2d');

const S = 4;                                     // mask pixels a cell
const mask = document.createElement('canvas'), m = mask.getContext('2d', { willReadFrequently: true });
let cols = 0, rows = 0, c = 8, dpr = 1, W = 0, H = 0;
let base, cur;                                   // letter cover, shown value
let intro = reduce ? 1 : 0, seen = false;          // the word rises in, row by row, when it comes into view
const P = { x: -1e4, y: -1e4, on: false };

function size() {
  W = box.clientWidth; dpr = Math.min(devicePixelRatio, 2);
  if (!W) return;                                // not laid out yet: the fonts-ready call sizes it
  c = Math.max(3, Math.min(8.5, W / 118));       // the page dot grid's half pitch; narrower columns: her desktop wordmark scaled to the column (her 1131:10079)
  cols = Math.ceil(W / c);
  // the type fills the width; its lower part runs off the page
  m.setTransform(1, 0, 0, 1, 0, 0); m.filter = 'none'; m.letterSpacing = '-3px';  // measure at 100 px with the drawn tracking (−.03 em)
  m.font = `500 100px "Hanken Grotesk"`;
  const fs = 100 * (cols * c * .985) / m.measureText(WORD).width;
  const cap = fs * .72;                           // cap height of Hanken Grotesk
  // every row of dots shows (her 732:246: 138 tall at 1440), the last at the page's foot
  rows = Math.ceil((cap * .8 + fs * .06) / c);
  H = Math.round(rows * c + c * .4);
  box.style.height = H + 'px';
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  // the mask: the word, blurred a little, read once per cell
  mask.width = cols * S; mask.height = rows * S;
  const k = S / c;
  m.setTransform(k, 0, 0, k, 0, 0); m.clearRect(0, 0, W, H);
  m.filter = `blur(${c * .35}px)`;
  m.font = `500 ${fs}px "Hanken Grotesk"`; m.letterSpacing = `${-.03 * fs}px`;
  m.textBaseline = 'alphabetic'; m.fillStyle = '#000';
  const w = m.measureText(WORD).width;
  m.fillText(WORD, (W - w) / 2, fs * .06 + cap);
  const d = m.getImageData(0, 0, mask.width, mask.height).data;
  base = new Float32Array(cols * rows);
  cur = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const n = j * cols + i;
    base[n] = d[((j * S + S / 2) * mask.width + i * S + S / 2) * 4 + 3] / 255;
    cur[n] = intro >= 1 ? base[n] : 0;
  }
  wake();
}


function frame(dt) {
  const f = dt * 60, ku = 1 - Math.pow(.7, f), kd = 1 - Math.pow(.95, f);
  const R = c * 9;                               // the butterfly's reach
  let busy = intro < 1;
  if (seen && intro < 1) intro = Math.min(1, intro + dt / 1.4);
  for (let j = 0; j < rows; j++) {
    const cy = (j + .5) * c;
    // rows rise in from the bottom of the word
    const show = intro >= 1 ? 1 : Math.min(1, Math.max(0, (intro * 1.4 - (1 - j / rows) * .4) / 1));
    for (let i = 0; i < cols; i++) {
      const n = j * cols + i, cx = (i + .5) * c;
      let t = base[n] * show;
      if (P.on) {
        const dd = Math.hypot(cx - P.x, cy - P.y);
        if (dd < R) { const g = 1 - dd / R, s = g * g * (3 - 2 * g); t = t > .05 ? Math.min(1.25, t + s * .55) : Math.max(t, s * .32); }
      }
      const v = cur[n], nv = v + (t - v) * (t > v ? ku : kd);
      cur[n] = nv;
      if (Math.abs(nv - t) > .004) busy = true;
    }
  }
  draw();
  return busy;
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'xor'; ctx.fillStyle = getComputedStyle(foot).color || '#1b1b1b';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = cur[j * cols + i];
    if (v < .03) continue;
    const r = c * (v < .5 ? .06 + v * .54 : .33 + (v - .5) * .84);
    ctx.beginPath(); ctx.arc((i + .5) * c, (j + .5) * c, r, 0, 6.2832); ctx.fill();
  }
}

// run only while something moves
let raf = 0, last = 0;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
  raf = frame(dt) ? requestAnimationFrame(loop) : 0;
}
function wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
box.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; Object.assign(P, local(e), { on: true }); wake(); });
box.addEventListener('pointerleave', () => { P.on = false; wake(); });

new IntersectionObserver(([e]) => { if (e.isIntersecting && !seen) { seen = true; if (reduce) intro = 1; wake(); } }, { threshold: .25 }).observe(box);
addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 150); });
(document.fonts?.ready || Promise.resolve()).then(size);
size();
