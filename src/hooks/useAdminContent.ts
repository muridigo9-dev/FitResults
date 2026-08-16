import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUnifiedVisibility } from "./useUnifiedVisibility";
import type {
  Diet,
  Workout,

  Ingredient,
  PreparationStep,
  Exercise,
  MuscleGroup,
  Achievement,
  ExerciseType as ExpType,
  ExerciseLevel,
  VisibilityScope,
} from "@/types/content";
import type { Challenge, ChallengeDay, ChallengeType } from "@/types/challenges";

const EMPTY_ARRAY: any[] = [];
const EMPTY_DIETS: Diet[] = [];
const EMPTY_WORKOUTS: Workout[] = [];
const EMPTY_CHALLENGES: Challenge[] = [];
const EMPTY_EXERCISES: any[] = [];
const EMPTY_MUSCLE_GROUPS: MuscleGroup[] = [];
const EMPTY_PLANS: any[] = [];
const EMPTY_TYPES: any[] = [];
const EMPTY_LEVELS: any[] = [];

// Fetch functions
async function fetchDiets(): Promise<Diet[]> { // Keeping name Diet[] for now as alias
  const { data, error } = await supabase
    .from("dishes") // Was diets
    .select(`
      *,
      diet_ingredients(*),
      dish_ingredients(
        *,
        ingredient:ingredients(
            id,
            name,
            unit,
            calories,
            protein,
            carbs,
            fat,
            reference_value
        )
      ),
      diet_preparation_steps(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching diets:", error);
    toast.error("Erro ao carregar pratos: " + error.message);
    throw error;
  }

  return (data || []).map(diet => {
    // Cast to access potential image_path
    const raw = diet as typeof diet & { image_path?: string | null };

    // Map Legacy Ingredients
    const legacyIngredients = ((diet as any).diet_ingredients || [])
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
      .map((ing) => ({
        id: ing.id,
        name: ing.name || "",
        quantity: ing.quantity || "", // Legacy is string
        unit: ing.unit || "",
        isLegacy: true
      }));

    // Map Smart Ingredients
    const smartIngredients = (diet.dish_ingredients || [])
      .map((di: any) => ({
        id: di.id,
        ingredientId: di.ingredient_id,
        name: di.ingredient?.name || "Unknown Ingredient",
        quantity: Number(di.quantity) || 0,
        unit: di.metric_unit || di.ingredient?.unit || "g",
        isLegacy: false,
        // We could calculate macros here if needed for display, but DishForm calculates them dynamically
        calories: (di.ingredient?.calories || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
        protein: (di.ingredient?.protein || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
        carbs: (di.ingredient?.carbs || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
        fat: (di.ingredient?.fat || 0) * (di.quantity / (di.ingredient?.reference_value || 100)),
      }));

    return {
      id: diet.id,
      title: diet.title,
      description: diet.description || "",
      imageUrl: diet.image_url || "",
      imagePath: (diet as any).image_path || undefined,
      category: diet.category || "",
      ingredients: [...legacyIngredients, ...smartIngredients],
      preparation: ((diet as any).diet_preparation_steps || [])
        .sort((a: any, b: any) => (a.step_order || 0) - (b.step_order || 0))
        .map((step: any): PreparationStep => ({
          id: step.id,
          order: step.step_order || 0,
          description: step.description || "",
        })),
      macros: {
        calories: diet.calories || 0,
        protein: Number(diet.protein) || 0,
        carbs: Number(diet.carbs) || 0,
        fat: Number(diet.fat) || 0,
      },
      titleEn: (diet as any).title_en || "",
      titleEs: (diet as any).title_es || "",
      descriptionEn: (diet as any).description_en || "",
      descriptionEs: (diet as any).description_es || "",
      isActive: diet.is_active ?? true,
      createdAt: diet.created_at || "",
      assigned_to_type: (diet as any).assigned_to_type || "global",
      assigned_to_id: (diet as any).assigned_to_id || null,
      visibilityType: diet.visibility || 'global',
      planIds: diet.plan_ids || [],
    };
  });
}

async function fetchWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select(`
      *,
      workout_exercises(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workouts:", error);
    throw error;
  }

  console.log("[fetchWorkouts] Raw Data:", data);

  return (data || []).map(workout => {
    // Cast to access potential image_path (may not exist until migration runs)
    const raw = workout as typeof workout & { image_path?: string | null };
    return {
      id: workout.id,
      title: workout.title || "",
      description: workout.description || "",
      titleEn: (workout as any).title_en || "",
      titleEs: (workout as any).title_es || "",
      descriptionEn: (workout as any).description_en || "",
      descriptionEs: (workout as any).description_es || "",
      imageUrl: workout.image_url || "",
      imagePath: raw.image_path || undefined,
      category: workout.category || "",
      exercises: (workout.workout_exercises || [])
        .sort((a: any, b: any) => (a.exercise_order || 0) - (b.exercise_order || 0))
        .map((ex: any): Exercise => {
          // Reconstruct reps string for variable mode to ensure UI inputs populate correctly
          let displayReps = ex.reps || "0";
          if (ex.reps_mode === 'variable' && Array.isArray(ex.reps_list) && ex.reps_list.length > 0) {
            displayReps = ex.reps_list.join(',');
          }

          return {
            id: `db-${ex.id}-${ex.exercise_id}`,
            name: ex.name || "",
            description: ex.description || "",
            nameEn: ex.name_en || "",
            nameEs: ex.name_es || "",
            descriptionEn: ex.description_en || "",
            descriptionEs: ex.description_es || "",
            sets: Number(ex.sets) || 0,
            reps: displayReps,
            restSeconds: Number(ex.rest_seconds) || 0,
            order: Number(ex.exercise_order) || 0,
            supersetId: ex.superset_id || undefined,
            restType: ex.rest_type || 'individual',
            executionType: ex.execution_type || 'reps',
            repsMode: ex.reps_mode || 'fixed',
            repsList: ex.reps_list || [],
            durationSeconds: Number(ex.duration_seconds) || undefined
          };
        }),
      isActive: workout.is_active ?? true,
      createdAt: workout.created_at || "",
      visibilityType: workout.visibility || 'global',
      planIds: workout.plan_ids || [],
    };
  });
}

async function fetchLibraryExercises(): Promise<(Exercise & { muscleGroupIds: string[]; planIds: string[] })[]> {
  const { data, error } = await (supabase as any)
    .from("exercises")
    .select(`
      *,
      exercise_muscle_groups(muscle_group_id)
    `)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map(ex => ({
    id: ex.id,
    name: ex.name || "",
    description: ex.description || "",
    instructions: ex.instructions || "",
    nameEn: ex.name_en || "",
    nameEs: ex.name_es || "",
    descriptionEn: ex.description_en || "",
    descriptionEs: ex.description_es || "",
    instructionsEn: ex.instructions_en || "",
    instructionsEs: ex.instructions_es || "",
    imageUrl: ex.image_url || "",
    equipment: ex.equipment || "none",
    difficulty: ex.difficulty || "intermediate",
    isCompound: ex.is_compound || false,
    sets: Number(ex.default_sets) || 3,
    reps: ex.default_reps || "12",
    restSeconds: Number(ex.default_rest_seconds) || 60,
    order: 0,
    executionType: 'reps',
    repsMode: 'fixed',
    isActive: ex.is_active ?? true,
    imagePath: ex.image_path || undefined,
    typeId: ex.type_id || undefined,
    levelId: ex.level_id || undefined,
    muscleGroupIds: (ex.exercise_muscle_groups || []).map((emg: any) => emg.muscle_group_id),
    // Correctly map new visibility columns
    visibilityType: ex.visibility || 'global',
    planIds: ex.plan_ids || [],
  }));
}

async function fetchMuscleGroups(): Promise<MuscleGroup[]> {
  const { data, error } = await supabase
    .from("muscle_groups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data || []).map(mg => ({
    id: mg.id,
    name: mg.name || "",
    name_en: mg.name_en || "",
    name_es: (mg as any).name_es || "",
    nameEn: mg.name_en || "",
    slug: mg.slug || "",
    category: (mg.category as MuscleGroup["category"]) || "upper",
    icon: mg.icon || "",
    sortOrder: mg.sort_order || 0,
    isActive: mg.is_active ?? true
  }));
}

