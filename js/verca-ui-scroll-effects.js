/**
 * Verca — scroll UX adapted from Juxtopposed / CodePen “10 Simple Yet Cool Popular Effects…”
 * Original asset (MIT-style demo): third-party/10-simple-yet-cool-popular-effects-in-modern-ui-ft-gsap-color-blending-etc/
 *
 * Included here: GSAP wheel smoothing (ScrollToPlugin) + fade / move-up reveals with reverse on scroll up.
 * Not ported: loading gate, cursor:none, horizontal pin, fixed-cards stack, zoom pin (would fight WebGL + a11y).
 */
(function (global) {
  'use strict';

  /** @param {{ gsap: object, ScrollTrigger: object, reduceMotion: boolean, EASE?: string, DUR?: number, STAG?: number }} o */
  function vercaJuxtInitReveals(o) {
    var gsap = o.gsap;
    var ScrollTrigger = o.ScrollTrigger;
    if (!gsap || typeof ScrollTrigger === 'undefined') return;
    if (o.reduceMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    var EASE = o.EASE || 'power2.out';
    var DUR = o.DUR != null ? o.DUR : 1.08;
    var STAG = o.STAG != null ? o.STAG : 0.12;
    var TA = 'play none none reverse';

    gsap.utils.toArray('.js-reveal').forEach(function (el) {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: '1.1em' },
        {
          autoAlpha: 1,
          y: 0,
          duration: DUR,
          ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: TA },
        }
      );
    });

    ['.prostory__grid', '.services__cards', '.testimonials__grid'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (parent) {
        var items = parent.querySelectorAll('.js-reveal-stagger');
        if (!items.length) return;
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: '1.05em' },
          {
            autoAlpha: 1,
            y: 0,
            duration: DUR,
            stagger: STAG,
            ease: EASE,
            scrollTrigger: { trigger: parent, start: 'top 84%', toggleActions: TA },
          }
        );
      });
    });

    gsap.utils.toArray('.js-reveal-exp').forEach(function (el) {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: '0.95em' },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.98,
          ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: TA },
        }
      );
    });

    document.querySelectorAll('.js-timeline-step').forEach(function (step) {
      var parts = step.querySelectorAll('.step__num, .step__name, .step__body, .step__accent');
      gsap.fromTo(
        parts,
        { autoAlpha: 0, y: '0.85em' },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.92,
          stagger: 0.1,
          ease: EASE,
          scrollTrigger: { trigger: step, start: 'top 80%', toggleActions: TA },
        }
      );
    });

    var exp = document.getElementById('experience');
    var railFill = document.getElementById('timelineRailFill');
    if (exp && railFill) {
      gsap.fromTo(
        railFill,
        { height: '0%' },
        {
          height: '100%',
          ease: 'none',
          scrollTrigger: { trigger: exp, start: 'top 60%', end: 'bottom 40%', scrub: 1 },
        }
      );
    }

    var trustItems = document.querySelectorAll('.trust__item');
    if (trustItems.length) {
      gsap.fromTo(
        trustItems,
        { autoAlpha: 0, y: '0.85em' },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.82,
          stagger: 0.09,
          ease: EASE,
          scrollTrigger: { trigger: '.trust', start: 'top 90%', toggleActions: TA },
        }
      );
    }

    if (!o.reduceMotion) {
      var hv = document.querySelector('.hero__video-fullbleed');
      var home = document.getElementById('home');
      if (hv && home && !document.documentElement.classList.contains('verca-lite')) {
        gsap.to(hv, {
          y: '-5%',
          ease: 'none',
          scrollTrigger: {
            trigger: home,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
          },
        });
      }
    }
  }

  /**
   * High-speed smooth wheel: accumulates rapid flicks into one long glide.
   * Multiplier + duration scale with velocity so fast scrolling feels fast,
   * slow scrolling stays precise, and deceleration is always buttery.
   */
  function vercaJuxtSmoothWheel(o) {
    var gsap = o.gsap;
    if (!gsap) return false;
    if (o.reduceMotion || o.isTouch) return false;
    if (document.documentElement.classList.contains('verca-lite')) return false;
    if (typeof ScrollToPlugin === 'undefined') return false;

    gsap.registerPlugin(ScrollToPlugin);
    document.documentElement.classList.add('verca-juxt-wheel');

    var SPEED = 2.8;
    var BASE_DUR = 0.92;
    var MAX_DUR = 1.6;
    var accumulated = 0;
    var rafPending = false;

    function flush() {
      rafPending = false;
      if (accumulated === 0) return;
      var delta = accumulated;
      accumulated = 0;

      var absDelta = Math.abs(delta);
      var dur = Math.min(MAX_DUR, BASE_DUR + absDelta * 0.0004);

      gsap.to(window, {
        scrollTo: { y: '+=' + delta, autoKill: true },
        duration: dur,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }

    window.addEventListener(
      'wheel',
      function (e) {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        accumulated += e.deltaY * SPEED;
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(flush);
        }
      },
      { passive: false }
    );

    return true;
  }

  global.vercaJuxtInitReveals = vercaJuxtInitReveals;
  global.vercaJuxtSmoothWheel = vercaJuxtSmoothWheel;
})(typeof window !== 'undefined' ? window : this);
