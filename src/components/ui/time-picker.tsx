import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface TimePickerProps {
    value: string
    onChange: (time: string) => void
    className?: string
}

type Mode = 'hours' | 'minutes';
type Period = 'AM' | 'PM';

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [mode, setMode] = React.useState<Mode>('hours');

    // Parse initial state from value "HH:mm"
    const parseTime = (val: string) => {
        const [h, m] = val.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return { h: 12, m: 0, p: 'PM' as Period };

        let period: Period = 'AM';
        let hour12 = h;

        if (h >= 12) {
            period = 'PM';
            if (h > 12) hour12 = h - 12;
        }
        if (h === 0) hour12 = 12; // Midnight is 12 AM

        return { h: hour12, m, p: period };
    };

    const initial = React.useMemo(() => parseTime(value || "12:00"), [value]);
    const [hours, setHours] = React.useState(initial.h);
    const [minutes, setMinutes] = React.useState(initial.m);
    const [period, setPeriod] = React.useState<Period>(initial.p);

    // Sync state when value changes externally
    React.useEffect(() => {
        const { h, m, p } = parseTime(value || "12:00");
        setHours(h);
        setMinutes(m);
        setPeriod(p);
    }, [value]);

    const handleTimeChange = (newH: number, newM: number, newP: Period) => {
        // Convert back to 24h
        let h24 = newH;
        if (newP === 'PM' && newH !== 12) h24 += 12;
        if (newP === 'AM' && newH === 12) h24 = 0;

        onChange(`${h24.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
    }

    const selectHour = (h: number) => {
        setHours(h);
        handleTimeChange(h, minutes, period);
        setMode('minutes'); // Auto advance
    };

    const selectMinute = (m: number) => {
        setMinutes(m);
        handleTimeChange(hours, m, period);
        // Don't auto close, user might want to adjust
    };

    const togglePeriod = (p: Period) => {
        setPeriod(p);
        handleTimeChange(hours, minutes, p);
    };

    // Clock Face Helpers
    const CLOCK_SIZE = 256;
    const CENTER = CLOCK_SIZE / 2;
    const RADIUS = 100;

    const renderClockNumbers = () => {
        const items = [];
        const isMinuteMode = mode === 'minutes';
        const total = 12;

        for (let i = 1; i <= total; i++) {
            // Calculation for position
            // -90deg offset because 12 is at top (270deg or -90deg), standard math starts at 3 o'clock
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = CENTER + RADIUS * Math.cos(angle);
            const y = CENTER + RADIUS * Math.sin(angle);

            const numValue = isMinuteMode ? (i === 12 ? 0 : i * 5) : i; // 12 -> 00 min, 1 -> 05...
            const displayValue = numValue.toString().padStart(2, '0');

            const isSelected = isMinuteMode
                ? (numValue === minutes)
                : (numValue === hours);

            items.push(
                <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isMinuteMode) selectMinute(numValue);
                        else selectHour(numValue);
                    }}
                    className={cn(
                        "absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors z-10",
                        "bg-transparent hover:bg-primary/20",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                        // Position logic
                    )}
                    style={{
                        left: x - 20, // Center the 40px button
                        top: y - 20,
                    }}
                >
                    {isMinuteMode ? displayValue : i}
                </button>
            );
        }
        return items;
    };

    /* Interactive pointer arm would go here, simplified: just highlight the selected number */

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal h-12 px-3 text-lg",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <Clock className="mr-3 h-5 w-5 opacity-50" />
                    <span className="font-mono">{value || "--:--"}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-xl overflow-hidden" align="start">
                <div className="w-[300px] flex flex-col bg-card">
                    {/* Header */}
                    <div className="bg-primary/90 p-6 flex items-end justify-center gap-4 text-primary-foreground">
                        <div className="flex items-center gap-1 text-5xl font-semibold tracking-tight">
                            <button
                                onClick={() => setMode('hours')}
                                className={cn("focus:outline-none transition-opacity", mode !== 'hours' && "opacity-60")}
                            >
                                {hours.toString().padStart(2, '0')}
                            </button>
                            <span className="opacity-60 -mt-2">:</span>
                            <button
                                onClick={() => setMode('minutes')}
                                className={cn("focus:outline-none transition-opacity", mode !== 'minutes' && "opacity-60")}
                            >
                                {minutes.toString().padStart(2, '0')}
                            </button>
                        </div>

                        <div className="flex flex-col text-sm font-medium gap-1 mb-1">
                            <button
                                onClick={() => togglePeriod('AM')}
                                className={cn("px-1 rounded focus:outline-none", period === 'AM' ? "text-primary-foreground bg-white/20" : "text-primary-foreground/60")}
                            >
                                AM
                            </button>
                            <button
                                onClick={() => togglePeriod('PM')}
                                className={cn("px-1 rounded focus:outline-none", period === 'PM' ? "text-primary-foreground bg-white/20" : "text-primary-foreground/60")}
                            >
                                PM
                            </button>
                        </div>
                    </div>

                    {/* Clock Face Area */}
                    <div className="p-6 flex items-center justify-center bg-card">
                        <div
                            className="relative rounded-full bg-muted/30"
                            style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}
                        >
                            {/* Center Dot */}
                            <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full z-20 pointer-events-none" />

                            {/* Clock Numbers */}
                            {renderClockNumbers()}

                            {/* Decorator: Hand (Visual only, points to selected) */}
                            {/* We can compute rotation based on selection */}
                            {(() => {
                                const total = 12;
                                const current = mode === 'hours' ? hours : (minutes === 0 ? 12 : Math.round(minutes / 5) || 12);
                                // Note: Minutes 0-59 need to map to 1-12 positions roughly for the arm
                                // Actually, for minutes, we ideally want 60 ticks. But we only showed 12 buttons. 
                                // Let's stick to 5-min intervals for the arm logic to match the buttons.

                                let rotation = (current * 30); // 12 * 30 = 360
                                if (mode === 'minutes') {
                                    rotation = (minutes * 6); // 60 * 6 = 360
                                }

                                return (
                                    <div
                                        className="absolute top-0 left-1/2 h-1/2 w-0.5 -translate-x-1/2 origin-bottom pointer-events-none transition-transform duration-300 ease-out"
                                        style={{ transform: `rotate(${rotation}deg)` }}
                                    >
                                        <div className="w-0.5 h-[calc(100%-20px)] bg-primary mt-[20px] mx-auto absolute bottom-0 relative">
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary/20 border-2 border-primary" />
                                        </div>
                                    </div>
                                )
                            })()}

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 flex justify-end gap-2 border-t border-border/10">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button onClick={() => setIsOpen(false)}>OK</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
