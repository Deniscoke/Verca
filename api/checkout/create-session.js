/**
 * POST /api/checkout/create-session
 * Stripe Checkout Session — ceny jen z allowlistu na serveru (env), ne z nedůvěryhodného klienta.
 */
'use strict';

var http = require('../_lib/http');
var env = require('../_lib/env');
var readBody = require('../_lib/read-body');
var getStripe = require('../_lib/stripe-client').getStripe;

function allowedPriceSet() {
  var raw =
    (process.env.STRIPE_ALLOWED_PRICE_IDS || '') +
    ',' +
    (process.env.STRIPE_TEST_PRICE_ID || '');
  var set = new Set();
  raw.split(/[,\s]+/).forEach(function (p) {
    var t = p.trim();
    if (t) set.add(t);
  });
  return set;
}

module.exports = function createCheckoutSession(req, res) {
  http.noStore(res);
  if (req.method !== 'POST') {
    http.allowMethods(res, ['POST']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var keys = env.requireEnv(['STRIPE_SECRET_KEY']);
  if (!keys.ok) {
    return http.json(res, 501, {
      error: 'not_configured',
      message: 'Nastavte STRIPE_SECRET_KEY ve Vercel / .env.',
      missing_env: keys.missing,
    });
  }

  var allowed = allowedPriceSet();
  if (allowed.size === 0) {
    return http.json(res, 503, {
      error: 'price_allowlist_empty',
      message:
        'Nastavte STRIPE_ALLOWED_PRICE_IDS nebo STRIPE_TEST_PRICE_ID (Stripe Price ID, např. price_xxx).',
    });
  }

  var successUrl = process.env.CHECKOUT_SUCCESS_URL || '';
  var cancelUrl = process.env.CHECKOUT_CANCEL_URL || '';
  if (!successUrl || !cancelUrl) {
    return http.json(res, 503, {
      error: 'checkout_urls_missing',
      message: 'Nastavte CHECKOUT_SUCCESS_URL a CHECKOUT_CANCEL_URL.',
    });
  }

  readBody
    .readJsonBody(req, 65536)
    .then(function (body) {
      var lineItems = body.line_items || body.lineItems;
      if (!Array.isArray(lineItems) || lineItems.length === 0) {
        return http.json(res, 400, {
          error: 'invalid_body',
          message: 'Očekáváme JSON: { "line_items": [ { "price": "price_xxx", "quantity": 1 } ] }',
        });
      }

      for (var i = 0; i < lineItems.length; i++) {
        var li = lineItems[i];
        var price = li && li.price;
        var qty = li && li.quantity != null ? parseInt(li.quantity, 10) : 1;
        if (!price || typeof price !== 'string' || !allowed.has(price)) {
          return http.json(res, 400, {
            error: 'price_not_allowed',
            message:
              'Každý price musí být v STRIPE_ALLOWED_PRICE_IDS nebo STRIPE_TEST_PRICE_ID na serveru.',
          });
        }
        if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
          return http.json(res, 400, { error: 'invalid_quantity', message: 'Množství 1–99.' });
        }
      }

      var stripe = getStripe();
      if (!stripe) {
        return http.json(res, 500, { error: 'stripe_init_failed' });
      }

      var finalSuccess = successUrl;
      if (finalSuccess.indexOf('{CHECKOUT_SESSION_ID}') === -1) {
        var sep = finalSuccess.indexOf('?') >= 0 ? '&' : '?';
        finalSuccess = finalSuccess + sep + 'session_id={CHECKOUT_SESSION_ID}';
      }

      var sessionParams = {
        mode: 'payment',
        line_items: lineItems.map(function (li) {
          return {
            price: li.price,
            quantity: parseInt(li.quantity, 10) || 1,
          };
        }),
        success_url: finalSuccess,
        cancel_url: cancelUrl,
      };

      var email = body.customer_email || body.customerEmail;
      if (email && typeof email === 'string' && email.indexOf('@') > 0) {
        sessionParams.customer_email = email.trim().slice(0, 320);
      }

      return stripe.checkout.sessions.create(sessionParams);
    })
    .then(function (session) {
      if (!session || !session.id) return;
      return http.json(res, 200, {
        url: session.url,
        sessionId: session.id,
      });
    })
    .catch(function (err) {
      if (err && err.type === 'StripeCardError') {
        return http.json(res, 400, { error: 'stripe', message: err.message });
      }
      if (err && err.message === 'body_too_large') {
        return http.json(res, 413, { error: 'body_too_large' });
      }
      console.error('[checkout]', err && err.message ? err.message : err);
      return http.json(res, 500, {
        error: 'checkout_failed',
        message: err && err.message ? err.message : 'checkout_failed',
      });
    });
};
