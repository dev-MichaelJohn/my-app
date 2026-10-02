import { Badge } from "@/components/ui/badge";
import { Smile, Meh, Frown, Sparkles } from "lucide-react";
import type { SentimentClassification } from "@my-app/shared";
import { cn } from "@/lib/utils";

interface Props {
  score?: number | null;
  classification?: SentimentClassification | string | null;
  className?: string;
  showScore?: boolean;
}

export function SentimentBadge({ score, classification, className, showScore = true }: Props) {
  if (score === null || score === undefined) return null;

  let label = classification || "NEUTRAL";
  let colorClasses = "bg-muted text-muted-foreground border-border";
  let Icon = Meh;

  if (label === "POSITIVE" || (!classification && score > 0.15)) {
    label = "POSITIVE";
    colorClasses = "bg-success/15 text-success border-success/20";
    Icon = Smile;
  } else if (label === "NEGATIVE" || (!classification && score < -0.15)) {
    label = "NEGATIVE";
    colorClasses = "bg-destructive/15 text-destructive border-destructive/20";
    Icon = Frown;
  } else if (label === "MIXED") {
    colorClasses = "bg-warning/15 text-warning border-warning/20";
    Icon = Sparkles;
  }

  const formattedScore = score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-semibold text-[11px] py-0.5 px-2", colorClasses, className)}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {showScore && <span className="font-mono opacity-80 font-normal">({formattedScore})</span>}
    </Badge>
  );
}
