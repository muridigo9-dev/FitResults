import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface RolePermission {
    id: string;
    role: string;
    permission: string;
    resource: string;
    allowed: boolean;
    created_at: string;
    updated_at: string;
}

export interface PlanFeature {
    id: string;
    plan_id: string;
    feature_key: string;
    enabled: boolean;
    created_at: string;
    plan_name?: string; // joined
}

export interface PermissionAudit {
    id: string;
    table_name: string;
    record_id: string;
    action: "created" | "updated" | "deleted";
    old_value: Record<string, any> | null;
    new_value: Record<string, any> | null;
    changed_by: string;
    changed_at: string;
}

export interface ContentRuleStatus {
    table_name: string;
    feature_key: string;
    rls_enabled: boolean;
}

// Available roles in the system
export const AVAILABLE_ROLES = [
    { value: "admin", label: "Administrador", description: "Acesso total ao sistema" },
    { value: "academy_admin", label: "Admin Academia", description: "Gerencia sua academia" },
    { value: "personal_trainer", label: "Personal Trainer", description: "Gerencia alunos e conteúdo" },
    { value: "content_creator", label: "Criador de Conteúdo", description: "Cria e edita conteúdo" },
    { value: "aluno", label: "Aluno", description: "Acessa conteúdo e cria itens pessoais" },
    { value: "user", label: "Usuário", description: "Acesso básico" },
] as const;

// Available permissions
export const AVAILABLE_PERMISSIONS = [
    { value: "manage_users", label: "Gerenciar Usuários", description: "CRUD de usuários" },
    { value: "manage_content", label: "Gerenciar Conteúdo", description: "Editar todo conteúdo" },
    { value: "manage_settings", label: "Gerenciar Configurações", description: "Alterar settings" },
    { value: "view_admin", label: "Ver Painel Admin", description: "Acesso ao /admin" },
    { value: "create_content", label: "Criar Conteúdo", description: "Criar novo conteúdo" },
    { value: "view_content", label: "Ver Conteúdo", description: "Visualizar conteúdo" },
] as const;

// Available resources
export const AVAILABLE_RESOURCES = [
    { value: "all", label: "Todos" },
    { value: "diets", label: "Dietas" },
    { value: "workouts", label: "Treinos" },
    { value: "exercises", label: "Exercícios" },
    { value: "challenges", label: "Desafios" },
    { value: "users", label: "Usuários" },
] as const;

