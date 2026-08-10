-- Fix relationship between lgpd_audit_logs and profiles
-- This ensures the frontend can join correctly and resolves the PGRST200 error

DO $$
BEGIN
    -- 1. Ensure the actor_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lgpd_audit_logs' AND column_name = 'actor_id'
    ) THEN
        -- This should have been created in 20260113000001_lgpd_system_base.sql
        -- If it's missing, we add it safely
        ALTER TABLE public.lgpd_audit_logs ADD COLUMN actor_id UUID REFERENCES auth.users(id);
    END IF;

    -- 2. Add the foreign key constraint that frontend expects for audit logs
    ALTER TABLE public.lgpd_audit_logs DROP CONSTRAINT IF EXISTS lgpd_audit_logs_performed_by_fkey;
    
    ALTER TABLE public.lgpd_audit_logs
    ADD CONSTRAINT lgpd_audit_logs_performed_by_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;

    -- 3. Ensure user_roles relationship is also named as expected by frontend
    -- This fixes the 400 Bad Request when searching for admin notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
        
        ALTER TABLE public.user_roles
        ADD CONSTRAINT user_roles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;

    -- 4. Standardize timestamps if needed (Defensive)
    -- If some systems expect 'timestamp' instead of 'created_at'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lgpd_audit_logs' AND column_name = 'timestamp') THEN
        ALTER TABLE public.lgpd_audit_logs ADD COLUMN timestamp TIMESTAMPTZ DEFAULT now();
        -- Sync existing data
        UPDATE public.lgpd_audit_logs SET timestamp = created_at WHERE timestamp IS NULL;
    END IF;

END $$;

-- 4. Enable RLS and verify policies
ALTER TABLE public.lgpd_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.lgpd_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.lgpd_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 5. Comments
COMMENT ON CONSTRAINT lgpd_audit_logs_performed_by_fkey ON public.lgpd_audit_logs IS 'Relationship for audit log performer (linked to profiles)';
