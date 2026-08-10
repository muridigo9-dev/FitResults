-- Migration: 20260127174591_add_all_lgpd_enums.sql
-- Description: Add enum values with public schema prefix to ensure they are created correctly

-- 1. LGPD Request Types
ALTER TYPE public.lgpd_request_type ADD VALUE IF NOT EXISTS 'confirmation';
ALTER TYPE public.lgpd_request_type ADD VALUE IF NOT EXISTS 'access';
ALTER TYPE public.lgpd_request_type ADD VALUE IF NOT EXISTS 'correction';
ALTER TYPE public.lgpd_request_type ADD VALUE IF NOT EXISTS 'portability';
ALTER TYPE public.lgpd_request_type ADD VALUE IF NOT EXISTS 'anonymization';
ALTER TYPE public.lgpd_request_type ADD VALUE IF NOT EXISTS 'deletion';
ALTER TYPE public.lgpd_request_type ADD VALUE IF NOT EXISTS 'revocation';

-- 2. Notification Event Type
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'lgpd_new_request';

-- 3. Email Template Type
ALTER TYPE public.email_template_type ADD VALUE IF NOT EXISTS 'lgpd_new_request';
