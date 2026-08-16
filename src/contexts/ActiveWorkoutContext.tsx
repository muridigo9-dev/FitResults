
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useActiveSession, useWorkoutSession } from "@/hooks/useWorkoutSession";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ActiveSessionData {
    id: string;
    workout_id: string;
    started_at: string;
    status: string;
    completed_exercises: number;
    total_exercises: number;
    workout: {
        id: string;
        title: string;
        image_url?: string;
    } | null;
}

interface ActiveWorkoutContextType {
    activeSession: ActiveSessionData | null | undefined;
    isLoading: boolean;
    startWorkout: (workoutId: string, seriesId?: string, isUserWorkout?: boolean) => Promise<string | null>;
    cancelWorkout: () => Promise<void>;
    resumeWorkout: () => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextType | undefined>(undefined);


export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
    const { data: activeSession, isLoading } = useActiveSession();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // We initialize the hook with the active session ID so we can control it (cancel, etc)
    // startSession doesn't need ID, so it works too.
    const { startSession, abandonSession } = useWorkoutSession(activeSession?.id);

    /**
     * Starting a workout no longer takes the student anywhere.
     *
     * It used to push them onto a separate execution screen full of weight and
     * set fields, which is the wrong tool for a mind-body practice and a wall
     * for the older students this app is built for. The session now begins
     * under the workout they are already looking at, and the page they are on
     * turns into the player.
     */
    const handleStartWorkout = async (workoutId: string, seriesId?: string, isUserWorkout: boolean = false) => {
        // 1. Check if there is already an active session
        if (activeSession) {
            // If same workout, the caller is already on it - hand back the id
            if (activeSession.workout_id === workoutId) {
                return activeSession.id;
            }

            // If different, we block. The UI should ask user to cancel first.
            toast({
                title: "Treino em andamento",
                description: "Você já possui um treino ativo. Finalize-o antes de iniciar outro.",
                variant: "destructive",
            });
            return null;
        }

        try {
            const sessionId = await startSession({ workoutId, seriesId, isUserWorkout });
            if (sessionId) {
                // Make the new session visible to the page that asked for it
                // before it renders its first "Next".
                await queryClient.invalidateQueries({ queryKey: ["active-workout-session"] });
                return sessionId;
            }
            return null;
        } catch (error) {
            console.error("Failed to start workout:", error);
            return null;
        }
    };

    const handleCancelWorkout = async () => {
        if (!activeSession) return;
        try {
            await abandonSession();
            // Force immediate update of the cache
            await queryClient.invalidateQueries({ queryKey: ["active-workout-session"] });
            toast({
                title: "Treino cancelado",
                description: "O treino em andamento foi cancelado.",
            });
        } catch (error) {
            console.error("Failed to cancel workout:", error);
        }
    };

    // Resuming means going back to the workout, which is where the player now
    // lives - it picks up on the first exercise that is not done yet.
    const handleResumeWorkout = () => {
        if (activeSession?.workout_id) {
            navigate(`/workouts/${activeSession.workout_id}`);
        }
    };

    return (
        <ActiveWorkoutContext.Provider
            value={{
                activeSession,
                isLoading,
                startWorkout: handleStartWorkout,
                cancelWorkout: handleCancelWorkout,
                resumeWorkout: handleResumeWorkout,
            }}
        >
            {children}
        </ActiveWorkoutContext.Provider>
    );
}

// Helper component to separate hook usage that depends on session ID


export function useActiveWorkout() {
    const context = useContext(ActiveWorkoutContext);
    if (context === undefined) {
        throw new Error("useActiveWorkout must be used within an ActiveWorkoutProvider");
    }
    return context;
}
