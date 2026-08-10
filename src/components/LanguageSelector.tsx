import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  variant?: "default" | "compact" | "full";
  className?: string;
}

export function LanguageSelector({ variant = "default", className }: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, currentLanguageInfo, t } = useI18n();

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
            <span className="text-lg">{currentLanguageInfo.flag}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "cursor-pointer gap-2",
                language === lang.code && "bg-primary/10 text-primary"
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn("space-y-2", className)}>
        {availableLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              language === lang.code
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted/50 hover:bg-muted border border-transparent"
            )}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1">
              <p className="font-medium">{lang.nativeName}</p>
              <p className="text-xs text-muted-foreground">{lang.name}</p>
            </div>
            {language === lang.code && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Globe className="h-4 w-4" />
          <span className="text-lg">{currentLanguageInfo.flag}</span>
          <span className="hidden sm:inline">{currentLanguageInfo.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "cursor-pointer gap-2",
              language === lang.code && "bg-primary/10 text-primary"
            )}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="flex-1">{lang.nativeName}</span>
            {language === lang.code && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
