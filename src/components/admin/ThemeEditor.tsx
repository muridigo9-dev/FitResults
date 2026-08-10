import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorPicker } from "./ColorPicker";
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  background: string;
  surface: string;
  surfaceElevated: string;
}

interface ThemeEditorProps {
  lightColors: ThemeColors;
  darkColors: ThemeColors;
  onLightChange: (colors: ThemeColors) => void;
  onDarkChange: (colors: ThemeColors) => void;
  livePreview?: boolean;
  onTogglePreview?: () => void;
}

export function ThemeEditor({
  lightColors,
  darkColors,
  onLightChange,
  onDarkChange,
  livePreview = true,
  onTogglePreview,
}: ThemeEditorProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"light" | "dark">("light");

  const handleColorChange = (mode: "light" | "dark", key: keyof ThemeColors, value: string) => {
    const currentModeColors = mode === "light" ? lightColors : darkColors;
    let newColors = { ...currentModeColors, [key]: value };

    // Automatic sync for hidden tokens to maintain consistency
    if (key === "primary") {
      newColors.secondary = value;
      newColors.tertiary = value;
      newColors.quaternary = value;
    } else if (key === "textMuted") {
      newColors.textSecondary = value;
    } else if (key === "surface") {
      newColors.surfaceElevated = value;
    }

    if (mode === "light") {
      onLightChange(newColors);
    } else {
      onDarkChange(newColors);
    }
  };

  const colorLabels: Record<keyof ThemeColors, string> = {
    primary: t("admin.primaryColor"),
    secondary: t("admin.secondaryColor"),
    tertiary: t("admin.tertiaryColor"),
    quaternary: t("admin.quaternaryColor"),
    accent: t("admin.accentColor"),
    textPrimary: t("admin.textPrimary"),
    textSecondary: t("admin.textSecondary"),
    textMuted: t("admin.textMuted"),
    background: t("admin.background"),
    surface: t("admin.surface"),
    surfaceElevated: t("admin.surfaceElevated"),
  };

  // Simplified set of tokens for the UI
  const identityColors: (keyof ThemeColors)[] = ["primary", "accent"];
  const textTokens: (keyof ThemeColors)[] = ["textPrimary", "textMuted"];
  const layoutColors: (keyof ThemeColors)[] = ["background", "surface"];

  const currentColors = activeTab === "light" ? lightColors : darkColors;

  const safeColor = (color: string) => {
    if (!color) return "transparent";
    if (color.includes("#")) return color; // Hex
    if (color.includes("hsl")) return color; // Full hsl()
    return `hsl(${color})`; // HSL Parts
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("admin.themeColors")}</CardTitle>
            <CardDescription>{t("admin.themeColorsDesc")}</CardDescription>
          </div>
          {onTogglePreview && (
            <Button
              variant={livePreview ? "default" : "outline"}
              size="sm"
              onClick={onTogglePreview}
            >
              {livePreview ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              {livePreview ? t("admin.previewOn") : t("admin.previewOff")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "light" | "dark")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="light" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              {t("admin.lightMode")}
            </TabsTrigger>
            <TabsTrigger value="dark" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              {t("admin.darkMode")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-8 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Identity Section */}
              <div className="space-y-4">
                <div className="pb-2 border-b">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t("admin.appIdentity")}
                  </Label>
                </div>
                <div className="space-y-4">
                  {identityColors.map((key) => (
                    <ColorPicker
                      key={key}
                      label={colorLabels[key]}
                      value={currentColors[key]}
                      onChange={(v) => handleColorChange(activeTab, key, v)}
                    />
                  ))}
                </div>
              </div>

              {/* Text Section */}
              <div className="space-y-4">
                <div className="pb-2 border-b">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t("admin.textColors")}
                  </Label>
                </div>
                <div className="space-y-4">
                  {textTokens.map((key) => (
                    <ColorPicker
                      key={key}
                      label={colorLabels[key]}
                      value={currentColors[key]}
                      onChange={(v) => handleColorChange(activeTab, key, v)}
                    />
                  ))}
                </div>
              </div>

              {/* Layout Section */}
              <div className="space-y-4">
                <div className="pb-2 border-b">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t("admin.backgroundColors")}
                  </Label>
                </div>
                <div className="space-y-4">
                  {layoutColors.map((key) => (
                    <ColorPicker
                      key={key}
                      label={colorLabels[key]}
                      value={currentColors[key]}
                      onChange={(v) => handleColorChange(activeTab, key, v)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div
              className="p-6 rounded-2xl border transition-colors duration-500"
              style={{
                backgroundColor: safeColor(currentColors.background),
                borderColor: activeTab === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold uppercase tracking-wider opacity-70" style={{ color: safeColor(currentColors.textPrimary) }}>
                  {t("admin.colorPreview")}
                </h4>
                <div className="flex gap-2">
                  {[...identityColors, ...textTokens, ...layoutColors].map((key) => (
                    <div
                      key={key}
                      className="h-6 w-6 rounded-full border shadow-sm"
                      style={{ backgroundColor: safeColor(currentColors[key]) }}
                      title={colorLabels[key]}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Visual Preview */}
                <Card className="border shadow-lg overflow-hidden" style={{ backgroundColor: safeColor(currentColors.surface) }}>
                  <CardHeader className="pb-4">
                    <div className="h-2 w-12 rounded-full mb-2" style={{ backgroundColor: safeColor(currentColors.primary) }} />
                    <CardTitle className="text-lg" style={{ color: safeColor(currentColors.textPrimary) }}>Exemplo de Card</CardTitle>
                    <CardDescription style={{ color: safeColor(currentColors.textMuted) }}>
                      Este é um exemplo de como as cores serão aplicadas nos componentes dos usuários.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        style={{ backgroundColor: safeColor(currentColors.primary), color: "#fff" }}
                      >
                        {t("admin.primaryButton")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        style={{
                          borderColor: safeColor(currentColors.primary),
                          color: safeColor(currentColors.primary),
                          backgroundColor: "transparent"
                        }}
                      >
                        {t("admin.outlineButton")}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: safeColor(currentColors.accent), color: "#fff" }}
                      >
                        Badge
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: safeColor(currentColors.textMuted) }}
                      >
                        Informação secundária
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Theme Context Preview */}
                <div className="flex flex-col justify-center space-y-4">
                  <div className="p-4 rounded-xl border dashed" style={{ borderColor: safeColor(currentColors.primary) }}>
                    <p className="text-sm font-medium" style={{ color: safeColor(currentColors.textPrimary) }}>
                      As cores de fundo afetam toda a experiência do aplicativo.
                    </p>
                    <p className="text-xs mt-1" style={{ color: safeColor(currentColors.textMuted) }}>
                      O contraste entre o fundo ({colorLabels.background}) e os elementos de superfície ({colorLabels.surface}) cria a hierarquia visual.
                    </p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden"
                          style={{ borderColor: safeColor(currentColors.surface) }}
                        >
                          <div className="h-full w-full opacity-50 bg-current" style={{ color: safeColor(currentColors.primary) }} />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: safeColor(currentColors.primary) }}>
                      +12 usuários ativos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
