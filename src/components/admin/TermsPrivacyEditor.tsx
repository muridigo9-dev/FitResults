import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, FileText, ShieldCheck, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export function TermsPrivacyEditor() {
    const [privacyPolicy, setPrivacyPolicy] = useState("");
    const [termsOfUse, setTermsOfUse] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const { data, error } = await supabase
                    .from("app_settings")
                    .select("key, value")
                    .in("key", ["privacy_policy", "terms_of_use"]);

                if (error) throw error;

                data?.forEach((setting) => {
                    if (setting.key === "privacy_policy") setPrivacyPolicy(setting.value);
                    if (setting.key === "terms_of_use") setTermsOfUse(setting.value);
                });
            } catch (err) {
                console.error("Error fetching settings:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleSave = async (key: string, value: string) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("app_settings")
                .update({ value, updated_at: new Date().toISOString() })
                .eq("key", key);

            if (error) throw error;
            toast.success("Documento atualizado com sucesso!");
        } catch (err) {
            console.error("Error saving setting:", err);
            toast.error("Erro ao salvar documento.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Privacy Policy Editor */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <div>
                                <CardTitle>Política de Privacidade</CardTitle>
                                <CardDescription>
                                    Edite o conteúdo da política de privacidade (Markdown suportado)
                                </CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/privacy" target="_blank">
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar Pública
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={privacyPolicy}
                        onChange={(e) => setPrivacyPolicy(e.target.value)}
                        placeholder="Digite o conteúdo em Markdown..."
                        className="min-h-[300px] font-mono text-sm"
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={() => handleSave("privacy_policy", privacyPolicy)}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Política
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Terms of Use Editor */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                                <CardTitle>Termos de Uso</CardTitle>
                                <CardDescription>
                                    Edite os termos de uso do aplicativo (Markdown suportado)
                                </CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/terms" target="_blank">
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar Pública
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={termsOfUse}
                        onChange={(e) => setTermsOfUse(e.target.value)}
                        placeholder="Digite o conteúdo em Markdown..."
                        className="min-h-[300px] font-mono text-sm"
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={() => handleSave("terms_of_use", termsOfUse)}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Termos
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
