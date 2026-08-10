
import type { SessionExercise, ExerciseFeedbackMood, SessionSet } from "@/types/workout";

export type ProgressionStrategy = 'linear' | 'double_progression' | 'consistency' | 'deload' | 'maintain';

export interface ProgressionSuggestion {
    type: ProgressionStrategy;
    reason: string;
    suggestedWeightKg?: number;
    suggestedReps?: number;
    suggestedDuration?: number;
    suggestedRest?: number;
    referenceExecution: {
        date: string;
        weightKg: number;
        reps: number;
        sets: number;
        duration?: number;
    };
}

/**
 * Calculates the next logical progression based on user history.
 * 
 * Rules:
 * 1. LINEAR: Increase weight if last 1-2 sessions were perfect (max reps + completed).
 * 2. DOUBLE: Increase reps if current reps < max range. Increase weight only if max reps reached.
 * 3. CONSISTENCY: Recommend maintain if just started or inconsistent.
 * 4. DELOAD: Suggest reduction if failed sets or bad mood/feedback.
 */
export function calculateProgression(
    history: SessionExercise[] // Ordered by date DESC
): ProgressionSuggestion | null {
    // We want at least 2 sessions to establish a trend/baseline
    if (!history || history.length < 2) return null;

    // We need at least the last completed session
    const lastSession = history.find(s => s.isCompleted);
    if (!lastSession) return null;

    // Fallback / Initial Reference values
    const lastSets = lastSession.sets.filter(s => s.isCompleted);
    if (lastSets.length === 0) return null;

    // Use the best set (highest weight or reps) as reference
    // Ideally we average, but for safety lets pick the "heaviest successfully completed set"
    const bestSet = lastSets.reduce((prev, current) => {
        return (current.actualWeightKg || 0) > (prev.actualWeightKg || 0) ? current : prev;
    }, lastSets[0]);

    const currentWeight = bestSet.actualWeightKg || 0;
    // If time-based, use duration
    const isTimeBased = !bestSet.actualReps && !!bestSet.actualReps; // wait, schema uses actualReps for value? 
    // IMPORTANT: The schema says actualReps stores the value. SetTracker handles it.
    // We'll treat `actualReps` as the "value" (reps or seconds).

    const currentValue = bestSet.actualReps || 0;
    const executionType = (lastSession.exercise as any)?.executionType || 'reps';

    const baseReference = {
        date: lastSession.completedAt || lastSession.createdAt,
        weightKg: currentWeight,
        reps: currentValue,
        sets: lastSets.length,
        duration: executionType === 'time' ? currentValue : undefined
    };

    // --- 1. DELOAD CHECK (Safety First) ---
    // If last mood was 'hard' or 'very_hard' OR if user failed sets in last session
    const failedSets = lastSession.sets.some(s => !s.isCompleted);
    const badMood = lastSession.mood === 'hard' || lastSession.mood === 'very_hard'; // "hard" might be good for hypertrophy, but "very_hard" + failure = deload

    // Also check if multiple sessions had "very_hard"
    const consecutiveHard = history.slice(0, 2).every(s => s.mood === 'very_hard');

    if (failedSets || consecutiveHard) {
        return {
            type: 'deload',
            reason: failedSets ? "Você falhou algumas séries no último treino. Que tal reduzir a carga?" : "Seus últimos treinos foram muito pesados.",
            suggestedWeightKg: Math.max(0, currentWeight * 0.9), // -10%
            referenceExecution: baseReference,
        };
    }

    // --- 2. PROGRESSION LOGIC ---

    // Check for perfect execution (all planned sets completed with at least planned reps/weight)
    // We don't have "planned" here easily available on the history items unless we deep check.
    // Let's assume if they completed the `defaultSets` of the exercise, it's good.
    const exerciseDef = lastSession.exercise;
    const targetSets = exerciseDef?.defaultSets || 3;

    if (lastSets.length >= targetSets) {
        // Determine strategy based on type

        // TIME BASED PROGRESSION
        if (executionType === 'time') {
            // Just Linear: +5-10% time
            const newTime = Math.ceil(currentValue * 1.05 / 5) * 5; // Round to nearest 5
            return {
                type: 'linear',
                reason: "Ótima consistência! Tente aumentar o tempo.",
                suggestedDuration: newTime,
                referenceExecution: baseReference
            };
        }

        // WEIGHT/REPS PROGRESSION

        // If we have a range (e.g. 12 reps), and user did 12+
        // NOTE: 'defaultReps' is string "12" or "10-12".
        let maxReps = 12; // Default
        if (exerciseDef?.defaultReps) {
            const parts = exerciseDef.defaultReps.split('-');
            maxReps = parseInt(parts[parts.length - 1]);
        }

        if (currentValue >= maxReps) {
            // Reached max reps -> Increase Weight (Linear)
            // Suggest +1kg or +2kg (conservative) or +2.5% 
            // Let's go with small increments: +1kg for upper, +2kg for lower? 
            // We don't know body part here easily. Let's do % or min 1kg.
            const increase = Math.max(1, Math.round(currentWeight * 0.05)); // +5% or 1kg

            return {
                type: 'linear',
                reason: `Você completou ${currentValue} repetições com facilidade. Hora de aumentar a carga!`,
                suggestedWeightKg: currentWeight + increase,
                // Reset reps to bottom of range? Or keep?
                // Usually Double Progression means drop reps back to min range.
                // Let's suggest matching previous reps but with more weight (Linear) OR if big jump, reduce reps.
                // Simple approach: Maintain reps, increase weight.
                suggestedReps: currentValue,
                referenceExecution: baseReference
            };
        } else {
            // Below max reps -> Increase Reps (Double Progression)
            return {
                type: 'double_progression',
                reason: `Mantenha a carga e tente chegar a ${maxReps} repetições.`,
                suggestedReps: currentValue + 1,
                suggestedWeightKg: currentWeight,
                referenceExecution: baseReference
            };
        }
    }

    // --- 3. MAINTENANCE ---
    // If not distinct enough to sure, or inconsistent data
    return {
        type: 'maintain',
        reason: "Mantenha o ritmo para consolidar sua força.",
        suggestedWeightKg: currentWeight,
        suggestedReps: currentValue,
        referenceExecution: baseReference
    };
}
