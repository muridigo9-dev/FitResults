-- =====================================================
-- FIX DUPLICATE POLICIES - MIGRAÇÃO DE CORREÇÃO
-- Objetivo: Garantir idempotência removendo policies
-- existentes antes de criar novas
-- 
-- USO: Copie este arquivo para supabase/migrations/
--      como: 20260101000021_fix_duplicate_policies.sql
-- =====================================================

-- =====================================================
-- 1. DIET INGREDIENTS
-- =====================================================
DROP POLICY IF EXISTS "Read diet ingredients" ON public.diet_ingredients;
CREATE POLICY "Read diet ingredients"
ON public.diet_ingredients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages diet ingredients" ON public.diet_ingredients;
CREATE POLICY "Admin manages diet ingredients"
ON public.diet_ingredients FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 2. DIET PREPARATION STEPS
-- =====================================================
DROP POLICY IF EXISTS "Read diet steps" ON public.diet_preparation_steps;
CREATE POLICY "Read diet steps"
ON public.diet_preparation_steps FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages diet steps" ON public.diet_preparation_steps;
CREATE POLICY "Admin manages diet steps"
ON public.diet_preparation_steps FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 3. WORKOUT EXERCISES
-- =====================================================
DROP POLICY IF EXISTS "Read workout exercises" ON public.workout_exercises;
CREATE POLICY "Read workout exercises"
ON public.workout_exercises FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages workout exercises" ON public.workout_exercises;
CREATE POLICY "Admin manages workout exercises"
ON public.workout_exercises FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 4. CHALLENGE DAYS
-- =====================================================
DROP POLICY IF EXISTS "Read challenge days" ON public.challenge_days;
CREATE POLICY "Read challenge days"
ON public.challenge_days FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages challenge days" ON public.challenge_days;
CREATE POLICY "Admin manages challenge days"
ON public.challenge_days FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 5. CHALLENGE TASKS
-- =====================================================
DROP POLICY IF EXISTS "Read challenge tasks" ON public.challenge_tasks;
CREATE POLICY "Read challenge tasks"
ON public.challenge_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages challenge tasks" ON public.challenge_tasks;
CREATE POLICY "Admin manages challenge tasks"
ON public.challenge_tasks FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 6. HABITS
-- =====================================================
DROP POLICY IF EXISTS "Read habits" ON public.habits;
CREATE POLICY "Read habits"
ON public.habits FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages habits" ON public.habits;
CREATE POLICY "Admin manages habits"
ON public.habits FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 7. LEVELS
-- =====================================================
DROP POLICY IF EXISTS "Read levels" ON public.levels;
CREATE POLICY "Read levels"
ON public.levels FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages levels" ON public.levels;
CREATE POLICY "Admin manages levels"
ON public.levels FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 8. ACHIEVEMENTS
-- =====================================================
DROP POLICY IF EXISTS "Read achievements" ON public.achievements;
CREATE POLICY "Read achievements"
ON public.achievements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages achievements" ON public.achievements;
CREATE POLICY "Admin manages achievements"
ON public.achievements FOR ALL TO authenticated
USING (public.is_admin()) WITH check (public.is_admin());

-- =====================================================
-- 9. PLANS
-- =====================================================
DROP POLICY IF EXISTS "Read active plans" ON public.plans;
CREATE POLICY "Read active plans"
ON public.plans FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages plans" ON public.plans;
CREATE POLICY "Admin manages plans"
ON public.plans FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 10. PLAN PRICES
-- =====================================================
DROP POLICY IF EXISTS "Read active prices" ON public.plan_prices;
CREATE POLICY "Read active prices"
ON public.plan_prices FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manages prices" ON public.plan_prices;
CREATE POLICY "Admin manages prices"
ON public.plan_prices FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 11. WEIGHT LOGS
-- =====================================================
DROP POLICY IF EXISTS "User owns weight logs or admin" ON public.weight_logs;
CREATE POLICY "User owns weight logs or admin"
ON public.weight_logs FOR ALL TO authenticated
USING (public.is_owner(user_id) OR public.is_admin())
WITH CHECK (public.is_owner(user_id) OR public.is_admin());

-- =====================================================
-- 12. CHECKIN MEALS
-- =====================================================
DROP POLICY IF EXISTS "Read checkin meals" ON public.checkin_meals;
CREATE POLICY "Read checkin meals"
ON public.checkin_meals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages checkin meals" ON public.checkin_meals;
CREATE POLICY "Admin manages checkin meals"
ON public.checkin_meals FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 13. CHECKIN WORKOUTS
-- =====================================================
DROP POLICY IF EXISTS "Read checkin workouts" ON public.checkin_workouts;
CREATE POLICY "Read checkin workouts"
ON public.checkin_workouts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages checkin workouts" ON public.checkin_workouts;
CREATE POLICY "Admin manages checkin workouts"
ON public.checkin_workouts FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 14. CHECKIN CHALLENGE TASKS
-- =====================================================
DROP POLICY IF EXISTS "Read checkin challenge tasks" ON public.checkin_challenge_tasks;
CREATE POLICY "Read checkin challenge tasks"
ON public.checkin_challenge_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages checkin challenge tasks" ON public.checkin_challenge_tasks;
CREATE POLICY "Admin manages checkin challenge tasks"
ON public.checkin_challenge_tasks FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 15. APP SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Only admins can modify app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin only app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admin manages app_settings" ON public.app_settings;

