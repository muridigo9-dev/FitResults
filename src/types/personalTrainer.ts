// ============================================
// PERSONAL TRAINER MODE TYPES
// Complete type definitions for all features
// ============================================

// ============================================
// ROLES & ASSIGNMENT
// ============================================

export type ContentAssignmentType = "global" | "user" | "group";
export type GroupMemberRole = "student" | "assistant";
export type AppRole = "admin" | "moderator" | "content_creator" | "personal_trainer" | "academy_admin" | "aluno" | "user";

// ============================================
// USER GROUPS
// ============================================

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface UserGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role_in_group: GroupMemberRole;
  added_at: string;
  added_by: string | null;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

// ============================================
// CONTENT ASSIGNMENT
// ============================================

export type AssignmentStatus = "scheduled" | "active" | "completed" | "cancelled";
export type ContentType = "diet" | "workout" | "challenge" | "habit";

export interface ContentAssignment {
  id: string;
  content_type: ContentType;
  content_id: string;
  assigned_to_type: ContentAssignmentType;
  assigned_to_id: string;
  assigned_by: string;
  start_date: string;
  end_date?: string | null;
  status: AssignmentStatus;
  title?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentOption {
  type: ContentAssignmentType;
  id: string | null;
  label: string;
  description?: string;
}

// Legacy compatibility
export interface ContentAssignmentFormData {
  assigned_to_type: ContentAssignmentType;
  assigned_to_id: string | null;
}

// ============================================
// CONTENT CREATOR PERMISSIONS
// ============================================

export interface ContentCreatorPermissions {
  id: string;
  user_id: string;
  can_create_diets: boolean;
  can_create_workouts: boolean;
  can_create_challenges: boolean;
  can_create_habits: boolean;
  allowed_group_ids: string[];
  created_at: string;
  updated_at: string;
}

// ============================================
// ACADEMIES
// ============================================

export interface Academy {
  id: string;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  description?: string | null;
  owner_id?: string | null;
  max_trainers: number;
  max_students: number;
  stripe_customer_id?: string | null;
  subscription_status: string;
  billing_plan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademyTrainer {
  id: string;
  academy_id: string;
  trainer_id: string;
  role: "trainer" | "manager" | "owner";
  is_active: boolean;
  joined_at: string;
  trainer?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url?: string | null;
  };
}

// ============================================
// STUDENT INVITES
// ============================================

export type InviteStatus = "pending" | "accepted" | "expired" | "cancelled";

export interface StudentInvite {
  id: string;
  invited_by: string;
  academy_id?: string | null;
  email: string;
  token: string;
  group_id?: string | null;
  status: InviteStatus;
  expires_at: string;
  accepted_at?: string | null;
  accepted_by?: string | null;
  message?: string | null;
  created_at: string;
}

export interface InviteFormData {
  email: string;
  group_id?: string | null;
  message?: string;
}

// ============================================
// TRAINER-STUDENT RELATIONSHIP
// ============================================

export interface TrainerStudent {
  id: string;
  trainer_id: string;
  student_id: string;
  status: "active" | "inactive" | "pending";
  notes?: string | null;
  started_at: string;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
  invite_id?: string | null;
  academy_id?: string | null;
  billing_status?: string;
}

export interface TrainerStudentWithProfile extends TrainerStudent {
  student?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url?: string | null;
  };
}

export interface TrainerStudentSummary {
  trainer_id: string;
  student_id: string;
  student_name: string | null;
  student_email: string;
  student_avatar: string | null;
  status: string;
  started_at: string;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  last_checkin_date: string | null;
  checkins_last_7_days: number;
  active_assignments: number;
}

// ============================================
// ANAMNESIS (Health Assessment)
// ============================================

export type AssessmentType = "initial" | "followup" | "monthly" | "quarterly";
export type SleepQuality = "poor" | "fair" | "good" | "excellent";
export type StressLevel = "low" | "moderate" | "high" | "very_high";
export type AlcoholFrequency = "never" | "rarely" | "weekly" | "daily";
export type SmokingStatus = "never" | "former" | "current";

export interface Anamnesis {
  id: string;
  user_id: string;
  created_by: string;
  assessment_type: AssessmentType;
  assessment_date: string;
  
