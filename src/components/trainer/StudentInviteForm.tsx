import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStudentInvites } from "@/hooks/useStudentInvites";
import { useAllGroups } from "@/hooks/useUserGroups";
import { Mail, Send, Users, Clock, X, RotateCcw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  group_id: z.string().optional(),
  message: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface StudentInviteFormProps {
  className?: string;
  onSuccess?: () => void;
}

function InviteStatusBadge({ status, expiresAt }: { status: string; expiresAt: string }) {
  const isExpired = status === "pending" && new Date(expiresAt) < new Date();
  
  if (isExpired || status === "expired") {
    return (
      <Badge variant="outline" className="text-destructive border-destructive/30">
        <Clock className="h-3 w-3 mr-1" />
        Expirado
      </Badge>
    );
  }
  
  if (status === "accepted") {
    return (
      <Badge variant="outline" className="text-success border-success/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Aceito
      </Badge>
    );
  }
  
  if (status === "cancelled") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <XCircle className="h-3 w-3 mr-1" />
        Cancelado
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-warning border-warning/30">
      <Clock className="h-3 w-3 mr-1" />
      Pendente
    </Badge>
  );
}

export function StudentInviteForm({ className, onSuccess }: StudentInviteFormProps) {
  const { groups, isLoading: isLoadingGroups } = useAllGroups();
  const {
    invites,
    pendingInvites,
    isLoading,
    sendInvite,
    isSending,
    cancelInvite,
    isCancelling,
    resendInvite,
    isResending,
  } = useStudentInvites();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      group_id: "",
      message: "",
    },
  });

  const onSubmit = (data: InviteFormData) => {
    sendInvite({
      email: data.email,
      group_id: data.group_id || null,
      message: data.message,
    }, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Convidar Novo Aluno
          </CardTitle>
          <CardDescription>
            Envie um convite por email para adicionar um novo aluno à sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Aluno</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="aluno@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum grupo</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      O aluno será automaticamente adicionado ao grupo selecionado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem Personalizada (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escreva uma mensagem de boas-vindas para o aluno..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Esta mensagem será incluída no email de convite
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSending} className="w-full">
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-warning" />
              Convites Pendentes
              <Badge variant="secondary" className="ml-2">
                {pendingInvites.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Enviado em {format(new Date(invite.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <InviteStatusBadge status={invite.status} expiresAt={invite.expires_at} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => resendInvite(invite.id)}
                    disabled={isResending}
                    title="Reenviar convite"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => cancelInvite(invite.id)}
                    disabled={isCancelling}
                    title="Cancelar convite"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Invites History */}
      {invites.length > pendingInvites.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Convites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites
              .filter((i) => i.status !== "pending" || new Date(i.expires_at) < new Date())
              .slice(0, 10)
              .map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-muted-foreground truncate flex-1">
                    {invite.email}
                  </span>
                  <InviteStatusBadge status={invite.status} expiresAt={invite.expires_at} />
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StudentInviteForm;
