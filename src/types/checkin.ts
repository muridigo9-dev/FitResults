// Check-in status
export type CheckinStatus = "not_started" | "partial" | "complete";

// Mood options
export type MoodType = "great" | "good" | "okay" | "bad";

// Meal entry
export interface MealEntry {
  dietId: string;
  dietName: string;
  source?: "system" | "user" | "admin";
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  completed: boolean;
  consumedMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Workout entry
export interface WorkoutEntry {
  workoutId: string;
  workoutName: string;
  source?: "system" | "user";
  completed: boolean;
  durationMinutes?: number;
}

// Challenge task entry
export interface ChallengeTaskEntry {
  challengeId: string;
  dayNumber: number;
  taskId: string;
  taskName: string;
  taskType: string;
  completed: boolean;
  value?: number;
  target?: number;
  unit?: string;
}

// Habit entry for daily tracking
export interface HabitEntry {
  habitId: string;
  habitName: string;
  icon: string;
  color: string;
  unit: string;
  goal: number;
  current: number; // For goal=1 habits, map 0/1 to boolean
  completed: boolean;
  // properties used in useCheckin but potentially not in DB entry directly
  currentValue?: number; // Alias for current in some contexts
  id?: string; // Alias for habitId
}

// Water tracking
export interface WaterEntry {
  current: number;
  goal: number;
}

// Daily check-in
export interface DailyCheckin {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  status: CheckinStatus;
  meals: MealEntry[];
  workouts: WorkoutEntry[];
  challengeTasks: ChallengeTaskEntry[];
  habits: HabitEntry[];
  water: WaterEntry;
  mood?: MoodType;
  weight?: number;
  lastWeight?: number;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Wizard step
export type CheckinStep =
  | "initial"
  | "meals"
  | "workouts"
  | "challenges"
  | "habits"
  | "water"
  | "mood"
  | "weight"
  | "summary";

export const CHECKIN_STEPS: CheckinStep[] = [
  "meals",
  "workouts",
  "challenges",
  "habits",
  "water",
  "mood",
  "weight",
  "summary"
];

export const STEP_LABELS: Record<CheckinStep, string> = {
  initial: "Início",
  meals: "Alimentação",
  workouts: "Treinos",
  challenges: "Desafios",
  habits: "Hábitos",
  water: "Água",
  mood: "Humor",
  weight: "Peso",
  summary: "Resumo"
};
