import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, setMonth, setYear, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const [view, setView] = React.useState<"days" | "months" | "years">("days");

  // Use props.month or a local state to track the visible month
  const [navDate, setNavDate] = React.useState<Date>(() => {
    // Safely extract a date for initial navigation
    if (props.month instanceof Date) return props.month;
    if (props.defaultMonth instanceof Date) return props.defaultMonth;
    if (props.selected instanceof Date) return props.selected;
    return new Date();
  });

  // Sync navDate when selection changes externally (optional but good)
  React.useEffect(() => {
    if (props.selected instanceof Date) {
      setNavDate(props.selected);
    }
  }, [props.selected]);

  // Handle year selection range (only up to current year for birth dates)
  const currentYear = getYear(new Date());
  const years = Array.from({ length: 111 }, (_, i) => currentYear - 110 + i); // 110 years back up to today

  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const handleYearSelect = (year: number) => {
    const newDate = setYear(navDate, year);
    setNavDate(newDate);
    setView("months");
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(navDate, monthIndex);
    setNavDate(newDate);
    setView("days");
  };

  return (
    <div className={cn("relative p-3", className)}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
      {view === "days" && (
        <DayPicker
          showOutsideDays={showOutsideDays}
          month={navDate}
          onMonthChange={setNavDate}
          className="p-0"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center gap-1",
            caption_label: "hidden", // We'll use our custom header
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
            day_range_end: "day-range-end",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside:
              "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
            ...classNames,
          }}
          components={{
            IconLeft: () => <ChevronLeft className="h-4 w-4" />,
            IconRight: () => <ChevronRight className="h-4 w-4" />,
            CaptionLabel: () => (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setView("months")}
                  className="hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md text-sm font-medium transition-colors uppercase"
                >
                  {format(navDate, "MMMM", { locale: props.locale || ptBR })}
                </button>
                <button
                  type="button"
                  onClick={() => setView("years")}
                  className="hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md text-sm font-medium transition-colors"
                >
                  {format(navDate, "yyyy")}
                </button>
              </div>
            )
          }}
          {...props}
        />
      )}

      {view === "months" && (
        <div className="w-[280px] space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView("years")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {format(navDate, "yyyy")}
            </button>
            <button
              onClick={() => setView("days")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, i) => {
              const isFutureMonth = getYear(navDate) === currentYear && i > getMonth(new Date());
              return (
                <button
                  key={month}
                  onClick={() => !isFutureMonth && handleMonthSelect(i)}
                  disabled={isFutureMonth}
                  className={cn(
                    buttonVariants({ variant: getMonth(navDate) === i ? "default" : "ghost" }),
                    "h-12 w-full text-sm font-medium",
                    isFutureMonth && "opacity-20 cursor-not-allowed"
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "years" && (
        <div className="w-[280px] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Selecionar Ano</span>
            <button
              onClick={() => setView("days")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {years.reverse().map((year) => (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={cn(
                  buttonVariants({ variant: getYear(navDate) === year ? "default" : "ghost" }),
                  "h-10 w-full text-xs font-medium"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
