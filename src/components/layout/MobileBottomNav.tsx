import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Home,
    Dumbbell,
    Target,
    Utensils,
    Zap,
    Trophy,
    Activity,
    TrendingUp,
    User,
    Settings,
    HelpCircle,
    X,
    LayoutGrid,
    Droplets,
    CalendarCheck,
    ChevronDown,
    Heart,
    Salad
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlagsContext } from "@/contexts/FeatureFlagsContext";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { Sun, Moon } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface NavItem {
    icon: typeof Home;
    label: string;
    path: string;
    featureFlag?: string;
}

interface MenuSection {
    title: string;
    items: NavItem[];
}

export function MobileBottomNav() {
    const { t } = useI18n();
    const location = useLocation();
    const navigate = useNavigate();
    const { isEnabled, isLoading } = useFeatureFlagsContext();
    const { isDarkMode, toggleTheme } = useBrandingContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

    // Menu organized by sections
    const menuSections: MenuSection[] = [
        {
            title: t("navigation.main"),
            items: [
                { icon: Home, label: t("navigation.dashboard"), path: "/dashboard" },
                { icon: LayoutGrid, label: t("navigation.evolution"), path: "/daily-summary", featureFlag: "summary_enabled" },
                { icon: Target, label: t("navigation.checkin"), path: "/checkin" },
                { icon: TrendingUp, label: t("navigation.journey"), path: "/progress", featureFlag: "gamification_enabled" },
            ]
        },
        {
            title: t("navigation.training"),
            items: [
                { icon: Dumbbell, label: t("navigation.workouts"), path: "/workouts", featureFlag: "training_mode_enabled" },
                { icon: Zap, label: t("navigation.exercises"), path: "/exercises", featureFlag: "exercises_enabled" },
                { icon: Trophy, label: t("navigation.challenges"), path: "/challenges", featureFlag: "challenges_enabled" },
            ]
        },
        {
            title: t("navigation.food"),
            items: [
                { icon: Utensils, label: t("navigation.diets"), path: "/diets", featureFlag: "diets_enabled" },
                { icon: Salad, label: t("navigation.myDiets"), path: "/my-diets", featureFlag: "diets_enabled" },
            ]
        },
        {
            title: t("navigation.wellBeing"),
            items: [
                { icon: Heart, label: t("navigation.health"), path: "/health" },
                { icon: Activity, label: t("navigation.habits"), path: "/habits", featureFlag: "habits_enabled" },
            ]
        },
        {
            title: t("navigation.account"),
            items: [
                { icon: User, label: t("navigation.profile"), path: "/profile" },
                { icon: HelpCircle, label: t("profile.helpSupport"), path: "/profile/help", featureFlag: "support_enabled" },
            ]
        },
    ];

    // Filter sections and items by feature flags
    const filteredSections = isLoading
        ? menuSections
        : menuSections.map(section => ({
            ...section,
            items: section.items.filter(item => {
                if (!item.featureFlag) return true;
                return isEnabled(item.featureFlag);
            })
        })).filter(section => section.items.length > 0);

    const handleNavClick = (path: string) => {
        setIsMenuOpen(false);
        navigate(path);
    };

    return (
        <>
            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
                <div className="relative mx-3 mb-3">
                    {/* Glass Background */}
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-xl rounded-2xl border border-border/40 shadow-lg" />

                    {/* Navigation Content */}
                    <div className="relative flex items-center justify-between px-2 py-2">
                        {/* Left Side - Home */}
                        <Link
                            to="/dashboard"
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95",
                                isActive("/dashboard")
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Home className="h-5 w-5" strokeWidth={isActive("/dashboard") ? 2.5 : 2} />
                            <span className="text-[9px] font-medium">{t("navigation.dashboard")}</span>
                        </Link>

                        {/* Left Quick Action - Summary */}
                        {isEnabled("summary_enabled") && (
                            <Link
                                to="/daily-summary"
                                className={cn(
                                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95",
                                    isActive("/daily-summary")
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutGrid className="h-5 w-5" strokeWidth={isActive("/daily-summary") ? 2.5 : 2} />
                                <span className="text-[9px] font-medium">{t("navigation.evolution")}</span>
                            </Link>
                        )}

                        {/* Center - Floating Menu Button */}
                        <div className="relative -mt-6">
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className={cn(
                                    "relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all active:scale-95",
                                    "bg-gradient-to-br from-primary to-primary/80",
                                    "hover:shadow-xl hover:shadow-primary/25"
                                )}
                            >
                                <LayoutGrid className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
                            </button>
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg -z-10" />
                        </div>

                        {/* Right Quick Action - Check-in */}
                        <button
                            onClick={() => navigate("/checkin")}
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95",
                                isActive("/checkin")
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <CalendarCheck className={cn("h-5 w-5", isActive("/checkin") ? "text-primary" : "text-green-400")} strokeWidth={2} />
                            <span className="text-[9px] font-medium">{t("navigation.checkin")}</span>
                        </button>

                        {/* Right Side - Profile */}
                        <Link
                            to="/profile"
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95",
                                isActive("/profile")
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <User className="h-5 w-5" strokeWidth={isActive("/profile") ? 2.5 : 2} />
                            <span className="text-[9px] font-medium">{t("navigation.profile")}</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Full Screen Menu */}
            {isMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl animate-in fade-in duration-200"
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* Menu Content */}
                    <div className="fixed inset-0 z-[70] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">


                        <div className="flex items-center justify-between px-6 pt-safe-top py-4 border-b border-border/10">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold font-heading">{t("common.menu")}</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleTheme}
                                    className="rounded-full bg-muted/30 h-9 w-9"
                                >
                                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                </Button>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Menu Sections */}
                        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6">
                            {filteredSections.map((section) => (
                                <div key={section.title}>
                                    {/* Section Header */}
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                                        {section.title}
                                    </h3>
                                    {/* Section Items Grid */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {section.items.filter(item => !item.featureFlag || isEnabled(item.featureFlag as any)).map((item) => {
                                            const active = isActive(item.path);
                                            return (
                                                <button
                                                    key={item.path}
                                                    onClick={() => handleNavClick(item.path)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all",
                                                        "active:scale-95 min-h-[72px]",
                                                        active
                                                            ? "bg-primary text-primary-foreground shadow-md"
                                                            : "bg-muted/40 text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                                                    <span className={cn(
                                                        "text-[10px] font-medium text-center leading-tight",
                                                        active && "font-semibold"
                                                    )}>
                                                        {item.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Close hint */}
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted/80 text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                                <span className="text-xs font-medium">{t("actions.close")}</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
