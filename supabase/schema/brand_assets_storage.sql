-- Bucket para armazenar assets de branding (logo, favicon, etc)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para brand-assets

-- Qualquer pessoa pode ver os assets de branding (público)
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Apenas admins podem fazer upload de assets
CREATE POLICY "Admins can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-assets' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Apenas admins podem atualizar assets
CREATE POLICY "Admins can update brand assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-assets' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Apenas admins podem deletar assets
CREATE POLICY "Admins can delete brand assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-assets' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
