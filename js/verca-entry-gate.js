/**
 * Vstupní brána — particles.js + glow (viz interactive-particle-glow/, MIT).
 * První návštěva: kliknutím uloží relaci a odkryje úvodní stránku. ?gate=1 znovu zobrazí bránu.
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

  var btn = document.getElementById('verca-entry-btn');
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

  gate.addEventListener('click', function (e) {
    if (e.target.closest('#verca-entry-btn')) return;
    finishEntry();
  });

  if (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      finishEntry();
    });
  }

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
          value: lite ? 32 : 52,
          density: { enable: true, value_area: 780 }
        },
        color: { value: ['#fff8f0', '#fce8d8', '#f0d4c0', '#e8dcc8', '#ffffff'] },
        shape: {
          type: 'circle',
          stroke: { width: 0, color: '#000000' }
        },
        opacity: {
          value: 0.5,
          random: true,
          anim: {
            enable: true,
            speed: 0.5,
            opacity_min: 0.12,
            sync: false
          }
        },
        size: {
          value: 2.6,
          random: true,
          anim: {
            enable: true,
            speed: 2,
            size_min: 0.35,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: lite ? 88 : 128,
          color: '#d4a088',
          opacity: 0.2,
          width: 0.55
        },
        move: {
          enable: true,
          speed: lite ? 0.45 : 0.72,
          direction: 'none',
          random: true,
          straight: false,
          out_mode: 'out',
          bounce: false
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
            distance: 130,
            line_linked: { opacity: 0.28 }
          },
          push: { particles_nb: 2 },
          bubble: {
            distance: 400,
            size: 36,
            duration: 2,
            opacity: 6,
            speed: 3
          },
          repulse: { distance: 200, duration: 0.4 },
          remove: { particles_nb: 2 }
        }
      },
      retina_detect: true
    });
    if (btn && typeof btn.focus === 'function') {
      window.requestAnimationFrame(function () {
        try {
          btn.focus();
        } catch (f) {}
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runParticles);
  } else {
    runParticles();
  }
})();
