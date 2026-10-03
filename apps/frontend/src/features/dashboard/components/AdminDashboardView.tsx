import { useState } from "react";
import { useNavigate } from "react-router";
import { EvaluationCountdownWidget } from "./EvaluationCountdownWidget";
import { LiveEvaluationTicker } from "./LiveEvaluationTicker";
import { ParticipationDonutChart } from "./ParticipationDonutChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  GraduationCap,
  Calendar,
  Sparkles,
  Upload,
  BarChart3,
  Building2,
  FileCheck2,
} from "lucide-react";
import { BatchConsolidateDialog } from "@/features/evaluations/components/BatchConsolidateDialog";
import { useSemesters } from "@/features/semesters/hooks/useSemesters";
import type { DashboardOverviewStats, LiveEvaluationPulseEvent } from "@my-app/shared";

interface Props {
  data: DashboardOverviewStats;
  pulses: LiveEvaluationPulseEvent[];
}

export function AdminDashboardView({ data, pulses }: Props) {
  const navigate = useNavigate();
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const { data: semestersResponse } = useSemesters({ paginate: false });
  const semestersList = semestersResponse?.data ?? [];

  const { activeSchedule, metrics, collegeParticipation } = data;

  return (
    <div className="space-y-6">
      {/* ── Active Window Countdown ── */}
      <EvaluationCountdownWidget schedule={activeSchedule} />

      {/* ── FR-34 High-Level Metric Tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border bg-card shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Eligible Student Evaluations
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-foreground">
              {metrics.totalEnrolledStudentEvaluations.toLocaleString()}
            </span>
            <Users className="w-5 h-5 text-muted-foreground/60" />
          </div>
          <span className="text-[11px] text-muted-foreground">Total enrolled course pairings</span>
        </Card>

        <Card className="p-4 border-border bg-card shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Completed Submissions
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-primary">
              {metrics.completedStudentEvaluations.toLocaleString()}
            </span>
            <FileCheck2 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[11px] text-success font-semibold">
            {metrics.completionPercentage}% Institutional turnout
          </span>
        </Card>

        <Card className="p-4 border-border bg-card shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Evaluated Teaching Faculty
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-foreground">
              {metrics.totalFacultyEvaluated.toLocaleString()}
            </span>
            <GraduationCap className="w-5 h-5 text-muted-foreground/60" />
          </div>
          <span className="text-[11px] text-muted-foreground">Active instructors evaluated</span>
        </Card>

        <Card className="p-4 border-border bg-card shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Supervisor SEF Reviews
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold font-mono text-success">
              {metrics.totalSupervisorSubmissions.toLocaleString()}
            </span>
            <Building2 className="w-5 h-5 text-success" />
          </div>
          <span className="text-[11px] text-muted-foreground">Supervisory forms submitted</span>
        </Card>
      </div>

      {/* ── Mid Section: Live Ticker + Participation Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveEvaluationTicker pulses={pulses} isOpen={activeSchedule.isOpen} />
        </div>
        <div>
          <ParticipationDonutChart
            completed={metrics.completedStudentEvaluations}
            pending={metrics.pendingStudentEvaluations}
            percentage={metrics.completionPercentage}
          />
        </div>
      </div>

      {/* ── College Participation Comparison ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-4 h-4 text-primary" />
              <span>College Turnout & Participation</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {collegeParticipation.length} Colleges
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {collegeParticipation.map((col) => (
            <div key={col.collegeId} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">
                  <strong className="font-mono text-primary mr-1.5">{col.collegeCode}</strong>—{" "}
                  {col.collegeName}
                </span>
                <span className="font-mono text-muted-foreground">
                  {col.completed} / {col.totalExpected} ({col.percentage}%)
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, col.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Quick Action Dock ── */}
      <div className="p-4 rounded-2xl border border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-foreground">Institutional Quick Actions:</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setBatchDialogOpen(true)}
            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Consolidate Reports</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/admin/evaluation-periods")}
            className="text-xs h-8 gap-1.5 border-border bg-card"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Manage Schedules</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/admin/users")}
            className="text-xs h-8 gap-1.5 border-border bg-card"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/analytics")}
            className="text-xs h-8 gap-1.5 border-border bg-card"
          >
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <span>Deep Analytics</span>
          </Button>
        </div>
      </div>

      <BatchConsolidateDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        semesters={semestersList}
      />
    </div>
  );
}
