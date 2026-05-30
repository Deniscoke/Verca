/**
 * /api/booking/decide
 *  GET  ?token=…  → stránka s detailem žádosti a tlačítky Potvrdit / Zamítnout
 *  POST (token, action=confirm|decline) → provede rozhodnutí
 *
 * Mutace je jen na POST (GET je bezpečný) — aby přednačítání odkazů
 * v e-mailových klientech / skenerech nikdy samo nepotvrdilo termín.
 */
'use strict';

var env = require('../_lib/env');
var readBody = require('../_lib/read-body');
var booking = require('../_lib/booking');

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(html);
}

function page(opts) {
  var e = booking.escapeHtml;
  return (
    '<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex">' +
    '<title>' + e(opts.title) + ' — Esencia Viva</title><style>' +
    ':root{--cream:#F5F3EF;--terra:#B86447;--ink:#2A2622;--muted:#66605A;--sage:#5A7260}' +
    '*{box-sizing:border-box}' +
    'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;' +
    'background:linear-gradient(160deg,#F7F5F1,#EBE8E1);color:var(--ink);' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}' +
    '.card{background:#fff;max-width:480px;width:100%;border-radius:22px;padding:40px 34px;' +
    'box-shadow:0 30px 80px -42px rgba(40,30,20,.45);text-align:center}' +
    '.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--terra);margin:0 0 14px}' +
    'h1{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:26px;line-height:1.22;margin:0 0 14px}' +
    '.when{font-size:17px;font-weight:600;margin:0 0 6px}' +
    '.lead{color:var(--muted);margin:0 0 26px}' +
    '.meta{text-align:left;background:#F7F5F1;border-radius:14px;padding:16px 18px;margin:0 0 26px;font-size:15px}' +
    '.meta div{margin:3px 0}.meta span{color:var(--muted);display:inline-block;min-width:74px}' +
    '.row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
    'button{font:inherit;cursor:pointer;border:0;border-radius:999px;padding:13px 26px;font-weight:600}' +
    '.confirm{background:var(--terra);color:#fff}' +
    '.decline{background:transparent;color:var(--muted);border:1px solid #d8d2c8}' +
    'form{margin:0}.foot{margin:26px 0 0;font-size:13px;color:#9a938a}a{color:var(--terra)}' +
    '</style></head><body><div class="card">' + opts.body + '</div></body></html>'
  );
}

function infoPage(title, eyebrow, heading, lead) {
  return page({
    title: title,
    body:
      '<p class="eyebrow">' + booking.escapeHtml(eyebrow) + '</p>' +
      '<h1>' + booking.escapeHtml(heading) + '</h1>' +
      '<p class="lead">' + booking.escapeHtml(lead) + '</p>' +
      '<p class="foot">Esencia Viva</p>',
  });
}

function detailPage(token, when, b) {
  var e = booking.escapeHtml;
  var meta =
    '<div class="meta">' +
    '<div><span>Termín</span><b>' + e(when) + '</b></div>' +
    '<div><span>Jméno</span><b>' + e(b.name) + '</b></div>' +
    '<div><span>E-mail</span>' + e(b.email) + '</div>' +
    '<div><span>Telefon</span>' + e(b.phone) + '</div>' +
    (b.note ? '<div><span>Poznámka</span>' + e(b.note) + '</div>' : '') +
    '</div>';
  var forms =
    '<div class="row">' +
    '<form method="post" action="/api/booking/decide">' +
    '<input type="hidden" name="token" value="' + e(token) + '">' +
    '<button class="confirm" name="action" value="confirm">Potvrdit termín</button></form>' +
    '<form method="post" action="/api/booking/decide">' +
    '<input type="hidden" name="token" value="' + e(token) + '">' +
    '<button class="decline" name="action" value="decline">Zamítnout</button></form>' +
    '</div>';
  return page({
    title: 'Žádost o termín',
    body:
      '<p class="eyebrow">Esencia Viva — žádost o termín</p>' +
      '<h1>Potvrdit rezervaci?</h1>' +
      meta +
      forms +
      '<p class="foot">Termín je do rozhodnutí dočasně zablokovaný pro ostatní.</p>',
  });
}

function statusInfoPage(b, when) {
  if (b.status === 'confirmed') {
    return infoPage('Termín potvrzen', 'Esencia Viva', 'Termín je potvrzený',
      when + ' — ' + b.name + '. Klient dostal potvrzovací e-mail.');
  }
  if (b.status === 'declined') {
    return infoPage('Termín zamítnut', 'Esencia Viva', 'Termín byl zamítnutý',
      'Slot ' + when + ' je opět volný pro ostatní.');
  }
  return infoPage('Rezervace', 'Esencia Viva', 'Rezervace je uzavřená',
    'S touto žádostí už není potřeba nic dělat.');
}

function validToken(t) {
  return typeof t === 'string' && /^[0-9a-fA-F-]{16,64}$/.test(t);
}

function clientDecisionEmail(b, when, confirmed) {
  if (confirmed) {
    return {
      subject: 'Termín potvrzen — Esencia Viva',
      text:
        'Dobrý den, ' + b.name + ',\n\n' +
        'váš termín je potvrzený:\n' + when + '\n\n' +
        'Moc se na vás těším. Kdyby se cokoli změnilo nebo budete něco potřebovat, ' +
        'stačí odpovědět na tento e-mail.\n\n' +
        'S péčí,\nVerca · Esencia Viva\n',
    };
  }
  return {
    subject: 'K vašemu termínu — Esencia Viva',
    text:
      'Dobrý den, ' + b.name + ',\n\n' +
      'tento termín (' + when + ') vám bohužel nemůžu potvrdit. ' +
      'Moc ráda vám ale najdu jiný — napište mi prosím, kdy by se vám to hodilo, ' +
      'a domluvíme se.\n\n' +
      'S péčí,\nVerca · Esencia Viva\n',
  };
}

