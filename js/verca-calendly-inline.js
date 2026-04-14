/**
 * Načte Calendly inline widget podle meta verca:calendly (stejná logika na kontaktu i prostorech).
 */
(function () {
  'use strict';

  var meta = document.querySelector('meta[name="verca:calendly"]');
  var url = meta && meta.getAttribute('content') ? String(meta.getAttribute('content')).trim() : '';
  var root = document.getElementById('verca-calendly-root');
  var fb = document.getElementById('verca-calendly-fallback');
  if (!root || !fb) return;
  if (!url || !/^https:\/\/(www\.)?calendly\.com\//i.test(url)) {
    fb.hidden = false;
    return;
  }
  fb.hidden = true;
  root.hidden = false;
  var w = document.createElement('div');
  w.className = 'calendly-inline-widget';
  w.style.minWidth = '320px';
  w.style.height = '680px';
  w.setAttribute('data-url', url);
  root.appendChild(w);
  var s = document.createElement('script');
  s.src = 'https://assets.calendly.com/assets/external/widget.js';
  s.async = true;
  document.body.appendChild(s);
})();
