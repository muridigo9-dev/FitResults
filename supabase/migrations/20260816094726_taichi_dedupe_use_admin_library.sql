-- ============================================
-- CONSOLIDATE THE TAI CHI LIBRARY ON THE ADMIN-AUTHORED MOVEMENTS
-- ============================================
-- Description: 20260816090431_tai_chi_content.sql seeded a slugged Tai Chi
--              library, not knowing this database already held 20 equivalent
--              movements created through the admin panel (slug NULL). That left
--              near-duplicate pairs in the exercise picker. This keeps the
--              admin-authored set as the single library, rebuilds the four Tai
--              Chi workouts against it, and drops the seeded duplicates.
-- Created: 2026-08-16
-- Idempotent: Safe to run multiple times
-- Dependencies: 20260816090431_tai_chi_content.sql,
--               20260816090847_translate_existing_admin_content.sql

-- 1. Clear the seeded workout rows so they can be rebuilt against the kept library
DELETE FROM public.workout_exercises
WHERE workout_id IN (
  '7a1c4100-0000-4000-a000-000000000001',
  '7a1c4100-0000-4000-a000-000000000002',
  '7a1c4100-0000-4000-a000-000000000003',
  '7a1c4100-0000-4000-a000-000000000004'
);

-- 2. Rebuild, pointing at the admin-authored movements (matched by name).
--    Still time-based: a Tai Chi movement is held for a span, not counted in reps.
INSERT INTO public.workout_exercises (
  workout_id, exercise_id, name, name_en, name_es,
  description, description_en, description_es,
  sets, reps, execution_type, duration_seconds,
  rest_seconds, rest_type, exercise_order
)
SELECT
  p.workout_id, e.id, e.name, e.name_en, e.name_es,
  e.description, e.description_en, e.description_es,
  p.sets, NULL, 'time'::execution_type, p.duration_seconds,
  p.rest_seconds, 'individual', p.exercise_order
FROM (VALUES
  -- Fundamentos (~20 min)
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'Postura Preparatória do Tai Chi', 1, 1, 120, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'Respiração Abdominal Natural',    2, 1, 180, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'Círculos de Ombros e Braços',     3, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'Abertura do Peito com Respiração',4, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'Transferência de Peso Lateral',   5, 3, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'Abertura',                        6, 3,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'Encerrar e Acalmar',              7, 1, 120, 30),

  -- Forma Curta de 8 Movimentos (~25 min)
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Abertura',                        1, 1,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Agarrar a Cauda do Pardal',       2, 2, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Chicote Simples',                 3, 2,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Mãos como Nuvens',                4, 3, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Puxar a Seda',                    5, 2, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Escovar o Joelho',                6, 2, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Pressionar e Recolher',           7, 2,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Forma Curta de Tai Chi',          8, 1, 180, 60),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'Encerrar e Acalmar',              9, 1,  90, 30),

  -- Qi Gong Matinal (~15 min)
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'Respiração Abdominal Natural',    1, 1, 120, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'Levantar as Mãos',                2, 3,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'Abertura do Peito com Respiração',3, 3,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'Círculos de Ombros e Braços',     4, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'Girar a Cintura Suavemente',      5, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'Encerrar e Acalmar',              6, 1, 120, 30),

  -- Equilíbrio e Centro (~30 min)
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Postura Preparatória do Tai Chi', 1, 1, 120, 30),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Transferência de Peso Lateral',   2, 3,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Passo Vazio e Cheio',             3, 3,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Galo Dourado em Uma Perna',       4, 4,  60, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Chutar com Calcanhar',            5, 3,  90, 60),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Escovar o Joelho',                6, 3, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Empurrar a Água',                 7, 2,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'Encerrar e Acalmar',              8, 1,  90, 30)
) AS p(workout_id, exercise_name, exercise_order, sets, duration_seconds, rest_seconds)
JOIN public.exercises e
  ON e.name = p.exercise_name
 AND e.slug IS NULL;

-- 3. Remove the seeded duplicate library (exercise_muscle_groups cascades)
DELETE FROM public.exercises WHERE slug LIKE 'tai-chi-%';

NOTIFY pgrst, 'reload schema';
