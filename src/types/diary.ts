// ============================================
// DIARY TYPES - User Activity Logging
// ============================================

export type DiaryEntrySource = "diet" | "workout" | "challenge" | "manual";

// Base entry interface
export interface DiaryEntryBase {
  id: string;
  userId?: string;
  date: string; // ISO date YYYY-MM-DD
  source: DiaryEntrySource;
  createdAt: string;
}

// Meal log entry
export interface MealLogEntry extends DiaryEntryBase {
  type: "meal";
  dietId: string;
  dietTitle: string;
  dietCategory: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients?: any[]; // Granular ingredient details
}

// Workout log entry
export interface WorkoutLogEntry extends DiaryEntryBase {
  type: "workout";
  workoutId: string;
  workoutTitle: string;
  workoutCategory: string;
  exercisesCount: number;
  duration?: number; // minutes
}

// Challenge task log entry
export interface ChallengeTaskLogEntry extends DiaryEntryBase {
  type: "challenge_task";
  challengeId: string;
  challengeName: string;
  dayNumber: number;
  taskId: string;
  taskTitle: string;
  taskType: "water" | "workout" | "meal" | "habit";
  target: number;
  unit: string;
}

// Exercise log entry (Single exercise)
export interface ExerciseLogEntry extends DiaryEntryBase {
  type: "exercise";
  exerciseId: string;
  exerciseTitle: string;
  muscleGroup?: string;
}

// Union type for all diary entries
export type DiaryEntry = MealLogEntry | WorkoutLogEntry | ChallengeTaskLogEntry | ExerciseLogEntry;

// User challenge progress
export interface UserChallengeProgress {
  challengeId: string;
  startedAt: string;
  currentDay: number;
  completedTasks: string[]; // task IDs
  status: "active" | "completed" | "abandoned";
}

// Daily summary
export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsCount: number;
  workoutsCount: number;
  challengeTasksCount: number;
}
