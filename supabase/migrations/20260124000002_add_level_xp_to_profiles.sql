DO $$ 
BEGIN
  -- Add xp column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'xp') THEN
    ALTER TABLE public.profiles ADD COLUMN xp INTEGER DEFAULT 0;
  END IF;

  -- Add level column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'level') THEN
    ALTER TABLE public.profiles ADD COLUMN level INTEGER DEFAULT 1;
  END IF;
END $$;
