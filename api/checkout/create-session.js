/**
 * Future: create Stripe Checkout Session (server-only).
 * Client should receive only sessionId or redirect URL — never trust cart totals from the client alone.
 */
'use strict';

var http = require('../_lib/http');
var env = require('../_lib/env');

module.exports = function createCheckoutSession(req, res) {
  http.noStore(res);
  if (req.method !== 'POST') {
    http.allowMethods(res, ['POST']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var stripe = env.requireEnv(['STRIPE_SECRET_KEY']);
  if (!stripe.ok) {
    return http.json(res, 501, {
      error: 'not_configured',
      message:
        'Stripe is not configured. Set STRIPE_SECRET_KEY in Vercel env and implement Checkout Session creation here.',
      missing_env: stripe.missing,
    });
  }

  // TODO (Phase 6): parse JSON body with line items or price IDs, validate against DB/catalog server-side,
  // call stripe.checkout.sessions.create({ ... }), return { url } or { sessionId }.
  return http.json(res, 501, {
    error: 'not_implemented',
    message: 'Checkout session creation scaffold only. Implement with Stripe SDK and server-side price validation.',
  });
};
