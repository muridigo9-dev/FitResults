/**
 * Mood Helpers - Centralized mood mapping and utilities
 * 
 * Ensures consistency across all components that display mood/humor
 */

export type MoodValue = "great" | "good" | "okay" | "bad";

export const MOOD_EMOJI: Record<MoodValue, string> = {
    great: "😄",
    good: "🙂",
    okay: "😐",
    bad: "😞",
};

export const MOOD_LABEL: Record<MoodValue, string> = {
    great: "Ótimo",
    good: "Bom",
    okay: "Ok",
    bad: "Ruim",
};

export const MOOD_COLOR: Record<MoodValue, string> = {
    great: "text-green-500",
    good: "text-blue-500",
    okay: "text-yellow-500",
    bad: "text-red-500",
};

/**
 * Get emoji for a mood value
 * Returns neutral emoji if mood is invalid or null
 */
export function getMoodEmoji(mood: string | null | undefined): string {
    if (!mood) return "😐";
    return MOOD_EMOJI[mood as MoodValue] || "😐";
}

/**
 * Get label for a mood value
 * Returns "Não registrado" if mood is invalid or null
 */
export function getMoodLabel(mood: string | null | undefined): string {
    if (!mood) return "Não registrado";
    return MOOD_LABEL[mood as MoodValue] || mood;
}

/**
 * Get color class for a mood value
 */
export function getMoodColor(mood: string | null | undefined): string {
    if (!mood) return "text-muted-foreground";
    return MOOD_COLOR[mood as MoodValue] || "text-muted-foreground";
}

/**
 * Check if a mood value is valid
 */
export function isValidMood(mood: string | null | undefined): mood is MoodValue {
    if (!mood) return false;
    return mood in MOOD_EMOJI;
}
