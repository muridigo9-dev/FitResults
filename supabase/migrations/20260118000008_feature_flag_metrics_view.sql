-- View for Feature Flag Metrics
-- Aggregates real-time usage data from feature_usage table

CREATE OR REPLACE VIEW public.feature_flag_metrics AS
SELECT
    ff.key,
    ff.description,
    ff.enabled,
    ff.allow_user_content,
    ff.affects,
    ff.updated_at,
    (SELECT COUNT(DISTINCT user_id) FROM public.feature_usage fu WHERE fu.flag_key = ff.key) as total_users,
    (SELECT COUNT(*) FROM public.feature_usage fu WHERE fu.flag_key = ff.key) as total_actions,
    (SELECT COUNT(*) FROM public.feature_usage fu WHERE fu.flag_key = ff.key AND fu.action = 'view') as views,
    (SELECT COUNT(*) FROM public.feature_usage fu WHERE fu.flag_key = ff.key AND fu.action = 'create') as creates,
    (SELECT COUNT(*) FROM public.feature_usage fu WHERE fu.flag_key = ff.key AND fu.action = 'interact') as interactions
FROM public.feature_flags ff;

ALTER VIEW public.feature_flag_metrics OWNER TO postgres;

-- Grant permissions
GRANT SELECT ON public.feature_flag_metrics TO authenticated;

COMMENT ON VIEW public.feature_flag_metrics IS 'Aggregated metrics for feature flags usage';
