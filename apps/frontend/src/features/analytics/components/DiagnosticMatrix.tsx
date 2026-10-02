import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle } from "lucide-react";
import type { IndicatorDiagnosis } from "@my-app/shared";

interface Props {
  topIndicators: IndicatorDiagnosis[];
  lowestIndicators: IndicatorDiagnosis[];
}

export function DiagnosticMatrix({ topIndicators, lowestIndicators }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Strengths */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-2 border-b border-border/50">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-success">
            <TrendingUp className="w-4 h-4" />
            <span>Highest Pedagogical Strengths</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-2.5">
          {topIndicators.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No indicator data available.</p>
          ) : (
            topIndicators.map((item) => (
              <div
                key={item.indicatorId}
                className="p-3 rounded-xl border border-success/20 bg-success/5 text-xs flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground border-border/60"
                  >
                    {item.categoryName}
                  </Badge>
                  <p className="font-medium text-foreground leading-snug truncate">
                    {item.questionText}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-success text-sm block">
                    {item.averageRating.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {item.delta >= 0 ? `+${item.delta.toFixed(2)}` : item.delta.toFixed(2)} vs
                    benchmark
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Areas for Growth */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-2 border-b border-border/50">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-warning">
            <AlertCircle className="w-4 h-4" />
            <span>Priority Areas for Development (FEDAF Guide)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-2.5">
          {lowestIndicators.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No indicator data available.</p>
          ) : (
            lowestIndicators.map((item) => (
              <div
                key={item.indicatorId}
                className="p-3 rounded-xl border border-warning/20 bg-warning/5 text-xs flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground border-border/60"
                  >
                    {item.categoryName}
                  </Badge>
                  <p className="font-medium text-foreground leading-snug truncate">
                    {item.questionText}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-warning text-sm block">
                    {item.averageRating.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {item.delta >= 0 ? `+${item.delta.toFixed(2)}` : item.delta.toFixed(2)} vs
                    benchmark
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
