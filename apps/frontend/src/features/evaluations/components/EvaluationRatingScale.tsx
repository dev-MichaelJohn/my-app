import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDynamicRatingDescriptor } from "@/lib/format.lib";

interface Props {
  minRating: number;
  maxRating: number;
  selectedRating?: number;
  disabled?: boolean;
  onSelect: (rating: number) => void;
  showLabels?: boolean;
}

export function EvaluationRatingScale({
  minRating,
  maxRating,
  selectedRating,
  disabled = false,
  onSelect,
  showLabels = false,
}: Props) {
  const safeMin = Math.max(1, minRating);
  const safeMax = Math.max(safeMin + 1, maxRating);
  const count = safeMax - safeMin + 1;
  const scores = Array.from({ length: count }, (_, i) => safeMin + i);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {scores.map((score) => {
          const isSelected = selectedRating === score;
          const descriptor = getDynamicRatingDescriptor(score, safeMin, safeMax);

          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(score)}
              title={`${score} - ${descriptor}`}
              className={cn(
                "group relative inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all select-none",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30"
                  : "bg-background border-input text-foreground hover:bg-muted hover:border-primary/50",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <Star
                className={cn(
                  "w-3.5 h-3.5 transition-transform group-hover:scale-110",
                  isSelected
                    ? "fill-primary-foreground text-primary-foreground"
                    : "text-muted-foreground",
                )}
              />
              <span className="font-mono text-sm leading-none">{score}</span>
            </button>
          );
        })}
      </div>

      {showLabels && selectedRating !== undefined && (
        <p className="text-xs text-muted-foreground animate-in fade-in duration-150">
          Selected: <strong className="text-primary font-bold">{selectedRating}</strong> (
          {getDynamicRatingDescriptor(selectedRating, safeMin, safeMax)})
        </p>
      )}
    </div>
  );
}

export function RatingScaleGuide({
  minRating,
  maxRating,
}: {
  minRating: number;
  maxRating: number;
}) {
  const safeMin = Math.max(1, minRating);
  const safeMax = Math.max(safeMin + 1, maxRating);
  const count = safeMax - safeMin + 1;
  const scores = Array.from({ length: count }, (_, i) => safeMin + i);

  return (
    <div className="p-4 bg-muted/40 border border-border/80 rounded-xl space-y-2">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>Rating Scale Guide</span>
        <span className="font-mono">
          {safeMin} (Lowest) &nbsp;→&nbsp; {safeMax} (Highest)
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs pt-1">
        {scores.map((score) => (
          <div
            key={score}
            className="p-2 bg-background border border-border rounded-lg flex items-start gap-2 shadow-2xs"
          >
            <span className="w-5 h-5 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center font-mono shrink-0 text-xs">
              {score}
            </span>
            <span className="text-[11px] font-medium leading-tight text-foreground truncate">
              {getDynamicRatingDescriptor(score, safeMin, safeMax)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
