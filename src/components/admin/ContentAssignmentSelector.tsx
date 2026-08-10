import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, User, UsersRound, Loader2 } from "lucide-react";
import { useAllGroups } from "@/hooks/useUserGroups";
import { usePersonalTrainerMode } from "@/hooks/usePersonalTrainerMode";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ContentAssignment, AssignmentType } from "@/types/content";


interface ContentAssignmentSelectorProps {
  value: ContentAssignment;
  onChange: (assignment: ContentAssignment) => void;
  disabled?: boolean;
}

export function ContentAssignmentSelector({
  value,
  onChange,
  disabled = false,
}: ContentAssignmentSelectorProps) {
  const { isPersonalTrainerModeEnabled, allowedGroupIds, isAdmin } = usePersonalTrainerMode();
  const { groups, isLoading: isGroupsLoading } = useAllGroups();

  // Fetch users for user assignment
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["profiles-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isPersonalTrainerModeEnabled,
  });

  // Filter groups based on allowed_group_ids for content creators
  const availableGroups = isAdmin
    ? groups
    : groups.filter(g => allowedGroupIds?.includes(g.id));

  if (!isPersonalTrainerModeEnabled) {
    return null;
  }

  const isLoading = isGroupsLoading || isUsersLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UsersRound className="h-5 w-5" />
          Atribuição de Conteúdo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Público-alvo</Label>
          <Select
            value={value.assigned_to_type}
            onValueChange={(type: AssignmentType) => {
              onChange({
                assigned_to_type: type,
                assigned_to_id: type === "global" ? null : "",
              });
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Global (Todos os usuários)
                </div>
              </SelectItem>
              <SelectItem value="group">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4" />
                  Grupo específico
                </div>
              </SelectItem>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Usuário específico
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {value.assigned_to_type === "group" && (
          <div className="space-y-2">
            <Label>Grupo</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando grupos...
              </div>
            ) : availableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum grupo disponível. Crie um grupo primeiro.
              </p>
            ) : (
              <Select
                value={value.assigned_to_id || ""}
                onValueChange={(id) => {
                  onChange({
                    ...value,
                    assigned_to_id: id,
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <UsersRound className="h-4 w-4" />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {value.assigned_to_type === "user" && (
          <div className="space-y-2">
            <Label>Usuário</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <Select
                value={value.assigned_to_id || ""}
                onValueChange={(id) => {
                  onChange({
                    ...value,
                    assigned_to_id: id,
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.full_name || user.email || user.id}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Assignment Preview */}
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground mb-2">Visibilidade:</p>
          <Badge variant="secondary" className="gap-1">
            {value.assigned_to_type === "global" && (
              <>
                <Globe className="h-3 w-3" />
                Todos os usuários
              </>
            )}
            {value.assigned_to_type === "group" && (
              <>
                <UsersRound className="h-3 w-3" />
                {availableGroups.find(g => g.id === value.assigned_to_id)?.name || "Selecione um grupo"}
              </>
            )}
            {value.assigned_to_type === "user" && (
              <>
                <User className="h-3 w-3" />
                {users.find(u => u.id === value.assigned_to_id)?.full_name ||
                  users.find(u => u.id === value.assigned_to_id)?.email ||
                  "Selecione um usuário"}
              </>
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
