// ============================================
// USER CONTENT TYPES - User Generated Content
// ============================================

import { Diet, Workout, Ingredient, PreparationStep, DietMacros, Exercise } from "./content";

// Content Origin - tracks who created the content
export type ContentOrigin = "system" | "admin" | "user";

// Extended interfaces with origin tracking
export interface UserDiet extends Diet {
  contentOrigin: ContentOrigin;
  ownerUserId?: string;
}

export interface UserWorkout extends Workout {
  contentOrigin: ContentOrigin;
  ownerUserId?: string;
}

// Feature flags controlled by admin
export interface UserContentSettings {
  allowUserDietCreation: boolean;
  allowUserWorkoutCreation: boolean;
}

// Re-export for convenience
export type { Ingredient, PreparationStep, DietMacros, Exercise };
