-- ============================================
-- ENGLISH / SPANISH TRANSLATIONS FOR SEEDED TRAINING CONTENT
-- ============================================
-- Description: Fills the _en / _es columns for the exercise library seeded by
--              20260114000022_workout_seed_data.sql, plus the muscle group and
--              taxonomy labels. COALESCE keeps anything an admin already typed:
--              this only fills gaps, so it is safe to re-run.
-- Created: 2026-08-16
-- Idempotent: Safe to run multiple times
-- Dependencies: 20260816090138_content_i18n_columns.sql

-- ============================================
-- 1. MUSCLE GROUPS
-- ============================================

UPDATE public.muscle_groups mg
SET name_en = COALESCE(mg.name_en, v.name_en),
    name_es = COALESCE(mg.name_es, v.name_es)
FROM (VALUES
  ('peito',         'Chest',      'Pecho'),
  ('costas',        'Back',       'Espalda'),
  ('ombros',        'Shoulders',  'Hombros'),
  ('biceps',        'Biceps',     'Bíceps'),
  ('triceps',       'Triceps',    'Tríceps'),
  ('antebraco',     'Forearms',   'Antebrazo'),
  ('quadriceps',    'Quadriceps', 'Cuádriceps'),
  ('posterior',     'Hamstrings', 'Isquiotibiales'),
  ('gluteos',       'Glutes',     'Glúteos'),
  ('panturrilha',   'Calves',     'Pantorrillas'),
  ('abdomen',       'Abs',        'Abdomen'),
  ('lombar',        'Lower Back', 'Lumbares'),
  ('core',          'Core',       'Core'),
  ('corpo-inteiro', 'Full Body',  'Cuerpo Completo')
) AS v(slug, name_en, name_es)
WHERE mg.slug = v.slug;

-- ============================================
-- 2. TAXONOMY (types and levels)
-- ============================================

UPDATE public.exercise_types t
SET name_en = COALESCE(t.name_en, v.name_en),
    name_es = COALESCE(t.name_es, v.name_es)
FROM (VALUES
  ('strength',   'Strength',   'Fuerza'),
  ('cardio',     'Cardio',     'Cardio'),
  ('mobility',   'Mobility',   'Movilidad'),
  ('functional', 'Functional', 'Funcional')
) AS v(slug, name_en, name_es)
WHERE t.slug = v.slug;

UPDATE public.exercise_levels l
SET name_en = COALESCE(l.name_en, v.name_en),
    name_es = COALESCE(l.name_es, v.name_es)
FROM (VALUES
  ('beginner',     'Beginner',     'Principiante'),
  ('intermediate', 'Intermediate', 'Intermedio'),
  ('advanced',     'Advanced',     'Avanzado')
) AS v(slug, name_en, name_es)
WHERE l.slug = v.slug;

-- ============================================
-- 3. EXERCISE LIBRARY
-- ============================================

UPDATE public.exercises e
SET name_en         = COALESCE(e.name_en, v.name_en),
    name_es         = COALESCE(e.name_es, v.name_es),
    description_en  = COALESCE(e.description_en, v.description_en),
    description_es  = COALESCE(e.description_es, v.description_es),
    instructions_en = COALESCE(e.instructions_en, v.instructions_en),
    instructions_es = COALESCE(e.instructions_es, v.instructions_es)
