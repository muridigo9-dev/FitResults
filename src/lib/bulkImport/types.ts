// ============================================
// BULK IMPORT/EXPORT TYPES
// ============================================

export type EntityType = "challenges" | "diets" | "workouts";

export type DuplicateStrategy = "skip" | "update" | "error";

export interface ImportConfig {
  on_duplicate: DuplicateStrategy;
}

export interface ImportTemplate<T> {
  version: string;
  entity: EntityType;
  on_duplicate?: DuplicateStrategy;
  items: T[];
}

// Import item status
export type ImportItemStatus = "inserted" | "updated" | "skipped" | "error";

export interface ImportItemResult {
  external_id: string;
  status: ImportItemStatus;
  reason?: string;
}

export interface ImportResult {
  total_items: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  details: ImportItemResult[];
}

// Challenge import schema
export interface ImportChallengeTask {
  title: string;
  instruction: string;
  type: "water" | "workout" | "meal" | "habit";
  target: number;
  unit: string;
}

export interface ImportChallengeDay {
  day_number: number;
  tasks: ImportChallengeTask[];
}

export interface ImportChallenge {
  external_id: string;
  name: string;
  description: string;
  total_days: number;
  is_active: boolean;
  image_url?: string;
  image_path?: string;
  days: ImportChallengeDay[];
}

// Diet import schema
export interface ImportIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface ImportPreparationStep {
  order: number;
  description: string;
}

export interface ImportDiet {
  external_id: string;
  title: string;
  description: string;
  image_url?: string;
  image_path?: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_active: boolean;
  ingredients: ImportIngredient[];
  preparation: ImportPreparationStep[];
}

// Workout import schema
export interface ImportExercise {
  name: string;
  description: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  order: number;
}

export interface ImportWorkout {
  external_id: string;
  title: string;
  description: string;
  image_url?: string;
  image_path?: string;
  category: string;
  is_active: boolean;
  exercises: ImportExercise[];
}

// Validation result
export interface ValidationError {
  field: string;
  message: string;
  itemIndex?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
