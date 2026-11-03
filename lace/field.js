// Dot field: a grid of cells over the middle of the hero. Each frame a shape
// is painted, blurred, into a small mask (4 px a cell), and every cell reads
// how deep inside the shape it is (0 outside … 1 well inside). Cells ease
// toward that, growing fast and shrinking slowly, so a moving shape leaves a
// trail of small dots behind it. A page draws the cells however it likes.

export function field({ hero, canvas, cols, aspect, up = .3, down = .06, box }) {
  const ctx = canvas.getContext('2d');
  const S = 4, rows = Math.round(cols * aspect);
  const mask = document.createElement('canvas'); mask.width = cols * S; mask.height = rows * S;
  const m = mask.getContext('2d', { willReadFrequently: true });
  const cur = new Float32Array(cols * rows), tgt = new Float32Array(cols * rows);
  const L = { c: 10, x: 0, y: 0, dpr: 1, w: 0, h: 0 };

  function size() {
    const w = hero.clientWidth, h = hero.clientHeight, dpr = Math.min(devicePixelRatio, 2), phone = w < 760;
    canvas.width = w * dpr; canvas.height = h * dpr;
    // the field: a calm block in the middle, unless the page gives its own box
    const { bw, cy } = box ? box(w, h, phone) : { bw: phone ? w * .94 : Math.min(w * .46, h * .6 / aspect), cy: h * (phone ? .4 : .45) };
    Object.assign(L, { c: bw / cols, x: (w - bw) / 2, y: cy - bw * aspect / 2, dpr, w, h });
  }
  size(); addEventListener('resize', size);

  // paint(m) draws in unit space: x −1 … 1 across the field, y −aspect … aspect
  function shape(paint) {
    m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, mask.width, mask.height);
    m.filter = `blur(${S * .8}px)`;
    const k = mask.width / 2;
    m.setTransform(k, 0, 0, k, mask.width / 2, mask.height / 2);
    m.fillStyle = '#000'; m.strokeStyle = '#000'; m.globalCompositeOperation = 'source-over';
    paint(m);
    const d = m.getImageData(0, 0, mask.width, mask.height).data;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) tgt[j * cols + i] = d[((j * S + S / 2) * mask.width + i * S + S / 2) * 4 + 3] / 255;
  }

  function step(dt) {
    const f = dt * 60, ku = 1 - Math.pow(1 - up, f), kd = 1 - Math.pow(1 - down, f);
    for (let n = 0; n < cur.length; n++) { const t = tgt[n], c = cur[n]; cur[n] = c + (t - c) * (t > c ? ku : kd); }
  }

  function render(fn) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    fn(ctx, cur, cols, rows, L);
  }

  return { shape, step, render, cols, rows, L, cur };
}

// lace: one round dot a cell, tiny at the edge, overlapping inside. Drawn
// with xor, so where dots overlap they cut each other into lace.
export function lace(ctx, cur, cols, rows, L, ink) {
  ctx.globalCompositeOperation = 'xor'; ctx.fillStyle = ink;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = cur[j * cols + i];
    if (v < .03) continue;
    const r = L.c * (v < .5 ? .06 + v * .54 : .33 + (v - .5) * .84);
    ctx.beginPath(); ctx.arc(L.x + (i + .5) * L.c, L.y + (j + .5) * L.c, r, 0, 6.2832); ctx.fill();
  }
}

// --- shapes, in the field's unit space ---------------------------------------

// a butterfly seen from above; `open` 1 = wings flat, 0 = folded up
export function butterfly(m, open = 1) {
  const sx = .14 + .86 * open;
  for (const side of [-1, 1]) {
    m.save(); m.scale(side * sx, 1);
    m.beginPath(); m.moveTo(.04, -.08);                                   // forewing
    m.bezierCurveTo(.22, -.6, .7, -.86, .92, -.66);
    m.bezierCurveTo(1.03, -.5, .92, -.18, .62, -.06);
    m.bezierCurveTo(.4, .02, .18, .03, .04, .03);
    m.fill();
    m.beginPath(); m.moveTo(.05, .03);                                    // hindwing
    m.bezierCurveTo(.42, .02, .68, .16, .63, .42);
    m.bezierCurveTo(.58, .66, .33, .75, .19, .6);
    m.bezierCurveTo(.1, .5, .06, .3, .04, .1);
    m.fill();
    m.globalCompositeOperation = 'destination-out';                       // the eye spots
    m.beginPath(); m.arc(.62, -.46, .09, 0, 7); m.fill();
    m.beginPath(); m.arc(.37, .43, .06, 0, 7); m.fill();
    m.globalCompositeOperation = 'source-over';
    m.restore();
    m.save(); m.scale(side, 1);                                           // antenna
    m.lineWidth = .035; m.lineCap = 'round';
    m.beginPath(); m.moveTo(.01, -.36); m.quadraticCurveTo(.06, -.62, .2, -.74); m.stroke();
    m.beginPath(); m.arc(.2, -.74, .05, 0, 7); m.fill();
    m.restore();
  }
  m.beginPath(); m.ellipse(0, .04, .055, .42, 0, 0, 7); m.fill();         // body
}

// the pointer cursor
export function cursor(m) {
  m.save(); m.translate(-.05, 0); m.scale(1.15, 1.15);
  m.beginPath();
  m.moveTo(-.32, -.64); m.lineTo(-.32, .42); m.lineTo(-.07, .18); m.lineTo(.1, .58); m.lineTo(.25, .51);
  m.lineTo(.08, .12); m.lineTo(.4, .12); m.closePath(); m.fill();
  m.restore();
}

// a letter in Hanken Grotesk
export function letter(m, ch) {
  m.font = '800 2.1px "Hanken Grotesk"'; m.textAlign = 'center'; m.textBaseline = 'alphabetic';
  m.fillText(ch, 0, .55);
}
