import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserFilters, AccountStatus, UserStatus, UserRole } from "@/hooks/useAdminUsers";

interface AdminUserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  activeFiltersCount: number;
}

export function AdminUserFilters({ filters, onFiltersChange, activeFiltersCount }: AdminUserFiltersProps) {
  const handleReset = () => {
    onFiltersChange({
      accountStatus: "all",
      subscriptionStatus: "all",
      role: "all",
      userType: "all",
    });
  };

  const accountStatusOptions: { value: AccountStatus | "all"; label: string }[] = [
    { value: "all", label: "Todos os status" },
    { value: "active", label: "Ativo" },
    { value: "pending", label: "Pendente" },
    { value: "suspended", label: "Suspenso" },
    { value: "cancelled", label: "Cancelado" },
  ];

  const subscriptionOptions: { value: UserStatus | "all"; label: string }[] = [
    { value: "all", label: "Todas assinaturas" },
    { value: "active", label: "Ativa" },
    { value: "trial", label: "Trial" },
    { value: "expired", label: "Expirada" },
    { value: "cancelled", label: "Cancelada" },
    { value: "none", label: "Sem assinatura" },
  ];

  const roleOptions: { value: UserRole | "all"; label: string }[] = [
    { value: "all", label: "Todas as roles" },
    { value: "admin", label: "Admin" },
    { value: "user", label: "Usuário" },
    { value: "personal_trainer", label: "Personal Trainer" },
    { value: "academy_admin", label: "Academia" },
    { value: "content_creator", label: "Criador de Conteúdo" },
  ];

  const userTypeOptions: { value: "all" | "real" | "test"; label: string }[] = [
    { value: "all", label: "Todos os tipos" },
    { value: "real", label: "Usuários Reais" },
    { value: "test", label: "Usuários de Teste" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filtros:</span>
      </div>

      <Select
        value={filters.accountStatus}
        onValueChange={(value) => onFiltersChange({ ...filters, accountStatus: value as AccountStatus | "all" })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Status da conta" />
        </SelectTrigger>
        <SelectContent>
          {accountStatusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.subscriptionStatus}
        onValueChange={(value) => onFiltersChange({ ...filters, subscriptionStatus: value as UserStatus | "all" })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Assinatura" />
        </SelectTrigger>
        <SelectContent>
          {subscriptionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.role}
        onValueChange={(value) => onFiltersChange({ ...filters, role: value as UserRole | "all" })}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.userType}
        onValueChange={(value) => onFiltersChange({ ...filters, userType: value as "all" | "real" | "test" })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          {userTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 px-2 gap-1">
          <X className="h-4 w-4" />
          <span>Limpar</span>
          <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
        </Button>
      )}
    </div>
  );
}
