-- ================================================
-- EMAIL SYSTEM MIGRATION
-- ================================================

-- ==========================================
-- 1. EMAIL TEMPLATE TYPE ENUM
-- ==========================================
DO $$ BEGIN
    CREATE TYPE public.email_template_type AS ENUM (
        'welcome',
        'general_notification',
        'cancellation_request_received',
        'cancellation_processed',
        'support_reply',
        'password_reset',
        'subscription_renewal',
        'trial_expiring',
        'payment_failed',
        'subscription_reactivated',
        'custom'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Se o tipo já existe, adicionar os novos valores
DO $$ BEGIN
    ALTER TYPE public.email_template_type ADD VALUE IF NOT EXISTS 'payment_failed';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE public.email_template_type ADD VALUE IF NOT EXISTS 'subscription_reactivated';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. EMAIL SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.email_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_encrypted text,
    api_key_hint text,
    sender_name text NOT NULL DEFAULT 'App',
    sender_email text NOT NULL DEFAULT 'onboarding@resend.dev',
    is_enabled boolean NOT NULL DEFAULT false,
    test_email_address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Garante apenas uma linha de configuração
CREATE UNIQUE INDEX IF NOT EXISTS email_settings_singleton ON public.email_settings ((true));

-- RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages email settings" ON public.email_settings;
CREATE POLICY "Admin manages email settings" ON public.email_settings
    FOR ALL TO authenticated
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- ==========================================
-- 3. EMAIL TEMPLATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type public.email_template_type NOT NULL DEFAULT 'custom',
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text,
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages email templates" ON public.email_templates;
CREATE POLICY "Admin manages email templates" ON public.email_templates
    FOR ALL TO authenticated
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());

-- ==========================================
-- 4. EMAIL LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email text NOT NULL,
    template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
    template_type public.email_template_type,
    subject text NOT NULL,
    status text NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    error_message text,
    resend_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    sent_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads email logs" ON public.email_logs;
CREATE POLICY "Admin reads email logs" ON public.email_logs
    FOR SELECT TO authenticated 
    USING (public.is_admin());

DROP POLICY IF EXISTS "Service inserts email logs" ON public.email_logs;
CREATE POLICY "Service inserts email logs" ON public.email_logs
    FOR INSERT TO authenticated 
    WITH CHECK (true);

-- ==========================================
-- 5. INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active);

-- ==========================================
-- 6. HELPER FUNCTIONS
-- ==========================================

