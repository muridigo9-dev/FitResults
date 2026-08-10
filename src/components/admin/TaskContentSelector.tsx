import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export type ContentType = 'dish' | 'diet_plan' | 'workout' | 'exercise' | 'none';

interface TaskContentSelectorProps {
    taskType: 'diet' | 'workout' | 'habit' | 'checkin' | 'custom' | 'water';
    value: {
        dish_id?: string;
        diet_plan_id?: string;
        workout_id?: string;
        exercise_id?: string;
    };
    onChange: (updates: {
        dish_id?: string;
        diet_plan_id?: string;
        workout_id?: string;
        exercise_id?: string;
    }) => void;
}

export function TaskContentSelector({ taskType, value, onChange }: TaskContentSelectorProps) {
    const [contentType, setContentType] = useState<ContentType>('none');
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItemName, setSelectedItemName] = useState("");

    const debouncedSearch = useDebounce(search, 300);

    // Initialize content type based on current value
    useEffect(() => {
        if (value.dish_id) {
            setContentType('dish');
            fetchItemName('dishes', value.dish_id);
        } else if (value.diet_plan_id) {
            setContentType('diet_plan');
            fetchItemName('diet_plans', value.diet_plan_id);
        } else if (value.workout_id) {
            setContentType('workout');
            fetchItemName('workouts', value.workout_id);
        } else if (value.exercise_id) {
            setContentType('exercise');
            fetchItemName('exercises', value.exercise_id);
        }
    }, [value]);

    const fetchItemName = async (table: string, id: string) => {
        try {
            // "title" exists on dishes, workouts, diet_plans. "name" on exercises.
            // We'll trust the type safety isn't perfect here and cast strictly for logic
            const tableWithTitle = ['dishes', 'workouts', 'diet_plans'].includes(table);
            const column = tableWithTitle ? 'title' : 'name';

            // Supabase client types might complain if we dynamic select, but runtime works.
            const query = supabase.from(table as any)
                .select(column)
                .eq('id', id)
                .maybeSingle();

            const { data } = await query;

            if (data) {
                setSelectedItemName((data as any)[column]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Search effect
    useEffect(() => {
        if (!open || contentType === 'none') return;

        // Initial fetch to show recent items if search is empty
        searchItems(debouncedSearch);
    }, [debouncedSearch, open, contentType]);

    const searchItems = async (query: string) => {
        setLoading(true);
        try {
            let queryBuilder;
            let searchField = 'name';

            switch (contentType) {
                case 'dish':
                    queryBuilder = supabase.from('dishes').select('id, title, calories').eq('is_active', true);
                    searchField = 'title';
                    break;
                case 'diet_plan':
                    queryBuilder = supabase.from('diet_plans').select('id, title').eq('is_active', true);
                    searchField = 'title';
                    break;
                case 'workout':
                    queryBuilder = supabase.from('workouts').select('id, title').eq('is_active', true);
                    searchField = 'title';
                    break;
                case 'exercise':
                    queryBuilder = supabase.from('exercises').select('id, name').eq('is_active', true);
                    searchField = 'name';
                    break;
                default:
                    setResults([]);
                    setLoading(false);
                    return;
            }

            if (query) {
                queryBuilder = queryBuilder.ilike(searchField, `%${query}%`);
            }

            const { data, error } = await queryBuilder.limit(20);

            if (error) {
                console.error("Search error:", error);
                setResults([]);
            } else {
                setResults(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleContentTypeChange = (type: ContentType) => {
        setContentType(type);
        setSearch("");
        setResults([]);

        // Clear all IDs when type changes
        onChange({
            dish_id: undefined,
            diet_plan_id: undefined,
            workout_id: undefined,
            exercise_id: undefined
        });
    };

    const handleSelect = (item: any) => {
        const changes: any = {
            dish_id: undefined,
            diet_plan_id: undefined,
            workout_id: undefined,
            exercise_id: undefined
        };

        if (contentType === 'dish') changes.dish_id = item.id;
        if (contentType === 'diet_plan') changes.diet_plan_id = item.id;
        if (contentType === 'workout') changes.workout_id = item.id;
        if (contentType === 'exercise') changes.exercise_id = item.id;

        onChange(changes);
        setSelectedItemName(item.name || item.title);
        setOpen(false);
    };

    // Determine allowed content types based on task type
    const allowedTypes: { value: ContentType; label: string }[] = useMemo(() => {
        const options = [{ value: 'none', label: 'Nenhum' }] as { value: ContentType; label: string }[];

        if (taskType === 'diet') {
            options.push({ value: 'dish', label: 'Prato' });
            options.push({ value: 'diet_plan', label: 'Plano Alimentar' });
        } else if (taskType === 'workout') {
            options.push({ value: 'exercise', label: 'Exercício' });
            options.push({ value: 'workout', label: 'Plano de Treino' });
        }

        return options;
    }, [taskType]);

    if (allowedTypes.length <= 1) return null;

    return (
        <div className="flex gap-2 items-center">
            <Select value={contentType} onValueChange={(v) => handleContentTypeChange(v as ContentType)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Vincular..." />
                </SelectTrigger>
                <SelectContent>
                    {allowedTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {contentType !== 'none' && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="flex-1 justify-between h-8 text-xs truncate"
                        >
                            {selectedItemName ? selectedItemName : "Buscar..."}
                            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[250px]" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder={`Buscar ${contentType === 'dish' ? 'prato' : contentType === 'exercise' ? 'exercício' : '...'}...`}
                                value={search}
                                onValueChange={setSearch}
                            />
                            <CommandList>
                                {loading && <div className="py-6 text-center text-xs text-muted-foreground">Carregando...</div>}
                                {!loading && results.length === 0 && <CommandEmpty>Nenhum resultado.</CommandEmpty>}
                                <CommandGroup>
                                    {!loading && results.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.id} // We use ID as value for uniqueness, but we handle selection manually
                                            onSelect={() => handleSelect(item)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    (
                                                        (contentType === 'dish' && value.dish_id === item.id) ||
                                                        (contentType === 'diet_plan' && value.diet_plan_id === item.id) ||
                                                        (contentType === 'workout' && value.workout_id === item.id) ||
                                                        (contentType === 'exercise' && value.exercise_id === item.id)
                                                    ) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{item.name || item.title}</span>
                                                {item.calories && <span className="text-[10px] text-muted-foreground">{item.calories} kcal</span>}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
