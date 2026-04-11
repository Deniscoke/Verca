/**
 * Načte /api/public-config a propojí UI e-shopu (ateliér) s hodnotami z prostředí.
 * Tajné klíče se z API nevracejí — pouze anon key a veřejné URL.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-verca-shop]');
  if (!root) return;

  var statusEl = root.querySelector('[data-shop-status]');
  var btnGoogle = root.querySelector('[data-shop-google-login]');
  var btnGuest = root.querySelector('[data-shop-guest-note]');

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('atelier-shop-config__status--error', !!isError);
  }

  function apply(cfg) {
    if (!cfg || !cfg.configured) {
      setStatus(
        cfg && cfg.message
          ? cfg.message
          : 'Konfigurace e-shopu není načtena. Zkuste později nebo kontaktujte provozovatele.',
        true
      );
      if (btnGoogle) {
        btnGoogle.disabled = true;
        btnGoogle.setAttribute('aria-disabled', 'true');
      }
      return;
    }

    window.vercaShopConfig = cfg;

    var parts = [];
    parts.push('Konfigurace z prostředí serveru je aktivní.');
    if (cfg.features && cfg.features.googleLogin) {
      parts.push('Přihlášení přes Google je zapnuté.');
    } else {
      parts.push(
        'Google přihlášení: nastavte PUBLIC_GOOGLE_LOGIN_ENABLED=true a urls.authCallback v Supabase (Redirect URLs).'
      );
    }
    setStatus(parts.join(' '), false);

    if (btnGoogle) {
      if (cfg.features && cfg.features.googleLogin && cfg.urls && cfg.urls.googleAuthorize) {
        btnGoogle.disabled = false;
        btnGoogle.removeAttribute('aria-disabled');
        btnGoogle.onclick = function () {
          window.location.href = cfg.urls.googleAuthorize;
        };
      } else {
        btnGoogle.disabled = true;
        btnGoogle.setAttribute('aria-disabled', 'true');
      }
    }

    if (btnGuest) {
      btnGuest.style.display = '';
    }
  }

  fetch('/api/public-config', { credentials: 'same-origin' })
    .then(function (r) {
      return r.json();
    })
    .then(apply)
    .catch(function () {
      setStatus(
        'Nepodařilo se spojit s /api/public-config. Lokálně spusťte „vercel dev“ nebo nasaďte na Vercel.',
        true
      );
      if (btnGoogle) {
        btnGoogle.disabled = true;
        btnGoogle.setAttribute('aria-disabled', 'true');
      }
    });
})();
