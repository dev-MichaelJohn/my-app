import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Users2 } from "lucide-react";

interface Props {
  completed: number;
  pending: number;
  percentage: number;
  title?: string;
  subtitle?: string;
}

export function ParticipationDonutChart({
  completed,
  pending,
  percentage,
  title = "Evaluation Completion Turnout",
  subtitle = "Student-subject submissions progress",
}: Props) {
  const data = [
    { name: "Completed", value: completed, color: "var(--color-primary, #059669)" },
    { name: "Pending", value: pending, color: "var(--color-muted, #e4e4e7)" },
  ];

  return (
    <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
      <CardHeader className="pb-2 border-b border-border/50">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
          <Users2 className="w-4 h-4 text-primary" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription className="text-xs">{subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="relative h-[200px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered percentage readout */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black font-mono text-foreground leading-none">
              {percentage.toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">
              Completed
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
            <span className="text-muted-foreground">Submitted:</span>
            <strong className="font-mono text-foreground">{completed.toLocaleString()}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
            <span className="text-muted-foreground">Pending:</span>
            <strong className="font-mono text-foreground">{pending.toLocaleString()}</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
