-- ============================================================
-- USER WORKOUTS - UPDATE AND DELETE POLICIES WITH FEATURE FLAG
-- ============================================================
-- Adiciona validação de feature flag para UPDATE e DELETE em user_workouts
-- Garante que apenas usuários com flag ativa podem editar/deletar seus treinos
-- Admins sempre podem editar/deletar (bypass da flag)

-- ============================================
-- PART 1: UPDATE POLICY
-- ============================================

DROP POLICY IF EXISTS "Users update own workouts with flag check" ON public.user_workouts;
CREATE POLICY "Users update own workouts with flag check"
ON public.user_workouts FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND (public.is_admin() OR public.is_user_content_allowed('user_custom_workouts'))
)
WITH CHECK (
  user_id = auth.uid()
  AND (public.is_admin() OR public.is_user_content_allowed('user_custom_workouts'))
);

-- ============================================
-- PART 2: DELETE POLICY
-- ============================================

DROP POLICY IF EXISTS "Users delete own workouts with flag check" ON public.user_workouts;
CREATE POLICY "Users delete own workouts with flag check"
ON public.user_workouts FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND (public.is_admin() OR public.is_user_content_allowed('user_custom_workouts'))
);

-- ============================================
-- PART 3: SELECT POLICY (Garantir isolamento)
-- ============================================

-- Garantir que usuários só veem seus próprios treinos
-- Admins podem ver todos
DROP POLICY IF EXISTS "Users view own workouts" ON public.user_workouts;
CREATE POLICY "Users view own workouts"
ON public.user_workouts FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR public.is_admin()
);

-- ============================================
-- DONE
-- ============================================
DO $$ BEGIN RAISE NOTICE 'User workouts UPDATE/DELETE policies with feature flag applied successfully'; END $$;
