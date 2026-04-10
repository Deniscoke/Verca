/**
 * Sdílená ambientní hudba mezi index.html a kontakt.html:
 * — stav a čas v sessionStorage (při přechodu stránka neskáče od začátku)
 * — na kontaktu (a zpět na úvod) automatické pokračování, pokud bylo zapnuto
 * — při zablokování autoplay obnovení při prvním pointerdown/keydown na stránce
 */
(function (global) {
  'use strict';

  var KEY_ON = 'vercaAmbientOn';
  var KEY_TIME = 'vercaAmbientTime';
  /** Nastaví verca-page-transition.js před navigací — na cílové stránce neautoplay. */
  var KEY_SKIP_RESUME = 'vercaAmbientSkipResume';
  var THROTTLE_MS = 700;
  var lastSave = 0;
  var interactFallbackAttached = false;

  function safeSet(key, val) {
    try {
      sessionStorage.setItem(key, val);
    } catch (e) {}
  }

  function persistFromAudio(audio) {
    if (!audio) return;
    safeSet(KEY_ON, audio.paused ? '0' : '1');
    safeSet(KEY_TIME, String(audio.paused ? audio.currentTime || 0 : audio.currentTime || 0));
  }

  function removeInteractFallback() {
    if (!interactFallbackAttached) return;
    interactFallbackAttached = false;
    document.removeEventListener('pointerdown', onFirstInteract, true);
    document.removeEventListener('keydown', onFirstInteract, true);
  }

  function initAmbient() {
    var audio = document.getElementById('verca-ambient-audio');
    var btn = document.getElementById('verca-ambient-toggle');
    if (!audio || !btn) return;

    audio.volume = 0.38;

    var shouldPlay = false;
    try {
      shouldPlay = sessionStorage.getItem(KEY_ON) === '1';
    } catch (e) {}

    try {
      if (sessionStorage.getItem(KEY_SKIP_RESUME) === '1') {
        shouldPlay = false;
        sessionStorage.removeItem(KEY_SKIP_RESUME);
      }
    } catch (e2) {}

    var savedTime = 0;
    try {
      savedTime = parseFloat(sessionStorage.getItem(KEY_TIME) || '0') || 0;
    } catch (e2) {}

    if (shouldPlay) {
      audio.preload = 'auto';
    }

    function syncUI() {
      var playing = !audio.paused;
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      btn.classList.toggle('is-playing', playing);
      btn.setAttribute(
        'aria-label',
        playing ? 'Vypnout hudbu v pozadí' : 'Přehrát jemnou hudbu v pozadí'
      );
    }

    function tryPlay() {
      var p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          removeInteractFallback();
          syncUI();
        }).catch(function () {
          addInteractFallback();
        });
      } else {
        syncUI();
      }
    }

    function addInteractFallback() {
      if (interactFallbackAttached || !shouldPlay) return;
      interactFallbackAttached = true;
      document.addEventListener('pointerdown', onFirstInteract, true);
      document.addEventListener('keydown', onFirstInteract, true);
    }

    function normalizePath(path) {
      return path.replace(/\/index\.html$/i, '/').replace(/\/$/, '') || '/';
    }

    /** Odkaz, který načte jiný dokument (ne čistá kotva na téže stránce) — nesmí spustit hudbu před klikem na přechod. */
    function isCrossPageNavLink(a) {
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
      var hrefAttr = (a.getAttribute('href') || '').trim();
      if (!hrefAttr || hrefAttr.indexOf('javascript:') === 0) return false;
      if (hrefAttr.indexOf('mailto:') === 0 || hrefAttr.indexOf('tel:') === 0) return false;
      try {
        var resolved = new URL(a.href, window.location.href);
        var sameOrigin =
          resolved.origin === window.location.origin ||
          (resolved.origin === 'null' && window.location.origin === 'null');
        if (!sameOrigin) return false;
        var sameFile =
          normalizePath(resolved.pathname) === normalizePath(window.location.pathname) &&
          resolved.search === window.location.search;
        if (sameFile && resolved.hash) return false;
        return true;
      } catch (err) {
        return false;
      }
    }

    function linkFromTarget(target) {
      if (!target) return null;
      if (target.closest) {
        var byClosest = target.closest('a[href]');
        if (byClosest) return byClosest;
      }
      if (target.tagName === 'A' && target.getAttribute('href')) return target;
      return null;
    }

    function onFirstInteract(e) {
      var link = linkFromTarget(e.target);
      if (link && isCrossPageNavLink(link)) return;
      if (e.type === 'keydown' && document.activeElement) {
        var ae = document.activeElement;
        if (ae.tagName === 'A' && isCrossPageNavLink(ae)) return;
      }
      removeInteractFallback();
      tryPlay();
    }

    function applySeek() {
      if (savedTime <= 0) return;
      var d = audio.duration;
      if (typeof d === 'number' && !isNaN(d) && d > 0 && savedTime < d - 0.35) {
        try {
          audio.currentTime = savedTime;
        } catch (e) {}
      }
    }

    function onReadyResume() {
      if (!shouldPlay) {
        applySeek();
        syncUI();
        return;
      }
      function kickoff() {
        applySeek();
        tryPlay();
      }
      /* Po přechodu ze stránky: počkat na buffer, aby start neškubal */
      if (audio.readyState >= 3) {
        kickoff();
      } else {
        audio.addEventListener('canplay', kickoff, { once: true });
      }
    }

    if (audio.readyState >= 1) {
      onReadyResume();
    } else {
      audio.addEventListener(
        'loadedmetadata',
        function () {
          onReadyResume();
        },
        { once: true }
      );
    }

    audio.addEventListener('play', function () {
      removeInteractFallback();
      safeSet(KEY_ON, '1');
      syncUI();
    });
    audio.addEventListener('pause', function () {
      persistFromAudio(audio);
      syncUI();
    });

    audio.addEventListener('timeupdate', function () {
      if (audio.paused) return;
      var now = Date.now();
      if (now - lastSave < THROTTLE_MS) return;
      lastSave = now;
      persistFromAudio(audio);
    });

    window.addEventListener('pagehide', function () {
      persistFromAudio(audio);
    });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!audio.paused) {
        audio.pause();
        safeSet(KEY_ON, '0');
      } else {
        tryPlay();
      }
      syncUI();
    });

    global.vercaPersistAmbient = function () {
      persistFromAudio(audio);
    };

    syncUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAmbient);
  } else {
    initAmbient();
  }
})(typeof window !== 'undefined' ? window : this);
