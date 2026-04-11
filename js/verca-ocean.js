/**
 * WebGL scroll-sync ocean — raymarched waves + sky (CodePen / Less Rain lineage).
 * Sun arc: scroll-driven day→night via uS (see sunProgress = uS / 0.58 in fragment shader).
 * Verca: warm palette, native scroll (no wheel capture), cream uBg vignette, late page fade-out.
 */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('verca-ocean-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  });
  if (!gl) {
    canvas.style.display = 'none';
    return;
  }

  var vsSrc = [
    'attribute vec2 a;',
    'void main() {',
    '  gl_Position = vec4(a, 0.0, 1.0);',
    '}'
  ].join('\n');

  var mobileSteps = isLite ? 14 : 24;
  var mobileRefine = isLite ? 3 : 6;
  var fsSrc = [
    (isLite ? 'precision mediump float;' : 'precision highp float;'),
    'uniform vec2 uR;',
    'uniform float uT, uS, uSc, uBl;',
    'uniform vec3 uBg;',
    '',
    '#define PI 3.14159265359',
    '#define MARCH_STEPS ' + mobileSteps,
    '#define REFINE_STEPS ' + mobileRefine,
    '',
    'vec3 sCol(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {',
    '  int si = int(uSc);',
    '  vec3 a = c0, b = c1;',
    '  if (si == 1) { a = c1; b = c2; }',
    '  else if (si == 2) { a = c2; b = c3; }',
    '  else if (si == 3) { a = c3; b = c4; }',
    '  return mix(a, b, uBl);',
    '}',
    '',
    'float sF(float c0, float c1, float c2, float c3, float c4) {',
    '  int si = int(uSc);',
    '  float a = c0, b = c1;',
    '  if (si == 1) { a = c1; b = c2; }',
    '  else if (si == 2) { a = c2; b = c3; }',
    '  else if (si == 3) { a = c3; b = c4; }',
    '  return mix(a, b, uBl);',
    '}',
    '',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    '',
    'float waveH(vec2 p, float t, float amp) {',
    '  float h = 0.0;',
    '  vec2 swellDir = normalize(vec2(1.0, 0.35));',
    '  float d = dot(p, swellDir);',
    '  h += amp * 0.28 * sin(d * 0.80 + t * 0.60);',
    '  h += amp * 0.40 * sin(p.x * 0.70 + t * 0.55 + p.y * 0.28);',
    '  h += amp * 0.24 * sin(p.x * 1.60 - t * 0.82 + p.y * 0.72);',
    '  h += amp * 0.16 * sin(p.x * 3.10 + t * 1.15 - p.y * 0.50);',
    '  h += amp * 0.10 * sin(p.x * 5.50 - t * 1.70 + p.y * 1.30);',
    '  h += amp * 0.05 * sin(p.x * 8.60 + t * 2.20 + p.y * 1.95);',
    '  float micro = noise(p * 18.0 + vec2(t * 0.35, t * 0.12)) * 0.010;',
    '  h += micro * amp;',
    '  return h;',
    '}',
    '',
    'vec3 waveNorm(vec2 p, float t, float amp) {',
    '  float e = 0.014;',
    '  float hL = waveH(p - vec2(e, 0.0), t, amp);',
    '  float hR = waveH(p + vec2(e, 0.0), t, amp);',
    '  float hD = waveH(p - vec2(0.0, e), t, amp);',
    '  float hU = waveH(p + vec2(0.0, e), t, amp);',
    '  return normalize(vec3(-(hR - hL) / (2.0 * e), 1.0, -(hU - hD) / (2.0 * e)));',
    '}',
    '',
    'void main() {',
    '  vec2 uv = (gl_FragCoord.xy - uR * 0.5) / uR.y;',
    '  vec3 ro = vec3(sin(uT * 0.07) * 0.02, 1.1 + sin(uT * 0.11) * 0.01, 0.0);',
    '  vec3 rd = normalize(vec3(uv.x, uv.y - 0.10, -1.4));',
    '',
    '  // Warm sunny palette — 5 phases: dawn, midday, sunset, night, storm',
    '  vec3 skyTop = sCol(',
    '    vec3(0.42, 0.72, 0.98), vec3(0.35, 0.62, 0.95),',
    '    vec3(0.55, 0.28, 0.12), vec3(0.12, 0.18, 0.42), vec3(0.22, 0.38, 0.62));',
    '  vec3 skyHori = sCol(',
    '    vec3(1.0, 0.78, 0.42), vec3(0.55, 0.78, 0.98),',
    '    vec3(0.98, 0.52, 0.22), vec3(0.25, 0.35, 0.55), vec3(0.45, 0.58, 0.72));',
    '  vec3 sunCol = sCol(',
    '    vec3(1.0, 0.94, 0.62), vec3(1.0, 0.98, 0.88),',
    '    vec3(1.0, 0.72, 0.35), vec3(0.85, 0.88, 0.98), vec3(0.55, 0.60, 0.72));',
    '  vec3 seaDeep = sCol(',
    '    vec3(0.10, 0.22, 0.38), vec3(0.06, 0.22, 0.42),',
    '    vec3(0.14, 0.10, 0.08), vec3(0.02, 0.06, 0.14), vec3(0.08, 0.14, 0.22));',
    '  vec3 seaShlo = sCol(',
    '    vec3(0.35, 0.55, 0.72), vec3(0.18, 0.48, 0.68),',
    '    vec3(0.42, 0.28, 0.18), vec3(0.10, 0.18, 0.32), vec3(0.20, 0.38, 0.48));',
    '  vec3 fogCol = sCol(',
    '    vec3(0.98, 0.88, 0.68), vec3(0.75, 0.86, 0.98),',
    '    vec3(0.92, 0.62, 0.38), vec3(0.18, 0.24, 0.38), vec3(0.42, 0.52, 0.62));',
    '',
    '  // Sun arc — scroll-driven day→night (Less Rain–style uS / 0.58) + jemný dech času',
    '  float sunBreath = sin(uT * 0.18) * 0.02;',
    '  float sunProgress = clamp(uS / 0.58 + sunBreath, 0.0, 1.0);',
    '  float sunAngle = sunProgress * PI;',
    '  float sunArcX = cos(sunAngle) * -0.75;',
    '  float sunArcY = sin(sunAngle) * 0.38 - 0.08;',
    '  vec3 sunDir = normalize(vec3(sunArcX, sunArcY, -1.0));',
    '  vec3 moonDir = normalize(vec3(-0.14, 0.42, -1.0));',
    '',
    '  float warm = smoothstep(0.22, -0.08, sunDir.y);',
    '  sunCol = mix(sunCol, vec3(1.0, 0.62, 0.32), warm * 0.42);',
    '',
    '  float waveAmp = sF(0.08, 0.07, 0.10, 0.05, 0.34);',
    '  float fogDen  = sF(0.018, 0.010, 0.020, 0.032, 0.048);',
    '  float moonAmt = sF(0.0, 0.0, 0.05, 0.92, 0.06);',
    '',
    '  float sunAbove = step(0.0, sunDir.y);',
    '  float sunGlow  = smoothstep(-0.28, 0.18, sunDir.y);',
    '',
    '  vec3 col;',
    '',
    '  if (rd.y < 0.0) {',
    '    float tFlat = ro.y / (-rd.y);',
    '    float baseStep = tFlat / float(MARCH_STEPS);',
    '    float t = baseStep;',
    '    for (int i = 0; i < MARCH_STEPS; i++) {',
    '      vec2 wpTest = ro.xz + rd.xz * t;',
    '      float wy = ro.y + rd.y * t;',
    '      if (wy < waveH(wpTest, uT, waveAmp)) break;',
    '      t += baseStep;',
    '    }',
    '    float ta = t - baseStep;',
    '    float tb = t;',
    '    for (int i = 0; i < REFINE_STEPS; i++) {',
    '      float tm = (ta + tb) * 0.5;',
    '      vec2 wpm = ro.xz + rd.xz * tm;',
    '      if (ro.y + rd.y * tm < waveH(wpm, uT, waveAmp)) tb = tm;',
    '      else ta = tm;',
    '    }',
    '    t = (ta + tb) * 0.5;',
    '    vec2 wp = ro.xz + rd.xz * t;',
    '    vec3 n = waveNorm(wp, uT, waveAmp);',
    '    vec3 vDir = -rd;',
    '    float fres = pow(1.0 - clamp(dot(n, vDir), 0.0, 1.0), 4.0);',
    '    vec3 refl = reflect(rd, n);',
    '    float rh = clamp(refl.y, 0.0, 1.0);',
    '    vec3 reflSky = mix(skyHori, skyTop, pow(rh, 0.42));',
    '    reflSky = mix(reflSky, skyHori, 0.12);',
    '    float rSun = max(dot(refl, sunDir), 0.0);',
    '    reflSky += sunCol * pow(rSun, 128.0) * 2.2 * sunGlow;',
    '    reflSky += sunCol * pow(rSun, 18.0) * 0.08 * sunGlow;',
    '    if (moonAmt > 0.04) {',
    '      float rMoon = max(dot(refl, moonDir), 0.0);',
    '      reflSky += vec3(0.72, 0.80, 0.95) * pow(rMoon, 128.0) * 0.8 * moonAmt;',
    '    }',
    '    float depth = exp(-t * 0.40);',
    '    vec3 waterC = mix(seaDeep, seaShlo, depth * 0.5);',
    '    vec3 absorb = vec3(0.78, 0.90, 1.0);',
    '    waterC *= mix(vec3(1.0), absorb, clamp(t * 0.35, 0.0, 1.0));',
    '    float stormTex = noise(wp * 1.9 + vec2(uT * 0.24, uT * 0.08));',
    '    waterC += stormTex * 0.018 * smoothstep(0.75, 1.0, uS);',
    '    col = mix(waterC, reflSky, 0.15 + fres * 0.35);',
    '    float spec = pow(max(dot(reflect(-sunDir, n), vDir), 0.0), 220.0);',
    '    col += sunCol * spec * 1.25 * sunAbove;',
    '    float broadSpec = pow(max(dot(reflect(-sunDir, n), vDir), 0.0), 36.0);',
    '    col += sunCol * broadSpec * 0.14 * sunGlow;',
    '    float sunLine = pow(max(dot(reflect(rd, n), sunDir), 0.0), 10.0);',
    '    col += sunCol * sunLine * 0.32 * smoothstep(0.0, 0.35, -rd.y) * sunGlow;',
    '    float sparkle = noise(wp * 24.0 + vec2(uT * 0.8, uT * 0.35));',
    '    sparkle = smoothstep(0.92, 1.0, sparkle);',
    '    col += sunCol * sparkle * 0.12 * sunGlow * sunAbove;',
    '    if (moonAmt > 0.04) {',
    '      float mSpec = pow(max(dot(reflect(-moonDir, n), vDir), 0.0), 600.0);',
    '      col += vec3(0.72, 0.80, 0.95) * mSpec * 0.11 * moonAmt;',
    '    }',
    '    float hC = waveH(wp, uT, waveAmp);',
    '    float hL = waveH(wp - vec2(0.02, 0.0), uT, waveAmp);',
    '    float hR = waveH(wp + vec2(0.02, 0.0), uT, waveAmp);',
    '    float hD = waveH(wp - vec2(0.0, 0.02), uT, waveAmp);',
    '    float hU = waveH(wp + vec2(0.0, 0.02), uT, waveAmp);',
    '    float curvature = hR + hL + hU + hD - 4.0 * hC;',
    '    float foam = clamp(curvature * 28.0, 0.0, 1.0);',
    '    col += foam * vec3(1.0) * 0.10 * smoothstep(0.70, 1.0, uS);',
    '    float fog = 1.0 - exp(-t * fogDen);',
    '    col = mix(col, fogCol, fog);',
    '  } else {',
    '    float h = clamp(rd.y, 0.0, 1.0);',
    '    col = mix(skyHori, skyTop, pow(h, 0.38));',
    '  }',
    '',
    '  float horizonW = 0.008;',
    '  float skyMix = smoothstep(-horizonW, horizonW, rd.y);',
    '  vec3 skyCol;',
    '  {',
    '    float h = clamp(rd.y, 0.0, 1.0);',
    '    skyCol = mix(skyHori, skyTop, pow(h, 0.38));',
    '    float sd = max(dot(rd, sunDir), 0.0);',
    '    float glowUse = max(sunGlow, 0.52);',
    '    skyCol += sunCol * pow(sd, 36.0) * 3.2 * glowUse;',
    '    skyCol += sunCol * pow(sd, 18.0) * 0.42 * glowUse;',
    '    skyCol += sunCol * pow(sd, 5.0) * 0.14 * glowUse;',
    '    float sunDisk = smoothstep(0.9905, 0.99975, dot(rd, sunDir));',
    '    skyCol += sunCol * sunDisk * 5.5 * max(sunGlow, 0.5);',
    '    float halo = pow(max(dot(rd, sunDir), 0.0), 2.0);',
    '    skyCol += sunCol * halo * 0.04 * sunGlow;',
    '    float horizonBand = exp(-abs(rd.y) * 24.0);',
    '    skyCol += sunCol * horizonBand * 0.12 * sunGlow;',
    '    float viewSun = max(dot(rd, sunDir), 0.0);',
    '    skyCol += sunCol * pow(viewSun, 3.0) * 0.04 * sunGlow;',
    '    if (moonAmt > 0.04) {',
    '      float md = max(dot(rd, moonDir), 0.0);',
    '      skyCol += vec3(0.88, 0.92, 1.0) * pow(md, 900.0) * 8.0 * moonAmt;',
    '      skyCol += vec3(0.88, 0.92, 1.0) * pow(md, 6.0) * 0.05 * moonAmt;',
    '    }',
    '    float horizonMist = exp(-abs(rd.y) * 40.0);',
    '    skyCol += fogCol * horizonMist * 0.08;',
    '    float horizonFade = exp(-abs(rd.y) * 18.0);',
    '    float lum = dot(skyCol, vec3(0.3333333));',
    '    skyCol = mix(skyCol, vec3(lum), horizonFade * 0.12);',
    '  }',
    '  col = mix(col, skyCol, skyMix);',
    '  float hEdge = smoothstep(-0.008, 0.018, rd.y);',
    '  col = mix(fogCol, col, hEdge * 0.25 + 0.75);',
    '  vec2 uvV = (gl_FragCoord.xy - uR * 0.5) / uR.y;',
    '  float vignette = smoothstep(1.15, 0.35, length(uvV));',
    '  col = mix(uBg, col, vignette);',
    '  float grain = hash(gl_FragCoord.xy + uT * 60.0) - 0.5;',
    '  col += grain * 0.004;',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function mkShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vert = mkShader(gl.VERTEX_SHADER, vsSrc);
  var fragS = mkShader(gl.FRAGMENT_SHADER, fsSrc);
  if (!vert || !fragS) {
    canvas.style.display = 'none';
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, fragS);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    canvas.style.display = 'none';
    return;
  }
  gl.useProgram(prog);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.disable(gl.DITHER);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  var ap = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(ap);
  gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

  var uR = gl.getUniformLocation(prog, 'uR');
  var uTi = gl.getUniformLocation(prog, 'uT');
  var uScroll = gl.getUniformLocation(prog, 'uS');
  var uScene = gl.getUniformLocation(prog, 'uSc');
  var uBlend = gl.getUniformLocation(prog, 'uBl');
  var uBg = gl.getUniformLocation(prog, 'uBg');

  gl.uniform3f(uBg, 245 / 255, 243 / 255, 239 / 255);

  var N = 5;
  var maxScroll = 1;
  var tgt = 0;
  var smooth = 0;
  var isLite = document.documentElement.classList.contains('verca-lite');
  var qualityScale = isLite ? 0.6 : 1;
  var MAX_DPR = isLite ? 1.0 : 1.5;
  var MIN_QUALITY = isLite ? 0.45 : 0.82;
  var MAX_QUALITY = isLite ? 0.7 : 1;
  var resizeRAF = 0;

  var lastCssW = 0;

  function resize() {
    resizeRAF = 0;
    var cssW = Math.round(window.innerWidth);
    var cssH = Math.round(window.innerHeight);
    if (!cssW || !cssH) return;

    if (isLite && lastCssW === cssW && canvas.width > 0) {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - cssH);
      tgt = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      return;
    }
    lastCssW = cssW;

    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var renderScale = dpr * qualityScale;
    var pixelW = Math.max(1, Math.round(cssW * renderScale));
    var pixelH = Math.max(1, Math.round(cssH * renderScale));

    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      gl.viewport(0, 0, pixelW, pixelH);
      gl.uniform2f(uR, pixelW, pixelH);
    }

    maxScroll = Math.max(1, document.documentElement.scrollHeight - cssH);
    tgt = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  }

  function requestResize() {
    if (!resizeRAF) resizeRAF = requestAnimationFrame(resize);
  }

  resize();
  window.addEventListener('resize', requestResize, { passive: true });

  /** Oceán viditelný skoro po celou délku stránky; stmavání až v závěru scrollu (plynulý den→noc podle uS). */
  function updateOceanOpacity() {
    var ms = maxScroll;
    var p = ms > 0 ? window.scrollY / ms : 0;
    if (p <= 0.7) {
      canvas.style.opacity = '1';
    } else if (p >= 0.92) {
      canvas.style.opacity = '0';
    } else {
      canvas.style.opacity = String(1 - (p - 0.7) / 0.22);
    }
  }

  window.addEventListener('scroll', function () {
    tgt = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    updateOceanOpacity();
  }, { passive: true });
  updateOceanOpacity();

  var t0 = performance.now();
  var lastNow = t0;
  var fpsAccum = 0;
  var fpsFrames = 0;
  var lowFpsTime = 0;
  var highFpsTime = 0;

  var FPS_SAMPLE = isLite ? 1.2 : 0.75;
  var LOW_THRESH = isLite ? 35 : 50;
  var HIGH_THRESH = isLite ? 50 : 57;
  var STEP_DOWN = isLite ? 0.1 : 0.06;
  var STEP_UP = isLite ? 0.05 : 0.04;

  function maybeAdjustQuality(dt) {
    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum < FPS_SAMPLE) return;
    var avgDt = fpsAccum / fpsFrames;
    var fps = 1 / avgDt;
    fpsAccum = 0;
    fpsFrames = 0;
    if (fps < LOW_THRESH) {
      lowFpsTime += FPS_SAMPLE;
      highFpsTime = 0;
    } else if (fps > HIGH_THRESH) {
      highFpsTime += FPS_SAMPLE;
      lowFpsTime = 0;
    } else {
      lowFpsTime = 0;
      highFpsTime = 0;
    }
    if (lowFpsTime >= 1.5 && qualityScale > MIN_QUALITY) {
      qualityScale = Math.max(MIN_QUALITY, +(qualityScale - STEP_DOWN).toFixed(2));
      lowFpsTime = 0;
      requestResize();
    }
    if (highFpsTime >= 4 && qualityScale < MAX_QUALITY) {
      qualityScale = Math.min(MAX_QUALITY, +(qualityScale + STEP_UP).toFixed(2));
      highFpsTime = 0;
      requestResize();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min((now - lastNow) * 0.001, 0.033);
    lastNow = now;
    maybeAdjustQuality(dt);

    smooth += (tgt - smooth) * (1 - Math.exp(-dt * 8));
    var raw = smooth * (N - 1);
    var flr = Math.floor(raw);
    var si = Math.min(flr, N - 2);
    var bl = flr >= N - 1 ? 1 : raw - flr;

    var op = parseFloat(canvas.style.opacity || '1');
    if (op < 0.02) return;

    gl.uniform1f(uTi, (now - t0) / 1000);
    gl.uniform1f(uScroll, smooth);
    gl.uniform1f(uScene, si);
    gl.uniform1f(uBlend, bl);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  requestAnimationFrame(frame);
})();
