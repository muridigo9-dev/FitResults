-- =========================================================
-- PERSONAL TRAINER MODE - PHASE 1A: ENUMS ONLY
-- This migration ONLY adds enum values
-- Must be in separate transaction before using them
-- =========================================================

-- Add 'content_creator' to existing app_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'content_creator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'content_creator';
  END IF;
END$$;

-- Create content_assignment_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_assignment_type') THEN
    CREATE TYPE content_assignment_type AS ENUM ('global', 'user', 'group');
  END IF;
END$$;

-- Create group_member_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_member_role') THEN
    CREATE TYPE group_member_role AS ENUM ('student', 'assistant');
  END IF;
END$$;
