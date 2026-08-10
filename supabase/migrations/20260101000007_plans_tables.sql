-- =====================================================
-- PLANS & PRICING
-- Para integracao com Stripe
-- =====================================================

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  features jsonb default '[]',
  is_active boolean default true,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans(id) on delete cascade not null,
  price_id text not null,
  interval text not null check (interval in ('month', 'year', 'promo')),
  label text not null,
  display_price decimal,
  display_currency text default 'BRL',
  promo_text text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.plans enable row level security;
alter table public.plan_prices enable row level security;

-- Policies
create policy "Read active plans"
on public.plans for select to authenticated
using (is_active = true or public.is_admin());

create policy "Admin manages plans"
on public.plans for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Read active prices"
on public.plan_prices for select to authenticated
using (is_active = true or public.is_admin());

create policy "Admin manages prices"
on public.plan_prices for all to authenticated
using (public.is_admin()) with check (public.is_admin());
