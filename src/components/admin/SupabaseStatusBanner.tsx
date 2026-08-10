import { useSupabaseStatus } from "@/hooks/useSupabaseStatus";
import { useI18n } from "@/hooks/useI18n";
import { AlertTriangle, Database } from "lucide-react";

export function SupabaseStatusBanner() {
  const { t } = useI18n();
  const { isConnected, isLoading } = useSupabaseStatus();

  // Don't show anything while loading or if connected
  if (isLoading || isConnected) {
    return null;
  }

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="flex items-center gap-2 flex-1">
        <Database className="h-4 w-4" />
        <span className="text-sm font-medium">
          {t("admin.supabaseNotConnected") || "⚠️ Supabase não está conectado. O sistema não funcionará corretamente até que o banco de dados seja configurado."}
        </span>
      </div>
    </div>
  );
}
