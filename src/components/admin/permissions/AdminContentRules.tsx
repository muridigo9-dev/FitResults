import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Unlock, Lock, AlertTriangle, Database, Power } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AdminContentRules() {
    const { contentRules, featureFlags, toggleFeatureFlag, isTogglingFeatureFlag, isLoadingContentRules } = useAdminPermissions();

    const handleToggle = (key: string, enabled: boolean) => {
        toggleFeatureFlag({ key, enabled }, {
            onSuccess: () => toast.success(`Feature flag ${enabled ? "ativada" : "desativada"} com sucesso`),
            onError: () => toast.error("Erro ao alterar feature flag")
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Regras de Conteúdo e RLS</h3>
                <p className="text-sm text-muted-foreground">
                    Visualize e controle como as tabelas do banco de dados estão protegidas por Feature Flags (Row Level Security).
                </p>
            </div>

            <Alert variant="warning" className="bg-amber-500/10 border-amber-500/50 text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                    Se uma feature flag estiver desativada globalmente aqui, <strong>ninguém</strong> terá acesso
                    ao conteúdo, independente do plano ou permissão de role.
                </AlertDescription>
            </Alert>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tabela do Banco de Dados</TableHead>
                                <TableHead>Feature Flag Controladora</TableHead>
                                <TableHead>Status Global (Master Switch)</TableHead>
                                <TableHead>Impacto no Acesso</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingContentRules ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        Carregando...
                                    </TableCell>
                                </TableRow>
                            ) : contentRules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        Nenhuma regra de conteúdo encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contentRules.map((rule) => {
                                    const flag = featureFlags.find((f) => f.key === rule.feature_key);
                                    const isEnabled = flag?.enabled ?? false;

                                    return (
                                        <TableRow key={rule.id}>
                                            <TableCell className="font-mono">
                                                <div className="flex items-center gap-2">
                                                    <Database className="h-4 w-4 text-muted-foreground" />
                                                    public.{rule.table_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <Badge variant="outline" className="font-mono w-fit">
                                                        {rule.feature_key}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground mt-1">
                                                        {flag?.description}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Switch
                                                        checked={isEnabled}
                                                        onCheckedChange={(checked) => handleToggle(rule.feature_key, checked)}
                                                        disabled={isTogglingFeatureFlag}
                                                        className={cn(isEnabled ? "data-[state=checked]:bg-green-500" : "data-[state=unchecked]:bg-red-500")}
                                                    />
                                                    <span className={cn("text-sm font-medium", isEnabled ? "text-green-600" : "text-red-600")}>
                                                        {isEnabled ? "HABILITADA" : "DESABILITADA"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isEnabled ? (
                                                    <div className="flex items-center gap-2 text-green-600 text-sm">
                                                        <Unlock className="h-4 w-4" />
                                                        <span>Acesso permitido (sujeito a Plano/Role)</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-destructive text-sm font-medium bg-destructive/10 px-2 py-1 rounded w-fit">
                                                        <Lock className="h-4 w-4" />
                                                        <span>BLOQUEIO TOTAL DO SISTEMA</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
