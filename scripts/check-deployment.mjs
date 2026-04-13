#!/usr/bin/env node
/**
 * Zavolá /api/public-config na zadané bázi a vypíše stav nasazení (anon klíč zkrátí).
 * Použití: node scripts/check-deployment.mjs [BASE_URL]
 * Příklad: node scripts/check-deployment.mjs https://verca-omega.vercel.app
 */
const base = (process.argv[2] || 'https://verca-omega.vercel.app').replace(/\/+$/, '');
const url = `${base}/api/public-config`;

function shortKey(k) {
  if (!k || typeof k !== 'string') return null;
  return k.length <= 12 ? `${k.slice(0, 4)}…` : `${k.slice(0, 8)}…`;
}

async function main() {
  const res = await fetch(url);
  const j = await res.json().catch(() => ({}));
  const safe = { ...j };
  if (safe.supabaseAnonKey) safe.supabaseAnonKey = shortKey(safe.supabaseAnonKey);

  console.log('GET', url, '→', res.status);
  console.log(JSON.stringify(safe, null, 2));

  const catalogUrl = `${base}/api/store/catalog`;
  try {
    const cRes = await fetch(catalogUrl);
    const cj = await cRes.json().catch(() => ({}));
    console.log('\nGET', catalogUrl, '→', cRes.status);
    console.log('store catalog items:', Array.isArray(cj.items) ? cj.items.length : 0);
  } catch (_) {
    console.log('\nGET', catalogUrl, '→ (nepodařilo se načíst)');
  }

  console.log('\n--- Další kroky (ručně v dashboardu) ---');
  if (j.urls && j.urls.authCallback) {
    console.log('Supabase → Auth → URL Configuration → Redirect URLs ← přidejte:');
    console.log(' ', j.urls.authCallback);
  }
  if (j.siteUrl) {
    console.log('Stripe → Developers → Webhooks → Endpoint URL:');
    console.log(' ', j.siteUrl.replace(/\/+$/, '') + '/api/webhooks/stripe');
  }
  if (j.readiness && !j.readiness.publicSiteUrlExplicit && j.siteUrl) {
    console.log(
      'Tip: Pro stabilní adresu (ne preview URL) nastavte PUBLIC_SITE_URL na produkční doménu ve Vercelu.'
    );
  }
  if (j.readiness && !j.readiness.stripeSecretKey) {
    console.log('Stripe: doplňte STRIPE_SECRET_KEY ve Vercel Environment Variables.');
  }
  if (j.readiness && !j.readiness.stripeWebhookSecret) {
    console.log('Stripe: doplňte STRIPE_WEBHOOK_SECRET (signing secret z webhooku).');
  }
  if (j.readiness && !j.readiness.stripePriceAllowlist) {
    console.log('Stripe: nastavte STRIPE_TEST_PRICE_ID nebo STRIPE_ALLOWED_PRICE_IDS.');
  }
  if (!j.features || !j.features.googleLogin) {
    console.log(
      'Google login: PUBLIC_GOOGLE_LOGIN_ENABLED=true + Google provider v Supabase + redirect URL výše.'
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
