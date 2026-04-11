'use strict';

var Stripe = require('stripe');

/** @type {import('stripe').default | null} */
var client = null;

function getStripe() {
  if (client) return client;
  var key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client = new Stripe(key);
  return client;
}

module.exports = { getStripe };
