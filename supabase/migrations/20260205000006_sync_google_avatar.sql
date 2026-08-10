-- =====================================================
-- SYNC AVATAR FROM GOOGLE AUTH
-- Arquivo: 20260205000006_sync_google_avatar.sql
-- Objetivo: Garantir que o avatar_url e nome completo do Google sejam sincronizados
-- =====================================================

-- 1. Atualizar a função de trigger para capturar metadados extras
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extrair metadados do provedor (OAuth)
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name');
  v_avatar_url := COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    auth_provider,
    google_id
  )
  VALUES (
    new.id, 
    new.email, 
    v_full_name, 
    v_avatar_url,
    COALESCE(new.raw_app_meta_data->>'provider', 'email'),
    CASE WHEN new.raw_app_meta_data->>'provider' = 'google' THEN new.id::text ELSE null END
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
    
  RETURN new;
END;
$$;

-- 2. Atualizar perfis existentes que podem estar sem foto
UPDATE public.profiles p
SET 
  avatar_url = COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  full_name = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
FROM auth.users u
WHERE p.id = u.id
AND p.avatar_url IS NULL
AND (u.raw_user_meta_data->>'avatar_url' IS NOT NULL OR u.raw_user_meta_data->>'picture' IS NOT NULL);
