/**
 * Vstupní brána — particles.js „grab“ + jemný canvas overlay (linky ke kurzoru, květy podél segmentů).
 * Viz interactive-particle-glow/ (MIT). ?gate=1 znovu zobrazí bránu.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  if (root.classList.contains('verca-entry-done')) return;
  /* Brána zůstává i při verca-savedata (úspora dat) — particles běží v lite režimu; těžké věci řeší perf-boot jinde. */

  var gate = document.getElementById('verca-entry-gate');
  if (!gate) return;

  var reduceMotion = root.classList.contains('reduce-motion');
  if (reduceMotion) {
    root.classList.add('verca-entry-done');
    return;
  }

  var finished = false;
  var cleaned = false;
  var adornRaf = null;
  var mousePx = { x: 0, y: 0 };
  var mouseSmooth = { x: 0, y: 0 };

  function getEntryPJS() {
    try {
      var dom = window.pJSDom;
      if (!dom || !dom.length) return null;
      for (var i = dom.length - 1; i >= 0; i--) {
        var inst = dom[i];
        if (!inst || !inst.pJS || !inst.pJS.canvas || !inst.pJS.canvas.el) continue;
        var parent = inst.pJS.canvas.el.parentElement;
        if (parent && parent.id === 'verca-entry-particles') return inst.pJS;
      }
    } catch (e) {}
    return null;
  }

  function resizeAdorn() {
    var adorn = document.getElementById('verca-entry-line-adorn');
    var pc = document.querySelector('#verca-entry-particles canvas');
    if (!adorn || !pc) return;
    adorn.width = pc.width;
    adorn.height = pc.height;
    adorn.style.width = pc.offsetWidth + 'px';
    adorn.style.height = pc.offsetHeight + 'px';
  }

  function drawFlowerKnot(ctx, x, y, r, phase) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.translate(x, y);
    ctx.rotate(phase);
    var c1 = 'rgba(240, 220, 200, 0.65)';
    var c2 = 'rgba(176, 108, 82, 0.4)';
    for (var k = 0; k < 6; k++) {
      var ang = (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(ang) * r * 0.4,
        Math.sin(ang) * r * 0.4,
        r * 0.48,
        r * 0.2,
        ang + Math.PI / 2,
        0,
        Math.PI * 2
      );
      var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      grd.addColorStop(0, c1);
      grd.addColorStop(1, c2);
      ctx.fillStyle = grd;
      ctx.fill();
    }
    ctx.restore();
  }

  function lineAdornTick() {
    if (finished || root.classList.contains('verca-entry-done')) return;

    var lite = root.classList.contains('verca-lite');
    var adorn = document.getElementById('verca-entry-line-adorn');
    var pJS = getEntryPJS();
    if (!adorn || !pJS || !pJS.particles || !pJS.particles.array) {
      adornRaf = window.requestAnimationFrame(lineAdornTick);
      return;
    }

    var cnv = pJS.canvas.el;
    if (!cnv || adorn.width !== cnv.width || adorn.height !== cnv.height) resizeAdorn();

    var ctx = adorn.getContext('2d');
    var w = adorn.width;
    var h = adorn.height;
    ctx.clearRect(0, 0, w, h);

    mouseSmooth.x += (mousePx.x - mouseSmooth.x) * 0.11;
    mouseSmooth.y += (mousePx.y - mouseSmooth.y) * 0.11;

    var mx = mouseSmooth.x;
    var my = mouseSmooth.y;
    var dMax = lite ? 300 : 400;
    var maxL = lite ? 28 : 48;
    var arr = pJS.particles.array;
    var scored = [];
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      var dx = mx - p.x;
      var dy = my - p.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > dMax) continue;
      scored.push({ p: p, d: d });
    }
    scored.sort(function (a, b) {
      return a.d - b.d;
    });

    var tNow = performance.now() * 0.001;
    for (var j = 0; j < Math.min(maxL, scored.length); j++) {
      var item = scored[j];
      var px = item.p.x;
      var py = item.p.y;
      var g = ctx.createLinearGradient(px, py, mx, my);
      g.addColorStop(0, 'rgba(184,100,71,0.1)');
      g.addColorStop(0.42, 'rgba(210,168,140,0.22)');
      g.addColorStop(1, 'rgba(255,252,248,0.02)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.05;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(232, 196, 181, 0.28)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.shadowBlur = 0;

      var t1 = 0.3 + (j % 6) * 0.035;
      var t2 = 0.58 + (j % 5) * 0.028;
      var fx1 = px + (mx - px) * t1;
      var fy1 = py + (my - py) * t1;
      var fx2 = px + (mx - px) * t2;
      var fy2 = py + (my - py) * t2;
      drawFlowerKnot(ctx, fx1, fy1, 5.4, tNow * 0.07 + j * 0.31);
      drawFlowerKnot(ctx, fx2, fy2, 4.4, -tNow * 0.055 - j * 0.26);
    }

    adornRaf = window.requestAnimationFrame(lineAdornTick);
  }

  function startLineAdorn() {
    var adorn = document.getElementById('verca-entry-line-adorn');
    if (!adorn) return;
    resizeAdorn();
    window.addEventListener('resize', resizeAdorn, { passive: true });
    adornRaf = window.requestAnimationFrame(lineAdornTick);
  }

  function getParticlesCanvas() {
    return document.querySelector('#verca-entry-particles canvas');
  }

  function updateMousePxFromClient(clientX, clientY) {
    var c = getParticlesCanvas();
    if (!c) return;
    var r = c.getBoundingClientRect();
    var sx = c.width / Math.max(1, c.offsetWidth);
    var sy = c.height / Math.max(1, c.offsetHeight);
    mousePx.x = (clientX - r.left) * sx;
    mousePx.y = (clientY - r.top) * sy;
  }

  function recenterMousePx() {
    var c = getParticlesCanvas();
    if (!c) return;
    mousePx.x = c.width * 0.5;
    mousePx.y = c.height * 0.5;
  }

  gate.addEventListener(
    'mousemove',
    function (ev) {
      updateMousePxFromClient(ev.clientX, ev.clientY);
    },
    { passive: true }
  );

  gate.addEventListener('mouseleave', recenterMousePx);

  function onGateTouch(ev) {
    if (!ev.touches || ev.touches.length < 1) return;
    var t = ev.touches[0];
    updateMousePxFromClient(t.clientX, t.clientY);
  }

  gate.addEventListener('touchstart', onGateTouch, { passive: true });
  gate.addEventListener('touchmove', onGateTouch, { passive: true });
  gate.addEventListener(
    'touchend',
    function (ev) {
      if (ev.touches.length === 0) recenterMousePx();
      else onGateTouch(ev);
    },
    { passive: true }
  );
  gate.addEventListener(
    'touchcancel',
    function (ev) {
      if (ev.touches.length === 0) recenterMousePx();
      else onGateTouch(ev);
    },
    { passive: true }
  );

  function destroyParticles() {
    if (typeof window.pJSDom !== 'undefined' && window.pJSDom && window.pJSDom.length) {
      try {
        window.pJSDom.forEach(function (instance) {
          if (instance && instance.pJS && typeof instance.pJS.fn.vendors.destroypJS === 'function') {
            instance.pJS.fn.vendors.destroypJS();
          }
        });
      } catch (e) {}
      window.pJSDom = [];
    }
  }

  function finishEntry() {
    if (finished) return;
    finished = true;
    if (adornRaf) {
      window.cancelAnimationFrame(adornRaf);
      adornRaf = null;
    }
    gate.classList.add('verca-entry-gate--out');
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      try {
        sessionStorage.setItem('vercaEntered', '1');
      } catch (e) {}
      root.classList.add('verca-entry-done');
      destroyParticles();
      try {
        var u = new URL(window.location.href);
        if (u.searchParams.has('gate') || u.searchParams.has('welcome')) {
          u.searchParams.delete('gate');
          u.searchParams.delete('welcome');
          var q = u.searchParams.toString();
          window.history.replaceState({}, '', u.pathname + (q ? '?' + q : '') + u.hash);
        }
      } catch (e2) {}
    }
    gate.addEventListener(
      'transitionend',
      function (ev) {
        if (ev.target !== gate || ev.propertyName !== 'opacity') return;
        cleanup();
      },
      { once: true }
    );
    window.setTimeout(cleanup, 900);
  }

  gate.addEventListener('click', function () {
    finishEntry();
  });

  document.addEventListener('keydown', function keyEnter(e) {
    if (root.classList.contains('verca-entry-done')) return;
    if (e.key === 'Enter' && !e.repeat) {
      finishEntry();
    }
  });

  function runParticles() {
    if (typeof particlesJS !== 'function') return;
    var lite = root.classList.contains('verca-lite');
    particlesJS('verca-entry-particles', {
      particles: {
        number: {
          value: lite ? 48 : 92,
          density: { enable: true, value_area: lite ? 720 : 560 }
        },
        color: { value: ['#fff9f2', '#f0dcc8', '#e8c9b0', '#d4b89a', '#c9a080', '#ffffff'] },
        shape: {
          type: 'polygon',
          polygon: { nb_sides: 6 },
          stroke: { width: 0, color: '#b89a82' }
        },
        opacity: {
          value: 0.54,
          random: true,
          anim: {
            enable: true,
            speed: 0.38,
            opacity_min: 0.12,
            sync: false
          }
        },
        size: {
          value: 2.9,
          random: true,
          anim: {
            enable: true,
            speed: 1.45,
            size_min: 0.42,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: lite ? 100 : 128,
          color: '#d4b09a',
          opacity: 0.22,
          width: 0.55
        },
        move: {
          enable: true,
          speed: lite ? 0.26 : 0.38,
          direction: 'none',
          random: true,
          straight: false,
          out_mode: 'out',
          bounce: false,
          attract: {
            enable: !lite,
            rotateX: 380,
            rotateY: 760
          }
        }
      },
      interactivity: {
        detect_on: 'window',
        events: {
          onhover: { enable: true, mode: 'grab' },
          onclick: { enable: true, mode: 'push' },
          resize: true
        },
        modes: {
          grab: {
            distance: lite ? 210 : 310,
            line_linked: { opacity: lite ? 0.52 : 0.74 }
          },
          push: { particles_nb: lite ? 3 : 5 },
          bubble: {
            distance: 360,
            size: 32,
            duration: 2.2,
            opacity: 5,
            speed: 2.2
          },
          repulse: { distance: 160, duration: 0.45 },
          remove: { particles_nb: 1 }
        }
      },
      retina_detect: true
    });

    window.setTimeout(function () {
      var c = document.querySelector('#verca-entry-particles canvas');
      if (c) {
        mousePx.x = c.width * 0.5;
        mousePx.y = c.height * 0.5;
        mouseSmooth.x = mousePx.x;
        mouseSmooth.y = mousePx.y;
      }
      startLineAdorn();
    }, 220);

    window.requestAnimationFrame(function () {
      try {
        gate.focus();
      } catch (f) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runParticles);
  } else {
    runParticles();
  }
})();
