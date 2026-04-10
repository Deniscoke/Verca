/**
 * Verca — fade out / fade in při přechodu mezi stránkami (barva podle cílové sekce).
 */
(function () {
  'use strict';

  var STORAGE = 'verca-t';
  var THEME_KEY = 'verca-t-theme';
  var DURATION_MS = 580;
  var reduceMotion = false;

  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function themeForPath(pathname) {
    var p = (pathname || '').toLowerCase();
    if (p.indexOf('bylinny-atelier') !== -1) return 'atelier';
    if (/kontakt|esence|tajemstvi|alchymie/.test(p)) return 'room';
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

        var theme = themeForUrl(a.href);
        el.className = 'verca-transition--' + theme + ' is-visible';

        e.preventDefault();
        var dest = a.href;
        var ms = reduceMotion ? 80 : DURATION_MS;

        window.setTimeout(function () {
          try {
            if (typeof window.vercaPersistAmbient === 'function') {
              window.vercaPersistAmbient();
            }
            window.sessionStorage.setItem(STORAGE, '1');
            window.sessionStorage.setItem(THEME_KEY, theme);
          } catch (err) {}
          window.location.href = dest;
        }, ms);
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
