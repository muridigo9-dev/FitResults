import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Save, RotateCcw, Image, Eye, Loader2, Sun, Moon } from "lucide-react";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { useBrandSettingsAdmin, useLogoUpload } from "@/hooks/useBrandSettingsAdmin";
import { useI18n } from "@/hooks/useI18n";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { hexToHsl } from "@/hooks/useBranding";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";

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

const defaultLightColors: ThemeColors = {
  primary: "168 76% 42%",
  secondary: "35 30% 96%",
  tertiary: "200 70% 50%",
  quaternary: "260 50% 55%",
  accent: "12 80% 62%",
  textPrimary: "220 15% 15%",
  textSecondary: "220 10% 45%",
  textMuted: "220 10% 60%",
  background: "40 20% 99%",
  surface: "0 0% 100%",
  surfaceElevated: "0 0% 100%",
};

const defaultDarkColors: ThemeColors = {
  primary: "168 70% 50%",
  secondary: "220 15% 15%",
  tertiary: "200 65% 55%",
  quaternary: "260 45% 60%",
  accent: "12 75% 58%",
  textPrimary: "40 20% 95%",
  textSecondary: "220 10% 70%",
  textMuted: "220 10% 55%",
  background: "220 15% 8%",
  surface: "220 15% 12%",
  surfaceElevated: "220 15% 15%",
};

