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
import { Building2 } from "lucide-react";
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
                ? "College-Level Comparative Performance"
                : "Program-Level Performance"}
            </span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{breakdown.length} Entities</span>
        </div>
        <CardDescription className="text-xs">
          Rankings, respondent volumes, and qualitative grade distribution.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40 text-xs">
            <TableRow>
              <TableHead className="font-bold">Entity</TableHead>
              <TableHead className="text-center font-bold">Faculty</TableHead>
              <TableHead className="text-center font-bold">SET Rating</TableHead>
              <TableHead className="text-center font-bold">SEF Rating</TableHead>
              <TableHead className="text-center font-bold">Perception Gap</TableHead>
              <TableHead className="font-bold text-center">
                Grade Distribution (O / VS / S / F / P)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.map((row) => (
              <TableRow key={row.entityId} className="text-xs border-border">
                <TableCell>
                  <span className="font-bold font-mono text-primary mr-1.5">{row.entityCode}</span>
                  <span className="font-medium text-foreground">{row.entityName}</span>
                </TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">
                  {row.totalFaculty}
                </TableCell>
                <TableCell className="text-center font-mono font-bold text-primary">
                  {row.setRating.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-mono font-bold text-success">
                  {row.sefRating !== null ? row.sefRating.toFixed(2) : "—"}
                </TableCell>
                <TableCell className="text-center font-mono font-semibold">
                  {row.variance !== 0 ? (
                    <span className={row.variance > 0 ? "text-success" : "text-warning"}>
                      {row.variance > 0 ? `+${row.variance.toFixed(2)}` : row.variance.toFixed(2)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                    <Badge
                      variant="outline"
                      className="bg-success/10 text-success border-success/30 px-1.5 py-0 font-bold"
                    >
                      {row.ratingDistribution.outstanding}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-info/10 text-info border-info/30 px-1.5 py-0 font-bold"
                    >
                      {row.ratingDistribution.verySatisfactory}
                    </Badge>
                    <Badge variant="outline" className="bg-muted text-muted-foreground px-1.5 py-0">
                      {row.ratingDistribution.satisfactory}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-warning/10 text-warning border-warning/30 px-1.5 py-0"
                    >
                      {row.ratingDistribution.fair}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-destructive/10 text-destructive border-destructive/30 px-1.5 py-0"
                    >
                      {row.ratingDistribution.poor}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
