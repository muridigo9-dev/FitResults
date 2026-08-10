-- Rename public_key to publishable_key for consistency with Stripe naming and AdminMetrics expectations
-- Ensure all Stripe columns are consistent
DO $$ 
BEGIN
  -- Rename public_key if it exists and publishable_key doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'public_key') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'publishable_key') THEN
    ALTER TABLE public.stripe_settings RENAME COLUMN public_key TO publishable_key;
  END IF;

  -- Create publishable_key if neither exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'publishable_key') THEN
    ALTER TABLE public.stripe_settings ADD COLUMN publishable_key text;
  END IF;

  -- Ensure existing columns from previous migrations are consistent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'secret_key') THEN
    ALTER TABLE public.stripe_settings ADD COLUMN secret_key text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'webhook_secret') THEN
    ALTER TABLE public.stripe_settings ADD COLUMN webhook_secret text;
  END IF;
END $$;

-- Drop old encrypted columns to avoid confusion as we are using the new ones
ALTER TABLE public.stripe_settings DROP COLUMN IF EXISTS stripe_secret_key_encrypted;
ALTER TABLE public.stripe_settings DROP COLUMN IF EXISTS stripe_webhook_secret_encrypted;

-- Ensure RLS is still active
ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;
