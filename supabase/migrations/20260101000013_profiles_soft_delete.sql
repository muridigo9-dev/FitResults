-- ============================================
-- PROFILES SOFT DELETE
-- ============================================

-- Add soft delete column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for filtering non-deleted profiles
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at)
  WHERE deleted_at IS NULL;
