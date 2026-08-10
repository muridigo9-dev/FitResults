-- Reload PostgREST schema cache
-- This is necessary when new tables (like diets) are created but not immediately visible to the API
NOTIFY pgrst, 'reload config';
