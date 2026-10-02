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
import { TrendingUp, AlertCircle, BarChart2, Star, Users, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnnexCFacultyReport } from "@my-app/shared";

interface Props {
  report: AnnexCFacultyReport;
}

// Procedural dynamic palette generator for any number of categories
function getDynamicCategoryColor(index: number, total: number): string {
  const safeTotal = Math.max(1, total);
  const hue = Math.round((index * 360) / safeTotal);
  return `hsl(${hue}, 70%, 48%)`;
}

export function ReportAnalyticsCharts({ report }: Props) {
  const [activeTab, setActiveTab] = useState<"SET" | "SEF">("SET");

  const {
    set_category_analytics = [],
    set_indicator_analytics = [],
    sef_indicator_analytics = [],
    analytics_summary = {
      highestIndicators: [],
      lowestIndicators: [],
      categoryComparison: [],
    },
    min_rating = 1,
    max_rating = 5,
  } = report;

  // ── Dynamic Category Pie Data ──
  const categoryCount = set_category_analytics.length;

  const categoryPieData = useMemo(() => {
    return set_category_analytics.map((c, idx) => ({
      name: c.categoryName,
      value: c.averageRating,
      fill: getDynamicCategoryColor(idx, categoryCount),
    }));
  }, [set_category_analytics, categoryCount]);

  const pieChartConfig: ChartConfig = useMemo(() => {
    return set_category_analytics.reduce((acc, curr, idx) => {
      acc[`cat_${curr.categoryId}`] = {
        label: curr.categoryName,
        color: getDynamicCategoryColor(idx, categoryCount),
      };
      return acc;
    }, {} as ChartConfig);
  }, [set_category_analytics, categoryCount]);

  const displayedIndicators =
    activeTab === "SET" ? set_indicator_analytics : sef_indicator_analytics;

  return (
    <div className="space-y-6">
      {/* ── Key Highlights (Top Strengths & Bottom Growth Areas) ── */}
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

      {/* ── 1. Dynamic Category Breakdown: Pie Chart ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <span>Category Performance Distribution ({categoryCount} Categories)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Dynamic mean scores across all evaluated categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-6">
            <div className="h-[260px] w-full flex items-center justify-center">
              {categoryPieData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No category ratings recorded.
                </p>
              ) : (
                <ChartContainer config={pieChartConfig} className="h-full w-full">
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
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </div>

            {/* Dynamic Category Score Badges & Percentages */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {set_category_analytics.map((cat, idx) => {
                const effectiveCatMax = cat.maxRating || max_rating || 5;
                const color = getDynamicCategoryColor(idx, categoryCount);

                return (
                  <div
                    key={cat.categoryId}
                    className="p-3 rounded-xl border border-border/70 bg-muted/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-bold text-foreground truncate">
                          {cat.categoryName}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-primary">
                        {cat.averageRating.toFixed(2)} / {effectiveCatMax.toFixed(2)}
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
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>{cat.qualitativeInterpretation}</span>
                      <span className="font-mono">{cat.percentageScore}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Dynamic Indicator Rating Distribution (Bar Graph) ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">
                Per-Indicator Rating Distribution (Bar Graph)
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

              // Dynamically build scale array from actual minRating to maxRating
              const dynamicScaleLevels: number[] = [];
              for (let s = indMin; s <= indMax; s++) {
                dynamicScaleLevels.push(s);
              }

              return (
                <div
                  key={ind.questionId}
                  className="p-4 rounded-2xl border border-border/80 bg-background space-y-3"
                >
                  {/* Indicator Header */}
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

                  {/* Dynamic Horizontal Bar Graph */}
                  <div className="space-y-1.5 pt-1 border-t border-border/50">
                    {dynamicScaleLevels.map((ratingVal) => {
                      const count = dist[ratingVal] || 0;
                      const percentage = Math.round((count / totalResponses) * 100);
                      const relativeRatio = (ratingVal - indMin) / Math.max(1, indMax - indMin);

                      return (
                        <div key={ratingVal} className="flex items-center gap-3 text-xs">
                          {/* Rating Label (Dynamic min to max) */}
                          <div className="w-12 font-mono font-bold text-muted-foreground flex items-center gap-1 shrink-0">
                            <span>{ratingVal}</span>
                            <Star className="w-3 h-3 fill-muted-foreground/30 text-muted-foreground" />
                          </div>

                          {/* Horizontal Bar */}
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

                          {/* Count & Percentage Value */}
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
