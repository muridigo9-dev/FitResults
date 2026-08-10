-- =====================================================
-- ACCOUNT CANCELLATION REQUESTS
-- Sistema de cancelamento mediado pelo suporte
-- =====================================================

-- ============================================
-- 1. TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.account_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'rejected')),
  reason TEXT NOT NULL,
  details TEXT,
  admin_notes TEXT,
  stripe_subscription_id TEXT,
  stripe_cancellation_status TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ============================================
-- 2. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_user_id ON public.account_cancellation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON public.account_cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_created_at ON public.account_cancellation_requests(created_at DESC);

-- ============================================
-- 3. ENABLE RLS
-- ============================================
ALTER TABLE public.account_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES (idempotent)
-- ============================================
DROP POLICY IF EXISTS "Users can view own cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Users can view own cancellation requests"
  ON public.account_cancellation_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create cancellation request" ON public.account_cancellation_requests;
CREATE POLICY "Users can create cancellation request"
  ON public.account_cancellation_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Admins can view all cancellation requests"
  ON public.account_cancellation_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Admins can update cancellation requests"
  ON public.account_cancellation_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Admins can delete cancellation requests"
  ON public.account_cancellation_requests FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 5. TRIGGER (idempotent)
-- ============================================
DROP TRIGGER IF EXISTS update_cancellation_requests_updated_at ON public.account_cancellation_requests;
CREATE TRIGGER update_cancellation_requests_updated_at
  BEFORE UPDATE ON public.account_cancellation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ADD ACCOUNT STATUS TO PROFILES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN account_status TEXT DEFAULT 'active' 
      CHECK (account_status IN ('active', 'cancelled', 'suspended'));
    CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);
  END IF;
END $$;
