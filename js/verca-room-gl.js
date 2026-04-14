/**
 * WebGL pozadí pro „prostory“ a kontakt — MIT (viz attrib v HTML)
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    document.body.classList.add('reduce-motion');
    return;
  }

  if (document.documentElement.classList.contains('verca-savedata')) {
    document.body.classList.add('no-webgl');
    return;
  }

  var isLite = document.documentElement.classList.contains('verca-lite');

  var canvas = document.getElementById('glcanvas');
  var errEl = document.getElementById('err');
  var gl = canvas && canvas.getContext('webgl', { alpha: false, antialias: false });

  if (!gl) {
    document.body.classList.add('no-webgl');
    if (errEl) {
      errEl.classList.add('is-visible');
      errEl.textContent = 'Animace pozadí není k dispozici — obsah stránky funguje jako obvykle.';
    }
    return;
  }

  var maxDPR = isLite ? 1.0 : (window.devicePixelRatio || 1);
  var lastW = 0;

  function isSunLayoutPage() {
    return document.body && document.body.classList.contains('room-sun-layout');
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (isLite && lastW === w && canvas.width > 0) return;
    lastW = w;
    var d = Math.min(window.devicePixelRatio || 1, maxDPR);
    var scale = isLite ? 0.65 : 1;
    /* room-sun-layout: širší buffer + posun vlevo (kontakt + prostory). */
    var sunLayout = isSunLayoutPage();
    var cssW = sunLayout ? Math.round(w * 1.18) : w;
    var cssLeft = sunLayout ? Math.round(w * -0.11) : 0;
    canvas.width = Math.floor(cssW * d * scale);
    canvas.height = Math.floor(h * d * scale);
    canvas.style.width = cssW + 'px';
    canvas.style.height = h + 'px';
    if (sunLayout) {
      canvas.style.left = cssLeft + 'px';
      canvas.style.right = 'auto';
    } else {
      canvas.style.left = '';
      canvas.style.right = '';
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  var vert = [
    'attribute vec2 pos;',
    'void main() { gl_Position = vec4(pos, 0.0, 1.0); }'
  ].join('\n');

  var loopCount = isLite ? 22 : 42;
  var frag = [
    (isLite ? 'precision mediump float;' : 'precision highp float;'),
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform float u_speed;',
    'void main() {',
    '  vec2 FC = gl_FragCoord.xy;',
    '  float t = u_time * u_speed;',
    '  vec2 r = u_res;',
    '  vec2 p = (FC * 2.0 - r) / r.y;',
    '  vec3 c = vec3(0.0);',
    '  for (float i = 0.0; i < ' + loopCount.toFixed(1) + '; i++) {',
    '    float a = i / 1.5 + t * 0.5;',
    '    vec2 q = p;',
    '    q.x = q.x + sin(q.y * 19.0 + t * 2.0 + i) *',
    '          29.0 * smoothstep(0.0, -2.0, q.y);',
    '    float d = length(q - vec2(cos(a), sin(a)) *',
    '                 (0.4 * smoothstep(0.0, 0.5, -q.y)));',
    '    c = c + vec3(0.38, 0.24, 0.18) * (0.015 / d);',
    '  }',
    '  vec3 col = c * c + 0.05;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var msg = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(msg || 'Shader compile failed');
    }
    return s;
  }

  function link(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'pos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || 'Program link failed');
    }
    return p;
  }

  var program;
  try {
    program = link(compile(vert, gl.VERTEX_SHADER), compile(frag, gl.FRAGMENT_SHADER));
  } catch (e) {
    document.body.classList.add('no-webgl');
    if (errEl) {
      errEl.classList.add('is-visible');
      errEl.textContent = e.message;
    }
    console.error(e);
    return;
  }

  gl.useProgram(program);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var u_res = gl.getUniformLocation(program, 'u_res');
  var u_time = gl.getUniformLocation(program, 'u_time');
  var u_speed = gl.getUniformLocation(program, 'u_speed');

  var SPEED = 0.38;
  var start = performance.now();

  function draw() {
    if (document.hidden) {
      requestAnimationFrame(draw);
      return;
    }
    var now = performance.now();
    var t = (now - start) * 0.001;
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform1f(u_time, t);
    gl.uniform1f(u_speed, SPEED);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(draw);
  }

  draw();

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) start = performance.now();
  });
})();
