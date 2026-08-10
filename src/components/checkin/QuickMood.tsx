import { cn } from "@/lib/utils";
import { MoodType } from "@/types/checkin";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";

interface QuickMoodProps {
  selectedMood?: MoodType;
  onSelect: (mood: MoodType) => void;
  className?: string;
}

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { type: "great", emoji: "😄", label: "Ótimo" },
  { type: "good", emoji: "🙂", label: "Bem" },
  { type: "okay", emoji: "😐", label: "Ok" },
  { type: "bad", emoji: "😞", label: "Mal" },
];

export function QuickMood({ selectedMood, onSelect, className }: QuickMoodProps) {
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSelect = (mood: MoodType) => {
    onSelect(mood);
    setSavedFeedback(true);
  };

  // Clear feedback after animation
  useEffect(() => {
    if (savedFeedback) {
      const timer = setTimeout(() => setSavedFeedback(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [savedFeedback]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-center gap-3">
        {MOOD_OPTIONS.map((option) => {
          const isSelected = selectedMood === option.type;
          
          return (
            <button
              key={option.type}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(option.type);
              }}
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                "hover:scale-110 active:scale-95",
                isSelected 
                  ? "bg-primary/20 ring-2 ring-primary scale-110" 
                  : "bg-muted hover:bg-muted/80"
              )}
              title={option.label}
            >
              {option.emoji}
            </button>
          );
        })}
      </div>
      
      {/* Saved feedback */}
      {savedFeedback && (
        <div className="flex justify-center">
          <span className="text-xs text-success flex items-center gap-1 animate-fade-in">
            <Check className="h-3 w-3" />
            Humor salvo
          </span>
        </div>
      )}
    </div>
  );
}
