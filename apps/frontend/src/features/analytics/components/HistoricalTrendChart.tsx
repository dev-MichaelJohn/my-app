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
import { TrendingUp, Users, UserCheck } from "lucide-react";
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
    label: "Univ Baseline (SET)",
    color: "var(--muted-foreground)",
  },
  benchmarkSefRating: {
    label: "Univ Baseline (SEF)",
    color: "var(--color-info)",
  },
};

export function HistoricalTrendChart({ trends }: Props) {
  const chartData = trends.map((t) => ({
    term: `${t.semesterTerm} (${t.schoolYear})`,
    setRating: t.setRating,
    sefRating: t.sefRating,
    benchmarkSetRating: t.benchmarkSetRating,
    benchmarkSefRating: t.benchmarkSefRating,
  }));

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Multi-Semester Longitudinal Trajectory</span>
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Users className="w-3.5 h-3.5" /> SET (Students)
            </span>
            <span className="flex items-center gap-1 font-semibold text-success">
              <UserCheck className="w-3.5 h-3.5" /> SEF (Supervisor)
            </span>
          </div>
        </div>
        <CardDescription className="text-xs">
          Tracks both student and supervisory performance trajectories across recent semesters
          against university baselines.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px] w-full">
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
                  {/* SET Rating Line */}
                  <Line
                    type="monotone"
                    dataKey="setRating"
                    name="SET Rating"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  {/* SEF Rating Line */}
                  <Line
                    type="monotone"
                    dataKey="sefRating"
                    name="SEF Rating"
                    stroke="var(--color-success)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  {/* SET Institutional Baseline */}
                  <Line
                    type="monotone"
                    dataKey="benchmarkSetRating"
                    name="SET Baseline"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  {/* SEF Institutional Baseline */}
                  <Line
                    type="monotone"
                    dataKey="benchmarkSefRating"
                    name="SEF Baseline"
                    stroke="var(--color-info)"
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
