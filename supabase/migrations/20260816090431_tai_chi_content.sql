-- ============================================
-- TAI CHI / QI GONG CONTENT (PT-BR + EN + ES)
-- ============================================
-- Description: Adds a mind-body exercise type, an 18-movement Tai Chi library
--              and four Tai Chi workouts. Everything is time-based
--              (execution_type = 'time'), which is how Tai Chi is practised:
--              a movement is held or repeated slowly for a span of time rather
--              than counted in reps.
-- Created: 2026-08-16
-- Idempotent: Safe to run multiple times (fixed workout UUIDs + slug conflicts)
-- Dependencies: 20260816090138_content_i18n_columns.sql,
--               20260117151500_exercise_taxonomy.sql

-- ============================================
-- 1. EXERCISE TYPE: MIND & BODY
-- ============================================

INSERT INTO public.exercise_types (slug, name, name_en, name_es, icon, sort_order)
VALUES ('mind-body', 'Corpo e Mente', 'Mind and Body', 'Cuerpo y Mente', 'wind', 5)
ON CONFLICT (slug) DO UPDATE
SET name_en = COALESCE(exercise_types.name_en, EXCLUDED.name_en),
    name_es = COALESCE(exercise_types.name_es, EXCLUDED.name_es);

-- ============================================
-- 2. TAI CHI EXERCISE LIBRARY
-- ============================================

INSERT INTO public.exercises (
  slug, name, name_en, name_es,
  description, description_en, description_es,
  instructions, instructions_en, instructions_es,
  primary_muscle_group_id, type_id, level_id,
  equipment, difficulty,
  default_sets, default_reps, default_rest_seconds,
  is_compound, tags, is_active, created_by_type, visibility
)
SELECT
  v.slug, v.name, v.name_en, v.name_es,
  v.description, v.description_en, v.description_es,
  v.instructions, v.instructions_en, v.instructions_es,
  mg.id, t.id, l.id,
  'bodyweight'::exercise_equipment, v.difficulty::workout_difficulty,
  v.default_sets, v.default_reps, v.default_rest_seconds,
  false, v.tags, true, 'admin'::content_creator_type, 'global'
