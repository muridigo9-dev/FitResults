-- =========================================================
-- DOMAIN TABLES
-- =========================================================

-- ===================== DIETS =====================
create table if not exists public.diets (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  image_url text,
  category text,
  calories int,
  protein decimal,
  carbs decimal,
  fat decimal,
  is_active boolean default true,
  content_origin content_origin default 'system',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.diet_ingredients (
  id uuid primary key default uuid_generate_v4(),
  diet_id uuid references public.diets(id) on delete cascade,
  name text,
  quantity text,
  unit text,
  display_order int
);

create table if not exists public.diet_preparation_steps (
  id uuid primary key default uuid_generate_v4(),
  diet_id uuid references public.diets(id) on delete cascade,
  step_order int,
  description text
);

create table if not exists public.user_diets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  description text,
  image_url text,
  category text,
  calories int,
  protein decimal,
  carbs decimal,
  fat decimal,
  is_active boolean default true,
  ingredients jsonb,
  preparation jsonb,
  created_at timestamptz default now()
);

-- ===================== WORKOUTS =====================
create table if not exists public.workouts (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  image_url text,
  category text,
  is_active boolean default true,
  content_origin content_origin default 'system',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid references public.workouts(id) on delete cascade,
  name text,
  description text,
  sets int,
  reps int,
  rest_seconds int,
  exercise_order int
);

create table if not exists public.user_workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  description text,
  image_url text,
  category text,
  is_active boolean default true,
  exercises jsonb,
  created_at timestamptz default now()
);

-- ===================== CHALLENGES =====================
create table if not exists public.challenges (
  id uuid primary key default uuid_generate_v4(),
  name text,
  description text,
  total_days int,
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.challenge_days (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  day_number int
);

create table if not exists public.challenge_tasks (
  id uuid primary key default uuid_generate_v4(),
  challenge_day_id uuid references public.challenge_days(id) on delete cascade,
  title text,
  instruction text,
  task_type challenge_task_type,
  target decimal,
  unit text,
  task_order int
);

create table if not exists public.user_challenge_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete cascade,
  started_at timestamptz,
  current_day int,
  status text,
  completed_at timestamptz
);

-- ===================== HABITS =====================
create table if not exists public.habits (
  id uuid primary key default uuid_generate_v4(),
  name text,
  icon text,
  color text,
  unit text,
  default_goal decimal,
  is_active boolean default true,
  display_order int,
  created_at timestamptz default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  date date,
  value decimal,
  goal decimal,
  created_at timestamptz default now(),
  unique (user_id, habit_id, date)
);

-- ===================== CHECKIN & DIARY =====================
create table if not exists public.daily_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  date date,
  status checkin_status,
  water_current int,
  water_goal int,
  mood mood_type,
  weight decimal,
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists public.checkin_meals (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid references public.daily_checkins(id) on delete cascade,
  diet_id uuid,
  diet_source content_origin,
  meal_type text,
  completed boolean
);

create table if not exists public.checkin_workouts (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid references public.daily_checkins(id) on delete cascade,
  workout_id uuid,
  workout_source content_origin,
  completed boolean,
  duration_minutes int
);

create table if not exists public.checkin_challenge_tasks (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid references public.daily_checkins(id) on delete cascade,
  challenge_id uuid references public.challenges(id),
  task_id uuid references public.challenge_tasks(id),
  day_number int,
  completed boolean,
  value decimal
);

create table if not exists public.diary_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  date date,
  entry_type text,
  source text,
  reference_id uuid,
  title text,
  category text,
  calories int,
  protein decimal,
  carbs decimal,
  fat decimal,
  duration_minutes int,
  created_at timestamptz default now()
);

create table if not exists public.weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  date date,
  weight decimal,
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- ===================== GAMIFICATION =====================
create table if not exists public.levels (
  id uuid primary key default uuid_generate_v4(),
  level_number int,
  name text,
  min_xp int,
  max_xp int,
  color text
);

create table if not exists public.achievements (
  id uuid primary key default uuid_generate_v4(),
  name text,
  description text,
  icon text,
  color text,
  requirement text,
  requirement_type text,
  requirement_value int,
  xp_reward int,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id uuid references public.achievements(id),
  earned_at timestamptz default now()
);

create table if not exists public.user_xp (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  total_xp int default 0,
  current_level_id uuid references public.levels(id),
  current_streak int default 0,
  longest_streak int default 0,
  last_checkin_date date,
  updated_at timestamptz default now()
);

create table if not exists public.xp_settings (
  id uuid primary key default uuid_generate_v4(),
  checkin_complete_xp int,
  habit_complete_xp int,
  daily_bonus_xp int,
  streak_bonus_xp int,
  updated_at timestamptz default now()
);

-- ===================== SETTINGS =====================
create table if not exists public.macro_templates (
  id uuid primary key default uuid_generate_v4(),
  name text,
  description text,
  formula text,
  objective text,
  protein_percentage int,
  carbs_percentage int,
  fat_percentage int,
  calorie_adjustment int,
  activity_multipliers jsonb,
  is_active boolean default true,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.brand_settings (
  id uuid primary key default uuid_generate_v4(),
  app_name text,
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  tertiary_color text,
  quaternary_color text,
  accent_color text,
  text_primary text,
  text_secondary text,
  text_muted text,
  font_family text,
  font_base_size int,
  updated_at timestamptz default now()
);

-- ===================== INDEXES =====================
create index if not exists idx_daily_checkins_user_date on public.daily_checkins(user_id, date);
create index if not exists idx_diary_entries_user_date on public.diary_entries(user_id, date);
create index if not exists idx_habit_logs_user_date on public.habit_logs(user_id, date);


