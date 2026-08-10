-- EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ENUMS
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'fitness_goal') then
    create type fitness_goal as enum ('lose_weight', 'maintain', 'gain_muscle');
  end if;

  if not exists (select 1 from pg_type where typname = 'activity_level') then
    create type activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
  end if;

  if not exists (select 1 from pg_type where typname = 'checkin_status') then
    create type checkin_status as enum ('not_started', 'partial', 'complete');
  end if;

  if not exists (select 1 from pg_type where typname = 'mood_type') then
    create type mood_type as enum ('great', 'good', 'okay', 'bad');
  end if;

  if not exists (select 1 from pg_type where typname = 'content_origin') then
    create type content_origin as enum ('system', 'admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'challenge_task_type') then
    create type challenge_task_type as enum ('water', 'workout', 'meal', 'habit');
  end if;
end $$;

-- =====================================================
-- GLOBAL UTIL FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
