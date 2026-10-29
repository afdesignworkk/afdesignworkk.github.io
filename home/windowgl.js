/* The jelly window: the butter outline behind her line, drawn as a slab of
   clear butter jelly lying on the page.
     the shape  a blurred copy of the line (from home.js), sampled
                smoothly (bicubic), wobbling a little at its edge
     the slab   a soft pillow: it rises over a rounded bevel and is flat on
                top; ripples run across it from wherever it was touched
     the look   the page behind (her off-white and her grid lines) seen
                through it, bent by the bevel and the ripples and tinted by
                how much jelly the light goes through; a darker rim, light
                gathering on the edge away from the lamp, watery caustics
                moving inside, a few tiny air bubbles held in it, wet
                highlights, and its own golden shadow on the page
   Every amount is a setting (SETTINGS below), passed in on every draw. */

const NR = 8, NB = 10;

/* the settings the shader reads, in the order of the uK array */
export const SETTINGS = ['bevelW', 'bevelH', 'wobble', 'wobbleSpeed', 'swell', 'dens', 'milk', 'glow', 'bend', 'grid',
  'caustic', 'causticSize', 'causticSpeed', 'spec', 'sharp', 'rim', 'gather', 'bubbles', 'bubbleSize',
  'ripple', 'rippleSpeed', 'rippleWidth', 'shimmer', 'shadow', 'shadowX', 'shadowY'];

const VERT = `
attribute vec2 aP;
void main() { gl_Position = vec4(aP, 0., 1.); }
`;
const FRAG = `
precision highp float;
#define NR ${NR}
#define NB ${NB}
uniform float uK[${SETTINGS.length}];
${SETTINGS.map((k, i) => `#define ${k.toUpperCase()} uK[${i}]`).join('\n')}
uniform vec2 uView;
uniform vec2 uOff;
uniform float uDpr;
uniform float uTime;
uniform sampler2D uMask;
uniform vec2 uMaskRes;
uniform float uTh;
uniform vec3 uPtr;
uniform vec4 uRip[NR];
uniform vec4 uBub[NB];
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uGrid;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}

