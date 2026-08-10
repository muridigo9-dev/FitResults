import { useState } from "react";
import { ThumbsUp, ThumbsDown, Minus, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ExerciseFeedbackMood, LikeDislike, SessionFeedbackFormData } from "@/types/workout";
import { MOOD_LABELS, MOOD_COLORS, MOOD_ICONS } from "@/types/workout";

interface ExerciseFeedbackProps {
  onSubmit: (feedback: SessionFeedbackFormData) => void;
  onSkip?: () => void;
  exerciseName?: string;
  showComment?: boolean;
  showRating?: boolean;
  className?: string;
}

export function ExerciseFeedback({
  onSubmit,
  onSkip,
  exerciseName,
  showComment = true,
  showRating = true,
  className,
}: ExerciseFeedbackProps) {
  const [mood, setMood] = useState<ExerciseFeedbackMood | undefined>();
  const [rating, setRating] = useState<number | undefined>();
  const [likeDislike, setLikeDislike] = useState<LikeDislike | undefined>();
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleSubmit = () => {
    onSubmit({
      mood,
      rating,
      likeDislike,
      comment: comment.trim() || undefined,
    });
  };

  const moods: ExerciseFeedbackMood[] = [
    "very_easy",
    "easy",
    "moderate",
    "hard",
    "very_hard",
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {exerciseName && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Como foi</p>
          <h3 className="text-lg font-semibold">{exerciseName}?</h3>
        </div>
      )}

      {/* Like/Dislike */}
      <div className="flex justify-center gap-4">
        <Button
          variant={likeDislike === "like" ? "default" : "outline"}
          size="lg"
          className={cn(
            "flex-1 max-w-[120px] gap-2",
            likeDislike === "like" && "bg-green-500 hover:bg-green-600"
          )}
          onClick={() => setLikeDislike(likeDislike === "like" ? undefined : "like")}
        >
          <ThumbsUp className="h-5 w-5" />
          Gostei
        </Button>

        <Button
          variant={likeDislike === "dislike" ? "default" : "outline"}
          size="lg"
          className={cn(
            "flex-1 max-w-[120px] gap-2",
            likeDislike === "dislike" && "bg-red-500 hover:bg-red-600"
          )}
          onClick={() => setLikeDislike(likeDislike === "dislike" ? undefined : "dislike")}
        >
          <ThumbsDown className="h-5 w-5" />
          Não gostei
        </Button>
      </div>

      {/* Mood Meter */}
      <div className="space-y-3">
        <p className="text-sm text-center text-muted-foreground">
          Dificuldade do exercício
        </p>
        <div className="flex justify-center gap-2">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? undefined : m)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                mood === m
                  ? "bg-primary/10 ring-2 ring-primary scale-105"
                  : "hover:bg-muted"
              )}
            >
              <span className="text-2xl">{MOOD_ICONS[m]}</span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  mood === m ? "text-primary" : "text-muted-foreground"
                )}
              >
                {MOOD_LABELS[m]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Star Rating */}
      {showRating && (
        <div className="space-y-3">
          <p className="text-sm text-center text-muted-foreground">
            Avaliação geral
          </p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? undefined : star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    rating && star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comment */}
      {showComment && (
        <div className="space-y-2">
          {!showCommentInput ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowCommentInput(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Adicionar comentário
            </Button>
          ) : (
            <Textarea
              placeholder="Alguma observação sobre o exercício?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none"
              autoFocus
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onSkip && (
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onSkip}
          >
            Pular
          </Button>
        )}
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={!mood && !likeDislike && !rating}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
}

// ============================================
// QUICK FEEDBACK (Inline/Compact)
// ============================================

interface QuickFeedbackProps {
  onSelect: (likeDislike: LikeDislike) => void;
  selected?: LikeDislike;
  size?: "sm" | "md";
  className?: string;
}

export function QuickFeedback({
  onSelect,
  selected,
  size = "md",
  className,
}: QuickFeedbackProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant={selected === "like" ? "default" : "ghost"}
        size="icon"
        className={cn(
          sizeClasses[size],
          selected === "like" && "bg-green-500 hover:bg-green-600"
        )}
        onClick={() => onSelect("like")}
      >
        <ThumbsUp className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </Button>
      <Button
        variant={selected === "dislike" ? "default" : "ghost"}
        size="icon"
        className={cn(
          sizeClasses[size],
          selected === "dislike" && "bg-red-500 hover:bg-red-600"
        )}
        onClick={() => onSelect("dislike")}
      >
        <ThumbsDown className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </Button>
    </div>
  );
}

// ============================================
// MOOD SELECTOR (Compact)
// ============================================

interface MoodSelectorProps {
  value?: ExerciseFeedbackMood;
  onChange: (mood: ExerciseFeedbackMood) => void;
  size?: "sm" | "md";
  className?: string;
}

export function MoodSelector({
  value,
  onChange,
  size = "md",
  className,
}: MoodSelectorProps) {
  const moods: ExerciseFeedbackMood[] = [
    "very_easy",
    "easy",
    "moderate",
    "hard",
    "very_hard",
  ];

  const sizeClasses = {
    sm: "text-lg p-1",
    md: "text-2xl p-2",
  };

  return (
    <div className={cn("flex gap-1", className)}>
      {moods.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "rounded-lg transition-all",
            sizeClasses[size],
            value === m
              ? "bg-primary/10 ring-2 ring-primary scale-110"
              : "hover:bg-muted opacity-60 hover:opacity-100"
          )}
          title={MOOD_LABELS[m]}
        >
          {MOOD_ICONS[m]}
        </button>
      ))}
    </div>
  );
}

