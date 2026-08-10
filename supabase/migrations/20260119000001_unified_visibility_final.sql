-- ==============================================================================
-- MIGRATION: Unified Visibility System (Simplified & Idempotent)
-- ==============================================================================
-- Description: Adds 'visibility' and 'plan_ids' columns to content entities.
--              Updates RLS policies to use these columns for access control.
-- Entities: exercises, workouts, dishes, diet_plans, challenges
-- ==============================================================================

-- Helper function to safely add columns
CREATE OR REPLACE FUNCTION public.safe_add_column(
    t_name text, 
    c_name text, 
    c_type text, 
    c_default text DEFAULT NULL
) 
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = c_name) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', t_name, c_name, c_type);
        IF c_default IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT %s', t_name, c_name, c_default);
            -- Update existing rows explicitly if needed, but default usually handles new inserts
            EXECUTE format('UPDATE %I SET %I = %s WHERE %I IS NULL', t_name, c_name, c_default, c_name);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. ADD COLUMNS (Idempotent)
SELECT public.safe_add_column('exercises', 'visibility', 'text', '''global''');
SELECT public.safe_add_column('exercises', 'plan_ids', 'text[]', '''{}''');

SELECT public.safe_add_column('workouts', 'visibility', 'text', '''global''');
SELECT public.safe_add_column('workouts', 'plan_ids', 'text[]', '''{}''');

SELECT public.safe_add_column('dishes', 'visibility', 'text', '''global''');
SELECT public.safe_add_column('dishes', 'plan_ids', 'text[]', '''{}''');

SELECT public.safe_add_column('diet_plans', 'visibility', 'text', '''global''');
SELECT public.safe_add_column('diet_plans', 'plan_ids', 'text[]', '''{}''');

SELECT public.safe_add_column('challenges', 'visibility', 'text', '''global''');
SELECT public.safe_add_column('challenges', 'plan_ids', 'text[]', '''{}''');

-- Drop helper function
DROP FUNCTION public.safe_add_column;

-- 2. UNIFIED VISIBILITY CHECK FUNCTION
-- Replaces any complex join logic with simple array check
CREATE OR REPLACE FUNCTION public.can_view_content(
    _visibility text,
    _plan_ids text[],
    _user_id uuid,
    _owner_id uuid DEFAULT NULL,
    _academy_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plans text[];
    v_user_role text;
    v_is_admin boolean;
BEGIN
    -- 1. Admin bypass
    IF public.is_admin(_user_id) THEN
        RETURN true;
    END IF;

    -- 2. Global content
    IF _visibility = 'global' OR _visibility IS NULL THEN
        RETURN true;
    END IF;

    -- 3. Private content
    IF _visibility = 'private' THEN
        RETURN _owner_id = _user_id;
    END IF;

    -- 4. Academy content
    IF _visibility = 'academy' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.academy_members 
            WHERE user_id = _user_id 
            AND academy_id = _academy_id 
            AND status = 'active'
        );
    END IF;

    -- 5. Plan Restricted content
    IF _visibility = 'plan_restricted' THEN
        -- If no plans specified, it's visible to everyone (safe fallback)
        IF _plan_ids IS NULL OR array_length(_plan_ids, 1) IS NULL THEN
            RETURN true;
        END IF;

        -- Get user's active plans
        SELECT array_agg(plan_id::text) INTO v_user_plans
        FROM public.user_subscriptions
        WHERE user_id = _user_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now());

        -- Check overlap
        RETURN v_user_plans && _plan_ids;
    END IF;

    RETURN false;
END;
$$;

-- 3. UPDATE RLS POLICIES (Idempotent)

-- Exercises
DROP POLICY IF EXISTS "Exercises Visibility Policy" ON public.exercises;
CREATE POLICY "Exercises Visibility Policy" ON public.exercises
FOR SELECT TO authenticated
USING (
    public.can_view_content(visibility, plan_ids, auth.uid(), created_by_id, academy_id)
);

-- Workouts
DROP POLICY IF EXISTS "Workouts Visibility Policy" ON public.workouts;
CREATE POLICY "Workouts Visibility Policy" ON public.workouts
FOR SELECT TO authenticated
USING (
    public.can_view_content(visibility, plan_ids, auth.uid(), created_by, academy_id)
);

-- Dishes
DROP POLICY IF EXISTS "Dishes Visibility Policy" ON public.dishes;
CREATE POLICY "Dishes Visibility Policy" ON public.dishes
FOR SELECT TO authenticated
USING (
    public.can_view_content(visibility, plan_ids, auth.uid(), owner_id, academy_id)
);

-- Diet Plans
DROP POLICY IF EXISTS "Diet Plans Visibility Policy" ON public.diet_plans;
CREATE POLICY "Diet Plans Visibility Policy" ON public.diet_plans
FOR SELECT TO authenticated
USING (
    public.can_view_content(visibility, plan_ids, auth.uid(), created_by, academy_id)
);

-- Challenges
DROP POLICY IF EXISTS "Challenges Visibility Policy" ON public.challenges;
CREATE POLICY "Challenges Visibility Policy" ON public.challenges
FOR SELECT TO authenticated
USING (
    public.can_view_content(visibility, plan_ids, auth.uid(), created_by, academy_id)
);

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_exercises_visibility ON public.exercises(visibility);
CREATE INDEX IF NOT EXISTS idx_workouts_visibility ON public.workouts(visibility);
CREATE INDEX IF NOT EXISTS idx_dishes_visibility ON public.dishes(visibility);
CREATE INDEX IF NOT EXISTS idx_diet_plans_visibility ON public.diet_plans(visibility);
CREATE INDEX IF NOT EXISTS idx_challenges_visibility ON public.challenges(visibility);
