
export type ChallengeType = 'global' | 'academy';
export type ChallengeVisibility = 'public' | 'plan_based' | 'invite_only';
export type ChallengeTaskType = 'workout' | 'diet' | 'habit' | 'checkin' | 'custom';
export type ChallengeStatus = 'active' | 'completed' | 'abandoned';

export interface ChallengeTask {
    id: string;
    challenge_day_id: string;
    type: ChallengeTaskType;
    title: string;
    // Content Linking
    dish_id?: string;
    diet_plan_id?: string;
    workout_id?: string;
    exercise_id?: string;

    config?: Record<string, any>;
    is_mandatory: boolean;
    xp_reward: number;
    order_index: number;
}

export interface ChallengeDay {
    id: string;
    challenge_id: string;
    day_number: number;
    dayNumber?: number; // UI Alias
    title?: string;
    description?: string;
    xp_bonus: number;
    tasks?: ChallengeTask[];
}

export interface ChallengeRequirements {
    min_level?: number;
    allowed_plans?: string[]; // IDs of plans
    excluded_plans?: string[];
}

export interface Challenge {
    id: string;
    name: string;
    description?: string;
    cover_url?: string;
    imageUrl?: string; // UI Alias
    type: ChallengeType;
    academy_id?: string;
    created_by?: string;
    start_date?: string; // ISO Date
    end_date?: string; // ISO Date
    duration_days: number;
    totalDays?: number; // UI Alias
    is_active: boolean;
    isActive?: boolean; // UI Alias

    // New Visibility System
    visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
    planIds?: string[];

    // Legacy
    visibility_type: ChallengeVisibility;
    requirements?: ChallengeRequirements;
    xp_reward: number;
    badge_id?: string;
    created_at: string;
    days?: ChallengeDay[];
    // UI Fields
    is_joined?: boolean;
    participation_status?: ChallengeStatus;
    user_progress?: {
        current_day: number;
        total_days: number;
    };
}

export interface UserChallengeParticipation {
    id: string;
    user_id: string;
    challenge_id: string;
    academy_id?: string;
    status: ChallengeStatus;
    current_day: number;
    started_at: string;
    completed_at?: string;
    last_activity_at: string;
    challenge?: Challenge; // Joined
    progress?: UserChallengeProgress[]; // Joined
}

export interface UserChallengeProgress {
    id: string;
    participation_id: string;
    challenge_day_id: string;
    completed_at: string;
    tasks_completed: string[]; // Array of task IDs
}
