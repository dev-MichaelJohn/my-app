import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  schedule?: {
    isOpen: boolean;
    openAt?: string;
    closeAt?: string;
    semesterTerm?: string;
    schoolYear?: string;
    secondsRemaining?: number;
  };
}

function CountdownTimer({
  isOpen,
  secondsRemaining,
}: {
  isOpen: boolean;
  secondsRemaining?: number;
}) {
  const [seconds, setSeconds] = useState(secondsRemaining ?? 0);

  useEffect(() => {
    if (!isOpen || seconds <= 0) return;
    const interval = setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, seconds]);

  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="flex items-center gap-2 font-mono text-center">
      <div className="px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border min-w-[50px]">
        <span className="text-lg font-extrabold text-foreground block">{days}</span>
        <span className="text-[10px] text-muted-foreground uppercase font-sans">Days</span>
      </div>
      <span className="font-bold text-muted-foreground">:</span>
      <div className="px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border min-w-[50px]">
        <span className="text-lg font-extrabold text-foreground block">
          {String(hours).padStart(2, "0")}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase font-sans">Hours</span>
      </div>
      <span className="font-bold text-muted-foreground">:</span>
      <div className="px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border min-w-[50px]">
        <span className="text-lg font-extrabold text-foreground block">
          {String(minutes).padStart(2, "0")}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase font-sans">Mins</span>
      </div>
      <span className="font-bold text-muted-foreground">:</span>
      <div className="px-2.5 py-1.5 rounded-xl bg-muted/60 border border-border min-w-[50px]">
        <span className="text-lg font-extrabold text-primary block">
          {String(remainingSeconds).padStart(2, "0")}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase font-sans">Secs</span>
      </div>
    </div>
  );
}

export function EvaluationCountdownWidget({ schedule }: Props) {
  if (!schedule) return null;

  return (
    <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              schedule.isOpen
                ? "border-success/40 bg-success/10 text-success font-bold text-xs"
                : "border-border text-muted-foreground text-xs"
            }
          >
            <span
              className={`w-2 h-2 rounded-full mr-1.5 ${schedule.isOpen ? "bg-success animate-pulse" : "bg-muted-foreground"}`}
            />
            {schedule.isOpen ? "Active Evaluation Window" : "Window Concluded / Inactive"}
          </Badge>
          {schedule.semesterTerm && (
            <span className="text-xs text-muted-foreground font-medium">
              {schedule.semesterTerm} ({schedule.schoolYear})
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {schedule.isOpen
            ? "Students and supervisors may submit official teaching assessments."
            : "No evaluations are currently being accepted. Reports and analytics are in review."}
        </p>
      </div>

      {schedule.isOpen ? (
        <CountdownTimer
          key={schedule.secondsRemaining ?? 0}
          isOpen={schedule.isOpen}
          secondsRemaining={schedule.secondsRemaining}
        />
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>Evaluation schedule closed</span>
        </div>
      )}
    </div>
  );
}
