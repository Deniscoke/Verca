/**
 * GET /api/public-config
 * Veřejné hodnoty pro statický e-shop (anon key, redirect URL, Stripe test price).
 * SERVICE_ROLE_KEY sem nepřidávejte.
 */
'use strict';

var http = require('./_lib/http');
var siteUrlLib = require('./_lib/site-url');

function trimSlash(s) {
  return siteUrlLib.trimSlash(s);
}

function envNonEmpty(name) {
  var v = process.env[name];
  return v != null && String(v).trim() !== '';
}

module.exports = function publicConfig(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var siteUrl = siteUrlLib.resolveSiteUrl();
  var supabaseUrl = trimSlash(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  );
  var anon =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';
  /* Google OAuth: vypnutí jen explicitně (false/0/no). Když proměnná chybí, tlačítko se zobrazí při kompletním Supabase — stále musí být provider + Redirect URLs v dashboardu. */
  var googleEnv = String(process.env.PUBLIC_GOOGLE_LOGIN_ENABLED || '')
    .toLowerCase()
    .trim();
  var googleEnabled = !(googleEnv === 'false' || googleEnv === '0' || googleEnv === 'no');

  var defaultCallback = siteUrl ? siteUrl + '/auth-callback.html' : '';
  var authRedirectUrl = trimSlash(process.env.SUPABASE_AUTH_REDIRECT_URL || '') || defaultCallback;

  var checkoutSuccess =
    process.env.CHECKOUT_SUCCESS_URL ||
    siteUrlLib.defaultCheckoutSuccess(siteUrl) ||
    '';
  var checkoutCancel =
    process.env.CHECKOUT_CANCEL_URL ||
    siteUrlLib.defaultCheckoutCancel(siteUrl) ||
    '';

  var stripeTestPriceId = (process.env.STRIPE_TEST_PRICE_ID || '').trim() || null;
  var stripePublishableKey =
    (
      process.env.STRIPE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      ''
    ).trim() || null;

  var supabaseMissing = [];
  if (!siteUrl) supabaseMissing.push('PUBLIC_SITE_URL_OR_VERCEL_URL');
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

  var priceAllowlist =
    String(process.env.STRIPE_ALLOWED_PRICE_IDS || '').trim() !== '' ||
    String(process.env.STRIPE_TEST_PRICE_ID || '').trim() !== '';

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
    /** Safe booleans for debugging nasazení — žádné tajné hodnoty. */
    readiness: {
      publicSiteUrlExplicit: envNonEmpty('PUBLIC_SITE_URL'),
      stripeSecretKey: envNonEmpty('STRIPE_SECRET_KEY'),
      stripeWebhookSecret: envNonEmpty('STRIPE_WEBHOOK_SECRET'),
      stripePriceAllowlist: priceAllowlist,
      checkoutUrlsResolved: Boolean(checkoutSuccess && checkoutCancel),
      stripeTestFlowLikely:
        envNonEmpty('STRIPE_SECRET_KEY') &&
        priceAllowlist &&
        Boolean(checkoutSuccess && checkoutCancel),
    },
    hints: {},
  };

  if (!supabaseConfigured) {
    payload.message =
      'Supabase není kompletní — doplňte SUPABASE_URL a SUPABASE_ANON_KEY (a volitelně PUBLIC_SITE_URL místo výchozí adresy z Vercelu).';
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