FROM (VALUES
  -- ---------- FOUNDATIONS / QI GONG ----------
  ('tai-chi-postura-wuji',
   'Postura Wu Ji', 'Wu Ji Standing Posture', 'Postura Wu Ji',
   'Postura de partida do Tai Chi: alinhamento, enraizamento e quietude antes do movimento',
   'The starting posture of Tai Chi: alignment, rooting and stillness before movement',
   'Postura inicial del Tai Chi: alineación, enraizamiento y quietud antes del movimiento',
   'Pés na largura dos ombros, joelhos levemente flexionados, cóccix apontando para baixo. Ombros relaxados, braços soltos ao lado do corpo. Respire pelo nariz e sinta o peso distribuído igualmente nos dois pés.',
   'Feet shoulder-width apart, knees softly bent, tailbone pointing down. Shoulders relaxed, arms hanging at your sides. Breathe through your nose and feel your weight spread evenly across both feet.',
   'Pies al ancho de los hombros, rodillas ligeramente flexionadas, coxis apuntando hacia abajo. Hombros relajados, brazos sueltos a los lados. Respira por la nariz y siente el peso repartido por igual en ambos pies.',
   'corpo-inteiro', 'beginner', 1, '2 min', 30, ARRAY['tai-chi','postura','fundamento']),

  ('tai-chi-respiracao-abdominal',
   'Respiração Abdominal Profunda', 'Deep Abdominal Breathing', 'Respiración Abdominal Profunda',
   'Respiração diafragmática que sincroniza fôlego e movimento em toda a prática',
   'Diaphragmatic breathing that ties breath and movement together throughout the practice',
   'Respiración diafragmática que sincroniza aliento y movimiento en toda la práctica',
   'De pé ou sentado, apoie uma mão sobre o abdômen. Inspire pelo nariz em 4 tempos, deixando a barriga expandir. Expire em 6 tempos, esvaziando sem forçar. O peito permanece quieto.',
   'Standing or seated, rest one hand on your abdomen. Inhale through the nose for 4 counts, letting the belly expand. Exhale for 6 counts, emptying without forcing. The chest stays quiet.',
   'De pie o sentado, apoya una mano sobre el abdomen. Inhala por la nariz en 4 tiempos, dejando que el vientre se expanda. Exhala en 6 tiempos, vaciando sin forzar. El pecho permanece quieto.',
   'core', 'beginner', 1, '3 min', 30, ARRAY['tai-chi','qi-gong','respiração']),

  ('tai-chi-balanco-bracos',
   'Balanço dos Braços', 'Arm Swing Loosening', 'Balanceo de Brazos',
   'Movimento de soltura que libera ombros e coluna torácica',
   'A loosening movement that frees the shoulders and thoracic spine',
   'Movimiento de soltura que libera hombros y columna torácica',
   'Pés paralelos, gire o tronco de um lado para o outro deixando os braços seguirem soltos, batendo suavemente no corpo. Mantenha os quadris estáveis e o olhar acompanhando a rotação.',
   'Feet parallel, rotate your torso side to side and let your arms follow loosely, tapping gently against the body. Keep the hips stable and let your gaze follow the rotation.',
   'Pies paralelos, gira el torso de un lado a otro dejando que los brazos sigan sueltos, golpeando suavemente el cuerpo. Mantén las caderas estables y la mirada acompañando la rotación.',
   'corpo-inteiro', 'beginner', 2, '90 s', 30, ARRAY['tai-chi','qi-gong','mobilidade']),

  ('tai-chi-abrir-fechar-peito',
   'Abrir e Fechar o Peito', 'Opening and Closing the Chest', 'Abrir y Cerrar el Pecho',
   'Abertura torácica coordenada com a respiração, típica do Qi Gong',
   'Chest opening coordinated with the breath, a Qi Gong staple',
   'Apertura torácica coordinada con la respiración, típica del Qi Gong',
   'Inspire abrindo os braços lateralmente à altura do peito, palmas para frente. Expire fechando os braços à frente, palmas voltadas para dentro. Movimento contínuo e lento.',
   'Inhale as you open your arms out to the sides at chest height, palms forward. Exhale as you close them in front of you, palms turned inward. Keep the movement continuous and slow.',
   'Inhala abriendo los brazos lateralmente a la altura del pecho, palmas hacia adelante. Exhala cerrando los brazos al frente, palmas hacia adentro. Movimiento continuo y lento.',
   'peito', 'beginner', 2, '90 s', 30, ARRAY['tai-chi','qi-gong','mobilidade']),

  ('tai-chi-erguer-ceu',
   'Erguer as Mãos ao Céu', 'Holding Up the Sky', 'Sostener el Cielo',
   'Primeiro movimento do Ba Duan Jin: alonga toda a cadeia posterior e o tronco',
   'The first Ba Duan Jin movement: lengthens the whole back line and the trunk',
   'Primer movimiento del Ba Duan Jin: alarga toda la cadena posterior y el tronco',
   'Entrelace os dedos à frente do abdômen. Inspire subindo as mãos pela linha média e girando as palmas para o teto acima da cabeça. Expire descendo os braços pelas laterais.',
   'Interlace your fingers in front of your abdomen. Inhale as you lift your hands up the midline and turn the palms toward the ceiling overhead. Exhale as you lower your arms out to the sides.',
   'Entrelaza los dedos frente al abdomen. Inhala subiendo las manos por la línea media y girando las palmas hacia el techo sobre la cabeza. Exhala bajando los brazos por los lados.',
   'corpo-inteiro', 'beginner', 3, '60 s', 30, ARRAY['tai-chi','qi-gong','ba-duan-jin']),

  ('tai-chi-transferencia-peso',
   'Transferência de Peso', 'Weight Shifting', 'Transferencia de Peso',
   'Base de todo o Tai Chi: aprender a mover o centro de gravidade com controle',
   'The base of all Tai Chi: learning to move your centre of gravity under control',
   'La base de todo el Tai Chi: aprender a mover el centro de gravedad con control',
   'Pés um pouco mais largos que os ombros. Transfira lentamente o peso para a perna direita, mantendo o tronco ereto, e depois para a esquerda. O joelho nunca ultrapassa a ponta do pé.',
   'Feet slightly wider than your shoulders. Slowly shift your weight onto the right leg, keeping the torso upright, then onto the left. The knee never travels past the toes.',
   'Pies un poco más anchos que los hombros. Transfiere lentamente el peso a la pierna derecha, manteniendo el torso erguido, y luego a la izquierda. La rodilla nunca sobrepasa la punta del pie.',
   'quadriceps', 'beginner', 3, '2 min', 45, ARRAY['tai-chi','equilíbrio','fundamento']),

  -- ---------- SHORT FORM ----------
  ('tai-chi-inicio',
   'Início do Tai Chi (Qi Shi)', 'Commencing Form (Qi Shi)', 'Inicio del Tai Chi (Qi Shi)',
   'Abertura formal da sequência, que marca o ritmo respiratório da prática',
   'The formal opening of the sequence, which sets the breathing rhythm of the practice',
   'Apertura formal de la secuencia, que marca el ritmo respiratorio de la práctica',
   'A partir da postura Wu Ji, inspire elevando os braços à frente até a altura dos ombros, cotovelos macios. Expire baixando as mãos até a altura da cintura, como se pressionasse a água.',
   'From Wu Ji posture, inhale as you raise your arms in front of you to shoulder height, elbows soft. Exhale as you lower your hands to waist height, as though pressing down on water.',
   'Desde la postura Wu Ji, inhala elevando los brazos al frente hasta la altura de los hombros, codos suaves. Exhala bajando las manos hasta la cintura, como si presionaras el agua.',
   'corpo-inteiro', 'beginner', 3, '60 s', 30, ARRAY['tai-chi','forma','yang']),

  ('tai-chi-agarrar-cauda-passaro',
   'Agarrar a Cauda do Pássaro', 'Grasp the Sparrow Tail', 'Agarrar la Cola del Pájaro',
   'Movimento central do estilo Yang, que reúne as quatro energias: parar, puxar, pressionar e empurrar',
   'The core Yang-style movement, gathering the four energies: ward off, roll back, press and push',
   'Movimiento central del estilo Yang, que reúne las cuatro energías: parar, tirar, presionar y empujar',
   'Em passo arqueado, avance o antebraço à frente do peito (parar). Gire a cintura recuando as mãos (puxar), una as palmas e avance (pressionar) e termine empurrando com as duas mãos à frente.',
   'In a bow stance, bring your forearm forward in front of the chest (ward off). Turn from the waist as your hands draw back (roll back), join the palms and advance (press), then finish pushing forward with both hands.',
   'En paso de arco, adelanta el antebrazo frente al pecho (parar). Gira desde la cintura retirando las manos (tirar), une las palmas y avanza (presionar) y termina empujando con ambas manos al frente.',
   'corpo-inteiro', 'intermediate', 2, '2 min', 45, ARRAY['tai-chi','forma','yang']),

  ('tai-chi-chicote-simples',
   'Chicote Simples', 'Single Whip', 'Látigo Simple',
   'Postura ampla que abre o peito e treina a coordenação entre cintura e braços',
   'A wide posture that opens the chest and trains coordination between waist and arms',
   'Postura amplia que abre el pecho y entrena la coordinación entre cintura y brazos',
   'Forme um bico com a mão direita e estenda o braço para trás. Gire a cintura para a esquerda, deslocando o peso para a perna esquerda enquanto a palma esquerda empurra à frente na altura do rosto.',
   'Form a hook with your right hand and extend that arm behind you. Turn from the waist to the left, shifting weight onto the left leg while the left palm pushes forward at face height.',
   'Forma un pico con la mano derecha y extiende ese brazo hacia atrás. Gira la cintura a la izquierda, desplazando el peso a la pierna izquierda mientras la palma izquierda empuja al frente a la altura del rostro.',
   'corpo-inteiro', 'intermediate', 2, '90 s', 45, ARRAY['tai-chi','forma','yang']),

  ('tai-chi-maos-nuvem',
   'Mãos como Nuvens', 'Cloud Hands', 'Manos de Nube',
   'Deslocamento lateral contínuo que treina rotação de cintura e fluidez',
   'A continuous lateral travel that trains waist rotation and fluidity',
   'Desplazamiento lateral continuo que entrena la rotación de cintura y la fluidez',
   'Com o peso alternando entre as pernas, desenhe círculos verticais com as mãos à frente do corpo, uma subindo enquanto a outra desce. O movimento nasce da cintura, não dos braços.',
   'Alternating weight between your legs, draw vertical circles with your hands in front of the body, one rising as the other falls. The movement comes from the waist, not the arms.',
   'Alternando el peso entre las piernas, dibuja círculos verticales con las manos frente al cuerpo, una subiendo mientras la otra baja. El movimiento nace de la cintura, no de los brazos.',
   'core', 'intermediate', 3, '2 min', 45, ARRAY['tai-chi','forma','fluidez']),

  ('tai-chi-repelir-macaco',
   'Repelir o Macaco', 'Repulse the Monkey', 'Repeler al Mono',
   'Sequência recuando, que treina passo para trás com controle total do peso',
   'A retreating sequence that trains stepping backward with full control of your weight',
   'Secuencia en retroceso que entrena el paso hacia atrás con control total del peso',
   'Recue um passo apoiando primeiro a ponta do pé. Ao transferir o peso para trás, uma palma empurra à frente na altura do ombro enquanto a outra recolhe junto à cintura. Alterne os lados.',
   'Step back, setting the ball of the foot down first. As the weight travels backward, one palm pushes forward at shoulder height while the other draws back to the waist. Alternate sides.',
   'Retrocede un paso apoyando primero la punta del pie. Al transferir el peso hacia atrás, una palma empuja al frente a la altura del hombro mientras la otra se recoge junto a la cintura. Alterna los lados.',
   'corpo-inteiro', 'intermediate', 2, '2 min', 45, ARRAY['tai-chi','forma','coordenação']),

  ('tai-chi-crina-cavalo',
   'Separar a Crina do Cavalo', 'Parting the Wild Horse Mane', 'Separar la Crin del Caballo',
   'Avanço em passo arqueado com abertura diagonal dos braços',
   'An advancing bow stance with a diagonal opening of the arms',
   'Avance en paso de arco con apertura diagonal de los brazos',
   'Recolha as mãos como se segurasse uma bola à frente do tronco. Avance um passo e separe as mãos na diagonal: a de baixo sobe até a altura do ombro, a de cima desce até o quadril.',
   'Gather your hands as though holding a ball in front of your trunk. Step forward and part the hands diagonally: the lower one rises to shoulder height, the upper one sinks to the hip.',
   'Recoge las manos como si sostuvieras una bola frente al tronco. Avanza un paso y separa las manos en diagonal: la de abajo sube hasta el hombro, la de arriba baja hasta la cadera.',
   'corpo-inteiro', 'intermediate', 2, '2 min', 45, ARRAY['tai-chi','forma','yang']),

  ('tai-chi-garca-branca',
   'A Garça Branca Abre as Asas', 'White Crane Spreads Its Wings', 'La Grulla Blanca Extiende las Alas',
   'Postura de transição que trabalha equilíbrio sobre uma perna e abertura do tronco',
   'A transitional posture that works single-leg balance and trunk opening',
   'Postura de transición que trabaja el equilibrio sobre una pierna y la apertura del tronco',
   'Desloque o peso para a perna de trás e toque o solo à frente com a ponta do pé. A mão de cima sobe até a têmpora, a de baixo desce junto ao quadril, abrindo o peito.',
   'Shift your weight onto the back leg and touch the floor in front with your toes. The upper hand rises to the temple, the lower one sinks beside the hip, opening the chest.',
   'Desplaza el peso a la pierna trasera y toca el suelo al frente con la punta del pie. La mano de arriba sube hasta la sien, la de abajo baja junto a la cadera, abriendo el pecho.',
   'corpo-inteiro', 'intermediate', 2, '90 s', 45, ARRAY['tai-chi','forma','equilíbrio']),

  ('tai-chi-escovar-joelho',
   'Escovar o Joelho e Empurrar', 'Brush Knee and Push', 'Cepillar la Rodilla y Empujar',
   'Coordenação clássica entre passo, giro de cintura e empurrão de palma',
   'The classic coordination of step, waist turn and palm push',
   'Coordinación clásica entre paso, giro de cintura y empuje de palma',
   'Avance um passo. A mão de baixo varre por cima do joelho da frente enquanto a outra empurra à frente na altura do peito. Termine com o peso 70 por cento na perna da frente.',
   'Step forward. The lower hand sweeps across the front knee while the other pushes forward at chest height. Finish with 70 percent of your weight on the front leg.',
   'Avanza un paso. La mano de abajo barre por encima de la rodilla delantera mientras la otra empuja al frente a la altura del pecho. Termina con el 70 por ciento del peso en la pierna delantera.',
   'corpo-inteiro', 'intermediate', 2, '2 min', 45, ARRAY['tai-chi','forma','coordenação']),

  -- ---------- BALANCE ----------
  ('tai-chi-galo-dourado',
   'Galo Dourado numa Perna', 'Golden Rooster Stands on One Leg', 'Gallo Dorado sobre una Pierna',
   'Equilíbrio unipodal sustentado, referência do Tai Chi para estabilidade',
   'Sustained single-leg balance, the Tai Chi reference for stability',
   'Equilibrio sobre una pierna sostenido, referencia del Tai Chi para la estabilidad',
   'Transfira todo o peso para uma perna e eleve o joelho oposto até a altura do quadril. A mão do mesmo lado do joelho sobe junto, dedos para cima. Mantenha o olhar num ponto fixo.',
   'Shift all of your weight onto one leg and lift the opposite knee to hip height. The hand on the same side as the knee rises with it, fingers up. Keep your gaze on a fixed point.',
   'Transfiere todo el peso a una pierna y eleva la rodilla opuesta hasta la altura de la cadera. La mano del mismo lado que la rodilla sube con ella, dedos hacia arriba. Mantén la mirada en un punto fijo.',
   'core', 'intermediate', 4, '60 s', 45, ARRAY['tai-chi','equilíbrio','core']),

  ('tai-chi-chute-calcanhar',
   'Chute com o Calcanhar', 'Heel Kick', 'Patada con el Talón',
   'Extensão lenta da perna que exige equilíbrio, controle e força de quadril',
   'A slow leg extension that demands balance, control and hip strength',
   'Extensión lenta de la pierna que exige equilibrio, control y fuerza de cadera',
   'Sobre a perna de apoio, eleve o joelho e estenda a perna à frente empurrando com o calcanhar, sem travar o joelho. Os braços abrem lateralmente. Recolha devagar antes de trocar o lado.',
   'On your supporting leg, lift the knee and extend the leg forward pushing through the heel, without locking the knee. The arms open out to the sides. Draw the leg back slowly before switching sides.',
   'Sobre la pierna de apoyo, eleva la rodilla y extiende la pierna al frente empujando con el talón, sin bloquear la rodilla. Los brazos se abren lateralmente. Recoge despacio antes de cambiar de lado.',
   'quadriceps', 'advanced', 3, '90 s', 60, ARRAY['tai-chi','equilíbrio','força']),

  -- ---------- CLOSING ----------
  ('tai-chi-meditacao-em-pe',
   'Meditação em Pé (Zhan Zhuang)', 'Standing Meditation (Zhan Zhuang)', 'Meditación de Pie (Zhan Zhuang)',
   'Postura estática sustentada que constrói resistência isométrica e concentração',
   'A sustained static posture that builds isometric endurance and concentration',
   'Postura estática sostenida que construye resistencia isométrica y concentración',
   'Joelhos levemente flexionados, braços à frente do peito como se abraçassem uma árvore, dedos relaxados. Respire naturalmente e mantenha a postura observando onde o corpo cria tensão.',
   'Knees softly bent, arms held in front of the chest as though embracing a tree, fingers relaxed. Breathe naturally and hold, noticing where the body creates tension.',
   'Rodillas ligeramente flexionadas, brazos frente al pecho como si abrazaras un árbol, dedos relajados. Respira con naturalidad y mantén la postura observando dónde el cuerpo crea tensión.',
   'corpo-inteiro', 'intermediate', 1, '3 min', 60, ARRAY['tai-chi','qi-gong','isométrico']),

  ('tai-chi-encerramento',
   'Encerramento (Shou Shi)', 'Closing Form (Shou Shi)', 'Cierre (Shou Shi)',
   'Fechamento da prática, que devolve a respiração e o ritmo cardíaco ao repouso',
   'The closing of the practice, returning breath and heart rate to rest',
   'Cierre de la práctica, que devuelve la respiración y el ritmo cardíaco al reposo',
   'Traga as mãos para a frente do abdômen, uma sobre a outra. Inspire e expire três vezes, longamente. Desça os braços ao lado do corpo e volte à postura Wu Ji.',
   'Bring your hands in front of your abdomen, one over the other. Inhale and exhale three times, slowly. Lower your arms to your sides and return to Wu Ji posture.',
   'Lleva las manos frente al abdomen, una sobre la otra. Inhala y exhala tres veces, largamente. Baja los brazos a los lados del cuerpo y vuelve a la postura Wu Ji.',
   'corpo-inteiro', 'beginner', 1, '2 min', 30, ARRAY['tai-chi','forma','relaxamento'])
) AS v(
  slug, name, name_en, name_es,
  description, description_en, description_es,
  instructions, instructions_en, instructions_es,
  mg_slug, difficulty, default_sets, default_reps, default_rest_seconds, tags
)
LEFT JOIN public.muscle_groups mg ON mg.slug = v.mg_slug
LEFT JOIN public.exercise_types t ON t.slug = 'mind-body'
LEFT JOIN public.exercise_levels l ON l.slug = v.difficulty
ON CONFLICT (slug) DO NOTHING;

