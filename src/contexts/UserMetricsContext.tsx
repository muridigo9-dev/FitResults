/**
 * User Metrics Context
 * 
 * Provides centralized state for user body profile and calculated metrics.
 * Auto-recalculates when profile data changes.
 */

import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect } from "react";
import type { UserBodyProfile, BodyCompositionResult, DailyCalorieTarget, ActivityLevel, FitnessGoal } from "@/types/metrics";
import type { MacroTemplate, DailyMacros } from "@/types/nutrition";
import { DEFAULT_MACRO_TEMPLATES } from "@/types/nutrition";
import { useBodyMetrics } from "@/hooks/useBodyMetrics";
import { useCalorieCalculator } from "@/hooks/useCalorieCalculator";
import { useMacros } from "@/hooks/useMacros";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ==========================================
// CONTEXT TYPES
// ==========================================

interface UserMetricsContextValue {
  // User Profile
  profile: UserBodyProfile | null;
  updateProfile: (updates: Partial<UserBodyProfile>) => void;
  saveProfile: (profileToSave?: UserBodyProfile) => Promise<boolean | void>; // Add to interface
  setProfile: (profile: UserBodyProfile) => void;
  clearProfile: () => void;

  // Calculated Results
  bodyComposition: BodyCompositionResult | null;
  calorieTarget: DailyCalorieTarget | null;
  dailyMacros: DailyMacros | null;

  // Template Management
  activeTemplate: MacroTemplate | null;
  setActiveTemplate: (template: MacroTemplate) => void;
  templates: MacroTemplate[];

  // Status
  isProfileComplete: boolean;
  missingFields: string[];
  refreshProfile: () => Promise<void>;
}

// ==========================================
// DEFAULT VALUES
// ==========================================

const defaultTemplates: MacroTemplate[] = DEFAULT_MACRO_TEMPLATES.map((t, i) => ({
  ...t,
  id: `default-${i}`,
  createdAt: new Date().toISOString(),
}));

// No default profile - user must fill in their data
const defaultProfile: UserBodyProfile | null = null;

// ==========================================
// CONTEXT
// ==========================================

const UserMetricsContext = createContext<UserMetricsContextValue | null>(null);

// ==========================================
// PROVIDER
// ==========================================

interface UserMetricsProviderProps {
  children: ReactNode;
  initialProfile?: UserBodyProfile;
}

