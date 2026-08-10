-- Migration: 20260131144000_profile_and_notifications_evolution.sql
-- Description: Evolução do Perfil e Notificações (Usa Enums definidos na migração anterior)
-- Created: 2026-01-31

-- 1. STORAGE: Criar bucket para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576, -- 1MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. STORAGE POLICIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar public access' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Avatar public access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload own avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (
      bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own avatar' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (
      bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- 3. NEW NOTIFICATION TEMPLATES
-- O ID da transação aqui já reconhecerá os valores adicionados na migração 143500
INSERT INTO public.notification_templates (
  name, description, event_type, channel, target_audience, title_template, body_template, action_url_template, priority
) VALUES
  (
    'Cancelamento Rejeitado',
    'Enviado quando o admin nega um pedido de cancelamento',
    'cancellation_rejected',
    'both',
    'specific_user',
    'Solicitação de cancelamento atualizada ⚠️',
    'Sua solicitação de cancelamento foi analisada e não pôde ser processada. Motivo: {{reason}}',
    '/profile/help',
    20
  ),
  (
    'Upgrade de Plano Confirmado',
    'Enviado após alteração de plano',
    'plan_upgrade',
    'both',
    'specific_user',
    'Seu novo plano está ativo! 🚀',
    'Parabéns! Você agora é membro do plano {{plan_name}}.',
    '/daily-summary',
    15
  ),
  (
    'Alerta Administrativo',
    'Mensagem direta do administrador',
    'admin_alert',
    'both',
    'specific_user',
    'Aviso Importante 📢',
    '{{message}}',
    '{{action_url}}',
    25
  )
ON CONFLICT (name) DO NOTHING;

-- 4. UNIFIED NOTIFICATION FUNCTION
CREATE OR REPLACE FUNCTION public.send_templated_notification(
  p_user_id UUID,
  p_event_type public.notification_event_type,
  p_variables JSONB DEFAULT '{}'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_template public.notification_templates;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
  v_notif_id UUID;
BEGIN
  v_template := public.get_notification_template_for_user(p_event_type, p_user_id);
  IF v_template.id IS NULL THEN RETURN NULL; END IF;

  v_title := public.render_notification_template(v_template.title_template, p_variables);
  v_body := public.render_notification_template(v_template.body_template, p_variables);
  v_url := public.render_notification_template(v_template.action_url_template, p_variables);

  INSERT INTO public.in_app_notifications (user_id, title, message, type, action_url)
  VALUES (p_user_id, v_title, v_body, 'info', v_url)
  RETURNING id INTO v_notif_id;

  INSERT INTO public.notification_logs (template_id, event_type, user_id, title, body, action_url, channel, status, in_app_notification_id, metadata)
  VALUES (v_template.id, p_event_type, p_user_id, v_title, v_body, v_url, v_template.channel, 'sent', v_notif_id, p_metadata);

  RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. UPDATE CANCELLATION TRIGGER
CREATE OR REPLACE FUNCTION public.notify_cancellation_processed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'rejected') THEN
    IF NEW.status = 'rejected' THEN
      PERFORM public.send_templated_notification(
        NEW.user_id,
        'cancellation_rejected',
        jsonb_build_object('reason', COALESCE(NEW.admin_notes, 'Critérios internos não atendidos'))
      );
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.in_app_notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'Cancelamento Processado', 'Sua conta foi cancelada com sucesso.', 'info');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. PLAN FEATURE COMPARISON VIEW (UPDATED WITH PRICE_ID)
CREATE OR REPLACE VIEW public.vw_plan_comparisons AS
WITH all_plans AS (
    SELECT id, name, description, display_order FROM public.plans WHERE is_active = true
),
plan_feat_agg AS (
    SELECT 
        plan_id,
        jsonb_object_agg(feature_key, enabled) as feature_map
    FROM public.plan_features
    GROUP BY plan_id
),
plan_price_single AS (
    -- Pegamos o primeiro preço ativo de cada plano (geralmente o mensal)
    -- Isso permite que o frontend inicie o fluxo de upgrade/checkout
    SELECT DISTINCT ON (plan_id) 
        plan_id, 
        price_id,
        interval,
        display_price,
        display_currency
    FROM public.plan_prices 
    WHERE is_active = true 
    ORDER BY plan_id, display_price ASC
)
SELECT 
    p.id as plan_id,
    p.name as plan_name,
    p.description,
    p.display_order,
    COALESCE(fa.feature_map, '{}'::jsonb) as features,
    pp.price_id,
    pp.interval as price_interval,
    pp.display_price,
    pp.display_currency
FROM all_plans p
LEFT JOIN plan_feat_agg fa ON fa.plan_id = p.id
LEFT JOIN plan_price_single pp ON pp.plan_id = p.id;

GRANT SELECT ON public.vw_plan_comparisons TO authenticated;
