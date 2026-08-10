-- ============================================================================
-- FIX VIEWS SECURITY
-- Corrige as views para usar SECURITY INVOKER e grants apropriados
-- Views: trainer_student_summary, student_detailed_progress, 
--        my_trainer_conversation, trainer_conversations_list
-- ============================================================================

-- ============================================================================
-- PART 1: Recreate trainer_student_summary view with proper security
-- ============================================================================

DROP VIEW IF EXISTS public.trainer_student_summary;

CREATE VIEW public.trainer_student_summary
WITH (security_invoker = true)
AS
SELECT 
  ts.trainer_id,
  ts.student_id,
  p.full_name AS student_name,
  p.email AS student_email,
  p.avatar_url AS student_avatar,
  ts.status,
  ts.started_at,
  
  -- Streak and XP
  COALESCE(ux.current_streak, 0) AS current_streak,
  COALESCE(ux.longest_streak, 0) AS longest_streak,
  COALESCE(ux.total_xp, 0) AS total_xp,
  COALESCE(lv.level_number, 1) AS level,
  ux.last_checkin_date,
  
  -- Recent activity (last 7 days)
  (
    SELECT COUNT(*) FROM daily_checkins dc 
    WHERE dc.user_id = ts.student_id 
    AND dc.date >= CURRENT_DATE - INTERVAL '7 days'
  ) AS checkins_last_7_days,
  
  -- Active assignments count
  (
    SELECT COUNT(*) FROM content_assignments ca 
    WHERE (
      (ca.assigned_to_type = 'user' AND ca.assigned_to_id = ts.student_id)
      OR (ca.assigned_to_type = 'group' AND ca.assigned_to_id = ANY(public.get_user_group_ids(ts.student_id)))
    )
    AND ca.status = 'active'
  ) AS active_assignments
  
FROM public.trainer_students ts
JOIN public.profiles p ON p.id = ts.student_id
LEFT JOIN public.user_xp ux ON ux.user_id = ts.student_id
LEFT JOIN public.levels lv ON lv.id = ux.current_level_id
WHERE ts.status = 'active'
  AND (
    -- Trainer can see their own students
    ts.trainer_id = auth.uid()
    -- Admins can see all
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================================================
-- PART 2: Recreate student_detailed_progress view with proper security
-- ============================================================================

DROP VIEW IF EXISTS public.student_detailed_progress;

CREATE VIEW public.student_detailed_progress
WITH (security_invoker = true)
AS
SELECT 
  dc.user_id,
  dc.date,
  
  -- Checkin data
  dc.mood,
  dc.notes AS mood_notes,
  dc.weight,
  dc.water_current AS water_ml,
  dc.water_goal AS water_goal_ml,
  
  -- Completion rates
  CASE WHEN dc.water_goal > 0 
    THEN ROUND((dc.water_current::NUMERIC / dc.water_goal) * 100, 1)
    ELSE 0 
  END AS water_completion_pct,
  
  -- Related data
  (SELECT COUNT(*) FROM habit_logs hl WHERE hl.user_id = dc.user_id AND hl.date = dc.date) AS habits_completed,
  (SELECT COUNT(*) FROM checkin_workouts cw WHERE cw.checkin_id = dc.id AND cw.completed = true) AS workouts_completed,
  (SELECT COUNT(*) FROM checkin_meals cm WHERE cm.checkin_id = dc.id) AS meals_logged
  
FROM public.daily_checkins dc
WHERE 
  -- User can see their own progress
  dc.user_id = auth.uid()
  -- Trainer can see their students' progress
  OR dc.user_id = ANY(public.get_trainer_student_ids(auth.uid()))
  -- Admin can see all
  OR public.has_role(auth.uid(), 'admin')
ORDER BY dc.date DESC;

-- ============================================================================
-- PART 3: Recreate my_trainer_conversation view with proper security
-- ============================================================================

DROP VIEW IF EXISTS public.my_trainer_conversation;

CREATE VIEW public.my_trainer_conversation
WITH (security_invoker = true)
AS
SELECT 
  c.id AS conversation_id,
  c.trainer_id,
  c.student_id,
  c.last_message_at,
  c.last_message_preview,
  c.student_unread_count AS unread_count,
  p.full_name AS trainer_name,
  p.avatar_url AS trainer_avatar,
  p.email AS trainer_email
FROM public.trainer_conversations c
JOIN public.profiles p ON p.id = c.trainer_id
WHERE c.student_id = auth.uid();

-- ============================================================================
-- PART 4: Recreate trainer_conversations_list view with proper security
-- ============================================================================

DROP VIEW IF EXISTS public.trainer_conversations_list;

CREATE VIEW public.trainer_conversations_list
WITH (security_invoker = true)
AS
SELECT 
  c.id AS conversation_id,
  c.trainer_id,
  c.student_id,
  c.last_message_at,
  c.last_message_preview,
  c.trainer_unread_count AS unread_count,
  c.created_at,
  p.full_name AS student_name,
  p.avatar_url AS student_avatar,
  p.email AS student_email
FROM public.trainer_conversations c
JOIN public.profiles p ON p.id = c.student_id
WHERE 
  c.trainer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
ORDER BY c.last_message_at DESC NULLS LAST;

-- ============================================================================
-- PART 5: Grant permissions on views
-- ============================================================================

GRANT SELECT ON public.trainer_student_summary TO authenticated;
GRANT SELECT ON public.student_detailed_progress TO authenticated;
GRANT SELECT ON public.my_trainer_conversation TO authenticated;
GRANT SELECT ON public.trainer_conversations_list TO authenticated;
