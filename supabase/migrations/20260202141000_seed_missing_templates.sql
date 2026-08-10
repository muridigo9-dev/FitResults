-- 2. Seed missing templates
-- This assumes lgpd_update and support_response already exist in notification_event_type

INSERT INTO public.notification_templates (
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
    'Resposta do Suporte',
    'Notifica o usuário quando sua solicitação de suporte é respondida',
    'support_response',
    'both',
    'all',
    'Seu suporte foi respondido! 💬',
    'Assunto: {{subject}}. Clique para ver a resposta.',
    '/profile/help',
    true,
    10
),
(
    'Atualização de Solicitação LGPD',
    'Notifica o usuário sobre o status de sua solicitação de dados (LGPD)',
    'lgpd_update',
    'both',
    'all',
    'Sua solicitação LGPD foi atualizada 🛡️',
    'Status: {{status}}. {{admin_notes}}',
    '/profile/lgpd',
    true,
    10
)
ON CONFLICT (name) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    body_template = EXCLUDED.body_template,
    action_url_template = EXCLUDED.action_url_template;
