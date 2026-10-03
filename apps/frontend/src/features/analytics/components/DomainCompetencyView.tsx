import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar } from "lucide-react";
import type { DomainCompetencyMetric } from "@my-app/shared";

interface Props {
  competencies: DomainCompetencyMetric[];
}

export function DomainCompetencyView({ competencies }: Props) {
  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Radar className="w-4 h-4 text-primary" />
            <span>Core Pedagogical Domains</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">Scale: 5.00 Max</span>
        </div>
        <CardDescription className="text-xs">
          Competency metrics compared to institutional averages.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {competencies.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            No category evaluations available.
          </p>
        ) : (
          competencies.map((domain) => {
            const isPositive = domain.deltaFromBenchmark >= 0;
            const progressPercentage = Math.min(100, Math.max(0, (domain.setScore / 5) * 100));

            return (
              <div
                key={domain.categoryName}
                className="space-y-1.5 p-3 rounded-xl border border-border/60 bg-muted/20"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground truncate">{domain.categoryName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">
                      {domain.setScore.toFixed(2)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono px-1.5 py-0 ${
                        isPositive
                          ? "border-success/30 text-success bg-success/10"
                          : "border-warning/30 text-warning bg-warning/10"
                      }`}
                    >
                      {isPositive
                        ? `+${domain.deltaFromBenchmark.toFixed(2)}`
                        : domain.deltaFromBenchmark.toFixed(2)}{" "}
                      vs Univ
                    </Badge>
                  </div>
                </div>

                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {domain.sefScore !== null && (
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
                    <span>
                      Supervisor SEF:{" "}
                      <strong className="text-foreground">{domain.sefScore.toFixed(2)}</strong>
                    </span>
                    {domain.perceptionGap !== null && (
                      <span
                        className={
                          domain.perceptionGap > 0
                            ? "text-info"
                            : domain.perceptionGap < 0
                              ? "text-warning"
                              : "text-muted-foreground"
                        }
                      >
                        Gap:{" "}
                        {domain.perceptionGap > 0
                          ? `+${domain.perceptionGap.toFixed(2)}`
                          : domain.perceptionGap.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
