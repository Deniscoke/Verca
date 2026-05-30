/**
 * GET /api/booking/availability
 * Vrátí volné budoucí termíny (open sloty bez aktivní rezervace) jako ISO časy.
 * Lokalizaci (datum/čas v Europe/Prague) řeší klient přes Intl.DateTimeFormat.
 */
'use strict';

var http = require('../_lib/http');
var booking = require('../_lib/booking');

module.exports = function availability(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var cfg = booking.adminConfig();
  if (!cfg) {
    return http.json(res, 503, {
      error: 'not_configured',
      message: 'Rezervační systém zatím není na serveru nastavený.',
    });
  }

  booking
    .getAvailableSlots(cfg)
    .then(function (slots) {
      return http.json(res, 200, {
        ok: true,
        timezone: 'Europe/Prague',
        slots: slots,
      });
    })
    .catch(function (err) {
      console.error('[booking/availability]', err && err.message, err && err.detail);
      return http.json(res, 502, {
        error: 'availability_failed',
        message: 'Termíny se teď nepodařilo načíst. Zkuste to prosím za chvíli.',
      });
    });
};
