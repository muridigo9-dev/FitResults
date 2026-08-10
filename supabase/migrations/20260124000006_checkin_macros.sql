-- Add consumed_macros to checkin_meals to support specific nutritional tracking
ALTER TABLE public.checkin_meals
ADD COLUMN IF NOT EXISTS consumed_macros JSONB DEFAULT NULL;

-- Comment
COMMENT ON COLUMN public.checkin_meals.consumed_macros IS 'Stores the actual consumed macros for this meal entry, allowing for adjustments from the planned dish.';
