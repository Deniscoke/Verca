/**
 * POST /api/webhooks/stripe
 * Ověření podpisu (raw body), checkout.session.completed.
 * Idempotence: ukládejte event.id do DB (webhook_events) před změnou objednávky — zatím jen log.
 */
'use strict';

var http = require('../_lib/http');
var env = require('../_lib/env');
var readBody = require('../_lib/read-body');
var getStripe = require('../_lib/stripe-client').getStripe;

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
      message: 'Nastavte STRIPE_WEBHOOK_SECRET (Signing secret z Stripe → Webhooks).',
      missing_env: required.missing,
    });
  }

  var stripe = getStripe();
  if (!stripe) {
    return http.json(res, 501, { error: 'not_configured', message: 'Chybí STRIPE_SECRET_KEY.' });
  }

  var sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return http.json(res, 400, { error: 'missing_signature' });
  }

  readBody
    .readRawBody(req, 1024 * 1024)
    .then(function (buf) {
      var event;
      try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error('[stripe webhook] signature', err && err.message);
        return http.json(res, 400, { error: 'invalid_signature' });
      }

      if (event.type === 'checkout.session.completed') {
        var sess = event.data && event.data.object;
        var sid = sess && sess.id;
        var paid = sess && sess.payment_status === 'paid';
        console.info('[stripe webhook] checkout.session.completed', {
          sessionId: sid,
          payment_status: sess && sess.payment_status,
          amount_total: sess && sess.amount_total,
          currency: sess && sess.currency,
        });
        if (paid && sid) {
          // TODO: upsert orders + payments v Supabase (service role), loyalty_ledger, idempotence v DB
        }
      }

      return http.json(res, 200, { received: true });
    })
    .catch(function (err) {
      console.error('[stripe webhook]', err && err.message ? err.message : err);
      if (!res.writableEnded) {
        return http.json(res, 500, { error: 'webhook_error' });
      }
    });
};
