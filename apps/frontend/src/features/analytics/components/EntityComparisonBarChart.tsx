import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import type { EntityBarComparison } from "@my-app/shared";

interface Props {
  data: EntityBarComparison[];
  title: string;
  subtitle: string;
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
};

export function EntityComparisonBarChart({ data, title, subtitle }: Props) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.entityCode,
    fullName: d.entityName,
    setRating: d.setRating,
    sefRating: d.sefRating ?? 0,
    gap: d.perceptionGap ?? 0,
  }));

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span>{title}</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">Scale: 1.00 – 5.00</span>
        </div>
        <CardDescription className="text-xs">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[280px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 5]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val, name, item) => (
                        <div className="flex flex-col text-xs">
                          <span className="font-bold">{item.payload.fullName}</span>
                          <span>
                            {name}: {Number(val).toFixed(2)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar
                  dataKey="setRating"
                  name="SET (Students)"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="sefRating"
                  name="SEF (Supervisor)"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
