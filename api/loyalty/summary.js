/**
 * Future: loyalty balance / tier — derived from server-side ledger only (e.g. after verified payments or neutral session events).
 * Anti-abuse: never trust client-reported points; rate-limit reads if needed.
 */
'use strict';

var http = require('../_lib/http');

module.exports = function loyaltySummary(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  // TODO: authenticate, aggregate loyalty_ledger for customer_id, return non-sensitive summary.
  return http.json(res, 401, {
    error: 'unauthorized',
    message: 'Loyalty API not wired. Points and discounts must be computed server-side from ledger and policies.',
  });
};
