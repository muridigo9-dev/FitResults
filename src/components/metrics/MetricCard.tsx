/**
 * MetricCard Component
 * 
 * Displays a health metric with status indicator, healthy range,
 * gap to healthy, and actionable guidance.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LucideIcon, HelpCircle, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Check } from "lucide-react";
import type { HealthStatus } from "@/lib/calculators/healthRanges";
import { useI18n } from "@/hooks/useI18n";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;

  // Status & Classification
  status?: HealthStatus;
  statusLabel?: string;

  // Healthy Range
  healthyRange?: { min: number; max: number };

  // Gap to healthy
  gapToHealthy?: number | null;
  gapDirection?: "increase" | "decrease" | null;

  // Messages
  message?: string;
  recommendation?: string;
  explanation?: string; // "O que é isso?"

  // Visual
  icon: LucideIcon;
  color?: "primary" | "accent" | "tertiary" | "success" | "warning" | "info";
  highlight?: boolean;

  // Extra details
  details?: Array<{ label: string; value: string }>;

  // Legacy support
  category?: string;
  description?: string;
}

const STATUS_STYLES: Record<HealthStatus, { bg: string; text: string; border: string }> = {
  healthy: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
  },
  attention: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
  },
  risk: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
  },
};

const COLOR_CLASSES = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
  },
  accent: {
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/20",
  },
  tertiary: {
    bg: "bg-tertiary/10",
    text: "text-tertiary",
    border: "border-tertiary/20",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/20",
  },
  info: {
    bg: "bg-info/10",
    text: "text-info",
    border: "border-info/20",
  },
};

export function MetricCard({
  title,
  value,
  unit,
  status,
  statusLabel,
  healthyRange,
  gapToHealthy,
  gapDirection,
  message,
  recommendation,
  explanation,
  icon: Icon,
  color = "primary",
  highlight = false,
  details,
  category,
  description,
}: MetricCardProps) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  const hasExpandableContent = details?.length || message || recommendation || healthyRange;

  // Use status-based styling if status is provided
  const statusStyles = status ? STATUS_STYLES[status] : null;
  const colors = statusStyles || COLOR_CLASSES[color];

  // Legacy: use category as statusLabel if not provided
  const displayStatusLabel = statusLabel || category;

  return (
    <Card
      className={cn(
        "transition-all overflow-hidden",
        highlight && "ring-2 ring-primary ring-offset-2",
        status && STATUS_STYLES[status].border
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            colors.bg
          )}>
            <Icon className={cn("h-6 w-6", colors.text)} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground font-medium">{title}</p>
                {explanation && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex">
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px] text-xs p-3">
                        <p>{explanation}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Status Badge */}
              {displayStatusLabel && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs shrink-0",
                    status && cn(STATUS_STYLES[status].bg, STATUS_STYLES[status].text)
                  )}
                >
                  {status === "healthy" && <Check className="h-3 w-3 mr-1" />}
                  {displayStatusLabel}
                </Badge>
              )}
            </div>

            {/* Value */}
            <p className={cn("text-2xl font-bold", colors.text)}>
              {value}
              {unit && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {unit}
                </span>
              )}
            </p>

            {/* Legacy description support */}
            {description && !message && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}

            {/* Gap to Healthy */}
            {gapToHealthy !== null && gapToHealthy !== undefined && gapDirection && (
              <div className={cn(
                "flex items-center gap-1.5 mt-2 text-xs font-medium",
                status === "healthy" ? "text-success" : status === "risk" ? "text-destructive" : "text-warning"
              )}>
                {gapDirection === "decrease" ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5" />
                )}
                <span>
                  {gapDirection === "decrease" ? t("health.reduce") : t("health.increase")} {gapToHealthy} {unit || t("health.points")} {t("health.toHealthyRange")}
                </span>
              </div>
            )}

            {/* Expandable Content */}
            {hasExpandableContent && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-0 text-xs text-muted-foreground hover:text-foreground mt-2"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      {t("metrics.hideDetails")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {t("metrics.showDetails")}
                    </>
                  )}
                </Button>

                {showDetails && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3 animate-in">
                    {/* Message */}
                    {message && (
                      <p className="text-sm text-foreground">
                        {message}
                      </p>
                    )}

                    {/* Recommendation */}
                    {recommendation && (
                      <div className="flex gap-2 p-2.5 rounded-lg bg-muted/50">
                        <span className="text-xs">💡</span>
                        <p className="text-xs text-muted-foreground">
                          {recommendation}
                        </p>
                      </div>
                    )}

                    {/* Healthy Range */}
                    {healthyRange && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{t("metrics.healthyRange")}:</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {healthyRange.min} - {healthyRange.max} {unit}
                        </Badge>
                      </div>
                    )}

                    {/* Extra Details */}
                    {details && details.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {details.map((detail, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground">{detail.label}: </span>
                            <span className="font-medium">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
