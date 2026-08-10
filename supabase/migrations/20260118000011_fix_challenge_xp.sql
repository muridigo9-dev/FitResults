-- =========================================================
-- FIX CHALLENGE XP INTEGRATION
-- =========================================================

-- Update complete_challenge_task to properly award XP using the gamification system

CREATE OR REPLACE FUNCTION public.complete_challenge_task(
    p_participation_id UUID,
    p_day_id UUID,
    p_task_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_task_xp INT;
    v_day_xp INT;
    v_current_progress JSONB;
    v_updated_tasks JSONB;
    v_is_day_complete BOOLEAN;
    v_new_day_xp_awarded BOOLEAN := false;
BEGIN
    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM public.user_challenge_participations WHERE id = p_participation_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'Participation not found or access denied';
    END IF;

    -- Get Task Info
    SELECT xp_reward INTO v_task_xp FROM public.challenge_tasks WHERE id = p_task_id;
    
    -- Get Current Progress for Day
    SELECT tasks_completed INTO v_current_progress 
    FROM public.user_challenge_progress 
    WHERE participation_id = p_participation_id AND challenge_day_id = p_day_id;
    
    IF v_current_progress IS NULL THEN
        -- Create record if first task of day
        v_current_progress := '[]'::jsonb;
        INSERT INTO public.user_challenge_progress (participation_id, challenge_day_id, tasks_completed)
        VALUES (p_participation_id, p_day_id, '[]'::jsonb);
    END IF;
    
    -- Update completed tasks array
    IF NOT (v_current_progress @> to_jsonb(p_task_id)) THEN
        v_updated_tasks := v_current_progress || to_jsonb(p_task_id);
        
        UPDATE public.user_challenge_progress 
        SET tasks_completed = v_updated_tasks, completed_at = NOW()
        WHERE participation_id = p_participation_id AND challenge_day_id = p_day_id;
        
        -- Grant XP for Task
        IF v_task_xp > 0 THEN
            PERFORM public.add_xp_to_user(
                p_user_id, 
                v_task_xp, 
                'challenge_task', 
                jsonb_build_object('task_id', p_task_id, 'participation_id', p_participation_id)
            );
        END IF;
        
        -- Check if Day is Complete (All Mandatory Tasks)
        IF NOT EXISTS (
            SELECT 1 FROM public.challenge_tasks 
            WHERE challenge_day_id = p_day_id 
            AND is_mandatory = true 
            AND NOT (v_updated_tasks @> to_jsonb(id))
        ) THEN
            -- Day Complete!
            v_is_day_complete := true;
            
            -- Grant Day Bonus
            SELECT xp_bonus INTO v_day_xp FROM public.challenge_days WHERE id = p_day_id;
            
            IF v_day_xp > 0 THEN
                PERFORM public.add_xp_to_user(
                    p_user_id,
                    v_day_xp,
                    'challenge_day',
                    jsonb_build_object('day_id', p_day_id, 'participation_id', p_participation_id)
                );
                v_new_day_xp_awarded := true;
            END IF;
            
            -- Advance Day in Participation (simplistic logic)
            -- Logic to advance day number would go here, or handled by frontend state
        END IF;

        RETURN jsonb_build_object(
            'success', true, 
            'xp_earned', coalesce(v_task_xp, 0) + (CASE WHEN v_new_day_xp_awarded THEN COALESCE(v_day_xp, 0) ELSE 0 END),
            'day_completed', coalesce(v_is_day_complete, false)
        );
    ELSE
         RETURN jsonb_build_object('success', false, 'message', 'Task already completed');
    END IF;
END;
$$;
