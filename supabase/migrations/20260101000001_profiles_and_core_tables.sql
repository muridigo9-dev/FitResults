-- =========================================================
-- PROFILES (BASE)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_email
  on public.profiles(email);

-- =========================================================
-- AUTO CREATE PROFILE ON SIGNUP
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- USER ROLES (SEM RLS AQUI)
-- =========================================================
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role app_role not null,
  created_at timestamptz default now(),
  constraint user_roles_user_id_role_key unique (user_id, role)
);

-- =========================================================
-- USER BODY PROFILE
-- =========================================================
create table if not exists public.user_body_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  gender text,
  age int,
  height decimal,
  current_weight decimal,
  goal_weight decimal,
  activity_level activity_level,
  fitness_goal fitness_goal,
  waist_circumference decimal,
  hip_circumference decimal,
  neck_circumference decimal,
  active_template_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
