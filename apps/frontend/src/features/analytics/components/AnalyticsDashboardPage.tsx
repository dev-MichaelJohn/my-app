import { useState, useMemo } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { useColleges } from "@/features/colleges/hooks/useColleges";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { usePermissions } from "@/hooks/usePermissions";
import { HistoricalTrendChart } from "../components/HistoricalTrendChart";
import { DomainCompetencyView } from "../components/DomainCompetencyView";
import { DiagnosticMatrix } from "../components/DiagnosticMatrix";
import { EntityComparisonTable } from "../components/EntityComparisonTable";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Users, Sparkles, Lock } from "lucide-react";
import type { AnalyticsScope } from "@my-app/shared";

export default function AnalyticsDashboardPage() {
  const { user, isSysAdmin, isAdmin, isDean, isChair } = usePermissions();

  const isPrivilegedAdmin = isSysAdmin || isAdmin;

  // Metadata queries
  const { data: activeSemester } = useActiveSemester();
  const { data: semestersResponse } = useSemesters({ paginate: false });
  const semestersList = useMemo(() => semestersResponse?.data ?? [], [semestersResponse?.data]);

  const { data: collegesResponse } = useColleges({ paginate: false });
  const collegesList = useMemo(() => collegesResponse?.data ?? [], [collegesResponse?.data]);

  const { data: programsResponse } = usePrograms({ paginate: false });
  const allProgramsList = useMemo(() => programsResponse?.data ?? [], [programsResponse?.data]);

  // Scope Determination
  const defaultScope: AnalyticsScope = useMemo(() => {
    if (isPrivilegedAdmin) return "INSTITUTION";
    if (isDean) return "COLLEGE";
    if (isChair) return "PROGRAM";
    return "SELF";
  }, [isPrivilegedAdmin, isDean, isChair]);

  const [selectedScope, setSelectedScope] = useState<AnalyticsScope>(defaultScope);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | undefined>(undefined);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | undefined>(undefined);
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(undefined);

  // Auto-resolve entity ID based on user office if not Admin
  const resolvedEntityId = useMemo(() => {
    if (selectedScope === "SELF") return user?.account.id;
    if (selectedScope === "COLLEGE") {
      if (isDean && !isPrivilegedAdmin) return user?.offices?.deanships?.[0]?.id;
      return selectedCollegeId;
    }
    if (selectedScope === "PROGRAM") {
      if (isChair && !isPrivilegedAdmin) return user?.offices?.chairships?.[0]?.id;
      return selectedProgramId;
    }
    return undefined;
  }, [
    selectedScope,
    isDean,
    isChair,
    isPrivilegedAdmin,
    user,
    selectedCollegeId,
    selectedProgramId,
  ]);

  const currentSemesterId = selectedSemesterId ?? activeSemester?.id;

  const { data: report, isLoading } = useAnalytics({
    scope: selectedScope,
    semesterId: currentSemesterId,
    entityId: resolvedEntityId,
  });

  const availablePrograms = useMemo(() => {
    if (!selectedCollegeId) return allProgramsList;
    return allProgramsList.filter((p) => p.program.college_id === selectedCollegeId);
  }, [selectedCollegeId, allProgramsList]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Evaluations Analytics & Benchmark Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Institutional quality oversight, multi-term progress benchmarks, and pedagogical
            diagnostics.
          </p>
        </div>
      </div>

      {/* ── Filter & Scope Selector Bar ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-muted/30 border border-border rounded-2xl shadow-2xs">
        {/* Scope Selector */}
        <div className="w-full sm:w-48">
          <Select
            value={selectedScope}
            disabled={!isPrivilegedAdmin && (isDean || isChair) && selectedScope === "SELF"}
            onValueChange={(val) => setSelectedScope(val as AnalyticsScope)}
          >
            <SelectTrigger className="w-full h-9 bg-card border-border text-xs font-semibold">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              {isPrivilegedAdmin && <SelectItem value="INSTITUTION">Institution-Wide</SelectItem>}
              {(isPrivilegedAdmin || isDean) && (
                <SelectItem value="COLLEGE">College-Wide</SelectItem>
              )}
              {(isPrivilegedAdmin || isDean || isChair) && (
                <SelectItem value="PROGRAM">Program-Wide</SelectItem>
              )}
              <SelectItem value="SELF">Personal Evaluation (Self)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Semester Selector */}
        <div className="w-full sm:w-56">
          <Select
            value={currentSemesterId ? String(currentSemesterId) : ""}
            onValueChange={(val) => setSelectedSemesterId(Number(val))}
          >
            <SelectTrigger className="w-full h-9 bg-card border-border text-xs">
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              {semestersList.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.semester_term} Sem ({s.school_year_start}-{s.school_year_end})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* College Selector (When in College scope and Admin) */}
        {selectedScope === "COLLEGE" && isPrivilegedAdmin && (
          <div className="w-full sm:w-56">
            <Select
              value={selectedCollegeId ? String(selectedCollegeId) : ""}
              onValueChange={(val) => setSelectedCollegeId(Number(val))}
            >
              <SelectTrigger className="w-full h-9 bg-card border-border text-xs">
                <SelectValue placeholder="Select College" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-xs">
                {collegesList.map((c) => (
                  <SelectItem key={c.college.id} value={String(c.college.id)}>
                    {c.college.initialism} - {c.college.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Program Selector (When in Program scope and Admin or Dean) */}
        {selectedScope === "PROGRAM" && (isPrivilegedAdmin || isDean) && (
          <div className="w-full sm:w-56">
            <Select
              value={selectedProgramId ? String(selectedProgramId) : ""}
              onValueChange={(val) => setSelectedProgramId(Number(val))}
            >
              <SelectTrigger className="w-full h-9 bg-card border-border text-xs">
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-xs">
                {availablePrograms.map((p) => (
                  <SelectItem key={p.program.id} value={String(p.program.id)}>
                    {p.program.initialism} - {p.program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Anonymity Badge Notice */}
        <div className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1.5 shrink-0">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>CHED CMO 19 s. 2025 Anonymized</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center items-center">
          <Spinner size="lg" />
        </div>
      ) : !report ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card">
          <p className="text-xs text-muted-foreground">
            No analytics data found for the selected scope.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── KPI Health Strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Overall SET Rating
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-mono text-primary">
                  {report.kpis.overallSet.toFixed(2)}
                </span>
                {report.kpis.setChangePercentage !== 0 && (
                  <span
                    className={`text-xs font-bold font-mono ${
                      report.kpis.setChangePercentage > 0 ? "text-success" : "text-warning"
                    }`}
                  >
                    {report.kpis.setChangePercentage > 0
                      ? `+${report.kpis.setChangePercentage}%`
                      : `${report.kpis.setChangePercentage}%`}
                  </span>
                )}
              </div>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Supervisor SEF Rating
              </span>
              <span className="text-2xl font-extrabold font-mono text-success">
                {report.kpis.overallSef !== null ? report.kpis.overallSef.toFixed(2) : "N/A"}
              </span>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Satisfaction Rate
              </span>
              <div className="flex items-center gap-1.5 text-2xl font-extrabold font-mono text-foreground">
                <Sparkles className="w-5 h-5 text-warning" />
                <span>{report.kpis.satisfactionRate}%</span>
              </div>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Submissions
              </span>
              <div className="flex items-center gap-1.5 text-2xl font-extrabold font-mono text-foreground">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span>{report.kpis.totalEvaluations}</span>
              </div>
            </Card>
          </div>

          {/* ── Historical Trajectory & Domain Competencies ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <HistoricalTrendChart trends={report.historicalTrends} />
            </div>
            <div>
              <DomainCompetencyView competencies={report.domainCompetencies} />
            </div>
          </div>

          {/* ── Top Strengths & Growth Areas Matrix ── */}
          <DiagnosticMatrix
            topIndicators={report.diagnostics.topIndicators}
            lowestIndicators={report.diagnostics.lowestIndicators}
          />

          {/* ── College / Program Ranking & Breakdown Table ── */}
          <EntityComparisonTable breakdown={report.breakdown} scope={report.scope} />
        </div>
      )}
    </div>
  );
}