export default function AdminBranding() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { brand, isLoading, updateBrand, isUpdating } = useBrandSettingsAdmin();
  const { uploadLogo, isUploading } = useLogoUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    appName: "",
    logoUrl: "",
    faviconUrl: "",
    supportEmail: "",
    appUrl: typeof window !== "undefined" ? window.location.origin : "",
    tagline: "",
    fontFamily: "Plus Jakarta Sans",
    fontBaseSize: 16,
    landingPageTheme: "light" as "light" | "dark",
    seoTitle: "",
    seoDescription: "",
    seoAuthor: "",
    seoKeywords: "",
    ogImageUrl: "",
  });

  const [lightColors, setLightColors] = useState<ThemeColors>(defaultLightColors);
  const [darkColors, setDarkColors] = useState<ThemeColors>(defaultDarkColors);
  const [livePreview, setLivePreview] = useState(true);

  // Load existing brand settings
  useEffect(() => {
    if (brand) {
      setFormData({
        appName: brand.app_name || "",
        logoUrl: brand.logo_url || "",
        faviconUrl: brand.favicon_url || "",
        supportEmail: brand.support_email || "",
        appUrl: brand.app_url || window.location.origin,
        tagline: brand.tagline || "",
        fontFamily: brand.font_family || "Plus Jakarta Sans",
        fontBaseSize: brand.font_base_size || 16,
        landingPageTheme: (brand.landing_page_theme as "light" | "dark") || "light",
        seoTitle: brand.seo_title || "",
        seoDescription: brand.seo_description || "",
        seoAuthor: brand.seo_author || "",
        seoKeywords: brand.seo_keywords || "",
        ogImageUrl: brand.og_image_url || "",
      });

      setLightColors({
        primary: brand.primary_color || defaultLightColors.primary,
        secondary: brand.secondary_color || defaultLightColors.secondary,
        tertiary: brand.tertiary_color || defaultLightColors.tertiary,
        quaternary: brand.quaternary_color || defaultLightColors.quaternary,
        accent: brand.accent_color || defaultLightColors.accent,
        textPrimary: brand.text_primary || defaultLightColors.textPrimary,
        textSecondary: brand.text_secondary || defaultLightColors.textSecondary,
        textMuted: brand.text_muted || defaultLightColors.textMuted,
        background: brand.light_background || defaultLightColors.background,
        surface: brand.light_surface || defaultLightColors.surface,
        surfaceElevated: brand.light_surface_elevated || defaultLightColors.surfaceElevated,
      });

      setDarkColors({
        primary: brand.dark_primary_color || defaultDarkColors.primary,
        secondary: brand.dark_secondary_color || defaultDarkColors.secondary,
        tertiary: brand.dark_tertiary_color || defaultDarkColors.tertiary,
        quaternary: brand.dark_quaternary_color || defaultDarkColors.quaternary,
        accent: brand.dark_accent_color || defaultDarkColors.accent,
        textPrimary: brand.dark_text_primary || defaultDarkColors.textPrimary,
        textSecondary: brand.dark_text_secondary || defaultDarkColors.textSecondary,
        textMuted: brand.dark_text_muted || defaultDarkColors.textMuted,
        background: brand.dark_background || defaultDarkColors.background,
        surface: brand.dark_surface || defaultDarkColors.surface,
        surfaceElevated: brand.dark_surface_elevated || defaultDarkColors.surfaceElevated,
      });
    }
  }, [brand]);

  const { isDarkMode } = useBrandingContext();

  // Live preview
  useEffect(() => {
    const root = document.documentElement;
    if (!livePreview) {
      const props = [
        "--primary", "--secondary", "--tertiary", "--quaternary", "--accent",
        "--text-primary", "--text-secondary", "--text-muted",
        "--background", "--surface", "--surface-elevated",
        "--card", "--card-elevated"
      ];
      props.forEach(p => root.style.removeProperty(p));
      return;
    }

    const colors = isDarkMode ? darkColors : lightColors;

    // Helper to set variable ensuring HSL format
    const setVar = (name: string, value: string) => {
      root.style.setProperty(name, hexToHsl(value));
    };

    setVar("--primary", colors.primary);
    setVar("--secondary", colors.secondary);
    setVar("--tertiary", colors.tertiary);
    setVar("--quaternary", colors.quaternary);
    setVar("--accent", colors.accent);
    setVar("--text-primary", colors.textPrimary);
    setVar("--text-secondary", colors.textSecondary);
    setVar("--text-muted", colors.textMuted);
    setVar("--background", colors.background);
    setVar("--surface", colors.surface);
    setVar("--surface-elevated", colors.surfaceElevated);

    // Also set derived tokens
    setVar("--card", colors.surface);
    setVar("--card-elevated", colors.surfaceElevated);
    setVar("--foreground", colors.textPrimary);
    setVar("--popover", colors.surface);
    setVar("--popover-foreground", colors.textPrimary);

    return () => {
      const props = [
        "--primary", "--secondary", "--tertiary", "--quaternary", "--accent",
        "--text-primary", "--text-secondary", "--text-muted",
        "--background", "--surface", "--surface-elevated",
        "--card", "--card-elevated", "--foreground", "--popover", "--popover-foreground"
      ];
      props.forEach(p => root.style.removeProperty(p));
    };
  }, [lightColors, darkColors, livePreview, isDarkMode]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error(t("admin.invalidImageType"));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("admin.imageTooLarge"));
      return;
    }

    try {
      const publicUrl = await uploadLogo(file);
      setFormData(prev => ({ ...prev, logoUrl: publicUrl }));
      toast.success(t("admin.logoUploaded"));
    } catch (error) {
      console.error("Error uploading logo:", error);
    }
  };

  const handleSave = async () => {
    updateBrand({
      app_name: formData.appName,
      logo_url: formData.logoUrl || null,
      favicon_url: formData.faviconUrl || null,
      support_email: formData.supportEmail,
      app_url: formData.appUrl,
      tagline: formData.tagline,
      font_family: formData.fontFamily,
      font_base_size: formData.fontBaseSize,
      landing_page_theme: formData.landingPageTheme,
      seo_title: formData.seoTitle || null,
      seo_description: formData.seoDescription || null,
      seo_author: formData.seoAuthor || null,
      seo_keywords: formData.seoKeywords || null,
      og_image_url: formData.ogImageUrl || null,
      // Light colors
      primary_color: lightColors.primary,
      secondary_color: lightColors.secondary,
      tertiary_color: lightColors.tertiary,
      quaternary_color: lightColors.quaternary,
      accent_color: lightColors.accent,
      text_primary: lightColors.textPrimary,
      text_secondary: lightColors.textSecondary,
      text_muted: lightColors.textMuted,
      light_background: lightColors.background,
      light_surface: lightColors.surface,
      light_surface_elevated: lightColors.surfaceElevated,
      // Dark colors
      dark_primary_color: darkColors.primary,
      dark_secondary_color: darkColors.secondary,
      dark_tertiary_color: darkColors.tertiary,
      dark_quaternary_color: darkColors.quaternary,
      dark_accent_color: darkColors.accent,
      dark_text_primary: darkColors.textPrimary,
      dark_text_secondary: darkColors.textSecondary,
      dark_text_muted: darkColors.textMuted,
      dark_background: darkColors.background,
      dark_surface: darkColors.surface,
      dark_surface_elevated: darkColors.surfaceElevated,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["branding"] });
        toast.success(t("admin.brandingSaved"));
      }
    });
  };

  const handleReset = () => {
    setLightColors(defaultLightColors);
    setDarkColors(defaultDarkColors);
    toast.info(t("admin.valuesRestored"));
  };

  const hslToColor = (hsl: string) => `hsl(${hsl})`;

  if (isLoading) {
    return (
      <AdminLayout title={t("admin.branding")}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={t("admin.brandingSettings")}>
      <div className="max-w-4xl space-y-6 pb-20">
        {/* Live Preview Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{t("admin.livePreview")}</p>
              <p className="text-sm text-muted-foreground">
                {t("admin.livePreviewDesc")}
              </p>
            </div>
          </div>
          <Button
            variant={livePreview ? "default" : "outline"}
            size="sm"
            onClick={() => setLivePreview(!livePreview)}
          >
            {livePreview ? t("states.active") : t("states.inactive")}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t("admin.general") || "Geral"}</TabsTrigger>
            <TabsTrigger value="colors">{t("admin.colors") || "Cores"}</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  {t("admin.appIdentity")}
                </CardTitle>
                <CardDescription>
                  {t("admin.appIdentityDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName">{t("admin.appName")}</Label>
                    <Input
                      id="appName"
                      value={formData.appName}
                      onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
                      placeholder="FitLife"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">{t("admin.tagline")}</Label>
                    <Input
                      id="tagline"
                      value={formData.tagline}
                      onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder={t("admin.taglinePlaceholder")}
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>{t("admin.logo")}</Label>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <Input
                          value={formData.logoUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                          placeholder="https://..."
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("admin.logoHint")}
                      </p>
                    </div>

                    {/* Logo Preview */}
                    <div className="h-16 w-16 rounded-xl border border-border flex items-center justify-center bg-muted shrink-0">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo"
                          className="h-12 w-12 object-contain rounded-lg"
                        />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: hslToColor(lightColors.primary) }}
                        >
                          {formData.appName?.charAt(0) || "A"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Support & App URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">{t("admin.supportEmail")}</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, supportEmail: e.target.value }))}
                      placeholder="suporte@seudominio.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("admin.supportEmailHint")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appUrl">{t("admin.appUrl")}</Label>
                    <Input
                      id="appUrl"
                      value={formData.appUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, appUrl: e.target.value }))}
                      placeholder="https://seuapp.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("admin.appUrlHint")}
                    </p>
                  </div>
                </div>

                {/* Landing Page Theme */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">{t("admin.landingPageTheme")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.landingPageThemeDesc")}
                      </p>
                    </div>
                    <div className="flex p-1 bg-muted rounded-lg border gap-1">
                      <Button
                        type="button"
                        variant={formData.landingPageTheme === 'light' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 gap-2 px-3"
                        onClick={() => setFormData(prev => ({ ...prev, landingPageTheme: 'light' }))}
                      >
                        <Sun className={`h-4 w-4 ${formData.landingPageTheme === 'light' ? 'animate-pulse' : ''}`} />
                        {t("admin.lightMode")}
                      </Button>
                      <Button
                        type="button"
                        variant={formData.landingPageTheme === 'dark' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 gap-2 px-3"
                        onClick={() => setFormData(prev => ({ ...prev, landingPageTheme: 'dark' }))}
                      >
                        <Moon className={`h-4 w-4 ${formData.landingPageTheme === 'dark' ? 'animate-pulse' : ''}`} />
                        {t("admin.darkMode")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            {/* Theme Colors - Light & Dark */}
            <ThemeEditor
              lightColors={lightColors}
              darkColors={darkColors}
              onLightChange={setLightColors}
              onDarkChange={setDarkColors}
              livePreview={livePreview}
              onTogglePreview={() => setLivePreview(!livePreview)}
            />
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.seoSettings")}</CardTitle>
                <CardDescription>
                  {t("admin.seoSettingsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">{t("admin.seoTitle")}</Label>
                  <Input
                    id="seoTitle"
                    placeholder={`Ex: ${brand?.app_name || "FitResults"} - Sua jornada fitness`}
                    value={formData.seoTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoDescription">{t("admin.seoDescription")}</Label>
                  <Input
                    id="seoDescription"
                    placeholder="Uma breve descrição sobre sua plataforma..."
                    value={formData.seoDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoAuthor">{t("admin.seoAuthor")}</Label>
                  <Input
                    id="seoAuthor"
                    placeholder={`Ex: Empresa ${brand?.app_name || "FitResults"}`}
                    value={formData.seoAuthor}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoAuthor: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoKeywords">{t("admin.seoKeywords")}</Label>
                  <Input
                    id="seoKeywords"
                    placeholder="fitness, academia, dieta, saude"
                    value={formData.seoKeywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, seoKeywords: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ogImageUrl">{t("admin.ogImageUrl")}</Label>
                  <Input
                    id="ogImageUrl"
                    placeholder="https://exemplo.com/imagem.png"
                    value={formData.ogImageUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, ogImageUrl: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("actions.restoreDefault")}
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t("actions.save")}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
