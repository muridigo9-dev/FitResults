import { useState } from "react";
import { useAcademy } from "@/contexts/AcademyContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/states";

// =====================================================
// ACADEMY SWITCHER
// =====================================================

export interface AcademySwitcherProps {
  onCreateNew?: () => void;
  className?: string;
}

export function AcademySwitcher({ onCreateNew, className }: AcademySwitcherProps) {
  const { currentAcademy, userAcademies, switchAcademy, isAcademyLoading } = useAcademy();
  const [open, setOpen] = useState(false);

  if (isAcademyLoading) {
    return (
      <Button variant="outline" className={cn("w-[200px] justify-between", className)} disabled>
        <span className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span className="truncate">Carregando...</span>
        </span>
      </Button>
    );
  }

  if (userAcademies.length === 0) {
    return (
      <Button
        variant="outline"
        className={cn("w-[200px] justify-between", className)}
        onClick={onCreateNew}
      >
        <span className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Nova Academia</span>
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          <span className="flex items-center gap-2 flex-1 min-w-0">
            {currentAcademy?.logo_url ? (
              <img
                src={currentAcademy.logo_url}
                alt={currentAcademy.name}
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <Building2 className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{currentAcademy?.name || "Selecione..."}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="start">
        <DropdownMenuLabel>Minhas Academias</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userAcademies.map((academy) => (
          <DropdownMenuItem
            key={academy.id}
            onSelect={() => {
              switchAcademy(academy.id);
              setOpen(false);
            }}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2 flex-1 min-w-0">
              {academy.logo_url ? (
                <img
                  src={academy.logo_url}
                  alt={academy.name}
                  className="w-5 h-5 rounded object-cover"
                />
              ) : (
                <Building2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{academy.name}</span>
            </span>
            {currentAcademy?.id === academy.id && (
              <Check className="ml-2 h-4 w-4 flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        {onCreateNew && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onCreateNew} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              <span>Nova Academia</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =====================================================
// COMPACT VERSION (for mobile/sidebar)
// =====================================================

export function AcademySwitcherCompact({ className }: { className?: string }) {
  const { currentAcademy, isAcademyLoading } = useAcademy();

  if (isAcademyLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md",
          !currentAcademy?.logo_url && "bg-gradient-to-br from-primary to-primary/70"
        )}
        style={{
          background: currentAcademy?.primary_color
            ? `linear-gradient(135deg, ${currentAcademy.primary_color} 0%, ${currentAcademy.primary_color}cc 100%)`
            : undefined,
        }}
      >
        {currentAcademy?.logo_url ? (
          <img
            src={currentAcademy.logo_url}
            alt={currentAcademy.name}
            className="w-full h-full rounded-xl object-cover"
          />
        ) : (
          <Building2 className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">
          {currentAcademy?.name || "Sem academia"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {currentAcademy?.slug || "Selecione uma academia"}
        </p>
      </div>
    </div>
  );
}
