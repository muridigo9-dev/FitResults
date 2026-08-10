-- 1. Add missing values to notification_event_type enum
-- This is in a separate file because Postgres doesn't allow adding and using 
-- enum values in the same transaction.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'notification_event_type' AND e.enumlabel = 'lgpd_update'
    ) THEN
        ALTER TYPE notification_event_type ADD VALUE 'lgpd_update';
    END IF;
END $$;
