import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Package, Database, History, RefreshCw, Lock, Settings2 } from "lucide-react";
import { AdminRolePermissions } from "@/components/admin/permissions/AdminRolePermissions";
import { AdminPlanFeatures } from "@/components/admin/permissions/AdminPlanFeatures";
import { AdminFeatureFlags } from "@/components/admin/permissions/AdminFeatureFlags";
import { AdminContentRules } from "@/components/admin/permissions/AdminContentRules";
import { AdminAuditLog } from "@/components/admin/permissions/AdminAuditLog";
import { AdminAuthProviders } from "@/components/admin/permissions/AdminAuthProviders";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

export default function AdminPermissions() {
    const { invalidateAll } = useAdminPermissions();

    return (
        <AdminLayout title="Permissões">
            <div className="space-y-6">
                {/* Header Global */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            Permissões & Acesso
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Central de controle de segurança e acesso do sistema
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="roles" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="roles" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Roles
                        </TabsTrigger>
                        <TabsTrigger value="meta" className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Gestão de Features
                        </TabsTrigger>
                        <TabsTrigger value="features" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Plano → Feature
                        </TabsTrigger>
                        <TabsTrigger value="content_rules" className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Regras de Conteúdo
                        </TabsTrigger>
                        <TabsTrigger value="auth" className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Autenticação
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Histórico
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="roles" className="space-y-4">
                        <AdminRolePermissions />
                    </TabsContent>

                    <TabsContent value="meta" className="space-y-4">
                        <AdminFeatureFlags />
                    </TabsContent>

                    <TabsContent value="features" className="space-y-4">
                        <AdminPlanFeatures />
                    </TabsContent>

                    <TabsContent value="content_rules" className="space-y-4">
                        <AdminContentRules />
                    </TabsContent>

                    <TabsContent value="auth" className="space-y-4">
                        <AdminAuthProviders />
                    </TabsContent>

                    <TabsContent value="audit" className="space-y-4">
                        <AdminAuditLog />
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