FROM (VALUES
  -- CHEST
  ('supino-reto-barra',
   'Barbell Bench Press', 'Press de Banca con Barra',
   'Fundamental exercise for chest development', 'Ejercicio fundamental para el desarrollo del pectoral',
   'Lie on the bench and grip the bar slightly wider than shoulder width. Lower the bar under control to your chest and press it back up.',
   'Acuéstate en el banco y agarra la barra un poco más ancha que los hombros. Baja la barra de forma controlada hasta el pecho y empuja de vuelta.'),
  ('supino-inclinado-halteres',
   'Incline Dumbbell Press', 'Press Inclinado con Mancuernas',
   'Focus on the upper chest', 'Enfoque en la parte superior del pectoral',
   'Set the bench to 30-45 degrees. Hold the dumbbells and press upward, bringing them together at the top of the movement.',
   'Ajusta el banco a 30-45 grados. Sujeta las mancuernas y empuja hacia arriba, juntándolas en la parte alta del movimiento.'),
  ('crucifixo-maquina',
   'Machine Chest Fly', 'Aperturas en Máquina',
   'Isolation for the chest', 'Aislamiento para el pectoral',
   'Sit on the machine with your back supported. Bring your arms forward in a hugging motion.',
   'Siéntate en la máquina con la espalda apoyada. Lleva los brazos al frente en un movimiento de abrazo.'),
  ('flexao-bracos',
   'Push-Up', 'Flexiones de Brazos',
   'Classic bodyweight exercise for the chest', 'Ejercicio clásico de peso corporal para el pecho',
   'Place your hands slightly wider than your shoulders. Lower your body keeping it straight and push back up.',
   'Coloca las manos un poco más anchas que los hombros. Baja el cuerpo manteniéndolo recto y empuja de vuelta.'),
  ('crossover-cabo',
   'Cable Crossover', 'Cruce de Poleas',
   'Isolation for chest definition', 'Aislamiento para la definición del pectoral',
   'Stand between the high pulleys. Bring the cables down and forward in a crossing motion.',
   'Colócate entre las poleas altas. Lleva los cables hacia abajo y al frente en un movimiento cruzado.'),

  -- BACK
  ('puxada-frontal',
   'Lat Pulldown', 'Jalón al Pecho',
   'Fundamental exercise for back width', 'Ejercicio fundamental para la amplitud de la espalda',
   'Grip the bar with a wide grip. Pull the bar down to chin height, squeezing your shoulder blades.',
   'Agarra la barra con un agarre abierto. Tira de la barra hasta la altura del mentón, contrayendo las escápulas.'),
  ('remada-curvada',
   'Bent-Over Row', 'Remo con Barra',
   'Exercise for back thickness', 'Ejercicio para el grosor de la espalda',
   'Hinge your torso forward, hold the bar and pull it toward your abdomen.',
   'Inclina el torso hacia adelante, sujeta la barra y tira hacia el abdomen.'),
  ('remada-unilateral-halter',
   'One-Arm Dumbbell Row', 'Remo Unilateral con Mancuerna',
   'Unilateral work for muscle balance', 'Trabajo unilateral para el equilibrio muscular',
   'Place one hand and knee on the bench. Pull the dumbbell toward your hip.',
   'Apoya una mano y una rodilla en el banco. Tira de la mancuerna hacia la cadera.'),
  ('barra-fixa',
   'Pull-Up', 'Dominadas',
   'Classic bodyweight exercise for the back', 'Ejercicio clásico de peso corporal para la espalda',
   'Hang from the bar with an overhand grip. Pull your body up until your chin clears the bar.',
   'Cuélgate de la barra con agarre prono. Tira del cuerpo hasta que el mentón supere la barra.'),
  ('pulldown-triangulo',
   'Close-Grip Pulldown', 'Jalón con Agarre Triángulo',
   'Focus on the lower lats', 'Enfoque en la parte inferior del dorsal',
   'Use the triangle attachment on the high pulley. Pull toward your chest.',
   'Usa el accesorio triángulo en la polea alta. Tira hacia el pecho.'),

  -- SHOULDERS
  ('desenvolvimento-halteres',
   'Dumbbell Shoulder Press', 'Press de Hombros con Mancuernas',
   'Fundamental exercise for the shoulders', 'Ejercicio fundamental para los hombros',
   'Seated or standing, hold the dumbbells at shoulder height and press overhead.',
   'Sentado o de pie, sujeta las mancuernas a la altura de los hombros y empuja hacia arriba.'),
  ('elevacao-lateral',
   'Lateral Raise', 'Elevación Lateral',
   'Isolation for the lateral deltoid', 'Aislamiento para el deltoides lateral',
   'Standing, raise the dumbbells out to the sides up to shoulder height.',
   'De pie, eleva las mancuernas lateralmente hasta la altura de los hombros.'),
  ('elevacao-frontal',
   'Front Raise', 'Elevación Frontal',
   'Isolation for the front deltoid', 'Aislamiento para el deltoides anterior',
   'Standing, raise the dumbbells in front of you to shoulder height.',
   'De pie, eleva las mancuernas al frente hasta la altura de los hombros.'),
  ('crucifixo-inverso',
   'Reverse Fly', 'Aperturas Invertidas',
   'Isolation for the rear deltoid', 'Aislamiento para el deltoides posterior',
   'Hinge your torso forward or use the machine. Open your arms out to the sides.',
   'Inclina el torso hacia adelante o usa la máquina. Abre los brazos lateralmente.'),

  -- LEGS
  ('agachamento-livre',
   'Barbell Back Squat', 'Sentadilla Libre',
   'The king of leg exercises', 'El rey de los ejercicios de pierna',
   'Rack the bar on your traps. Descend by bending your knees and hips, keeping your back straight.',
   'Coloca la barra sobre los trapecios. Desciende flexionando rodillas y caderas, manteniendo la espalda recta.'),
  ('leg-press-45',
   '45-Degree Leg Press', 'Prensa de Piernas 45°',
   'Safe exercise for leg development', 'Ejercicio seguro para el desarrollo de las piernas',
   'Place your feet on the platform. Lower under control and press back up.',
   'Coloca los pies en la plataforma. Baja de forma controlada y empuja de vuelta.'),
  ('cadeira-extensora',
   'Leg Extension', 'Extensión de Cuádriceps',
   'Isolation for the quadriceps', 'Aislamiento para el cuádriceps',
   'Sit on the machine and extend your legs fully.',
   'Siéntate en la máquina y extiende las piernas por completo.'),
  ('mesa-flexora',
   'Lying Leg Curl', 'Curl Femoral Tumbado',
   'Isolation for the hamstrings', 'Aislamiento para los isquiotibiales',
   'Lie on the machine and curl your legs, bringing your heels toward your glutes.',
   'Acuéstate en la máquina y flexiona las piernas llevando los talones hacia los glúteos.'),
  ('stiff',
   'Romanian Deadlift', 'Peso Muerto Rumano',
   'Exercise for hamstrings and glutes', 'Ejercicio para isquiotibiales y glúteos',
   'Hold the bar or dumbbells. Lower your torso keeping your legs slightly extended.',
   'Sujeta la barra o las mancuernas. Baja el torso manteniendo las piernas semiextendidas.'),
  ('panturrilha-pe',
   'Standing Calf Raise', 'Elevación de Talones de Pie',
   'Exercise for the calves', 'Ejercicio para las pantorrillas',
   'Position yourself in the machine with your shoulders under the pads. Raise your heels as high as possible.',
   'Colócate en la máquina con los hombros bajo las almohadillas. Eleva los talones lo máximo posible.'),

  -- ARMS
  ('rosca-direta-barra',
   'Barbell Curl', 'Curl de Bíceps con Barra',
   'Classic exercise for the biceps', 'Ejercicio clásico para el bíceps',
   'Standing, hold the bar with an underhand grip. Bend your elbows, bringing the bar up to your shoulders.',
   'De pie, sujeta la barra con agarre supino. Flexiona los codos llevando la barra hasta los hombros.'),
  ('rosca-alternada-halteres',
   'Alternating Dumbbell Curl', 'Curl Alterno con Mancuernas',
   'Unilateral work for the biceps', 'Trabajo unilateral para el bíceps',
   'Standing, alternate curling each arm with a wrist rotation.',
   'De pie, alterna la flexión de cada brazo con rotación de muñeca.'),
  ('rosca-scott',
   'Preacher Curl', 'Curl Predicador',
   'Maximum isolation for the biceps', 'Máximo aislamiento para el bíceps',
   'Rest your arms on the preacher bench and bend your elbows.',
   'Apoya los brazos en el banco Scott y flexiona los codos.'),
  ('triceps-pulley',
   'Triceps Pushdown', 'Extensión de Tríceps en Polea',
   'Classic exercise for the triceps', 'Ejercicio clásico para el tríceps',
   'At the high pulley, push the bar down by extending your elbows.',
   'En la polea alta, empuja la barra hacia abajo extendiendo los codos.'),
  ('triceps-frances',
   'Overhead Triceps Extension', 'Extensión de Tríceps Francés',
   'Exercise for the long head of the triceps', 'Ejercicio para la cabeza larga del tríceps',
   'Lying or seated, extend your arms overhead and bend your elbows.',
   'Acostado o sentado, extiende los brazos sobre la cabeza y flexiona los codos.'),
  ('mergulho-paralelas',
   'Parallel Bar Dips', 'Fondos en Paralelas',
   'Compound exercise for triceps and chest', 'Ejercicio compuesto para tríceps y pecho',
   'Support yourself on the bars and lower your body by bending your elbows.',
   'Apóyate en las paralelas y baja el cuerpo flexionando los codos.'),

  -- CORE
  ('abdominal-crunch',
   'Crunch', 'Encogimiento Abdominal',
   'Basic exercise for the abs', 'Ejercicio básico para el abdomen',
   'Lying down, lift your shoulders off the floor by contracting your abs.',
   'Acostado, eleva los hombros del suelo contrayendo el abdomen.'),
  ('prancha-frontal',
   'Front Plank', 'Plancha Frontal',
   'Isometric exercise for the core', 'Ejercicio isométrico para el core',
   'Support yourself on your forearms and toes. Keep your body in a straight line.',
   'Apóyate en los antebrazos y las puntas de los pies. Mantén el cuerpo recto.'),
  ('elevacao-pernas',
   'Leg Raise', 'Elevación de Piernas',
   'Exercise for the lower abs', 'Ejercicio para el abdomen inferior',
   'Lying down or hanging, raise your legs keeping them extended.',
   'Acostado o colgado, eleva las piernas manteniéndolas extendidas.'),
  ('russian-twist',
   'Russian Twist', 'Giro Ruso',
   'Exercise for the obliques', 'Ejercicio para los oblicuos',
   'Seated with your feet off the floor, rotate your torso from side to side.',
   'Sentado con los pies elevados, gira el torso de un lado a otro.')
) AS v(slug, name_en, name_es, description_en, description_es, instructions_en, instructions_es)
WHERE e.slug = v.slug;

-- ============================================
-- 4. WORKOUT EXERCISES REFERENCING THE LIBRARY
-- ============================================
-- Rows created from a library exercise inherit its translations when they still
-- carry the library name verbatim (the admin has not renamed them).

UPDATE public.workout_exercises we
SET name_en        = COALESCE(we.name_en, e.name_en),
    name_es        = COALESCE(we.name_es, e.name_es),
    description_en = COALESCE(we.description_en, e.description_en),
    description_es = COALESCE(we.description_es, e.description_es)
FROM public.exercises e
WHERE we.exercise_id = e.id
  AND we.name = e.name;

NOTIFY pgrst, 'reload schema';
