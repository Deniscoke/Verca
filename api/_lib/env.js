/**
 * Server-only environment helpers. Never import this file from static client JS.
 */
'use strict';

function getEnv(name) {
  var v = process.env[name];
  return v == null || v === '' ? null : String(v);
}

/**
 * @param {string[]} names
 * @returns {{ ok: true } | { ok: false, missing: string[] }}
 */
function requireEnv(names) {
  var missing = [];
  for (var i = 0; i < names.length; i++) {
    if (!getEnv(names[i])) missing.push(names[i]);
  }
  if (missing.length) return { ok: false, missing: missing };
  return { ok: true };
}

module.exports = { getEnv, requireEnv };