// ============================================
// WORKOUT COMPLETE FEEDBACK
// ============================================

interface WorkoutCompleteFeedbackProps {
  onSubmit: (feedback: SessionFeedbackFormData) => void;
  workoutName?: string;
  durationMinutes?: number;
  exercisesCompleted?: number;
  className?: string;
}

export function WorkoutCompleteFeedback({
  onSubmit,
  workoutName,
  durationMinutes,
  exercisesCompleted,
  className,
}: WorkoutCompleteFeedbackProps) {
  const [mood, setMood] = useState<ExerciseFeedbackMood | undefined>();
  const [rating, setRating] = useState<number | undefined>();
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    onSubmit({
      mood,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const moods: ExerciseFeedbackMood[] = [
    "very_easy",
    "easy",
    "moderate",
    "hard",
    "very_hard",
  ];

  return (
    <div className={cn("space-y-8", className)}>
      {/* Success Header */}
      <div className="text-center space-y-2">
        <div className="text-6xl animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold">Treino Concluído!</h2>
        {workoutName && (
          <p className="text-muted-foreground">{workoutName}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {durationMinutes !== undefined && (
          <div className="text-center p-4 bg-muted rounded-xl">
            <p className="text-3xl font-bold">{durationMinutes}</p>
            <p className="text-xs text-muted-foreground">minutos</p>
          </div>
        )}
        {exercisesCompleted !== undefined && (
          <div className="text-center p-4 bg-muted rounded-xl">
            <p className="text-3xl font-bold">{exercisesCompleted}</p>
            <p className="text-xs text-muted-foreground">exercícios</p>
          </div>
        )}
      </div>

      {/* Mood */}
      <div className="space-y-3">
        <p className="text-sm text-center text-muted-foreground">
          Como foi o treino?
        </p>
        <div className="flex justify-center gap-3">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? undefined : m)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                mood === m
                  ? "bg-primary/10 ring-2 ring-primary scale-105"
                  : "hover:bg-muted"
              )}
            >
              <span className="text-3xl">{MOOD_ICONS[m]}</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  mood === m ? "text-primary" : "text-muted-foreground"
                )}
              >
                {MOOD_LABELS[m]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-3">
        <p className="text-sm text-center text-muted-foreground">
          Avalie seu treino
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(rating === star ? undefined : star)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-10 w-10 transition-colors",
                  rating && star <= rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <Textarea
        placeholder="Alguma observação sobre o treino? (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="resize-none mb-24" // Added margin bottom for sticky button space
      />

      {/* Submit - Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[16rem] p-4 bg-background/95 backdrop-blur-sm border-t z-50 safe-area-bottom transition-all duration-300">
        <Button
          size="lg"
          className="w-full shadow-lg"
          onClick={handleSubmit}
        >
          Salvar e Finalizar
        </Button>
      </div>
    </div>
  );
}
