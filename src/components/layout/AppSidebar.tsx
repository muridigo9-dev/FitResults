import {
  Home,
  Target,
  TrendingUp,
  Heart,
  Apple,
  User,
  Utensils,
  Dumbbell,
  Trophy,
  ChevronLeft,
  Menu,
  UserCheck,
  Users,
  MessageSquare,
  Building2,
  Mail,
  LayoutDashboard,
  Sun,
  Moon,
  Soup,
  Palette
} from "lucide-react";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/useI18n";
import { useFeatureFlagsContext } from "@/contexts/FeatureFlagsContext";
import { usePersonalTrainerMode } from "@/hooks/usePersonalTrainerMode";
import { useChatUnreadCount, useTrainerChatEnabled } from "@/hooks/useTrainerChat";
import { useAcademy } from "@/contexts/AcademyContext";
import { AcademySwitcherCompact } from "@/components/academy";
import { useBranding } from "@/hooks/useBranding";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
  featureFlag?: string;
  badge?: number;
}

export function AppSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { t } = useI18n();
  const { isEnabled, isLoading } = useFeatureFlagsContext();
  const { isPersonalTrainerModeEnabled, canManageContent } = usePersonalTrainerMode();
  const { isChatEnabled } = useTrainerChatEnabled();
  const { data: unreadCount = 0 } = useChatUnreadCount();
  const { currentAcademy, canViewMembers, canManageAcademy } = useAcademy();
  const { isDarkMode, toggleTheme } = useBrandingContext();
  const { branding } = useBranding();
  const collapsed = state === "collapsed";

  // Main navigation items (always visible)
  const mainNavItems: NavItem[] = [
    { icon: Home, label: t("navigation.dashboard"), href: "/dashboard" },
    { icon: LayoutDashboard, label: t("navigation.evolution"), href: "/daily-summary", featureFlag: "summary_enabled" },
    { icon: Target, label: t("navigation.checkin"), href: "/checkin" },
    { icon: TrendingUp, label: t("navigation.journey"), href: "/progress", featureFlag: "gamification_enabled" },
  ];

  // Health & Nutrition
  const healthNavItems: NavItem[] = [
    { icon: Heart, label: t("navigation.health"), href: "/health" },
  ];

  // Content items - controlled by feature flags
  const contentNavItems: NavItem[] = [
    { icon: Utensils, label: t("navigation.diets"), href: "/diets", featureFlag: "diets_enabled" },
    { icon: Soup, label: t("navigation.myDiets"), href: "/my-diets", featureFlag: "diets_enabled" },
    { icon: Dumbbell, label: t("navigation.workouts"), href: "/workouts", featureFlag: "training_mode_enabled" },
    { icon: TrendingUp, label: t("navigation.exercises"), href: "/exercises", featureFlag: "exercises_enabled" },
    { icon: Trophy, label: t("navigation.challenges"), href: "/challenges", featureFlag: "challenges_enabled" },
  ];

  // Personal Trainer item - only visible when feature is enabled
  const personalTrainerNavItems: NavItem[] = isPersonalTrainerModeEnabled
    ? [{
      icon: UserCheck,
      label: t("navigation.myTrainer"),
      href: "/my-trainer",
      badge: isChatEnabled ? unreadCount : undefined,
    }]
    : [];

  // Trainer management - only visible to trainers/content creators
  const trainerNavItems: NavItem[] = canManageContent
    ? [{
      icon: Users,
      label: t("navigation.myStudents"),
      href: "/trainer",
      badge: isChatEnabled ? unreadCount : undefined,
    }]
    : [];

  // Academy navigation - only visible when user has academy access
  const academyNavItems: NavItem[] = currentAcademy
    ? [
      {
        icon: LayoutDashboard,
        label: t("navigation.dashboard"),
        href: "/academy",
      },
      ...(canViewMembers ? [{
        icon: Users,
        label: t("navigation.members"),
        href: "/academy/members" as string,
      }] : []),
      ...(canManageAcademy ? [{
        icon: Mail,
        label: t("navigation.invites"),
        href: "/academy/invites" as string,
      }] : []),
      ...(canManageAcademy ? [{
        icon: Palette,
        label: t("navigation.brand"),
        href: "/academy/branding" as string,
      }] : []),
    ]
    : [];

  // User section
  const userItems: NavItem[] = [
    { icon: User, label: t("navigation.profile"), href: "/profile" },
  ];

  // Note: Support navigation is handled in Profile page and mobile nav, not in main sidebar

  const isActive = (href: string) => location.pathname === href;

  // Filter items based on feature flags
  const filterByFeatureFlag = (items: NavItem[]) => {
    // While loading, we can either hide or show. Showing avoids layout shift if they are usually enabled.
    // However, if they disappear later, it's jarring. 
    // If we assume "enabled by default" for critical items, we might want to show them.
    if (isLoading) return items;

    return items.filter(item => {
      if (!item.featureFlag) return true;
      const enabled = isEnabled(item.featureFlag);
      return enabled;
    });
  };

  const filteredContentNavItems = filterByFeatureFlag(contentNavItems);

  const NavItem = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <SidebarMenuItem>
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
            <div className="relative">
              <item.icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
              {item.badge !== undefined && item.badge > 0 && collapsed && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </div>
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-xs">
                    {item.badge > 99 ? "99+" : item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      className={cn(
        "border-r border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.appName} className="h-full w-full object-contain" />
                ) : (
                  <Dumbbell className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <span className="font-bold text-lg text-foreground truncate">{branding.appName}</span>
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
          {/* Main Navigation */}
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t("navigation.main")}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByFeatureFlag(mainNavItems).map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Health & Nutrition */}
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t("navigation.health")}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByFeatureFlag(healthNavItems).map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Content - controlled by feature flags */}
          {filteredContentNavItems.length > 0 && (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>{t("navigation.content")}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredContentNavItems.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Personal Trainer - only when enabled */}
          {personalTrainerNavItems.length > 0 && (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Personal</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {personalTrainerNavItems.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Trainer Management - only for trainers */}
          {trainerNavItems.length > 0 && (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Gestão</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {trainerNavItems.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Academy Section - only when user has academy */}
          {currentAcademy && (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Academia</SidebarGroupLabel>}
              <SidebarGroupContent>
                {/* Academy Switcher - only show when not collapsed */}
                {!collapsed && (
                  <div className="px-3 py-2">
                    <AcademySwitcherCompact />
                  </div>
                )}

                {/* Academy Navigation */}
                <SidebarMenu>
                  {filterByFeatureFlag(academyNavItems).map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* User Section */}
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>{t("navigation.account")}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByFeatureFlag(userItems).map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <Button
          variant="outline"
          className={cn("w-full justify-start", collapsed && "justify-center px-0")}
          onClick={toggleTheme}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">{isDarkMode ? t("settings.themeLight") : t("settings.themeDark")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
