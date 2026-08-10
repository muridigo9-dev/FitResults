-- ==========================================================
-- Migration: Integrate LGPD with Support System
-- Description: Adds support_ticket_id to lgpd_requests and 
--              automates ticket creation for LGPD info requests.
-- ==========================================================

-- 1. ADD COLUMN TO LGPD_REQUESTS
ALTER TABLE public.lgpd_requests 
ADD COLUMN IF NOT EXISTS support_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_support_ticket ON public.lgpd_requests(support_ticket_id);

-- 2. FUNCTION TO CREATE SUPPORT TICKET FOR LGPD
CREATE OR REPLACE FUNCTION public.handle_lgpd_info_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket_id UUID;
    v_request_type_label TEXT;
BEGIN
    -- Only trigger if status changes to 'requires_info' and no ticket exists yet
    IF (NEW.status = 'requires_info' OR NEW.status = 'under_review') AND NEW.support_ticket_id IS NULL THEN
        
        -- Get a nice label for the request type
        v_request_type_label := CASE NEW.request_type
            WHEN 'data_confirmation' THEN 'Confirmação de Tratamento'
            WHEN 'data_access' THEN 'Acesso aos Dados'
            WHEN 'data_correction' THEN 'Correção de Dados'
            WHEN 'data_portability' THEN 'Portabilidade'
            WHEN 'data_anonymization' THEN 'Anonimização'
            WHEN 'data_deletion' THEN 'Exclusão'
            WHEN 'consent_revocation' THEN 'Revogação de Consentimento'
            ELSE 'Solicitação LGPD'
        END;

        -- Create a support ticket
        INSERT INTO public.support_tickets (
            user_id,
            subject,
            status,
            category,
            priority
        ) VALUES (
            NEW.user_id,
            'Privacidade LGPD: ' || v_request_type_label,
            'replied', -- Status 'replied' because the admin just sent the info request/notes
            'privacy',
            'high'
        ) RETURNING id INTO v_ticket_id;

        -- Link the ticket back to the LGPD request
        NEW.support_ticket_id := v_ticket_id;

        -- Add the initial admin message if there are admin notes
        IF NEW.admin_notes IS NOT NULL AND NEW.admin_notes != '' THEN
            INSERT INTO public.support_messages (
                ticket_id,
                sender_type,
                sender_id,
                message
            ) VALUES (
                v_ticket_id,
                'admin',
                NEW.handled_by,
                NEW.admin_notes
            );
        END IF;

        -- If user message exists, add it as the first message from user
        IF NEW.user_message IS NOT NULL AND NEW.user_message != '' THEN
             INSERT INTO public.support_messages (
                ticket_id,
                sender_type,
                sender_id,
                message,
                created_at
            ) VALUES (
                v_ticket_id,
                'user',
                NEW.user_id,
                NEW.user_message,
                NEW.requested_at
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. TRIGGER FOR LGPD SUPPORT INTEGRATION
DROP TRIGGER IF EXISTS trigger_lgpd_support_integration ON public.lgpd_requests;
CREATE TRIGGER trigger_lgpd_support_integration
    BEFORE UPDATE OF status ON public.lgpd_requests
    FOR EACH ROW
    WHEN (NEW.status IN ('requires_info', 'under_review'))
    EXECUTE FUNCTION public.handle_lgpd_info_request();

-- 4. ENSURE 'privacy' CATEGORY EXISTS IN ANALYTICS (Optional/Check)
-- The category is just a text field in support_tickets, so it's fine.

-- 5. UPDATE EXISTING PENDING REQUESTS IF NEEDED (Manual skip for safety)
-- We don't want to create massive amounts of tickets for old requests.

-- DONE
