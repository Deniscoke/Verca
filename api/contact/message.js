/**
 * POST /api/contact/message
 * Odeslání zprávy z kontaktního formuláře přes Resend (RESEND_API_KEY + CONTACT_FROM_EMAIL).
 */
'use strict';

var http = require('../_lib/http');
var env = require('../_lib/env');
var readBody = require('../_lib/read-body');

var MAX_BODY = 16384;
var HANDLED = '__verca_handled';

function basicEmail(s) {
  if (!s || typeof s !== 'string') return false;
  var t = s.trim();
  if (t.length < 5 || t.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

module.exports = function contactMessage(req, res) {
  http.noStore(res);
  if (req.method !== 'POST') {
    http.allowMethods(res, ['POST']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var apiKey = env.getEnv('RESEND_API_KEY');
  var toEmail = env.getEnv('CONTACT_TO_EMAIL') || 'hello@verca.care';
  var fromEmail = env.getEnv('CONTACT_FROM_EMAIL');
  if (!apiKey || !fromEmail) {
    return http.json(res, 501, {
      error: 'not_configured',
      message:
        'Odesílání z formuláře není na serveru nastavené. Doplňte RESEND_API_KEY a CONTACT_FROM_EMAIL (odesílatel musí být ověřená doména v Resend).',
      missing_env: [].concat(!apiKey ? ['RESEND_API_KEY'] : [], !fromEmail ? ['CONTACT_FROM_EMAIL'] : []),
    });
  }

  readBody
    .readJsonBody(req, MAX_BODY)
    .then(function (body) {
      if (body && body.company) {
        http.json(res, 200, { ok: true });
        throw new Error(HANDLED);
      }

      var name = body && body.name != null ? String(body.name).trim() : '';
      var fromUser = body && body.email != null ? String(body.email).trim() : '';
      var message = body && body.message != null ? String(body.message).trim() : '';

      if (!name || name.length > 120) {
        http.json(res, 400, { error: 'invalid_name', message: 'Jméno: 1–120 znaků.' });
        throw new Error(HANDLED);
      }
      if (!basicEmail(fromUser)) {
        http.json(res, 400, { error: 'invalid_email', message: 'Zadejte platnou e-mailovou adresu.' });
        throw new Error(HANDLED);
      }
      if (message.length < 10 || message.length > 8000) {
        http.json(res, 400, {
          error: 'invalid_message',
          message: 'Zpráva: alespoň 10 znaků, nejvýše 8000.',
        });
        throw new Error(HANDLED);
      }

      var subject =
        '[Verca web] ' +
        name.slice(0, 80) +
        (name.length > 80 ? '…' : '') +
        ' — dotaz / rezervace';

      var text =
        'Odesláno z formuláře na webu Verca.\n\n' +
        'Jméno: ' +
        name +
        '\n' +
        'E-mail: ' +
        fromUser +
        '\n\n---\n\n' +
        message +
        '\n';

      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          reply_to: [fromUser],
          subject: subject.slice(0, 998),
          text: text,
        }),
      }).then(function (r) {
        return r.text().then(function (txt) {
          return { status: r.status, txt: txt };
        });
      });
    })
    .then(function (out) {
      if (!out || out.status == null) return;
      if (out.status === 200) {
        return http.json(res, 200, { ok: true });
      }
      var detail = '';
      try {
        var j = JSON.parse(out.txt);
        if (j && j.message) detail = String(j.message);
      } catch (e) {
        detail = out.txt ? String(out.txt).slice(0, 200) : '';
      }
      console.error('[contact]', out.status, detail);
      return http.json(res, 502, {
        error: 'send_failed',
        message:
          'E-mail se nepodařilo odeslat přes Resend. Zkuste znovu nebo použijte odkaz hello@verca.care v poznámce pod formulářem.',
      });
    })
    .catch(function (err) {
      if (err && err.message === HANDLED) return;
      if (err && err.message === 'body_too_large') {
        return http.json(res, 413, { error: 'body_too_large' });
      }
      if (err instanceof SyntaxError) {
        return http.json(res, 400, { error: 'invalid_json', message: 'Neplatný JSON v těle požadavku.' });
      }
      console.error('[contact]', err && err.message ? err.message : err);
      return http.json(res, 500, {
        error: 'server_error',
        message: err && err.message ? err.message : 'server_error',
      });
    });
};
