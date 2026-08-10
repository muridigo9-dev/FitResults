import { Card } from "@/components/ui/card";
import { Academy, AcademyStats } from "@/contexts/AcademyContext";
import { AcademyBadge, LimitBadge, StatusBadge } from "./AcademyBadge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Dumbbell,
  Apple,
  TrendingUp,
  MoreVertical,
  Settings,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =====================================================
// ACADEMY CARD
// =====================================================

export interface AcademyCardProps {
  academy: Academy;
  stats?: AcademyStats;
  isSelected?: boolean;
  onClick?: () => void;
  onView?: () => void;
  onSettings?: () => void;
  showActions?: boolean;
  className?: string;
}

export function AcademyCard({
  academy,
  stats,
  isSelected,
  onClick,
  onView,
  onSettings,
  showActions = true,
  className,
}: AcademyCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2",
        className
      )}
      onClick={onClick}
    >
      {/* Background Gradient */}
      <div
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
        style={{
          background: academy.primary_color
            ? `linear-gradient(135deg, ${academy.primary_color} 0%, transparent 100%)`
            : "linear-gradient(135deg, hsl(var(--primary)) 0%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg",
                !academy.logo_url && "bg-gradient-to-br from-primary to-primary/70"
              )}
              style={{
                background: academy.primary_color
                  ? `linear-gradient(135deg, ${academy.primary_color} 0%, ${academy.primary_color}cc 100%)`
                  : undefined,
              }}
            >
              {academy.logo_url ? (
                <img
                  src={academy.logo_url}
                  alt={academy.name}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>

            {/* Name & Status */}
            <div>
              <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                {academy.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{academy.slug}
              </p>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                )}
                {onSettings && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSettings(); }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <StatusBadge status={academy.status} />
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Trainers */}
            <div className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Trainers</span>
              </div>
              <LimitBadge
                current={stats.total_trainers}
                max={stats.max_trainers}
                className="w-full justify-center"
              />
            </div>

            {/* Nutritionists */}
            <div className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Apple className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Nutris</span>
              </div>
              <LimitBadge
                current={stats.total_nutritionists}
                max={stats.max_nutritionists}
                className="w-full justify-center"
              />
            </div>

            {/* Students */}
            <div className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Alunos</span>
              </div>
              <LimitBadge
                current={stats.total_students}
                max={stats.max_students}
                className="w-full justify-center"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>
              {stats
                ? `${stats.total_workouts + stats.total_diets} conteúdos`
                : "Carregando..."}
            </span>
          </div>

          {isSelected && (
            <span className="text-xs font-semibold text-primary">
              ✓ Selecionada
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// ACADEMY CARD SKELETON
// =====================================================

export function AcademyCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>

      <div className="h-6 w-16 bg-muted animate-pulse rounded-full mb-4" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 h-16" />
        ))}
      </div>

      <div className="pt-3 border-t">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    </Card>
  );
}