  // Personal data
  birth_date?: string | null;
  occupation?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  
  // Health history
  medical_conditions?: string[];
  medications?: string[];
  allergies?: string[];
  injuries?: string[];
  surgeries?: string[];
  
  // Lifestyle
  sleep_hours?: number | null;
  sleep_quality?: SleepQuality | null;
  stress_level?: StressLevel | null;
  alcohol_frequency?: AlcoholFrequency | null;
  smoking_status?: SmokingStatus | null;
  
  // Physical assessment
  height_cm?: number | null;
  weight_kg?: number | null;
  body_fat_percentage?: number | null;
  muscle_mass_kg?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  
  // Fitness assessment
  resting_heart_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  flexibility_test?: string | null;
  strength_test?: string | null;
  endurance_test?: string | null;
  
  // Goals
  primary_goal?: string | null;
  secondary_goals?: string[];
  target_weight_kg?: number | null;
  target_body_fat?: number | null;
  
  // Observations
  observations?: string | null;
  recommendations?: string | null;
  
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AnamnesisFormData extends Omit<Anamnesis, 'id' | 'created_at' | 'updated_at' | 'version'> {}

// ============================================
// STUDENT FEEDBACK
// ============================================

export type FeedbackRating = "like" | "dislike" | "neutral";

export interface StudentFeedback {
  id: string;
  user_id: string;
  content_type: ContentType | "exercise" | "assignment";
  content_id: string;
  assignment_id?: string | null;
  rating: FeedbackRating;
  comment?: string | null;
  difficulty_rating?: number | null;
  would_recommend?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSummary {
  total: number;
  likes: number;
  dislikes: number;
  avg_difficulty: number | null;
  recommend_pct: number | null;
}

// ============================================
// MUSCLE GROUPS
// ============================================

export type MuscleCategory = "upper" | "lower" | "core" | "full";

export interface MuscleGroup {
  id: string;
  name: string;
  name_en?: string | null;
  category: MuscleCategory;
  icon?: string | null;
  sort_order: number;
}

export interface ExerciseMuscleGroup {
  id: string;
  exercise_id: string;
  muscle_group_id: string;
  is_primary: boolean;
  muscle_group?: MuscleGroup;
}

// ============================================
// STUDENT EXERCISE PARAMS
// ============================================

export interface StudentExerciseParams {
  id: string;
  student_id: string;
  exercise_id: string;
  assignment_id?: string | null;
  sets?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  load_kg?: number | null;
  load_percent?: number | null;
  notes?: string | null;
  video_url?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// BILLING SETTINGS
// ============================================

export type BillingMode = "personal_pays" | "student_pays";

export interface StudentPackageTier {
  name: string;
  max_students: number;
  price_cents: number;
}

export interface PersonalBillingSettings {
  id: string;
  owner_type: "trainer" | "academy";
  owner_id: string;
  billing_mode: BillingMode;
  max_students: number;
  student_package_tiers: StudentPackageTier[];
  price_per_student_cents: number;
  student_monthly_price_cents: number;
  student_plan_stripe_price_id?: string | null;
  current_students_count: number;
  stripe_subscription_id?: string | null;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export interface TrainerStudentLimit {
  current_count: number;
  max_students: number;
  billing_mode: BillingMode | "none";
  can_add_more: boolean;
  subscription_status: string;
}

// ============================================
// COMMUNITY RANKING
// ============================================

export type RankingPeriod = "weekly" | "monthly" | "all_time";

export interface RankingEntry {
  position: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  checkins: number;
  workouts: number;
  habits: number;
}

export interface UserRankingPosition {
  position: number;
  total_participants: number;
  points: number;
  points_to_next: number;
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface GroupFormData {
  name: string;
  description: string;
  is_active: boolean;
}

export interface AssignmentFormData {
  content_type: ContentType;
  content_id: string;
  assigned_to_type: ContentAssignmentType;
  assigned_to_id: string;
  start_date: string;
  end_date?: string | null;
  title?: string;
  notes?: string;
}

// ============================================
// EXTENDED CONTENT TYPES
// ============================================

export interface AssignableContent {
  assigned_to_type: ContentAssignmentType;
  assigned_to_id: string | null;
  created_by: string | null;
}

export interface ContentWithAssignment {
  id: string;
  created_at: string;
  assigned_to_type?: string | null;
  assigned_to_id?: string | null;
  title?: string;
  name?: string;
  description?: string | null;
}
