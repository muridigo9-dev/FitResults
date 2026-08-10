-- =====================================================
-- STRIPE SETTINGS
-- Arquivo idempotente e seguro
-- =====================================================

-- TABLE
create table if not exists public.stripe_settings (
  id uuid primary key default gen_random_uuid(),
  stripe_mode text not null default 'test'
    check (stripe_mode in ('test','live')),
  is_connected boolean not null default false,
  trial_days int not null default 7,
  trial_enabled boolean not null default true,
  trial_message text default '7 dias grátis',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.stripe_settings enable row level security;

-- DROP POLICY (IDEMPOTENTE)
drop policy if exists "Admins manage stripe settings"
  on public.stripe_settings;

-- CREATE POLICY
create policy "Admins manage stripe settings"
on public.stripe_settings
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
)
with check (
  public.has_role(auth.uid(), 'admin')
);

-- DEFAULT ROW (SAFE)
insert into public.stripe_settings (stripe_mode)
select 'test'
where not exists (
  select 1 from public.stripe_settings
);
