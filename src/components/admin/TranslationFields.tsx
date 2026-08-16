import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TranslatableField {
    /** Base field name in camelCase, e.g. "title" — the inputs edit titleEn / titleEs. */
    key: string;
    /** Label shown to the admin, in pt-BR like the rest of the panel. */
    label: string;
    /** Render a textarea instead of a single-line input. */
    multiline?: boolean;
    placeholderEn?: string;
    placeholderEs?: string;
}

export interface TranslationFieldsProps {
    fields: TranslatableField[];
    /** Current values, keyed `${field.key}En` / `${field.key}Es`. */
    values: Record<string, string | undefined>;
    onChange: (valueKey: string, value: string) => void;
    className?: string;
}

const suffixes = [
    { suffix: "En", tag: "EN" },
    { suffix: "Es", tag: "ES" },
] as const;

/**
 * Optional English and Spanish versions of an admin-authored content field.
 *
 * The admin panel itself stays in pt-BR — this is about what *students* read.
 * A blank translation is stored as null so the app falls back to the pt-BR
 * text, which means a half-filled form still renders correctly for everyone.
 */
export function TranslationFields({ fields, values, onChange, className }: TranslationFieldsProps) {
    return (
        <div className={cn("space-y-4 p-5 rounded-xl bg-muted/30 border border-border/50", className)}>
            <div className="flex flex-col gap-1">
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <Languages className="h-4 w-4 text-primary" />
                    Traduções
                </Label>
                <p className="text-xs text-muted-foreground">
                    Opcional. Em branco, o aluno que usa o app em inglês ou espanhol vê o texto em português.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field) =>
                    suffixes.map(({ suffix, tag }) => {
                        const valueKey = `${field.key}${suffix}`;
                        const inputId = `translation-${valueKey}`;
                        const placeholder = suffix === "En" ? field.placeholderEn : field.placeholderEs;
                        const Control = field.multiline ? Textarea : Input;

                        return (
                            <div key={valueKey} className="space-y-2">
                                <Label htmlFor={inputId} className="text-xs font-semibold text-muted-foreground">
                                    {field.label} ({tag})
                                </Label>
                                <Control
                                    id={inputId}
                                    value={values[valueKey] || ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                                        onChange(valueKey, e.target.value)
                                    }
                                    placeholder={placeholder}
                                    className={cn(
                                        "bg-background border-border/50",
                                        field.multiline ? "min-h-[90px] resize-none" : "h-11",
                                    )}
                                />
                            </div>
                        );
                    }),
                )}
            </div>
        </div>
    );
}
