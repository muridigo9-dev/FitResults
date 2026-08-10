// ============================================
// CONTENT TYPES - Admin Content Management
// ============================================

// Ingredients (Raw Items)
export interface Ingredient {
  id: string;
  name: string;
  unit: string; // g, ml, unit
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  referenceValue: number; // usually 100
  isActive: boolean;
  createdAt: string;
}

// Dish Ingredients (Composition)
export interface DishIngredient {
  id: string;
  name: string;
  quantity: number | string; // string for legacy, number for new
  unit: string;

  // New structured fields (optional for legacy)
  ingredientId?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;

  isLegacy?: boolean;
}

// Assignment Types
export type VisibilityScope = 'plan' | 'group' | 'user' | 'global';

export interface ContentAssignment {
  assigned_to_type: VisibilityScope;
  assigned_to_id: string | null;
}

export interface PreparationStep {
  id: string;
  order: number;
  description: string;
}

export interface DietMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Dishes (was Diets)
export interface Dish {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePath?: string;
  category: string;
  ingredients: DishIngredient[];
  preparation: PreparationStep[];
  macros: DietMacros;
  isActive: boolean;
  createdAt: string;

  // New Visibility System
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
  ownerType?: 'super_admin' | 'admin' | 'academy' | 'personal' | 'student';
  planIds?: string[];
  ownerId?: string; // Add ownerId for explicit checks

  // Legacy (Deprecated)
  assigned_to_type?: VisibilityScope;
  assigned_to_id?: string | null;
}

// Alias for backward compatibility during refactor
export type Diet = Dish;

// Diet Plans (v2 Structure)
export interface DietPlanMealOption {
  id: string;
  dietPlanMealId: string;
  dishId: string;
  dishTitle: string;
  dishImage?: string;
  portionModifier: number; // 1.0 = 100%
  macros: DietMacros; // calculated with modifier
  isMain: boolean;
  parentItemId?: string;
  dish?: Dish; // Optional full dish info
}

export interface DietPlanMeal {
  id: string;
  name: string; // Session name: Breakfast, Lunch, etc.
  orderIndex: number;
  timeSuggestion?: string;
  items: DietPlanMealOption[];
}

export interface DietPlan {
  id: string;
  title: string;
  description?: string;
  objective?: string;
  objectiveBadge?: string;
  durationDays: number;
  visibilityType: 'global' | 'academy' | 'private' | 'plan_restricted';
  isActive: boolean;
  planIds: string[];
  sessions: DietPlanMeal[];
  imageUrl?: string;
  imagePath?: string;
  createdAt: string;
}

// Workouts
export interface Exercise {
  id: string;
  slug?: string;
  name: string;
  description: string;
  sets: number;
  reps: number | string;
  restSeconds: number;
  order: number;
  imageUrl?: string;
  imagePath?: string;
  gifUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  instructions?: string;
  equipment?: string;
  difficulty?: string;
  isCompound?: boolean;
  muscleGroupIds?: string[];
  primaryMuscleGroupId?: string;
  primaryMuscleGroup?: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  planIds?: string[];
  restType?: 'individual' | 'group';
  supersetId?: string;
  executionType?: 'reps' | 'time';
  repsMode?: 'fixed' | 'variable';
  defaultSets?: number;
  defaultReps?: string;
  defaultRestSeconds?: number;
  repsList?: (number | string)[];
  durationSeconds?: number;
  tags?: string[];
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  createdByType?: 'user' | 'super_admin' | 'admin' | 'academy' | 'personal';
  createdById?: string;
  academyId?: string;

  // New Visibility System
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
}

// ... (lines 145-261 skipped)

export interface MuscleGroup {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  category: "upper" | "lower" | "core" | "full";
  description?: string;
  icon?: string;
  imageUrl?: string;
  imagePath?: string;
  gifUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdByType?: 'user' | 'super_admin' | 'admin' | 'academy' | 'personal';
  createdById?: string;
  academyId?: string;
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePath?: string;
  category: string;
  exercises: Exercise[];
  muscleGroups?: string[];
  isActive: boolean;
  createdAt: string;

  // New Visibility System
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
  planIds?: string[];

  // Legacy (Deprecated)
  assigned_to_type?: VisibilityScope;
  assigned_to_id?: string | null;

  // Metadata for Student View
  lastPerformed?: string;
  completedCount?: number;
  progress?: number;
  contentOrigin?: 'system' | 'user' | 'admin';
}


export interface WorkoutAssignment {
  id: string;
  workoutId: string;
  scope: VisibilityScope;
  targetId?: string;
  assignedBy?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy?: string;
  days: TrainingPlanDay[];
}

export interface TrainingPlanDay {
  id: string;
  planId: string;
  dayOfWeek: number;
  workoutId?: string;
  notes?: string;
  order: number;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  exercises: SessionExercise[];
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  isCompleted: boolean;
  sentiment?: 'like' | 'dislike' | 'neutral';
  sets: SessionSet[];
}

export interface SessionSet {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  actualLoadKg: number;
  actualReps: number;
  rpe?: number;
  executedAt: string;
}



export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  conditionType: string;
  conditionValue: number;
  xpReward: number;
  badgeId?: string | null;
  icon?: string | null;
  rarity: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExerciseType {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ExerciseLevel {
  id: string;
  slug: string;
  name: string;
  colorCode?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  category: "upper" | "lower" | "core" | "full";
  icon?: string;
  imageUrl?: string;
  imagePath?: string;
  sortOrder: number;
  isActive: boolean;
}

// FAQ & Quotes (simple)
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: string;
}

export interface Quote {
  id: string;
  text: string;
  author?: string;
  isActive: boolean;
  createdAt: string;
}

// Content Type Union
export type ContentType =
  | "ingredients"
  | "diets"
  | "diet-plans"
  | "workouts"
  | "exercises"
  | "muscle-groups"
  | "challenges"
  | "achievements"
  | "ranking"
  | "faqs"
  | "quotes";
