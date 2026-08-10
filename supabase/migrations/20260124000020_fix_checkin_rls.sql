-- Enable RLS on check-in related tables
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_challenge_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for daily_checkins: Users can CRUD their own checkins
CREATE POLICY "Users can manage their own daily checkins"
ON public.daily_checkins
FOR ALL
USING (auth.uid() = user_id);

-- Policy for checkin_meals: Users can manage meals via their own checkins
CREATE POLICY "Users can manage their own checkin meals"
ON public.checkin_meals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE id = checkin_meals.checkin_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE id = checkin_meals.checkin_id
    AND user_id = auth.uid()
  )
);

-- Policy for checkin_workouts: Users can manage workouts via their own checkins
CREATE POLICY "Users can manage their own checkin workouts"
ON public.checkin_workouts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE id = checkin_workouts.checkin_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE id = checkin_workouts.checkin_id
    AND user_id = auth.uid()
  )
);

-- Policy for checkin_challenge_tasks: Users can manage tasks via their own checkins
CREATE POLICY "Users can manage their own checkin challenge tasks"
ON public.checkin_challenge_tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE id = checkin_challenge_tasks.checkin_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE id = checkin_challenge_tasks.checkin_id
    AND user_id = auth.uid()
  )
);
