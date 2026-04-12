-- VERCA — Supabase: veřejný profil navázaný na auth.users (spusťte v SQL Editoru).
-- Když „execute function“ selže, zkuste místo něj: for each row execute procedure public.verca_handle_new_user();
-- Po aplikaci: OAuth uživatelé dostanou řádek v public.profiles (trigger).
-- RLS: uživatel vidí a může upravit jen vlastní řádek.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'E-shop / účet — bez zdravotních údajů. Sloupec email je kopie pro snadné čtení; zdroj pravdy zůstává auth.users.';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.verca_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_verca on auth.users;

create trigger on_auth_user_created_verca
  after insert on auth.users
  for each row execute function public.verca_handle_new_user();
