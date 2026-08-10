-- =====================================================
-- RLS BASE GLOBAL
-- Arquivo: 20260101000003_rls_base.sql
-- Objetivo:
-- - Centralizar RLS
-- - Garantir segurança por usuário
-- - Garantir bypass de admin
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO has_role (BASE DO SISTEMA DE PERMISSÕES)
-- =====================================================
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
as $$ select exists (
  select 1 from public.user_roles
  where user_id = _user_id and role = _role
); $$;

-- =====================================================
-- 2. FUNÇÃO is_admin (ATALHO)
-- =====================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$ select public.has_role(auth.uid(), 'admin'); $$;

-- =====================================================
-- 3. FUNÇÃO is_owner (PADRÃO PARA TABELAS COM user_id)
-- =====================================================
create or replace function public.is_owner(_user_id uuid)
returns boolean
language sql
stable
security definer
as $$ select auth.uid() = _user_id; $$;

-- =====================================================
-- 4. PROFILES
-- =====================================================
alter table public.profiles enable row level security;

drop policy if exists "Profiles read own or admin" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;

create policy "Profiles read own or admin"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_admin()
);

create policy "Profiles update own"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

-- =====================================================
-- 5. USER ROLES (ADMIN ONLY)
-- =====================================================
alter table public.user_roles enable row level security;

drop policy if exists "User can read own roles" on public.user_roles;
drop policy if exists "Admin manages roles" on public.user_roles;

create policy "User can read own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy "Admin manages roles"
on public.user_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =====================================================
-- 6. PADRÃO RLS PARA TABELAS COM user_id
-- =====================================================
-- Regra:
-- - Usuário vê / edita apenas seus dados
-- - Admin vê tudo

-- USER BODY PROFILES
alter table public.user_body_profiles enable row level security;

drop policy if exists "User owns body profile or admin" on public.user_body_profiles;

create policy "User owns body profile or admin"
on public.user_body_profiles
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- USER DIETS
alter table public.user_diets enable row level security;

drop policy if exists "User owns diets or admin" on public.user_diets;

create policy "User owns diets or admin"
on public.user_diets
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- USER WORKOUTS
alter table public.user_workouts enable row level security;

drop policy if exists "User owns workouts or admin" on public.user_workouts;

create policy "User owns workouts or admin"
on public.user_workouts
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- DAILY CHECKINS
alter table public.daily_checkins enable row level security;

drop policy if exists "User owns checkins or admin" on public.daily_checkins;

create policy "User owns checkins or admin"
on public.daily_checkins
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- DIARY ENTRIES
alter table public.diary_entries enable row level security;

drop policy if exists "User owns diary entries or admin" on public.diary_entries;

create policy "User owns diary entries or admin"
on public.diary_entries
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- HABIT LOGS
alter table public.habit_logs enable row level security;

drop policy if exists "User owns habit logs or admin" on public.habit_logs;

create policy "User owns habit logs or admin"
on public.habit_logs
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- USER CHALLENGE PROGRESS
alter table public.user_challenge_progress enable row level security;

drop policy if exists "User owns challenge progress or admin" on public.user_challenge_progress;

create policy "User owns challenge progress or admin"
on public.user_challenge_progress
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- USER ACHIEVEMENTS
alter table public.user_achievements enable row level security;

drop policy if exists "User owns achievements or admin" on public.user_achievements;

create policy "User owns achievements or admin"
on public.user_achievements
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- USER XP
alter table public.user_xp enable row level security;

drop policy if exists "User owns xp or admin" on public.user_xp;

create policy "User owns xp or admin"
on public.user_xp
for all
to authenticated
using (
  public.is_owner(user_id)
  or public.is_admin()
)
with check (
  public.is_owner(user_id)
  or public.is_admin()
);

-- =====================================================
-- 7. TABELAS DE CONTEÚDO GLOBAL
-- =====================================================
-- Leituras públicas (authenticated)
-- Escrita somente admin

-- DIETS
alter table public.diets enable row level security;

drop policy if exists "Read active diets" on public.diets;
drop policy if exists "Admin manages diets" on public.diets;

