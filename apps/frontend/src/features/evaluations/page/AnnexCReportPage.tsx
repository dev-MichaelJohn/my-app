import { useState, useMemo, useEffect } from "react";
import {
  useAnnexCReport,
  useFacultyReportsList,
  useRecalculateAnnexCReport,
  useUpdateReportStatus,
} from "../hooks/useEvaluationSubmissions";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { useColleges } from "@/features/colleges/hooks/useColleges";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ReportFilters } from "../components/ReportFilters";
import { ReportTableView } from "../components/ReportTableView";
import { ReportGridView } from "../components/ReportGridView";
import { ReportAnalyticsCharts } from "../components/ReportAnalyticsCharts";
import { FedafActionSection } from "../components/FedafActionSection";
import { ReportLifecycleBar } from "../components/ReportLifecycleBar";
import { FacultySelfReportView } from "../components/FacultySelfReportView";
import { BatchConsolidateDialog } from "../components/BatchConsolidateDialog";
import { Can } from "@/components/Can";
import { toast } from "sonner";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Sparkles } from "lucide-react";
import {
  PERMISSIONS,
  type AnnexCFacultyReport,
  type FacultyReportQuery,
  type ReportStatus,
} from "@my-app/shared";
import { Badge } from "@/components/ui/badge";

