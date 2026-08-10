-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================
create type app_role as enum ('admin', 'user');

create type fitness_goal as enum ('lose_weight', 'maintain', 'gain_muscle');
create type activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');

create type checkin_status as enum ('not_started', 'partial', 'complete');
create type mood_type as enum ('great', 'good', 'okay', 'bad');

create type content_origin as enum ('system', 'admin', 'user');

create type challenge_task_type as enum ('water', 'workout', 'meal', 'habit');

-- =========================================================
-- 1. AUTH & PROFILE
-- =========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  role app_role not null,
  created_at timestamptz default now()
);

create table user_body_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references profiles(id) on delete cascade,
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

-- =========================================================
-- 2. DIETS
-- =========================================================
create table diets (
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
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table diet_ingredients (
  id uuid primary key default uuid_generate_v4(),
  diet_id uuid references diets(id) on delete cascade,
  name text,
  quantity text,
  unit text,
  display_order int
);

create table diet_preparation_steps (
  id uuid primary key default uuid_generate_v4(),
  diet_id uuid references diets(id) on delete cascade,
  step_order int,
  description text
);

create table user_diets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
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

-- =========================================================
-- 3. WORKOUTS
-- =========================================================
create table workouts (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  image_url text,
  category text,
  is_active boolean default true,
  content_origin content_origin default 'system',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid references workouts(id) on delete cascade,
  name text,
  description text,
  sets int,
  reps int,
  rest_seconds int,
  exercise_order int
);

create table user_workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  description text,
  image_url text,
  category text,
  is_active boolean default true,
  exercises jsonb,
  created_at timestamptz default now()
);

-- =========================================================
-- 4. CHALLENGES
-- =========================================================
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  name text,
  description text,
  total_days int,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table challenge_days (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid references challenges(id) on delete cascade,
  day_number int
);

create table challenge_tasks (
  id uuid primary key default uuid_generate_v4(),
  challenge_day_id uuid references challenge_days(id) on delete cascade,
  title text,
  instruction text,
  task_type challenge_task_type,
  target decimal,
  unit text,
  task_order int
);

create table user_challenge_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  started_at timestamptz,
  current_day int,
  status text,
  completed_at timestamptz
);

-- =========================================================
-- 5. CHECK-IN & DIARY
-- =========================================================
create table daily_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
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

create table checkin_meals (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid references daily_checkins(id) on delete cascade,
  diet_id uuid,
  diet_source content_origin,
  meal_type text,
  completed boolean
);

create table checkin_workouts (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid references daily_checkins(id) on delete cascade,
  workout_id uuid,
  workout_source content_origin,
  completed boolean,
  duration_minutes int
);

create table checkin_challenge_tasks (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid references daily_checkins(id) on delete cascade,
  challenge_id uuid references challenges(id),
  task_id uuid references challenge_tasks(id),
  day_number int,
  completed boolean,
  value decimal
);

create table diary_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
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

create table weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  weight decimal,
  created_at timestamptz default now(),
  unique (user_id, date)
);

-- =========================================================
-- 6. HABITS
-- =========================================================
create table habits (
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

create table habit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  habit_id uuid references habits(id) on delete cascade,
  date date,
  value decimal,
  goal decimal,
  created_at timestamptz default now(),
  unique (user_id, habit_id, date)
);

-- =========================================================
-- 7. GAMIFICATION
-- =========================================================
create table levels (
  id uuid primary key default uuid_generate_v4(),
  level_number int,
  name text,
  min_xp int,
  max_xp int,
  color text
);

create table achievements (
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

create table user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  achievement_id uuid references achievements(id),
  earned_at timestamptz default now()
);

create table user_xp (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  total_xp int default 0,
  current_level_id uuid references levels(id),
  current_streak int default 0,
  longest_streak int default 0,
  last_checkin_date date,
  updated_at timestamptz default now()
);

create table xp_settings (
  id uuid primary key default uuid_generate_v4(),
  checkin_complete_xp int,
  habit_complete_xp int,
  daily_bonus_xp int,
  streak_bonus_xp int,
  updated_at timestamptz default now()
);

-- =========================================================
-- 8. SETTINGS
-- =========================================================
create table macro_templates (
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

create table app_settings (
  id uuid primary key default uuid_generate_v4(),
  allow_user_diet_creation boolean default false,
  allow_user_workout_creation boolean default false,
  default_water_goal int,
  updated_at timestamptz default now()
);

create table brand_settings (
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

-- =========================================================
-- INDEXES ESSENCIAIS
-- =========================================================
create index idx_profiles_email on profiles(email);
create index idx_daily_checkins_user_date on daily_checkins(user_id, date);
create index idx_diary_entries_user_date on diary_entries(user_id, date);
create index idx_habit_logs_user_date on habit_logs(user_id, date);
