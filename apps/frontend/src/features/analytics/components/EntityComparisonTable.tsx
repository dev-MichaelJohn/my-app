import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Trophy } from "lucide-react";
import type { EntityComparisonRow } from "@my-app/shared";

interface Props {
  breakdown: EntityComparisonRow[];
  scope: string;
}

export function EntityComparisonTable({ breakdown, scope }: Props) {
  if (breakdown.length === 0) return null;

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Building2 className="w-4 h-4 text-primary" />
            <span>
              {scope === "INSTITUTION"
                ? "College Comparative Performance & Ranking"
                : "Departmental Program Performance"}
            </span>
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono font-semibold">
            {breakdown.length} {scope === "INSTITUTION" ? "Colleges" : "Programs"} Ranked
          </Badge>
        </div>
      </CardHeader>
      <CardDescription className="text-xs">
        Compares teaching quality (SET), supervisor assessments (SEF), and perception divergence (Δ
        SEF − SET).
      </CardDescription>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40 text-xs">
            <TableRow>
              <TableHead className="w-12 text-center font-bold">Rank</TableHead>
              <TableHead className="font-bold">
                {scope === "INSTITUTION" ? "College Entity" : "Academic Program"}
              </TableHead>
              <TableHead className="text-center font-bold">Faculty</TableHead>
              <TableHead className="text-center font-bold">SET Rating</TableHead>
              <TableHead className="text-center font-bold">SEF Rating</TableHead>
              <TableHead className="text-center font-bold">Perception Gap (SEF − SET)</TableHead>
              <TableHead className="font-bold text-center">
                Grade Distribution (O / VS / S / F / P)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.map((row) => {
              const gap = row.perceptionGap;
              const isOverestimating = gap !== null && gap > 0.3;
              const isUnderestimating = gap !== null && gap < -0.3;

              return (
                <TableRow
                  key={row.entityId}
                  className="text-xs border-border hover:bg-muted/30 transition"
                >
                  <TableCell className="text-center font-mono font-bold">
                    {row.rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning/20 text-warning">
                        <Trophy className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      `#${row.rank}`
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-bold font-mono text-primary mr-1.5">
                      {row.entityCode}
                    </span>
                    <span className="font-medium text-foreground">{row.entityName}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-muted-foreground">
                    {row.totalFaculty}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-primary text-sm">
                    {row.setRating.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-success text-sm">
                    {row.sefRating !== null ? row.sefRating.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell className="text-center font-mono font-semibold">
                    {gap !== null ? (
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-mono px-2 py-0.5 ${
                          isOverestimating
                            ? "bg-info/10 text-info border-info/30"
                            : isUnderestimating
                              ? "bg-warning/10 text-warning border-warning/30"
                              : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {gap > 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                      <Badge
                        variant="outline"
                        title="Outstanding (4.50-5.00)"
                        className="bg-success/15 text-success border-success/30 px-1.5 py-0 font-bold"
                      >
                        {row.ratingDistribution.outstanding}
                      </Badge>
                      <Badge
                        variant="outline"
                        title="Very Satisfactory (3.50-4.49)"
                        className="bg-info/15 text-info border-info/30 px-1.5 py-0 font-bold"
                      >
                        {row.ratingDistribution.verySatisfactory}
                      </Badge>
                      <Badge
                        variant="outline"
                        title="Satisfactory (2.50-3.49)"
                        className="bg-muted text-muted-foreground px-1.5 py-0"
                      >
                        {row.ratingDistribution.satisfactory}
                      </Badge>
                      <Badge
                        variant="outline"
                        title="Fair (1.50-2.49)"
                        className="bg-warning/15 text-warning border-warning/30 px-1.5 py-0"
                      >
                        {row.ratingDistribution.fair}
                      </Badge>
                      <Badge
                        variant="outline"
                        title="Poor (< 1.50)"
                        className="bg-destructive/15 text-destructive border-destructive/30 px-1.5 py-0"
                      >
                        {row.ratingDistribution.poor}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
