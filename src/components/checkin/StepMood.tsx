import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MoodType } from "@/types/checkin";
import { Smile } from "lucide-react";

interface StepMoodProps {
  selectedMood?: MoodType;
  onSelect: (mood: MoodType) => void;
  className?: string;
}

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { type: "great", emoji: "😄", label: "Ótimo", color: "bg-success" },
  { type: "good", emoji: "🙂", label: "Bem", color: "bg-primary" },
  { type: "okay", emoji: "😐", label: "Ok", color: "bg-warning" },
  { type: "bad", emoji: "😞", label: "Mal", color: "bg-destructive" },
];

export function StepMood({ selectedMood, onSelect, className }: StepMoodProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <Smile className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Humor</h2>
        <p className="text-sm text-muted-foreground">
          Como você está se sentindo hoje?
        </p>
      </div>

      {/* Mood options */}
      <div className="grid grid-cols-2 gap-4">
        {MOOD_OPTIONS.map((option, index) => {
          const isSelected = selectedMood === option.type;
          
          return (
            <Card
              key={option.type}
              variant="default"
              interactive
              className={cn(
                "transition-all duration-200 cursor-pointer",
                `animate-in-delay-${index + 1}`,
                isSelected && "ring-2 ring-primary border-primary/50 scale-105"
              )}
              onClick={() => onSelect(option.type)}
            >
              <CardContent className="p-6 text-center">
                <div className={cn(
                  "text-5xl mb-3 transition-transform",
                  isSelected && "animate-bounce-subtle"
                )}>
                  {option.emoji}
                </div>
                <p className={cn(
                  "font-medium transition-colors",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected feedback */}
      {selectedMood && (
        <Card variant="elevated" className="animate-in">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground">
              Você está se sentindo{" "}
              <span className="font-semibold text-foreground">
                {MOOD_OPTIONS.find(m => m.type === selectedMood)?.label.toLowerCase()}
              </span>{" "}
              hoje {MOOD_OPTIONS.find(m => m.type === selectedMood)?.emoji}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
