/**
 * GET /api/public-config
 * Vrací pouze veřejné hodnoty pro statický e-shop (anon key, URL přesměrování).
 * SERVICE_ROLE_KEY ani jiné tajné klíče sem nepřidávejte.
 */
'use strict';

var http = require('./_lib/http');

function trimSlash(s) {
  return (s || '').replace(/\/+$/, '');
}

module.exports = function publicConfig(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var siteUrl = trimSlash(process.env.PUBLIC_SITE_URL || '');
  var supabaseUrl = trimSlash(process.env.SUPABASE_URL || '');
  var anon = process.env.SUPABASE_ANON_KEY || '';
  var googleEnabled =
    String(process.env.PUBLIC_GOOGLE_LOGIN_ENABLED || '')
      .toLowerCase()
      .trim() === 'true';

  var defaultCallback = siteUrl ? siteUrl + '/auth-callback.html' : '';
  var authRedirectUrl = trimSlash(process.env.SUPABASE_AUTH_REDIRECT_URL || '') || defaultCallback;

  var checkoutSuccess = process.env.CHECKOUT_SUCCESS_URL || '';
  var checkoutCancel = process.env.CHECKOUT_CANCEL_URL || '';

  var missing = [];
  if (!siteUrl) missing.push('PUBLIC_SITE_URL');
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!anon) missing.push('SUPABASE_ANON_KEY');

  if (missing.length) {
    return http.json(res, 200, {
      ok: false,
      configured: false,
      message:
        'Chybí proměnné prostředí. Doplňte je v .env (lokálně) nebo ve Vercel → Environment Variables.',
      missing: missing,
      urls: {
        authCallback: authRedirectUrl || null,
        checkoutSuccess: checkoutSuccess || null,
        checkoutCancel: checkoutCancel || null,
      },
    });
  }

  var googleAuthorizeUrl = null;
  if (googleEnabled && authRedirectUrl) {
    googleAuthorizeUrl =
      supabaseUrl +
      '/auth/v1/authorize?provider=google&redirect_to=' +
      encodeURIComponent(authRedirectUrl);
  }

  return http.json(res, 200, {
    ok: true,
    configured: true,
    siteUrl: siteUrl,
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: anon,
    features: {
      googleLogin: Boolean(googleAuthorizeUrl),
    },
    urls: {
      googleAuthorize: googleAuthorizeUrl,
      authCallback: authRedirectUrl,
      checkoutSuccess: checkoutSuccess || null,
      checkoutCancel: checkoutCancel || null,
    },
    hints: {
      supabaseRedirectAllowList:
        'V Supabase → Authentication → URL Configuration přidejte přesnou adresu z urls.authCallback do „Redirect URLs“.',
      googleProvider:
        'Google provider zapněte v Supabase → Authentication → Providers a vložte Client ID + Secret z Google Cloud Console.',
    },
  });
};
