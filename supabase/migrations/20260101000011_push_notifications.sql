-- =====================================================
-- PUSH NOTIFICATIONS
-- =====================================================

-- Garantir função shared (obrigatório)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
    WHERE proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$;
  END IF;
END;
$$;

-- Garantir flag de feature (não recria tabela)
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'push_notifications_enabled',
  'true',
  'Feature flag: habilitar push notifications'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Push Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User manage own push subscriptions"
  ON public.push_subscriptions;

CREATE POLICY "User manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at (safe)
DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at
  ON public.push_subscriptions;

CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
