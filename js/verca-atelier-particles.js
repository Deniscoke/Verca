/**
 * Particles.js — Bylinný ateliér (světlý, medový tón). Adaptace interactive-particle-glow (MIT).
 */
(function () {
  'use strict';

  if (document.documentElement.classList.contains('verca-lite')) {
    return;
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function run() {
    if (typeof particlesJS !== 'function') return;

    var cfg = {
      particles: {
        number: {
          value: reduceMotion ? 22 : 58,
          density: { enable: true, value_area: 720 }
        },
        color: { value: ['#fff8ec', '#fce8c8', '#f5d4a8', '#ffffff'] },
        shape: {
          type: 'circle',
          stroke: { width: 0, color: '#000000' }
        },
        opacity: {
          value: 0.45,
          random: true,
          anim: {
            enable: !reduceMotion,
            speed: 0.45,
            opacity_min: 0.12,
            sync: false
          }
        },
        size: {
          value: 2.4,
          random: true,
          anim: {
            enable: !reduceMotion,
            speed: 2.2,
            size_min: 0.35,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: reduceMotion ? 72 : 118,
          color: '#e8c9a0',
          opacity: 0.14,
          width: 0.55
        },
        move: {
          enable: !reduceMotion,
          speed: 0.65,
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
          onhover: { enable: !reduceMotion, mode: 'grab' },
          onclick: { enable: !reduceMotion, mode: 'push' },
          resize: true
        },
        modes: {
          grab: {
            distance: 120,
            line_linked: { opacity: 0.22 }
          },
          push: { particles_nb: 2 },
          bubble: {
            distance: 400,
            size: 40,
            duration: 2,
            opacity: 8,
            speed: 3
          },
          repulse: { distance: 200, duration: 0.4 },
          remove: { particles_nb: 2 }
        }
      },
      retina_detect: true
    };

    particlesJS('particles-js', cfg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
