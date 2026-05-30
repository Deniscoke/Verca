-- VERCA — Supabase: rezervační systém (custom kalendář místo Calendly).
-- Aplikováno na projekt "Verca" přes MCP migraci `booking_system_init`.
-- Tento soubor slouží jako verzovaná dokumentace schématu (idempotentní).
--
-- Tok: klient vybere volný slot → POST /api/booking/request vloží pending rezervaci
-- (slot se hned zablokuje) → Verca dostane e-mail s odkazem → GET/POST /api/booking/decide
-- potvrdí (confirmed) nebo zamítne (declined → slot se uvolní).
--
-- Přístup jen přes serverless funkce se service-role klíčem. RLS je zapnuté
-- BEZ anon/authenticated politik = default-deny pro prohlížeč (ochrana PII).

-- ── Sloty (dostupnost, kterou určuje Verca) ──────────────────────────────
create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  slot_at timestamptz not null unique,
  status text not null default 'open' check (status in ('open', 'blocked')),
  created_at timestamptz not null default now()
);

comment on table public.booking_slots is 'Termíny, které Verca nabízí. status open = lze rezervovat, blocked = ručně zavřeno.';

-- ── Rezervace (žádosti klientů) ──────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.booking_slots (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  confirm_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

comment on table public.bookings is 'Žádosti o termín vč. PII (jméno/e-mail/telefon). Čte/zapisuje jen serverless vrstva přes service-role.';

-- Proti dvojí rezervaci: na jeden slot max. jedna aktivní (pending/confirmed) rezervace.
-- Declined/cancelled slot automaticky uvolní.
create unique index if not exists bookings_active_slot_uniq
  on public.bookings (slot_id)
  where status in ('pending', 'confirmed');

create index if not exists bookings_confirm_token_idx on public.bookings (confirm_token);
create index if not exists bookings_slot_id_idx on public.bookings (slot_id);

alter table public.booking_slots enable row level security;
alter table public.bookings enable row level security;

-- ── Seed: červen 2026, čtvrtky 14:45 / 16:00 / 18:00 (Europe/Prague = +02) ──
-- Už obsazené (blocked): 4. 6. 14:45 a 11. 6. 18:00.
insert into public.booking_slots (slot_at, status) values
  ('2026-06-04 14:45:00+02', 'blocked'),
  ('2026-06-04 16:00:00+02', 'open'),
  ('2026-06-04 18:00:00+02', 'open'),
  ('2026-06-11 14:45:00+02', 'open'),
  ('2026-06-11 16:00:00+02', 'open'),
  ('2026-06-11 18:00:00+02', 'blocked'),
  ('2026-06-18 14:45:00+02', 'open'),
  ('2026-06-18 16:00:00+02', 'open'),
  ('2026-06-18 18:00:00+02', 'open'),
  ('2026-06-25 14:45:00+02', 'open'),
  ('2026-06-25 16:00:00+02', 'open'),
  ('2026-06-25 18:00:00+02', 'open')
on conflict (slot_at) do nothing;

-- ── Přidání dalších termínů později (vzor) ───────────────────────────────
-- insert into public.booking_slots (slot_at) values ('2026-07-02 16:00:00+02')
--   on conflict (slot_at) do nothing;
