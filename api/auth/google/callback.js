/**
 * Future: Google OAuth callback — exchange code server-side, set httpOnly session cookie.
 * Must validate OAuth state parameter; never expose client_secret to the browser.
 */
'use strict';

var http = require('../../_lib/http');
var env = require('../../_lib/env');

module.exports = function googleOAuthCallback(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var required = env.requireEnv([
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'AUTH_CALLBACK_URL',
  ]);
  if (!required.ok) {
    return http.json(res, 501, {
      error: 'not_configured',
      message:
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_CALLBACK_URL on the server.',
      missing_env: required.missing,
    });
  }

  // TODO (Phase 5+): validate state, exchange code, create/update user, issue session cookie, redirect to site.
  return http.json(res, 501, {
    error: 'not_implemented',
    message: 'OAuth callback scaffold only. Implement server-side token exchange and session issuance.',
  });
};
