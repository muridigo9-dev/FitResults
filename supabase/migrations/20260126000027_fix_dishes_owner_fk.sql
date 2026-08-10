-- Fix dishes owner_id foreign key to point to profiles instead of auth.users
-- This enables PostgREST resource embedding to fetch owner names in the Admin Dashboard

BEGIN;

-- 1. Drop the existing constraint (which points to auth.users)
ALTER TABLE public.dishes
DROP CONSTRAINT IF EXISTS dishes_owner_id_fkey;

-- 2. Add the new constraint (pointing to public.profiles)
-- We use validation to ensure all current owner_ids exist in profiles (they should, as profiles = auth.users)
ALTER TABLE public.dishes
ADD CONSTRAINT dishes_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

COMMIT;
