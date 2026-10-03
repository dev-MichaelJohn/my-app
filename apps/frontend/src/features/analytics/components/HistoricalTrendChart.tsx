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
    label: "SET (Students)",
    color: "#22c55e",
  },
  sefRating: {
    label: "SEF (Supervisor)",
    color: "#0284c7",
  },
  benchmarkSetRating: {
    label: "Univ Baseline (SET)",
    color: "#a1a1aa",
  },
  benchmarkSefRating: {
    label: "Univ Baseline (SEF)",
    color: "#38bdf8",
  },
};

export function HistoricalTrendChart({ trends }: Props) {
  // Only plot terms that have actual data
  const chartData = trends
    .filter((t) => t.totalRespondents > 0 || t.setRating > 0 || t.benchmarkSetRating > 0)
    .map((t) => ({
      term: `${t.semesterTerm} (${t.schoolYear})`,
      setRating: t.setRating > 0 ? t.setRating : null,
      sefRating: t.sefRating,
      benchmarkSetRating: t.benchmarkSetRating > 0 ? t.benchmarkSetRating : null,
      benchmarkSefRating: t.benchmarkSefRating,
    }));

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Multi-Semester Historical Trajectory</span>
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Users className="w-3.5 h-3.5" /> SET
            </span>
            <span className="flex items-center gap-1 font-semibold text-success">
              <UserCheck className="w-3.5 h-3.5" /> SEF
            </span>
          </div>
        </div>
        <CardDescription className="text-xs">
          Tracks both student and supervisory performance trajectories across recent semesters
          against university baselines.
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
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
                    type="linear"
                    dataKey="setRating"
                    connectNulls={true}
                    name="SET (Students)"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="linear"
                    dataKey="sefRating"
                    connectNulls={true}
                    name="SEF (Supervisor)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="linear"
                    dataKey="benchmarkSetRating"
                    connectNulls={true}
                    name="SET Baseline"
                    stroke="#a1a1aa"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="linear"
                    dataKey="benchmarkSefRating"
                    connectNulls={true}
                    name="SEF Baseline"
                    stroke="#38bdf8"
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
