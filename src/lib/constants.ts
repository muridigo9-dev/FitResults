// Water goal in milliliters
export const WATER_GOAL_ML = 2000;

// Meal type labels
export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
};

// Task type icons mapping
export const TASK_TYPE_ICONS: Record<string, string> = {
  water: "💧",
  workout: "🏋️",
  meal: "🍽️",
  habit: "✅",
};

// Workout category labels
export const WORKOUT_CATEGORY_LABELS: Record<string, string> = {
  cardio: "Cardio",
  strength: "Musculação",
  hiit: "HIIT",
  flexibility: "Flexibilidade",
  yoga: "Yoga",
  functional: "Funcional",
  calisthenics: "Calistenia",
  stretching: "Alongamento",
};

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
