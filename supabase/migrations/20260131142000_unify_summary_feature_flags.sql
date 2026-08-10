-- Migration: 20260131142000_unify_summary_feature_flags.sql
-- Description: Unifica 'daily_summary_enabled' em 'summary_enabled' com correção de trigger e FK.
-- Created: 2026-01-31

DO $$
DECLARE
    v_daily_flag_exists BOOLEAN;
    v_summary_flag_exists BOOLEAN;
BEGIN
    -- 1. Verificar existência
    SELECT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'daily_summary_enabled') INTO v_daily_flag_exists;
    SELECT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'summary_enabled') INTO v_summary_flag_exists;

    -- 2. Garantir que 'summary_enabled' existe
    IF NOT v_summary_flag_exists THEN
        INSERT INTO public.feature_flags (key, description, enabled, affects)
        VALUES ('summary_enabled', 'Habilita o módulo de Evolução (Resumo consolidado)', true, '["summary"]'::jsonb)
        ON CONFLICT (key) DO NOTHING;
    END IF;

    -- 3. MIGRAR DADOS
    IF v_daily_flag_exists THEN
        -- Garantir permissões de plano
        INSERT INTO public.plan_features (plan_id, feature_key, enabled)
        SELECT plan_id, 'summary_enabled', enabled
        FROM public.plan_features
        WHERE feature_key = 'daily_summary_enabled'
        ON CONFLICT (plan_id, feature_key) DO UPDATE 
        SET enabled = EXCLUDED.enabled OR public.plan_features.enabled;

        -- 4. LIMPEZA SEGURA (Desabilita trigger para evitar erro de FK no log de delete)
        -- O erro ocorre porque o trigger AFTER DELETE tenta inserir um ID que não existe mais na tabela pai
        ALTER TABLE public.feature_flags DISABLE TRIGGER feature_flag_audit_trigger;
        
        DELETE FROM public.plan_features WHERE feature_key = 'daily_summary_enabled';
        DELETE FROM public.feature_usage WHERE flag_key = 'daily_summary_enabled';
        DELETE FROM public.feature_flag_audit WHERE flag_key = 'daily_summary_enabled';
        DELETE FROM public.feature_flags WHERE key = 'daily_summary_enabled';

        ALTER TABLE public.feature_flags ENABLE TRIGGER feature_flag_audit_trigger;

        RAISE NOTICE 'Sucesso: daily_summary_enabled removido com triggers tratados.';
    END IF;
END $$;
