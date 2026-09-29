import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  FileCheck2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useStudentSchedules,
  useDeleteStudentSchedule,
  useRestoreStudentSchedule,
  useForceStopStudentSchedule,
  useSupervisorSchedules,
  useDeleteSupervisorSchedule,
  useRestoreSupervisorSchedule,
  useForceStopSupervisorSchedule,
} from "../hooks/useEvaluationSchedules";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import {
  useStudentForms,
  useSupervisorForms,
} from "@/features/evaluations/hooks/useEvaluationInstruments";
import { EvaluationScheduleTableView } from "../components/EvaluationScheduleTableView";
import { EvaluationScheduleGridView } from "../components/EvaluationScheduleGridView";
import {
  ScheduleTableSkeleton,
  ScheduleGridSkeleton,
} from "../components/EvaluationScheduleSkeletons";
import { EvaluationScheduleFormDialog } from "../components/EvaluationScheduleFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import type {
  EvaluationScheduleQuery,
  GetStudentSchedule,
  GetSupervisorSchedule,
} from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function EvaluationSchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const semesterIdParam = searchParams.get("semester_id");

  const { data: activeSemester } = useActiveSemester();

  // 1. Target Type: 'student' (SET) | 'supervisor' (SEF)
  const [type, setType] = useState<"student" | "supervisor">("student");

  // 2. View Mode
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("schedules_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("schedules_view_mode", viewMode);
  }, [viewMode]);

  // 3. Dropdown Metadata
  const { data: semestersResponse } = useSemesters({ paginate: false });
  const { data: studentFormsResponse } = useStudentForms({ paginate: false });
  const { data: supervisorFormsResponse } = useSupervisorForms({ paginate: false });

  const semestersList = useMemo(() => semestersResponse?.data ?? [], [semestersResponse?.data]);
  const formsList = useMemo(() => {
    if (type === "student") return studentFormsResponse?.data ?? [];
    return supervisorFormsResponse?.data ?? [];
  }, [type, studentFormsResponse?.data, supervisorFormsResponse?.data]);

  const effectiveSemesterId = useMemo(() => {
    if (semesterIdParam === "all") return undefined;
    if (semesterIdParam) return Number(semesterIdParam);
    return activeSemester?.id;
  }, [semesterIdParam, activeSemester?.id]);

  // 4. Query State
  const [paginate, setPaginate] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, _setLimit] = useState(10);
  const [isArchived, setIsArchived] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const query: EvaluationScheduleQuery = useMemo(
    () => ({
      paginate,
      page,
      limit,
      search: debouncedSearch,
      semester_id: effectiveSemesterId,
      is_archived: isArchived,
      sort_by: "open_at",
      order: "desc",
    }),
    [paginate, page, limit, debouncedSearch, effectiveSemesterId, isArchived],
  );

  const studentQuery = useStudentSchedules(query);
  const supervisorQuery = useSupervisorSchedules(query);

  const activeResponse = type === "student" ? studentQuery.data : supervisorQuery.data;
  const isLoading = type === "student" ? studentQuery.isLoading : supervisorQuery.isLoading;
  const isPlaceholderData =
    type === "student" ? studentQuery.isPlaceholderData : supervisorQuery.isPlaceholderData;

  const schedules = activeResponse?.data ?? [];
  const pagination = activeResponse?.pagination;

  // Mutations
  const deleteStudent = useDeleteStudentSchedule();
  const restoreStudent = useRestoreStudentSchedule();
  const forceStopStudent = useForceStopStudentSchedule();

  const deleteSupervisor = useDeleteSupervisorSchedule();
  const restoreSupervisor = useRestoreSupervisorSchedule();
  const forceStopSupervisor = useForceStopSupervisorSchedule();

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<
    GetStudentSchedule | GetSupervisorSchedule | null
  >(null);
  const [archiveTarget, setArchiveTarget] = useState<
    GetStudentSchedule | GetSupervisorSchedule | null
  >(null);
  const [restoreTarget, setRestoreTarget] = useState<
    GetStudentSchedule | GetSupervisorSchedule | null
  >(null);
  const [forceStopTarget, setForceStopTarget] = useState<
    GetStudentSchedule | GetSupervisorSchedule | null
  >(null);

  const handleSemesterFilterChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (val === "all") params.set("semester_id", "all");
    else params.set("semester_id", String(val));
    setSearchParams(params);
    setPage(1);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      if (type === "student") await deleteStudent.mutateAsync(archiveTarget.id);
      else await deleteSupervisor.mutateAsync(archiveTarget.id);
      toast.success("Evaluation schedule archived.");
      setArchiveTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to archive schedule.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      if (type === "student") await restoreStudent.mutateAsync(restoreTarget.id);
      else await restoreSupervisor.mutateAsync(restoreTarget.id);
      toast.success("Evaluation schedule restored.");
      setRestoreTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to restore schedule.");
    }
  };

  const handleForceStopConfirm = async () => {
    if (!forceStopTarget) return;
    try {
      if (type === "student") {
        await forceStopStudent.mutateAsync(forceStopTarget.id);
      } else {
        await forceStopSupervisor.mutateAsync(forceStopTarget.id);
      }
      toast.success("Evaluation period concluded immediately.");
      setForceStopTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to force stop schedule.");
    }
  };

  const selectedSemester = semestersList.find((s) => s.id === effectiveSemesterId);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Evaluation Schedules
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure calendar submission windows for student and supervisor evaluations.
          </p>
        </div>

        <Button
          onClick={() => {
            setScheduleToEdit(null);
            setFormOpen(true);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Period</span>
        </Button>
      </div>

      {/* ── SET vs SEF Tabs ── */}
      <div className="flex border-b border-border">
        <button
          onClick={() => {
            setType("student");
            setPage(1);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            type === "student"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Student Schedule (SET)</span>
        </button>
        <button
          onClick={() => {
            setType("supervisor");
            setPage(1);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            type === "supervisor"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Supervisor Schedule (SEF)</span>
        </button>
      </div>

      {/* ── 2-Tier Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search form title..."
              className="pl-9 bg-card border-border text-xs h-9 shadow-2xs"
            />
          </div>

          {/* Semester Filter */}
          <Select
            value={effectiveSemesterId ? String(effectiveSemesterId) : "all"}
            onValueChange={handleSemesterFilterChange}
          >
            <SelectTrigger className="w-full sm:w-56 bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Semesters">
                {selectedSemester ? (
                  <span className="truncate block max-w-[180px] text-left">
                    <strong className="text-primary mr-1">
                      {selectedSemester.semester_term} Sem
                    </strong>
                    (A.Y. {selectedSemester.school_year_start}-{selectedSemester.school_year_end})
                  </span>
                ) : (
                  "All Semesters"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              <SelectItem value="all">All Semesters</SelectItem>
              {semestersList.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-2.5">
          <Tabs
            value={isArchived ? "archived" : "active"}
            onValueChange={(val) => {
              setIsArchived(val === "archived");
              setPage(1);
            }}
          >
            <TabsList className="bg-muted border border-border h-8 p-0.5">
              <TabsTrigger value="active" className="text-xs px-3 h-7">
                Active
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs px-3 h-7">
                Archived
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 px-2.5 py-1 border border-border rounded-lg bg-card h-8 shadow-2xs">
            <Switch
              id="paginate-switch"
              checked={paginate}
              onCheckedChange={(checked) => {
                setPaginate(checked);
                setPage(1);
              }}
            />
            <Label
              htmlFor="paginate-switch"
              className="text-xs font-medium cursor-pointer select-none text-foreground"
            >
              Pagination
            </Label>
          </div>

          <div className="flex items-center border border-border rounded-lg bg-muted p-0.5 h-8">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("table")}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      <div
        className={
          isPlaceholderData ? "opacity-60 transition-opacity" : "opacity-100 transition-opacity"
        }
      >
        {isLoading ? (
          viewMode === "table" ? (
            <ScheduleTableSkeleton rows={6} />
          ) : (
            <ScheduleGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <EvaluationScheduleTableView
            schedules={schedules}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setScheduleToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
            onForceStop={(item) => setForceStopTarget(item)}
          />
        ) : (
          <EvaluationScheduleGridView
            schedules={schedules}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setScheduleToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
            onForceStop={(item) => setForceStopTarget(item)}
          />
        )}
      </div>

      {/* ── Pagination Footer ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <div>
          {paginate && pagination ? (
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {schedules.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * limit, pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> period(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{schedules.length}</strong> period(s)
            </span>
          )}
        </div>

        {paginate && pagination && (
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
        )}
      </div>

      {/* Form Modal */}
      <EvaluationScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        type={type}
        scheduleToEdit={scheduleToEdit}
        semesters={semestersList}
        forms={formsList}
        defaultSemesterId={effectiveSemesterId}
      />

      {/* Archive Modal */}
      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive Evaluation Period?"
        description="Are you sure you want to archive this submission schedule window?"
        confirmLabel="Archive Period"
        variant="destructive"
        isLoading={deleteStudent.isPending || deleteSupervisor.isPending}
        onConfirm={handleArchiveConfirm}
      />

      {/* Restore Modal */}
      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore Evaluation Period?"
        description="This will reactivate this evaluation schedule window."
        confirmLabel="Restore Period"
        variant="primary"
        isLoading={restoreStudent.isPending || restoreSupervisor.isPending}
        onConfirm={handleRestoreConfirm}
      />

      {/* Force Stop Modal */}
      <ConfirmActionDialog
        open={Boolean(forceStopTarget)}
        onOpenChange={(open) => !open && setForceStopTarget(null)}
        title="Force Stop Evaluation Period?"
        description={
          <span>
            Are you sure you want to immediately conclude the evaluation window for{" "}
            <strong>{forceStopTarget?.form?.title}</strong> (
            {forceStopTarget?.semester.semester_term} Sem)?
            <span className="block mt-2 text-xs font-semibold text-destructive">
              This will immediately close the submission window and prevent any further evaluations
              from being submitted.
            </span>
          </span>
        }
        confirmLabel="Force Stop Period"
        variant="destructive"
        isLoading={forceStopStudent.isPending || forceStopSupervisor.isPending}
        onConfirm={handleForceStopConfirm}
      />
    </div>
  );
}
