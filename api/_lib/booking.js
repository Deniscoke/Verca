/**
 * Data + e-mail vrstva pro rezervační systém (Esencia Viva / Verca).
 *
 * Veškerý přístup k tabulkám booking_slots / bookings jde přes service-role klíč
 * z této serverless vrstvy — prohlížeč se Supabase nikdy nedotýká přímo (ochrana PII).
 * RLS je zapnuté bez anon politik = default-deny pro veřejné klienty.
 */
'use strict';

var supabaseResolve = require('./supabase-resolve');

var REST = '/rest/v1/';
var RESEND_URL = 'https://api.resend.com/emails';

/** @returns {{ base: string, key: string } | null} */
function adminConfig() {
  var url = supabaseResolve.resolveSupabaseUrl();
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return { base: url.replace(/\/+$/, ''), key: key };
}

function adminHeaders(key, extra) {
  return Object.assign(
    { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' },
    extra || {}
  );
}

function asArray(j) {
  return Array.isArray(j) ? j : [];
}

function okJson(r) {
  if (!r.ok) {
    return r.text().then(function (t) {
      var e = new Error('supabase_' + r.status);
      e.status = r.status;
      e.detail = t;
      throw e;
    });
  }
  return r.json();
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ───────── datum / čas (Europe/Prague, cs-CZ) ───────── */

// PostgREST vrací timestamptz jako "2026-06-04 16:00:00+00".
// Normalizujeme na ISO ("...Z"), ať to JS i klient parsují spolehlivě.
function pgToIso(pgTs) {
  if (!pgTs) return null;
  var s = String(pgTs).trim().replace(' ', 'T');
  var m = s.match(/([+-])(\d{2}):?(\d{2})?$/);
  if (m) {
    s = s.slice(0, m.index) + m[1] + m[2] + ':' + (m[3] || '00');
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

var CS_DATE = null;
var CS_TIME = null;
function formatSlotCs(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  try {
    if (!CS_DATE) {
      CS_DATE = new Intl.DateTimeFormat('cs-CZ', {
        timeZone: 'Europe/Prague',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      CS_TIME = new Intl.DateTimeFormat('cs-CZ', {
        timeZone: 'Europe/Prague',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return CS_DATE.format(d) + ' v ' + CS_TIME.format(d);
  } catch (e) {
    return d.toISOString();
  }
}

/* ───────── dotazy na sloty / rezervace ───────── */

/** Volné budoucí termíny (open sloty bez aktivní rezervace). */
function getAvailableSlots(cfg) {
  var nowIso = new Date().toISOString();
  var slotsUrl =
    cfg.base + REST + 'booking_slots?status=eq.open&slot_at=gte.' +
    encodeURIComponent(nowIso) + '&select=id,slot_at&order=slot_at.asc';
  var takenUrl =
    cfg.base + REST + 'bookings?status=in.(pending,confirmed)&select=slot_id';

  return Promise.all([
    fetch(slotsUrl, { headers: adminHeaders(cfg.key) }).then(okJson),
    fetch(takenUrl, { headers: adminHeaders(cfg.key) }).then(okJson),
  ]).then(function (out) {
    var slots = asArray(out[0]);
    var taken = Object.create(null);
    asArray(out[1]).forEach(function (b) {
      if (b && b.slot_id) taken[b.slot_id] = true;
    });
    return slots
      .filter(function (s) { return s && !taken[s.id]; })
      .map(function (s) { return { at: pgToIso(s.slot_at) }; })
      .filter(function (s) { return s.at; });
  });
}

/** Najde konkrétní OPEN slot podle ISO času (Postgres porovná instant). */
function findOpenSlot(cfg, iso) {
  var url =
    cfg.base + REST + 'booking_slots?slot_at=eq.' + encodeURIComponent(iso) +
    '&status=eq.open&select=id,slot_at&limit=1';
  return fetch(url, { headers: adminHeaders(cfg.key) })
    .then(okJson)
    .then(function (rows) {
      var arr = asArray(rows);
      return arr.length ? arr[0] : null;
    });
}

/**
 * Vloží pending rezervaci. Partial unique index zajistí, že na jeden slot
 * existuje max. jedna aktivní (pending/confirmed) rezervace → 409 = obsazeno.
 */
function insertBooking(cfg, data) {
  var url = cfg.base + REST + 'bookings';
  return fetch(url, {
    method: 'POST',
    headers: adminHeaders(cfg.key, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify({
      slot_id: data.slot_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      note: data.note || null,
      status: 'pending',
    }),
  }).then(function (r) {
    if (r.status === 409) {
      return r.text().then(function () {
        var e = new Error('slot_taken');
        e.code = 'slot_taken';
        throw e;
      });
    }
    return okJson(r).then(function (rows) {
      var arr = asArray(rows);
      return arr.length ? arr[0] : null;
    });
  });
}

/** Načte rezervaci podle confirm_token (vč. času slotu). */
function findBookingByToken(cfg, token) {
  var url =
    cfg.base + REST + 'bookings?confirm_token=eq.' + encodeURIComponent(token) +
    '&select=id,status,name,email,phone,note,booking_slots(slot_at)&limit=1';
  return fetch(url, { headers: adminHeaders(cfg.key) })
    .then(okJson)
    .then(function (rows) {
      var arr = asArray(rows);
      return arr.length ? arr[0] : null;
    });
}

/**
 * Přepne pending rezervaci na confirmed/declined.
 * Guard `status=eq.pending` → idempotentní i při souběžném kliknutí
 * (druhý PATCH zasáhne 0 řádků a vrátí null).
 */
function decideBooking(cfg, id, nextStatus) {
  var url =
    cfg.base + REST + 'bookings?id=eq.' + encodeURIComponent(id) + '&status=eq.pending';
  return fetch(url, {
    method: 'PATCH',
    headers: adminHeaders(cfg.key, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify({ status: nextStatus, decided_at: new Date().toISOString() }),
  })
    .then(okJson)
    .then(function (rows) {
      var arr = asArray(rows);
      return arr.length ? arr[0] : null;
    });
}

/* ───────── e-mail (Resend) ───────── */

function sendEmail(opts) {
  if (!opts || !opts.apiKey || !opts.from || !opts.to) {
    return Promise.resolve({ skipped: true });
  }
  var payload = {
    from: opts.from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: String(opts.subject || '').slice(0, 998),
  };
  if (opts.replyTo) {
    payload.reply_to = Array.isArray(opts.replyTo) ? opts.replyTo : [opts.replyTo];
  }
  if (opts.text) payload.text = opts.text;
  if (opts.html) payload.html = opts.html;

  return fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + opts.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function (r) {
    return r.text().then(function (t) {
      return { status: r.status, body: t };
    });
  });
}

module.exports = {
  adminConfig: adminConfig,
  escapeHtml: escapeHtml,
  pgToIso: pgToIso,
  formatSlotCs: formatSlotCs,
  getAvailableSlots: getAvailableSlots,
  findOpenSlot: findOpenSlot,
  insertBooking: insertBooking,
  findBookingByToken: findBookingByToken,
  decideBooking: decideBooking,
  sendEmail: sendEmail,
};
