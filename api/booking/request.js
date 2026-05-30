/**
 * POST /api/booking/request
 * Žádost o termín. Slot se okamžitě zablokuje pending rezervací ("hneď blokuj"),
 * Verca dostane e-mail s odkazem na potvrzení/zamítnutí, klient potvrzení o přijetí.
 *
 * Body: { name, email, phone, note?, slot (ISO), company (honeypot) }
 */
'use strict';

var http = require('../_lib/http');
var env = require('../_lib/env');
var readBody = require('../_lib/read-body');
var siteUrl = require('../_lib/site-url');
var booking = require('../_lib/booking');

var MAX_BODY = 16384;
var HANDLED = '__verca_handled';

function basicEmail(s) {
  if (!s || typeof s !== 'string') return false;
  var t = s.trim();
  return t.length >= 5 && t.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function validPhone(s) {
  if (!s || typeof s !== 'string') return false;
  var t = s.trim();
  return t.length >= 6 && t.length <= 40 && /^[0-9+()\/\s.\-]+$/.test(t);
}

function validIso(s) {
  if (!s || typeof s !== 'string') return false;
  return !isNaN(new Date(s).getTime());
}

function vercaEmail(ctx, links) {
  var text =
    'Nová žádost o termín z webu Esencia Viva.\n\n' +
    'Termín: ' + ctx.when + '\n' +
    'Jméno: ' + ctx.name + '\n' +
    'E-mail: ' + ctx.email + '\n' +
    'Telefon: ' + ctx.phone + '\n' +
    (ctx.note ? 'Poznámka: ' + ctx.note + '\n' : '') +
    '\nTermín je zatím dočasně zablokovaný. Otevřete odkaz a potvrďte, nebo zamítněte:\n' +
    links.page + '\n';

  var e = booking.escapeHtml;
  var html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#2A2622;line-height:1.6">' +
    '<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#B86447;margin:0 0 6px">Esencia Viva — nová žádost</p>' +
    '<h2 style="font-size:20px;margin:0 0 16px;color:#1A1816">' + e(ctx.when) + '</h2>' +
    '<table style="border-collapse:collapse;width:100%;margin:0 0 20px">' +
    '<tr><td style="padding:4px 10px 4px 0;color:#66605A">Jméno</td><td style="padding:4px 0;font-weight:600">' + e(ctx.name) + '</td></tr>' +
    '<tr><td style="padding:4px 10px 4px 0;color:#66605A">E-mail</td><td style="padding:4px 0"><a href="mailto:' + e(ctx.email) + '" style="color:#B86447">' + e(ctx.email) + '</a></td></tr>' +
    '<tr><td style="padding:4px 10px 4px 0;color:#66605A">Telefon</td><td style="padding:4px 0"><a href="tel:' + e(ctx.phone) + '" style="color:#B86447">' + e(ctx.phone) + '</a></td></tr>' +
    (ctx.note ? '<tr><td style="padding:4px 10px 4px 0;color:#66605A;vertical-align:top">Poznámka</td><td style="padding:4px 0">' + e(ctx.note) + '</td></tr>' : '') +
    '</table>' +
    '<a href="' + e(links.page) + '" style="display:inline-block;background:#B86447;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:600">Otevřít a rozhodnout</a>' +
    '<p style="font-size:13px;color:#66605A;margin:18px 0 0">Termín je do vašeho rozhodnutí dočasně zablokovaný pro ostatní.</p>' +
    '</div>';

  return { text: text, html: html };
}

function clientEmail(ctx) {
  return (
    'Dobrý den, ' + ctx.name + ',\n\n' +
    'děkuji za vaši žádost o termín:\n' +
    ctx.when + '\n\n' +
    'Termín jsem pro vás předběžně rezervovala. Brzy se vám ozvu s potvrzením — ' +
    'jakmile termín potvrdím, dostanete e-mail.\n\n' +
    'Kdybyste cokoli potřebovala upřesnit, stačí odpovědět na tento e-mail.\n\n' +
    'S péčí,\nVerca · Esencia Viva\n'
  );
}

function sendBookingEmails(ctx, row) {
  var apiKey = env.getEnv('RESEND_API_KEY');
  var fromEmail = env.getEnv('CONTACT_FROM_EMAIL');
  var toEmail = env.getEnv('CONTACT_TO_EMAIL') || 'verca@esenciaviva.cz';
  if (!apiKey || !fromEmail) return Promise.resolve();

  var site = siteUrl.resolveSiteUrl() || 'https://esenciaviva.cz';
  var links = {
    page: site + '/api/booking/decide?token=' + encodeURIComponent(row.confirm_token),
  };

  var vm = vercaEmail(ctx, links);
  var noop = function () {};

  return Promise.all([
    booking
      .sendEmail({
        apiKey: apiKey,
        from: fromEmail,
        to: toEmail,
        replyTo: ctx.email,
        subject: '[Esencia Viva] Nová žádost o termín — ' + ctx.when,
        text: vm.text,
        html: vm.html,
      })
      .catch(noop),
    booking
      .sendEmail({
        apiKey: apiKey,
        from: fromEmail,
        to: ctx.email,
        replyTo: toEmail,
        subject: 'Přijali jsme vaši žádost o termín — Esencia Viva',
        text: clientEmail(ctx),
      })
      .catch(noop),
  ]).then(function () {}).catch(noop);
}

module.exports = function bookingRequest(req, res) {
  http.noStore(res);
  if (req.method !== 'POST') {
    http.allowMethods(res, ['POST']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var cfg = booking.adminConfig();
  if (!cfg) {
    return http.json(res, 503, {
      error: 'not_configured',
      message: 'Rezervační systém zatím není na serveru nastavený.',
    });
  }

  var ctx = {};

  readBody
    .readJsonBody(req, MAX_BODY)
    .then(function (body) {
      if (body && body.company) {
        http.json(res, 200, { ok: true });
        throw new Error(HANDLED);
      }

      var name = body && body.name != null ? String(body.name).trim() : '';
      var email = body && body.email != null ? String(body.email).trim() : '';
      var phone = body && body.phone != null ? String(body.phone).trim() : '';
      var note = body && body.note != null ? String(body.note).trim() : '';
      var slotRaw = body && body.slot != null ? String(body.slot).trim() : '';

      if (!name || name.length > 120) {
        http.json(res, 400, { error: 'invalid_name', message: 'Zadejte prosím jméno (1–120 znaků).' });
        throw new Error(HANDLED);
      }
      if (!basicEmail(email)) {
        http.json(res, 400, { error: 'invalid_email', message: 'Zadejte platnou e-mailovou adresu.' });
        throw new Error(HANDLED);
      }
      if (!validPhone(phone)) {
        http.json(res, 400, { error: 'invalid_phone', message: 'Zadejte platné telefonní číslo.' });
        throw new Error(HANDLED);
      }
      if (note.length > 2000) {
        http.json(res, 400, { error: 'invalid_note', message: 'Poznámka je příliš dlouhá (max. 2000 znaků).' });
        throw new Error(HANDLED);
      }
      if (!validIso(slotRaw)) {
        http.json(res, 400, { error: 'invalid_slot', message: 'Vyberte prosím termín ze seznamu.' });
        throw new Error(HANDLED);
      }

      ctx.name = name;
      ctx.email = email;
      ctx.phone = phone;
      ctx.note = note;

      var iso = new Date(slotRaw).toISOString();

      return booking.findOpenSlot(cfg, iso).then(function (slot) {
        if (!slot) {
          http.json(res, 409, {
            error: 'slot_unavailable',
            message: 'Tento termín už není volný. Vyberte prosím jiný.',
          });
          throw new Error(HANDLED);
        }
        ctx.when = booking.formatSlotCs(booking.pgToIso(slot.slot_at) || iso);
        return booking.insertBooking(cfg, {
          slot_id: slot.id,
          name: name,
          email: email,
          phone: phone,
          note: note,
        });
      });
    })
    .then(function (row) {
      if (!row) {
        return http.json(res, 502, {
          error: 'booking_failed',
          message: 'Rezervaci se nepodařilo uložit. Zkuste to prosím znovu.',
        });
      }
      return sendBookingEmails(ctx, row).then(function () {
        return http.json(res, 200, {
          ok: true,
          status: 'pending',
          when: ctx.when,
          message: 'Žádost odeslána. Termín je předběžně rezervovaný, Verca ho brzy potvrdí.',
        });
      });
    })
    .catch(function (err) {
      if (err && err.message === HANDLED) return;
      if (err && err.code === 'slot_taken') {
        return http.json(res, 409, {
          error: 'slot_taken',
          message: 'Tento termín byl právě obsazen. Vyberte prosím jiný.',
        });
      }
      if (err && err.message === 'body_too_large') {
        return http.json(res, 413, { error: 'body_too_large' });
      }
      if (err instanceof SyntaxError) {
        return http.json(res, 400, { error: 'invalid_json', message: 'Neplatný formát požadavku.' });
      }
      console.error('[booking/request]', err && err.message, err && err.detail);
      return http.json(res, 500, {
        error: 'server_error',
        message: 'Něco se nepovedlo. Zkuste to prosím znovu.',
      });
    });
};
