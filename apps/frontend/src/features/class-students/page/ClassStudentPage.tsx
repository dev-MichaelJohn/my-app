import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  Lock,
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
  useClassStudents,
  useDeleteClassStudent,
  useRestoreClassStudent,
} from "../hooks/useClassStudents";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { ClassStudentTableView } from "../components/ClassStudentTableView";
import { ClassStudentGridView } from "../components/ClassStudentGridView";
import {
  ClassStudentTableSkeleton,
  ClassStudentGridSkeleton,
} from "../components/ClassStudentSkeletons";
import { ClassStudentFormDialog } from "../components/ClassStudentFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { isSemesterOpen } from "@/lib/format.lib";
import type { ClassStudentQuery, GetClassStudent } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function ClassStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const semesterIdParam = searchParams.get("semester_id");
  const classIdParam = searchParams.get("class_id");

  const { data: activeSemester } = useActiveSemester();

  const { data: semestersResponse } = useSemesters({ paginate: false });
  const { data: programsResponse } = usePrograms({ paginate: false });
  const { data: classesResponse } = useClasses({ paginate: false });

  const semestersList = useMemo(() => semestersResponse?.data ?? [], [semestersResponse?.data]);
  const programsList = useMemo(() => programsResponse?.data ?? [], [programsResponse?.data]);
  const classesList = useMemo(() => classesResponse?.data ?? [], [classesResponse?.data]);

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("rosters_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("rosters_view_mode", viewMode);
  }, [viewMode]);

  const effectiveSemesterId = useMemo(() => {
    if (semesterIdParam === "all") return undefined;
    if (semesterIdParam) return Number(semesterIdParam);
    return activeSemester?.id;
  }, [semesterIdParam, activeSemester?.id]);

  const effectiveClassId = useMemo(() => {
    if (!classIdParam || classIdParam === "all") return undefined;
    return Number(classIdParam);
  }, [classIdParam]);

  const [manualProgramId, setManualProgramId] = useState<number | undefined>(undefined);

  const activeProgramId = useMemo(() => {
    if (manualProgramId !== undefined) return manualProgramId;
    if (effectiveClassId && classesList.length > 0) {
      const targetClass = classesList.find((c) => c.id === effectiveClassId);
      return targetClass?.program.id;
    }
    return undefined;
  }, [manualProgramId, effectiveClassId, classesList]);

  const availableClasses = useMemo(() => {
    if (!activeProgramId) return classesList;
    return classesList.filter((c) => c.program.id === activeProgramId);
  }, [classesList, activeProgramId]);

  const [paginate, setPaginate] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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

  const query: ClassStudentQuery = useMemo(
    () => ({
      paginate,
      page,
      limit,
      search: debouncedSearch,
      semester_id: effectiveSemesterId,
      class_id: effectiveClassId,
      is_archived: isArchived,
      sort_by: "created_at",
      order: "desc",
    }),
    [paginate, page, limit, debouncedSearch, effectiveSemesterId, effectiveClassId, isArchived],
  );

  const { data: response, isLoading, isPlaceholderData } = useClassStudents(query);

  const deleteMutation = useDeleteClassStudent();
  const restoreMutation = useRestoreClassStudent();

  const roster = response?.data ?? [];
  const pagination = response?.pagination;

  const selectedSemester = semestersList.find((s) => s.id === effectiveSemesterId);
  const selectedProgram = programsList.find((p) => p.program.id === activeProgramId);
  const selectedClass = classesList.find((c) => c.id === effectiveClassId);

  const isCurrentSemesterConcluded = selectedSemester ? !isSemesterOpen(selectedSemester) : false;

  const [formOpen, setFormOpen] = useState(false);
  const [enrollmentToEdit, setEnrollmentToEdit] = useState<GetClassStudent | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GetClassStudent | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetClassStudent | null>(null);

  const handleSemesterFilterChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (val === "all") params.set("semester_id", "all");
    else params.set("semester_id", String(val));
    setSearchParams(params);
    setPage(1);
  };

  const handleProgramFilterChange = (val: string | null) => {
    const newProgId = val === "all" ? undefined : Number(val);
    setManualProgramId(newProgId);

    if (newProgId && selectedClass && selectedClass.program.id !== newProgId) {
      const params = new URLSearchParams(searchParams);
      params.delete("class_id");
      setSearchParams(params);
    }
    setPage(1);
  };

  const handleClassFilterChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (val === "all") {
      params.delete("class_id");
    } else {
      params.set("class_id", String(val));
      const target = classesList.find((c) => c.id === Number(val));
      if (target) setManualProgramId(target.program.id);
    }
    setSearchParams(params);
    setPage(1);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.id);
      toast.success(
        `${archiveTarget.student.details.last_name} was removed from this class roster.`,
      );
      setArchiveTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to unenroll student.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.id);
      toast.success(
        `${restoreTarget.student.details.last_name} was re-enrolled into class roster.`,
      );
      setRestoreTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to re-enroll student.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Class Rosters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage student enrollments and official rosters per academic class section.
          </p>
        </div>

        <Button
          onClick={() => {
            setEnrollmentToEdit(null);
            setFormOpen(true);
          }}
          disabled={isCurrentSemesterConcluded}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50"
        >
          {isCurrentSemesterConcluded ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isCurrentSemesterConcluded ? "Term Concluded" : "Enroll Student"}</span>
        </Button>
      </div>

      {isCurrentSemesterConcluded && (
        <div className="p-3 bg-muted/70 border border-border rounded-lg flex items-center gap-2.5 text-xs text-muted-foreground">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          <span>
            The selected <strong>{selectedSemester?.semester_term} Semester</strong> concluded on{" "}
            {selectedSemester?.end_date}. Roster records for this term are archived in{" "}
            <strong>read-only mode</strong>.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search student, ID, or email..."
              className="pl-9 bg-card border-border text-xs h-9 w-full shadow-2xs"
            />
          </div>

          <Select
            value={effectiveSemesterId ? String(effectiveSemesterId) : "all"}
            onValueChange={handleSemesterFilterChange}
          >
            <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Semesters">
                {selectedSemester ? (
                  <span className="truncate block text-left">
                    <strong className="text-primary mr-1">
                      {selectedSemester.semester_term} Sem
                    </strong>
                    <span className="text-muted-foreground">
                      ({selectedSemester.school_year_start}-{selectedSemester.school_year_end})
                    </span>
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

          <Select
            value={activeProgramId ? String(activeProgramId) : "all"}
            onValueChange={handleProgramFilterChange}
          >
            <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Programs">
                {selectedProgram ? (
                  <span className="truncate block max-w-[150px] text-left">
                    <strong className="font-mono text-primary mr-1">
                      {selectedProgram.program.initialism}
                    </strong>
                    <span className="text-muted-foreground">({selectedProgram.program.name})</span>
                  </span>
                ) : (
                  "All Programs"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              <SelectItem value="all">All Programs</SelectItem>
              {programsList.map((p) => (
                <SelectItem key={p.program.id} value={String(p.program.id)}>
                  <span className="font-bold font-mono text-primary mr-1.5">
                    {p.program.initialism}
                  </span>{" "}
                  - {p.program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={effectiveClassId ? String(effectiveClassId) : "all"}
            onValueChange={handleClassFilterChange}
          >
            <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Sections">
                {selectedClass ? (
                  <span className="truncate block max-w-[130px] text-left font-mono">
                    <strong className="text-primary mr-1">
                      {selectedClass.program.initialism}
                    </strong>
                    {selectedClass.year_level}-{selectedClass.section}
                  </span>
                ) : (
                  "All Sections"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              <SelectItem value="all">All Sections</SelectItem>
              {availableClasses.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  <span className="font-mono font-bold text-primary mr-1.5">
                    {c.program.initialism}
                  </span>
                  {c.year_level}-{c.section} ({c.program.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
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

          <div className="flex items-center gap-2.5">
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

            {paginate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Per page:</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLimit(val > 0 ? Math.min(val, 100) : 10);
                    setPage(1);
                  }}
                  className="w-14 h-8 text-xs bg-card border-border text-center font-medium shadow-2xs"
                />
              </div>
            )}

            <div className="flex items-center border border-border rounded-lg bg-muted p-0.5 h-8">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          isPlaceholderData ? "opacity-60 transition-opacity" : "opacity-100 transition-opacity"
        }
      >
        {isLoading ? (
          viewMode === "table" ? (
            <ClassStudentTableSkeleton rows={6} />
          ) : (
            <ClassStudentGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <ClassStudentTableView
            roster={roster}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setEnrollmentToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <ClassStudentGridView
            roster={roster}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setEnrollmentToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <div>
          {paginate && pagination ? (
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {roster.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * limit, pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> student(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{roster.length}</strong>{" "}
              {isArchived ? "archived" : "active"} student(s)
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

      <ClassStudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        enrollmentToEdit={enrollmentToEdit}
        semesters={semestersList}
        classes={classesList}
        defaultClassId={effectiveClassId}
        defaultSemesterId={effectiveSemesterId}
      />

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Unenroll Student from Class?`}
        description={
          <span>
            Are you sure you want to remove{" "}
            <strong>
              {archiveTarget?.student.details.first_name} {archiveTarget?.student.details.last_name}
            </strong>{" "}
            from section{" "}
            <strong>
              {archiveTarget?.class.program.initialism} {archiveTarget?.class.year_level}-
              {archiveTarget?.class.section}
            </strong>
            ?
            <span className="block mt-2 text-xs font-semibold text-destructive">
              This will also unenroll the student from all scheduled course offerings in this class
              section.
            </span>
          </span>
        }
        confirmLabel="Unenroll Student"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={`Re-enroll Student into Class?`}
        description={
          <span>
            This will reactivate enrollment for{" "}
            <strong>
              {restoreTarget?.student.details.first_name} {restoreTarget?.student.details.last_name}
            </strong>{" "}
            and re-enroll them into all class course offerings.
          </span>
        }
        confirmLabel="Re-enroll Student"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
