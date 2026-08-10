-- =====================================================
-- RLS ADICIONAL PARA TABELAS FALTANTES
-- =====================================================

-- WEIGHT LOGS
alter table public.weight_logs enable row level security;

drop policy if exists "User owns weight logs or admin" on public.weight_logs;

create policy "User owns weight logs or admin"
on public.weight_logs for all to authenticated
using (public.is_owner(user_id) or public.is_admin())
with check (public.is_owner(user_id) or public.is_admin());

-- CHECKIN MEALS
alter table public.checkin_meals enable row level security;

drop policy if exists "Read checkin meals" on public.checkin_meals;
drop policy if exists "Admin manages checkin meals" on public.checkin_meals;

create policy "Read checkin meals"
on public.checkin_meals for select to authenticated using (true);

create policy "Admin manages checkin meals"
on public.checkin_meals for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- CHECKIN WORKOUTS
alter table public.checkin_workouts enable row level security;

drop policy if exists "Read checkin workouts" on public.checkin_workouts;
drop policy if exists "Admin manages checkin workouts" on public.checkin_workouts;

create policy "Read checkin workouts"
on public.checkin_workouts for select to authenticated using (true);

create policy "Admin manages checkin workouts"
on public.checkin_workouts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- CHECKIN CHALLENGE TASKS
alter table public.checkin_challenge_tasks enable row level security;

drop policy if exists "Read checkin challenge tasks" on public.checkin_challenge_tasks;
drop policy if exists "Admin manages checkin challenge tasks" on public.checkin_challenge_tasks;

create policy "Read checkin challenge tasks"
on public.checkin_challenge_tasks for select to authenticated using (true);

create policy "Admin manages checkin challenge tasks"
on public.checkin_challenge_tasks for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- =====================================================
-- NOTA: RLS para settings (app_settings, brand_settings, 
-- macro_templates, xp_settings) é configurado nas 
-- migrações que criam essas tabelas (000004, 000010, etc.)
-- =====================================================
