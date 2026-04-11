/**
 * Future: Stripe webhook — MUST verify signature with raw body + STRIPE_WEBHOOK_SECRET.
 * MUST be idempotent (store stripe event id before mutating orders / loyalty).
 *
 * Vercel + Node: ensure this handler receives the raw body for signature verification
 * (see Stripe and Vercel docs for your runtime; avoid parsing JSON before verify).
 */
'use strict';

var http = require('../_lib/http');
var env = require('../_lib/env');

module.exports = function stripeWebhook(req, res) {
  http.noStore(res);
  if (req.method !== 'POST') {
    http.allowMethods(res, ['POST']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var required = env.requireEnv(['STRIPE_WEBHOOK_SECRET']);
  if (!required.ok) {
    return http.json(res, 501, {
      error: 'not_configured',
      message:
        'Webhook secret not set. Configure STRIPE_WEBHOOK_SECRET and implement constructEvent + idempotent handlers.',
      missing_env: required.missing,
    });
  }

  // TODO (Phase 6):
  // const sig = req.headers['stripe-signature'];
  // const rawBody = ... // raw bytes/string as required by Stripe SDK
  // event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  // if (alreadyProcessed(event.id)) return res.status(200).end();
  // handle event.type; persist order/payment state; append loyalty_ledger; commit webhook_events
  return http.json(res, 501, {
    error: 'not_implemented',
    message: 'Webhook handler scaffold only. Implement signature verification and idempotent order updates.',
  });
};
