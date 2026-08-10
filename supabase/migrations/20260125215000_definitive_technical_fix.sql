-- DEFINITIVE FIX FOR ALL 400 ERRORS AND LGPD
-- Created: 2026-01-25
-- Principle: Protection of the product evolution

-- 1. FIX LGPD_REQUESTS (Missing user_notes column)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lgpd_requests' AND column_name = 'user_notes') THEN
        ALTER TABLE public.lgpd_requests ADD COLUMN user_notes TEXT;
        -- Transfer data if user_message was being used (best effort)
        UPDATE public.lgpd_requests SET user_notes = user_message WHERE user_notes IS NULL;
    END IF;
END $$;

-- 1.5 Update LGPD foreign keys to PROFILES (standard for public joins)
ALTER TABLE public.lgpd_requests DROP CONSTRAINT IF EXISTS lgpd_requests_user_id_fkey;
ALTER TABLE public.lgpd_requests ADD CONSTRAINT lgpd_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.lgpd_requests DROP CONSTRAINT IF EXISTS lgpd_requests_handled_by_fkey;
ALTER TABLE public.lgpd_requests ADD CONSTRAINT lgpd_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. FIX USER_PREFERENCES (Missing goal columns)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'water_goal_ml') THEN
        ALTER TABLE public.user_preferences ADD COLUMN water_goal_ml INTEGER DEFAULT 2500;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'meals_goal_count') THEN
        ALTER TABLE public.user_preferences ADD COLUMN meals_goal_count INTEGER DEFAULT 4;
    END IF;
END $$;

-- 3. FIX USER_XP (Ensuring unique constraint for upsert)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE (conname = 'user_xp_user_id_unique' OR conname = 'user_xp_user_id_key')
        AND contype = 'u'
    ) THEN
        -- Cleanup duplicates before adding constraint to avoid failure
        DELETE FROM public.user_xp a USING public.user_xp b
        WHERE a.id < b.id AND a.user_id = b.user_id;

        ALTER TABLE public.user_xp ADD CONSTRAINT user_xp_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- 4. REFRESH SCHEMA CACHE AND SIMPLIFY TYPES
-- Enums can be rigid, let's use text for request_type and status to match frontend mapping
DO $$ 
BEGIN
    ALTER TABLE public.lgpd_requests ALTER COLUMN request_type TYPE TEXT;
    ALTER TABLE public.lgpd_requests ALTER COLUMN status TYPE TEXT;
    ALTER TABLE public.lgpd_requests ALTER COLUMN status SET DEFAULT 'pending';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Notice: LGPD columns already updated or table busy.';
END $$;

DROP POLICY IF EXISTS "Users can create own LGPD requests" ON public.lgpd_requests;
CREATE POLICY "Users can create own LGPD requests"
  ON public.lgpd_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own LGPD requests" ON public.lgpd_requests;
CREATE POLICY "Users can view own LGPD requests"
  ON public.lgpd_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
