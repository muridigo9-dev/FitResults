import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";

export type EmailProvider = "supabase" | "resend";

export interface EmailSystemStatus {
  id: string;
  sender_name: string;
  sender_email: string;
  is_enabled: boolean;
  enable_fallback: boolean;
  verified_domain: string | null;
  reply_to: string | null;
  connection_status: string;
  last_status_check: string | null;
  has_api_key: boolean;
  active_provider: EmailProvider;
  resend_flag_enabled: boolean;
}

/**
 * Hook para gerenciar o provedor de email ativo
 * Lê a feature flag email_provider para determinar o provedor
 */
export function useEmailProvider() {
  const queryClient = useQueryClient();
  const { flags, toggleFlag, isToggling } = useAdminFeatureFlags();

  // Encontrar a flag de email_provider
  const emailProviderFlag = flags?.find((f) => f.key === "email_provider");

  // Buscar status completo do sistema de email
  const { data: systemStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["email-system-status"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_system_status")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching email system status:", error);
        return null;
      }
      return data as EmailSystemStatus | null;
    },
  });

  // Provider ativo baseado na flag
  const activeProvider: EmailProvider = emailProviderFlag?.enabled ? "resend" : "supabase";

  // Função para alternar provedor
  const switchProvider = async (provider: EmailProvider) => {
    if (!emailProviderFlag) {
      toast.error("Feature flag email_provider não encontrada");
      return;
    }

    const shouldEnableResend = provider === "resend";
    
    // Verificar se Resend está configurado antes de ativar
    if (shouldEnableResend && !systemStatus?.has_api_key) {
      toast.error("Configure a API Key do Resend antes de ativar");
      return;
    }

    toggleFlag({ id: emailProviderFlag.id, enabled: shouldEnableResend });
  };

  // Atualizar configurações de fallback
  const updateFallbackSettings = useMutation({
    mutationFn: async (settings: { enable_fallback?: boolean; reply_to?: string }) => {
      if (!systemStatus?.id) throw new Error("Email settings not found");

      const { data, error } = await (supabase as any)
        .from("email_settings")
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", systemStatus.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-system-status"] });
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      toast.success("Configurações atualizadas!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Testar conexão com provedor
  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: systemStatus?.sender_email || "test@example.com",
          subject: "Teste de Conexão",
          html: "<p>Este é um teste de conexão do sistema de email.</p>",
          is_test: true,
        },
      });

      if (error) throw error;
      
      // Atualizar status da conexão
      if (systemStatus?.id) {
        await (supabase as any)
          .from("email_settings")
          .update({
            connection_status: "connected",
            last_status_check: new Date().toISOString(),
          })
          .eq("id", systemStatus.id);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-system-status"] });
      toast.success("Conexão testada com sucesso!");
    },
    onError: (error: Error) => {
      // Atualizar status como erro
      if (systemStatus?.id) {
        (supabase as any)
          .from("email_settings")
          .update({
            connection_status: "error",
            last_status_check: new Date().toISOString(),
          })
          .eq("id", systemStatus.id);
      }
      toast.error(`Erro na conexão: ${error.message}`);
    },
  });

  return {
    // Estado
    activeProvider,
    systemStatus,
    isLoading: isLoadingStatus,
    emailProviderFlag,
    
    // Helpers
    isResendActive: activeProvider === "resend",
    isSupabaseActive: activeProvider === "supabase",
    hasResendConfigured: systemStatus?.has_api_key ?? false,
    isFallbackEnabled: systemStatus?.enable_fallback ?? true,
    connectionStatus: systemStatus?.connection_status ?? "unknown",
    
    // Ações
    switchProvider,
    isSwitching: isToggling,
    updateFallbackSettings: updateFallbackSettings.mutate,
    isUpdatingFallback: updateFallbackSettings.isPending,
    testConnection: testConnection.mutate,
    isTestingConnection: testConnection.isPending,
  };
}

/**
 * Hook para ler o provedor de email (apenas leitura)
 * Útil para componentes que só precisam saber qual provedor está ativo
 */
export function useActiveEmailProvider(): EmailProvider {
  const { data } = useQuery({
    queryKey: ["active-email-provider"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_email_provider");

      if (error) {
        console.error("Error fetching email provider:", error);
        return "supabase" as EmailProvider;
      }
      return (data || "supabase") as EmailProvider;
    },
    staleTime: 60000, // 1 minuto
  });

  return data ?? "supabase";
}
