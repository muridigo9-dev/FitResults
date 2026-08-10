-- Remove a trava de duplicidade para permitir comer o mesmo prato várias vezes na tabela de diário
-- Isso permite que o usuário repita o mesmo alimento (reference_id) no mesmo dia (date)
ALTER TABLE public.diary_entries DROP CONSTRAINT IF EXISTS diary_entries_user_id_date_reference_id_key;
DROP INDEX IF EXISTS public.idx_diary_entries_user_date_ref;
