import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PieChart, Pie } from "recharts";
import { TrendingUp, AlertCircle, Star, Users, UserCheck, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnnexCFacultyReport } from "@my-app/shared";

interface Props {
  report: AnnexCFacultyReport;
}

// Generates balanced institutional hues (avoids alarming bright red when only 1 category exists)
function getDynamicCategoryColor(index: number, total: number, baseHue = 150): string {
  if (total <= 1) {
    return baseHue === 150 ? "hsl(152, 60%, 40%)" : "hsl(215, 70%, 48%)";
  }
  const step = 360 / total;
  const hue = (baseHue + index * step) % 360;
  return `hsl(${Math.round(hue)}, 65%, 45%)`;
}

export function ReportAnalyticsCharts({ report }: Props) {
  const [activeTab, setActiveTab] = useState<"SET" | "SEF">("SET");

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
    min_rating = 1,
    max_rating = 5,
  } = report;

  // ── 1. SET Category Donut Data ──
  const setCount = set_category_analytics.length;
  const setPieData = useMemo(() => {
    return set_category_analytics.map((c, idx) => ({
      name: c.categoryName,
      value: c.averageRating,
      fill: getDynamicCategoryColor(idx, setCount, 150),
    }));
  }, [set_category_analytics, setCount]);

  const setChartConfig: ChartConfig = useMemo(() => {
    return set_category_analytics.reduce((acc, curr, idx) => {
      acc[`set_cat_${curr.categoryId}`] = {
        label: curr.categoryName,
        color: getDynamicCategoryColor(idx, setCount, 150),
      };
      return acc;
    }, {} as ChartConfig);
  }, [set_category_analytics, setCount]);

  // ── 2. SEF Category Donut Data ──
  const sefCount = sef_category_analytics.length;
  const sefPieData = useMemo(() => {
    return sef_category_analytics.map((c, idx) => ({
      name: c.categoryName,
      value: c.averageRating,
      fill: getDynamicCategoryColor(idx, sefCount, 215),
    }));
  }, [sef_category_analytics, sefCount]);

  const sefChartConfig: ChartConfig = useMemo(() => {
    return sef_category_analytics.reduce((acc, curr, idx) => {
      acc[`sef_cat_${curr.categoryId}`] = {
        label: curr.categoryName,
        color: getDynamicCategoryColor(idx, sefCount, 215),
      };
      return acc;
    }, {} as ChartConfig);
  }, [sef_category_analytics, sefCount]);

  const displayedIndicators =
    activeTab === "SET" ? set_indicator_analytics : sef_indicator_analytics;

  return (
    <div className="space-y-6">
      {/* ── Top Highlights: Strengths & Growth Areas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-border bg-card shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Key Strengths (Top 3 Rated Statements)</span>
          </div>
          <div className="space-y-2">
            {analytics_summary.highestIndicators.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No indicator data available.</p>
            ) : (
              analytics_summary.highestIndicators.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {item.type} • {item.categoryName}
                    </span>
                    <p className="font-medium text-foreground truncate">{item.indicatorText}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                    {item.averageRating.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 border-border bg-card shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Target Growth Areas (Guide for FEDAF Plan)</span>
          </div>
          <div className="space-y-2">
            {analytics_summary.lowestIndicators.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No indicator data available.</p>
            ) : (
              analytics_summary.lowestIndicators.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {item.type} • {item.categoryName}
                    </span>
                    <p className="font-medium text-foreground truncate">{item.indicatorText}</p>
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

      {/* ── 🚀 2 PIE CHARTS SIDE-BY-SIDE: Student Ratings (SET) vs Supervisor Ratings (SEF) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── 1. STUDENT (SET) PIE CHART ── */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-primary" />
                <span>Student Evaluation (SET) Categories</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {setCount} {setCount === 1 ? "Category" : "Categories"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Performance breakdown across student-evaluated categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="h-[200px] w-full flex items-center justify-center">
              {setPieData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No student category ratings recorded yet.
                </p>
              ) : (
                <ChartContainer config={setChartConfig} className="h-full w-full">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <span className="font-mono font-bold">
                              {name}: {Number(value).toFixed(2)}
                            </span>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={setPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={setCount > 1 ? 4 : 0}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </div>

            {/* SET Progress Breakdown */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {set_category_analytics.map((cat, idx) => {
                const effectiveMax = cat.maxRating || max_rating || 5;
                const color = getDynamicCategoryColor(idx, setCount, 150);

                return (
                  <div
                    key={cat.categoryId}
                    className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-bold text-foreground truncate">
                          {cat.categoryName}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-primary shrink-0">
                        {cat.averageRating.toFixed(2)} / {effectiveMax.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, cat.percentageScore))}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── 2. SUPERVISOR (SEF) PIE CHART ── */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Supervisor Evaluation (SEF) Categories</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {sefCount} {sefCount === 1 ? "Category" : "Categories"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Performance breakdown across supervisor criteria & MOVs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="h-[200px] w-full flex items-center justify-center">
              {sefPieData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No supervisor evaluation submitted yet.
                </p>
              ) : (
                <ChartContainer config={sefChartConfig} className="h-full w-full">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <span className="font-mono font-bold">
                              {name}: {Number(value).toFixed(2)}
                            </span>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={sefPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={sefCount > 1 ? 4 : 0}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </div>

            {/* SEF Progress Breakdown */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {sef_category_analytics.map((cat, idx) => {
                const effectiveMax = cat.maxRating || max_rating || 5;
                const color = getDynamicCategoryColor(idx, sefCount, 215);

                return (
                  <div
                    key={cat.categoryId}
                    className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-bold text-foreground truncate">
                          {cat.categoryName}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {cat.averageRating.toFixed(2)} / {effectiveMax.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, cat.percentageScore))}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Dynamic Indicator Rating Distribution (Bar Graph) ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <span>Per-Indicator Rating Distribution (Bar Graph)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Frequency count and visual breakdown across dynamic scale levels ({min_rating ?? 1}{" "}
                to {max_rating ?? 5}) per benchmark statement.
              </CardDescription>
            </div>

            {/* Toggle SET vs SEF */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("SET")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === "SET"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Student Ratings (SET)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("SEF")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === "SEF"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Supervisor Ratings (SEF)</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {displayedIndicators.length === 0 ? (
            <p className="text-center py-8 text-xs text-muted-foreground italic">
              No evaluation responses recorded for {activeTab}.
            </p>
          ) : (
            displayedIndicators.map((ind, idx) => {
              const totalResponses = ind.totalResponses || 1;
              const indMin = ind.minRating ?? min_rating ?? 1;
              const indMax = ind.maxRating ?? max_rating ?? 5;
              const dist = ind.ratingDistribution || {};

              const dynamicScaleLevels: number[] = [];
              for (let s = indMin; s <= indMax; s++) {
                dynamicScaleLevels.push(s);
              }

              return (
                <div
                  key={ind.questionId}
                  className="p-4 rounded-2xl border border-border/80 bg-background space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-muted-foreground">
                          Q{idx + 1}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {ind.categoryName}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm text-foreground leading-snug">
                        {ind.indicatorText}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-extrabold text-primary text-base">
                        {ind.averageRating.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {ind.qualitativeInterpretation}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-border/50">
                    {dynamicScaleLevels.map((ratingVal) => {
                      const count = dist[ratingVal] || 0;
                      const percentage = Math.round((count / totalResponses) * 100);
                      const relativeRatio = (ratingVal - indMin) / Math.max(1, indMax - indMin);

                      return (
                        <div key={ratingVal} className="flex items-center gap-3 text-xs">
                          <div className="w-12 font-mono font-bold text-muted-foreground flex items-center gap-1 shrink-0">
                            <span>{ratingVal}</span>
                            <Star className="w-3 h-3 fill-muted-foreground/30 text-muted-foreground" />
                          </div>

                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                relativeRatio >= 0.75
                                  ? "bg-emerald-500"
                                  : relativeRatio >= 0.5
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <div className="w-16 text-right font-mono text-[11px] text-muted-foreground shrink-0">
                            <strong className="text-foreground">{count}</strong> ({percentage}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
