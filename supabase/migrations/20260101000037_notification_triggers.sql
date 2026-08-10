-- Notification Triggers
-- This migration creates automatic notification triggers for various events

-- ============================================================================
-- Feature Flag for Notification Triggers
-- ============================================================================

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('notification_triggers_enabled', true, 'Enable automatic notification triggers for events')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Trigger: New Content Assignment Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_content_assignment()
RETURNS TRIGGER AS $$
DECLARE
  _content_type text;
  _content_name text;
  _user_id uuid;
  _triggers_enabled boolean;
BEGIN
  -- Check if triggers are enabled
  SELECT COALESCE(enabled, false) INTO _triggers_enabled
  FROM public.feature_flags
  WHERE key = 'notification_triggers_enabled';
  
  IF NOT _triggers_enabled THEN
    RETURN NEW;
  END IF;

  -- Determine content type and name
  IF NEW.workout_id IS NOT NULL THEN
    SELECT 'treino', name INTO _content_type, _content_name
    FROM public.workouts WHERE id = NEW.workout_id;
  ELSIF NEW.diet_id IS NOT NULL THEN
    SELECT 'dieta', name INTO _content_type, _content_name
    FROM public.diets WHERE id = NEW.diet_id;
  ELSIF NEW.challenge_id IS NOT NULL THEN
    SELECT 'desafio', name INTO _content_type, _content_name
    FROM public.challenges WHERE id = NEW.challenge_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Get the user ID
  _user_id := NEW.user_id;

  -- Create notification
  PERFORM public.create_notification(
    _user_id,
    'Novo conteúdo atribuído',
    'Você recebeu um novo ' || _content_type || ': ' || COALESCE(_content_name, 'Sem nome'),
    'content_assignment',
    CASE _content_type
      WHEN 'treino' THEN '/workouts/' || NEW.workout_id
      WHEN 'dieta' THEN '/diets/' || NEW.diet_id
      WHEN 'desafio' THEN '/challenges/' || NEW.challenge_id
    END
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail
    RAISE NOTICE 'Error creating content assignment notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_content_assignment ON public.content_assignments;
CREATE TRIGGER trigger_notify_content_assignment
  AFTER INSERT ON public.content_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_content_assignment();

-- ============================================================================
-- Trigger: Trainer Link Accepted Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_trainer_link_status()
RETURNS TRIGGER AS $$
DECLARE
  _trainer_name text;
  _student_name text;
  _triggers_enabled boolean;
BEGIN
  -- Check if triggers are enabled
  SELECT COALESCE(enabled, false) INTO _triggers_enabled
  FROM public.feature_flags
  WHERE key = 'notification_triggers_enabled';
  
  IF NOT _triggers_enabled THEN
    RETURN NEW;
  END IF;

  -- Only trigger on status change to 'active'
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    -- Get names
    SELECT COALESCE(full_name, email) INTO _trainer_name
    FROM public.profiles WHERE id = NEW.trainer_id;
    
    SELECT COALESCE(full_name, email) INTO _student_name
    FROM public.profiles WHERE id = NEW.student_id;

    -- Notify student that trainer accepted
    PERFORM public.create_notification(
      NEW.student_id,
      'Treinador conectado',
      'Você agora está conectado com ' || COALESCE(_trainer_name, 'seu treinador'),
      'trainer_update',
      '/my-trainer'
    );

    -- Notify trainer about new student
    PERFORM public.create_notification(
      NEW.trainer_id,
      'Novo aluno',
      COALESCE(_student_name, 'Um aluno') || ' agora está na sua lista',
      'trainer_update',
      '/trainer'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating trainer link notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_trainer_link_status ON public.trainer_students;
CREATE TRIGGER trigger_notify_trainer_link_status
  AFTER INSERT OR UPDATE OF status ON public.trainer_students
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trainer_link_status();

-- ============================================================================
-- Trigger: Check-in Streak Milestone Notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_streak_milestone()
RETURNS TRIGGER AS $$
DECLARE
  _streak_count integer;
  _triggers_enabled boolean;
  _milestone_reached boolean := false;
  _milestone_value integer;
BEGIN
  -- Check if triggers are enabled
  SELECT COALESCE(enabled, false) INTO _triggers_enabled
  FROM public.feature_flags
  WHERE key = 'notification_triggers_enabled';
  
  IF NOT _triggers_enabled THEN
    RETURN NEW;
  END IF;

  -- Count consecutive days with check-ins
  SELECT COUNT(DISTINCT checkin_date) INTO _streak_count
  FROM (
    SELECT checkin_date
    FROM public.daily_checkins
    WHERE user_id = NEW.user_id
      AND checkin_date >= (
        SELECT COALESCE(
          (
            SELECT checkin_date + interval '1 day'
            FROM (
              SELECT checkin_date,
                     LAG(checkin_date) OVER (ORDER BY checkin_date DESC) as prev_date
              FROM public.daily_checkins
              WHERE user_id = NEW.user_id
              ORDER BY checkin_date DESC
            ) gaps
            WHERE prev_date IS NOT NULL
              AND prev_date - checkin_date > interval '1 day'
            LIMIT 1
          ),
          (SELECT MIN(checkin_date) FROM public.daily_checkins WHERE user_id = NEW.user_id)
        )
      )
    ORDER BY checkin_date DESC
  ) streak_days;

  -- Check milestones (7, 14, 30, 60, 90, 180, 365 days)
  IF _streak_count IN (7, 14, 30, 60, 90, 180, 365) THEN
    _milestone_reached := true;
    _milestone_value := _streak_count;
  END IF;

  IF _milestone_reached THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Conquista desbloqueada! 🎉',
      'Você completou ' || _milestone_value || ' dias consecutivos de check-in!',
      'achievement',
      '/progress'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating streak notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_streak_milestone ON public.daily_checkins;
CREATE TRIGGER trigger_notify_streak_milestone
  AFTER INSERT ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_streak_milestone();

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.notify_content_assignment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_trainer_link_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_streak_milestone() TO authenticated;
