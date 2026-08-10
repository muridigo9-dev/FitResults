import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserMetricsProvider } from "@/contexts/UserMetricsContext";
import { UserContentProvider } from "@/contexts/UserContentContext";
import { DiaryProvider } from "@/contexts/DiaryContext";
import { DashboardPreferencesProvider } from "@/contexts/DashboardPreferencesContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AcademyProvider } from "@/contexts/AcademyContext";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { NavigationGuard } from "@/components/layout/NavigationGuard";
import { OnboardingGuard } from "@/components/layout/OnboardingGuard";
import { FeatureFlagGuard } from "@/components/layout/FeatureFlagGuard";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { PWAInstallButton } from "@/components/pwa";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Reactivate from "./pages/Reactivate";
import AccountInactive from "./pages/AccountInactive";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import DebugPage from "./pages/DebugPage";
import Checkin from "./pages/Checkin";
import Progress from "./pages/Progress";
import ProgressCalendar from "./pages/ProgressCalendar";
import Profile from "./pages/Profile";
import Health from "./pages/Health";
import MyDiets from "./pages/MyDiets";
import MyWorkouts from "./pages/MyWorkouts";
import Diets from "./pages/Diets";
import DietDetail from "./pages/DietDetail";
import Workouts from "./pages/Workouts";
import Exercises from "./pages/Exercises"; // Implemented
import WorkoutDetail from "./pages/WorkoutDetail";
import WorkoutExecution from "./pages/WorkoutExecution";
import Challenges from "./pages/Challenges";
import ChallengeDetail from "./pages/ChallengeDetail";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import MyTrainer from "./pages/MyTrainer";
import TrainerDashboard from "./pages/trainer/TrainerDashboard";
import AcceptInvite from "./pages/AcceptInvite";
import StudentOnboarding from "./pages/StudentOnboarding";
import Onboarding from "./pages/Onboarding";
import {
  AdminDashboard,
  AdminBranding,
  AdminUsers,
  AdminContent,
  AdminHabits,
  AdminGamification,
  AdminSettings,
  AdminStripe,
  AdminPlans,

  AdminPermissions,
  AdminSupport,
  AdminCancellations,
  AdminMetrics,
  AdminEmail,
  AdminEmailMetrics,
  AdminGroups,
  AdminContentCreators,
  AdminLGPD,
  AdminImpersonationLogs,
  AdminIngredientsPage,
  AdminDietPlansPage,
} from "./pages/admin";
import EditProfile from "./pages/profile/EditProfile";
import Privacy from "./pages/profile/Privacy";
import HelpSupport from "./pages/profile/HelpSupport";
import Notifications from "./pages/profile/Notifications";
import LGPDRequests from "./pages/profile/LGPDRequests";
import { AcademyDashboard, AcademyMembers, AcademyInvites, AcademyBranding } from "./pages/academy";
import DailySummary from "./pages/DailySummary";
import PublicDocument from "./pages/PublicDocument";
import SalesPage from "./pages/SalesPage";
import { ActiveWorkoutProvider } from "@/contexts/ActiveWorkoutContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <FeatureFlagsProvider>
          <AcademyProvider>
            <UserMetricsProvider>
              <DashboardPreferencesProvider>
                <UserContentProvider>
                  <DiaryProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner position="top-center" />
                      <PWAInstallButton />
                      <ImpersonationBanner />
                      <BrowserRouter>
                        <BrandingProvider>
                          <ActiveWorkoutProvider>
                            <NavigationGuard>
                              <OnboardingGuard>
                                <Routes>
                                  {/* Public Routes - No auth required */}
                                  <Route path="/" element={<LandingPage />} />
                                  <Route path="/sales" element={<SalesPage />} />
                                  <Route path="/auth" element={<Auth />} />
                                  <Route path="/forgot-password" element={<ForgotPassword />} />
                                  <Route path="/reset-password" element={<ResetPassword />} />

                                  <Route path="/checkout" element={<Checkout />} />
                                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                                  <Route path="/accept-invite" element={<AcceptInvite />} />
                                  <Route path="/student-onboarding" element={
                                    <AuthGuard requireSubscription={false}><StudentOnboarding /></AuthGuard>
                                  } />
                                  <Route path="/onboarding" element={
                                    <AuthGuard requireSubscription={false}><Onboarding /></AuthGuard>
                                  } />
                                  <Route path="/privacy" element={<PublicDocument />} />
                                  <Route path="/terms" element={<PublicDocument />} />
                                  <Route path="/install" element={<Install />} />
                                  <Route path="/debug" element={<DebugPage />} />

                                  {/* Reactivation - FULLY PUBLIC (no guards) */}
                                  <Route path="/reactivate" element={<Reactivate />} />

                                  {/* Account Inactive - For blocked users (cancelled/expired/suspended) */}
                                  <Route path="/account-inactive" element={<AccountInactive />} />

                                  {/* Subscription Selection - FULLY PUBLIC (no guards) */}
                                  <Route path="/subscription" element={<Reactivate />} />

                                  {/* Protected User Routes - Require Authentication + Active Subscription */}
                                  <Route path="/dashboard" element={
                                    <AuthGuard requireSubscription><Dashboard /></AuthGuard>
                                  } />
                                  <Route path="/daily-summary" element={
                                    <AuthGuard requireSubscription>
                                      <FeatureFlagGuard flag="summary_enabled">
                                        <DailySummary />
                                      </FeatureFlagGuard>
                                    </AuthGuard>
                                  } />
                                  <Route path="/checkin" element={
                                    <AuthGuard requireSubscription><Checkin /></AuthGuard>
                                  } />
                                  <Route path="/progress" element={
                                    <AuthGuard requireSubscription>
                                      <FeatureFlagGuard flag="gamification_enabled">
                                        <Progress />
                                      </FeatureFlagGuard>
                                    </AuthGuard>
                                  } />
                                  <Route path="/progress/calendar" element={
                                    <AuthGuard requireSubscription><ProgressCalendar /></AuthGuard>
                                  } />
                                  <Route path="/profile" element={
                                    <AuthGuard requireSubscription><Profile /></AuthGuard>
                                  } />
                                  <Route path="/profile/edit" element={
                                    <AuthGuard requireSubscription><EditProfile /></AuthGuard>
                                  } />
                                  <Route path="/profile/notifications" element={
                                    <AuthGuard requireSubscription><Notifications /></AuthGuard>
                                  } />
                                  <Route path="/profile/privacy" element={
                                    <AuthGuard requireSubscription><Privacy /></AuthGuard>
                                  } />
                                  <Route path="/profile/help" element={
                                    <AuthGuard requireSubscription><HelpSupport /></AuthGuard>
                                  } />
                                  <Route path="/profile/lgpd" element={
                                    <AuthGuard requireSubscription>
                                      <FeatureFlagGuard flag="lgpd_enabled">
                                        <LGPDRequests />
                                      </FeatureFlagGuard>
                                    </AuthGuard>
                                  } />
                                  <Route path="/health" element={
                                    <AuthGuard requireSubscription><Health /></AuthGuard>
                                  } />

                                  {/* Protected Content Routes - Require Subscription */}
                                  <Route path="/diets" element={
                                    <AuthGuard requireSubscription>
                                      <Diets />
                                    </AuthGuard>
                                  } />
                                  <Route path="/diets/:id" element={
                                    <AuthGuard requireSubscription>
                                      <DietDetail />
                                    </AuthGuard>
                                  } />
                                  <Route path="/workouts" element={
                                    <AuthGuard requireSubscription>
                                      <Workouts />
                                    </AuthGuard>
                                  } />
                                  <Route path="/exercises" element={
                                    <AuthGuard requireSubscription>
                                      <Exercises />
                                    </AuthGuard>
                                  } />
                                  <Route path="/workouts/:id" element={
                                    <AuthGuard requireSubscription>
                                      <WorkoutDetail />
                                    </AuthGuard>
                                  } />
                                  <Route path="/workout-execution/:sessionId" element={
                                    <AuthGuard requireSubscription>
                                      <WorkoutExecution />
                                    </AuthGuard>
                                  } />
                                  <Route path="/challenges" element={
                                    <AuthGuard requireSubscription><Challenges /></AuthGuard>
                                  } />
                                  <Route path="/challenges/:id" element={
                                    <AuthGuard requireSubscription><ChallengeDetail /></AuthGuard>
                                  } />

                                  {/* Protected User Content Routes - Require Subscription */}
                                  <Route path="/my-diets" element={
                                    <AuthGuard requireSubscription>
                                      <MyDiets />
                                    </AuthGuard>
                                  } />
                                  <Route path="/my-workouts" element={
                                    <AuthGuard requireSubscription>
                                      <MyWorkouts />
                                    </AuthGuard>
                                  } />
                                  <Route path="/my-trainer" element={
                                    <AuthGuard requireSubscription><MyTrainer /></AuthGuard>
                                  } />

                                  {/* Academy Routes - Require Subscription */}
                                  <Route path="/academy" element={
                                    <AuthGuard requireSubscription><AcademyDashboard /></AuthGuard>
                                  } />
                                  <Route path="/academy/members" element={
                                    <AuthGuard requireSubscription><AcademyMembers /></AuthGuard>
                                  } />
                                  <Route path="/academy/invites" element={
                                    <AuthGuard requireSubscription><AcademyInvites /></AuthGuard>
                                  } />
                                  <Route path="/academy/branding" element={
                                    <AuthGuard requireSubscription><AcademyBranding /></AuthGuard>
                                  } />

                                  {/* Admin Routes - Auth only (admins bypass subscription check) */}
                                  <Route path="/admin" element={
                                    <AuthGuard><AdminDashboard /></AuthGuard>
                                  } />
                                  <Route path="/admin/users" element={
                                    <AuthGuard><AdminUsers /></AuthGuard>
                                  } />
                                  <Route path="/admin/content" element={
                                    <AuthGuard><AdminContent /></AuthGuard>
                                  } />
                                  <Route path="/admin/content/:tab" element={
                                    <AuthGuard><AdminContent /></AuthGuard>
                                  } />
                                  <Route path="/admin/habits" element={
                                    <AuthGuard><AdminHabits /></AuthGuard>
                                  } />
                                  <Route path="/admin/gamification" element={
                                    <AuthGuard><AdminGamification /></AuthGuard>
                                  } />
                                  <Route path="/admin/branding" element={
                                    <AuthGuard><AdminBranding /></AuthGuard>
                                  } />
                                  <Route path="/admin/settings" element={
                                    <AuthGuard><AdminSettings /></AuthGuard>
                                  } />
                                  <Route path="/admin/stripe" element={
                                    <AuthGuard><AdminStripe /></AuthGuard>
                                  } />
                                  <Route path="/admin/plans" element={
                                    <AuthGuard><AdminPlans /></AuthGuard>
                                  } />


                                  <Route path="/admin/permissions" element={
                                    <AuthGuard><AdminPermissions /></AuthGuard>
                                  } />
                                  <Route path="/admin/support" element={
                                    <AuthGuard><AdminSupport /></AuthGuard>
                                  } />
                                  <Route path="/admin/cancellations" element={
                                    <AuthGuard><AdminCancellations /></AuthGuard>
                                  } />
                                  <Route path="/admin/metrics" element={
                                    <AuthGuard><AdminMetrics /></AuthGuard>
                                  } />
                                  <Route path="/admin/email" element={
                                    <AuthGuard><AdminEmail /></AuthGuard>
                                  } />
                                  <Route path="/admin/email/metrics" element={
                                    <AuthGuard><AdminEmailMetrics /></AuthGuard>
                                  } />

                                  {/* Personal Trainer Mode Routes */}
                                  <Route path="/admin/groups" element={
                                    <AuthGuard><AdminGroups /></AuthGuard>
                                  } />
                                  <Route path="/admin/content-creators" element={
                                    <AuthGuard><AdminContentCreators /></AuthGuard>
                                  } />

                                  {/* LGPD Management Route */}
                                  <Route path="/admin/lgpd" element={
                                    <AuthGuard>
                                      <FeatureFlagGuard flag="lgpd_enabled">
                                        <AdminLGPD />
                                      </FeatureFlagGuard>
                                    </AuthGuard>
                                  } />
                                  <Route path="/admin/impersonation" element={
                                    <AuthGuard><AdminImpersonationLogs /></AuthGuard>
                                  } />

                                  {/* Trainer Dashboard Routes */}
                                  <Route path="/trainer" element={
                                    <AuthGuard requireSubscription><TrainerDashboard /></AuthGuard>
                                  } />
                                  <Route path="/trainer/students" element={
                                    <AuthGuard requireSubscription><TrainerDashboard /></AuthGuard>
                                  } />
                                  <Route path="/trainer/invite" element={
                                    <AuthGuard requireSubscription><TrainerDashboard /></AuthGuard>
                                  } />

                                  {/* Catch-all */}
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </OnboardingGuard>
                            </NavigationGuard>
                          </ActiveWorkoutProvider>
                        </BrandingProvider>
                      </BrowserRouter>
                    </TooltipProvider>
                  </DiaryProvider>
                </UserContentProvider>
              </DashboardPreferencesProvider>
            </UserMetricsProvider>
          </AcademyProvider>
        </FeatureFlagsProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
