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
  var accountWrap = root.querySelector('[data-shop-account]');
  var accountDetail = root.querySelector('[data-shop-account-detail]');
  var btnLogout = root.querySelector('[data-shop-logout]');
  var profileDetails = document.querySelector('[data-atelier-profile]');
  var btnNavLogout = document.querySelector('[data-atelier-nav-logout]');

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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function apply(cfg) {
    if (!cfg || typeof cfg !== 'object') {
      setStatus('Neplatná odpověď serveru.', true);
      return;
    }

    window.vercaShopConfig = cfg;

    var hintEl = root.querySelector('[data-shop-google-redirect-hint]');
    if (hintEl) {
      hintEl.textContent = '';
      hintEl.hidden = true;
    }

    var parts = [];

    if (cfg.configured) {
      parts.push('Supabase konfigurace je načtená.');
      if (cfg.features && cfg.features.googleLogin) {
        parts.push('Přihlášení přes Google je zapnuté (ověřte provider a Redirect URLs v Supabase).');
      } else {
        parts.push(
          'Google přihlášení není k dispozici — v prostředí je vypnuté (PUBLIC_GOOGLE_LOGIN_ENABLED=false), nebo chybí adresa webu pro návrat po OAuth (PUBLIC_SITE_URL / SUPABASE_AUTH_REDIRECT_URL).'
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
      if (
        hintEl &&
        cfg.hints &&
        cfg.hints.googleAuthorizedRedirectUri &&
        cfg.urls &&
        cfg.urls.authCallback
      ) {
        hintEl.innerHTML =
          'Pokud Google zobrazí <strong>redirect_uri_mismatch</strong> (400): v ' +
          '<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> → Credentials → váš <em>OAuth 2.0 Client ID</em> → <em>Authorized redirect URIs</em> přidejte přesně ' +
          '<code>' +
          escapeHtml(cfg.hints.googleAuthorizedRedirectUri) +
          '</code>. V Supabase → Authentication → URL Configuration přidejte do <em>Redirect URLs</em> i ' +
          '<code>' +
          escapeHtml(cfg.urls.authCallback) +
          '</code>.';
        hintEl.hidden = false;
      }
    } else {
      parts.push(cfg.message || 'Supabase není plně nastaveno (přihlášení Google nebude fungovat).');
      if (cfg.features && cfg.features.stripeTestCheckout) {
        parts.push('Stripe test platba může fungovat, pokud jsou na serveru Stripe klíče a allowlist cen.');
      }
      setStatus(parts.join(' '), true);
    }

    if (btnGoogle) {
      /* OAuth musí jít přes supabase.auth.signInWithOAuth (PKCE). Přímý odkaz na /auth/v1/authorize bez klienta neuloží code_verifier → auth-callback nemá relaci. */
      if (cfg.configured && cfg.features && cfg.features.googleLogin && cfg.urls && cfg.urls.authCallback) {
        btnGoogle.disabled = false;
        btnGoogle.removeAttribute('aria-disabled');
        btnGoogle.onclick = function () {
          btnGoogle.disabled = true;
          btnGoogle.setAttribute('aria-disabled', 'true');
          import('https://esm.sh/@supabase/supabase-js@2.49.1')
            .then(function (mod) {
              var supabase = mod.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
                auth: {
                  persistSession: true,
                  detectSessionInUrl: false,
                  flowType: 'pkce',
                },
              });
              return supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: cfg.urls.authCallback,
                },
              });
            })
            .then(function (out) {
              if (out && out.error) {
                setStatus(out.error.message || 'Přihlášení Google se nepodařilo spustit.', true);
                btnGoogle.disabled = false;
                btnGoogle.removeAttribute('aria-disabled');
                return;
              }
              if (out && out.data && out.data.url) {
                window.location.assign(out.data.url);
              }
            })
            .catch(function () {
              setStatus('Chyba při spuštění přihlášení (zkuste obnovit stránku).', true);
              btnGoogle.disabled = false;
              btnGoogle.removeAttribute('aria-disabled');
            });
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

    initSessionPanel(cfg);
  }

  function initSessionPanel(cfg) {
    if (!cfg || !cfg.configured || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
    if (!accountWrap || !accountDetail || !btnLogout) return;

    import('https://esm.sh/@supabase/supabase-js@2.49.1')
      .then(function (mod) {
        var createClient = mod.createClient;
        var supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: {
            persistSession: true,
            detectSessionInUrl: false,
            flowType: 'pkce',
          },
        });
        return supabase.auth.getSession().then(function (out) {
          return { supabase: supabase, session: out.data && out.data.session, err: out.error };
        });
      })
      .then(function (pack) {
        if (pack.err || !pack.session) {
          accountWrap.hidden = true;
          btnLogout.hidden = true;
          if (profileDetails) {
            profileDetails.hidden = true;
            profileDetails.open = false;
          }
          if (btnNavLogout) btnNavLogout.onclick = null;
          return;
        }
        var session = pack.session;
        var supabase = pack.supabase;
        var email = (session.user && session.user.email) || '';
        accountWrap.hidden = false;
        accountDetail.textContent = email ? 'Přihlášeni: ' + email : 'Přihlášeni';
        btnLogout.hidden = false;
        function doSignOut() {
          supabase.auth.signOut().then(function () {
            window.location.reload();
          });
        }
        btnLogout.onclick = doSignOut;
        if (profileDetails) {
          profileDetails.hidden = false;
          var sum = profileDetails.querySelector('summary');
          if (sum) {
            sum.textContent = email ? email.split('@')[0].slice(0, 18) || 'Účet' : 'Účet';
          }
        }
        if (btnNavLogout) {
          btnNavLogout.onclick = function () {
            doSignOut();
          };
        }
        if (btnGoogle) {
          btnGoogle.disabled = true;
          btnGoogle.setAttribute('aria-disabled', 'true');
        }
        var at = session.access_token;
        if (!at) return;
        fetch('/api/account/me', {
          headers: { Authorization: 'Bearer ' + at },
          credentials: 'same-origin',
        })
          .then(function (r) {
            if (!r.ok) return null;
            return r.json();
          })
          .then(function (body) {
            if (!body || !body.user) return;
            var parts = ['Ověřeno serverem', body.user.email || ''];
            if (body.profile && body.profile.full_name) {
              parts.push(body.profile.full_name);
            }
            accountDetail.textContent = parts.join(' — ');
          })
          .catch(function () {});
      })
      .catch(function () {});
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
