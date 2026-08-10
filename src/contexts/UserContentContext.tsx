import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDiets } from "@/hooks/useDiets";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { UserDiet, UserWorkout, UserContentSettings } from "@/types/userContent";
import type { Diet, Workout, Ingredient, PreparationStep, Exercise } from "@/types/content";
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
import { toast } from "sonner";

interface UserContentContextType {
  settings: UserContentSettings;
  updateSettings: (settings: Partial<UserContentSettings>) => void;

  allDiets: UserDiet[];
  allWorkouts: UserWorkout[];
  userDiets: UserDiet[];
  userWorkouts: UserWorkout[];
  isLoading: boolean;

  // Feature flags
  isDietsEnabled: boolean;
  isWorkoutsEnabled: boolean;
  isChallengesEnabled: boolean;
  isGamificationEnabled: boolean;
  isHabitsEnabled: boolean;

  addUserDiet: (diet: Omit<UserDiet, "id" | "createdAt" | "contentOrigin" | "ownerUserId">) => void;
  updateUserDiet: (id: string, diet: Partial<UserDiet>) => void;
  deleteUserDiet: (id: string) => void;

  addUserWorkout: (workout: Omit<UserWorkout, "id" | "createdAt" | "contentOrigin" | "ownerUserId">) => void;
  updateUserWorkout: (id: string, workout: Partial<UserWorkout>) => void;
  deleteUserWorkout: (id: string) => void;
}

const UserContentContext = createContext<UserContentContextType | undefined>(undefined);

const DEFAULT_SETTINGS: UserContentSettings = {
  allowUserDietCreation: true,
  allowUserWorkoutCreation: true,
};

