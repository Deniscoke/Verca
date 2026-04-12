/**
 * GET /api/public-config
 * Veřejné hodnoty pro statický e-shop (anon key, redirect URL, Stripe test price).
 * SERVICE_ROLE_KEY sem nepřidávejte.
 */
'use strict';

var http = require('./_lib/http');

function trimSlash(s) {
  return (s || '').replace(/\/+$/, '');
}

/** Vercel sets VERCEL_URL (host only); use as fallback for redirects when PUBLIC_SITE_URL is unset. */
function vercelSiteOrigin() {
  var h = String(process.env.VERCEL_URL || '').trim();
  if (!h) return '';
  h = h.replace(/^https?:\/\//i, '');
  return 'https://' + h;
}

module.exports = function publicConfig(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var siteUrl = trimSlash(
    process.env.PUBLIC_SITE_URL || vercelSiteOrigin() || ''
  );
  var supabaseUrl = trimSlash(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  );
  var anon =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';
  var googleEnabled =
    String(process.env.PUBLIC_GOOGLE_LOGIN_ENABLED || '')
      .toLowerCase()
      .trim() === 'true';

  var defaultCallback = siteUrl ? siteUrl + '/auth-callback.html' : '';
  var authRedirectUrl = trimSlash(process.env.SUPABASE_AUTH_REDIRECT_URL || '') || defaultCallback;

  var checkoutSuccess = process.env.CHECKOUT_SUCCESS_URL || '';
  var checkoutCancel = process.env.CHECKOUT_CANCEL_URL || '';

  var stripeTestPriceId = (process.env.STRIPE_TEST_PRICE_ID || '').trim() || null;
  var stripePublishableKey =
    (
      process.env.STRIPE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      ''
    ).trim() || null;

  var supabaseMissing = [];
  if (!siteUrl) supabaseMissing.push('PUBLIC_SITE_URL');
  if (!supabaseUrl) supabaseMissing.push('SUPABASE_URL');
  if (!anon) supabaseMissing.push('SUPABASE_ANON_KEY');

  var supabaseConfigured = supabaseMissing.length === 0;

  var googleAuthorizeUrl = null;
  if (supabaseConfigured && googleEnabled && authRedirectUrl) {
    googleAuthorizeUrl =
      supabaseUrl +
      '/auth/v1/authorize?provider=google&redirect_to=' +
      encodeURIComponent(authRedirectUrl);
  }

  var payload = {
    ok: supabaseConfigured,
    configured: supabaseConfigured,
    siteUrl: siteUrl || null,
    supabaseUrl: supabaseConfigured ? supabaseUrl : null,
    supabaseAnonKey: supabaseConfigured ? anon : null,
    features: {
      googleLogin: Boolean(googleAuthorizeUrl),
      stripeTestCheckout: Boolean(stripeTestPriceId),
    },
    stripe: {
      testPriceId: stripeTestPriceId,
      publishableKey: stripePublishableKey,
    },
    urls: {
      googleAuthorize: googleAuthorizeUrl,
      authCallback: authRedirectUrl || null,
      checkoutSuccess: checkoutSuccess || null,
      checkoutCancel: checkoutCancel || null,
    },
    hints: {},
  };

  if (!supabaseConfigured) {
    payload.message =
      'Supabase není kompletní — doplňte PUBLIC_SITE_URL, SUPABASE_URL a SUPABASE_ANON_KEY pro přihlášení.';
    payload.missing = supabaseMissing;
    payload.hints.supabaseRedirectAllowList =
      'V Supabase → Authentication → URL Configuration přidejte urls.authCallback do „Redirect URLs“.';
    payload.hints.googleProvider =
      'Google provider v Supabase → Authentication → Providers.';
  } else {
    payload.hints.supabaseRedirectAllowList =
      'V Supabase → Authentication → URL Configuration přidejte přesnou adresu z urls.authCallback do „Redirect URLs“.';
    payload.hints.googleProvider =
      'Google provider zapněte v Supabase → Authentication → Providers a vložte Client ID + Secret z Google Cloud Console.';
  }

  if (stripeTestPriceId) {
    payload.hints.stripe =
      'Testovací platba: tlačítko na ateliéru odešle price ID jen pokud sedí se STRIPE_TEST_PRICE_ID na serveru. Webhook: /api/webhooks/stripe';
  }

  return http.json(res, 200, payload);
};