export function UserMetricsProvider({ children, initialProfile }: UserMetricsProviderProps) {
  const { user } = useAuth(); // Needed for fetching
  // State
  const [profile, setProfileState] = useState<UserBodyProfile | null>(initialProfile || defaultProfile);
  const [templates] = useState<MacroTemplate[]>(defaultTemplates);
  const [activeTemplateId, setActiveTemplateId] = useState<string>("default-1"); // Manutenção

  // Active template
  const activeTemplate = useMemo(() =>
    templates.find(t => t.id === activeTemplateId) || templates[1],
    [templates, activeTemplateId]
  );

  // Fetch profile on mount or user change
  useEffect(() => {
    if (!user) {
      setProfileState(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_body_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          console.log("UserMetricsContext: Profile found in user_body_profiles");
          // Map database snake_case to camelCase structure expected by app
          const mappedProfile: UserBodyProfile = {
            gender: (data.gender as any) || 'male',
            age: Number(data.age) || 0,
            height: Number(data.height) || 0,
            currentWeight: Number(data.current_weight) || 0,
            activityLevel: (data.activity_level as any) || 'moderate',
            fitnessGoal: (data.fitness_goal as any) || 'maintain',
            goalWeight: data.goal_weight ? Number(data.goal_weight) : undefined,
            waistCircumference: data.waist_circumference ? Number(data.waist_circumference) : undefined,
            hipCircumference: data.hip_circumference ? Number(data.hip_circumference) : undefined,
            neckCircumference: data.neck_circumference ? Number(data.neck_circumference) : undefined,
          };
          setProfileState(mappedProfile);
        } else {
          console.log("UserMetricsContext: No profile in user_body_profiles, checking fallbacks...");
          // FALLBACK 1: Check user_onboarding_data table
          const { data: onboardingData, error: onboardingError } = await supabase
            .from('user_onboarding_data')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!onboardingError && onboardingData) {
            console.log("UserMetricsContext: Fallback found in user_onboarding_data");
            // Calculate age from birth_date
            let age = 0;
            if (onboardingData.birth_date) {
              const birthDate = new Date(onboardingData.birth_date);
              const today = new Date();
              age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
            }

            // Map fitness goal
            let fitnessGoal: FitnessGoal = "maintain";
            if (onboardingData.primary_goal === "lose_weight") fitnessGoal = "lose_weight";
            else if (onboardingData.primary_goal === "gain_muscle") fitnessGoal = "gain_muscle";

            // Map Activity Level
            const activityMapping: Record<string, ActivityLevel> = {
              "sedentary": "sedentary",
              "lightly_active": "light",
              "light": "light",
              "moderately_active": "moderate",
              "moderate": "moderate",
              "very_active": "active",
              "active": "active",
              "extremely_active": "very_active"
            };

            const fallbackProfile: UserBodyProfile = {
              gender: (onboardingData.gender as any) || 'male',
              age: age,
              height: Number(onboardingData.height_cm) || 0,
              currentWeight: Number(onboardingData.weight_kg) || 0,
              activityLevel: activityMapping[onboardingData.activity_level] || 'moderate',
              fitnessGoal: fitnessGoal,
              goalWeight: onboardingData.target_weight_kg ? Number(onboardingData.target_weight_kg) : undefined,
            };
            setProfileState(fallbackProfile);
          } else {
            console.log("UserMetricsContext: No profile data found anywhere.");
            setProfileState(null);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setProfileState(null);
      }
    };

    fetchProfile();
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_body_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const mappedProfile: UserBodyProfile = {
          gender: data.gender as any,
          age: data.age,
          height: data.height,
          currentWeight: data.current_weight,
          activityLevel: data.activity_level as any,
          fitnessGoal: data.fitness_goal as any,
          goalWeight: data.goal_weight || undefined,
          waistCircumference: data.waist_circumference || undefined,
          hipCircumference: data.hip_circumference || undefined,
          neckCircumference: data.neck_circumference || undefined,
        };
        setProfileState(mappedProfile);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  }, [user]);

  // Hooks for calculations
  const { composition: bodyComposition } = useBodyMetrics({ profile });
  const { dailyTarget: calorieTarget, missingFields } = useCalorieCalculator({ profile });
  const { dailyMacros } = useMacros({
    calorieTarget,
    template: activeTemplate,
    bodyweightKg: profile?.currentWeight || null
  });

  // Profile management
  const updateProfile = useCallback((updates: Partial<UserBodyProfile>) => {
    setProfileState(prev => {
      if (!prev) {
        // Create new profile with defaults + updates
        const newProfile: UserBodyProfile = {
          gender: 'male',
          age: 0,
          height: 0,
          currentWeight: 0,
          activityLevel: 'moderate',
          fitnessGoal: 'maintain',
          ...updates,
        };
        return newProfile;
      }
      return { ...prev, ...updates };
    });
  }, []);

  const saveProfile = useCallback(async (profileToSave?: UserBodyProfile) => {
    const finalProfile = profileToSave || profile;
    if (!user || !finalProfile) return;

    try {
      // Map camelCase to snake_case for DB
      const dbProfile = {
        user_id: user.id,
        gender: finalProfile.gender,
        age: finalProfile.age,
        height: finalProfile.height,
        current_weight: finalProfile.currentWeight,
        activity_level: finalProfile.activityLevel,
        fitness_goal: finalProfile.fitnessGoal,
        goal_weight: finalProfile.goalWeight,
        waist_circumference: finalProfile.waistCircumference,
        hip_circumference: finalProfile.hipCircumference,
        neck_circumference: finalProfile.neckCircumference,
        // Don't save calculated fields like body_fat_percentage directly unless we trust them over DB calc
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_body_profiles')
        .upsert(dbProfile, { onConflict: 'user_id' });

      if (error) throw error;

      // Update local state just in case
      setProfileState(finalProfile);
      return true;
    } catch (error) {
      console.error("Error saving profile:", error);
      throw error;
    }
  }, [user, profile]);

  const setProfile = useCallback((newProfile: UserBodyProfile) => {
    setProfileState(newProfile);
    // Auto save on complete overwrite? Optional. Let's stick to manual save for now or explicit saveProfile call.
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
  }, []);

  const setActiveTemplate = useCallback((template: MacroTemplate) => {
    setActiveTemplateId(template.id);
  }, []);

  // Context value
  const value: UserMetricsContextValue = useMemo(() => ({
    profile,
    updateProfile,
    saveProfile, // Exported function
    setProfile,
    clearProfile,
    bodyComposition,
    calorieTarget,
    dailyMacros,
    activeTemplate,
    setActiveTemplate,
    templates,
    isProfileComplete: missingFields.length === 0,
    missingFields,
    refreshProfile,
  }), [
    profile, updateProfile, saveProfile, setProfile, clearProfile,
    bodyComposition, calorieTarget, dailyMacros,
    activeTemplate, setActiveTemplate, templates, missingFields, refreshProfile
  ]);

  return (
    <UserMetricsContext.Provider value={value}>
      {children}
    </UserMetricsContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

export function useUserMetrics(): UserMetricsContextValue {
  const context = useContext(UserMetricsContext);
  if (!context) {
    throw new Error("useUserMetrics must be used within a UserMetricsProvider");
  }
  return context;
}

export default UserMetricsContext;
