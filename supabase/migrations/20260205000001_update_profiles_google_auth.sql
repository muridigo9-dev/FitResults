-- =====================================================
-- UPDATE PROFILES FOR GOOGLE AUTH
-- Arquivo: 20260205000001_update_profiles_google_auth.sql
-- Objetivo: Suporte a múltiplos provedores de auth e ID do Google
-- =====================================================

-- 1. Adicionar coluna auth_provider se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'auth_provider') THEN
        ALTER TABLE public.profiles ADD COLUMN auth_provider TEXT DEFAULT 'email';
    END IF;
END $$;

-- 2. Adicionar coluna google_id se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'google_id') THEN
        ALTER TABLE public.profiles ADD COLUMN google_id TEXT;
    END IF;
END $$;

-- 3. Criar índice único para google_id (evitar duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_google_id ON public.profiles (google_id) WHERE google_id IS NOT NULL;

-- 4. Criar índice para busca por auth_provider
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles (auth_provider);
