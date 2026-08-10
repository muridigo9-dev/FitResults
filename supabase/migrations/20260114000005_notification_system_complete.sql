-- ============================================
-- SISTEMA COMPLETO DE NOTIFICAÇÕES
-- ============================================
-- Sistema extensível de notificações com templates,
-- logs, rastreamento e painel administrativo
-- Created: 2026-01-14

-- ============================================
-- NOTIFICATION TEMPLATES
-- ============================================
-- Templates configuráveis para diferentes tipos de notificações

CREATE TYPE notification_event_type AS ENUM (
  'workout_assigned',
  'diet_assigned',
  'challenge_created',
  'challenge_completed',
  'trainer_message',
  'academy_invite',
  'personal_invite',
  'checkin_reminder',
  'plan_changed',
  'achievement_unlocked',
  'new_content',
  'support_response',
  'cancellation_approved',
  'custom'
);

CREATE TYPE notification_channel AS ENUM (
  'push',
  'in_app',
  'both'
);

CREATE TYPE notification_target_audience AS ENUM (
  'all',
  'by_role',
  'by_plan',
  'by_feature_flag',
  'specific_user'
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  event_type notification_event_type NOT NULL,
  
  -- Configuration
  channel notification_channel NOT NULL DEFAULT 'both',
  target_audience notification_target_audience NOT NULL DEFAULT 'all',
  target_roles TEXT[], -- array of roles if by_role
  target_plans TEXT[], -- array of plans if by_plan
  required_feature_flags TEXT[], -- array of feature flags
  
  -- Template content (supports variables like {{user_name}}, {{content_name}}, etc)
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  action_url_template TEXT, -- deep link template
  icon_url TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- higher = more important
  throttle_minutes INTEGER DEFAULT 0, -- min minutes between same notification type
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_event_type 
ON notification_templates(event_type);

CREATE INDEX IF NOT EXISTS idx_notification_templates_active 
ON notification_templates(is_active);

-- ============================================
-- NOTIFICATION LOGS
-- ============================================
-- Track all notification attempts (success and failures)

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  event_type notification_event_type NOT NULL,
  
  -- Target
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content (rendered from template)
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  
  -- Delivery
  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  
  -- Push specific
  push_sent_at TIMESTAMPTZ,
  push_error TEXT,
  
  -- In-app specific
  in_app_notification_id UUID REFERENCES in_app_notifications(id) ON DELETE SET NULL,
  in_app_sent_at TIMESTAMPTZ,
  in_app_error TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- event-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id 
ON notification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_template_id 
ON notification_logs(template_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type 
ON notification_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
ON notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at 
ON notification_logs(created_at DESC);

-- ============================================
-- NOTIFICATION THROTTLE
-- ============================================
-- Prevent spam by tracking recent notifications

CREATE TABLE IF NOT EXISTS notification_throttle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type notification_event_type NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_throttle_user_event 
ON notification_throttle(user_id, event_type, last_sent_at);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Notification Templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage notification templates"
ON notification_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Everyone can read active templates (for UI)
CREATE POLICY "Everyone can read active templates"
ON notification_templates FOR SELECT
USING (is_active = true);

-- Notification Logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can see all logs
CREATE POLICY "Admins can view all logs"
ON notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Users can see their own logs
CREATE POLICY "Users can view own logs"
ON notification_logs FOR SELECT
USING (user_id = auth.uid());

-- System can insert logs
CREATE POLICY "System can insert logs"
ON notification_logs FOR INSERT
WITH CHECK (true);

-- Notification Throttle
ALTER TABLE notification_throttle ENABLE ROW LEVEL SECURITY;

-- System can manage throttle
CREATE POLICY "System can manage throttle"
ON notification_throttle FOR ALL
WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER trg_notification_templates_updated_at
BEFORE UPDATE ON notification_templates
FOR EACH ROW EXECUTE FUNCTION update_notification_templates_updated_at();

-- ============================================
-- RENDER TEMPLATE FUNCTION
-- ============================================
-- Replaces variables in template with actual values

CREATE OR REPLACE FUNCTION render_notification_template(
  template_text TEXT,
  variables JSONB
) RETURNS TEXT AS $$
DECLARE
  result TEXT;
  key TEXT;
  value TEXT;
BEGIN
  result := template_text;
  
  FOR key, value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    result := REPLACE(result, '{{' || key || '}}', value);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- CHECK THROTTLE FUNCTION
-- ============================================
-- Check if notification can be sent based on throttle

CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_event_type notification_event_type,
  p_throttle_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  last_sent TIMESTAMPTZ;
BEGIN
  -- No throttle, always send
  IF p_throttle_minutes = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Check last sent time
  SELECT last_sent_at INTO last_sent
  FROM notification_throttle
  WHERE user_id = p_user_id 
    AND event_type = p_event_type;
  
  -- Never sent before
  IF last_sent IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if enough time has passed
  RETURN (NOW() - last_sent) >= (p_throttle_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE THROTTLE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_notification_throttle(
  p_user_id UUID,
  p_event_type notification_event_type
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_throttle (user_id, event_type, last_sent_at)
  VALUES (p_user_id, p_event_type, NOW())
  ON CONFLICT (user_id, event_type)
  DO UPDATE SET last_sent_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GET NOTIFICATION TEMPLATE FUNCTION
-- ============================================
-- Get active template for event type with target audience check

CREATE OR REPLACE FUNCTION get_notification_template_for_user(
  p_event_type notification_event_type,
  p_user_id UUID
) RETURNS notification_templates AS $$
DECLARE
  template notification_templates;
  user_role TEXT;
  user_plan TEXT;
BEGIN
  -- Get user role and plan
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  SELECT subscription_plan INTO user_plan
  FROM profiles
  WHERE id = p_user_id;
  
  -- Find matching active template
  SELECT * INTO template
  FROM notification_templates
  WHERE event_type = p_event_type
    AND is_active = true
    AND (
      target_audience = 'all'
      OR (target_audience = 'by_role' AND user_role = ANY(target_roles))
      OR (target_audience = 'by_plan' AND user_plan = ANY(target_plans))
      OR (target_audience = 'specific_user')
    )
  ORDER BY priority DESC
  LIMIT 1;
  
  RETURN template;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DEFAULT TEMPLATES
-- ============================================

INSERT INTO notification_templates (
  name,
  description,
  event_type,
  channel,
  target_audience,
  title_template,
  body_template,
  action_url_template,
  is_active,
  priority
) VALUES
  (
    'Novo Treino Atribuído',
    'Notifica quando um novo treino é atribuído ao usuário',
    'workout_assigned',
    'both',
    'all',
    'Novo treino disponível! 💪',
    '{{trainer_name}} atribuiu um novo treino para você: {{workout_name}}',
    '/workouts/{{workout_id}}',
    true,
    10
  ),
  (
    'Nova Dieta Atribuída',
    'Notifica quando uma nova dieta é atribuída ao usuário',
    'diet_assigned',
    'both',
    'all',
    'Nova dieta disponível! 🥗',
    '{{trainer_name}} criou uma nova dieta para você: {{diet_name}}',
    '/diets/{{diet_id}}',
    true,
    10
  ),
  (
    'Novo Desafio',
    'Notifica quando um novo desafio é criado',
    'challenge_created',
    'both',
    'all',
    'Novo desafio disponível! 🏆',
    'Participe do desafio: {{challenge_name}}',
    '/challenges/{{challenge_id}}',
    true,
    8
  ),
  (
    'Desafio Concluído',
    'Notifica quando usuário completa um desafio',
    'challenge_completed',
    'both',
    'all',
    'Parabéns! Desafio concluído! 🎉',
    'Você completou o desafio {{challenge_name}} e ganhou {{points}} pontos!',
    '/progress',
    true,
    9
  ),
  (
    'Mensagem do Personal',
    'Notifica quando personal envia mensagem',
    'trainer_message',
    'both',
    'all',
    'Nova mensagem de {{trainer_name}} 💬',
    '{{message_preview}}',
    '/trainer/chat',
    true,
    10
  ),
  (
    'Convite para Academia',
    'Notifica quando usuário recebe convite de academia',
    'academy_invite',
    'both',
    'all',
    'Convite para Academia 🏋️',
    '{{academy_name}} convidou você para participar!',
    '/accept-invite',
    true,
    10
  ),
  (
    'Lembrete de Check-in',
    'Lembra usuário de fazer check-in diário',
    'checkin_reminder',
    'both',
    'all',
    'Não esqueça seu check-in hoje! ⏰',
    'Registre seu progresso e mantenha sua sequência!',
    '/checkin',
    true,
    5
  ),
  (
    'Conquista Desbloqueada',
    'Notifica quando usuário desbloqueia conquista',
    'achievement_unlocked',
    'both',
    'all',
    'Nova conquista desbloqueada! 🏅',
    'Parabéns! Você desbloqueou: {{achievement_name}}',
    '/progress',
    true,
    8
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE notification_templates IS 'Templates configuráveis para notificações do sistema';
COMMENT ON TABLE notification_logs IS 'Log de todas as notificações enviadas ou tentadas';
COMMENT ON TABLE notification_throttle IS 'Controle de throttle para evitar spam de notificações';

COMMENT ON FUNCTION render_notification_template(TEXT, JSONB) IS 'Renderiza template substituindo variáveis';
COMMENT ON FUNCTION should_send_notification(UUID, notification_event_type, INTEGER) IS 'Verifica se notificação pode ser enviada baseado em throttle';
COMMENT ON FUNCTION get_notification_template_for_user(notification_event_type, UUID) IS 'Retorna template ativo para evento e usuário específico';
