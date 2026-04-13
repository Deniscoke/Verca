/**
 * Stripe Price IDs allowed for Checkout — jeden zdroj pro create-session i veřejný katalog.
 */
'use strict';

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

module.exports = { allowedPriceSet };
