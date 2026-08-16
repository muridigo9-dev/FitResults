-- ============================================
-- TRANSLATE CONTENT CREATED THROUGH THE ADMIN PANEL
-- ============================================
-- Description: The seed-based translation migration matched on `slug`, but
--              content created through the admin panel has slug NULL (and the
--              muscle groups on this database carry accented slugs). This fills
--              the EN/ES columns for those rows, matching on name instead.
--              Covers the Tai Chi / Qi Gong library authored in the panel.
-- Created: 2026-08-16
-- Idempotent: Safe to run multiple times (only writes where the column is null)
-- Dependencies: 20260816090138_content_i18n_columns.sql

-- 1. MUSCLE GROUPS missed by the slug-based update (accented slugs)
UPDATE public.muscle_groups mg
SET name_en = COALESCE(mg.name_en, v.name_en),
    name_es = COALESCE(mg.name_es, v.name_es)
FROM (VALUES
  ('Abdômen',    'Abs',        'Abdomen'),
  ('Bíceps',     'Biceps',     'Bíceps'),
  ('Glúteos',    'Glutes',     'Glúteos'),
  ('Quadríceps', 'Quadriceps', 'Cuádriceps'),
  ('Tríceps',    'Triceps',    'Tríceps')
) AS v(name, name_en, name_es)
WHERE mg.name = v.name;

-- 2. EXERCISES authored in the admin panel (slug is null, matched by name)
UPDATE public.exercises e
SET name_en         = COALESCE(e.name_en, v.name_en),
    name_es         = COALESCE(e.name_es, v.name_es),
    description_en  = COALESCE(e.description_en, v.description_en),
    description_es  = COALESCE(e.description_es, v.description_es),
    instructions_en = COALESCE(e.instructions_en, v.instructions_en),
    instructions_es = COALESCE(e.instructions_es, v.instructions_es)
