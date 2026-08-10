import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Save, RotateCcw, Image, Eye, Loader2 } from "lucide-react";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { useAcademyBranding, useAcademyLogoUpload } from "@/hooks/useAcademyBranding";
import { useI18n } from "@/hooks/useI18n";
import { useBrandingContext } from "@/contexts/BrandingContext";
import { useAcademy } from "@/contexts/AcademyContext";
import { hexToHsl } from "@/hooks/useBranding";

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

export default function AcademyBranding() {
    const { t } = useI18n();
    const { currentAcademy } = useAcademy();
    const { branding, updateBranding, isUpdating } = useAcademyBranding();
    const { uploadLogo, isUploading } = useAcademyLogoUpload();
    const { isDarkMode } = useBrandingContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        logoUrl: "",
        fontFamily: "Plus Jakarta Sans",
        fontBaseSize: 16,
    });

    const [lightColors, setLightColors] = useState<ThemeColors>(defaultLightColors);
    const [darkColors, setDarkColors] = useState<ThemeColors>(defaultDarkColors);
    const [livePreview, setLivePreview] = useState(true);

    // Load existing branding settings
    useEffect(() => {
        if (branding) {
            setFormData({
                logoUrl: branding.logo_url || "",
                fontFamily: branding.font_family || "Plus Jakarta Sans",
                fontBaseSize: branding.font_base_size || 16,
            });

            setLightColors({
                primary: branding.primary_color || defaultLightColors.primary,
                secondary: branding.secondary_color || defaultLightColors.secondary,
                tertiary: branding.tertiary_color || defaultLightColors.tertiary,
                quaternary: branding.quaternary_color || defaultLightColors.quaternary,
                accent: branding.accent_color || defaultLightColors.accent,
                textPrimary: branding.text_primary || defaultLightColors.textPrimary,
                textSecondary: branding.text_secondary || defaultLightColors.textSecondary,
                textMuted: branding.text_muted || defaultLightColors.textMuted,
                background: branding.light_background || defaultLightColors.background,
                surface: branding.light_surface || defaultLightColors.surface,
                surfaceElevated: branding.light_surface_elevated || defaultLightColors.surfaceElevated,
            });

            setDarkColors({
                primary: branding.dark_primary_color || defaultDarkColors.primary,
                secondary: branding.dark_secondary_color || defaultDarkColors.secondary,
                tertiary: branding.dark_tertiary_color || defaultDarkColors.tertiary,
                quaternary: branding.dark_quaternary_color || defaultDarkColors.quaternary,
                accent: branding.dark_accent_color || defaultDarkColors.accent,
                textPrimary: branding.dark_text_primary || defaultDarkColors.textPrimary,
                textSecondary: branding.dark_text_secondary || defaultDarkColors.textSecondary,
                textMuted: branding.dark_text_muted || defaultDarkColors.textMuted,
                background: branding.dark_background || defaultDarkColors.background,
                surface: branding.dark_surface || defaultDarkColors.surface,
                surfaceElevated: branding.dark_surface_elevated || defaultDarkColors.surfaceElevated,
            });
        }
    }, [branding]);

    // Live preview effect
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

        try {
            const publicUrl = await uploadLogo(file);
            setFormData(prev => ({ ...prev, logoUrl: publicUrl }));
            toast.success("Logo carregada!");
        } catch (error) {
            console.error("Error uploading logo:", error);
        }
    };

    const handleSave = () => {
        updateBranding({
            logo_url: formData.logoUrl,
            font_family: formData.fontFamily,
            font_base_size: formData.fontBaseSize,
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
        });
    };

    const handleReset = () => {
        setLightColors(defaultLightColors);
        setDarkColors(defaultDarkColors);
        toast.info("Cores restauradas para o padrão.");
    };

    const hslToColor = (hsl: string) => `hsl(${hsl})`;

    return (
        <AppLayout header={{ title: "Marca da Academia", showBack: true }}>
            <div className="max-w-4xl space-y-6 pb-20">
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <Eye className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-bold">Previsualização em Tempo Real</p>
                            <p className="text-xs text-muted-foreground">
                                As alterações são aplicadas instantaneamente na interface
                            </p>
                        </div>
                    </div>
                    <Button
                        variant={livePreview ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLivePreview(!livePreview)}
                        className="rounded-full"
                    >
                        {livePreview ? "Ativo" : "Inativo"}
                    </Button>
                </div>

                <Card className="rounded-[2rem] border-none shadow-premium overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Image className="h-5 w-5 text-primary" />
                            Identidade da Academia
                        </CardTitle>
                        <CardDescription>
                            Configurações básicas de marca para {currentAcademy?.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>Logo da Academia</Label>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1">
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.logoUrl}
                                            onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                                            placeholder="https://..."
                                            className="rounded-xl"
                                        />
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="rounded-xl shrink-0"
                                        >
                                            {isUploading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="h-16 w-32 rounded-xl border border-border/50 flex items-center justify-center bg-muted/20 shrink-0 overflow-hidden">
                                    {formData.logoUrl ? (
                                        <img
                                            src={formData.logoUrl}
                                            alt="Logo"
                                            className="h-full w-full object-contain p-2"
                                        />
                                    ) : (
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Sem Logo</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <ThemeEditor
                    lightColors={lightColors}
                    darkColors={darkColors}
                    onLightChange={setLightColors}
                    onDarkChange={setDarkColors}
                    livePreview={livePreview}
                    onTogglePreview={() => setLivePreview(!livePreview)}
                />

                <div className="flex gap-3 justify-end sticky bottom-6 z-10 bg-background/80 backdrop-blur-md p-4 rounded-3xl border shadow-lg">
                    <Button variant="ghost" onClick={handleReset} className="rounded-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar Padrão
                    </Button>
                    <Button onClick={handleSave} disabled={isUpdating} className="rounded-full px-8">
                        {isUpdating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar Alterações
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
