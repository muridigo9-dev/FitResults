import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAcademy } from "@/contexts/AcademyContext";
import { useCreateInvite, type InviteType } from "@/hooks/useAcademyInvites";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Sparkles, Send } from "lucide-react";
import { AcademyBadge, LimitBadge } from "./AcademyBadge";

// =====================================================
// CREATE INVITE DIALOG
// =====================================================

export interface CreateInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: InviteType;
}

interface FormData {
  email: string;
  type: InviteType;
  message?: string;
}

export function CreateInviteDialog({
  open,
  onOpenChange,
  defaultType = "academy_student",
}: CreateInviteDialogProps) {
  const { currentAcademy, academyStats, canInviteTrainers, canInviteNutritionists, canInviteStudents } = useAcademy();
  const { mutateAsync: createInvite, isPending } = useCreateInvite();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: defaultType,
      message: "",
    },
  });

  const selectedType = watch("type");

  // Determine available invite types based on permissions
  const availableTypes: Array<{ value: InviteType; label: string; disabled?: boolean; reason?: string }> = [
    {
      value: "academy_trainer",
      label: "Personal Trainer",
      disabled: !canInviteTrainers || (academyStats && academyStats.total_trainers >= academyStats.max_trainers),
      reason: !canInviteTrainers ? "Sem permissão" : "Limite atingido",
    },
    {
      value: "academy_nutritionist",
      label: "Nutricionista",
      disabled: !canInviteNutritionists || (academyStats && academyStats.total_nutritionists >= academyStats.max_nutritionists),
      reason: !canInviteNutritionists ? "Sem permissão" : "Limite atingido",
    },
    {
      value: "academy_student",
      label: "Aluno",
      disabled: !canInviteStudents || (academyStats && academyStats.total_students >= academyStats.max_students),
      reason: !canInviteStudents ? "Sem permissão" : "Limite atingido",
    },
    {
      value: "academy_content_creator",
      label: "Criador de Conteúdo",
      disabled: !canInviteTrainers, // Same permission as trainers
      reason: "Sem permissão",
    },
  ];

  const roleMap: Record<InviteType, string> = {
    academy_trainer: "personal_trainer",
    academy_nutritionist: "nutritionist",
    academy_student: "student",
    academy_content_creator: "content_creator",
    trainer_student: "student",
  };

  const onSubmit = async (data: FormData) => {
    if (!currentAcademy) return;

    try {
      await createInvite({
        invited_email: data.email.toLowerCase().trim(),
        invite_type: data.type,
        target_role: roleMap[data.type],
        academy_id: currentAcademy.id,
        message: data.message?.trim() || undefined,
      });

      reset();
      onOpenChange(false);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Convidar Novo Membro
          </DialogTitle>
          <DialogDescription>
            Envie um convite por email para adicionar um novo membro à academia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current Limits */}
          {academyStats && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Limites Atuais
              </p>
              <div className="flex flex-wrap gap-2">
                <LimitBadge
                  label="Trainers"
                  current={academyStats.total_trainers}
                  max={academyStats.max_trainers}
                />
                <LimitBadge
                  label="Nutris"
                  current={academyStats.total_nutritionists}
                  max={academyStats.max_nutritionists}
                />
                <LimitBadge
                  label="Alunos"
                  current={academyStats.total_students}
                  max={academyStats.max_students}
                />
              </div>
            </div>
          )}

          {/* Invite Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Convite</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setValue("type", value as InviteType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    disabled={type.disabled}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{type.label}</span>
                      {type.disabled && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({type.reason})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                className="pl-10"
                {...register("email", {
                  required: "Email é obrigatório",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Email inválido",
                  },
                })}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem Personalizada (Opcional)</Label>
            <Textarea
              id="message"
              placeholder="Adicione uma mensagem de boas-vindas..."
              rows={3}
              {...register("message", {
                maxLength: {
                  value: 500,
                  message: "Mensagem muito longa (máximo 500 caracteres)",
                },
              })}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          {/* Preview */}
          <div className="bg-accent/30 border border-accent rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Preview do Convite
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Função:</span>
                <AcademyBadge
                  role={
                    selectedType === "academy_trainer" ? "trainer" :
                    selectedType === "academy_nutritionist" ? "nutritionist" :
                    selectedType === "academy_content_creator" ? "content_creator" :
                    "student"
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O convidado receberá um email com um link para aceitar o convite.
                O convite expira em 7 dias.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
