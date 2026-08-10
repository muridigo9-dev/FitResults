// ============================================
// WORKOUT SYSTEM TYPES
// Sistema avançado de treinos e exercícios
// ============================================

import { Exercise, Workout } from "./content";

// ============================================
// ENUMS
// ============================================

export type WorkoutDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type ExerciseEquipment =
  | 'none'
  | 'dumbbell'
  | 'barbell'
  | 'cable'
  | 'machine'
  | 'kettlebell'
  | 'resistance_band'
  | 'bodyweight'
  | 'smith_machine'
  | 'trx'
  | 'medicine_ball'
  | 'foam_roller'
  | 'other';

export type ExerciseFeedbackMood =
  | 'very_easy'
  | 'easy'
  | 'moderate'
  | 'hard'
  | 'very_hard';

export type WorkoutSessionStatus =
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'abandoned';

export type ContentCreatorType =
  | 'super_admin'
  | 'admin' // Added missing type
  | 'academy'
  | 'personal'
  | 'user';

// ... (lines 45-622 omitted)

export interface ExerciseFormData {
  name: string;
  description?: string;
  instructions?: string;
  primaryMuscleGroupId?: string;
  equipment: ExerciseEquipment;
  difficulty: WorkoutDifficulty;
  defaultSets: number;
  defaultReps: string;
  defaultRestSeconds: number;
  defaultTempo?: string;
  imageUrl?: string;
  videoUrl?: string;
  tags: string[];
  isCompound: boolean;
  muscleGroupIds?: string[]; // Added missing optional field
}

export interface WorkoutSeriesFormData {
  name: string;
  code: string;
  description?: string;
  scheduledDays: number[];
  exercises: Array<{
    exerciseId: string;
    sets?: number;
    reps?: string;
    restSeconds?: number;
    notes?: string;
  }>;
}

export type LikeDislike = 'like' | 'dislike' | null;

export interface SessionFeedbackFormData {
  mood?: ExerciseFeedbackMood;
  rating?: number;
  likeDislike?: LikeDislike;
  comment?: string;
}

// ============================================
// FILTER TYPES
// ============================================

export interface ExerciseFilters {
  muscleGroupId?: string;
  equipment?: ExerciseEquipment;
  difficulty?: WorkoutDifficulty;
  isCompound?: boolean;
  search?: string;
  tags?: string[];
}

export interface WorkoutFilters {
  muscleGroupId?: string;
  category?: string;
  difficulty?: WorkoutDifficulty;
  search?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  none: 'Nenhum',
  dumbbell: 'Halteres',
  barbell: 'Barra',
  cable: 'Cabo/Polia',
  machine: 'Máquina',
  kettlebell: 'Kettlebell',
  resistance_band: 'Elástico',
  bodyweight: 'Peso Corporal',
  smith_machine: 'Smith Machine',
  trx: 'TRX/Suspensão',
  medicine_ball: 'Medicine Ball',
  foam_roller: 'Foam Roller',
  other: 'Outro',
};

export const DIFFICULTY_LABELS: Record<WorkoutDifficulty, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  expert: 'Expert',
};

export const MOOD_LABELS: Record<ExerciseFeedbackMood, string> = {
  very_easy: 'Muito Fácil',
  easy: 'Fácil',
  moderate: 'Moderado',
  hard: 'Difícil',
  very_hard: 'Muito Difícil',
};

export const MOOD_COLORS: Record<ExerciseFeedbackMood, string> = {
  very_easy: '#22C55E',
  easy: '#84CC16',
  moderate: '#EAB308',
  hard: '#F97316',
  very_hard: '#EF4444',
};

export const MOOD_ICONS: Record<ExerciseFeedbackMood, string> = {
  very_easy: '😊',
  easy: '🙂',
  moderate: '😐',
  hard: '😤',
  very_hard: '🥵',
};

export const MUSCLE_GROUP_ICONS: Record<string, string> = {
  peito: 'Heart',
  costas: 'ArrowLeft',
  ombros: 'CircleDot',
  biceps: 'Dumbbell',
  triceps: 'Dumbbell',
  antebraco: 'Hand',
  quadriceps: 'Footprints',
  posterior: 'Footprints',
  gluteos: 'Circle',
  panturrilha: 'Footprints',
  abdomen: 'Target',
  lombar: 'Spine',
  core: 'Target',
  'corpo-inteiro': 'User',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

export const WEEKDAY_FULL_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

// ============================================
// SESSION TYPES
// ============================================

export interface WorkoutStreak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: string;
  streakStartedDate?: string;
  totalWorkouts: number;
  totalWorkoutMinutes: number;
  updatedAt: string;
}

export interface SessionSet {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  plannedReps?: number;
  actualReps?: number;
  plannedWeightKg?: number;
  actualWeightKg?: number;
  restSecondsTaken?: number;
  isCompleted: boolean;
  isWarmup: boolean;
  isDropset: boolean;
  rpe?: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  exercise?: Exercise;
  seriesExerciseId?: string;
  supersetId?: string; // Derived from metadata snapshot
  displayOrder: number;
  isCompleted: boolean;
  skipped: boolean;
  skipReason?: string;
  startedAt?: string;
  completedAt?: string;
  mood?: ExerciseFeedbackMood;
  rating?: number;
  likeDislike?: LikeDislike;
  comment?: string;
  sets: SessionSet[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  workout?: Partial<Workout>;
  seriesId?: string;
  academyId?: string;
  trainerId?: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  totalDurationSeconds?: number;
  activeDurationSeconds?: number;
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
  totalVolumeKg: number;
  estimatedCalories: number;
  overallMood?: ExerciseFeedbackMood;
  overallRating?: number;
  notes?: string;
  exercises: SessionExercise[];
  deviceInfo?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteExerciseResponse {
  completed: number;
  total: number;
  xpGained: number;
}

export interface CompleteSessionResponse {
  sessionId: string;
  durationSeconds: number;
  xpGained: number;
  streakBonus: number;
}
