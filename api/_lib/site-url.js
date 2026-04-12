/**
 * Resolve public site origin for redirects (checkout, Supabase callback).
 */
'use strict';

function trimSlash(s) {
  return (s || '').replace(/\/+$/, '');
}

function vercelSiteOrigin() {
  var h = String(process.env.VERCEL_URL || '').trim();
  if (!h) return '';
  h = h.replace(/^https?:\/\//i, '');
  return 'https://' + h;
}

function resolveSiteUrl() {
  return trimSlash(process.env.PUBLIC_SITE_URL || vercelSiteOrigin() || '');
}

function defaultCheckoutSuccess(siteUrl) {
  return siteUrl ? siteUrl + '/bylinny-atelier.html?checkout=success' : '';
}

function defaultCheckoutCancel(siteUrl) {
  return siteUrl ? siteUrl + '/bylinny-atelier.html?checkout=cancel' : '';
}

module.exports = {
  trimSlash,
  vercelSiteOrigin,
  resolveSiteUrl,
  defaultCheckoutSuccess,
  defaultCheckoutCancel,
};