create policy "Read active diets"
on public.diets
for select
to authenticated
using (is_active = true);

create policy "Admin manages diets"
on public.diets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- WORKOUTS
alter table public.workouts enable row level security;

drop policy if exists "Read active workouts" on public.workouts;
drop policy if exists "Admin manages workouts" on public.workouts;

create policy "Read active workouts"
on public.workouts
for select
to authenticated
using (is_active = true);

create policy "Admin manages workouts"
on public.workouts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CHALLENGES
alter table public.challenges enable row level security;

drop policy if exists "Read active challenges" on public.challenges;
drop policy if exists "Admin manages challenges" on public.challenges;

create policy "Read active challenges"
on public.challenges
for select
to authenticated
using (is_active = true);

create policy "Admin manages challenges"
on public.challenges
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =====================================================
-- 8. SETTINGS (RLS será configurado nas migrações que criam as tabelas)
-- As tabelas app_settings, brand_settings, macro_templates, xp_settings
-- são criadas em migrações posteriores (000004, 000010, etc.)
-- =====================================================

-- =====================================================
-- RLS PARA TABELAS SEM user_id (READ / ADMIN WRITE)
-- =====================================================

-- DIET INGREDIENTS
alter table public.diet_ingredients enable row level security;
drop policy if exists "Read diet ingredients" on public.diet_ingredients;
drop policy if exists "Admin manages diet ingredients" on public.diet_ingredients;
create policy "Read diet ingredients"
on public.diet_ingredients for select to authenticated using (true);
create policy "Admin manages diet ingredients"
on public.diet_ingredients for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- DIET PREPARATION STEPS
alter table public.diet_preparation_steps enable row level security;
drop policy if exists "Read diet steps" on public.diet_preparation_steps;
drop policy if exists "Admin manages diet steps" on public.diet_preparation_steps;
create policy "Read diet steps"
on public.diet_preparation_steps for select to authenticated using (true);
create policy "Admin manages diet steps"
on public.diet_preparation_steps for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- WORKOUT EXERCISES
alter table public.workout_exercises enable row level security;
drop policy if exists "Read workout exercises" on public.workout_exercises;
drop policy if exists "Admin manages workout exercises" on public.workout_exercises;
create policy "Read workout exercises"
on public.workout_exercises for select to authenticated using (true);
create policy "Admin manages workout exercises"
on public.workout_exercises for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- CHALLENGE DAYS
alter table public.challenge_days enable row level security;
drop policy if exists "Read challenge days" on public.challenge_days;
drop policy if exists "Admin manages challenge days" on public.challenge_days;
create policy "Read challenge days"
on public.challenge_days for select to authenticated using (true);
create policy "Admin manages challenge days"
on public.challenge_days for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- CHALLENGE TASKS
alter table public.challenge_tasks enable row level security;
drop policy if exists "Read challenge tasks" on public.challenge_tasks;
drop policy if exists "Admin manages challenge tasks" on public.challenge_tasks;
create policy "Read challenge tasks"
on public.challenge_tasks for select to authenticated using (true);
create policy "Admin manages challenge tasks"
on public.challenge_tasks for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- HABITS
alter table public.habits enable row level security;
drop policy if exists "Read habits" on public.habits;
drop policy if exists "Admin manages habits" on public.habits;
create policy "Read habits"
on public.habits for select to authenticated using (true);
create policy "Admin manages habits"
on public.habits for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- LEVELS
alter table public.levels enable row level security;
drop policy if exists "Read levels" on public.levels;
drop policy if exists "Admin manages levels" on public.levels;
create policy "Read levels"
on public.levels for select to authenticated using (true);
create policy "Admin manages levels"
on public.levels for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ACHIEVEMENTS
alter table public.achievements enable row level security;
drop policy if exists "Read achievements" on public.achievements;
drop policy if exists "Admin manages achievements" on public.achievements;
create policy "Read achievements"
on public.achievements for select to authenticated using (true);
create policy "Admin manages achievements"
on public.achievements for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- =====================================================
-- FIM DO RLS BASE
-- =====================================================
