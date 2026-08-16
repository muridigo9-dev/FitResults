// Water goal in milliliters
export const WATER_GOAL_ML = 2000;

/** Signature of the `t` returned by useI18n / useI18nSafe. */
type TranslateFn = (key: string, paramsOrOptions?: Record<string, unknown>) => string;

// Meal types: translation keys, resolved through `mealTypeLabel`
export const MEAL_TYPE_KEYS: Record<string, string> = {
  breakfast: "nutrition.mealTypes.breakfast",
  lunch: "nutrition.mealTypes.lunch",
  dinner: "nutrition.mealTypes.dinner",
  snack: "nutrition.mealTypes.snack",
};

/** Label for a meal category, falling back to the raw value for unknown ones. */
export function mealTypeLabel(t: TranslateFn, category?: string | null): string {
  if (!category) return t("nutrition.mealTypes.other");
  const key = MEAL_TYPE_KEYS[category];
  return key ? t(key) : category;
}

// Task type icons mapping
export const TASK_TYPE_ICONS: Record<string, string> = {
  water: "💧",
  workout: "🏋️",
  meal: "🍽️",
  habit: "✅",
};

// Workout categories: translation keys, resolved through `workoutCategoryLabel`
export const WORKOUT_CATEGORY_KEYS: Record<string, string> = {
  cardio: "workouts.categories.cardio",
  strength: "workouts.categories.strength",
  hiit: "workouts.categories.hiit",
  flexibility: "workouts.categories.flexibility",
  yoga: "workouts.categories.yoga",
  taichi: "workouts.categories.taichi",
  functional: "workouts.categories.functional",
  calisthenics: "workouts.categories.calisthenics",
  stretching: "workouts.categories.stretching",
};

/** Label for a workout category, falling back to the raw value for unknown ones. */
export function workoutCategoryLabel(t: TranslateFn, category?: string | null): string {
  if (!category) return "";
  const key = WORKOUT_CATEGORY_KEYS[category];
  return key ? t(key) : category;
}

/** Category options for selects and filter rows, in display order. */
export function workoutCategoryOptions(t: TranslateFn): { value: string; label: string }[] {
  return Object.keys(WORKOUT_CATEGORY_KEYS).map((value) => ({
    value,
    label: workoutCategoryLabel(t, value),
  }));
}

// Diet category colors
export const DIET_CATEGORY_COLORS: Record<string, string> = {
  breakfast: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  lunch: "bg-green-500/10 text-green-600 border-green-500/20",
  dinner: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  snack: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

// Workout category colors
export const WORKOUT_CATEGORY_COLORS: Record<string, string> = {
  cardio: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  strength: "bg-red-500/10 text-red-600 border-red-500/20",
  hiit: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  flexibility: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  yoga: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  taichi: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  functional: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  calisthenics: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  stretching: "bg-green-500/10 text-green-600 border-green-500/20",
};

// Progress chart types
export interface DayProgress {
  day: string;
  dayShort: string;
  date: string;
  status: "complete" | "partial" | "not_started";
  percentage: number;
}

export interface WaterData {
  day: string;
  consumed: number;
  goal: number;
}

export interface WorkoutData {
  day: string;
  sessions: number;
}

export interface WeightData {
  day: string;
  date: string;
  weight: number | null;
}
