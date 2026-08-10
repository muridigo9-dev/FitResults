-- ============================================
-- FIX: Progress Calendar Policies
-- ============================================
-- Description: Adiciona DROP POLICY IF EXISTS para tornar idempotente
-- Created: 2026-01-14
-- Idempotent: Safe to run multiple times
-- Fixes: 20260114000007_progress_calendar_system.sql

-- ============================================
-- DAILY CHECKIN SUMMARY POLICIES
-- ============================================

-- NOTE: Materialized views do NOT support RLS in PostgreSQL.
-- Security is enforced via SECURITY DEFINER functions in 
-- 20260114000007_progress_calendar_system.sql

-- Drop existing policies if they exist (cleanup in case they were tables before)
DROP POLICY IF EXISTS "Users can view own calendar data" ON public.daily_checkin_summary;
DROP POLICY IF EXISTS "Admins can view all calendar data" ON public.daily_checkin_summary;

-- ============================================
-- COMMENTS
-- ============================================

-- Comentada pois não é suportado em materialized views
-- COMMENT ON POLICY "Users can view own calendar data" ON public.daily_checkin_summary IS 
-- 'Allows users to view their own daily check-in summary for progress tracking';

-- COMMENT ON POLICY "Admins can view all calendar data" ON public.daily_checkin_summary IS 
-- 'Allows admins to view all users calendar data for monitoring and support';

