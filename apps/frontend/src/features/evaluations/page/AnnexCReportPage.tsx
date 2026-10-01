import { useState, useMemo, useEffect } from "react";
import {
  useAnnexCReport,
  useFacultyReportsList,
  useRecalculateAnnexCReport,
  useBatchConsolidateReports,
  useUpdateReportStatus,
} from "../hooks/useEvaluationSubmissions";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { useColleges } from "@/features/colleges/hooks/useColleges";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { ReportFilters } from "../components/ReportFilters";
import { ReportTableView } from "../components/ReportTableView";
import { ReportGridView } from "../components/ReportGridView";
import { AnnexCDocument } from "../components/AnnexCDocument";
import { AnnexDDocument } from "../components/AnnexDDocument";
import { ReportAnalyticsDocument } from "../components/ReportAnalyticsDocument";
import { ReportLifecycleBar } from "../components/ReportLifecycleBar";
import { toast } from "sonner";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import type { AnnexCFacultyReport, FacultyReportQuery, ReportStatus } from "@my-app/shared";

export default function AnnexCReportPage() {
  const { user, isSysAdmin, isAdmin, isSupervisor } = usePermissions();
  const isPrivileged = isSysAdmin || isAdmin || isSupervisor;

  // Metadata queries
  const { data: activeSemester } = useActiveSemester();
  const { data: semestersResponse } = useSemesters({ paginate: false });
  const semestersList = semestersResponse?.data ?? [];

  const { data: collegesResponse } = useColleges({ paginate: false });
  const collegesList = collegesResponse?.data ?? [];

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
  const [activeDocTab, setActiveDocTab] = useState<"annex-c" | "analytics" | "annex-d">("annex-c");

  // Query for Reports List
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
    selectedFacultyId ?? (isPrivileged ? undefined : user?.account.id);

  const {
    data: activeReport,
    isLoading: isLoadingReport,
    refetch: refetchReport,
  } = useAnnexCReport(currentSemesterId, effectiveDetailFacultyId || undefined);

  // Mutations
  const recalculateMutation = useRecalculateAnnexCReport();
  const batchMutation = useBatchConsolidateReports();
  const updateStatusMutation = useUpdateReportStatus();
  const [confirmBatchOpen, setConfirmBatchOpen] = useState(false);

  const handleOpenDetail = (report: AnnexCFacultyReport) => {
    setSelectedReportId(report.id);
    setSelectedFacultyId(report.faculty_id);
    setActiveDocTab("annex-c");
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

  const handleRunBatchConsolidation = async () => {
    if (!currentSemesterId) return;
    try {
      const summary = await batchMutation.mutateAsync({
        semester_id: currentSemesterId,
      });
      toast.success(summary.message);
      setConfirmBatchOpen(false);
      refetchList();
    } catch (err: any) {
      toast.error(err.message || "Failed to run batch consolidation.");
      setConfirmBatchOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. LIST VIEW (Default Landing)                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!selectedReportId ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Faculty Evaluation Reports & Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse consolidated IFER (Annex C), category/indicator analytics, and FEDAF (Annex D)
              plans by college and program.
            </p>
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
          />

          {isLoadingList ? (
            <div className="py-20 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : viewMode === "table" ? (
            <ReportTableView reports={reportsList} onSelectReport={handleOpenDetail} />
          ) : (
            <ReportGridView reports={reportsList} onSelectReport={handleOpenDetail} />
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
        /* ══════════════════════════════════════════════════════════════════ */
        /* 2. REPORT DETAIL VIEW (Drilldown)                                  */
        /* ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {activeReport && (
            <ReportLifecycleBar
              report={activeReport}
              onBack={handleBackToList}
              onStatusChange={handleStatusChange}
              onRecalculate={handleRecalculate}
              onBatchConsolidateClick={() => setConfirmBatchOpen(true)}
              isRecalculating={recalculateMutation.isPending}
            />
          )}

          {/* Document Tabs */}
          <div className="flex gap-2 border-b border-border pb-1 print:hidden">
            <button
              type="button"
              onClick={() => setActiveDocTab("annex-c")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeDocTab === "annex-c"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Annex C — Individual Report (IFER)
            </button>
            <button
              type="button"
              onClick={() => setActiveDocTab("analytics")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeDocTab === "analytics"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Analytics (Per Category & Indicator)
            </button>
            <button
              type="button"
              onClick={() => setActiveDocTab("annex-d")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeDocTab === "annex-d"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Annex D — Acknowledgment & Plan (FEDAF)
            </button>
          </div>

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
            <div>
              <div className={activeDocTab === "annex-c" ? "block" : "hidden print:block"}>
                <AnnexCDocument report={activeReport} />
              </div>

              <div className={activeDocTab === "analytics" ? "block" : "hidden"}>
                <ReportAnalyticsDocument report={activeReport} />
              </div>

              <div
                className={
                  activeDocTab === "annex-d"
                    ? "block"
                    : "hidden print:block print:break-before-page"
                }
              >
                <AnnexDDocument
                  report={activeReport}
                  currentUser={user}
                  isPrivileged={Boolean(isPrivileged)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Consolidation Modal */}
      <ConfirmActionDialog
        open={confirmBatchOpen}
        onOpenChange={setConfirmBatchOpen}
        title="Run Batch Consolidation for Semester?"
        description="This will recalculate and compile Annex C and SEF scores for all faculty who taught course offerings in this semester."
        confirmLabel="Run Batch Consolidation"
        variant="primary"
        isLoading={batchMutation.isPending}
        onConfirm={handleRunBatchConsolidation}
      />
    </div>
  );
}
