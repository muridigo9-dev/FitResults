/**
 * Calculators Index
 * 
 * Central export for all calculator functions.
 */

// Body Metrics
export {
  calculateBMI,
  calculateBodyFat,
  calculateWHR,
  calculateIdealWeightRange,
  calculateBodyComposition,
} from "./bodyMetrics";

// Metabolism
export {
  calculateBMR,
  calculateTDEE,
  calculateDailyCalorieTarget,
  calculateMetabolism,
  calculateWeeksToGoal,
  calculateCaloriesForGoal,
} from "./metabolism";

// Macros
export {
  calculateMacroGrams,
  calculateCaloriesFromMacros,
  calculateDistributionFromGrams,
  calculateDailyMacros,
  validateMacros,
  applyMacroTemplate,
  getRecommendedTemplate,
  distributeMacrosAcrossMeals,
} from "./macros";

// Health Ranges & Analysis
export {
  analyzeBMI,
  analyzeBodyFat,
  analyzeWHR,
  analyzeWeight,
  analyzeCalorieTarget,
  getStatusColor,
  type HealthStatus,
  type HealthRange,
  type MetricAnalysis,
} from "./healthRanges";
