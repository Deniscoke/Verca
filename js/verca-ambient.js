/**
 * Sdílená ambientní hudba napříč stránkami:
 * — výchozí stav: zapnuto (pokud uživatel nezvolil vypnuto — vercaAmbientOn === '0')
 * — hlasitost v sessionStorage (vercaAmbientVol, 0–1)
 * — čas a stav při přechodu stránky; před navigací volá page-transition window.vercaPersistAmbient
 * — při zablokování autoplay obnovení při prvním pointerdown/keydown (kromě kliku na mezistránkový odkaz)
 */
(function (global) {
  'use strict';

  var KEY_ON = 'vercaAmbientOn';
  var KEY_TIME = 'vercaAmbientTime';
  var KEY_VOLUME = 'vercaAmbientVol';
  var DEFAULT_VOLUME = 0.38;
  var THROTTLE_MS = 700;
  var lastSave = 0;
  var interactFallbackAttached = false;

  function safeSet(key, val) {
    try {
      sessionStorage.setItem(key, val);
    } catch (e) {}
  }

  function safeGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function persistFromAudio(audio) {
    if (!audio) return;
    safeSet(KEY_ON, audio.paused ? '0' : '1');
    safeSet(KEY_TIME, String(audio.paused ? audio.currentTime || 0 : audio.currentTime || 0));
  }

  function readVolume() {
    var v = DEFAULT_VOLUME;
    var s = safeGet(KEY_VOLUME);
    if (s != null && s !== '') {
      var n = parseFloat(s);
      if (!isNaN(n)) v = Math.min(1, Math.max(0, n));
    }
    return v;
  }

  function removeInteractFallback() {
    if (!interactFallbackAttached) return;
    interactFallbackAttached = false;
    var b = document.getElementById('verca-ambient-toggle');
    if (b) b.classList.remove('is-waiting');
    document.removeEventListener('pointerdown', onFirstInteract, true);
    document.removeEventListener('touchstart', onFirstInteract, true);
    document.removeEventListener('keydown', onFirstInteract, true);
  }

  function injectVolumeControl(btn, audio) {
    if (document.getElementById('verca-ambient-volume')) return;

    var wrap = document.createElement('div');
    wrap.className = 'verca-ambient-volume';

    var range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '1';
    range.id = 'verca-ambient-volume';
    range.setAttribute('aria-label', 'Hlasitost hudby v pozadí');
    range.title = 'Hlasitost';
    range.value = String(Math.round(readVolume() * 100));

    wrap.appendChild(range);
    if (btn.parentNode) {
      btn.parentNode.insertBefore(wrap, btn.nextSibling);
    }

    function applyVolFromRange() {
      var vol = parseInt(range.value, 10);
      if (isNaN(vol)) vol = Math.round(DEFAULT_VOLUME * 100);
      vol = Math.min(100, Math.max(0, vol)) / 100;
      audio.volume = vol;
      safeSet(KEY_VOLUME, String(vol));
    }

    range.addEventListener('input', applyVolFromRange);
    range.addEventListener('change', applyVolFromRange);
    range.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  function initAmbient() {
    var audio = document.getElementById('verca-ambient-audio');
    var btn = document.getElementById('verca-ambient-toggle');
    if (!audio || !btn) return;

    var vol = readVolume();
    audio.volume = vol;

    var shouldPlay = safeGet(KEY_ON) !== '0';

    if (shouldPlay) {
      audio.preload = 'auto';
    }

    injectVolumeControl(btn, audio);

    function syncUI() {
      var playing = !audio.paused;
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      btn.classList.toggle('is-playing', playing);
      btn.setAttribute(
        'aria-label',
        playing ? 'Vypnout hudbu v pozadí' : 'Zapnout hudbu v pozadí'
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
      if (safeGet(KEY_ON) === '0') return;
      interactFallbackAttached = true;
      if (btn) btn.classList.add('is-waiting');
      document.addEventListener('pointerdown', onFirstInteract, true);
      document.addEventListener('touchstart', onFirstInteract, true);
      document.addEventListener('keydown', onFirstInteract, true);
    }

    function normalizePath(path) {
      return path.replace(/\/index\.html$/i, '/').replace(/\/$/, '') || '/';
    }

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
      if (safeGet(KEY_ON) === '0') {
        removeInteractFallback();
        return;
      }
      var t = e.target;
      if (t && t.id === 'verca-ambient-volume') return;
      if (t && t.closest && t.closest('.verca-ambient-volume')) return;

      var link = linkFromTarget(e.target);
      if (link && isCrossPageNavLink(link)) return;
      if (e.type === 'keydown' && document.activeElement) {
        var ae = document.activeElement;
        if (ae.tagName === 'A' && isCrossPageNavLink(ae)) return;
      }
      removeInteractFallback();
      tryPlay();
    }

    var savedTime = 0;
    try {
      savedTime = parseFloat(safeGet(KEY_TIME) || '0') || 0;
    } catch (e2) {}

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
      removeInteractFallback();
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
        safeSet(KEY_ON, '1');
        shouldPlay = true;
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
