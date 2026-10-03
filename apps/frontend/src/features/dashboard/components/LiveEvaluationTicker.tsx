import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldCheck, Clock, Users, UserCheck } from "lucide-react";
import type { LiveEvaluationPulseEvent } from "@my-app/shared";
import { formatRelativeTime } from "@/lib/format.lib";

interface Props {
  pulses: LiveEvaluationPulseEvent[];
  isOpen: boolean;
  maxHeight?: string;
}

export function LiveEvaluationTicker({ pulses, isOpen, maxHeight = "320px" }: Props) {
  return (
    <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Activity className="w-4 h-4 text-primary" />
            <span>Live Submission Pulse</span>
            {isOpen && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            )}
          </CardTitle>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Anonymized Stream
          </span>
        </div>
        <CardDescription className="text-xs">
          Real-time anonymous notification stream. No student identities or score ratings are ever
          broadcast.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-border/60 overflow-y-auto px-4 py-2" style={{ maxHeight }}>
          {pulses.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <Clock className="w-6 h-6 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-foreground">Awaiting incoming submissions...</p>
              <p className="text-[11px] max-w-xs mx-auto">
                {isOpen
                  ? "As students and supervisors finalize their evaluation forms, live pulses will appear here in real time."
                  : "No submissions are active since the evaluation window is currently inactive."}
              </p>
            </div>
          ) : (
            pulses.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === "SET"
                        ? "bg-primary/10 text-primary"
                        : "bg-success/15 text-success"
                    }`}
                  >
                    {item.type === "SET" ? (
                      <Users className="w-3.5 h-3.5" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-foreground truncate">
                      {item.type === "SET" ? "Student" : "Supervisor"} evaluated{" "}
                      <strong className="text-foreground font-mono">{item.courseCode}</strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {item.programCode} {item.yearLevel}-{item.section} • {item.collegeCode}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-[10px] font-normal border-border">
                    {formatRelativeTime(item.timestamp)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
