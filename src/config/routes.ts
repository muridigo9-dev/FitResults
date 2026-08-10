/**
 * Route Configuration
 * 
 * Centralized route definitions for the app.
 * Separates User and Admin areas conceptually.
 */

// ==========================================
// PUBLIC ROUTES (No auth required)
// ==========================================
export const PUBLIC_ROUTES = {
  HOME: "/",
  AUTH: "/auth",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  FORGOT_PASSWORD: "/auth/forgot-password",
  INSTALL: "/install",
} as const;

// ==========================================
// USER ROUTES (Requires authentication)
// ==========================================
export const USER_ROUTES = {
  DASHBOARD: "/dashboard",
  CHECKIN: "/checkin",
  PROGRESS: "/progress",
  PROFILE: "/profile",
  HEALTH: "/health",
  NUTRITION: "/nutrition",
  MY_DIETS: "/my-diets",
  MY_WORKOUTS: "/my-workouts",
  WORKOUTS: "/workouts",
  WORKOUT_DETAIL: "/workouts/:id",
  WORKOUT_EXECUTION: "/workout-execution/:sessionId",
  SETTINGS: "/settings",
  ACHIEVEMENTS: "/achievements",
} as const;

// ==========================================
// ADMIN ROUTES (Requires admin role)
// Refactored to include Content Sub-routes
// ==========================================
export const ADMIN_ROUTES = {
  DASHBOARD: "/admin",
  USERS: "/admin/users",
  CONTENT: "/admin/content",
  CONTENT_INGREDIENTS: "/admin/content/ingredients",
  CONTENT_DISHES: "/admin/content/diets",
  CONTENT_DIET_PLANS: "/admin/content/diet-plans",
  CONTENT_WORKOUTS: "/admin/content/workouts",
  CONTENT_EXERCISES: "/admin/content/exercises",
  CONTENT_MUSCLE_GROUPS: "/admin/content/muscle-groups",
  CONTENT_CHALLENGES: "/admin/content/challenges",
  CONTENT_ACHIEVEMENTS: "/admin/content/achievements",
  CONTENT_RANKING: "/admin/content/ranking",
  HABITS: "/admin/habits",
  GAMIFICATION: "/admin/gamification",
  BRANDING: "/admin/branding",
  SETTINGS: "/admin/settings",
  STRIPE: "/admin/stripe",
  PLANS: "/admin/plans",


  PERMISSIONS: "/admin/permissions",
  SUPPORT: "/admin/support",
  CANCELLATIONS: "/admin/cancellations",
  METRICS: "/admin/metrics",
  EMAIL: "/admin/email",
  EMAIL_METRICS: "/admin/email/metrics",
  // Personal Trainer Mode
  GROUPS: "/admin/groups",
  CONTENT_CREATORS: "/admin/content-creators",
  // LGPD Management
  LGPD: "/admin/lgpd",
} as const;

// ==========================================
// TRAINER ROUTES (Personal Trainer Mode)
// ==========================================
export const TRAINER_ROUTES = {
  DASHBOARD: "/trainer",
  STUDENTS: "/trainer/students",
  INVITE: "/trainer/invite",
} as const;

// ==========================================
// NAVIGATION ITEMS
// ==========================================
export const USER_NAV_ITEMS = [
  { label: "Início", href: USER_ROUTES.DASHBOARD, icon: "Home" },
  { label: "Check-in", href: USER_ROUTES.CHECKIN, icon: "Target" },
  { label: "Dietas", href: USER_ROUTES.MY_DIETS, icon: "Utensils" },
  { label: "Treinos", href: USER_ROUTES.MY_WORKOUTS, icon: "Dumbbell" },
  { label: "Progresso", href: USER_ROUTES.PROGRESS, icon: "TrendingUp" },
  { label: "Perfil", href: USER_ROUTES.PROFILE, icon: "User" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: ADMIN_ROUTES.DASHBOARD, icon: "LayoutDashboard" },
  { label: "Usuários", href: ADMIN_ROUTES.USERS, icon: "Users" },
  { label: "Conteúdo", href: ADMIN_ROUTES.CONTENT, icon: "FileText" },
  { label: "Hábitos", href: ADMIN_ROUTES.HABITS, icon: "Target" },
  { label: "Gamificação", href: ADMIN_ROUTES.GAMIFICATION, icon: "Trophy" },
  { label: "Marca", href: ADMIN_ROUTES.BRANDING, icon: "Palette" },
  { label: "Configurações", href: ADMIN_ROUTES.SETTINGS, icon: "Settings" },
] as const;

// ==========================================
// ROUTE HELPERS
// ==========================================
export function isPublicRoute(path: string): boolean {
  return Object.values(PUBLIC_ROUTES).some(route => path.startsWith(route));
}

export function isAdminRoute(path: string): boolean {
  return path.startsWith("/admin");
}

export function isUserRoute(path: string): boolean {
  return Object.values(USER_ROUTES).some(route => path.startsWith(route));
}
