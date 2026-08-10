import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ShieldCheck, FileText, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/hooks/useI18n";

interface LegalDocumentSheetProps {
    type: 'privacy' | 'terms';
    trigger?: React.ReactNode;
}

export function LegalDocumentSheet({ type, trigger }: LegalDocumentSheetProps) {
    const { t, language } = useI18n();
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const documentKey = type === 'privacy' ? 'privacy_policy' : 'terms_of_use';
    const title = type === 'privacy' ? t('legal.privacyPolicy') : t('legal.termsOfUse');

    useEffect(() => {
        if (!isOpen || content) return;

        async function fetchContent() {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("app_settings")
                    .select("value")
                    .eq("key", documentKey)
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
    }, [isOpen, documentKey, content]);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="w-full justify-between">
                        <span>{title}</span>
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] rounded-t-2xl p-0 overflow-hidden">
                <div className="flex flex-col h-full bg-background">
                    <SheetHeader className="p-6 border-b shrink-0 h-auto">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                {type === 'privacy' ? <ShieldCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            </div>
                            <div className="text-left">
                                <SheetTitle>{title}</SheetTitle>
                                <SheetDescription>
                                    {t('legal.lastUpdate')}: {new Date().toLocaleDateString(language)}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 p-6">
                        <div className="max-w-screen-md mx-auto">
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                {loading ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                        <div className="flex items-center justify-center py-10">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                        </div>
                                    </div>
                                ) : (
                                    <ReactMarkdown>{content?.replace(/\\n/g, '\n') || t('legal.contentUnavailable')}</ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t bg-muted/20 shrink-0">
                        <Button onClick={() => setIsOpen(false)} className="w-full">
                            {t('legal.understood')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
