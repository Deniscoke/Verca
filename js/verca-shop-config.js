/**
 * Načte /api/public-config a propojí UI e-shopu (ateliér) s hodnotami z prostředí.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-verca-shop]');
  if (!root) return;

  var statusEl = root.querySelector('[data-shop-status]');
  var btnGoogle = root.querySelector('[data-shop-google-login]');
  var btnStripe = root.querySelector('[data-shop-stripe-test]');
  var btnGuest = root.querySelector('[data-shop-guest-note]');

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('atelier-shop-config__status--error', !!isError);
  }

  function wireStripeTest(cfg) {
    if (!btnStripe) return;
    var ok = cfg.features && cfg.features.stripeTestCheckout && cfg.stripe && cfg.stripe.testPriceId;
    if (!ok) {
      btnStripe.disabled = true;
      btnStripe.setAttribute('aria-disabled', 'true');
      btnStripe.onclick = null;
      return;
    }
    btnStripe.disabled = false;
    btnStripe.removeAttribute('aria-disabled');
    btnStripe.onclick = function () {
      btnStripe.disabled = true;
      fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          line_items: [{ price: cfg.stripe.testPriceId, quantity: 1 }],
        }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, body: j };
          });
        })
        .then(function (x) {
          if (x.body && x.body.url) {
            window.location.href = x.body.url;
            return;
          }
          var msg =
            (x.body && x.body.message) ||
            (x.body && x.body.error) ||
            'Platba se nepodařila nastavit.';
          setStatus(msg, true);
          btnStripe.disabled = false;
          btnStripe.removeAttribute('aria-disabled');
        })
        .catch(function () {
          setStatus('Chyba spojení při vytváření platby.', true);
          btnStripe.disabled = false;
          btnStripe.removeAttribute('aria-disabled');
        });
    };
  }

  function apply(cfg) {
    if (!cfg || typeof cfg !== 'object') {
      setStatus('Neplatná odpověď serveru.', true);
      return;
    }

    window.vercaShopConfig = cfg;

    var parts = [];

    if (cfg.configured) {
      parts.push('Supabase konfigurace je načtená.');
      if (cfg.features && cfg.features.googleLogin) {
        parts.push('Přihlášení přes Google je zapnuté.');
      } else {
        parts.push(
          'Google: nastavte PUBLIC_GOOGLE_LOGIN_ENABLED=true a Redirect URLs v Supabase.'
        );
      }
      if (
        cfg.features &&
        cfg.features.stripeTestCheckout &&
        cfg.readiness &&
        !cfg.readiness.stripeTestFlowLikely
      ) {
        parts.push(
          'Stripe test: na serveru ještě chybí STRIPE_SECRET_KEY nebo ceny v allowlistu (viz Vercel / .env).'
        );
      }
      setStatus(parts.join(' '), false);
    } else {
      parts.push(cfg.message || 'Supabase není plně nastaveno (přihlášení Google nebude fungovat).');
      if (cfg.features && cfg.features.stripeTestCheckout) {
        parts.push('Stripe test platba může fungovat, pokud jsou na serveru Stripe klíče a allowlist cen.');
      }
      setStatus(parts.join(' '), true);
    }

    if (btnGoogle) {
      if (cfg.configured && cfg.features && cfg.features.googleLogin && cfg.urls && cfg.urls.googleAuthorize) {
        btnGoogle.disabled = false;
        btnGoogle.removeAttribute('aria-disabled');
        btnGoogle.onclick = function () {
          window.location.href = cfg.urls.googleAuthorize;
        };
      } else {
        btnGoogle.disabled = true;
        btnGoogle.setAttribute('aria-disabled', 'true');
        btnGoogle.onclick = null;
      }
    }

    wireStripeTest(cfg);

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
      if (btnStripe) {
        btnStripe.disabled = true;
        btnStripe.setAttribute('aria-disabled', 'true');
      }
    });
})();
