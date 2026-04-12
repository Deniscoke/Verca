/**
 * Server-only: same Supabase URL/anon resolution as /api/public-config (bez úniku service role).
 */
'use strict';

function trimSlash(s) {
  return (s || '').replace(/\/+$/, '');
}

function resolveSupabaseUrl() {
  return trimSlash(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  );
}

function resolveAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''
  );
}

module.exports = { resolveSupabaseUrl, resolveAnonKey, trimSlash };
