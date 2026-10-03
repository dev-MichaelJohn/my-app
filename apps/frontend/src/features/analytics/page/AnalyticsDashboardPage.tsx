import { useState, useMemo } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { useColleges } from "@/features/colleges/hooks/useColleges";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { usePermissions } from "@/hooks/usePermissions";
import { HistoricalTrendChart } from "../components/HistoricalTrendChart";
import { EntityComparisonBarChart } from "../components/EntityComparisonBarChart";
import { DomainCompetencyView } from "../components/DomainCompetencyView";
import { DiagnosticMatrix } from "../components/DiagnosticMatrix";
import { EntityComparisonTable } from "../components/EntityComparisonTable";
import { AnalyticsMethodologyNotice } from "../components/AnalyticsMethodologyNotice";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Users, Building2, GraduationCap, Lock, ArrowUpDown, BookOpen } from "lucide-react";
import type { AnalyticsScope } from "@my-app/shared";

export default function AnalyticsDashboardPage() {
  const { user, isSysAdmin, isAdmin, isDean, isChair, isFaculty } = usePermissions();
  const isPrivilegedAdmin = isSysAdmin || isAdmin;

  // Metadata queries
  const { data: activeSemester } = useActiveSemester();
  const { data: semestersResponse } = useSemesters({ paginate: false });
  const semestersList = useMemo(() => semestersResponse?.data ?? [], [semestersResponse?.data]);

  const { data: collegesResponse } = useColleges({ paginate: false });
  const collegesList = useMemo(() => collegesResponse?.data ?? [], [collegesResponse?.data]);

  const { data: programsResponse } = usePrograms({ paginate: false });
  const allProgramsList = useMemo(() => programsResponse?.data ?? [], [programsResponse?.data]);

  // Determine initial scope based on authenticated role
  const defaultScope: AnalyticsScope = useMemo(() => {
    if (isPrivilegedAdmin) return "INSTITUTION";
    if (isDean) return "COLLEGE";
    if (isChair) return "PROGRAM";
    if (isFaculty) return "SELF";
    return "INSTITUTION"; // Fallback for pure admins or non-faculty roles
  }, [isPrivilegedAdmin, isDean, isChair, isFaculty]);

  const [scope, setScope] = useState<AnalyticsScope>(defaultScope);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | undefined>(undefined);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | undefined>(undefined);
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(undefined);

  // Derive resolved College ID during render (no useEffect setState)
  const resolvedCollegeId = useMemo(() => {
    if (isDean && !isPrivilegedAdmin) {
      return user?.offices?.deanships?.[0]?.id;
    }
    return selectedCollegeId ?? collegesList[0]?.college.id;
  }, [isDean, isPrivilegedAdmin, user, selectedCollegeId, collegesList]);

  // Available programs under the resolved college
  const availablePrograms = useMemo(() => {
    if (!resolvedCollegeId) return allProgramsList;
    return allProgramsList.filter((p) => p.program.college_id === resolvedCollegeId);
  }, [resolvedCollegeId, allProgramsList]);

  // Derive resolved Program ID during render (no useEffect setState)
  const resolvedProgramId = useMemo(() => {
    if (isChair && !isPrivilegedAdmin) {
      return user?.offices?.chairships?.[0]?.id;
    }
    return selectedProgramId ?? availablePrograms[0]?.program.id;
  }, [isChair, isPrivilegedAdmin, user, selectedProgramId, availablePrograms]);

  const currentSemesterId = selectedSemesterId ?? activeSemester?.id;
  const currentSemesterObj = semestersList.find((s) => s.id === currentSemesterId);

  // Active query parameters
  const queryParams = useMemo(() => {
    return {
      scope,
      semesterId: currentSemesterId,
      collegeId: resolvedCollegeId,
      programId: resolvedProgramId,
      facultyId: scope === "SELF" ? user?.account.id : undefined,
    };
  }, [scope, currentSemesterId, resolvedCollegeId, resolvedProgramId, user]);

  const { data: report, isLoading } = useAnalytics(queryParams);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Analytics & Quality Benchmark Suite
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Multi-semester historical performance, SET-SEF perceptual alignment, and departmental
          comparisons.
        </p>
      </div>

      {/* ── Role-Tailored Navigation Tabs ── */}
      <div className="flex border-b border-border overflow-x-auto">
        {/* 1. Institution-Wide Tab (Admin only) */}
        {isPrivilegedAdmin && (
          <button
            type="button"
            onClick={() => {
              setScope("INSTITUTION");
              setSelectedCollegeId(undefined);
              setSelectedProgramId(undefined);
            }}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              scope === "INSTITUTION"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>University Overview</span>
          </button>
        )}

        {/* 2. College Analytics Tab (Admin & Dean) */}
        {(isPrivilegedAdmin || isDean) && (
          <button
            type="button"
            onClick={() => {
              setScope("COLLEGE");
              if (isDean) setSelectedCollegeId(user?.offices?.deanships?.[0]?.id);
              setSelectedProgramId(undefined);
            }}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              scope === "COLLEGE"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4 text-primary" />
            <span>{isDean ? "My College Overview" : "College Comparison"}</span>
          </button>
        )}

        {/* 3. Program Analytics Tab (Admin, Dean & Chair) */}
        {(isPrivilegedAdmin || isDean || isChair) && (
          <button
            type="button"
            onClick={() => {
              setScope("PROGRAM");
              if (isChair) setSelectedProgramId(user?.offices?.chairships?.[0]?.id);
            }}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              scope === "PROGRAM"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4 text-success" />
            <span>{isChair ? "My Program Overview" : "Program Comparison"}</span>
          </button>
        )}

        {/* 4. Faculty Self Tab (All teaching personnel) */}
        {isFaculty && (
          <button
            type="button"
            onClick={() => setScope("SELF")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              scope === "SELF"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-primary" />
            <span>My Teaching Analytics</span>
          </button>
        )}
      </div>

      {/* ── Context & Dropdown Filters Bar ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-muted/30 border border-border rounded-2xl shadow-2xs">
        {/* Semester Selector */}
        <div className="w-full sm:w-64">
          <Select
            value={currentSemesterId ? String(currentSemesterId) : ""}
            onValueChange={(val) => setSelectedSemesterId(val ? Number(val) : undefined)}
          >
            <SelectTrigger className="w-full h-9 bg-card border-border text-xs">
              <SelectValue placeholder="Select Semester">
                {currentSemesterObj ? (
                  <span className="truncate block text-left">
                    <strong className="text-primary mr-1">
                      {currentSemesterObj.semester_term} Sem
                    </strong>
                    <span className="text-muted-foreground">
                      (A.Y. {currentSemesterObj.school_year_start}-
                      {currentSemesterObj.school_year_end})
                    </span>
                  </span>
                ) : (
                  "Select Semester"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              {semestersList.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* College Selector (When Admin views College or Program scope) */}
        {(scope === "COLLEGE" || scope === "PROGRAM") && isPrivilegedAdmin && (
          <div className="w-full sm:w-60">
            <Select
              value={resolvedCollegeId ? String(resolvedCollegeId) : ""}
              onValueChange={(val) => {
                setSelectedCollegeId(val ? Number(val) : undefined);
                setSelectedProgramId(undefined);
              }}
            >
              <SelectTrigger className="w-full h-9 bg-card border-border text-xs">
                <SelectValue placeholder="Select College">
                  {(() => {
                    const c = collegesList.find((col) => col.college.id === resolvedCollegeId);
                    return c ? (
                      <span className="truncate block text-left">
                        <strong className="font-mono text-primary mr-1">
                          {c.college.initialism}
                        </strong>
                        <span className="text-muted-foreground">({c.college.name})</span>
                      </span>
                    ) : (
                      "Select College"
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-xs">
                {collegesList.map((c) => (
                  <SelectItem key={c.college.id} value={String(c.college.id)}>
                    <span className="font-bold font-mono mr-1.5 text-primary">
                      {c.college.initialism}
                    </span>
                    - {c.college.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Program Selector (When Admin/Dean views Program scope) */}
        {scope === "PROGRAM" && (isPrivilegedAdmin || isDean) && (
          <div className="w-full sm:w-60">
            <Select
              value={resolvedProgramId ? String(resolvedProgramId) : ""}
              onValueChange={(val) => setSelectedProgramId(val ? Number(val) : undefined)}
            >
              <SelectTrigger className="w-full h-9 bg-card border-border text-xs">
                <SelectValue placeholder="Select Program">
                  {(() => {
                    const p = availablePrograms.find(
                      (prog) => prog.program.id === resolvedProgramId,
                    );
                    return p ? (
                      <span className="truncate block text-left">
                        <strong className="font-mono text-primary mr-1">
                          {p.program.initialism}
                        </strong>
                        <span className="text-muted-foreground">({p.program.name})</span>
                      </span>
                    ) : (
                      "Select Program"
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-xs">
                {availablePrograms.map((p) => (
                  <SelectItem key={p.program.id} value={String(p.program.id)}>
                    <span className="font-bold font-mono mr-1.5 text-primary">
                      {p.program.initialism}
                    </span>
                    - {p.program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
            No analytics data recorded for the selected scope.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Active Scope Banner ── */}
          <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Active Focus:</span>
            <span className="font-bold text-foreground font-mono">
              {report.scopeEntityName || report.scope}
            </span>
          </div>

          {/* ── KPI Health Strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Student Index (SET)
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
                Supervisor Index (SEF)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-mono text-success">
                  {report.kpis.overallSef !== null ? report.kpis.overallSef.toFixed(2) : "N/A"}
                </span>
                {report.kpis.sefChangePercentage !== 0 && (
                  <span
                    className={`text-xs font-bold font-mono ${
                      report.kpis.sefChangePercentage > 0 ? "text-success" : "text-warning"
                    }`}
                  >
                    {report.kpis.sefChangePercentage > 0
                      ? `+${report.kpis.sefChangePercentage}%`
                      : `${report.kpis.sefChangePercentage}%`}
                  </span>
                )}
              </div>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Perception Gap (SEF − SET)
              </span>
              <div className="flex items-center gap-1.5 text-2xl font-extrabold font-mono">
                <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
                <span
                  className={
                    report.kpis.perceptionGap !== null && report.kpis.perceptionGap > 0
                      ? "text-info"
                      : report.kpis.perceptionGap !== null && report.kpis.perceptionGap < 0
                        ? "text-warning"
                        : "text-foreground"
                  }
                >
                  {report.kpis.perceptionGap !== null
                    ? `${report.kpis.perceptionGap > 0 ? "+" : ""}${report.kpis.perceptionGap.toFixed(2)}`
                    : "—"}
                </span>
              </div>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Evaluations Volume
              </span>
              <div className="flex items-center gap-1.5 text-2xl font-extrabold font-mono text-foreground">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span>{report.kpis.totalEvaluations}</span>
              </div>
            </Card>
          </div>

          <AnalyticsMethodologyNotice />

          {/* ── 1. Grouped Bar Comparison (Colleges or Programs) ── */}
          {report.comparisons.length > 0 && (
            <EntityComparisonBarChart
              data={report.comparisons}
              title={
                scope === "INSTITUTION"
                  ? "College-Level SET vs. SEF Comparative Performance"
                  : "Program-Level SET vs. SEF Departmental Bar Comparison"
              }
              subtitle={
                scope === "INSTITUTION"
                  ? "Direct side-by-side comparison of student ratings (SET) and supervisor scores (SEF) across all colleges."
                  : "Direct side-by-side comparison of student ratings and supervisor scores across academic programs."
              }
            />
          )}

          {/* ── 2. Historical Longitudinal Trajectory (Dual Lines with Baselines) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <HistoricalTrendChart trends={report.historicalTrends} />
            </div>
            <div>
              <DomainCompetencyView competencies={report.domainCompetencies} />
            </div>
          </div>

          {/* ── 3. Top Strengths & Growth Areas ── */}
          <DiagnosticMatrix
            topIndicators={report.diagnostics.topIndicators}
            lowestIndicators={report.diagnostics.lowestIndicators}
          />

          {/* ── 4. Ranking & Grade Distribution Matrix ── */}
          {report.comparisons.length > 0 && (
            <EntityComparisonTable breakdown={report.comparisons} scope={report.scope} />
          )}
        </div>
      )}
    </div>
  );
}
