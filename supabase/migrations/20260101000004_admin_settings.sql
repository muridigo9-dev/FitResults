-- =====================================================
-- ADMIN SETTINGS
-- Arquivo: 20260101000004_admin_settings.sql
-- Objetivo:
-- - Garantir função has_role
-- - Garantir RLS em user_roles (sem duplicar policies)
-- - Bootstrap do admin (se existir)
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO has_role (GARANTIA)
-- =====================================================
create or replace function public.has_role(
  _user_id uuid,
  _role app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- =====================================================
-- 2. GARANTIR RLS ATIVO (SEM RECRIAR POLICIES)
-- =====================================================
alter table public.user_roles enable row level security;

-- =====================================================
-- BOOTSTRAP ADMIN ROLE (IDEMPOTENTE)
-- =====================================================

insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'admin@admin.com'
on conflict do nothing;

