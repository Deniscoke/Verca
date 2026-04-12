/**
 * GET /api/account/me
 * Ověří Supabase access token (Authorization: Bearer) a vrátí bezpečný výřez uživatele + řádek profiles (pokud existuje tabulka a RLS).
 */
'use strict';

var http = require('../_lib/http');
var supabaseResolve = require('../_lib/supabase-resolve');

function bearerToken(req) {
  var raw = req.headers.authorization || req.headers.Authorization || '';
  if (typeof raw !== 'string') return null;
  var m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function authHeaders(anonKey, accessToken) {
  return {
    apikey: anonKey,
    Authorization: 'Bearer ' + accessToken,
  };
}

function fetchAuthUser(baseUrl, anonKey, accessToken) {
  var url = baseUrl + '/auth/v1/user';
  return fetch(url, { headers: authHeaders(anonKey, accessToken) }).then(function (r) {
    if (r.status === 401 || r.status === 403) return { user: null, status: r.status };
    if (!r.ok)
      return r.text().then(function (t) {
        throw new Error(t || 'auth_user_failed');
      });
    return r.json().then(function (body) {
      return { user: body, status: 200 };
    });
  });
}

function fetchProfileRow(baseUrl, anonKey, accessToken) {
  var url =
    baseUrl +
    '/rest/v1/profiles?select=id,email,full_name,created_at,updated_at&limit=1';
  return fetch(url, {
    headers: Object.assign(
      { Accept: 'application/json', Prefer: 'return=representation' },
      authHeaders(anonKey, accessToken)
    ),
  }).then(function (r) {
    if (!r.ok) return null;
    return r.json().then(function (rows) {
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    });
  });
}

function publicUser(u) {
  if (!u || typeof u !== 'object') return null;
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    created_at: u.created_at,
    app_metadata: u.app_metadata,
    user_metadata: u.user_metadata,
  };
}

module.exports = function accountMe(req, res) {
  http.noStore(res);
  if (req.method !== 'GET') {
    http.allowMethods(res, ['GET']);
    return http.json(res, 405, { error: 'method_not_allowed' });
  }

  var token = bearerToken(req);
  if (!token) {
    return http.json(res, 401, {
      error: 'unauthorized',
      message: 'Chybí hlavička Authorization: Bearer s access tokenem ze Supabase relace.',
    });
  }

  var supabaseUrl = supabaseResolve.resolveSupabaseUrl();
  var anonKey = supabaseResolve.resolveAnonKey();
  if (!supabaseUrl || !anonKey) {
    return http.json(res, 503, {
      error: 'server_misconfigured',
      message: 'Na serveru chybí SUPABASE_URL nebo SUPABASE_ANON_KEY.',
    });
  }

  var base = supabaseUrl.replace(/\/+$/, '');

  fetchAuthUser(base, anonKey, token)
    .then(function (authResult) {
      if (!authResult.user) {
        return http.json(res, 401, {
          error: 'unauthorized',
          message: 'Neplatná nebo expirovaná relace.',
        });
      }
      return fetchProfileRow(base, anonKey, token)
        .catch(function () {
          return null;
        })
        .then(function (profile) {
          return http.json(res, 200, {
            user: publicUser(authResult.user),
            profile: profile,
          });
        });
    })
    .catch(function (err) {
      console.error('[account/me]', err && err.message ? err.message : err);
      return http.json(res, 500, {
        error: 'account_me_failed',
        message: err && err.message ? err.message : 'account_me_failed',
      });
    });
};
