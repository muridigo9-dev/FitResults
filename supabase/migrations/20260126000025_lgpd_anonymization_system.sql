-- Migration: 20260126000025_lgpd_anonymization_system.sql
-- Description: System for anonymizing user data
-- Created: 2026-01-26

-- 1. Add is_anonymized flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT false;

-- 2. Create index for performance on filtering non-anonymized users
CREATE INDEX IF NOT EXISTS idx_profiles_is_anonymized ON public.profiles(is_anonymized);

-- 3. Update anonymization rules in policy
UPDATE public.lgpd_policies
SET anonymization_rules = '{
    "profile": {
        "full_name": "Usuário Anonimizado",
        "avatar_url": null,
        "is_anonymized": true
    },
    "checkins": {
        "notes": "REDACTED"
    },
    "anamnesis": {
        "medical_history": "REDACTED",
        "physical_limitations": "REDACTED",
        "observations": "REDACTED"
    },
    "user_body_profiles": {
        "gender": "other"
    }
}'::jsonb
WHERE id = (SELECT id FROM public.lgpd_policies LIMIT 1);

-- 4. RPC for Transactional Anonymization
-- This ensures all DB changes happen in one transaction
CREATE OR REPLACE FUNCTION public.perform_user_anonymization(_user_id UUID, _anon_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _rules JSONB;
BEGIN
    -- GUARD: Check if LGPD is enabled
    IF NOT public.is_feature_active_for_user('lgpd_enabled', _user_id) THEN
        RETURN FALSE;
    END IF;

    -- Get rules
    SELECT anonymization_rules INTO _rules FROM public.lgpd_policies LIMIT 1;

    -- 1. Anonymize Profile
    UPDATE public.profiles
    SET 
        full_name = _rules->'profile'->>'full_name',
        avatar_url = NULL,
        email = _anon_email,
        is_anonymized = true,
        updated_at = now()
    WHERE id = _user_id;

    -- 2. Anonymize Body Profile
    UPDATE public.user_body_profiles
    SET 
        gender = _rules->'user_body_profiles'->>'gender'
    WHERE user_id = _user_id;

    -- 3. Anonymize Checkins
    UPDATE public.checkins
    SET notes = _rules->'checkins'->>'notes'
    WHERE user_id = _user_id;

    -- 4. Anonymize Anamnesis
    UPDATE public.anamnesis
    SET 
        medical_history = _rules->'anamnesis'->>'medical_history',
        physical_limitations = _rules->'anamnesis'->>'physical_limitations',
        observations = _rules->'anamnesis'->>'observations'
    WHERE user_id = _user_id;

    -- 5. Wipe sessions/tokens logic (handled by Auth Admin in Edge Function)

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;
