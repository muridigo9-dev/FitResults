-- Update support notification trigger to notify admins on user replies
-- And ensure notifications are sent correctly

CREATE OR REPLACE FUNCTION public.notify_support_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_user_id UUID;
  ticket_subject TEXT;
  admin_ids UUID[];
  admin_id UUID;
  sender_name TEXT;
BEGIN
  -- 1. Notify User when Admin replies
  IF NEW.sender_type = 'admin' THEN
    -- Get ticket info
    SELECT user_id, subject INTO ticket_user_id, ticket_subject
    FROM public.support_tickets
    WHERE id = NEW.ticket_id;
    
    -- Create notification for user
    INSERT INTO public.in_app_notifications (user_id, title, message, type, action_url)
    VALUES (
      ticket_user_id,
      'Resposta do suporte',
      'Sua mensagem "' || LEFT(ticket_subject, 30) || '..." foi respondida',
      'success',
      '/profile/help'
    );

  -- 2. Notify Admins when User replies
  ELSIF NEW.sender_type = 'user' THEN
    -- Get ticket info
    SELECT subject INTO ticket_subject
    FROM public.support_tickets
    WHERE id = NEW.ticket_id;
    
    -- Get sender name
    SELECT full_name INTO sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Get all admin user IDs
    SELECT array_agg(user_id) INTO admin_ids
    FROM public.user_roles
    WHERE role = 'admin';
    
    -- Create notification for each admin
    IF admin_ids IS NOT NULL THEN
      FOREACH admin_id IN ARRAY admin_ids LOOP
        INSERT INTO public.in_app_notifications (user_id, title, message, type, action_url)
        VALUES (
          admin_id,
          'Nova mensagem de suporte',
          COALESCE(sender_name, 'Usuário') || ' respondeu: ' || ticket_subject,
          'info',
          '/admin/support'
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger is applied
DROP TRIGGER IF EXISTS on_support_reply ON public.support_messages;
CREATE TRIGGER on_support_reply
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_reply();