-- Mirror the primary muscle group into the N:N table used by the admin UI
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_group_id, is_primary)
SELECT e.id, e.primary_muscle_group_id, true
FROM public.exercises e
WHERE e.slug LIKE 'tai-chi-%'
  AND e.primary_muscle_group_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. TAI CHI WORKOUTS
-- ============================================
-- Fixed UUIDs so re-running the migration updates rather than duplicates.

INSERT INTO public.workouts (
  id, title, title_en, title_es,
  description, description_en, description_es,
  category, is_active, content_origin, visibility
) VALUES
  ('7a1c4100-0000-4000-a000-000000000001',
   'Tai Chi: Fundamentos',
   'Tai Chi: Foundations',
   'Tai Chi: Fundamentos',
   'Primeiro contato com o Tai Chi em cerca de 20 minutos. Postura, respiração e transferência de peso: a base sobre a qual toda a forma é construída. Sem equipamento.',
   'A first contact with Tai Chi in about 20 minutes. Posture, breathing and weight shifting: the base every form is built on. No equipment needed.',
   'Primer contacto con el Tai Chi en unos 20 minutos. Postura, respiración y transferencia de peso: la base sobre la que se construye toda la forma. Sin equipamiento.',
   'taichi', true, 'system', 'global'),

  ('7a1c4100-0000-4000-a000-000000000002',
   'Tai Chi: Forma Curta de 8 Movimentos',
   'Tai Chi: Eight-Movement Short Form',
   'Tai Chi: Forma Corta de 8 Movimientos',
   'Sequência contínua de 25 minutos com os movimentos clássicos do estilo Yang, do Qi Shi ao encerramento. Ideal para quem já domina a transferência de peso.',
   'A continuous 25-minute sequence of the classic Yang-style movements, from Qi Shi to the closing form. Best once weight shifting already feels natural.',
   'Secuencia continua de 25 minutos con los movimientos clásicos del estilo Yang, del Qi Shi al cierre. Ideal para quien ya domina la transferencia de peso.',
   'taichi', true, 'system', 'global'),

  ('7a1c4100-0000-4000-a000-000000000003',
   'Qi Gong Matinal: Energia e Mobilidade',
   'Morning Qi Gong: Energy and Mobility',
   'Qi Gong Matutino: Energía y Movilidad',
   'Rotina curta de 15 minutos para começar o dia: respiração profunda, abertura torácica e soltura de ombros e coluna.',
   'A short 15-minute routine to start the day: deep breathing, chest opening and loosening of the shoulders and spine.',
   'Rutina corta de 15 minutos para empezar el día: respiración profunda, apertura torácica y soltura de hombros y columna.',
   'taichi', true, 'system', 'global'),

  ('7a1c4100-0000-4000-a000-000000000004',
   'Tai Chi: Equilíbrio e Centro',
   'Tai Chi: Balance and Core',
   'Tai Chi: Equilibrio y Centro',
   'Prática de 30 minutos focada em estabilidade: apoio unipodal, chutes lentos e meditação em pé. Trabalha o core sem um único abdominal.',
   'A 30-minute practice built around stability: single-leg support, slow kicks and standing meditation. It works the core without a single crunch.',
   'Práctica de 30 minutos centrada en la estabilidad: apoyo sobre una pierna, patadas lentas y meditación de pie. Trabaja el core sin un solo abdominal.',
   'taichi', true, 'system', 'global')
