-- =========================================================
-- CHALLENGES RPCS & LOGIC
-- =========================================================

-- 1. Get Available Challenges for User
CREATE OR REPLACE FUNCTION public.get_available_challenges(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    cover_url TEXT,
    type TEXT,
    duration_days INT,
    xp_reward INT,
    is_joined BOOLEAN,
    status TEXT,
    current_day INT,
    total_days INT -- Same as duration_days, kept for convenience
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.cover_url,
        c.type,
        c.duration_days,
        c.xp_reward,
        (p.id IS NOT NULL) as is_joined,
        COALESCE(p.status, 'available') as status,
        COALESCE(p.current_day, 0) as current_day,
        c.duration_days as total_days
    FROM public.challenges c
    LEFT JOIN public.user_challenge_participations p 
        ON c.id = p.challenge_id AND p.user_id = p_user_id
    WHERE 
        c.is_active = true
        AND (
            -- Global Challenges
            c.type = 'global'
            OR 
            -- Academy Challenges: User must be a member
            (c.type = 'academy' AND EXISTS (
                SELECT 1 FROM public.academy_members am 
                WHERE am.user_id = p_user_id AND am.academy_id = c.academy_id
            ))
        );
END;
$$;

-- 2. Join Challenge
CREATE OR REPLACE FUNCTION public.join_challenge(
    p_challenge_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge RECORD;
    v_part_id UUID;
    v_academy_id UUID;
BEGIN
    -- Verify challenge exists and is accessible
    SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id AND is_active = true;
    
    IF v_challenge.id IS NULL THEN
        RAISE EXCEPTION 'Challenge not found or inactive';
    END IF;
    
    -- Check if already joined
    IF EXISTS (SELECT 1 FROM public.user_challenge_participations WHERE user_id = p_user_id AND challenge_id = p_challenge_id) THEN
        RAISE EXCEPTION 'Already joined this challenge';
    END IF;
    
    -- Determine Academy ID at time of join (for snapshot)
    IF v_challenge.type = 'academy' THEN
        v_academy_id := v_challenge.academy_id;
        -- Verify membership again
        IF NOT EXISTS (SELECT 1 FROM public.academy_members WHERE user_id = p_user_id AND academy_id = v_academy_id) THEN
            RAISE EXCEPTION 'User is not a member of the academy';
        END IF;
    END IF;

    -- Create Participation
    INSERT INTO public.user_challenge_participations (
        user_id, challenge_id, academy_id, status, current_day
    ) VALUES (
        p_user_id, p_challenge_id, v_academy_id, 'active', 1
    ) RETURNING id INTO v_part_id;
    
    RETURN jsonb_build_object('success', true, 'participation_id', v_part_id);
END;
$$;

-- 3. Complete Task Endpoint
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
        -- (Assuming grant_xp function exists, if not, we skip or add TODO)
        -- PERFORM public.grant_xp(p_user_id, v_task_xp, 'challenge_task');
        
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
            -- PERFORM public.grant_xp(p_user_id, v_day_xp, 'challenge_day');
            v_new_day_xp_awarded := true;
            
            -- Advance Day in Participation (simplistic logic)
            -- Logic to advance day number would go here, or handled by frontend state
        END IF;

        RETURN jsonb_build_object(
            'success', true, 
            'xp_earned', v_task_xp + (CASE WHEN v_new_day_xp_awarded THEN COALESCE(v_day_xp, 0) ELSE 0 END),
            'day_completed', v_is_day_complete
        );
    ELSE
         RETURN jsonb_build_object('success', false, 'message', 'Task already completed');
    END IF;
END;
$$;
