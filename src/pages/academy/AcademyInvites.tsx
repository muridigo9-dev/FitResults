import { useState } from "react";
import { useAcademy } from "@/contexts/AcademyContext";
import { useAcademyInvites, useCancelInvite, useResendInvite } from "@/hooks/useAcademyInvites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AcademyBadge, StatusBadge } from "@/components/academy";
import { CreateInviteDialog } from "@/components/academy/CreateInviteDialog";
import { LoadingScreen } from "@/components/states";
import { MoreVertical, Search, UserPlus, XCircle, RefreshCcw, Copy, Mail } from "lucide-react";
import { toast } from "sonner";

// =====================================================
// ACADEMY INVITES PAGE
// =====================================================

export default function AcademyInvites() {
  const { currentAcademy, canInviteStudents } = useAcademy();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const { data: invites = [], isLoading } = useAcademyInvites(currentAcademy?.id);
  const { mutate: cancelInvite } = useCancelInvite();
  const { mutate: resendInvite } = useResendInvite();

  // Filter invites
  const filteredInvites = invites.filter((invite) =>
    invite.invited_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingInvites = filteredInvites.filter((i) => i.status === "pending");
  const acceptedInvites = filteredInvites.filter((i) => i.status === "accepted");
  const expiredInvites = filteredInvites.filter((i) => i.status === "expired");

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  if (isLoading) {
    return <LoadingScreen message="Carregando convites..." />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Convites</h1>
          <p className="text-muted-foreground">
            Gerencie convites pendentes, aceitos e expirados
          </p>
        </div>

        {canInviteStudents && (
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Novo Convite
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingInvites.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aceitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {acceptedInvites.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Convites aceitos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expirados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {expiredInvites.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expirados ou cancelados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invites Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Convites</CardTitle>
          <CardDescription>
            {filteredInvites.length} convite(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invite.invited_email}</p>
                      {invite.message && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          "{invite.message}"
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AcademyBadge
                      role={
                        invite.target_role === "personal_trainer" ? "trainer" :
                        invite.target_role === "nutritionist" ? "nutritionist" :
                        invite.target_role === "content_creator" ? "content_creator" :
                        "student"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invite.status} />
                  </TableCell>
                  <TableCell>
                    {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {invite.status === "pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(invite.token)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => resendInvite(invite.id)}
                            >
                              <RefreshCcw className="w-4 h-4 mr-2" />
                              Reenviar Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => cancelInvite(invite.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          </>
                        )}
                        {invite.status === "accepted" && (
                          <DropdownMenuItem disabled>
                            <Mail className="w-4 h-4 mr-2" />
                            Aceito em{" "}
                            {invite.accepted_at &&
                              new Date(invite.accepted_at).toLocaleDateString("pt-BR")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInvites.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">Nenhum convite encontrado</p>
              <p className="text-sm">
                Crie um novo convite para adicionar membros à academia.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invite Dialog */}
      <CreateInviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />
    </div>
  );
}
