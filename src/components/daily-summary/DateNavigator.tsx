import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, isSameDay, isSameWeek, isSameMonth, isSameYear, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDateLocale } from "@/lib/dateLocale";
import { useI18n } from "@/hooks/useI18n";

interface DateNavigatorProps {
    date: Date;
    onChange: (date: Date) => void;
    period?: "day" | "week" | "month" | "year";
}

export function DateNavigator({ date, onChange, period = "day" }: DateNavigatorProps) {
    const dateLocale = useDateLocale();
    const { t } = useI18n();
    const today = new Date();

    const isCurrent = () => {
        if (period === "day") return isSameDay(date, today);
        if (period === "week") return isSameWeek(date, today, { weekStartsOn: 1 });
        if (period === "month") return isSameMonth(date, today);
        if (period === "year") return isSameYear(date, today);
        return false;
    };

    const getLabel = () => {
        if (period === "day") return format(date, "EEEE", { locale: dateLocale });
        if (period === "week") {
            const start = startOfWeek(date, { weekStartsOn: 1 });
            const end = endOfWeek(date, { weekStartsOn: 1 });
            return t("summary.weekOf", { start: format(start, "d MMM", { locale: dateLocale }), end: format(end, "d MMM", { locale: dateLocale }) });
        }
        if (period === "month") return t("summary.monthly");
        if (period === "year") return t("summary.yearly");
        return "";
    };

    const getTitle = () => {
        if (period === "day") return format(date, "d MMMM", { locale: dateLocale });
        if (period === "week") return format(date, "MMMM yyyy", { locale: dateLocale });
        if (period === "month") return format(date, "MMMM yyyy", { locale: dateLocale });
        if (period === "year") return format(date, "yyyy", { locale: dateLocale });
        return "";
    };

    const handlePrev = () => {
        if (period === "day") onChange(subDays(date, 1));
        else if (period === "week") onChange(subWeeks(date, 1));
        else if (period === "month") onChange(subMonths(date, 1));
        else if (period === "year") onChange(subYears(date, 1));
    };

    const handleNext = () => {
        if (period === "day") onChange(addDays(date, 1));
        else if (period === "week") onChange(addWeeks(date, 1));
        else if (period === "month") onChange(addMonths(date, 1));
        else if (period === "year") onChange(addYears(date, 1));
    };

    return (
        <div className="flex flex-col gap-1 py-4 bg-transparent">
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5 truncate">
                        {getLabel()}
                    </span>
                    <div className="flex items-center gap-2 overflow-hidden">
                        <h2 className="text-lg sm:text-2xl font-black capitalize tracking-tight truncate leading-tight">
                            {getTitle()}
                        </h2>
                        {isCurrent() && (
                            <span className="shrink-0 text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase font-black tracking-widest whitespace-nowrap">
                                {period === "day" ? t("checkin.today") : period === "week" ? t("summary.thisWeek") : period === "month" ? t("summary.thisMonth") : t("summary.thisYear")}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrev}
                        className="h-8 w-8 rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNext}
                        className="h-8 w-8 rounded-full"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                            >
                                <CalendarIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && onChange(d)}
                                initialFocus
                                locale={dateLocale}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
    );
}
