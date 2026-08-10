-- Add secret keys to stripe_settings table
-- These are protected by RLS (only admins can read/write)

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'secret_key') THEN
    ALTER TABLE public.stripe_settings ADD COLUMN secret_key text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'webhook_secret') THEN
    ALTER TABLE public.stripe_settings ADD COLUMN webhook_secret text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_settings' AND column_name = 'public_key') THEN
    ALTER TABLE public.stripe_settings ADD COLUMN public_key text;
  END IF;
END $$;

-- Update RLS to ensure only admins can see these sensitive columns
-- (The existing policy already limits the entire table to admins, so this is just a reinforcement)
ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;
