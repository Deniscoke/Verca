/**
 * Vstupní brána — particles.js + glow; částice a pohyb směřují k „mandálovému“ klidu (hex, φ‑tempo).
 * Viz interactive-particle-glow/ (MIT). ?gate=1 znovu zobrazí bránu.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  if (root.classList.contains('verca-entry-done')) return;
  if (root.classList.contains('verca-savedata')) {
    root.classList.add('verca-entry-done');
    return;
  }

  var gate = document.getElementById('verca-entry-gate');
  if (!gate) return;

  var reduceMotion = root.classList.contains('reduce-motion');
  if (reduceMotion) {
    root.classList.add('verca-entry-done');
    return;
  }

  var finished = false;
  var cleaned = false;

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
          value: lite ? 28 : 46,
          density: { enable: true, value_area: 820 }
        },
        color: { value: ['#f5ebe0', '#e8d4c4', '#d4c4b0', '#c9b89a', '#ffffff'] },
        shape: {
          type: 'polygon',
          polygon: { nb_sides: 6 },
          stroke: { width: 0, color: '#b89a82' }
        },
        opacity: {
          value: 0.42,
          random: true,
          anim: {
            enable: true,
            speed: 0.35,
            opacity_min: 0.1,
            sync: false
          }
        },
        size: {
          value: 2.4,
          random: true,
          anim: {
            enable: true,
            speed: 1.35,
            size_min: 0.4,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: lite ? 96 : 132,
          color: '#c4a088',
          opacity: 0.18,
          width: 0.5
        },
        move: {
          enable: true,
          speed: lite ? 0.22 : 0.34,
          direction: 'none',
          random: true,
          straight: false,
          out_mode: 'out',
          bounce: false,
          attract: {
            enable: !lite,
            rotateX: 520,
            rotateY: 980
          }
        }
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: { enable: true, mode: 'grab' },
          onclick: { enable: true, mode: 'push' },
          resize: true
        },
        modes: {
          grab: {
            distance: 118,
            line_linked: { opacity: 0.24 }
          },
          push: { particles_nb: 1 },
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