/* the mask, smooth enough to light: a cubic B-spline from four linear taps */
vec4 cubic(float v) {
  vec4 n = vec4(1., 2., 3., 4.) - v;
  vec4 s = n * n * n;
  float x = s.x, y = s.y - 4. * s.x, z = s.z - 4. * s.y + 6. * s.x;
  return vec4(x, y, z, 6. - x - y - z) / 6.;
}
float maskAt(vec2 c) {
  vec2 uv = c / uView * uMaskRes - .5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xc = cubic(f.x), yc = cubic(f.y);
  vec4 o = uv.xxyy + vec2(-.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (o + vec4(xc.yw, yc.yw) / s) / uMaskRes.xxyy;
  float a = texture2D(uMask, off.xz).r, b = texture2D(uMask, off.yz).r;
  float cc = texture2D(uMask, off.xw).r, d = texture2D(uMask, off.yw).r;
  float sx = s.x / (s.x + s.y), sy = s.z / (s.z + s.w);
  return mix(mix(d, cc, sx), mix(b, a, sx), sy);
}

float wobbleAt(vec2 p) { return (noise(p * .009 + uTime * WOBBLESPEED) - .5) * WOBBLE; }

/* where the jelly's edge is: the line's blur, swelling towards the pointer, wobbling slowly */
float edgeOf(vec2 c, vec2 p) {
  float m = maskAt(c);
  m += uPtr.z * smoothstep(150., 0., distance(p, uPtr.xy)) * SWELL;
  m += wobbleAt(p);
  vec2 ed = min(c, uView - c);
  return m * smoothstep(0., 60., min(ed.x, ed.y));
}

/* rings running out from every touch, with a dent where it started */
float ripples(vec2 p) {
  float r = 0., k = .055 / RIPPLEWIDTH, wd = 95. * RIPPLEWIDTH;
  for (int i = 0; i < NR; i++) {
    vec4 R = uRip[i];
    float dt = uTime - R.z;
    if (dt < 0. || dt > 4.5 || R.w <= 0.) continue;
    float d = distance(p, R.xy), front = dt * RIPPLESPEED;
    r += sin((d - front) * k) * exp(-pow((d - front) / wd, 2.)) * exp(-dt * 1.1) * R.w;
    r -= exp(-d * d / (2500. * RIPPLEWIDTH * RIPPLEWIDTH)) * exp(-dt * 4.) * R.w;
  }
  return r;
}

/* the slab: x = height (0 at the edge, 1 on the flat top), y = the edge value */
vec2 surf(vec2 c) {
  vec2 p = c + uOff;
  float m = edgeOf(c, p);
  float s = clamp((m - uTh) / BEVELW, 0., 1.);
  float h = 1. - pow(1. - s, 2.4);
  h += ripples(p) * RIPPLE * smoothstep(0., .5, s);
  h += (noise(p * .021 + vec2(uTime * .35, -uTime * .28)) - .5) * SHIMMER * s;
  return vec2(h, m);
}

/* the page behind: her off-white and her grid (lines at x 83 / 720 / 1356 of 1440, every 301px down, small rings) */
vec3 page(vec2 q) {
  vec3 bg = vec3(.992, .992, .984);
  if (uGrid <= 0.) return bg;
  float s = uGrid, line = 0.;
  for (int i = 0; i < 3; i++) {
    float X = (i == 0 ? 83.5 : i == 1 ? 720.5 : 1356.5) * s;
    line = max(line, clamp(.5 * s + .5 - abs(q.x - X), 0., 1.));
  }
  float Y = mod(q.y - 300.5 * s, 301. * s);
  Y = min(Y, 301. * s - Y);
  line = max(line, clamp(.5 * s + .5 - Y, 0., 1.));
  float y0 = 300.5 * s + floor((q.y - 300.5 * s) / (301. * s) + .5) * 301. * s;
  for (int i = 0; i < 3; i++) {
    float X = (i == 0 ? 83.5 : i == 1 ? 720.5 : 1356.5) * s;
    line = max(line, clamp(.5 * s + .5 - abs(distance(q, vec2(X, y0)) - 4. * s), 0., 1.));
  }
  return mix(bg, vec3(.72, .69, .63), line * GRID);
}

/* watery light: the bright edges between moving cells */
float cells(vec2 q, float t) {
  vec2 i = floor(q), f = fract(q);
  float d1 = 8., d2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = .5 + .42 * sin(t + 6.2831 * hash2(i + g));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return d2 - d1;
}
float caustic(vec2 q, float t) {
  float a = 1. - smoothstep(0., .16, cells(q, t));
  float b = 1. - smoothstep(0., .12, cells(q * 1.7 + 3.1, t * 1.3 + 2.));
  return a * a * .7 + b * b * .45;
}

void main() {
  vec2 c = vec2(gl_FragCoord.x, uView.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 p = c + uOff;
  vec3 lamp = normalize(vec3(-.5, -.62, .62));

  /* its golden shadow, down and right of it */
  vec2 so = vec2(SHADOWX, SHADOWY);
  float ms = maskAt(c - so);
  ms += wobbleAt(p - so) * smoothstep(0., .15, ms);
  /* (never below a little above zero, or a big jelly would tint the whole canvas) */
  float sa = smoothstep(max(uTh - .32, .03), uTh + .3, ms);
  vec3 sc = mix(uC3, uC1, smoothstep(uTh, uTh + .5, ms));
  sa = clamp(sa * (.16 + .12 * smoothstep(uTh, uTh + .5, ms)) * SHADOW, 0., 1.);

  vec2 S0 = surf(c);
  if (S0.y < uTh - .2) {
    gl_FragColor = vec4(sc * sa, sa);
    return;
  }
  float e = 2.;
  vec2 Sx1 = surf(c + vec2(e, 0.)), Sx0 = surf(c - vec2(e, 0.));
  vec2 Sy1 = surf(c + vec2(0., e)), Sy0 = surf(c - vec2(0., e));
  vec2 gh = vec2(Sx1.x - Sx0.x, Sy1.x - Sy0.x) / (2. * e);
  vec2 gm = vec2(Sx1.y - Sx0.y, Sy1.y - Sy0.y) / (2. * e);
  float aa = max(length(gm) * 1.1, .004);
  float alpha = smoothstep(uTh - aa, uTh + aa, S0.y);
  float h = S0.x, s = clamp((S0.y - uTh) / BEVELW, 0., 1.);
  vec3 n = normalize(vec3(-gh * BEVELH, 1.));

  /* the page through it: bent, and tinted by how much jelly the light crosses */
  vec3 col = page(p - n.xy * BEND);
  col *= pow(uC1, vec3(DENS * (.55 + .8 * h)));
  col = mix(col, uC1, MILK);
  col = mix(col, uC0, GLOW * h);

  /* watery caustics inside, moved by its surface */
  float ca = caustic(p * .011 / CAUSTICSIZE + n.xy * 1.3, uTime * CAUSTICSPEED) * CAUSTIC * (.25 + .75 * h);
  col = mix(col, mix(uC0, vec3(1.), .6), clamp(ca, 0., 1.) * .75);

  /* air bubbles held in it */
  if (BUBBLES > 0.) {
    for (int i = 0; i < NB; i++) {
      vec4 B = uBub[i];
      if (B.z <= 0.) continue;
      vec2 bc = B.xy + n.xy * 7. + vec2(sin(uTime * .7 + B.w), cos(uTime * .55 + B.w * 1.3)) * 1.2;
      float d = distance(c, bc), r = B.z * BUBBLESIZE;
      float inside = smoothstep(r, r - 1., d) * BUBBLES * smoothstep(.25, .6, s);
      float ring = inside * smoothstep(r - 1.8, r - .5, d);
      float hl = smoothstep(r * .38, r * .1, distance(c, bc + vec2(-.32, -.36) * r)) * inside;
      col = mix(col, col * 1.03 + .02, inside * .6);
      col = mix(col, uC3, ring * .5);
      col = mix(col, vec3(1.), hl * .9);
    }
  }

  /* the rim, darker; light gathering on the edge away from the lamp */
  float rim = 1. - smoothstep(0., .1, s);
  col = mix(col, mix(uC2, uC3, .55), rim * RIM);
  col = mix(col, col * uC2, (1. - n.z) * .35);
  vec2 away = normalize(n.xy + 1e-5);
  float gather = max(dot(away, -normalize(lamp.xy)), 0.) * pow(1. - n.z, .7) * smoothstep(.02, .3, s);
  col = mix(col, uC0 * 1.04, clamp(gather * GATHER, 0., 1.));

  /* wet highlights */
  vec3 H = normalize(lamp + vec3(0., 0., 1.));
  float nh = max(dot(n, H), 0.);
  float spec = pow(nh, SHARP) * 1.5 + pow(nh, SHARP * .2) * .2;
  vec3 H2 = normalize(normalize(vec3(.6, -.45, .66)) + vec3(0., 0., 1.));
  spec += pow(max(dot(n, H2), 0.), SHARP * 3.5) * .7;
  col += spec * SPEC;
  col += pow(1. - n.z, 3.) * .16 * SPEC;

  col = min(col, vec3(1.));
  gl_FragColor = vec4(col * alpha + sc * sa * (1. - alpha), alpha + sa * (1. - alpha));
}
`;

const hex = h => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};

export const RIPPLES = NR, BUBBLES = NB;

export function view(canvas) {
  const gl = canvas.getContext('webgl', {alpha: true, premultipliedAlpha: true, antialias: false});
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aP');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uK', 'uView', 'uOff', 'uDpr', 'uTime', 'uMask', 'uMaskRes', 'uTh', 'uPtr', 'uRip', 'uBub', 'uC0', 'uC1', 'uC2', 'uC3', 'uGrid']
    .forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
  gl.uniform1i(U.uMask, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let dpr = 1, w = 1, h = 1;
  function size() {
    dpr = Math.min(devicePixelRatio, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function mask(src) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.uniform2f(U.uMaskRes, src.width, src.height);
  }
  function colours(list) {
    ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) => gl.uniform3fv(U[k], hex(list[i])));
  }
  const K = new Float32Array(SETTINGS.length);
  /* values: an object holding every key of SETTINGS */
  function draw({time, off, th, ptr, ripples, bubbles, values, grid}) {
    SETTINGS.forEach((k, i) => { K[i] = values[k]; });
    gl.uniform1fv(U.uK, K);
    gl.uniform2f(U.uView, w, h);
    gl.uniform2f(U.uOff, off[0], off[1]);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uTh, th);
    gl.uniform3f(U.uPtr, ptr[0], ptr[1], ptr[2]);
    gl.uniform4fv(U.uRip, ripples);
    gl.uniform4fv(U.uBub, bubbles);
    gl.uniform1f(U.uGrid, grid);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  size();
  return {size, mask, colours, draw};
}
