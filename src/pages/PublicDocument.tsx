import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Dumbbell, ChevronLeft, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranding } from "@/hooks/useBranding";

export default function PublicDocument() {
    const { branding } = useBranding();
    const [content, setContent] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const isPrivacy = location.pathname.includes("privacy");
    const key = isPrivacy ? "privacy_policy" : "terms_of_use";
    const defaultTitle = isPrivacy ? "Política de Privacidade" : "Termos de Uso";

    useEffect(() => {
        async function fetchContent() {
            try {
                const { data, error } = await supabase
                    .from("app_settings")
                    .select("value")
                    .eq("key", key)
                    .single();

                if (error) throw error;
                if (data) setContent(data.value);
            } catch (err) {
                console.error("Error fetching document:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchContent();
        setTitle(defaultTitle);
        window.scrollTo(0, 0);
    }, [key, defaultTitle]);

    return (
        <div className="min-h-screen bg-background">
            {/* Simple Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
                                {branding.logoUrl ? (
                                    <img src={branding.logoUrl} alt={branding.appName} className="h-full w-full object-contain" />
                                ) : (
                                    <Dumbbell className="h-4 w-4 text-primary-foreground" />
                                )}
                            </div>
                            <span className="font-bold text-lg text-foreground">{branding.appName}</span>
                        </Link>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Voltar
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="mb-10 text-center">
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-4">
                        {isPrivacy ? <ShieldCheck className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">{title}</h1>
                    <p className="text-muted-foreground mt-2">
                        Última atualização: {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>

                <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0 prose prose-slate dark:prose-invert max-w-none">
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-6 w-1/2 mt-8" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ) : (
                            <div className="bg-card border rounded-2xl p-6 md:p-10 shadow-sm">
                                <ReactMarkdown>{content?.replace(/\\n/g, '\n') || "Documento não encontrado."}</ReactMarkdown>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            <footer className="py-12 border-t mt-20 bg-muted/30">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} {branding.appName}. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}

// Helper component for the view
import { Card, CardContent } from "@/components/ui/card";
