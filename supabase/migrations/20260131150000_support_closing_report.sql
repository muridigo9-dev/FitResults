-- ============================================
-- SUPPORT SYSTEM IMPROVEMENTS: CLOSING REPORT & SURVEY
-- ============================================

-- 1. ADD CLOSING FIELDS TO TICKETS
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT;

-- 2. UPDATE SUMMARY VIEW TO INCLUDE THESE FIELDS
DROP VIEW IF EXISTS public.support_tickets_summary;
CREATE VIEW public.support_tickets_summary 
WITH (security_invoker = on)
AS
SELECT 
  t.id,
  t.user_id,
  t.subject,
  t.status,
  t.assigned_admin_id,
  t.created_at,
  t.updated_at,
  t.resolution_notes,
  t.is_resolved,
  t.satisfaction_score,
  t.satisfaction_comment,
  p.full_name AS user_name,
  p.email AS user_email,
  p.avatar_url AS user_avatar,
  ap.full_name AS assigned_admin_name,
  (SELECT COUNT(*) FROM public.support_messages m WHERE m.ticket_id = t.id) AS message_count,
  (SELECT COUNT(*) FROM public.support_messages m WHERE m.ticket_id = t.id AND m.sender_type = 'user') AS user_message_count,
  (
    SELECT m.message FROM public.support_messages m 
    WHERE m.ticket_id = t.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) AS last_message,
  (
    SELECT m.sender_type FROM public.support_messages m 
    WHERE m.ticket_id = t.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) AS last_message_sender,
  (
    SELECT m.created_at FROM public.support_messages m 
    WHERE m.ticket_id = t.id 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) AS last_message_at
FROM public.support_tickets t
LEFT JOIN public.profiles p ON p.id = t.user_id
LEFT JOIN public.profiles ap ON ap.id = t.assigned_admin_id;

-- Grant access to view
GRANT SELECT ON public.support_tickets_summary TO authenticated;
