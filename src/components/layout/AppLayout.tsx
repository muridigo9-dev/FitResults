import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { GlobalNotificationListener } from "@/components/notifications/GlobalNotificationListener";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

interface AppLayoutProps {
  children: ReactNode;
  /** Header configuration */
  header?: {
    title?: string;
    showBack?: boolean;
    backTo?: string;
    showAvatar?: boolean;
    showNotifications?: boolean;
    rightAction?: ReactNode;
    transparent?: boolean;
  };
  /** Hide header completely */
  hideHeader?: boolean;
  /** Additional classes for main content */
  className?: string;
  /** Full bleed content (no padding) */
  fullBleed?: boolean;
}

export function AppLayout({
  children,
  header,
  hideHeader = false,
  className,
  fullBleed = false,
}: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <GlobalNotificationListener />
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          {!hideHeader && (
            <AppHeader
              title={header?.title}
              showBack={header?.showBack}
              backTo={header?.backTo}
              showAvatar={header?.showAvatar}
              showNotifications={header?.showNotifications}
              rightAction={header?.rightAction}
              transparent={header?.transparent}
            />
          )}



          {/* Main Content */}
          <main
            className={cn(
              "flex-1 overflow-auto",
              !fullBleed && "p-4 md:p-6",
              isMobile && "pb-20", // Add bottom padding for mobile nav
              className
            )}
          >
            {children}
          </main>

          {/* PWA Install Prompt */}
          {isMobile && <InstallPrompt variant="banner" />}

          {/* Mobile Bottom Navigation */}
          {isMobile && !hideHeader && <MobileBottomNav />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

/**
 * Simplified layout for auth/onboarding screens
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

/**
 * Layout for admin area
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <GlobalNotificationListener />
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur px-4 h-14">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
            </div>
            <div className="flex items-center gap-2">
              <NotificationDrawer />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
