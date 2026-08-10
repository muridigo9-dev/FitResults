import * as React from "react";
import { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Target,
  Trophy,
  Palette,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Home,
  LogOut,
  Shield,
  CreditCard,
  Package,
  FileJson,
  MessageSquare,
  Ban,
  BarChart3,
  Mail,
  UsersRound,
  UserPen,
  LucideIcon,
  Database
} from "lucide-react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "@/config/routes";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/useI18n";
import { useUserRole } from "@/hooks/useUserRole";
import { useMustChangePassword } from "@/hooks/useMustChangePassword";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { Sun, Moon } from "lucide-react";
import { SupabaseStatusBanner } from "@/components/admin/SupabaseStatusBanner";
import { useLGPD } from "@/hooks/useLGPD";

import { usePersonalTrainerMode } from "@/hooks/usePersonalTrainerMode";
import { ForcePasswordChangeModal } from "@/components/admin/ForcePasswordChangeModal";
import { useAdminSupportTickets } from "@/hooks/useSupport";
import { useAdminCancellationRequests } from "@/hooks/useCancellationRequests";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFeatureFlag } from "@/contexts/FeatureFlagsContext";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}


function AdminSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { t } = useI18n();
  const { branding } = useBranding();
  const { isDarkMode, toggleTheme } = useBrandingContext();
  const { isPersonalTrainerModeEnabled } = usePersonalTrainerMode();
  const { openCount: supportOpenCount } = useAdminSupportTickets();
  const { pendingCount: cancellationPendingCount } = useAdminCancellationRequests();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";

  const { enabled: isLGPDEnabled } = useLGPD();
  const { isEnabled: isTrainingModeEnabled } = useFeatureFlag("training_mode_enabled");
  const { isEnabled: isDietsEnabled } = useFeatureFlag("diets_enabled");

  const adminNavItems: AdminNavItem[] = [
    { label: t("admin.dashboard"), href: ADMIN_ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: t("admin.users"), href: ADMIN_ROUTES.USERS, icon: Users },
    { label: t("admin.content"), href: ADMIN_ROUTES.CONTENT, icon: FileText },
    { label: "Stripe", href: ADMIN_ROUTES.STRIPE, icon: CreditCard },
    { label: "Planos", href: ADMIN_ROUTES.PLANS, icon: Package },

    { label: "Permissões", href: ADMIN_ROUTES.PERMISSIONS, icon: Shield },
    { label: "Suporte", href: ADMIN_ROUTES.SUPPORT, icon: MessageSquare, badge: supportOpenCount },
    { label: "Cancelamentos", href: ADMIN_ROUTES.CANCELLATIONS, icon: Ban, badge: cancellationPendingCount },
    ...(isLGPDEnabled ? [{ label: "LGPD", href: ADMIN_ROUTES.LGPD, icon: Database }] : []),
    { label: "Métricas", href: ADMIN_ROUTES.METRICS, icon: BarChart3 },
    { label: "E-mails", href: ADMIN_ROUTES.EMAIL, icon: Mail },
    { label: t("admin.branding"), href: ADMIN_ROUTES.BRANDING, icon: Palette },
    { label: t("admin.settings"), href: ADMIN_ROUTES.SETTINGS, icon: Settings },
  ];

  // Personal Trainer Mode items (only shown when feature is enabled)
  const personalTrainerItems = isPersonalTrainerModeEnabled ? [
    { label: "Grupos", href: ADMIN_ROUTES.GROUPS, icon: UsersRound },
    { label: "Criadores de Conteúdo", href: ADMIN_ROUTES.CONTENT_CREATORS, icon: UserPen },
  ] : [];

  const isActive = (href: string) => location.pathname === href;

  return (
    <Sidebar
      className={cn(
        "border-r border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden">
                {branding?.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.appName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <span className="font-bold text-lg text-foreground truncate max-w-[150px]">
                {branding?.appName || "Admin"}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 shrink-0"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>


      {/* Content */}
      <SidebarContent>
        <ScrollArea className="flex-1">
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t("admin.title")}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => {
                  // Special handling for Content to create nested menu
                  if (item.href === ADMIN_ROUTES.CONTENT) {
                    // Check if any sub-route is active
                    const isContentActive = location.pathname.startsWith(ADMIN_ROUTES.CONTENT);

                    if (collapsed) {
                      // Collapsed view: keep as single icon but maybe direct to dishes or main content page
                      const active = isContentActive;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                            <Link to={ADMIN_ROUTES.CONTENT_DISHES}>
                              <item.icon className="h-5 w-5" />
                              <span>Conteúdos</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <Collapsible
                        key="content-group"
                        asChild
                        defaultOpen={isContentActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              isActive={isContentActive}
                              tooltip="Conteúdos"
                            >
                              <item.icon className="h-5 w-5" />
                              <span>Conteúdos</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {/* 🏋️ Treinos */}
                              {isTrainingModeEnabled && (
                                <>
                                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase mt-2">Treinos</div>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_EXERCISES}>
                                      <Link to={ADMIN_ROUTES.CONTENT_EXERCISES}>Exercícios</Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_MUSCLE_GROUPS}>
                                      <Link to={ADMIN_ROUTES.CONTENT_MUSCLE_GROUPS}>Grupos Musculares</Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_WORKOUTS}>
                                      <Link to={ADMIN_ROUTES.CONTENT_WORKOUTS}>Treinos</Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </>
                              )}

                              {/* 🥗 Alimentação */}
                              {isDietsEnabled && (
                                <>
                                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase mt-4">Alimentação</div>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_INGREDIENTS}>
                                      <Link to={ADMIN_ROUTES.CONTENT_INGREDIENTS}>Ingredientes</Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_DISHES}>
                                      <Link to={ADMIN_ROUTES.CONTENT_DISHES}>Pratos</Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_DIET_PLANS}>
                                      <Link to={ADMIN_ROUTES.CONTENT_DIET_PLANS}>Planos Alimentares</Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </>
                              )}

                              {/* 🏆 Gamificação */}
                              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase mt-4">Gamificação</div>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_CHALLENGES}>
                                  <Link to={ADMIN_ROUTES.CONTENT_CHALLENGES}>Desafios</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_ACHIEVEMENTS}>
                                  <Link to={ADMIN_ROUTES.CONTENT_ACHIEVEMENTS}>Conquistas</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={location.pathname === ADMIN_ROUTES.CONTENT_RANKING}>
                                  <Link to={ADMIN_ROUTES.CONTENT_RANKING}>Ranking</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  const active = isActive(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link
                          to={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className="relative">
                            <item.icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
                            {(item.badge ?? 0) > 0 && collapsed && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                            )}
                          </div>
                          {!collapsed && (
                            <span className="flex-1 flex items-center justify-between">
                              <span>{item.label}</span>
                              {(item.badge ?? 0) > 0 && (
                                <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0">
                                  {item.badge}
                                </Badge>
                              )}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Personal Trainer Mode Section */}
          {personalTrainerItems.length > 0 && (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Modo Personal Trainer</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {personalTrainerItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                              active
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
                            {!collapsed && <span>{item.label}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </ScrollArea>
      </SidebarContent>

      {/* Footer - Back to App */}
      <SidebarFooter className="p-2 border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              className="group-data-[collapsible=icon]:!p-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all w-full justify-start"
            >
              {isDarkMode ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
              {!collapsed && <span>{isDarkMode ? t("admin.lightMode") : t("admin.darkMode")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              className="group-data-[collapsible=icon]:!p-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full justify-start"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { mustChangePassword } = useMustChangePassword();
  const { isDarkMode, toggleTheme } = useBrandingContext();

  // Show loading while checking role
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // CRITICAL: Redirect non-admins away from admin area
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      {/* Force password change modal for first-time admin login */}
      <ForcePasswordChangeModal open={mustChangePassword} />

      {/* Supabase connection warning banner - always visible at top */}
      <SupabaseStatusBanner />

      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <SidebarInset className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border/50 bg-background/95 backdrop-blur px-4 h-14">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              {title && (
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
