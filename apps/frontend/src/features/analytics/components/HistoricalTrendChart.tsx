import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { LongitudinalPoint } from "@my-app/shared";

interface Props {
  trends: LongitudinalPoint[];
}

const chartConfig: ChartConfig = {
  setRating: {
    label: "SET Rating (Students)",
    color: "var(--primary)",
  },
  sefRating: {
    label: "SEF Rating (Supervisor)",
    color: "var(--color-success)",
  },
  benchmarkSetRating: {
    label: "Institution Benchmark",
    color: "var(--muted-foreground)",
  },
};

export function HistoricalTrendChart({ trends }: Props) {
  const chartData = trends.map((t) => ({
    term: `${t.semesterTerm} (${t.schoolYear})`,
    setRating: t.setRating,
    sefRating: t.sefRating,
    benchmarkSetRating: t.benchmarkSetRating,
  }));

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Multi-Semester Longitudinal Trend</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">Chronological Trajectory</span>
        </div>
        <CardDescription className="text-xs">
          Tracks performance across recent academic terms compared to the university baseline.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[280px] w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
              No historical evaluation data recorded yet.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="term"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <YAxis
                    domain={[1, 5]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Line
                    type="monotone"
                    dataKey="setRating"
                    name="SET (Students)"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sefRating"
                    name="SEF (Supervisor)"
                    stroke="var(--color-success)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmarkSetRating"
                    name="Institution Baseline"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
