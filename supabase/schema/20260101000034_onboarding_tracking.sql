-- Onboarding Tracking System
-- This migration adds onboarding tracking to user profiles

-- ============================================================================
-- Add onboarding columns to profiles
-- ============================================================================

-- Add onboarding_completed flag
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add onboarding_completed_at timestamp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Add onboarding_step to track current step (for resuming)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- ============================================================================
-- Onboarding Data Table (stores all onboarding form data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Personal info
  birth_date date,
  gender text,
  
  -- Physical measurements
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  
  -- Lifestyle
  activity_level text,
  sleep_hours numeric,
  stress_level text,
  
  -- Fitness
  experience_level text,
  workout_frequency integer,
  preferred_workout_time text,
  available_equipment text[],
  
  -- Health
  health_conditions text[],
  dietary_restrictions text[],
  injuries text,
  medications text,
  
  -- Goals
  primary_goal text,
  secondary_goals text[],
  target_date date,
  motivation text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_onboarding_data_user_id 
ON public.user_onboarding_data(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.user_onboarding_data ENABLE ROW LEVEL SECURITY;

-- Users can view their own onboarding data
CREATE POLICY "Users can view own onboarding data"
ON public.user_onboarding_data
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own onboarding data
CREATE POLICY "Users can insert own onboarding data"
ON public.user_onboarding_data
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own onboarding data
CREATE POLICY "Users can update own onboarding data"
ON public.user_onboarding_data
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trainers can view their students' onboarding data
CREATE POLICY "Trainers can view student onboarding data"
ON public.user_onboarding_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainer_students ts
    WHERE ts.trainer_id = auth.uid()
      AND ts.student_id = user_onboarding_data.user_id
      AND ts.status = 'active'
  )
);

-- Admins can view all onboarding data
CREATE POLICY "Admins can view all onboarding data"
ON public.user_onboarding_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to save onboarding data
CREATE OR REPLACE FUNCTION public.save_onboarding_data(
  _data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result_id uuid;
BEGIN
  INSERT INTO public.user_onboarding_data (
    user_id,
    birth_date,
    gender,
    height_cm,
    weight_kg,
    target_weight_kg,
    activity_level,
    sleep_hours,
    stress_level,
    experience_level,
    workout_frequency,
    preferred_workout_time,
    available_equipment,
    health_conditions,
    dietary_restrictions,
    injuries,
    medications,
    primary_goal,
    secondary_goals,
    target_date,
    motivation
  ) VALUES (
    auth.uid(),
    (_data->>'birth_date')::date,
    _data->>'gender',
    (_data->>'height_cm')::numeric,
    (_data->>'weight_kg')::numeric,
    (_data->>'target_weight_kg')::numeric,
    _data->>'activity_level',
    (_data->>'sleep_hours')::numeric,
    _data->>'stress_level',
    _data->>'experience_level',
    (_data->>'workout_frequency')::integer,
    _data->>'preferred_workout_time',
    ARRAY(SELECT jsonb_array_elements_text(_data->'available_equipment')),
    ARRAY(SELECT jsonb_array_elements_text(_data->'health_conditions')),
    ARRAY(SELECT jsonb_array_elements_text(_data->'dietary_restrictions')),
    _data->>'injuries',
    _data->>'medications',
    _data->>'primary_goal',
    ARRAY(SELECT jsonb_array_elements_text(_data->'secondary_goals')),
    (_data->>'target_date')::date,
    _data->>'motivation'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    birth_date = EXCLUDED.birth_date,
    gender = EXCLUDED.gender,
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    target_weight_kg = EXCLUDED.target_weight_kg,
    activity_level = EXCLUDED.activity_level,
    sleep_hours = EXCLUDED.sleep_hours,
    stress_level = EXCLUDED.stress_level,
    experience_level = EXCLUDED.experience_level,
    workout_frequency = EXCLUDED.workout_frequency,
    preferred_workout_time = EXCLUDED.preferred_workout_time,
    available_equipment = EXCLUDED.available_equipment,
    health_conditions = EXCLUDED.health_conditions,
    dietary_restrictions = EXCLUDED.dietary_restrictions,
    injuries = EXCLUDED.injuries,
    medications = EXCLUDED.medications,
    primary_goal = EXCLUDED.primary_goal,
    secondary_goals = EXCLUDED.secondary_goals,
    target_date = EXCLUDED.target_date,
    motivation = EXCLUDED.motivation,
    updated_at = now()
  RETURNING id INTO _result_id;
  
  -- Mark onboarding as completed
  UPDATE public.profiles
  SET 
    onboarding_completed = true,
    onboarding_completed_at = now()
  WHERE id = auth.uid();
  
  RETURN _result_id;
END;
$$;

-- Function to get onboarding status
CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'completed', COALESCE(p.onboarding_completed, false),
    'completed_at', p.onboarding_completed_at,
    'current_step', COALESCE(p.onboarding_step, 0),
    'has_data', EXISTS (
      SELECT 1 FROM public.user_onboarding_data 
      WHERE user_id = auth.uid()
    )
  )
  FROM public.profiles p
  WHERE p.id = auth.uid()
$$;

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_onboarding_updated_at ON public.user_onboarding_data;
CREATE TRIGGER trigger_update_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_updated_at();

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.user_onboarding_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_onboarding_data(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated;
