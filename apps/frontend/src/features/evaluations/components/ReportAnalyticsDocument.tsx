import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, TrendingUp, AlertCircle, FileCheck2, UserCheck, FileText } from "lucide-react";
import type { AnnexCFacultyReport } from "@my-app/shared";

interface Props {
  report: AnnexCFacultyReport;
}

export function ReportAnalyticsDocument({ report }: Props) {
  const {
    set_category_analytics = [],
    set_indicator_analytics = [],
    sef_category_analytics = [],
    sef_indicator_analytics = [],
    analytics_summary = {
      highestIndicators: [],
      lowestIndicators: [],
      categoryComparison: [],
    },
  } = report;

  return (
    <div className="space-y-8">
      {/* ── 1. Top Insights Banner: Strengths & Growth Areas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Highest Indicators (Strengths) */}
        <Card className="p-5 border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Identified Key Strengths</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Highest-rated benchmark statements across student and supervisor evaluations:
          </p>
          <div className="space-y-2">
            {analytics_summary.highestIndicators.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No indicator data available yet.
              </p>
            ) : (
              analytics_summary.highestIndicators.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-emerald-600 text-white text-[10px] h-4 px-1.5">
                        {item.type}
                      </Badge>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {item.categoryName}
                      </span>
                    </div>
                    <p className="text-foreground font-medium leading-snug">{item.indicatorText}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                    {item.averageRating.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Lowest Indicators (Growth Areas) */}
        <Card className="p-5 border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Targeted Areas for Faculty Development</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Indicators with lowest average ratings to address in the FEDAF Action Plan:
          </p>
          <div className="space-y-2">
            {analytics_summary.lowestIndicators.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No indicator data available yet.
              </p>
            ) : (
              analytics_summary.lowestIndicators.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-amber-600 text-white text-[10px] h-4 px-1.5">
                        {item.type}
                      </Badge>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {item.categoryName}
                      </span>
                    </div>
                    <p className="text-foreground font-medium leading-snug">{item.indicatorText}</p>
                  </div>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm shrink-0">
                    {item.averageRating.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── 2. Category Perception Gap Comparison (SET vs SEF) ── */}
      <Card className="p-6 border-border bg-card shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span>Category Performance & Perception Gap (SET vs. SEF)</span>
          </div>
          <span className="text-xs text-muted-foreground">Benchmark: 5.00 Maximum Scale</span>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="font-bold">Evaluation Category</TableHead>
                <TableHead className="text-center font-bold">SET Average (Students)</TableHead>
                <TableHead className="text-center font-bold">SEF Average (Supervisor)</TableHead>
                <TableHead className="text-center font-bold">Gap (SEF – SET)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics_summary.categoryComparison.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                    No comparative category data available.
                  </TableCell>
                </TableRow>
              ) : (
                analytics_summary.categoryComparison.map((cat, idx) => (
                  <TableRow key={idx} className="text-xs">
                    <TableCell className="font-medium text-foreground">
                      {cat.categoryName}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-primary">
                      {cat.setAverage !== null ? cat.setAverage.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {cat.sefAverage !== null ? cat.sefAverage.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold">
                      {cat.gap !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            cat.gap > 0
                              ? "bg-blue-500/10 text-blue-600"
                              : cat.gap < 0
                                ? "bg-amber-500/10 text-amber-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {cat.gap > 0 ? `+${cat.gap.toFixed(2)}` : cat.gap.toFixed(2)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── 3. SET: Granular Indicator Breakdown ── */}
      <Card className="p-6 border-border bg-card shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-foreground">
          <FileCheck2 className="w-4 h-4 text-primary" />
          <span>Student Evaluation of Teachers (SET) — Indicator Breakdown</span>
        </div>

        {/* Categories summary progress */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {set_category_analytics.map((c) => (
            <div
              key={c.categoryId}
              className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-1.5"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground truncate">{c.categoryName}</span>
                <span className="font-mono font-bold text-primary">
                  {c.averageRating.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(c.averageRating / 5) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{c.qualitativeInterpretation}</p>
            </div>
          ))}
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="w-12 text-center font-bold">#</TableHead>
                <TableHead className="font-bold">Benchmark Indicator Statement</TableHead>
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="text-center font-bold">Mean Rating</TableHead>
                <TableHead className="text-center font-bold">Rating Distribution (1–5)</TableHead>
                <TableHead className="font-bold">Interpretation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {set_indicator_analytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    No SET indicators recorded.
                  </TableCell>
                </TableRow>
              ) : (
                set_indicator_analytics.map((ind, idx) => (
                  <TableRow key={ind.questionId} className="text-xs">
                    <TableCell className="text-center font-mono font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-foreground max-w-sm">
                      {ind.indicatorText}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {ind.categoryName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-primary">
                      {ind.averageRating.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                        <span
                          title="Rating 5"
                          className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 font-bold"
                        >
                          5:{ind.ratingDistribution?.[5] ?? 0}
                        </span>
                        <span
                          title="Rating 4"
                          className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 font-bold"
                        >
                          4:{ind.ratingDistribution?.[4] ?? 0}
                        </span>
                        <span
                          title="Rating 3"
                          className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          3:{ind.ratingDistribution?.[3] ?? 0}
                        </span>
                        <span
                          title="Rating 2"
                          className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700"
                        >
                          2:{ind.ratingDistribution?.[2] ?? 0}
                        </span>
                        <span
                          title="Rating 1"
                          className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-bold"
                        >
                          1:{ind.ratingDistribution?.[1] ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {ind.qualitativeInterpretation}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── 4. SEF: Granular Indicator Breakdown with MOVs ── */}
      <Card className="p-6 border-border bg-card shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-foreground">
          <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Supervisor's Evaluation of Faculty (SEF) — Indicator Breakdown</span>
        </div>

        {/* Categories summary progress */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sef_category_analytics.map((c) => (
            <div
              key={c.categoryId}
              className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-1.5"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-foreground truncate">{c.categoryName}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {c.averageRating.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600"
                  style={{ width: `${(c.averageRating / 5) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{c.qualitativeInterpretation}</p>
            </div>
          ))}
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="w-12 text-center font-bold">#</TableHead>
                <TableHead className="font-bold">Benchmark Criteria Statement</TableHead>
                <TableHead className="font-bold">Verified MOVs (Means of Verification)</TableHead>
                <TableHead className="text-center font-bold">SEF Score</TableHead>
                <TableHead className="font-bold">Interpretation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sef_indicator_analytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    No SEF indicators recorded.
                  </TableCell>
                </TableRow>
              ) : (
                sef_indicator_analytics.map((ind, idx) => (
                  <TableRow key={ind.questionId} className="text-xs">
                    <TableCell className="text-center font-mono font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-foreground max-w-sm">
                      {ind.indicatorText}
                    </TableCell>
                    <TableCell>
                      {ind.means && ind.means.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ind.means.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground flex items-center gap-1"
                            >
                              <FileText className="w-2.5 h-2.5 text-primary" /> {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Observation
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {ind.averageRating.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {ind.qualitativeInterpretation}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
