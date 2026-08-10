-- ================================================
-- STUDENT INVITE EMAIL ENUM VALUE
-- Add student_invite to email_template_type enum
-- This MUST be in a separate migration from the INSERT
-- ================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'email_template_type' AND e.enumlabel = 'student_invite'
    ) THEN
        ALTER TYPE public.email_template_type ADD VALUE 'student_invite';
    END IF;
END $$;
