import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/useI18n";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
    className?: string;
    variant?: "ghost" | "outline" | "default";
    size?: "sm" | "default" | "icon";
    showLabel?: boolean;
}

export function LanguageSwitcher({
    className,
    variant = "ghost",
    size = "sm",
    showLabel = true
}: LanguageSwitcherProps) {
    const { language, setLanguage, availableLanguages, currentLanguageInfo } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    className={cn("gap-2", className)}
                >
                    {size === "icon" ? (
                        <Globe className="h-4 w-4" />
                    ) : (
                        <>
                            <span className="text-lg leading-none">{currentLanguageInfo?.flag}</span>
                            {showLabel && (
                                <span className="hidden sm:inline-block font-medium">
                                    {currentLanguageInfo?.nativeName}
                                </span>
                            )}
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
                {availableLanguages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        className={cn(
                            "flex items-center justify-between cursor-pointer",
                            language === lang.code && "bg-accent text-accent-foreground font-semibold"
                        )}
                        onClick={() => setLanguage(lang.code)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{lang.flag}</span>
                            <span>{lang.nativeName}</span>
                        </div>
                        {language === lang.code && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
