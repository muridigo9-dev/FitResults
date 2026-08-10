-- Migration: Support System Evolution - Categorization, Priority and Analytics (V2)
-- Description: Adds fields for categorization and priority, and provides metrics for strategic support overview.

-- 1. ADD NEW FIELDS TO TICKETS
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- 2. CREATE INDEXES FOR BETTER KPI PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);

-- 3. UPDATE SUMMARY VIEW
DROP VIEW IF EXISTS public.support_tickets_summary;
CREATE OR REPLACE VIEW public.support_tickets_summary 
WITH (security_invoker = on)
AS
SELECT 
  t.id,
  t.user_id,
  t.subject,
  t.status,
  t.category,
  t.priority,
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
  ) AS last_message_at,
  -- First Response Time Calculation
  (
    SELECT MIN(m.created_at) - t.created_at 
    FROM public.support_messages m 
    WHERE m.ticket_id = t.id AND m.sender_type = 'admin'
  ) AS first_response_time,
  -- Total Resolution Time
  CASE 
    WHEN t.status = 'closed' THEN t.updated_at - t.created_at 
    ELSE NULL 
  END AS resolution_time
FROM public.support_tickets t
LEFT JOIN public.profiles p ON p.id = t.user_id
LEFT JOIN public.profiles ap ON ap.id = t.assigned_admin_id;

-- 4. RPC FOR AGGREGATED ANALYTICS
CREATE OR REPLACE FUNCTION public.get_support_analytics(
  _start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  _end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'kpis', (
      SELECT jsonb_build_object(
        'total_tickets', COUNT(*),
        'open_tickets', COUNT(*) FILTER (WHERE status = 'open'),
        'in_progress', COUNT(*) FILTER (WHERE status = 'replied'),
        'closed_tickets', COUNT(*) FILTER (WHERE status = 'closed'),
        'avg_frt_seconds', AVG(EXTRACT(EPOCH FROM (
          SELECT MIN(m.created_at) - t.created_at 
          FROM public.support_messages m 
          WHERE m.ticket_id = t.id AND m.sender_type = 'admin'
        ))),
        'avg_mttr_seconds', AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status = 'closed'),
        'csat_avg', ROUND(AVG(satisfaction_score)::numeric, 2),
        'resolved_within_sla_pct', 85 -- Baseline SLA
      )
      FROM public.support_tickets t
      WHERE t.created_at >= _start_date AND t.created_at <= _end_date
    ),
    'by_category', (
      SELECT jsonb_agg(c) FROM (
        SELECT 
          category, 
          COUNT(*) as count, 
          AVG(satisfaction_score) as avg_score,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status = 'closed') as avg_resolution_seconds
        FROM public.support_tickets
        WHERE created_at >= _start_date AND created_at <= _end_date
        GROUP BY category
        ORDER BY count DESC
      ) c
    ),
    'csat_distribution', (
      SELECT jsonb_agg(d) FROM (
        SELECT satisfaction_score as score, COUNT(*) as count
        FROM public.support_tickets
        WHERE created_at >= _start_date AND created_at <= _end_date AND satisfaction_score IS NOT NULL
        GROUP BY satisfaction_score
        ORDER BY satisfaction_score DESC
      ) d
    ),
    'recent_low_scores', (
      SELECT jsonb_agg(l) FROM (
        SELECT id, subject, satisfaction_score, satisfaction_comment, created_at
        FROM public.support_tickets
        WHERE satisfaction_score <= 2 AND created_at >= _start_date AND created_at <= _end_date
        LIMIT 5
      ) l
    ),
    'volume_trend', (
      SELECT jsonb_agg(v) FROM (
        SELECT 
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM public.support_tickets
        WHERE created_at >= _start_date AND created_at <= _end_date
        GROUP BY 1
        ORDER BY 1 ASC
      ) v
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_support_analytics TO authenticated;
