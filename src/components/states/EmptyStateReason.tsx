import { AlertCircle, Lock, LogIn, ShieldAlert, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { BlockReason } from "@/hooks/useUserCapabilities";

interface EmptyStateReasonProps {
    reason: BlockReason;
    title?: string;
    message?: string;
    showAction?: boolean;
    className?: string;
}

/**
 * Context-aware empty state component that explains WHY content is hidden
 */
export function EmptyStateReason({
    reason,
    title,
    message,
    showAction = true,
    className = "",
}: EmptyStateReasonProps) {
    const navigate = useNavigate();

    const getConfig = () => {
        switch (reason) {
            case "not_authenticated":
                return {
                    icon: LogIn,
                    defaultTitle: "Login Necessário",
                    defaultMessage: "Faça login para acessar este conteúdo.",
                    actionLabel: "Fazer Login",
                    actionFn: () => navigate("/login"),
                };
            case "feature_disabled":
                return {
                    icon: AlertCircle,
                    defaultTitle: "Funcionalidade Indisponível",
                    defaultMessage: "Esta funcionalidade está temporariamente desativada.",
                    actionLabel: null,
                    actionFn: null,
                };
            case "plan_required":
                return {
                    icon: Lock,
                    defaultTitle: "Conteúdo Premium",
                    defaultMessage: "Este conteúdo está disponível em planos específicos.",
                    actionLabel: "Ver Planos",
                    actionFn: () => navigate("/plans"),
                };
            case "role_insufficient":
                return {
                    icon: ShieldAlert,
                    defaultTitle: "Acesso Restrito",
                    defaultMessage: "Você não tem permissão para acessar este conteúdo.",
                    actionLabel: null,
                    actionFn: null,
                };
            case "visibility_restricted":
                return {
                    icon: Eye,
                    defaultTitle: "Conteúdo Restrito",
                    defaultMessage: "Este conteúdo não está disponível para você.",
                    actionLabel: null,
                    actionFn: null,
                };
            default:
                return {
                    icon: AlertCircle,
                    defaultTitle: "Nenhum Conteúdo",
                    defaultMessage: "Nenhum conteúdo encontrado.",
                    actionLabel: null,
                    actionFn: null,
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
        >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
                {title || config.defaultTitle}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
                {message || config.defaultMessage}
            </p>
            {showAction && config.actionLabel && config.actionFn && (
                <Button onClick={config.actionFn} variant="outline">
                    {config.actionLabel}
                </Button>
            )}
        </div>
    );
}

/**
 * Simple loading skeleton for empty states
 */
export function EmptyStateSkeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
        >
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse mb-4" />
            <div className="h-5 w-32 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
    );
}