-- Função para buscar template ativo por tipo
CREATE OR REPLACE FUNCTION public.get_email_template(template_type public.email_template_type)
RETURNS TABLE (
    id uuid,
    name text,
    subject text,
    body_html text,
    body_text text,
    variables jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, name, subject, body_html, body_text, variables
    FROM public.email_templates
    WHERE type = template_type AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;
$$;

-- Função para registrar envio de email
CREATE OR REPLACE FUNCTION public.log_email_send(
    p_user_id uuid,
    p_user_email text,
    p_template_id uuid,
    p_template_type public.email_template_type,
    p_subject text,
    p_status text,
    p_error_message text DEFAULT NULL,
    p_resend_id text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.email_logs (
        user_id, user_email, template_id, template_type, 
        subject, status, error_message, resend_id, metadata
    )
    VALUES (
        p_user_id, p_user_email, p_template_id, p_template_type,
        p_subject, p_status, p_error_message, p_resend_id, p_metadata
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_email_template(public.email_template_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_template(public.email_template_type) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_email_send(uuid, text, uuid, public.email_template_type, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_email_send(uuid, text, uuid, public.email_template_type, text, text, text, text, jsonb) TO service_role;

-- ==========================================
-- 7. TRIGGER PARA updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_templates_updated_at();

DROP TRIGGER IF EXISTS update_email_settings_updated_at ON public.email_settings;
CREATE TRIGGER update_email_settings_updated_at
    BEFORE UPDATE ON public.email_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_templates_updated_at();

-- ==========================================
-- 8. DEFAULT TEMPLATES
-- ==========================================

-- Limpar templates existentes para evitar duplicatas
DELETE FROM public.email_templates WHERE type IN (
    'welcome', 
    'payment_failed', 
    'subscription_reactivated',
    'cancellation_request_received',
    'cancellation_processed',
    'support_reply',
    'general_notification'
);

-- Template: Welcome (com link de definição de senha)
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
VALUES (
    'Boas-vindas (Definir Senha)',
    'welcome',
    'Bem-vindo(a) ao {{app_name}}! Defina sua senha para acessar',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Bem-vindo(a), {{user_name}}!</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Sua conta no <strong>{{app_name}}</strong> foi criada com sucesso!</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Para acessar sua conta, você precisa definir uma senha segura.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{password_reset_link}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Definir minha senha
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Este link expira em <strong>24 horas</strong>. Se você não solicitou esta conta, ignore este email.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;"><strong>O que você pode fazer:</strong></p>
            <ul style="color: #374151; font-size: 14px; line-height: 1.8;">
                <li>Acompanhar seu progresso diário</li>
                <li>Descobrir dietas personalizadas</li>
                <li>Realizar treinos adaptados ao seu perfil</li>
            </ul>
            
            <p style="color: #374151; font-size: 16px; margin-top: 30px;">Abraços,<br><strong>Equipe {{app_name}}</strong></p>
        </div>
    </div>',
    'Bem-vindo(a), {{user_name}}! Sua conta no {{app_name}} foi criada. Clique no link para definir sua senha: {{password_reset_link}}',
    '["user_name", "app_name", "user_email", "password_reset_link"]'::jsonb
);

-- Template: Payment Failed
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
VALUES (
    'Pagamento Falhou',
    'payment_failed',
    'Problema com seu pagamento - {{app_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Houve um problema com seu pagamento</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Olá, <strong>{{user_name}}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Infelizmente, não conseguimos processar o pagamento da sua assinatura do <strong>{{app_name}}</strong>.</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #991b1b; margin: 0; font-size: 14px;"><strong>Importante:</strong> Sua conta pode ser suspensa se o pagamento não for regularizado.</p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Isso pode ter acontecido por:</p>
            <ul style="color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Cartão expirado ou com limite insuficiente</li>
                <li>Dados do cartão desatualizados</li>
                <li>Bloqueio temporário pelo banco</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{billing_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Atualizar método de pagamento
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Se precisar de ajuda, responda este email ou acesse nosso suporte.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #374151; font-size: 14px;">Atenciosamente,<br><strong>Equipe {{app_name}}</strong></p>
        </div>
    </div>',
    'Olá {{user_name}}, houve um problema com seu pagamento no {{app_name}}. Por favor, atualize seu método de pagamento em: {{billing_url}}',
    '["user_name", "app_name", "user_email", "billing_url"]'::jsonb
);

-- Template: Subscription Reactivated
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
VALUES (
    'Assinatura Reativada',
    'subscription_reactivated',
    'Sua assinatura foi reativada! - {{app_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Bem-vindo(a) de volta!</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Olá, <strong>{{user_name}}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Sua assinatura do <strong>{{app_name}}</strong> foi reativada com sucesso!</p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #065f46; margin: 0; font-size: 14px;">Seu acesso a todos os recursos está liberado.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Acessar minha conta
                </a>
            </div>
            
            <p style="color: #374151; font-size: 16px; margin-top: 30px;">Obrigado por continuar conosco!<br><strong>Equipe {{app_name}}</strong></p>
        </div>
    </div>',
    'Olá {{user_name}}, sua assinatura do {{app_name}} foi reativada! Acesse sua conta em: {{dashboard_url}}',
    '["user_name", "app_name", "user_email", "dashboard_url"]'::jsonb
);

-- Template: Cancellation Request Received
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
VALUES (
    'Solicitação de Cancelamento Recebida',
    'cancellation_request_received',
    'Recebemos sua solicitação de cancelamento - {{app_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Olá, {{user_name}}</h1>
        <p>Recebemos sua solicitação de cancelamento de conta.</p>
        <p><strong>Status:</strong> Em análise</p>
        <p>Nossa equipe entrará em contato em até <strong>48 horas úteis</strong> para entender melhor sua situação e verificar se podemos ajudá-lo de alguma forma.</p>
        <p>Se você tiver alguma dúvida ou quiser conversar antes, responda este e-mail.</p>
        <p>Atenciosamente,<br>Equipe {{app_name}}</p>
    </div>',
    'Olá {{user_name}}, recebemos sua solicitação de cancelamento. Nossa equipe entrará em contato em até 48h.',
    '["user_name", "app_name", "user_email"]'::jsonb
);

-- Template: Cancellation Processed
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
VALUES (
    'Cancelamento Processado',
    'cancellation_processed',
    'Sua conta foi cancelada - {{app_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Olá, {{user_name}}</h1>
        <p>Confirmamos o cancelamento da sua conta no <strong>{{app_name}}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Data efetiva:</strong> {{cancellation_date}}</p>
            <p><strong>Cobranças futuras:</strong> Nenhuma cobrança adicional será realizada.</p>
        </div>
        <p>Sentimos muito por sua saída. Se mudar de ideia, estaremos sempre de portas abertas para recebê-lo novamente.</p>
        <p>Para qualquer dúvida, entre em contato conosco.</p>
        <p>Atenciosamente,<br>Equipe {{app_name}}</p>
    </div>',
    'Olá {{user_name}}, confirmamos o cancelamento da sua conta. Data efetiva: {{cancellation_date}}. Nenhuma cobrança futura será realizada.',
    '["user_name", "app_name", "user_email", "cancellation_date"]'::jsonb
);

-- Template: Support Reply
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
VALUES (
    'Resposta do Suporte',
    'support_reply',
    'Re: {{ticket_subject}} - {{app_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Olá, {{user_name}}</h1>
        <p>Recebemos uma resposta ao seu ticket de suporte:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Assunto:</strong> {{ticket_subject}}</p>
            <p><strong>Resposta:</strong></p>
            <p>{{reply_message}}</p>
        </div>
        <p>Para responder, basta acessar sua área de suporte no app.</p>
        <p>Atenciosamente,<br>Equipe {{app_name}}</p>
    </div>',
    'Olá {{user_name}}, recebemos uma resposta ao seu ticket: {{ticket_subject}}. Resposta: {{reply_message}}',
    '["user_name", "app_name", "user_email", "ticket_subject", "reply_message"]'::jsonb
);

-- Template: General Notification
INSERT INTO public.email_templates (name, type, subject, body_html, body_text, variables)
VALUES (
    'Notificação Geral',
    'general_notification',
    '{{subject}} - {{app_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Olá, {{user_name}}</h1>
        <div style="padding: 15px 0;">
            {{message}}
        </div>
        <p>Atenciosamente,<br>Equipe {{app_name}}</p>
    </div>',
    'Olá {{user_name}}, {{message}}',
    '["user_name", "app_name", "user_email", "subject", "message"]'::jsonb
);
