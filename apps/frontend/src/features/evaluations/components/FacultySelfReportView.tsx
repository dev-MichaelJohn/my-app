import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { AnnexDDocument } from "./AnnexDDocument";
import { ReportAnalyticsCharts } from "./ReportAnalyticsCharts";
import { SentimentBadge } from "./SentimentBadge";
import { downloadAnnexDPdf } from "../lib/report-export.lib";
import { getDynamicRatingDescriptor } from "@/lib/format.lib";
import {
  Download,
  Clock,
  GraduationCap,
  CheckCircle,
  MessageSquare,
  Smile,
  Frown,
  Meh,
  Users,
  UserCheck,
} from "lucide-react";
import type { AnnexCFacultyReport, GetUser, ISemesterSelect } from "@my-app/shared";

interface Props {
  report?: AnnexCFacultyReport | null | undefined;
  isLoading: boolean;
  user?: GetUser | null | undefined;
  semesters: ISemesterSelect[];
  selectedSemesterId?: number | undefined;
  onSemesterChange: (id: number) => void;
}

type SentimentFilter = "ALL" | "POSITIVE" | "NEGATIVE" | "OTHER";

export function FacultySelfReportView({
  report,
  isLoading,
  user,
  semesters,
  selectedSemesterId,
  onSemesterChange,
}: Props) {
  const [commentCategory, setCommentCategory] = useState<SentimentFilter>("ALL");
  const currentSemester = semesters.find((s) => s.id === selectedSemesterId);

  const isSupervisorSigned = Boolean(report?.fedaf_plan?.supervisor_signed_at);
  const isFacultySigned = Boolean(report?.fedaf_plan?.faculty_signed_at);

  const commentCounts = useMemo(() => {
    const comments = report?.student_comments ?? [];
    return {
      all: comments.length,
      positive: comments.filter((c) => c.sentiment === "POSITIVE").length,
      negative: comments.filter((c) => c.sentiment === "NEGATIVE").length,
      other: comments.filter((c) => c.sentiment === "NEUTRAL" || c.sentiment === "MIXED").length,
    };
  }, [report?.student_comments]);

  const filteredComments = useMemo(() => {
    const comments = report?.student_comments ?? [];
    if (commentCategory === "POSITIVE") {
      return comments.filter((c) => c.sentiment === "POSITIVE");
    }
    if (commentCategory === "NEGATIVE") {
      return comments.filter((c) => c.sentiment === "NEGATIVE");
    }
    if (commentCategory === "OTHER") {
      return comments.filter((c) => c.sentiment === "NEUTRAL" || c.sentiment === "MIXED");
    }
    return comments;
  }, [report?.student_comments, commentCategory]);

  const renderStatusBadge = () => {
    if (!report) return null;

    if (isSupervisorSigned && isFacultySigned) {
      return (
        <Badge className="bg-success/15 text-success border-success/30 font-bold text-[10px] gap-1">
          <CheckCircle className="w-3 h-3" /> Fully Signed & Certified
        </Badge>
      );
    }

    if (report.status === "PUBLISHED" || isSupervisorSigned) {
      return (
        <Badge className="bg-info/15 text-info border-info/30 font-bold text-[10px] gap-1">
          <Clock className="w-3 h-3" /> Published (Awaiting Your Signature)
        </Badge>
      );
    }

    return (
      <Badge className="bg-warning/15 text-warning border-warning/30 font-bold text-[10px] gap-1">
        <Clock className="w-3 h-3" /> Pending Supervisory Review
      </Badge>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* ── Personalized Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              My Performance Summary & FEDAF
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.details.first_name} {user?.details.last_name} ({user?.details.institutional_id}
              )
            </p>
          </div>
        </div>

        {/* Semester Switcher */}
        <div className="w-full sm:w-64">
          <Select
            value={selectedSemesterId ? String(selectedSemesterId) : ""}
            onValueChange={(val) => val && onSemesterChange(Number(val))}
          >
            <SelectTrigger className="w-full bg-background border-input text-xs h-9">
              <SelectValue placeholder="Select Semester">
                {currentSemester ? (
                  <span className="truncate block text-left">
                    <strong className="text-primary mr-1">
                      {currentSemester.semester_term} Sem
                    </strong>
                    <span className="text-muted-foreground">
                      ({currentSemester.school_year_start}-{currentSemester.school_year_end})
                    </span>
                  </span>
                ) : (
                  "Select Semester"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Content States ── */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-muted-foreground animate-pulse">
            Loading performance summary & evaluation indicators...
          </p>
        </div>
      ) : !report ? (
        <div className="text-center py-20 px-6 border border-dashed border-border rounded-2xl bg-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-warning/10 text-warning mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">
            Performance Report Pending Supervisory Review
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your evaluation results for the{" "}
            <strong>{currentSemester?.semester_term} Semester</strong> are currently being processed
            by your academic supervisor.
          </p>
          <p className="text-[11px] text-muted-foreground/80 max-w-md mx-auto">
            Under CHED CMO 19 s. 2025, your supervisor conducts a personal feedback conference
            before formulating and publishing your official FEDAF development plan (Annex D).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── 1. High-Level Performance KPI Strip ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Student Index (SET)
              </span>
              <span className="text-2xl font-extrabold font-mono text-primary block">
                {report.overall_set_rating.toFixed(2)}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {getDynamicRatingDescriptor(
                  Math.round(report.overall_set_rating),
                  report.min_rating ?? 1,
                  report.max_rating ?? 5,
                )}
              </span>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-success" /> Supervisor Index (SEF)
              </span>
              <span className="text-2xl font-extrabold font-mono text-success block">
                {report.overall_sef_rating !== null ? report.overall_sef_rating.toFixed(2) : "N/A"}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {report.overall_sef_rating !== null
                  ? getDynamicRatingDescriptor(
                      Math.round(report.overall_sef_rating),
                      report.min_rating ?? 1,
                      report.max_rating ?? 5,
                    )
                  : "Awaiting supervisory appraisal"}
              </span>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                FEDAF Document Status
              </span>
              <div>{renderStatusBadge()}</div>
              <span className="text-[11px] text-muted-foreground block">
                {report.semester_term} ({report.school_year})
              </span>
            </Card>
          </div>

          {/* ── 2. Per-Indicator & Category Analytics ── */}
          <ReportAnalyticsCharts report={report} />

          {/* ── 3. Categorized Qualitative Feedback & Comments ── */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>Categorized Qualitative Feedback</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Anonymous student feedback categorized by sentiment polarity, alongside
                    supervisory remarks.
                  </CardDescription>
                </div>

                <Tabs
                  value={commentCategory}
                  onValueChange={(val) => setCommentCategory(val as SentimentFilter)}
                >
                  <TabsList className="bg-muted border border-border h-8 p-0.5">
                    <TabsTrigger value="ALL" className="text-[11px] px-2.5 h-7">
                      All ({commentCounts.all})
                    </TabsTrigger>
                    <TabsTrigger value="POSITIVE" className="text-[11px] px-2.5 h-7 gap-1">
                      <Smile className="w-3 h-3 text-success" />
                      Positive ({commentCounts.positive})
                    </TabsTrigger>
                    <TabsTrigger value="NEGATIVE" className="text-[11px] px-2.5 h-7 gap-1">
                      <Frown className="w-3 h-3 text-destructive" />
                      Negative ({commentCounts.negative})
                    </TabsTrigger>
                    <TabsTrigger value="OTHER" className="text-[11px] px-2.5 h-7 gap-1">
                      <Meh className="w-3 h-3 text-warning" />
                      Neutral/Mixed ({commentCounts.other})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
              {/* Student Feedback Cards */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Student Comments & Suggestions
                </h4>

                {filteredComments.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-xl bg-muted/20">
                    <p className="text-xs text-muted-foreground italic">
                      No student comments recorded in this category.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredComments.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-border/80 bg-background text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <SentimentBadge classification={tc.sentiment} score={tc.score} />
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Excerpt #{idx + 1}
                          </span>
                        </div>
                        <p className="text-foreground italic leading-relaxed">"{tc.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supervisor Remarks */}
              <div className="space-y-2.5 pt-3 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Supervisory Remarks & Recommendations
                </h4>
                {report.supervisor_comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No supervisor remarks recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {report.supervisor_comments.map((sc, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {sc.evaluator_name} ({sc.evaluator_role})
                          </span>
                          <span>{new Date(sc.submitted_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-foreground leading-relaxed">{sc.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── 4. FEDAF Download Bar + Annex D Document ── */}
          <div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Document
                </span>
                <span className="text-sm font-bold text-foreground">Annex D — FEDAF Form</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Status
                </span>
                {renderStatusBadge()}
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => downloadAnnexDPdf(report)}
              className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official FEDAF (Annex D)</span>
            </Button>
          </div>

          <AnnexDDocument report={report} currentUser={user} isPrivileged={false} />
        </div>
      )}
    </div>
  );
}
