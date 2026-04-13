/**
 * GET /api/store/catalog
 * Veřejný seznam položek pro e-shop UI. Každá položka musí mít price ID v allowlistu (env),
 * jinak se do odpovědi nedostane — ceny zůstávají pod kontrolou serveru.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var http = require('../_lib/http');
var stripePrices = require('../_lib/stripe-prices');

function loadRawCatalog() {
  // Soubor musí mít jiný basename než catalog.js — Vercel neumožňuje catalog.js + catalog.json ve stejné složce.
  var filePath = path.join(__dirname, 'products.json');
  try {
    var raw = fs.readFileSync(filePath, 'utf8');
    var data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[store/catalog] read products.json', e && e.message ? e.message : e);
    return [];
  }
}

function isValidItem(item) {
  if (!item || typeof item !== 'object') return false;
  var price = item.price;
  var slug = item.slug;
  var name = item.name;
  if (typeof price !== 'string' || price.length < 8) return false;
  if (typeof slug !== 'string' || !slug.trim()) return false;
  if (typeof name !== 'string' || !name.trim()) return false;
  return true;
}

module.exports = function storeCatalog(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var allowed = stripePrices.allowedPriceSet();
  var raw = loadRawCatalog();
  var items = [];

  for (var i = 0; i < raw.length; i++) {
    var it = raw[i];
    if (!isValidItem(it)) continue;
    if (!allowed.has(it.price)) continue;
    items.push({
      slug: String(it.slug).trim(),
      name: String(it.name).trim(),
      description: typeof it.description === 'string' ? it.description.trim() : '',
      image: typeof it.image === 'string' && it.image.trim() ? it.image.trim() : null,
      price: it.price,
    });
  }

  return http.json(res, 200, { items: items });
};
