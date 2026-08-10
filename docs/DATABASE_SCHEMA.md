# FlexiBloom Database Schema Documentation

This document maintains a reference of the database schema to ensure consistency and avoid migration errors (e.g., referencing non-existent tables).

**LAST UPDATED:** 2026-01-17
**STATUS:** MANUAL UPDATE REQUIRED ON EVERY MIGRATION.

---

## 1. Core & Authentication

### `profiles`
Extends Supabase `auth.users`.
- `id` (UUID, PK, FK -> auth.users)
- `email` (TEXT)
- `full_name` (TEXT)
- `avatar_url` (TEXT)
- `primary_academy_id` (UUID, FK -> academies)

### `user_roles`
Defines system-level roles (Not to be confused with academy-level roles).
*Note: OLD `roles` table DOES NOT EXIST. Use Enum `app_role`.*
- `user_id` (UUID, FK -> profiles)
- `role` (ENUM `app_role`: 'admin', 'user', 'nutritionist', 'student', etc.)
- CONSTRAINT: Unique(user_id, role)

### `feature_flags`
System-wide feature toggles.
- `key` (TEXT, PK)
- `enabled` (BOOLEAN)
- `allow_user_content` (BOOLEAN)

---

## 2. Multi-Tenant (Academies)

### `academies`
Groups users and content.
- `id` (UUID, PK)
- `name`, `slug` (TEXT)
- `plan_type` (TEXT)
- `status` (active/suspended)

### `academy_members`
Links users to academies.
- `academy_id` (UUID, FK)
- `user_id` (UUID, FK)
- `role` (TEXT: 'owner', 'admin', 'trainer', 'nutritionist', 'student')
- `status` (active/inactive)

### `professional_academy_links`
Allow pros to work in multiple academies.

### `invites`
Pending invitations.

---

## 3. Nutrition (Food & Diets)

### `ingredients`
Base food items.
- `id` (UUID, PK)
- `name` (TEXT)
- `nutrition` (JSONB)
- `is_active` (BOOLEAN)

### `dishes`
Composed meals/recipes.
- `id` (UUID, PK)
- `name` (TEXT)
- `visibility_type` (ENUM: 'global', 'academy', 'private')
- `owner_id` (UUID, FK -> auth.users)
- `academy_id` (UUID, FK -> academies)

### `dish_ingredients`
Link table.
- `dish_id`, `ingredient_id`

### `diet_plans`
Hierarchical Meal Plans.
- `id` (UUID, PK)
- `title` (TEXT)
- `visibility_type` (ENUM)

### `diet_plan_days`
- `diet_plan_id` (FK)
- `name` (e.g., "Monday", "Training Day")

### `diet_plan_meals`
- `diet_plan_day_id` (FK)
- `name` (e.g., "Breakfast")
- `time_suggestion` (TIME)

### `diet_plan_items`
- `diet_plan_meal_id` (FK)
- `dish_id` (FK)
- `portion_scale` (NUMERIC)
- `is_optional` (BOOLEAN)
- `parent_item_id` (FK - for substitutions)

### `diet_plan_assignments`
Flexible assignment logic.
- `diet_plan_id` (FK)
- `user_id` (FK, nullable)
- `target_plan_id` (FK, nullable)
- `target_academy_id` (FK, nullable)
- `priority` (INT)

---

## 4. Fitness (Workouts)

### `exercises`
- `id` (UUID, PK)
- `name` (TEXT)
- `video_url` (TEXT)

### `workouts`
- `id` (UUID, PK)
- `title` (TEXT)
- `visibility` (ENUM)

### `workout_exercises`
- `workout_id` (FK)
- `exercise_id` (FK)
- `sets`, `reps`, `rest_time`

### `workout_execution_sessions`
Tracking history.
- `user_id`, `workout_id`
- `started_at`, `completed_at`

---

## 5. Gamification (Habits & XP)

### `habits`
- `id` (UUID, PK)
- `name` (TEXT)
- `scope` (ENUM: 'global', 'academy', 'personal')
- `frequency_config` (JSONB)
- `xp_reward` (INT)

### `habit_assignments` (Planned/New)
- `habit_id` (FK)
- `target_type` (ENUM)

### `habit_logs` (Planned/New)
- `user_id`, `habit_id`, `date`

### `leaderboard`
- `user_id`
- `total_xp`

---

## Maintenance Rules
1. **Check this file** before writing SQL migrations to verify table names and relationships.
2. **Update this file** immediately after creating a new migration.
3. **Do not assume** tables exist (like `roles`) without checking here.
