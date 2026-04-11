/**
 * Future: return minimal shop profile for the logged-in customer (session/JWT validated server-side).
 * Do not merge therapy or health records into this response.
 */
'use strict';

var http = require('../_lib/http');

module.exports = function accountMe(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  // TODO: read session cookie / bearer token, load customer_accounts row, return safe fields only.
  return http.json(res, 401, {
    error: 'unauthorized',
    message: 'Account API not wired. Guest users have no session; optional login will authenticate here.',
  });
};
