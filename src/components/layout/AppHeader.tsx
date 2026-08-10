import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Bell, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBranding } from "@/hooks/useBranding";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  backTo?: string;
  showAvatar?: boolean;
  showNotifications?: boolean;
  rightAction?: ReactNode;
  className?: string;
  transparent?: boolean;
}

export function AppHeader({
  title,
  showBack, // explicit override
  backTo,
  showAvatar = true,
  showNotifications = true,
  rightAction,
  className,
  transparent = false,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { branding } = useBranding();

  // Auto-detect if back button should be shown on mobile
  // Show back if NOT on dashboard and is mobile
  const shouldShowBack = showBack !== undefined
    ? showBack
    : (isMobile && location.pathname !== "/dashboard" && location.pathname !== "/profile");

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full pt-safe-top",
        transparent ? "bg-transparent" : "glass-strong border-b border-border/30",
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left Section (Logo or Back) */}
        <div className="flex items-center gap-3 min-w-[80px]">
          {shouldShowBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-10 w-10 rounded-full -ml-2"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden shadow-sm border border-primary/20">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.appName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Center Title */}
        {title && (
          <h1 className="text-heading-3 text-foreground font-semibold truncate text-center flex-1 mx-4">
            {title}
          </h1>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2 min-w-[80px] justify-end">
          {showNotifications && (
            <NotificationDrawer />
          )}
          {rightAction}
        </div>
      </div>
    </header>
  );
}