ON CONFLICT (id) DO UPDATE
SET title_en       = COALESCE(workouts.title_en, EXCLUDED.title_en),
    title_es       = COALESCE(workouts.title_es, EXCLUDED.title_es),
    description_en = COALESCE(workouts.description_en, EXCLUDED.description_en),
    description_es = COALESCE(workouts.description_es, EXCLUDED.description_es);

-- ============================================
-- 4. WORKOUT EXERCISES (time-based)
-- ============================================
-- Only seeded when the workout has no exercises yet, so later admin edits survive.

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
  -- Workout 1: Foundations (~20 min)
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'tai-chi-postura-wuji',           1, 1, 120, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'tai-chi-respiracao-abdominal',   2, 1, 180, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'tai-chi-balanco-bracos',         3, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'tai-chi-abrir-fechar-peito',     4, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'tai-chi-transferencia-peso',     5, 3, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'tai-chi-inicio',                 6, 3,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000001'::uuid, 'tai-chi-encerramento',           7, 1, 120, 30),

  -- Workout 2: Eight-movement short form (~25 min)
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-inicio',                 1, 1,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-agarrar-cauda-passaro',  2, 2, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-chicote-simples',        3, 2,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-maos-nuvem',             4, 3, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-crina-cavalo',           5, 2, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-garca-branca',           6, 2,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-escovar-joelho',         7, 2, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-repelir-macaco',         8, 2, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000002'::uuid, 'tai-chi-encerramento',           9, 1,  90, 30),

  -- Workout 3: Morning Qi Gong (~15 min)
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'tai-chi-respiracao-abdominal',   1, 1, 120, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'tai-chi-erguer-ceu',             2, 3,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'tai-chi-abrir-fechar-peito',     3, 3,  60, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'tai-chi-balanco-bracos',         4, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'tai-chi-maos-nuvem',             5, 2,  90, 30),
  ('7a1c4100-0000-4000-a000-000000000003'::uuid, 'tai-chi-meditacao-em-pe',        6, 1, 180, 30),

  -- Workout 4: Balance and core (~30 min)
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-postura-wuji',           1, 1, 120, 30),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-transferencia-peso',     2, 3,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-galo-dourado',           3, 4,  60, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-chute-calcanhar',        4, 3,  90, 60),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-escovar-joelho',         5, 3, 120, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-garca-branca',           6, 2,  90, 45),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-meditacao-em-pe',        7, 1, 240, 60),
  ('7a1c4100-0000-4000-a000-000000000004'::uuid, 'tai-chi-encerramento',           8, 1,  90, 30)
) AS p(workout_id, exercise_slug, exercise_order, sets, duration_seconds, rest_seconds)
JOIN public.exercises e ON e.slug = p.exercise_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.workout_exercises we WHERE we.workout_id = p.workout_id
);

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON COLUMN public.workouts.category IS 'Workout category slug: cardio, strength, hiit, flexibility, yoga, taichi, functional, calisthenics, stretching';

NOTIFY pgrst, 'reload schema';
