import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAcademy } from "@/contexts/AcademyContext";
import { useAcademyMembers } from "@/hooks/useAcademyMembers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Globe, 
  Building2, 
  User, 
  Users, 
  Send, 
  AlertCircle 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// =====================================================
// ASSIGN CONTENT DIALOG
// =====================================================

export type VisibilityType = "global" | "academy" | "user" | "group";

export interface AssignContentData {
  visibility: VisibilityType;
  academy_id?: string;
  assigned_to_id?: string;
  assigned_to_type?: "user" | "group";
}

export interface AssignContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (data: AssignContentData) => void | Promise<void>;
  currentAssignment?: AssignContentData;
  contentType?: "workout" | "diet" | "challenge";
  isSubmitting?: boolean;
}

export function AssignContentDialog({
  open,
  onOpenChange,
  onAssign,
  currentAssignment,
  contentType = "workout",
  isSubmitting = false,
}: AssignContentDialogProps) {
  const { currentAcademy, canManageContent } = useAcademy();
  const { data: students = [] } = useAcademyMembers(currentAcademy?.id, "student");

  const [visibility, setVisibility] = useState<VisibilityType>(
    currentAssignment?.visibility || "global"
  );
  const [assignedToId, setAssignedToId] = useState<string | undefined>(
    currentAssignment?.assigned_to_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: AssignContentData = {
      visibility,
    };

    // Add academy_id if academy visibility
    if (visibility === "academy" && currentAcademy) {
      data.academy_id = currentAcademy.id;
    }

    // Add assigned_to fields if user visibility
    if (visibility === "user" && assignedToId) {
      data.assigned_to_id = assignedToId;
      data.assigned_to_type = "user";
    }

    await onAssign(data);
    onOpenChange(false);
  };

  const contentLabels = {
    workout: "treino",
    diet: "dieta",
    challenge: "desafio",
  };

  const contentLabel = contentLabels[contentType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Atribuir {contentLabel.charAt(0).toUpperCase() + contentLabel.slice(1)}
          </DialogTitle>
          <DialogDescription>
            Defina quem pode ver e acessar este {contentLabel}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visibility Selector */}
          <div className="space-y-3">
            <Label>Visibilidade</Label>
            
            {/* Global Option */}
            <div
              onClick={() => setVisibility("global")}
              className={`
                cursor-pointer rounded-lg border-2 p-4 transition-all
                ${visibility === "global"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${visibility === "global" ? "bg-primary/20" : "bg-muted"}
                `}>
                  <Globe className={`w-5 h-5 ${visibility === "global" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Global</p>
                  <p className="text-sm text-muted-foreground">
                    Todos os usuários podem ver
                  </p>
                </div>
              </div>
            </div>

            {/* Academy Option */}
            {currentAcademy && canManageContent && (
              <div
                onClick={() => setVisibility("academy")}
                className={`
                  cursor-pointer rounded-lg border-2 p-4 transition-all
                  ${visibility === "academy"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${visibility === "academy" ? "bg-primary/20" : "bg-muted"}
                  `}>
                    <Building2 className={`w-5 h-5 ${visibility === "academy" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Academia</p>
                    <p className="text-sm text-muted-foreground">
                      Apenas membros de {currentAcademy.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* User Option */}
            {currentAcademy && students.length > 0 && (
              <div
                onClick={() => setVisibility("user")}
                className={`
                  cursor-pointer rounded-lg border-2 p-4 transition-all
                  ${visibility === "user"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${visibility === "user" ? "bg-primary/20" : "bg-muted"}
                  `}>
                    <User className={`w-5 h-5 ${visibility === "user" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Aluno Específico</p>
                    <p className="text-sm text-muted-foreground">
                      Atribuir a um aluno
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student Selector (if user visibility) */}
          {visibility === "user" && students.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="student">Selecione o Aluno</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.user_id} value={student.user_id}>
                      {student.user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {visibility === "global" && "Conteúdo global está disponível para todos os usuários do sistema."}
              {visibility === "academy" && "Conteúdo da academia é visível apenas para membros da academia."}
              {visibility === "user" && "Conteúdo atribuído é visível apenas para o aluno selecionado."}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (visibility === "user" && !assignedToId)}
            >
              {isSubmitting ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// VISIBILITY BADGE (for displaying current visibility)
// =====================================================

export interface VisibilityBadgeProps {
  visibility: VisibilityType;
  academyName?: string;
  assignedUserName?: string;
  className?: string;
}

export function VisibilityBadge({
  visibility,
  academyName,
  assignedUserName,
  className,
}: VisibilityBadgeProps) {
  const config = {
    global: {
      icon: Globe,
      label: "Global",
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    },
    academy: {
      icon: Building2,
      label: academyName || "Academia",
      color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
    },
    user: {
      icon: User,
      label: assignedUserName || "Aluno",
      color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    },
    group: {
      icon: Users,
      label: "Grupo",
      color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    },
  };

  const { icon: Icon, label, color } = config[visibility];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${color} ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
}
