-- ============================================================
-- STORAGE POLICIES - WORKOUTS MEDIA
-- ============================================================
-- Permite que usuários autenticados façam upload de imagens para treinos

-- Habilitar RLS no bucket se não estiver habilitado (geralmente é por tabela objects)
-- Mas vamos focar nas policies da tabela storage.objects

-- Policy para INSERT (Upload)
DROP POLICY IF EXISTS "Authenticated users can upload workout media" ON storage.objects;
CREATE POLICY "Authenticated users can upload workout media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workouts-media'
);

-- Policy para UPDATE
DROP POLICY IF EXISTS "Authenticated users can update workout media" ON storage.objects;
CREATE POLICY "Authenticated users can update workout media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'workouts-media');

-- Policy para DELETE
DROP POLICY IF EXISTS "Authenticated users can delete workout media" ON storage.objects;
CREATE POLICY "Authenticated users can delete workout media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'workouts-media');

-- Policy para SELECT (Público)
DROP POLICY IF EXISTS "Public can view workout media" ON storage.objects;
CREATE POLICY "Public can view workout media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'workouts-media');

-- ============================================================
-- GARANTIR BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('workouts-media', 'workouts-media', true)
ON CONFLICT (id) DO NOTHING;

-- Repetir para exercises-media se necessário
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercises-media', 'exercises-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view exercises media" ON storage.objects;
CREATE POLICY "Public can view exercises media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'exercises-media');
