-- Add image columns to muscle_groups table
ALTER TABLE muscle_groups 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Grant permissions (if needed, though usually covered by table grants)
GRANT ALL ON TABLE muscle_groups TO authenticated;
GRANT ALL ON TABLE muscle_groups TO service_role;
