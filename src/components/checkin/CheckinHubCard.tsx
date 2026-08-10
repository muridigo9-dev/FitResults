import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface CheckinHubCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  status: string;
  statusColor?: string;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  completed?: boolean;
}

export function CheckinHubCard({
  icon: Icon,
  iconColor = "text-primary",
  title,
  status,
  statusColor = "text-muted-foreground",
  children,
  onClick,
  className,
  completed = false,
}: CheckinHubCardProps) {
  return (
    <Card
      variant="default"
      interactive={!!onClick}
      className={cn(
        "transition-all duration-200",
        completed && "ring-2 ring-success/50 border-success/30",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            completed ? "bg-success/20" : "bg-primary/10"
          )}>
            <Icon className={cn("h-5 w-5", completed ? "text-success" : iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{title}</p>
            <p className={cn("text-sm", statusColor)}>{status}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