async function fetchPlans(): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from("plans")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchExerciseTypes(): Promise<ExpType[]> {
  const { data, error } = await (supabase as any)
    .from("exercise_types")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map(t => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    name_en: t.name_en,
    name_es: t.name_es,
    icon: t.icon,
    sortOrder: t.sort_order,
    isActive: t.is_active !== false
  }));
}

async function fetchExerciseLevels(): Promise<ExerciseLevel[]> {
  const { data, error } = await (supabase as any)
    .from("exercise_levels")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map(l => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    name_en: l.name_en,
    name_es: l.name_es,
    colorCode: l.color_code,
    sortOrder: l.sort_order,
    isActive: l.is_active !== false
  }));
}

async function fetchChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select(`
      *,
      challenge_days(
        *,
        challenge_tasks(*)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(challenge => {
    return {
      id: challenge.id,
      name: challenge.name || "",
      description: challenge.description || "",
      cover_url: challenge.cover_url || undefined,
      imageUrl: challenge.cover_url || undefined,
      type: (challenge.type as ChallengeType) || 'global',
      totalDays: challenge.duration_days || 0,
      duration_days: challenge.duration_days || 0,
      days: (challenge.challenge_days || [])
        .sort((a: any, b: any) => (a.day_number || 0) - (b.day_number || 0))
        .map((day: any): ChallengeDay => ({
          id: day.id,
          challenge_id: challenge.id,
          day_number: day.day_number || 0,
          dayNumber: day.day_number || 0,
          xp_bonus: day.xp_bonus || 0,
          tasks: (day.challenge_tasks || [])
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            .map((task: any) => ({
              id: task.id,
              challenge_day_id: day.id,
              title: task.title || "",
              type: task.type || "habit",
              // Content linking
              dish_id: task.dish_id,
              diet_plan_id: task.diet_plan_id,
              workout_id: task.workout_id,
              exercise_id: task.exercise_id,

              config: {
                instruction: task.config?.instruction || "",
                target: Number(task.config?.target) || 0,
                unit: task.config?.unit || "",
              },
              is_mandatory: task.is_mandatory ?? true,
              xp_reward: task.xp_reward || 10,
              order_index: task.order_index || 0,
            })),
        })),
      is_active: challenge.is_active ?? true,
      isActive: challenge.is_active ?? true,
      visibility_type: challenge.visibility_type || 'public',
      xp_reward: challenge.xp_reward || 0,
      created_at: challenge.created_at || "",
    } as Challenge;
  });
}


// ... imports
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";

// ... empty arrays

// Fetch functions remain the same (they will return [] automatically via RLS if blocked, but we save bandwidth)

export function useAdminContent() {
  const queryClient = useQueryClient();
  const { saveVisibilityConfig } = useUnifiedVisibility();
  const { isEnabled: isDietsEnabled } = useFeatureFlag('diets_enabled');
  const { isEnabled: isTrainingModeEnabled } = useFeatureFlag('training_mode_enabled');

  // 1. Dietas (Dishes)
  const dietsQuery = useQuery({
    queryKey: ["admin-content", "diets"], // Standardized key
    queryFn: fetchDiets,
    enabled: isDietsEnabled,
    staleTime: 0,
  });

  // 2. Treinos
  const workoutsQuery = useQuery({
    queryKey: ["admin-content", "workouts"], // Standardized key
    queryFn: fetchWorkouts,
    enabled: isTrainingModeEnabled,
    staleTime: 0,
  });

  // 3. Desafios
  const challengesQuery = useQuery({
    queryKey: ["admin-content", "challenges"], // Standardized key
    queryFn: fetchChallenges,
    staleTime: 0,
  }); // Gamification has its own flag, but for now we assume it's always on or use default


  // 5. Exercícios da Biblioteca
  const libraryExercisesQuery = useQuery({
    queryKey: ["admin-content", "library-exercises"], // Standardized key
    queryFn: fetchLibraryExercises,
    enabled: isTrainingModeEnabled,
    staleTime: 0,
  });

  // 6. Grupos Musculares
  const muscleGroupsQuery = useQuery({
    queryKey: ["admin-content", "muscle-groups"], // Standardized key
    queryFn: fetchMuscleGroups,
    enabled: isTrainingModeEnabled,
  });

  // 7. Planos (Subscription Plans)
  const plansQuery = useQuery({ // These are subscription plans, always enabled for admin
    queryKey: ["admin-content", "plans"], // Standardized key
    queryFn: fetchPlans,
    staleTime: 0,
  });

  // 8. Tipos de Exercício
  const exerciseTypesQuery = useQuery({
    queryKey: ["admin-content", "exercise-types"], // Standardized key
    queryFn: fetchExerciseTypes,
    enabled: isTrainingModeEnabled,
  });

  // 9. Níveis de Exercício
  const exerciseLevelsQuery = useQuery({
    queryKey: ["admin-content", "exercise-levels"], // Standardized key
    queryFn: fetchExerciseLevels,
    enabled: isTrainingModeEnabled,
  });

  // Diet mutations
  const saveDietMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Omit<Diet, "id" | "createdAt"> }) => {
      console.log("[saveDietMutation] Saving diet/dish:", { id, title: data.title, imagePath: data.imagePath });

      if (id) {
        // Update
        const { error } = await supabase
          .from("dishes") // Was diets
          .update({
            title: data.title,
            description: data.description,
            title_en: (data as any).titleEn || null,
            title_es: (data as any).titleEs || null,
            description_en: (data as any).descriptionEn || null,
            description_es: (data as any).descriptionEs || null,
            image_url: data.imageUrl,
            image_path: data.imagePath || null, // Ensure null if empty to clear previous if changed
            category: data.category,
            calories: data.macros.calories,
            protein: data.macros.protein,
            carbs: data.macros.carbs,
            fat: data.macros.fat,
            is_active: data.isActive,
            assigned_to_type: data.assigned_to_type || "global",
            assigned_to_id: data.assigned_to_id || null,
            // Also update visibility settings on update
            visibility: (data as any).visibilityType || 'global',
            plan_ids: (data as any).planIds || [],
          })
          .eq("id", id);
        if (error) throw error;

        // Update ingredients
        // 1. Clear both tables for this dish
        await supabase.from("diet_ingredients").delete().eq("diet_id", id);
        await supabase.from("dish_ingredients").delete().eq("dish_id", id);

        const legacyIngredients = data.ingredients.filter(ing => ing.isLegacy);
        const smartIngredients = data.ingredients.filter(ing => !ing.isLegacy && ing.ingredientId);

        if (legacyIngredients.length > 0) {
          await supabase.from("diet_ingredients").insert(
            legacyIngredients.map((ing, idx) => ({
              diet_id: id,
              name: ing.name,
              quantity: String(ing.quantity), // Legacy uses string
              unit: ing.unit,
              display_order: idx,
            }))
          );
        }

        if (smartIngredients.length > 0) {
          await supabase.from("dish_ingredients").insert(
            smartIngredients.map((ing) => ({
              dish_id: id,
              ingredient_id: ing.ingredientId!,
              quantity: Number(ing.quantity) || 0,
              metric_unit: ing.unit
            }))
          );
        }

        // Update preparation steps
        await supabase.from("diet_preparation_steps").delete().eq("diet_id", id);
        if (data.preparation.length > 0) {
          await supabase.from("diet_preparation_steps").insert(
            data.preparation.map((step, idx) => ({
              diet_id: id,
              step_order: idx + 1,
              description: step.description,
            }))
          );
        }
      } else {
        // Create
        const { data: newDiet, error } = await supabase
          .from("dishes") // Was diets
          .insert({
            title: data.title,
            description: data.description,
            title_en: (data as any).titleEn || null,
            title_es: (data as any).titleEs || null,
            description_en: (data as any).descriptionEn || null,
            description_es: (data as any).descriptionEs || null,
            image_url: data.imageUrl,
            image_path: data.imagePath || null,
            category: data.category,
            calories: data.macros.calories,
            protein: data.macros.protein,
            carbs: data.macros.carbs,
            fat: data.macros.fat,
            is_active: data.isActive,
            content_origin: "system",
            // Corrected Visibility Fields
            visibility: (data as any).visibilityType || 'global',
            plan_ids: (data as any).planIds || [],
            assigned_to_type: 'global',
            assigned_to_id: null,
          })
          .select()
          .single();
        if (error) throw error;

        const legacyIngredients = data.ingredients.filter(ing => ing.isLegacy);
        const smartIngredients = data.ingredients.filter(ing => !ing.isLegacy && ing.ingredientId);

        if (legacyIngredients.length > 0) {
          await supabase.from("diet_ingredients").insert(
            legacyIngredients.map((ing, idx) => ({
              diet_id: newDiet.id,
              name: ing.name,
              quantity: String(ing.quantity),
              unit: ing.unit,
              display_order: idx,
            }))
          );
        }

        if (smartIngredients.length > 0) {
          await supabase.from("dish_ingredients").insert(
            smartIngredients.map((ing) => ({
              dish_id: newDiet.id,
              ingredient_id: ing.ingredientId!,
              quantity: Number(ing.quantity) || 0,
              metric_unit: ing.unit
            }))
          );
        }

        if (data.preparation.length > 0) {
          await supabase.from("diet_preparation_steps").insert(
            data.preparation.map((step, idx) => ({
              diet_id: newDiet.id,
              step_order: idx + 1,
              description: step.description,
            }))
          );
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-content", "diets"] }); // Standardized key
      await queryClient.refetchQueries({ queryKey: ["admin-content", "diets"] }); // Force refetch
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const toggleDietActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("dishes") // Was diets
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "diets"] }); // Standardized key
    },
  });

  const toggleLibraryExerciseActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("exercises")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "library-exercises"] }); // Standardized key
    },
  });

  const deleteDietMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("diet_ingredients").delete().eq("diet_id", id);
      await supabase.from("diet_preparation_steps").delete().eq("diet_id", id);
      const { error } = await supabase.from("dishes").delete().eq("id", id); // Was diets
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "diets"] }); // Standardized key
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  // Workout mutations
  // Workout mutations
  const saveWorkoutMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Omit<Workout, "id" | "createdAt"> }) => {
      console.log("[saveWorkoutMutation] Saving workout:", {
        id,
        title: data.title,
        imagePath: data.imagePath,
        exercisesCount: data.exercises?.length
      });

      // 1. Save main workout data
      const workoutPayload = {
        title: data.title,
        description: data.description,
        // Translations: null rather than "" so the app falls back to pt-BR
        title_en: data.titleEn || null,
        title_es: data.titleEs || null,
        description_en: data.descriptionEn || null,
        description_es: data.descriptionEs || null,
        image_url: data.imageUrl,
        image_path: data.imagePath || null, // Ensure null if empty
        category: data.category || "other",
        is_active: data.isActive ?? true,
        visibility: (data as any).visibilityType || 'global',
        plan_ids: (data as any).planIds || [],
      };

      let workoutId = id;
      if (id) {
        const { error } = await supabase
          .from("workouts")
          .update(workoutPayload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: result, error } = await supabase
          .from("workouts")
          .insert(workoutPayload)
          .select()
          .single();
        if (error) throw error;
        workoutId = result.id;
      }

      if (!workoutId) throw new Error("Failed to get workout ID");

      // 2. Handle Exercises
      if (id) {
        // Delete existing exercises
        const { error: deleteError } = await supabase.from("workout_exercises").delete().eq("workout_id", id);
        if (deleteError) {
          toast.error("Erro ao limpar exercícios antigos: " + deleteError.message);
          throw deleteError;
        }
      }

      // Insert exercises
      if (data.exercises && data.exercises.length > 0) {
        toast.info(`Salvando ${data.exercises.length} exercícios...`);

        const payload = data.exercises.map((exercise: any, index: number) => {
          // Robust UUID extraction:
          let linkedExerciseId = null;

          if (exercise.id) {
            const idStr = exercise.id.toString();

            // Case 1: Pure UUID (e.g. from Drag & Drop raw exercise or fresh insert)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr)) {
              linkedExerciseId = idStr;
            }
            // Case 2: Instance ID (e.g. "instance-1723456789-UUID") -> Extract suffix
            else if (idStr.startsWith("instance-")) {
              const match = idStr.match(/-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
              if (match) linkedExerciseId = match[1];
            }
            // Case 3: DB ID (e.g. "db-ROW_UUID-EXERCISE_UUID") -> Extract 2nd UUID
            else if (idStr.startsWith("db-")) {
              // Check if it has the format db-UUID-UUID. 
              const match = idStr.match(/^db-[0-9a-f-]{36}-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
              if (match) linkedExerciseId = match[1];
            }
            // Case 4: Fallback - if it ends with a UUID, take it.
            else {
              const match = idStr.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
              if (match) linkedExerciseId = match[0];
            }
          }

          return {
            workout_id: workoutId,
            exercise_id: linkedExerciseId,
            name: exercise.name,
            description: exercise.description || "",
            // Carry the library translations onto the copy, so a workout built
            // from translated exercises stays translated for students
            name_en: exercise.nameEn || null,
            name_es: exercise.nameEs || null,
            description_en: exercise.descriptionEn || null,
            description_es: exercise.descriptionEs || null,
            sets: Number(exercise.sets) || 1,
            // Constraint: Check Exclusive Execution (Time vs Reps)
            // If Execution Type is 'time': reps must be NULL, reps_list must be NULL, duration_seconds > 0
            // If Execution Type is 'reps': duration_seconds must be NULL
            reps: (exercise.executionType === 'time')
              ? null
              : (exercise.reps?.toString() || "0"),

            // Constraint check_superset_rest: if rest_type is 'group', rest_seconds MUST be 0.
            rest_seconds: (exercise.restType === 'group') ? 0 : (exercise.restSeconds !== undefined ? Number(exercise.restSeconds) : 60),

            exercise_order: index + 1,

            // Advanced Fields
            superset_id: exercise.supersetId || null,
            rest_type: exercise.restType || 'individual',
            execution_type: exercise.executionType || 'reps',
            reps_mode: exercise.repsMode || 'fixed',

            // Correctly parse reps_list from the comma-separated reps string if in variable mode
            // MUST be NULL if execution_type is 'time'
            reps_list: (exercise.executionType !== 'time' && exercise.repsMode === 'variable' && exercise.reps)
              ? exercise.reps.toString().split(',').map(s => s.trim())
              : null,

            // MUST be NULL if execution_type is 'reps'
            duration_seconds: (exercise.executionType === 'time') ? (exercise.durationSeconds || null) : null,
          };
        });

        console.log("[saveWorkoutMutation] Payload exercises:", payload);

        try {
          const { error: insertError } = await supabase.from("workout_exercises").insert(payload);
          if (insertError) {
            console.error("[saveWorkoutMutation] Insert Error:", insertError);
            toast.error(`Erro detalhado ao inserir: ${insertError.message}`);
            throw insertError;
          }
        } catch (err: any) {
          console.error("[saveWorkoutMutation] Exception during insert:", err);
          toast.error(`Exceção ao inserir: ${err.message}`);
          throw err;
        }
      }
    },
    onSuccess: async () => {
      // Invalidate and Refetch to ensure UI updates immediately
      await queryClient.invalidateQueries({ queryKey: ["admin-content", "workouts"] });
      await queryClient.refetchQueries({ queryKey: ["admin-content", "workouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: any) => {
      console.error("Erro ao salvar treino:", error);
      toast.error(`ERRO CRÍTICO AO SALVAR: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  });

  const toggleWorkoutActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("workouts")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "workouts"] }); // Standardized key
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workout_exercises").delete().eq("workout_id", id);
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "workouts"] }); // Standardized key
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const exportWorkoutMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.rpc('export_workouts', { p_workout_ids: ids });
      if (error) throw error;
      return data;
    }
  });

  const importWorkoutsMutation = useMutation({
    mutationFn: async (json: any) => {
      const { data, error } = await supabase.rpc('import_workouts', { p_data: json, p_dry_run: false });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
    }
  });

  // Diet Export/Import Mutations
  const exportDietsMutation = useMutation({
    mutationFn: async (ids?: string[]) => {
      const { data, error } = await (supabase.rpc as any)('export_dishes', { p_dish_ids: ids || null });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pratos_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Pratos exportados com sucesso!");
    },
    onError: (error) => toast.error("Erro ao exportar pratos: " + error.message)
  });

  const importDietsMutation = useMutation({
    mutationFn: async (json: any) => {
      // Validation handled in RPC or we trust it matches export format
      const { data, error } = await (supabase.rpc as any)('import_dishes', { p_json: json });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-diets"] });
      if (data?.success) {
        toast.success(`Importação: ${data.imported} novos, ${data.updated} atualizados, ${data.skipped} pulados.`);
      } else {
        toast.error("Erro na importação: " + (data?.error || "Desconhecido"));
      }
    },
    onError: (error) => toast.error("Erro ao importar pratos: " + error.message)
  });

  // Challenge mutations
  const saveChallengeMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Omit<Challenge, "id" | "createdAt"> }) => {
      if (id) {
        const { error } = await supabase
          .from("challenges")
          .update({
            name: data.name,
            description: data.description,
            name_en: (data as any).nameEn || null,
            name_es: (data as any).nameEs || null,
            description_en: (data as any).descriptionEn || null,
            description_es: (data as any).descriptionEs || null,
            cover_url: data.cover_url,
            duration_days: data.duration_days,
            is_active: data.is_active,
          })
          .eq("id", id);
        if (error) throw error;

        // Delete existing days and tasks
        // This will cascade delete tasks due to DB constraints or we can do it explicitly
        const { data: existingDays } = await supabase
          .from("challenge_days")
          .select("id")
          .eq("challenge_id", id);

        if (existingDays) {
          // Explicit delete for safety, though cascade should handle it
          for (const day of existingDays) {
            await supabase.from("challenge_tasks").delete().eq("challenge_day_id", day.id);
          }
          await supabase.from("challenge_days").delete().eq("challenge_id", id);
        }

        // Insert new days and tasks
        for (const day of data.days) {
          const { data: newDay } = await supabase
            .from("challenge_days")
            .insert({
              challenge_id: id,
              day_number: day.day_number,
            })
            .select()
            .single();

          if (newDay && day.tasks && day.tasks.length > 0) {
            await supabase.from("challenge_tasks").insert(
              day.tasks.map((task, idx) => ({
                challenge_day_id: newDay.id,
                title: task.title,
                type: task.type,
                dish_id: task.dish_id,
                diet_plan_id: task.diet_plan_id,
                workout_id: task.workout_id,
                exercise_id: task.exercise_id,
                config: task.config,
                order_index: idx + 1,
              }))
            );
          }
        }
      } else {
        const { data: newChallenge, error } = await supabase
          .from("challenges")
          .insert({
            name: data.name,
            description: data.description,
            name_en: (data as any).nameEn || null,
            name_es: (data as any).nameEs || null,
            description_en: (data as any).descriptionEn || null,
            description_es: (data as any).descriptionEs || null,
            cover_url: data.cover_url,
            duration_days: data.duration_days,
            is_active: data.is_active,
          })
          .select()
          .single();
        if (error) throw error;

        for (const day of data.days) {
          const { data: newDay } = await supabase
            .from("challenge_days")
            .insert({
              challenge_id: newChallenge.id,
              day_number: day.day_number,
            })
            .select()
            .single();

          if (newDay && day.tasks && day.tasks.length > 0) {
            await supabase.from("challenge_tasks").insert(
              day.tasks.map((task, idx) => ({
                challenge_day_id: newDay.id,
                title: task.title,
                type: task.type,
                dish_id: task.dish_id,
                diet_plan_id: task.diet_plan_id,
                workout_id: task.workout_id,
                exercise_id: task.exercise_id,
                config: task.config,
                order_index: idx + 1,
              }))
            );
          }
        }
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const toggleChallengeActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("challenges")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: days } = await supabase
        .from("challenge_days")
        .select("id")
        .eq("challenge_id", id);

      if (days) {
        for (const day of days) {
          await supabase.from("challenge_tasks").delete().eq("challenge_day_id", day.id);
        }
        await supabase.from("challenge_days").delete().eq("challenge_id", id);
      }

      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  // Library Exercise mutations
  const saveLibraryExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<Exercise & { muscleGroupIds: string[]; planIds: string[] }> }) => {
      const payload = {
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        // Translations: null rather than "" so the app falls back to pt-BR
        name_en: data.nameEn || null,
        name_es: data.nameEs || null,
        description_en: data.descriptionEn || null,
        description_es: data.descriptionEs || null,
        instructions_en: data.instructionsEn || null,
        instructions_es: data.instructionsEs || null,
        image_url: data.imageUrl,
        image_path: (data as any).imagePath,
        equipment: data.equipment || "none",
        difficulty: (data.difficulty as any) || "intermediate",
        is_compound: data.isCompound ?? false,
        default_sets: data.sets || 3,
        default_reps: String(data.reps || "12"),
        default_rest_seconds: data.restSeconds || 60,
        type_id: (data as any).typeId,
        level_id: (data as any).levelId,
        updated_at: new Date().toISOString(),
        // New Visibility Fields
        visibility: (data as any).visibilityType || 'global',
        plan_ids: (data as any).planIds || [],
      };

      let exerciseId = id;

      if (id) {
        const { error } = await (supabase as any).from("exercises").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { data: newEx, error } = await (supabase as any).from("exercises").insert({
          ...payload,
          created_by_type: 'admin',
          created_by_id: userData.user?.id
        }).select().single();
        if (error) throw error;
        exerciseId = newEx.id;
      }

      if (!exerciseId) return;

      // Update muscle groups if provided
      if (data.muscleGroupIds) {
        await (supabase as any).from("exercise_muscle_groups").delete().eq("exercise_id", exerciseId);
        if (data.muscleGroupIds.length > 0) {
          const relations = data.muscleGroupIds.map(mgId => ({
            exercise_id: exerciseId,
            muscle_group_id: mgId,
            is_primary: true
          }));
          const { error: relError } = await (supabase as any).from("exercise_muscle_groups").insert(relations);
          if (relError) throw relError;
        }
      }

      // NO NEED TO UPDATE LEGACY exercise_plans TABLE
      // Visibility and Plan IDs are now saved directly on the exercise row above.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "library-exercises"] });
    },
  });

  // Muscle Group mutations
  const saveMuscleGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<MuscleGroup> }) => {
      const payload = {
        name: data.name,
        name_en: data.nameEn || null,
        name_es: (data as any).nameEs || null,
        slug: (data as any).slug,
        category: (data as any).category || 'upper',
        icon: data.icon,
        image_url: (data as any).imageUrl,
        image_path: (data as any).imagePath,
        sort_order: data.sortOrder,
      };

      if (id) {
        const { error } = await supabase.from("muscle_groups").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("muscle_groups").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "muscle-groups"] });
    },
  });

  const saveExerciseTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      const payload = {
        name: data.name,
        name_en: data.nameEn || null,
        name_es: data.nameEs || null,
        slug: data.slug,
        icon: data.icon,
        sort_order: data.sortOrder,
      };

      if (id) {
        const { error } = await supabase.from("exercise_types").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercise_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "exercise-types"] });
    },
  });

  const saveExerciseLevelMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: any }) => {
      const payload = {
        name: data.name,
        name_en: data.nameEn || null,
        name_es: data.nameEs || null,
        slug: data.slug,
        color_code: data.colorCode,
        sort_order: data.sortOrder,
      };

      if (id) {
        const { error } = await supabase.from("exercise_levels").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercise_levels").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "exercise-levels"] });
    },
  });

  const toggleMuscleGroupActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("muscle_groups").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "muscle-groups"] });
    },
  });

  const deleteMuscleGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("muscle_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "muscle-groups"] });
    },
  });

  const toggleExerciseTypeActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("exercise_types").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "exercise-types"] });
    },
  });

  const deleteExerciseTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercise_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "exercise-types"] });
    },
  });

  const toggleExerciseLevelActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("exercise_levels").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "exercise-levels"] });
    },
  });

  const deleteExerciseLevelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercise_levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content", "exercise-levels"] });
    },
  });

  return {
    // Data
    diets: dietsQuery.data || EMPTY_DIETS,
    workouts: workoutsQuery.data || EMPTY_WORKOUTS,
    challenges: challengesQuery.data || EMPTY_CHALLENGES,
    libraryExercises: libraryExercisesQuery.data || EMPTY_EXERCISES,
    muscleGroups: muscleGroupsQuery.data || EMPTY_MUSCLE_GROUPS,
    plans: plansQuery.data || EMPTY_PLANS,
    exerciseTypes: exerciseTypesQuery.data || EMPTY_TYPES,
    exerciseLevels: exerciseLevelsQuery.data || EMPTY_LEVELS,

    // Loading states
    isLoading: dietsQuery.isLoading || workoutsQuery.isLoading ||
      challengesQuery.isLoading ||
      libraryExercisesQuery.isLoading || muscleGroupsQuery.isLoading ||
      plansQuery.isLoading || exerciseTypesQuery.isLoading || exerciseLevelsQuery.isLoading,

    // Diet operations
    saveDiet: (id: string | undefined, data: Omit<Diet, "id" | "createdAt">) =>
      saveDietMutation.mutateAsync({ id, data }),
    toggleDietActive: (id: string, isActive: boolean) =>
      toggleDietActiveMutation.mutateAsync({ id, isActive }),
    deleteDiet: (id: string) => deleteDietMutation.mutateAsync(id),

    // Workout operations
    saveWorkout: (id: string | undefined, data: Omit<Workout, "id" | "createdAt">) =>
      saveWorkoutMutation.mutateAsync({ id, data }),
    toggleWorkoutActive: (id: string, isActive: boolean) =>
      toggleWorkoutActiveMutation.mutateAsync({ id, isActive }),
    deleteWorkout: (id: string) => deleteWorkoutMutation.mutateAsync(id),
    exportWorkout: exportWorkoutMutation.mutateAsync,
    importWorkout: importWorkoutsMutation.mutateAsync, // singular public name, plural mutation

    // Library Exercise operations
    saveLibraryExercise: (id: string | undefined, data: Partial<Exercise>) =>
      saveLibraryExerciseMutation.mutateAsync({ id, data }),
    toggleLibraryExerciseActive: (id: string, isActive: boolean) =>
      toggleLibraryExerciseActiveMutation.mutateAsync({ id, isActive }),
    deleteLibraryExercise: async (id: string) => {
      // First delete relations
      await (supabase as any).from("exercise_muscle_groups").delete().eq("exercise_id", id);
      await (supabase as any).from("exercise_plans").delete().eq("exercise_id", id);
      // Then delete exercise
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-content", "library-exercises"] });
    },

    // Muscle Group operations
    saveMuscleGroup: (id: string | undefined, data: Partial<MuscleGroup>) =>
      saveMuscleGroupMutation.mutateAsync({ id, data }),
    toggleMuscleGroupActive: (id: string, isActive: boolean) =>
      toggleMuscleGroupActiveMutation.mutateAsync({ id, isActive }),
    deleteMuscleGroup: (id: string) => deleteMuscleGroupMutation.mutateAsync(id),

    saveDataset: (data: any) => Promise.resolve(), // Placeholder
    exportDiets: (ids?: string[]) => exportDietsMutation.mutateAsync(ids),
    importDiets: (json: any) => importDietsMutation.mutateAsync(json),
    // Exercise Taxonomy operations
    saveExerciseType: (id: string | undefined, data: any) =>
      saveExerciseTypeMutation.mutateAsync({ id, data }),
    toggleExerciseTypeActive: (id: string, isActive: boolean) =>
      toggleExerciseTypeActiveMutation.mutateAsync({ id, isActive }),
    deleteExerciseType: (id: string) => deleteExerciseTypeMutation.mutateAsync(id),

    saveExerciseLevel: (id: string | undefined, data: any) =>
      saveExerciseLevelMutation.mutateAsync({ id, data }),
    toggleExerciseLevelActive: (id: string, isActive: boolean) =>
      toggleExerciseLevelActiveMutation.mutateAsync({ id, isActive }),
    deleteExerciseLevel: (id: string) => deleteExerciseLevelMutation.mutateAsync(id),

    // Challenge operations
    saveChallenge: (id: string | undefined, data: Omit<Challenge, "id" | "createdAt">) =>
      saveChallengeMutation.mutateAsync({ id, data }),
    toggleChallengeActive: (id: string, isActive: boolean) =>
      toggleChallengeActiveMutation.mutateAsync({ id, isActive }),
    deleteChallenge: (id: string) => deleteChallengeMutation.mutateAsync(id),


    // Import/Export
    exportLibraryExercises: async () => {
      const { data: exercises, error } = await (supabase as any)
        .from("exercises")
        .select(`
          *,
          exercise_muscle_groups(muscle_groups(slug)),
          exercise_plans(plans(name)),
          exercise_types(slug),
          exercise_levels(slug)
        `)
        .eq('is_active', true);

      if (error) throw error;

      const formatted = exercises.map((ex: any) => ({
        name: ex.name,
        description: ex.description,
        instructions: ex.instructions,
        media: { url: ex.image_url, path: ex.image_path },
        technical: {
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          isCompound: ex.is_compound,
          defaultSets: ex.default_sets,
          defaultReps: ex.default_reps,
          defaultRestSeconds: ex.default_rest_seconds
        },
        muscleGroups: ex.exercise_muscle_groups?.map((m: any) => m.muscle_groups.slug) || [],
        visibilityPlans: ex.exercise_plans?.map((p: any) => p.plans.name) || [],
        taxonomy: {
          type: ex.exercise_types?.slug,
          level: ex.exercise_levels?.slug
        }
      }));

      return {
        version: "1.0",
        metadata: { exportedAt: new Date().toISOString(), total: formatted.length },
        exercises: formatted
      };
    },

    importLibraryExercises: async (jsonContent: any) => {
      const { exercises } = jsonContent;
      if (!Array.isArray(exercises)) throw new Error("Formato de JSON inválido");

      // 1. Carregar Mapas de Referência
      const [{ data: mgs }, { data: pls }, { data: tps }, { data: lvs }] = await Promise.all([
        supabase.from("muscle_groups").select("id, slug"),
        supabase.from("plans").select("id, name"),
        supabase.from("exercise_types").select("id, slug"),
        supabase.from("exercise_levels").select("id, slug")
      ]);

      const muscleMap = new Map((mgs as any[])?.map(m => [m.slug, m.id]));
      const planMap = new Map((pls as any[])?.map(p => [p.name, p.id]));
      const typeMap = new Map((tps as any[])?.map(t => [t.slug, t.id]));
      const levelMap = new Map((lvs as any[])?.map(l => [l.slug, l.id]));

      const results = { imported: 0, skipped: 0, errors: [] as string[] };

      for (const ex of exercises) {
        try {
          const { data: existing } = await supabase
            .from("exercises")
            .select("id")
            .eq("name", ex.name)
            .maybeSingle();

          if (existing) {
            results.skipped++;
            continue;
          }

          const { data: userData } = await supabase.auth.getUser();
          const { data: newEx, error: exError } = await (supabase as any).from("exercises").insert({
            name: ex.name,
            description: ex.description,
            instructions: ex.instructions,
            image_url: ex.media?.url,
            image_path: ex.media?.path,
            equipment: ex.technical?.equipment || 'none',
            difficulty: ex.technical?.difficulty || 'intermediate',
            is_compound: ex.technical?.isCompound || false,
            default_sets: ex.technical?.defaultSets || 3,
            default_reps: String(ex.technical?.defaultReps || "12"),
            default_rest_seconds: ex.technical?.defaultRestSeconds || 60,
            type_id: ex.taxonomy?.type ? typeMap.get(ex.taxonomy.type) : null,
            level_id: ex.taxonomy?.level ? levelMap.get(ex.taxonomy.level) : null,
            created_by_type: 'admin',
            created_by_id: userData.user?.id
          }).select().single();

          if (exError) throw exError;

          const muscleIds = ex.muscleGroups?.map((slug: string) => muscleMap.get(slug)).filter(Boolean);
          if (muscleIds?.length) {
            await (supabase as any).from("exercise_muscle_groups").insert(
              muscleIds.map((id: string) => ({ exercise_id: newEx.id, muscle_group_id: id, is_primary: true }))
            );
          }

          const planIds = ex.visibilityPlans?.map((name: string) => planMap.get(name)).filter(Boolean);
          if (planIds?.length) {
            await (supabase as any).from("exercise_plans").insert(
              planIds.map((id: string) => ({ exercise_id: newEx.id, plan_id: id }))
            );
          }

          results.imported++;
        } catch (err: any) {
          results.errors.push(`Erro no exercício "${ex.name}": ${err.message}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["admin-content", "library-exercises"] });
      return results;
    },

    generateExerciseTemplate: () => {
      return {
        version: "1.0",
        exercises: [
          {
            name: "Supino Reto Exemplo",
            description: "Descrição do exercício.",
            instructions: "1. Deite no banco... 2. Desça a barra... ",
            media: {
              url: "https://exemplo.com/gif-execucao.gif",
              path: "exercises/exemplo.gif"
            },
            technical: {
              equipment: "barbell",
              difficulty: "intermediate",
              isCompound: true,
              defaultSets: 3,
              defaultReps: "12",
              defaultRestSeconds: 60
            },
            muscleGroups: ["peito", "triceps"],
            visibilityPlans: ["Plano Free"],
            taxonomy: {
              type: "strength",
              level: "beginner"
            }
          }
        ]
      };
    },
  };
}
