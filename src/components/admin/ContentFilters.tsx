import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X, Globe, UsersRound, User, UserPen } from "lucide-react";
import { useAllGroups } from "@/hooks/useUserGroups";
import { useContentCreators } from "@/hooks/useContentCreators";
import { usePersonalTrainerMode } from "@/hooks/usePersonalTrainerMode";

export interface ContentFiltersState {
  assignedToType: "all" | "global" | "user" | "group";
  assignedToGroupId: string | null;
  createdById: string | null;
}

interface ContentFiltersProps {
  filters: ContentFiltersState;
  onFiltersChange: (filters: ContentFiltersState) => void;
}

export function ContentFilters({ filters, onFiltersChange }: ContentFiltersProps) {
  const { isPersonalTrainerModeEnabled } = usePersonalTrainerMode();
  const { groups } = useAllGroups();
  const { creators } = useContentCreators();
  const [open, setOpen] = useState(false);

  if (!isPersonalTrainerModeEnabled) {
    return null;
  }

  const hasActiveFilters = 
    filters.assignedToType !== "all" || 
    filters.assignedToGroupId !== null || 
    filters.createdById !== null;

  const activeFilterCount = [
    filters.assignedToType !== "all",
    filters.assignedToGroupId !== null,
    filters.createdById !== null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      assignedToType: "all",
      assignedToGroupId: null,
      createdById: null,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtrar conteúdo</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Assignment Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Atribuição</label>
              <Select
                value={filters.assignedToType}
                onValueChange={(value: ContentFiltersState["assignedToType"]) => {
                  onFiltersChange({
                    ...filters,
                    assignedToType: value,
                    assignedToGroupId: value === "group" ? filters.assignedToGroupId : null,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      Todos
                    </div>
                  </SelectItem>
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Global
                    </div>
                  </SelectItem>
                  <SelectItem value="group">
                    <div className="flex items-center gap-2">
                      <UsersRound className="h-4 w-4" />
                      Grupo
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

            {/* Group Filter (when type is group) */}
            {filters.assignedToType === "group" && groups.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Grupo</label>
                <Select
                  value={filters.assignedToGroupId || "all"}
                  onValueChange={(value) => {
                    onFiltersChange({
                      ...filters,
                      assignedToGroupId: value === "all" ? null : value,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Creator Filter */}
            {creators && creators.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Criado por</label>
                <Select
                  value={filters.createdById || "all"}
                  onValueChange={(value) => {
                    onFiltersChange({
                      ...filters,
                      createdById: value === "all" ? null : value,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os criadores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os criadores</SelectItem>
                    {creators.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        <div className="flex items-center gap-2">
                          <UserPen className="h-4 w-4" />
                          {creator.full_name || creator.email || creator.id}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.assignedToType !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {filters.assignedToType === "global" && <Globe className="h-3 w-3" />}
              {filters.assignedToType === "group" && <UsersRound className="h-3 w-3" />}
              {filters.assignedToType === "user" && <User className="h-3 w-3" />}
              {filters.assignedToType === "global" && "Global"}
              {filters.assignedToType === "group" && (
                filters.assignedToGroupId 
                  ? groups.find(g => g.id === filters.assignedToGroupId)?.name 
                  : "Grupo"
              )}
              {filters.assignedToType === "user" && "Usuário"}
              <button
                onClick={() => onFiltersChange({ ...filters, assignedToType: "all", assignedToGroupId: null })}
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.createdById && creators && (
            <Badge variant="secondary" className="gap-1">
              <UserPen className="h-3 w-3" />
              {creators.find(c => c.id === filters.createdById)?.full_name || "Criador"}
              <button
                onClick={() => onFiltersChange({ ...filters, createdById: null })}
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
