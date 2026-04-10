/**
 * Spustit hned po <body>: prefers-reduced-motion + verca-lite (mobil / save-data / pomalé sítě).
 * Slouží k úspoře CPU, GPU a dat na telefonech.
 */
(function () {
  var html = document.documentElement;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      html.classList.add('reduce-motion');
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
    if (narrow || saveData || slowNet) {
      html.classList.add('verca-lite');
    }
  } catch (e3) {}
})();