function notifyClient(b, when, confirmed) {
  var apiKey = env.getEnv('RESEND_API_KEY');
  var fromEmail = env.getEnv('CONTACT_FROM_EMAIL');
  var toVerca = env.getEnv('CONTACT_TO_EMAIL') || 'verca@esenciaviva.cz';
  if (!apiKey || !fromEmail || !b.email) return Promise.resolve();
  var m = clientDecisionEmail(b, when, confirmed);
  return booking
    .sendEmail({
      apiKey: apiKey,
      from: fromEmail,
      to: b.email,
      replyTo: toVerca,
      subject: m.subject,
      text: m.text,
    })
    .catch(function () {});
}

function whenOf(b) {
  var slot = b && b.booking_slots ? b.booking_slots : null;
  var iso = slot ? booking.pgToIso(slot.slot_at) : null;
  return iso ? booking.formatSlotCs(iso) : 'termín';
}

module.exports = function decide(req, res) {
  var cfg = booking.adminConfig();
  if (!cfg) {
    return sendHtml(res, 503, infoPage('Nedostupné', 'Esencia Viva',
      'Rezervační systém není nastavený', 'Zkuste to prosím později.'));
  }

  if (req.method === 'GET') {
    var url = new URL(req.url, 'http://localhost');
    var gToken = (url.searchParams.get('token') || '').trim();
    if (!validToken(gToken)) {
      return sendHtml(res, 400, infoPage('Neplatný odkaz', 'Esencia Viva',
        'Odkaz není platný', 'Zkontrolujte prosím odkaz z e-mailu.'));
    }
    return booking
      .findBookingByToken(cfg, gToken)
      .then(function (b) {
        if (!b) {
          return sendHtml(res, 404, infoPage('Nenalezeno', 'Esencia Viva',
            'Žádost nenalezena', 'Tento odkaz už neplatí.'));
        }
        var when = whenOf(b);
        if (b.status !== 'pending') {
          return sendHtml(res, 200, statusInfoPage(b, when));
        }
        return sendHtml(res, 200, detailPage(gToken, when, b));
      })
      .catch(function (err) {
        console.error('[booking/decide GET]', err && err.message, err && err.detail);
        return sendHtml(res, 502, infoPage('Chyba', 'Esencia Viva',
          'Něco se nepovedlo', 'Zkuste to prosím za chvíli.'));
      });
  }

  if (req.method === 'POST') {
    return readBody
      .readRawBody(req, 8192)
      .then(function (buf) {
        var params = new URLSearchParams(buf.toString('utf8'));
        var token = (params.get('token') || '').trim();
        var action = (params.get('action') || '').trim();
        if (!validToken(token) || (action !== 'confirm' && action !== 'decline')) {
          return sendHtml(res, 400, infoPage('Neplatný požadavek', 'Esencia Viva',
            'Neplatný požadavek', 'Otevřete prosím znovu odkaz z e-mailu.'));
        }
        return booking.findBookingByToken(cfg, token).then(function (b) {
          if (!b) {
            return sendHtml(res, 404, infoPage('Nenalezeno', 'Esencia Viva',
              'Žádost nenalezena', 'Tento odkaz už neplatí.'));
          }
          var when = whenOf(b);
          if (b.status !== 'pending') {
            return sendHtml(res, 200, statusInfoPage(b, when));
          }
          var confirmed = action === 'confirm';
          var nextStatus = confirmed ? 'confirmed' : 'declined';
          return booking.decideBooking(cfg, b.id, nextStatus).then(function (updated) {
            if (!updated) {
              // mezitím rozhodnuto jinde — ukaž aktuální stav
              return booking.findBookingByToken(cfg, token).then(function (fresh) {
                return sendHtml(res, 200, statusInfoPage(fresh || b, when));
              });
            }
            return notifyClient(b, when, confirmed).then(function () {
              if (confirmed) {
                return sendHtml(res, 200, infoPage('Potvrzeno', 'Esencia Viva',
                  'Termín je potvrzený ✓',
                  when + ' — ' + b.name + '. Klientovi jsme poslali potvrzení.'));
              }
              return sendHtml(res, 200, infoPage('Zamítnuto', 'Esencia Viva',
                'Termín byl zamítnutý',
                'Slot ' + when + ' je opět volný. Klient dostal e-mail s nabídkou jiného termínu.'));
            });
          });
        });
      })
      .catch(function (err) {
        if (err && err.message === 'body_too_large') {
          return sendHtml(res, 413, infoPage('Chyba', 'Esencia Viva', 'Příliš velký požadavek', 'Zkuste to znovu.'));
        }
        console.error('[booking/decide POST]', err && err.message, err && err.detail);
        return sendHtml(res, 502, infoPage('Chyba', 'Esencia Viva',
          'Něco se nepovedlo', 'Zkuste to prosím za chvíli.'));
      });
  }

  res.setHeader('Allow', 'GET, POST');
  return sendHtml(res, 405, infoPage('Nepovoleno', 'Esencia Viva', 'Metoda není povolená', ''));
};
