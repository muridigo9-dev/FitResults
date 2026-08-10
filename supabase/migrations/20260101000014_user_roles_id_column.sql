-- ============================================
-- USER ROLES ID COLUMN
-- ============================================

-- Add id column to user_roles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN id UUID DEFAULT gen_random_uuid();
  END IF;
END $$;
