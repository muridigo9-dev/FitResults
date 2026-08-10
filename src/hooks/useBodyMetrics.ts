/**
 * useBodyMetrics Hook
 * 
 * Provides body composition calculations from user profile.
 * Automatically recalculates when inputs change.
 */

import { useMemo } from "react";
import type { UserBodyProfile, BodyCompositionResult } from "@/types/metrics";
import { calculateBodyComposition } from "@/lib/calculators";

interface UseBodyMetricsParams {
  profile: UserBodyProfile | null;
}

interface UseBodyMetricsResult {
  composition: BodyCompositionResult | null;
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Calculate body metrics from user profile
 */
export function useBodyMetrics({ profile }: UseBodyMetricsParams): UseBodyMetricsResult {
  const result = useMemo(() => {
    if (!profile) {
      return {
        composition: null,
        isComplete: false,
        missingFields: ["profile"],
      };
    }
    
    // Check required fields
    const missingFields: string[] = [];
    if (!profile.gender) missingFields.push("sexo");
    if (!profile.age) missingFields.push("idade");
    if (!profile.height) missingFields.push("altura");
    if (!profile.currentWeight) missingFields.push("peso atual");
    
    if (missingFields.length > 0) {
      return {
        composition: null,
        isComplete: false,
        missingFields,
      };
    }
    
    // Calculate composition
    const composition = calculateBodyComposition(profile);
    
    // Check if advanced metrics are available
    const hasAdvancedMeasurements = Boolean(
      profile.waistCircumference && 
      profile.neckCircumference
    );
    
    return {
      composition,
      isComplete: true,
      missingFields: hasAdvancedMeasurements ? [] : ["circunferências (opcional)"],
    };
  }, [profile]);
  
  return result;
}

export default useBodyMetrics;
