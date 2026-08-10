import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useUserPreferences, ThemeMode } from "@/hooks/useUserPreferences";
import { useI18n } from "@/hooks/useI18n";

export function ThemeSelector() {
  const { t } = useI18n();
  const { themeMode, setThemeMode, isUpdating } = useUserPreferences();

  const options: { value: ThemeMode; icon: typeof Sun; label: string; desc: string }[] = [
    {
      value: "light",
      icon: Sun,
      label: t("settings.themeLight"),
      desc: t("settings.themeLightDesc"),
    },
    {
      value: "dark",
      icon: Moon,
      label: t("settings.themeDark"),
      desc: t("settings.themeDarkDesc"),
    },
    {
      value: "system",
      icon: Monitor,
      label: t("settings.themeSystem"),
      desc: t("settings.themeSystemDesc"),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">{t("settings.theme")}</Label>
        <p className="text-sm text-muted-foreground">{t("settings.themeDesc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = themeMode === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setThemeMode(option.value)}
              disabled={isUpdating}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground text-center">
                {option.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact theme selector for profile page
 */
export function ThemeSelectorCompact() {
  const { t } = useI18n();
  const { themeMode, setThemeMode, isUpdating } = useUserPreferences();

  const options: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: t("settings.themeLight") },
    { value: "dark", icon: Moon, label: t("settings.themeDark") },
    { value: "system", icon: Monitor, label: t("settings.themeSystem") },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            {themeMode === "dark" ? (
              <Moon className="h-5 w-5 text-muted-foreground" />
            ) : themeMode === "light" ? (
              <Sun className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Monitor className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">{t("settings.theme")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.selectTheme")}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = themeMode === option.value;

            return (
              <Button
                key={option.value}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setThemeMode(option.value)}
                disabled={isUpdating}
                className="flex-1"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
