/**
 * Spustit hned po <body>: reduce-motion, verca-lite (mobil), verca-savedata (save-data / 2g).
 *
 * verca-lite  = narrow viewport (≤768px) — lighter effects, no bloom, lower ocean DPR
 * verca-savedata = save-data or slow-2g/2g — no WebGL, no video, minimal visuals
 */
(function () {
  var html = document.documentElement;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      html.classList.add('reduce-motion');
      html.classList.add('verca-entry-done');
    }
  } catch (e) {}

  try {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var saveData = conn && conn.saveData === true;
    var slowNet = conn && /^(slow-2g|2g)$/i.test(String(conn.effectiveType || ''));
    var narrow = false;
    try {
      narrow = window.matchMedia('(max-width: 768px)').matches;
    } catch (e2) {}

    if (saveData || slowNet) {
      html.classList.add('verca-savedata');
      html.classList.add('verca-lite');
    } else if (narrow) {
      html.classList.add('verca-lite');
    }
  } catch (e3) {}
})();
