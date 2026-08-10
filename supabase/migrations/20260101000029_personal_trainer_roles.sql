-- =========================================================
-- PERSONAL TRAINER MODE - PHASE 2A: ADDITIONAL ROLE ENUMS
-- Adds 'personal_trainer' and 'aluno' to app_role enum
-- Must be in separate transaction before using them
-- =========================================================

-- Add 'personal_trainer' to existing app_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'personal_trainer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'personal_trainer';
  END IF;
END$$;

-- Add 'aluno' to existing app_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'aluno' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'aluno';
  END IF;
END$$;
