import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SupabaseStatus {
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  projectRef: string | null;
  webhookUrl: string | null;
}

export function useSupabaseStatus(): SupabaseStatus {
  const { data, isLoading, error } = useQuery({
    queryKey: ["supabase-status"],
    queryFn: async () => {
      try {
        // Try to query a simple table to verify connection
        const { error } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);

        if (error) {
          console.error("Supabase connection error:", error);
          return { isConnected: false, projectRef: null };
        }

        // Extract project ref from Supabase URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
        const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
        const projectRef = match ? match[1] : null;

        return { 
          isConnected: true, 
          projectRef 
        };
      } catch (err) {
        console.error("Supabase connection check failed:", err);
        return { isConnected: false, projectRef: null };
      }
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    retry: 2,
  });

  const projectRef = data?.projectRef || null;
  const webhookUrl = projectRef 
    ? `https://${projectRef}.supabase.co/functions/v1/stripe-webhook`
    : null;

  return {
    isConnected: data?.isConnected ?? false,
    isLoading,
    error: error as Error | null,
    projectRef,
    webhookUrl,
  };
}
