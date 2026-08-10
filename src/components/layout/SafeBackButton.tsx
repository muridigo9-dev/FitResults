/**
 * SafeBackButton Component
 * 
 * Botão de voltar que garante navegação segura dentro do domínio do role.
 * Nunca permite voltar para rotas de outro role.
 */

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSafeBack } from "./RoleGuard";
import { cn } from "@/lib/utils";

interface SafeBackButtonProps {
  fallbackPath?: string;
  className?: string;
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function SafeBackButton({
  fallbackPath,
  className,
  variant = "ghost",
  size = "icon",
  children,
}: SafeBackButtonProps) {
  const goBack = useSafeBack();

  const handleClick = () => {
    goBack();
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(className)}
      aria-label="Voltar"
    >
      {children || <ArrowLeft className="h-5 w-5" />}
    </Button>
  );
}
