/**
 * Verca — fade out / fade in při přechodu mezi stránkami (barva podle cílové sekce).
 */
(function () {
  'use strict';

  var STORAGE = 'verca-t';
  var THEME_KEY = 'verca-t-theme';
  /** Délka CSS fade (#verca-transition) — musí sedět s verca-transitions.css */
  var FADE_MS = 100;
  var HOLD_VISIBLE_MS = 100;
  var reduceMotion = false;

  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function themeForPath(pathname) {
    var p = (pathname || '').toLowerCase();
    if (p.indexOf('bylinny-atelier') !== -1 || p.indexOf('auth-callback') !== -1) return 'atelier';
    if (/kontakt|esence|tajemstvi|alchymie/.test(p)) return 'room';
    if (
      /obchodni-podminky|ochrana-osobnich-udaju|cookies\.html|reklamace-a-vraceni|odstoupeni-od-smlouvy|podminky-vernostniho-programu/.test(
        p
      )
    )
      return 'legal';
    return 'default';
  }

  function themeForUrl(href) {
    try {
      return themeForPath(new URL(href, window.location.href).pathname);
    } catch (err) {
      return 'default';
    }
  }

  function normalizePath(path) {
    return path.replace(/\/index\.html$/i, '/').replace(/\/$/, '') || '/';
  }

  function shouldPreferHistoryBack(a) {
    return a && a.hasAttribute('data-verca-history-back');
  }

  function tryHistoryBack() {
    try {
      if (window.history.length <= 1) return false;
      var ref = document.referrer || '';
      if (!ref) return false;
      if (new URL(ref).origin !== window.location.origin) return false;
      window.history.back();
      return true;
    } catch (e) {
      return false;
    }
  }

  function shouldSkipAnchor(a, event) {
    if (!a || a.getAttribute('href') == null) return true;
    if (event.defaultPrevented) return true;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;
    if (typeof event.button === 'number' && event.button !== 0) return true;
    if (a.target === '_blank') return true;
    if (a.hasAttribute('download')) return true;

    var hrefAttr = (a.getAttribute('href') || '').trim();
    if (!hrefAttr || hrefAttr.indexOf('javascript:') === 0) return true;
    if (hrefAttr.indexOf('mailto:') === 0 || hrefAttr.indexOf('tel:') === 0) return true;

    var resolved;
    try {
      resolved = new URL(a.href, window.location.href);
    } catch (e) {
      return true;
    }

    var sameOrigin =
      resolved.origin === window.location.origin ||
      (resolved.origin === 'null' && window.location.origin === 'null');
    if (!sameOrigin) return true;

    var sameFile =
      normalizePath(resolved.pathname) === normalizePath(window.location.pathname) &&
      resolved.search === window.location.search;
    if (sameFile && resolved.hash) return true;

    return false;
  }

  var pending = false;
  var enterTheme = 'default';

  try {
    if (window.sessionStorage.getItem(STORAGE) === '1') {
      pending = true;
      enterTheme = window.sessionStorage.getItem(THEME_KEY) || 'default';
      window.sessionStorage.removeItem(STORAGE);
      window.sessionStorage.removeItem(THEME_KEY);
    }
  } catch (e) {}

  var el = document.createElement('div');
  el.id = 'verca-transition';
  el.className = 'verca-transition--' + enterTheme;
  el.setAttribute('aria-hidden', 'true');
  if (pending) {
    el.classList.add('is-visible');
  }
  document.body.insertBefore(el, document.body.firstChild);

  function fadeInEnter() {
    if (!pending) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        el.classList.remove('is-visible');
      });
    });
  }

  function attachNav() {
    document.addEventListener(
      'click',
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || shouldSkipAnchor(a, e)) return;

        if (shouldPreferHistoryBack(a) && tryHistoryBack()) {
          e.preventDefault();
          return;
        }

        var theme = themeForUrl(a.href);
        e.preventDefault();
        var dest = a.href;
        var fadeMs = reduceMotion ? 60 : FADE_MS;
        var holdMs = reduceMotion ? 40 : HOLD_VISIBLE_MS;

        el.className = 'verca-transition--' + theme;
        void el.offsetWidth;
        el.classList.add('is-visible');

        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            window.setTimeout(function () {
              el.classList.remove('is-visible');
              window.setTimeout(function () {
                try {
                  if (typeof window.vercaPersistAmbient === 'function') {
                    window.vercaPersistAmbient();
                  }
                  window.sessionStorage.setItem(STORAGE, '1');
                  window.sessionStorage.setItem(THEME_KEY, theme);
                } catch (err) {}
                window.location.href = dest;
              }, fadeMs);
            }, holdMs);
          });
        });
      },
      false
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      fadeInEnter();
      attachNav();
    });
  } else {
    fadeInEnter();
    attachNav();
  }
})();