export function UserContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { systemDiets, userDiets: userDietsRaw, isLoading: loadingDiets } = useDiets();
  const { systemWorkouts, userWorkouts: userWorkoutsRaw, isLoading: loadingWorkouts } = useWorkouts();
  const { isEnabled, isUserContentAllowed } = useFeatureFlags();

  // Feature flag checks
  const isDietsEnabled = isEnabled("diets_enabled");
  const isWorkoutsEnabled = isEnabled("training_mode_enabled");
  const isChallengesEnabled = isEnabled("challenges_enabled");
  const isGamificationEnabled = isEnabled("gamification_enabled");
  const isHabitsEnabled = isEnabled("habits_enabled");
  const allowUserDietCreation = isUserContentAllowed("user_custom_diets");
  const allowUserWorkoutCreation = isUserContentAllowed("user_custom_workouts");

  // Settings now derived from feature flags
  const settings: UserContentSettings = {
    allowUserDietCreation,
    allowUserWorkoutCreation,
  };

  // Map system content to UserDiet/UserWorkout format
  const systemDietsWithOrigin: UserDiet[] = systemDiets.map((d) => ({
    ...d,
    contentOrigin: "system" as const,
  }));

  const userDiets: UserDiet[] = userDietsRaw.map((d) => ({
    ...d,
    contentOrigin: "user" as const,
    ownerUserId: user?.id,
  }));

  const systemWorkoutsWithOrigin: UserWorkout[] = systemWorkouts.map((w) => ({
    ...w,
    contentOrigin: "system" as const,
  }));

  const userWorkouts: UserWorkout[] = userWorkoutsRaw.map((w) => ({
    ...w,
    contentOrigin: "user" as const,
    ownerUserId: user?.id,
  }));

  const allDiets = [...systemDietsWithOrigin, ...userDiets];
  const allWorkouts = [...systemWorkoutsWithOrigin, ...userWorkouts];

  // Add user diet mutation
  const addDietMutation = useMutation({
    mutationFn: async (diet: Omit<UserDiet, "id" | "createdAt" | "contentOrigin" | "ownerUserId">) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("user_diets").insert([{
        user_id: user.id,
        title: diet.title,
        description: diet.description,
        image_url: diet.imageUrl,
        image_path: diet.imagePath,
        category: diet.category,
        calories: diet.macros.calories,
        protein: diet.macros.protein,
        carbs: diet.macros.carbs,
        fat: diet.macros.fat,
        ingredients: JSON.parse(JSON.stringify(diet.ingredients)),
        preparation: JSON.parse(JSON.stringify(diet.preparation)),
        is_active: diet.isActive,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diets", "user"] });
      toast.success("Dieta criada com sucesso!");
    },
  });

  // Update user diet mutation
  const updateDietMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserDiet> }) => {
      if (!user) throw new Error("User not authenticated");

      const updateData: Record<string, unknown> = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.imageUrl) updateData.image_url = updates.imageUrl;
      if (updates.imagePath) updateData.image_path = updates.imagePath;
      if (updates.category) updateData.category = updates.category;
      if (updates.macros) {
        updateData.calories = updates.macros.calories;
        updateData.protein = updates.macros.protein;
        updateData.carbs = updates.macros.carbs;
        updateData.fat = updates.macros.fat;
      }
      if (updates.ingredients) updateData.ingredients = JSON.parse(JSON.stringify(updates.ingredients));
      if (updates.preparation) updateData.preparation = JSON.parse(JSON.stringify(updates.preparation));
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from("user_diets")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diets", "user"] });
      toast.success("Dieta atualizada!");
    },
  });

  // Delete user diet mutation
  const deleteDietMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_diets")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diets", "user"] });
      toast.success("Dieta removida!");
    },
  });

  // Add user workout mutation
  const addWorkoutMutation = useMutation({
    mutationFn: async (workout: Omit<UserWorkout, "id" | "createdAt" | "contentOrigin" | "ownerUserId">) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("user_workouts").insert([{
        user_id: user.id,
        title: workout.title,
        description: workout.description,
        image_url: workout.imageUrl,
        image_path: workout.imagePath,
        category: workout.category,
        exercises: JSON.parse(JSON.stringify(workout.exercises)) as Json,
        is_active: workout.isActive,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "user"] });
      toast.success("Treino criado com sucesso!");
    },
  });

  // Update user workout mutation
  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserWorkout> }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_workouts")
        .update({
          title: updates.title,
          description: updates.description,
          image_url: updates.imageUrl,
          image_path: updates.imagePath,
          category: updates.category,
          exercises: updates.exercises ? JSON.parse(JSON.stringify(updates.exercises)) as Json : undefined,
          is_active: updates.isActive,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "user"] });
      toast.success("Treino atualizado!");
    },
  });

  // Delete user workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts", "user"] });
      toast.success("Treino removido!");
    },
  });

  const updateSettings = (newSettings: Partial<UserContentSettings>) => {
    // Settings update would require admin role - skip for now
    console.log("Settings update:", newSettings);
  };

  return (
    <UserContentContext.Provider
      value={{
        settings,
        updateSettings,
        allDiets,
        allWorkouts,
        userDiets,
        userWorkouts,
        isLoading: loadingDiets || loadingWorkouts,
        isDietsEnabled,
        isWorkoutsEnabled,
        isChallengesEnabled,
        isGamificationEnabled,
        isHabitsEnabled,
        addUserDiet: (d) => addDietMutation.mutate(d),
        updateUserDiet: (id, d) => updateDietMutation.mutate({ id, updates: d }),
        deleteUserDiet: (id) => deleteDietMutation.mutate(id),
        addUserWorkout: (w) => addWorkoutMutation.mutate(w),
        updateUserWorkout: (id, w) => updateWorkoutMutation.mutate({ id, updates: w }),
        deleteUserWorkout: (id) => deleteWorkoutMutation.mutate(id),
      }}
    >
      {children}
    </UserContentContext.Provider>
  );
}

export function useUserContent() {
  const context = useContext(UserContentContext);
  if (!context) {
    // If context is missing, return safe defaults instead of crashing the whole app
    // This often happens during fast refresh or complex route transitions
    return {
      allDiets: [],
      allWorkouts: [],
      userDiets: [],
      userWorkouts: [],
      isLoading: false,
      isDietsEnabled: true,
      isWorkoutsEnabled: true,
      isChallengesEnabled: true,
      isGamificationEnabled: true,
      isHabitsEnabled: true,
      settings: {
        allowUserDietCreation: true,
        allowUserWorkoutCreation: true,
      },
      updateSettings: () => { },
      addUserDiet: () => { },
      updateUserDiet: () => { },
      deleteUserDiet: () => { },
      addUserWorkout: () => { },
      updateUserWorkout: () => { },
      deleteUserWorkout: () => { },
    } as UserContentContextType;
  }
  return context;
}
