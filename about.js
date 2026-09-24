/* About page — smooth scrolling and the links that glide, the custom cursor
   and the footer's chrome drips (all the home page's), then what moves while
   you scroll. */

/* Slow, smooth page scrolling (Lenis), as on the home page, and links to a
   part of the page (#…) glide there instead of jumping. */
(function(){
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!REDUCED && window.Lenis) window.lenis = new Lenis({lerp: 0.07, wheelMultiplier: 0.8, autoRaf: true});
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = Math.min(target.getBoundingClientRect().top + scrollY - 32, document.documentElement.scrollHeight - innerHeight);
    if (window.lenis) window.lenis.scrollTo(top, {duration: 1.6});
    else scrollTo({top, behavior: REDUCED ? 'auto' : 'smooth'});
  }));
})();

/* Custom cursor (mouse and trackpad only), the home page's: a 12px blue circle
   eases after the pointer with a snake-like tail. Over a link it turns into
   the inverted circle in blue — on the black footer only the blue circle,
   which keeps its white text white. What sits under the pointer is re-checked
   when the mouse moves or the page scrolls, since the sliding pictures also
   move under a still pointer. */
(function(){
  if (!matchMedia('(pointer: fine)').matches) return;
  const canvas = document.querySelector('.cursor-trail');
  const ctx = canvas.getContext('2d');
  const invert = document.querySelector('.cursor-invert');
  const tint = document.querySelector('.cursor-tint');
  const label = document.querySelector('.cursor-label');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LAG = REDUCED ? 0 : 0.045;                         // head follow, seconds
  const POINTS = REDUCED ? 0 : 20, GAP = 6, CHASE = 0.028; // tail points, max px apart, follow seconds
  const HEAD = 6, TIP = 1.5;                               // radius at the head and at the tail's tip
  const tail = [];
  let x = 0, y = 0, tx = 0, ty = 0, shown = false, check = false, onBlue = false;
  let fade = 1, fadeTo = 1, dirty = true, dpr = 1, last = performance.now();
  document.documentElement.classList.add('has-cursor');

  function resize(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    dirty = true;
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY; check = true;
    if (!shown) {
      x = tx; y = ty; shown = true;
      tail.length = 0;
      for (let i = 0; i < POINTS; i++) tail.push({x, y});
    }
  }, {passive: true});
  addEventListener('scroll', () => { check = true; }, {passive: true});
  document.documentElement.addEventListener('mouseleave', () => {
    shown = false; dirty = true;
    invert.className = 'cursor-invert';
    tint.className = 'cursor-tint';
    label.classList.remove('cursor-label--visible');
  });

  function draw(){
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!shown || fade < 0.01) return;
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';
    ctx.strokeStyle = ctx.fillStyle = onBlue ? '#ffffff' : '#2030d4';
    let px = x, py = y;
    tail.forEach((p, i) => {
      ctx.lineWidth = 2 * (HEAD + (TIP - HEAD) * (i + 1) / POINTS);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p.x, p.y); ctx.stroke();
      px = p.x; py = p.y;
    });
    ctx.beginPath(); ctx.arc(x, y, HEAD, 0, Math.PI * 2); ctx.fill();
  }

  function frame(now){
    const dt = Math.min(now - last, 100) / 1000;
    last = now;
    if (shown) {
      const k = LAG ? 1 - Math.exp(-dt / LAG) : 1;
      const moving = Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05;
      x += (tx - x) * k; y += (ty - y) * k;
      const chase = 1 - Math.exp(-dt / CHASE);
      let px = x, py = y, spread = 0;
      tail.forEach(p => {
        p.x += (px - p.x) * chase; p.y += (py - p.y) * chase;
        const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy);
        if (d > GAP) { p.x = px + dx / d * GAP; p.y = py + dy / d * GAP; }
        spread = Math.max(spread, d);
        px = p.x; py = p.y;
      });
      const at = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (moving || check) { invert.style.transform = tint.style.transform = label.style.transform = at; }
      if (check) {
        check = false;
        const el = document.elementFromPoint(tx, ty);
        const project = !!(el && el.closest('.ab-card'));
        const link = !project && !!(el && el.closest('a[href]'));
        const size = project ? ' cursor--project' : link ? ' cursor--link' : '';
        // Lightening black with the blue gives blue and keeps white text white,
        // so on the black footer the white difference circle is left out.
        const dark = !!(el && el.closest('.ab-footer, .ab-band--black, .a-inter'));
        invert.className = 'cursor-invert' + (dark ? '' : size);
        tint.className = 'cursor-tint' + size;
        label.classList.toggle('cursor-label--visible', project);
        const blue = !!(el && el.closest('.ab-band--blue'));
        if (blue !== onBlue) { onBlue = blue; dirty = true; }
        fadeTo = project || link ? 0 : 1;
      }
      const fk = REDUCED ? 1 : 1 - Math.exp(-dt / 0.08);
      fade += (fadeTo - fade) * fk;
      dirty = dirty || moving || spread > 0.1 || Math.abs(fadeTo - fade) > 0.005;
    }
    if (dirty) { draw(); dirty = false; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
const DRIP_FRAG = `#version 300 es
/* Footer drips: the hero's chrome material (metalFrag) with its settings
   fixed, and a different mask — a pool hanging under the footer text plus the
   drip balls, in page pixels from the footer's top-left corner. The pool's top
   (u_line) sits on a grid line. The bevel range is wider than the hero's (1.9
   instead of 0.9) so the small drops look round. The hero's pointer magnet
   swirls the material here too; there is no press hole. */
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec3  u_balls[24];
uniform int   u_count;
uniform float u_line;
uniform vec2  u_pointer, u_pointer2;
uniform float u_pointerAmp;
out vec4 fragColor;
#define PI 3.14159265358979323846
// the hero's magnet radius (0.4 of its 740px material unit), in this 1000px unit
#define MAGNET_RADIUS 0.296
const float softness=0.15, repetition=5.0, shiftRed=0.3, shiftBlue=0.3;
const float distortion=0.05, contour=0.55, radial=1.0, grain=0.6;

vec2 rotate(vec2 uv,float th){return mat2(cos(th),-sin(th),sin(th),cos(th))*uv;}
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float getColorChanges(float c1,float c2,float sp,vec3 w,float blur,float bump){
  float ch=mix(c2,c1,smoothstep(0.0,2.0*blur,sp));
  float b=w[0];                                   ch=mix(ch,c2,smoothstep(b,b+2.0*blur,sp));
  b=w[0]+0.4*(1.0-bump)*w[1];                     ch=mix(ch,c1,smoothstep(b,b+2.0*blur,sp));
  b=w[0]+0.5*(1.0-bump)*w[1];                     ch=mix(ch,c2,smoothstep(b,b+2.0*blur,sp));
  b=w[0]+w[1];                                    ch=mix(ch,c1,smoothstep(b,b+2.0*blur,sp));
  float gt=(sp-w[0]-w[1])/w[2];
  float grad=mix(c1,c2,smoothstep(0.0,1.0,gt));   ch=mix(ch,grad,smoothstep(b,b+0.5*blur,sp));
  return ch;
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,u_resolution.y-gl_FragCoord.y)*(1440.0/u_resolution.x);
  if(p.y<u_line){fragColor=vec4(0.0);return;}

  // the pool: a band under the text with rounded ends and a flat top
  vec2 d=vec2(max(abs(p.x-720.0)-590.0,0.0),p.y-u_line);
  float s=min(dot(d,d)/6400.0,1.0);
  float edge=(1.0-s)*(1.0-s)*(1.0-s);
  for(int i=0;i<24;i++){
    if(i>=u_count) break;
    vec3 b=u_balls[i];
    if(b.z<=0.0) continue;
    vec2 q=p-b.xy;
    float r=1.79*b.z;  // b.z is the radius a lone ball shows at
    float k=dot(q,q)/(r*r);
    if(k<1.0) edge+=(1.0-k)*(1.0-k)*(1.0-k);
  }
  if(edge<0.2){fragColor=vec4(0.0);return;}

  float t=0.3*(u_time+2.8);
  vec2 centre=vec2(720.0,u_line+133.0);
  vec2 uv=(p-centre)/1000.0+0.5;
  float cycleWidth=repetition;
  vec2 rotatedUV=uv;  // the hero's angle (70) means no rotation

  edge*=2.4;
  edge=1.0-smoothstep(0.65,1.9,edge);
  edge=pow(edge,4.0);
  edge=mix(smoothstep(0.9-2.0*fwidth(edge),0.9,edge),edge,smoothstep(0.0,0.4,contour));
  float opacity=1.0-smoothstep(0.9-2.0*fwidth(edge),0.9,edge);
  edge=1.8*pow(edge,1.5);

  /* pointer magnet, as on the hero: vortex + lens on the material UV only */
  if(u_pointerAmp>0.001){
    vec2 c=(u_pointer-centre)/1000.0+0.5, toP=uv-c;
    float infl=u_pointerAmp*exp(-dot(toP,toP)/(MAGNET_RADIUS*MAGNET_RADIUS));
    vec2 q=rotate(toP,infl*2.6); q*=(1.0-0.55*infl); uv=c+q;
    c=(u_pointer2-centre)/1000.0+0.5; toP=uv-c;
    infl=0.65*u_pointerAmp*exp(-dot(toP,toP)/(MAGNET_RADIUS*MAGNET_RADIUS*2.2));
    q=rotate(toP,-infl*1.4); q*=(1.0-0.26*infl); uv=c+q;
  }

  float diagBLtoTR=rotatedUV.x-rotatedUV.y;
  float diagTLtoBR=rotatedUV.x+rotatedUV.y;
  vec3 color1=vec3(0.98,0.98,1.0);
  vec3 color2=vec3(0.1,0.1,0.1+0.1*smoothstep(0.7,1.3,diagTLtoBR));

  vec2 grad_uv=uv-0.5;
  float dist=length(grad_uv+vec2(0.0,0.2*diagBLtoTR));
  grad_uv=rotate(grad_uv,(0.25-0.2*diagBLtoTR)*PI);

  float rad=length(uv-0.5)*2.0;
  float direction=mix(grad_uv.x,rad,radial);

  float bump=pow(1.8*dist,1.2); bump=1.0-bump; bump*=pow(max(uv.y,0.0),0.3);
  float t1r=0.12/cycleWidth*(1.0-0.4*bump);
  float t2r=0.07/cycleWidth*(1.0+0.4*bump);
  float wide=(1.0-t1r-t2r);
  float t1w=cycleWidth*t1r, t2w=cycleWidth*t2r;

  float noise=snoise(uv-t);
  edge+=(1.0-edge)*distortion*noise;
  direction+=diagBLtoTR;
  direction-=2.0*noise*diagBLtoTR*(smoothstep(0.0,1.0,edge)*(1.0-smoothstep(0.0,1.0,edge)));
  direction*=mix(1.0,1.0-edge,smoothstep(0.5,1.0,contour));
  direction-=1.7*edge*smoothstep(0.5,1.0,contour);
  direction+=0.2*pow(contour,4.0)*(1.0-smoothstep(0.0,1.0,edge));
  bump*=clamp(pow(max(uv.y,0.0),0.1),0.3,1.0);
  direction*=(0.1+(1.1-edge)*bump);
  direction*=(0.4+0.6*(1.0-smoothstep(0.5,1.0,edge)));
  direction+=0.18*(smoothstep(0.1,0.2,uv.y)*(1.0-smoothstep(0.2,0.4,uv.y)));
  direction+=0.03*(smoothstep(0.1,0.2,1.0-uv.y)*(1.0-smoothstep(0.2,0.4,1.0-uv.y)));
  direction*=(0.5+0.5*pow(uv.y,2.0));
  direction*=cycleWidth; direction-=t;

  float cd=clamp(1.0-bump,0.0,1.0);
  float dR=cd; dR+=0.03*bump*noise;
  dR+=5.0*(smoothstep(-0.1,0.2,uv.y)*(1.0-smoothstep(0.1,0.5,uv.y)))*(smoothstep(0.4,0.6,bump)*(1.0-smoothstep(0.4,1.0,bump)));
  dR-=diagBLtoTR;
  float dB=cd*1.3;
  dB+=(smoothstep(0.0,0.4,uv.y)*(1.0-smoothstep(0.1,0.8,uv.y)))*(smoothstep(0.4,0.6,bump)*(1.0-smoothstep(0.4,0.8,bump)));
  dB-=0.2*edge;
  dR*=(shiftRed/20.0); dB*=(shiftBlue/20.0);

  float blur=softness/15.0;
  vec3 w=vec3(t1w,t2w,wide);
  w[1]-=0.02*smoothstep(0.0,1.0,edge+bump);

  float gs=floor(u_time*9.0);
  float g1=hash21(gl_FragCoord.xy+gs)-0.5;
  float g2=hash21(gl_FragCoord.xy+gs+17.3)-0.5;
  float g3=hash21(gl_FragCoord.xy+gs+41.7)-0.5;
  float ga=grain*0.6;

  float sr=fract(direction+dR+ga*g1);
  float r=getColorChanges(color1.r,color2.r,sr,w,blur+fwidth(sr),bump);
  float sg=fract(direction+ga*g2);
  float g=getColorChanges(color1.g,color2.g,sg,w,blur+fwidth(sg),bump);
  float sb=fract(direction-dB+ga*g3);
  float b=getColorChanges(color1.b,color2.b,sb,w,blur+fwidth(sb),bump);

  vec3 color=vec3(r,g,b)*opacity;
  color+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-0.5)/255.0;
  fragColor=vec4(color,opacity);
}
`;

/* Footer drips: the hero's chrome hangs as a pool under the footer text (drawn
   by dripFrag), and drips gather in it and fall off the bottom of the footer.
   Six drips at a time. Each waits up to 0.8s, then gathers for 1.5–2.6s: a
   drop grows and sinks while a neck ball between it and the pool stretches
   the drip. Then it lets go — the neck snaps back into the pool and the drop
   falls with gravity, trailing a smaller ball that turns it into a teardrop at
   speed — and once it is out of the footer it starts again somewhere else
   along the pool. The pool's top sits on a grid line, and the pointer swirls
   the chrome like the hero's magnet. It runs only while the footer is on screen,
   and stands still (with no magnet) under reduced motion. */
(function(){
  const canvas = document.querySelector('.ab-footer__drips');
  if (!canvas) return;   // the Figma About page's short footer has no room to drip
  const gl = canvas.getContext('webgl2', {antialias: false, premultipliedAlpha: true});
  if (!gl) return;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const H = 660, MAX = 24, DRIPS = 6, GRAVITY = 900;
  const clamp = x => Math.min(Math.max(x, 0), 1);

  /* The pool's top sits on a grid line. The grid is fixed to the screen (rows
     at 277 + 279k, as in grid-overlay.svg) and the footer to its bottom, so the
     row depends on the window height: the one nearest the designed 394px that
     clears the footer links (356) and leaves room to drip (520), or 394 itself
     when no row falls in between. */
  const ROW = 277, ROW_GAP = 279, LINE = 394, LINE_MIN = 356, LINE_MAX = 520;
  let line = LINE;
  function placeLine(footerTop) {
    let best = null;
    for (let y = ROW - footerTop; y <= LINE_MAX; y += ROW_GAP) {
      if (y >= LINE_MIN && (best === null || Math.abs(y - LINE) < Math.abs(best - LINE))) best = y;
    }
    line = best === null ? LINE : best;
  }
  placeLine(innerHeight - H);

  /* Pointer magnet, as on the hero plate: while the pointer is over the footer
     the chrome's reflections swirl around it, with a second, lagging swirl
     behind; the strength eases in over 0.09s and out over 0.3s. */
  const MAGNET = 1.35;
  const pointer = {x: 0, y: 0, on: false}, lag = {x: 0, y: 0, set: false};
  let amp = 0;
  if (!REDUCED) {
    addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true; }, {passive: true});
    addEventListener('pointerleave', () => { pointer.on = false; }, {passive: true});
  }

  const drips = [];
  function restart(drip, now) {
    let x = 0;
    for (let tries = 0; tries < 30; tries++) {
      x = 150 + Math.random() * 1140;
      if (drips.every(o => o === drip || Math.abs(o.x - x) > 150)) break;
    }
    Object.assign(drip, {
      x, R: 26 + 16 * Math.random(), start: now + 0.1 + 0.7 * Math.random(), gather: 1.5 + 1.1 * Math.random(),
      falling: false, y: line, v: 0, size: 0, neck: 0, neckY: line
    });
  }
  // first starts 0.5s apart, so the drips never gather and fall in step
  for (let i = 0; i < DRIPS; i++) { drips.push({x: -999}); restart(drips[i], i * 0.5); }

  const balls = new Float32Array(MAX * 3);
  let count = 0;
  const ball = (x, y, r) => { if (count < MAX) balls.set([x, y, Math.max(r, 0)], 3 * count++); };

  function step(now, dt) {
    count = 0;
    // three wide swells keep the pool's lower edge moving slowly
    for (let i = 0; i < 3; i++) {
      ball(720 + 470 * Math.sin(now * (0.07 + 0.02 * i) + i * 2.1), line + 8, 36 + 8 * Math.sin(now * 0.3 + i * 1.7));
    }
    drips.forEach(d => {
      if (now < d.start) return;
      if (!d.falling) {
        const u = clamp((now - d.start) / d.gather), e = u * u * (3 - 2 * u);
        d.size = d.R * (0.3 + 0.7 * e);
        d.y = line + 10 + 58 * Math.pow(e, 1.3);
        d.neck = 0.6 * d.R * e;
        d.neckY = line + 0.45 * (d.y - line);
        if (u >= 1) { d.falling = true; d.v = 40; }
      } else {
        d.v += GRAVITY * dt;
        d.y += d.v * dt;
        const snap = 1 - Math.exp(-dt / 0.1);
        d.neck -= d.neck * snap;
        d.neckY += (line + 6 - d.neckY) * snap;
        if (d.y > H + 2 * d.R) { restart(d, now); return; }
      }
      ball(d.x, d.y, d.size);
      if (d.neck > 0.5) ball(d.x, d.neckY, d.neck);
      if (d.falling) ball(d.x, d.y - Math.min(d.v * 0.03, 0.9 * d.R), 0.55 * d.size);
    });
  }

  // Settle into a running state first, so drips are already mid-way when the footer shows.
  let clock = 0;
  for (; clock < 9; clock += 1 / 60) step(clock, 1 / 60);

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, DRIP_FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const attr = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
  const loc = {
    res: 'u_resolution', time: 'u_time', balls: 'u_balls', count: 'u_count', line: 'u_line',
    ptr: 'u_pointer', ptr2: 'u_pointer2', amp: 'u_pointerAmp'
  };
  Object.keys(loc).forEach(key => { loc[key] = gl.getUniformLocation(program, loc[key]); });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 20);
    last = now;
    // Only while the footer is on screen.
    const {top, bottom} = canvas.getBoundingClientRect();
    if (top < innerHeight && bottom > 0) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      // The pool lines up with a grid row once the footer reaches the bottom of
      // the screen, at the end of the page, and stays put while it scrolls in.
      const box = canvas.getBoundingClientRect();
      placeLine(innerHeight - H);
      if (!REDUCED) { clock += dt; step(clock, dt); }

      // Pointer in footer pixels; the lagging swirl chases it.
      const px = (pointer.x - box.left) * 1440 / box.width, py = (pointer.y - box.top) * 1440 / box.width;
      const target = pointer.on && px >= 0 && px <= 1440 && py >= 0 && py <= H ? MAGNET : 0;
      amp += (target - amp) * (1 - Math.exp(-dt / (target > amp ? 0.09 : 0.3)));
      if (pointer.on && !lag.set) { lag.x = px; lag.y = py; lag.set = true; }
      const follow = 1 - Math.exp(-dt / 0.13);
      lag.x += (px - lag.x) * follow;
      lag.y += (py - lag.y) * follow;

      gl.uniform2f(loc.res, w, h);
      gl.uniform1f(loc.time, clock);
      gl.uniform3fv(loc.balls, balls);
      gl.uniform1i(loc.count, count);
      gl.uniform1f(loc.line, line);
      gl.uniform2f(loc.ptr, px, py);
      gl.uniform2f(loc.ptr2, lag.x, lag.y);
      gl.uniform1f(loc.amp, amp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();



/* About page — what moves while you scroll: the photograph's hand-over to the
   story, the story's words, the pictures and the footer's bars. (Lenis, the
   cursor and the footer drips are above.)

   All of it is drawn from one function, on Lenis's own scroll event — the
   frame the page moves in; the browser's scroll event only arrives a frame
   later, which is enough to make things that move against the page shiver.
   Nothing is measured while scrolling: where everything sits on the page is
   taken once (again on resize, and when the fonts land), so a frame is only
   sums, and a style is written only when it changes. Under reduced motion
   none of it runs and the stylesheet leaves everything in place. */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const cssPx = name => parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const inOut = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // power2.inOut
  const pageTop = el => el.getBoundingClientRect().top + scrollY;

  const written = new WeakMap();
  function set(el, prop, value){
    let seen = written.get(el);
    if (!seen) written.set(el, seen = {});
    if (seen[prop] === value) return;
    seen[prop] = value;
    el.style[prop] = value;
  }


  /* 1. The hand-over from the hero, as on the home page: the photograph sticks
     84px from the top, then over --hero-pin of scroll shrinks toward its top
     centre — cropped, not scaled — from 1240 x 435 to 608 x 356, lifting so
     its top edge ends 32px from the top of the window, while the story comes
     up below it. The numbers are index.html's. */
  const track = document.querySelector('.ap-hero__track');
  const plate = document.querySelector('.ap-hero__plate');
  const INSET_X = 316, INSET_Y = 39.5, LIFT = 91.5;
  const hero = {start: 0, dist: 0};

  function drawHero(y){
    if (!plate) return;
    const e = hero.dist ? inOut(clamp((y - hero.start) / hero.dist, 0, 1)) : 0;
    set(plate, 'transform', e ? `translateY(${(-LIFT * e).toFixed(2)}px)` : '');
    set(plate, 'clipPath', e ? `inset(${(INSET_Y * e).toFixed(2)}px ${(INSET_X * e).toFixed(2)}px round 4px)` : '');
  }


  /* 2. The story reads the way the home page's introduction does: the words
     fade up out of a 20% ghost of themselves, one after another, as the
     section crosses the screen — run once per section. Progress runs from 0
     when the section's top is at 82% of the screen to 1 when its bottom
     reaches 75%, so a section is always fully read before the next one starts
     (the sections are 140px apart, more than 7% of any window up to 2000px).
     Word i of n fades in over [i/n, (i+1)/n]; the words are wrapped in spans
     with the spaces left as text, so the lines break exactly where they did. */
  const IN = 0.82, OUT = 0.75;
  const stories = [...document.querySelectorAll('.ap-section')].map(section => {
    const spans = [...section.querySelectorAll('.ap-section__body p')].flatMap(p => {
      const words = p.textContent.split(' ');
      p.textContent = '';
      return words.map((word, i) => {
        if (i) p.append(' ');
        const span = document.createElement('span');
        span.textContent = word;
        p.append(span);
        return span;
      });
    });
    return {section, spans, top: 0, height: 0};
  }).filter(story => story.spans.length);

  function drawStory(y, vh){
    for (const story of stories) {
      const top = story.top - y;
      const progress = clamp((IN * vh - top) / ((IN - OUT) * vh + story.height), 0, 1);
      const n = story.spans.length;
      story.spans.forEach((span, i) => {
        const o = clamp(progress * n - i, 0, 1);
        set(span, 'opacity', (0.2 + 0.8 * o).toFixed(3));   // 20% ghost + the word over it
      });
    }
  }


  /* 3. The pictures slide sideways the whole way down — the first row to the
     right, the second to the left, each at its own pace (data-pace, px across
     per px of scroll) — and keep going while the footer rises over them. The
     slide is 0 at the moment the screen comes to hold, so that is when the
     rows sit where the mockup has them, and it is kept within what each row
     can cover: never showing its right end, nor its left end if it runs off
     that side.

     The screen itself holds (it is sticky), but the rows don't stop dead with
     it: over the last SETTLE px of scroll before the hold they start to lag
     behind the page, and over the first SETTLE after it they drift up into
     place, so their speed falls smoothly from the page's to nothing — the
     quadratic that meets both straight lines, (s - SETTLE)^2 / 4 SETTLE from
     where it holds, s being the scroll past the hold. */
  const end = document.querySelector('.ap-end');
  const strips = document.querySelector('.ap-strips');
  const rows = [...document.querySelectorAll('.ap-strip[data-pace]')].map(el => ({
    el, pace: parseFloat(el.dataset.pace) || 0, min: -Infinity, max: Infinity,
  }));
  const SETTLE = 300;
  const gallery = {hold: 0};

  function drawGallery(y){
    if (!end || !strips) return;
    const s = y - gallery.hold;
    let lag = 0;
    if (s > -SETTLE && s < 0) lag = (s + SETTLE) ** 2 / (4 * SETTLE);
    else if (s >= 0 && s < SETTLE) lag = (s - SETTLE) ** 2 / (4 * SETTLE);
    set(strips, 'transform', lag ? `translate3d(0, ${lag.toFixed(2)}px, 0)` : '');
    for (const row of rows) {
      const x = clamp(row.pace * s, row.min, row.max);
      set(row.el, 'transform', `translate3d(${x.toFixed(2)}px, 0, 0)`);
    }
  }


  /* 4. The footer comes up over the pictures through twelve vertical bars — the
     home page's bars (each 0.42 long with power2.inOut, 0.035 apart, starting
     in a scattered order), every one opening from the bottom as far as the
     footer is tall. The footer is in two stages, its black ground under the
     grid lines and its words over them, and both take the same clip so they
     rise as one. It takes the last --ap-reveal of scroll, so the page ends as
     the last bar is up. The bar edges keep their fractions of a pixel, so a
     slow scroll moves them smoothly rather than a pixel at a time. */
  const stages = [...document.querySelectorAll('.ap-end__stage')];
  const footer = document.querySelector('.ap-end__stage .ab-footer');
  const BARS = 12, DUR = 0.42, EACH = 0.035;
  const SLOT = [4, 9, 1, 7, 11, 2, 6, 0, 10, 5, 8, 3];  // start order, left to right
  const bars = {top: 0, height: 0, reveal: 0, footer: 0, width: 1440};

  function drawFooter(y, vh){
    if (!end || !footer || !bars.reveal) return;
    const pin = bars.height - vh;                // scroll the stages stay stuck for
    const p = clamp((y - bars.top - (pin - bars.reveal)) / bars.reveal, 0, 1);
    const t = p * (DUR + EACH * (BARS - 1));
    const steps = [];
    for (let i = BARS - 1; i >= 0; i--) {         // right bar to left, as in the polygon
      const open = inOut(clamp((t - EACH * SLOT[i]) / DUR, 0, 1));
      const edge = (vh - bars.footer * open).toFixed(1);
      steps.push(`${bars.width / BARS * (i + 1)}px ${edge}px`, `${bars.width / BARS * i}px ${edge}px`);
    }
    const clip = `polygon(0 100%, 100% 100%, ${steps.join(', ')})`;
    stages.forEach(stage => set(stage, 'clipPath', clip));
  }


  /* Where everything sits on the page — the only place that reads layout. */
  function measure(){
    if (track) {
      hero.start = pageTop(track) - parseFloat(getComputedStyle(plate).top);
      hero.dist = cssPx('--hero-pin');
    }
    for (const story of stories) {
      story.top = pageTop(story.section);
      story.height = story.section.offsetHeight;
    }
    if (end) {
      gallery.hold = pageTop(end);
      bars.top = gallery.hold;
      bars.height = end.offsetHeight;
      bars.reveal = cssPx('--ap-reveal');
      bars.width = end.offsetWidth;
    }
    if (footer) bars.footer = footer.offsetHeight;
    const width = strips ? strips.offsetWidth : 1440;
    for (const row of rows) {
      const figures = row.el.children;
      if (!figures.length) continue;
      const first = figures[0], last = figures[figures.length - 1];
      const left = row.el.offsetLeft;             // its margin, in .ap-strips
      const right = left + last.offsetLeft + last.offsetWidth - first.offsetLeft;
      row.min = width - right;                    // never pull its right end on
      row.max = left < 0 ? -left : Infinity;      // nor its left end, if it hangs off
    }
  }

  function draw(){
    const y = scrollY, vh = innerHeight;
    drawHero(y);
    drawStory(y, vh);
    drawGallery(y);
    drawFooter(y, vh);
  }

  function refresh(){ measure(); draw(); }

  if (window.lenis) window.lenis.on('scroll', draw);
  addEventListener('scroll', draw, {passive: true});   // Lenis off, or a native scroll it passes on
  addEventListener('resize', refresh);
  addEventListener('load', refresh);
  if (document.fonts) document.fonts.ready.then(refresh);
  refresh();
})();


/* CONTACT means "the end of the page" now that the footer is pinned: where it
   sits in the flow is only where its bars start from. the anchor script above
   already put a handler on these links, so this one is registered after it and its scroll
   is the one that lands. (Under reduced motion the footer is in the flow, and
   the anchor script's own handler takes you to it.) */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('a[href="#contact"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const top = document.documentElement.scrollHeight - innerHeight;
      if (window.lenis) window.lenis.scrollTo(top, {duration: 1.6});
      else scrollTo({top, behavior: 'smooth'});
    });
  });
})();