export default function AnnexCReportPage() {
  const { user, hasAnyPermission, isSysAdmin, isAdmin, isSupervisor, isFaculty, isDean, isChair } =
    usePermissions();
  const isPrivileged = isSysAdmin || isAdmin || isSupervisor;
  const isPrivilegedAdmin = isSysAdmin || isAdmin;
  const isPlainFaculty = isFaculty && !isSupervisor && !isAdmin && !isSysAdmin;

  // Metadata queries
  const { data: activeSemester } = useActiveSemester();
  const { data: semestersResponse } = useSemesters({ paginate: false });
  const semestersList = useMemo(() => semestersResponse?.data ?? [], [semestersResponse?.data]);

  const { data: collegesResponse } = useColleges({ paginate: false });
  const collegesList = useMemo(() => collegesResponse?.data ?? [], [collegesResponse?.data]);

  const { data: programsResponse } = usePrograms({ paginate: false });
  const allProgramsList = useMemo(() => programsResponse?.data ?? [], [programsResponse?.data]);

  // Filter States
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | undefined>(undefined);
  const currentSemesterId = selectedSemesterId ?? activeSemester?.id;

  const [selectedCollegeId, setSelectedCollegeId] = useState<number | undefined>(undefined);
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "ALL">("ALL");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [paginate, setPaginate] = useState(true);

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("reports_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("reports_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Scoped programs anchored to chosen college
  const availablePrograms = useMemo(() => {
    if (!selectedCollegeId) return allProgramsList;
    return allProgramsList.filter((p) => p.program.college_id === selectedCollegeId);
  }, [selectedCollegeId, allProgramsList]);

  // Selected Report State (Drilldown)
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);

  // Batch Consolidation Dialog State
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  // ── Query for Admin / Supervisor Reports List ──
  const listQuery: FacultyReportQuery = useMemo(
    () => ({
      paginate,
      page,
      limit,
      search: debouncedSearch,
      semester_id: currentSemesterId,
      college_id: selectedCollegeId,
      program_id: selectedProgramId,
      status: selectedStatus === "ALL" ? undefined : selectedStatus,
      sort_by: "created_at",
      order: "desc",
    }),
    [
      paginate,
      page,
      limit,
      debouncedSearch,
      currentSemesterId,
      selectedCollegeId,
      selectedProgramId,
      selectedStatus,
    ],
  );

  const {
    data: reportsListResponse,
    isLoading: isLoadingList,
    refetch: refetchList,
  } = useFacultyReportsList(listQuery);

  const reportsList = reportsListResponse?.data ?? [];
  const pagination = reportsListResponse?.pagination;

  // Single Report Detailed View Query
  const effectiveDetailFacultyId =
    selectedFacultyId ?? (isPlainFaculty ? user?.account.id : undefined);

  const {
    data: activeReport,
    isLoading: isLoadingReport,
    refetch: refetchReport,
  } = useAnnexCReport(
    currentSemesterId,
    effectiveDetailFacultyId || undefined,
    Boolean(effectiveDetailFacultyId),
  );

  // Mutations
  const recalculateMutation = useRecalculateAnnexCReport();
  const updateStatusMutation = useUpdateReportStatus();

  const handleOpenDetail = (report: AnnexCFacultyReport) => {
    setSelectedReportId(report.id);
    setSelectedFacultyId(report.faculty_id);
  };

  const handleBackToList = () => {
    setSelectedReportId(null);
    setSelectedFacultyId(null);
    refetchList();
  };

  const handleRecalculate = async () => {
    if (!activeReport) return;
    try {
      await recalculateMutation.mutateAsync({
        semester_id: activeReport.semester_id,
        faculty_id: activeReport.faculty_id,
        formula: activeReport.calculation_formula,
      });
      toast.success("Report recalculated successfully.");
      refetchReport();
    } catch (err: any) {
      toast.error(err.message || "Failed to recalculate report.");
    }
  };

  const handleStatusChange = async (nextStatus: ReportStatus) => {
    if (!activeReport) return;
    try {
      await updateStatusMutation.mutateAsync({
        reportId: activeReport.id,
        status: nextStatus,
      });
      toast.success(`Report status updated to ${nextStatus}.`);
      refetchReport();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // BRANCH A: PLAIN FACULTY MEMBER (Dedicated Instructor Portal)
  // ══════════════════════════════════════════════════════════════════════════
  if (isPlainFaculty) {
    return (
      <div className="space-y-6 pb-24">
        <FacultySelfReportView
          report={activeReport}
          isLoading={isLoadingReport}
          user={user}
          semesters={semestersList}
          selectedSemesterId={currentSemesterId}
          onSemesterChange={(id) => setSelectedSemesterId(id)}
        />
      </div>
    );
  }

  const canConsolidate = hasAnyPermission([
    PERMISSIONS.EVALUATION_REPORT_BATCH_GENERATE,
    PERMISSIONS.EVALUATION_REPORT_GENERATE,
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // BRANCH B: ADMINS & SUPERVISORS (Scoped Browser & Drilldown)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {!selectedReportId ? (
        <div className="space-y-6">
          {/* 🚀 Header with Generate / Consolidate Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Faculty Evaluation Reports & Analytics
                </h1>
                {isDean && !isSysAdmin && !isAdmin && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary text-xs font-semibold"
                  >
                    Supervising: Program Chairs
                  </Badge>
                )}
                {isChair && !isSysAdmin && !isAdmin && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary text-xs font-semibold"
                  >
                    Supervising: Department Faculty
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isDean && !isSysAdmin && !isAdmin
                  ? "Evaluating performance and FEDAF plans of Program Chairs under your college."
                  : isChair && !isSysAdmin && !isAdmin
                    ? "Evaluating performance and FEDAF plans of faculty teaching under your academic program."
                    : "Browse consolidated teaching performance reports, category charts, and FEDAF plans."}
              </p>
            </div>

            <Can
              anyPermission={[
                PERMISSIONS.EVALUATION_REPORT_BATCH_GENERATE,
                PERMISSIONS.EVALUATION_REPORT_GENERATE,
              ]}
              anyRole={["SYS_ADMIN", "ADMIN"]}
            >
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setBatchDialogOpen(true)}
                  className="gap-2 h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate / Consolidate Reports</span>
                </Button>
              </div>
            </Can>
          </div>

          <ReportFilters
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            selectedSemesterId={currentSemesterId}
            onSemesterChange={(id) => {
              setSelectedSemesterId(id);
              setPage(1);
            }}
            semesters={semestersList}
            selectedCollegeId={selectedCollegeId}
            onCollegeChange={(id) => {
              setSelectedCollegeId(id);
              setSelectedProgramId(undefined);
              setPage(1);
            }}
            colleges={collegesList}
            selectedProgramId={selectedProgramId}
            onProgramChange={(id) => {
              setSelectedProgramId(id);
              setPage(1);
            }}
            availablePrograms={availablePrograms}
            selectedStatus={selectedStatus}
            onStatusChange={(status) => {
              setSelectedStatus(status);
              setPage(1);
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            paginate={paginate}
            onPaginateChange={setPaginate}
            limit={limit}
            onLimitChange={setLimit}
            isDean={isDean}
            isChair={isChair}
            isPrivilegedAdmin={isPrivilegedAdmin}
          />

          {isLoadingList ? (
            <div className="py-20 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : viewMode === "table" ? (
            <ReportTableView
              reports={reportsList}
              onSelectReport={handleOpenDetail}
              onGenerateClick={() => setBatchDialogOpen(true)}
              canGenerate={canConsolidate}
            />
          ) : (
            <ReportGridView
              reports={reportsList}
              onSelectReport={handleOpenDetail}
              onGenerateClick={() => setBatchDialogOpen(true)}
              canGenerate={canConsolidate}
            />
          )}

          {/* Pagination */}
          {paginate && pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <span>
                Showing{" "}
                <strong className="text-foreground">
                  {reportsList.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {Math.min(pagination.currentPage * limit, pagination.totalItems)}
                </strong>{" "}
                of <strong className="text-foreground">{pagination.totalItems}</strong> report(s)
              </span>

              <div className="flex items-center gap-1.5">
                <span className="mr-2">
                  Page <strong className="text-foreground">{pagination.currentPage}</strong> of{" "}
                  <strong className="text-foreground">{Math.max(1, pagination.totalPage)}</strong>
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 gap-1"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 gap-1"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage(pagination.totalPage)}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Report Detail View */
        <div className="space-y-6">
          {activeReport && (
            <ReportLifecycleBar
              report={activeReport}
              currentUser={user}
              onBack={handleBackToList}
              onStatusChange={handleStatusChange}
              onRecalculate={handleRecalculate}
              onBatchConsolidateClick={() => setBatchDialogOpen(true)}
              isRecalculating={recalculateMutation.isPending}
            />
          )}

          {isLoadingReport ? (
            <div className="py-24 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : !activeReport ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card">
              <p className="text-muted-foreground">Unable to load the selected report.</p>
              <Button onClick={handleBackToList} className="mt-4" size="sm">
                Back to Reports
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Faculty Summary Card */}
              <div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">
                    {activeReport.faculty_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeReport.department_college} • {activeReport.semester_term} (
                    {activeReport.school_year})
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      SET Score (Students)
                    </span>
                    <span className="text-base font-extrabold font-mono text-primary">
                      {activeReport.overall_set_rating.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      SEF Score (Supervisor)
                    </span>
                    <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {activeReport.overall_sef_rating !== null
                        ? activeReport.overall_sef_rating.toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Analytics */}
              <ReportAnalyticsCharts report={activeReport} />

              {/* Interactive FEDAF Action Center */}
              <FedafActionSection
                report={activeReport}
                currentUser={user}
                isPrivileged={Boolean(isPrivileged)}
              />
            </div>
          )}
        </div>
      )}

      {/* 🚀 Dedicated Batch Consolidation Dialog (with nested Friction modal) */}
      <BatchConsolidateDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        semesters={semestersList}
        defaultSemesterId={currentSemesterId}
        onSuccess={() => refetchList()}
      />
    </div>
  );
}
