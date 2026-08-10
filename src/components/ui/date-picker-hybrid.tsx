"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerHybridProps {
    date?: Date
    setDate: (date: Date | undefined) => void
    disabled?: boolean
}

export function DatePickerHybrid({ date, setDate, disabled }: DatePickerHybridProps) {
    const [inputValue, setInputValue] = React.useState("")
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

    // Sync Input when Date changes externally
    React.useEffect(() => {
        if (date) {
            setInputValue(format(date, "dd/MM/yyyy"))
        }
    }, [date])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "")

        // Simple masking logic
        if (value.length > 2) value = value.slice(0, 2) + "/" + value.slice(2)
        if (value.length > 5) value = value.slice(0, 5) + "/" + value.slice(5)
        if (value.length > 10) value = value.slice(0, 10)

        setInputValue(value)

        if (value.length === 10) {
            const parsedDate = parse(value, "dd/MM/yyyy", new Date())
            if (isValid(parsedDate) && parsedDate.getFullYear() > 1900) {
                setDate(parsedDate)
            }
        } else if (value === "" && date) {
            setDate(undefined)
        }
    }

    const handleCalendarSelect = (newDate: Date | undefined) => {
        setDate(newDate)
        setIsCalendarOpen(false)
        if (newDate) {
            setInputValue(format(newDate, "dd/MM/yyyy"))
        } else {
            setInputValue("")
        }
    }

    return (
        <div className="relative flex items-center">
            <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="DD/MM/AAAA"
                className="pr-10"
                maxLength={10}
                disabled={disabled}
            />
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 h-full w-10 text-muted-foreground hover:bg-transparent"
                        disabled={disabled}
                    >
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleCalendarSelect}
                        initialFocus
                        locale={ptBR}
                        disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                        }
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