export function useAdminPermissions() {
    const queryClient = useQueryClient();

    // ========================
    // ROLE PERMISSIONS
    // ========================

    const {
        data: rolePermissions = [],
        isLoading: isLoadingRoles,
    } = useQuery({
        queryKey: ["admin-role-permissions"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("role_permissions")
                .select("*")
                .order("role", { ascending: true });

            if (error) throw error;
            return data as RolePermission[];
        },
    });

    // Group permissions by role for matrix view
    const permissionsByRole = rolePermissions.reduce((acc, perm) => {
        if (!acc[perm.role]) {
            acc[perm.role] = [];
        }
        acc[perm.role].push(perm);
        return acc;
    }, {} as Record<string, RolePermission[]>);

    // Create role permission
    const createRolePermission = useMutation({
        mutationFn: async (data: Omit<RolePermission, "id" | "created_at" | "updated_at">) => {
            const { error } = await (supabase as any)
                .from("role_permissions")
                .insert(data);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-role-permissions"] });
        },
    });

    // Update role permission
    const updateRolePermission = useMutation({
        mutationFn: async ({ id, ...data }: Partial<RolePermission> & { id: string }) => {
            const { error } = await (supabase as any)
                .from("role_permissions")
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-role-permissions"] });
        },
    });

    // Delete role permission
    const deleteRolePermission = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from("role_permissions")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-role-permissions"] });
        },
    });

    // Toggle permission (quick action)
    const togglePermission = useMutation({
        mutationFn: async ({ id, allowed }: { id: string; allowed: boolean }) => {
            const { error } = await (supabase as any)
                .from("role_permissions")
                .update({ allowed, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-role-permissions"] });
        },
    });

    // ========================
    // PLAN FEATURES
    // ========================

    const {
        data: planFeatures = [],
        isLoading: isLoadingPlanFeatures,
    } = useQuery({
        queryKey: ["admin-plan-features"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("plan_features")
                .select(`
          *,
          plans:plan_id (name)
        `)
                .order("feature_key", { ascending: true });

            if (error) throw error;
            return (data || []).map((item: any) => ({
                ...item,
                plan_name: item.plans?.name || "Unknown",
            })) as PlanFeature[];
        },
    });

    // Fetch available plans
    const { data: plans = [] } = useQuery({
        queryKey: ["admin-plans-list"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("plans")
                .select("id, name, is_active")
                .eq("is_active", true)
                .order("name");

            if (error) throw error;
            return data as { id: string; name: string; is_active: boolean }[];
        },
    });

    // Fetch available feature flags
    const { data: featureFlags = [] } = useQuery({
        queryKey: ["admin-feature-flags-list"],
        queryFn: async () => {
            // Seletor resiliente: busca o que existir. 
            // Se o usuário ainda não aplicou as migrations de tradução, o select(*) não quebrará.
            const { data, error } = await (supabase as any)
                .from("feature_flags")
                .select("*")
                .order("key");

            if (error) {
                console.error("[useAdminPermissions] Error fetching feature flags:", error);
                throw error;
            }

            return data as any[];
        },
    });

    const updateFeatureFlagMetadata = useMutation({
        mutationFn: async (data: {
            key: string;
            display_name?: string | null;
            display_name_en?: string | null;
            display_name_es?: string | null;
            description?: string | null;
            description_en?: string | null;
            description_es?: string | null;
            is_marketing_only?: boolean;
            show_in_plans?: boolean;
        }) => {
            // Filter out undefined/missing columns before sending update to DB
            // This prevents errors if the user hasn't yet applied the multilang migration
            const updatePayload: any = { ...data };
            delete updatePayload.key; // Don't update the key

            const { error } = await (supabase as any)
                .from("feature_flags")
                .update(updatePayload)
                .eq("key", data.key);

            if (error) {
                console.error("[useAdminPermissions] Error updating feature flag:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-feature-flags-list"] });
            queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
        },
    });

    // Create plan feature mapping
    const createPlanFeature = useMutation({
        mutationFn: async (data: { plan_id: string; feature_key: string; enabled: boolean }) => {
            const { error } = await (supabase as any)
                .from("plan_features")
                .insert(data);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
        },
    });

    // Update plan feature
    const updatePlanFeature = useMutation({
        mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
            const { error } = await (supabase as any)
                .from("plan_features")
                .update({ enabled, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
        },
    });

    // Delete plan feature
    const deletePlanFeature = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from("plan_features")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
        },
    });

    // ===================================
    // NEW PLAN MUTATIONS
    // ===================================

    const createPlan = useMutation({
        mutationFn: async (data: { name: string; description?: string }) => {
            const { data: plan, error } = await (supabase as any)
                .from("plans")
                .insert([{
                    name: data.name,
                    description: data.description,
                    is_active: true,
                    features: []
                }])
                .select()
                .single();

            if (error) throw error;
            return plan;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-plans-list"] });
        },
    });

    const togglePlanFeature = useMutation({
        mutationFn: async ({ plan_id, feature_key, enabled }: { plan_id: string; feature_key: string; enabled: boolean }) => {
            const { data: existing } = await (supabase as any)
                .from("plan_features")
                .select("id")
                .eq("plan_id", plan_id)
                .eq("feature_key", feature_key)
                .maybeSingle();

            if (existing) {
                const { error } = await (supabase as any)
                    .from("plan_features")
                    .update({ enabled, updated_at: new Date().toISOString() })
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from("plan_features")
                    .insert({
                        plan_id,
                        feature_key,
                        enabled
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
        },
    });

    const toggleFeatureFlag = useMutation({
        mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
            const { error } = await (supabase as any)
                .from("feature_flags")
                .update({ enabled })
                .eq("key", key);
            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate ALL feature flag related queries
            queryClient.invalidateQueries({ queryKey: ["admin-feature-flags-list"] });
            queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
            queryClient.invalidateQueries({ queryKey: ["user-capabilities"] });
        },
    });

    // ========================
    // CONTENT FEATURE MAPPING (from migration)
    // ========================

    const {
        data: contentRules = [],
        isLoading: isLoadingContentRules,
    } = useQuery({
        queryKey: ["admin-content-feature-mapping"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("content_feature_mapping")
                .select("*")
                .order("table_name");

            if (error) {
                // Table might not exist yet
                console.log("content_feature_mapping not found, using defaults");
                return [
                    { table_name: "exercises", feature_key: "exercises_enabled" },
                    { table_name: "workouts", feature_key: "training_mode_enabled" },
                    { table_name: "dishes", feature_key: "diets_enabled" },
                    { table_name: "diet_plans", feature_key: "diets_enabled" },
                    { table_name: "challenges", feature_key: "challenges_enabled" },
                ];
            }
            return data as { table_name: string; feature_key: string }[];
        },
    });

    // ========================
    // AUDIT LOG
    // ========================

    const {
        data: auditLog = [],
        isLoading: isLoadingAudit,
    } = useQuery({
        queryKey: ["admin-permissions-audit"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("permissions_audit")
                .select("*")
                .order("changed_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as PermissionAudit[];
        },
    });

    // ========================
    // STATS
    // ========================

    const stats = {
        totalRoles: AVAILABLE_ROLES.length,
        totalPermissions: rolePermissions.length,
        totalPlanMappings: planFeatures.length,
        totalContentRules: contentRules.length,
    };

    // ========================
    // INVALIDATE ALL
    // ========================

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-role-permissions"] });
        queryClient.invalidateQueries({ queryKey: ["admin-plan-features"] });
        queryClient.invalidateQueries({ queryKey: ["admin-permissions-audit"] });
        queryClient.invalidateQueries({ queryKey: ["admin-content-feature-mapping"] });
    };

    return {
        // Role Permissions
        rolePermissions,
        permissionsByRole,
        isLoadingRoles,
        createRolePermission: createRolePermission.mutate,
        updateRolePermission: updateRolePermission.mutate,
        deleteRolePermission: deleteRolePermission.mutate,
        togglePermission: togglePermission.mutate,
        isCreatingRole: createRolePermission.isPending,
        isUpdatingRole: updateRolePermission.isPending,
        isDeletingRole: deleteRolePermission.isPending,
        isTogglingPermission: togglePermission.isPending,

        // Plan Features
        planFeatures,
        plans,
        featureFlags,
        isLoadingPlanFeatures,
        createPlanFeature: createPlanFeature.mutate,
        updatePlanFeature: updatePlanFeature.mutate,
        deletePlanFeature: deletePlanFeature.mutate,
        isCreatingPlanFeature: createPlanFeature.isPending,
        isUpdatingPlanFeature: updatePlanFeature.isPending,

        isDeletingPlanFeature: deletePlanFeature.isPending,

        createPlan: createPlan.mutate,
        isCreatingPlan: createPlan.isPending,
        togglePlanFeature: togglePlanFeature.mutate,
        isTogglingPlanFeature: togglePlanFeature.isPending,

        // Content Rules
        contentRules,
        isLoadingContentRules,

        // Audit
        auditLog,
        isLoadingAudit,

        // Stats
        stats,

        // Utils
        invalidateAll,
        AVAILABLE_ROLES,
        AVAILABLE_PERMISSIONS,
        AVAILABLE_RESOURCES,

        isLoadingPlans: false, // Plans are fetched with dedicated query
        isLoadingFlags: false, // Flags are fetched with dedicated query

        toggleFeatureFlag: toggleFeatureFlag.mutate,
        isTogglingFeatureFlag: toggleFeatureFlag.isPending,
        updateFeatureFlagMetadata: updateFeatureFlagMetadata.mutate,
        isUpdatingFeatureFlagMetadata: updateFeatureFlagMetadata.isPending,
    };
}
