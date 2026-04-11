/**
 * Liveness probe — no secrets, safe for uptime checks.
 */
'use strict';

var http = require('./_lib/http');

module.exports = function health(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }
  return http.json(res, 200, {
    ok: true,
    service: 'verca-api',
    phase: 'security_foundation',
  });
};
