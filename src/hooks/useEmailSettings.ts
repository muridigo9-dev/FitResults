import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailSettings {
  id: string;
  api_key_hint: string | null;
  sender_name: string;
  sender_email: string;
  is_enabled: boolean;
  test_email_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  variables: string[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  user_id: string | null;
  user_email: string;
  template_id: string | null;
  template_type: string | null;
  subject: string;
  status: "sent" | "failed" | "pending";
  error_message: string | null;
  resend_id: string | null;
  metadata: Record<string, unknown>;
  sent_at: string;
  created_at: string;
}

export function useEmailSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as EmailSettings | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<EmailSettings> & { api_key?: string }) => {
      const { api_key, ...settingsData } = newSettings;
      
      // If API key is provided, encrypt it (in real app, use server-side encryption)
      const updateData: any = {
        ...settingsData,
        updated_at: new Date().toISOString(),
      };

      if (api_key) {
        // Store hint (last 4 chars) and the key
        updateData.api_key_hint = `...${api_key.slice(-4)}`;
        updateData.api_key_encrypted = api_key; // In production, encrypt this
      }

      if (settings?.id) {
        const { data, error } = await (supabase as any)
          .from("email_settings")
          .update(updateData)
          .eq("id", settings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("email_settings")
          .insert(updateData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      toast.success("Configurações de e-mail salvas!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const testEmail = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          template_type: "general_notification",
          variables: {
            user_name: "Admin",
            app_name: "FitResults",
            subject: "Teste de E-mail",
            content: "Este é um e-mail de teste. Se você está recebendo isso, sua configuração está funcionando corretamente!",
          },
          is_test: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("E-mail de teste enviado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar teste: ${error.message}`);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    testEmail: testEmail.mutate,
    isTesting: testEmail.isPending,
  };
}

export function useEmailTemplates() {
  const queryClient = useQueryClient();

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<EmailTemplate, "id" | "created_at" | "updated_at" | "version">) => {
      const { data, error } = await (supabase as any)
        .from("email_templates")
        .insert({
          ...template,
          version: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template criado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...template }: Partial<EmailTemplate> & { id: string }) => {
      // Get current version
      const { data: current } = await (supabase as any)
        .from("email_templates")
        .select("version")
        .eq("id", id)
        .single();

      const { data, error } = await (supabase as any)
        .from("email_templates")
        .update({
          ...template,
          version: (current?.version || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template excluído!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate: createTemplate.mutate,
    isCreating: createTemplate.isPending,
    updateTemplate: updateTemplate.mutate,
    isUpdating: updateTemplate.isPending,
    deleteTemplate: deleteTemplate.mutate,
    isDeleting: deleteTemplate.isPending,
  };
}

export function useEmailLogs() {
  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as EmailLog[];
    },
  });

  return {
    logs,
    isLoading,
    error,
    refetch,
  };
}