FROM (VALUES
  ('Abertura',
   'Opening', 'Apertura',
   'Traditional opening movement to coordinate arms, legs and breathing.',
   'Movimiento inicial tradicional para coordinar brazos, piernas y respiración.',
   '1. Start with your feet parallel and your arms by your sides. 2. Inhale and raise your arms in front of you to shoulder height. 3. Exhale, bend your knees slightly and lower your arms under control.',
   '1. Empieza con los pies paralelos y los brazos a los lados. 2. Inhala y eleva los brazos al frente hasta la altura de los hombros. 3. Exhala, flexiona ligeramente las rodillas y baja los brazos con control.'),
  ('Abertura do Peito com Respiração',
   'Chest Opening with Breath', 'Apertura del Pecho con Respiración',
   'Comfortable chest expansion combined with effortless breathing.',
   'Expansión cómoda del pecho combinada con respiración sin esfuerzo.',
   '1. Inhale and open your arms out to the sides within a comfortable range. 2. Exhale and bring your hands together without rounding your spine. 3. Keep your shoulders down throughout the cycle.',
   '1. Inhala y abre los brazos lateralmente hasta una amplitud cómoda. 2. Exhala y acerca las manos sin curvar la columna. 3. Mantén los hombros bajos durante todo el ciclo.'),
  ('Agachamento Livre',
   'Free Squat', 'Sentadilla Libre',
   'The king of leg exercises.', 'El rey de los ejercicios de pierna.',
   'Keep an upright posture...', 'Mantén la postura erguida...'),
  ('Agarrar a Cauda do Pardal',
   'Grasp the Sparrow Tail', 'Agarrar la Cola del Gorrión',
   'Traditional sequence of warding off, rolling back, pressing and pushing within a comfortable range.',
   'Secuencia tradicional de parar, tirar, presionar y empujar con amplitud cómoda.',
   '1. Start from a stable stance and shift your weight slowly. 2. Perform the warding and rolling gestures with rounded arms. 3. Press and push without locking the elbows, returning to centre between phases.',
   '1. Empieza en una base estable y transfiere el peso lentamente. 2. Haz los gestos de parar y tirar con los brazos redondeados. 3. Presiona y empuja sin bloquear los codos, volviendo al centro entre fases.'),
  ('Chicote Simples',
   'Single Whip', 'Látigo Simple',
   'Traditional movement with a lateral opening of the arms and a controlled change of direction.',
   'Movimiento tradicional con apertura lateral de los brazos y cambio controlado de dirección.',
   '1. Shift your weight onto one leg and turn your torso without twisting the knee. 2. Open your arms in an arc and keep the hand in a relaxed shape. 3. Return slowly and repeat on the other side.',
   '1. Transfiere el peso a una pierna y gira el torso sin torcer la rodilla. 2. Abre los brazos en arco y mantén la mano en forma relajada. 3. Vuelve despacio y repite del otro lado.'),
  ('Chutar com Calcanhar',
   'Heel Kick', 'Patada con el Talón',
   'Low, controlled leg extension prioritising balance and a safe return.',
   'Extensión baja y controlada de la pierna, priorizando el equilibrio y un retorno seguro.',
   '1. Rest your weight on one leg and keep the knee soft. 2. Extend the other leg forward through the heel, without reaching for height. 3. Draw the foot back before shifting your weight, and alternate sides.',
   '1. Apoya el peso en una pierna y mantén la rodilla suave. 2. Extiende la otra pierna al frente con el talón, sin buscar altura. 3. Recoge el pie antes de transferir el peso y alterna los lados.'),
  ('Círculos de Ombros e Braços',
   'Shoulder and Arm Circles', 'Círculos de Hombros y Brazos',
   'Gentle shoulder mobility with small, progressive circles.',
   'Movilidad suave de los hombros con círculos pequeños y progresivos.',
   '1. Let your arms hang loosely at your sides. 2. Make slow circles with the shoulders and then with the arms, without pain. 3. Reverse the direction, keeping your neck relaxed.',
   '1. Deja los brazos sueltos a los lados. 2. Haz círculos lentos con los hombros y luego con los brazos, sin dolor. 3. Invierte la dirección manteniendo el cuello relajado.'),
  ('Empurrar a Água',
   'Pushing the Water', 'Empujar el Agua',
   'A slow, continuous push that encourages shoulder mobility and weight transfer.',
   'Empuje lento y continuo que estimula la movilidad de los hombros y la transferencia de peso.',
   '1. Place your hands in front of your chest. 2. Shift your weight onto the front leg while extending your arms without locking the elbows. 3. Return to centre and repeat on the other side.',
   '1. Coloca las manos frente al pecho. 2. Transfiere el peso a la pierna delantera mientras extiendes los brazos sin bloquear los codos. 3. Vuelve al centro y repite del otro lado.'),
  ('Encerrar e Acalmar',
   'Closing and Settling', 'Cerrar y Calmar',
   'A gradual return to a stable posture to finish the flow with natural breathing.',
   'Retorno gradual a la postura estable para finalizar el flujo con respiración natural.',
   '1. Bring your feet together unhurriedly. 2. Lower your hands to your sides and release the tension in your shoulders. 3. Breathe naturally for a few cycles before walking.',
   '1. Junta los pies sin prisa. 2. Baja las manos a los lados y suelta la tensión de los hombros. 3. Respira con naturalidad unos ciclos antes de caminar.'),
  ('Escovar o Joelho',
   'Brush Knee', 'Cepillar la Rodilla',
   'A coordinated step with a slight torso rotation, protecting the knee through the bend.',
   'Paso coordinado con rotación leve del torso y protección de la rodilla durante la flexión.',
   '1. Step one foot forward and keep the knee pointing the same way as your toes. 2. Sweep the hand on that side across the front of the knee. 3. Push gently with the other hand and return, alternating sides.',
   '1. Adelanta un pie y mantén la rodilla apuntando en la dirección de los dedos. 2. Pasa la mano del mismo lado por delante de la rodilla. 3. Empuja suavemente con la otra mano y vuelve, alternando los lados.'),
  ('Forma Curta de Tai Chi',
   'Tai Chi Short Form', 'Forma Corta de Tai Chi',
   'A continuous flow of traditional movements at moderate range and a comfortable pace.',
   'Flujo continuo de movimientos tradicionales con amplitud moderada y ritmo cómodo.',
   '1. Join Opening, Raising the Hands, Brush Knee and Cloud Hands. 2. Shift your weight before turning and keep your breathing natural. 3. Finish in the preparatory posture without speeding up.',
   '1. Une Apertura, Levantar las Manos, Cepillar la Rodilla y Manos de Nube. 2. Transfiere el peso antes de girar y mantén la respiración natural. 3. Termina en la postura preparatoria sin acelerar.'),
  ('Galo Dourado em Uma Perna',
   'Golden Rooster on One Leg', 'Gallo Dorado sobre una Pierna',
   'A brief balance with a controlled lift, using nearby support when needed.',
   'Equilibrio breve con elevación controlada, usando un apoyo cercano cuando sea necesario.',
   '1. Stand tall on one leg with the knee slightly bent. 2. Raise the other knee only to a comfortable height and keep your torso aligned. 3. Lower the foot under control and switch sides; use a wall if you need to.',
   '1. Ponte erguido sobre una pierna con la rodilla ligeramente flexionada. 2. Eleva la otra rodilla solo hasta una altura cómoda y mantén el torso alineado. 3. Baja el pie con control y cambia de lado; usa una pared si lo necesitas.'),
  ('Girar a Cintura Suavemente',
   'Gentle Waist Turns', 'Girar la Cintura Suavemente',
   'A controlled torso rotation with firm feet and a comfortable range.',
   'Rotación controlada del torso con pies firmes y amplitud cómoda.',
   '1. Stand with your feet parallel and your knees soft. 2. Turn your torso slowly to one side, letting your arms follow. 3. Return to centre before turning to the other side.',
   '1. Colócate con los pies paralelos y las rodillas sueltas. 2. Gira el torso lentamente hacia un lado, dejando que los brazos acompañen. 3. Vuelve al centro antes de girar al otro lado.'),
  ('Levantar as Mãos',
   'Raising the Hands', 'Levantar las Manos',
   'A gentle lift of the arms with grounded feet and an upright posture.',
   'Elevación suave de los brazos con los pies apoyados y postura erguida.',
   '1. Keep your feet grounded and your knees soft. 2. Raise your hands in front of you as though holding a ball. 3. Return slowly, keeping your wrists and shoulders relaxed.',
   '1. Mantén los pies firmes y las rodillas sueltas. 2. Eleva las manos al frente como si sostuvieras una bola. 3. Vuelve lentamente, manteniendo muñecas y hombros relajados.'),
  ('Mãos como Nuvens',
   'Cloud Hands', 'Manos de Nube',
   'A continuous lateral travel with the hands circling in front of the body.',
   'Desplazamiento lateral continuo con las manos circulando frente al cuerpo.',
   '1. Take short, comfortable side steps. 2. Circle your hands at chest height while the torso follows. 3. Keep your gaze forward and spread your weight between both feet.',
   '1. Da pasos laterales cortos y cómodos. 2. Circula las manos a la altura del pecho mientras el torso acompaña. 3. Mantén la mirada al frente y reparte el peso entre los pies.'),
  ('Passo Vazio e Cheio',
   'Empty and Full Step', 'Paso Vacío y Lleno',
   'A slow step that distinguishes support from loading, with postural control.',
   'Paso lento que diferencia el apoyo de la carga de peso con control postural.',
   '1. Slide one foot forward without putting all your weight on it. 2. Transfer the weight gradually, keeping the knee aligned. 3. Draw the foot back and repeat backward or on the other side.',
   '1. Desliza un pie al frente sin poner todo el peso. 2. Transfiere el peso gradualmente manteniendo la rodilla alineada. 3. Recoge el pie y repite hacia atrás o del otro lado.'),
  ('Postura Preparatória do Tai Chi',
   'Tai Chi Preparatory Posture', 'Postura Preparatoria del Tai Chi',
   'A neutral, stable posture to begin practice with attention to alignment.',
   'Postura neutra y estable para iniciar la práctica con atención a la alineación.',
   '1. Stand with your feet hip-width apart. 2. Bend your knees slightly and keep your spine long. 3. Relax your shoulders, let your arms hang and breathe without forcing.',
   '1. Ponte de pie con los pies separados al ancho de las caderas. 2. Flexiona ligeramente las rodillas y mantén la columna alargada. 3. Relaja los hombros, suelta los brazos y respira sin forzar.'),
  ('Pressionar e Recolher',
   'Press and Withdraw', 'Presionar y Recoger',
   'A cycle of extending and withdrawing the arms, coordinated with weight transfer.',
   'Ciclo de extensión y recogida de los brazos coordinado con la transferencia de peso.',
   '1. Keep your hands in front of your chest. 2. Shift your weight forward and extend your hands without locking the elbows. 3. Withdraw your hands as you inhale and bring the weight back to centre.',
   '1. Mantén las manos frente al pecho. 2. Transfiere el peso al frente y extiende las manos sin bloquear los codos. 3. Recoge las manos al inhalar y devuelve el peso al centro.'),
  ('Puxar a Seda',
   'Drawing the Silk', 'Tirar de la Seda',
   'A circular path of the arms to build coordination and mobility without abrupt pulling.',
   'Trayecto circular de los brazos para desarrollar coordinación y movilidad sin tirones bruscos.',
   '1. Take a comfortable step forward. 2. Draw a circle with one hand while the other follows, turning the torso gently. 3. Switch sides without losing your balance.',
   '1. Da un paso cómodo hacia adelante. 2. Dibuja un círculo con una mano mientras la otra acompaña, girando el torso suavemente. 3. Cambia de lado sin perder el equilibrio.'),
  ('Respiração Abdominal Natural',
   'Natural Abdominal Breathing', 'Respiración Abdominal Natural',
   'Calm, comfortable breathing coordinated with a gentle movement of the abdomen.',
   'Respiración calmada y cómoda coordinada con el movimiento suave del abdomen.',
   '1. Sit or stand with your neck relaxed. 2. Inhale through your nose without lifting your shoulders. 3. Exhale slowly and let the abdomen return, without holding your breath.',
   '1. Siéntate o ponte de pie con el cuello relajado. 2. Inhala por la nariz sin elevar los hombros. 3. Exhala lentamente y deja que el abdomen vuelva, sin retener el aire.'),
  ('Supino Reto com Halteres',
   'Flat Dumbbell Press', 'Press Plano con Mancuernas',
   'Fundamental exercise for the chest.', 'Ejercicio fundamental para el pectoral.',
   'Lie on the bench, hold the dumbbells...', 'Acuéstate en el banco, sujeta las mancuernas...'),
  ('Transferência de Peso Lateral',
   'Lateral Weight Shifting', 'Transferencia de Peso Lateral',
   'A slow shift between the legs to practise stance, stability and control.',
   'Desplazamiento lento entre las piernas para practicar base, estabilidad y control.',
   '1. Take your feet wider than your hips. 2. Bend one leg while the other stays comfortable, without letting the knee fall inward. 3. Return to centre and alternate slowly.',
   '1. Separa los pies más allá de las caderas. 2. Flexiona una pierna mientras la otra permanece cómoda, sin dejar que la rodilla caiga hacia dentro. 3. Vuelve al centro y alterna lentamente.')
) AS v(name, name_en, name_es, description_en, description_es, instructions_en, instructions_es)
WHERE e.name = v.name;

-- 3. Propagate onto workout exercises copied from these library entries
UPDATE public.workout_exercises we
SET name_en        = COALESCE(we.name_en, e.name_en),
    name_es        = COALESCE(we.name_es, e.name_es),
    description_en = COALESCE(we.description_en, e.description_en),
    description_es = COALESCE(we.description_es, e.description_es)
FROM public.exercises e
WHERE we.exercise_id = e.id
  AND we.name = e.name;

NOTIFY pgrst, 'reload schema';