CREATE POLICY "Read app_settings"
ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages app_settings"
ON public.app_settings FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 16. BRAND SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "Admin only brand_settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Read brand_settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Admin update brand_settings" ON public.brand_settings;
DROP POLICY IF EXISTS "Admin manages brand_settings" ON public.brand_settings;

CREATE POLICY "Read brand_settings"
ON public.brand_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages brand_settings"
ON public.brand_settings FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 17. MACRO TEMPLATES
-- =====================================================
DROP POLICY IF EXISTS "Admin only macro_templates" ON public.macro_templates;
DROP POLICY IF EXISTS "Read macro_templates" ON public.macro_templates;
DROP POLICY IF EXISTS "Admin update macro_templates" ON public.macro_templates;
DROP POLICY IF EXISTS "Admin manages macro_templates" ON public.macro_templates;

CREATE POLICY "Read macro_templates"
ON public.macro_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages macro_templates"
ON public.macro_templates FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 18. XP SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "Admin only xp_settings" ON public.xp_settings;
DROP POLICY IF EXISTS "Read xp_settings" ON public.xp_settings;
DROP POLICY IF EXISTS "Admin update xp_settings" ON public.xp_settings;
DROP POLICY IF EXISTS "Admin manages xp_settings" ON public.xp_settings;

CREATE POLICY "Read xp_settings"
ON public.xp_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages xp_settings"
ON public.xp_settings FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =====================================================
-- 19. PUSH SUBSCRIPTIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 20. SUPPORT TICKETS
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 21. SUPPORT MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON public.support_messages;
CREATE POLICY "Users can view messages from their tickets"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t 
    WHERE t.id = ticket_id AND t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert messages to their tickets" ON public.support_messages;
CREATE POLICY "Users can insert messages to their tickets"
ON public.support_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets t 
    WHERE t.id = ticket_id AND t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Admins can view all messages"
ON public.support_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert messages" ON public.support_messages;
CREATE POLICY "Admins can insert messages"
ON public.support_messages FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 22. ACCOUNT CANCELLATION REQUESTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Users can view own cancellation requests"
ON public.account_cancellation_requests FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create cancellation request" ON public.account_cancellation_requests;
CREATE POLICY "Users can create cancellation request"
ON public.account_cancellation_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Admins can view all cancellation requests"
ON public.account_cancellation_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Admins can update cancellation requests"
ON public.account_cancellation_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete cancellation requests" ON public.account_cancellation_requests;
CREATE POLICY "Admins can delete cancellation requests"
ON public.account_cancellation_requests FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 23. FEATURE FLAGS
-- =====================================================
DROP POLICY IF EXISTS "Admin manages feature flags" ON public.feature_flags;
CREATE POLICY "Admin manages feature flags"
ON public.feature_flags FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read feature flags" ON public.feature_flags;
CREATE POLICY "Users read feature flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

-- =====================================================
-- 24. FEATURE FLAG AUDIT
-- =====================================================
DROP POLICY IF EXISTS "Admin reads audit log" ON public.feature_flag_audit;
CREATE POLICY "Admin reads audit log"
ON public.feature_flag_audit FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Service inserts audit logs" ON public.feature_flag_audit;
CREATE POLICY "Service inserts audit logs"
ON public.feature_flag_audit FOR INSERT TO authenticated
WITH CHECK (true);

-- =====================================================
-- 25. FEATURE USAGE
-- =====================================================
DROP POLICY IF EXISTS "Admin reads all usage" ON public.feature_usage;
CREATE POLICY "Admin reads all usage"
ON public.feature_usage FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Users insert own usage" ON public.feature_usage;
CREATE POLICY "Users insert own usage"
ON public.feature_usage FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 26. USER DIETS
-- =====================================================
DROP POLICY IF EXISTS "User owns diets or admin" ON public.user_diets;
DROP POLICY IF EXISTS "Users read own diets" ON public.user_diets;
DROP POLICY IF EXISTS "Users insert own diets with flag check" ON public.user_diets;
DROP POLICY IF EXISTS "Users update own diets" ON public.user_diets;
DROP POLICY IF EXISTS "Users delete own diets" ON public.user_diets;

CREATE POLICY "Users read own diets"
ON public.user_diets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users insert own diets with flag check"
ON public.user_diets FOR INSERT TO authenticated
WITH CHECK (
    (user_id = auth.uid() AND public.can_user_create_content('user_custom_diets'))
    OR public.is_admin()
);

CREATE POLICY "Users update own diets"
ON public.user_diets FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users delete own diets"
ON public.user_diets FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- =====================================================
-- 27. USER WORKOUTS
-- =====================================================
DROP POLICY IF EXISTS "User owns workouts or admin" ON public.user_workouts;
DROP POLICY IF EXISTS "Users read own workouts" ON public.user_workouts;
DROP POLICY IF EXISTS "Users insert own workouts with flag check" ON public.user_workouts;
DROP POLICY IF EXISTS "Users update own workouts" ON public.user_workouts;
DROP POLICY IF EXISTS "Users delete own workouts" ON public.user_workouts;

CREATE POLICY "Users read own workouts"
ON public.user_workouts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users insert own workouts with flag check"
ON public.user_workouts FOR INSERT TO authenticated
WITH CHECK (
    (user_id = auth.uid() AND public.can_user_create_content('user_custom_workouts'))
    OR public.is_admin()
);

CREATE POLICY "Users update own workouts"
ON public.user_workouts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users delete own workouts"
ON public.user_workouts FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- =====================================================
-- FIM DA CORREÇÃO DE POLICIES DUPLICADAS
-- =====================================================
