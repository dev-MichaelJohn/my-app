import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Navigate } from "react-router";
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
import { toast } from "sonner";
import {
  useStudentClasses,
  useDeleteStudentClass,
  useRestoreStudentClass,
} from "../hooks/useStudentClasses";
import { useOffering } from "@/features/offerings/hooks/useOfferings";
import { useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { StudentClassTableView } from "../components/StudentClassTableView";
import { StudentClassGridView } from "../components/StudentClassGridView";
import {
  StudentClassTableSkeleton,
  StudentClassGridSkeleton,
} from "../components/StudentClassSkeletons";
import { StudentClassFormDialog } from "../components/StudentClassFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { isSemesterOpen } from "@/lib/format.lib";
import type { GetStudentClass, StudentClassQuery } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function StudentClassPage() {
  const [searchParams] = useSearchParams();
  const offeringIdParam = searchParams.get("course_offering_id");

  const offeringId = useMemo(() => {
    return offeringIdParam && !isNaN(Number(offeringIdParam)) ? Number(offeringIdParam) : undefined;
  }, [offeringIdParam]);

  const { data: activeSemester } = useActiveSemester();

  const { data: offering, isLoading: isLoadingOffering } = useOffering(
    offeringId ?? 0,
    Boolean(offeringId),
  );

  const isConcluded = useMemo(() => {
    if (offering?.semester) {
      return !isSemesterOpen(offering.semester);
    }
    return activeSemester ? !isSemesterOpen(activeSemester) : false;
  }, [offering, activeSemester]);

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("student_classes_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("student_classes_view_mode", viewMode);
  }, [viewMode]);

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

  const query: StudentClassQuery = useMemo(
    () => ({
      paginate,
      page,
      limit,
      search: debouncedSearch,
      course_offering_id: offeringId,
      is_archived: isArchived,
      sort_by: "created_at",
      order: "desc",
    }),
    [paginate, page, limit, debouncedSearch, offeringId, isArchived],
  );

  const { data: response, isLoading, isPlaceholderData } = useStudentClasses(query);

  const deleteMutation = useDeleteStudentClass();
  const restoreMutation = useRestoreStudentClass();

  const students = response?.data ?? [];
  const pagination = response?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<GetStudentClass | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetStudentClass | null>(null);

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.id);
      toast.success(`${archiveTarget.student.details.last_name} was unenrolled.`);
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
      toast.success(`${restoreTarget.student.details.last_name} was re-enrolled.`);
      setRestoreTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to re-enroll student.");
    }
  };

  if (!offeringId) {
    return <Navigate to="/admin/offerings" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {offering ? (
              <span>
                {offering.course_curriculum.course.initialism} ({offering.class.program.initialism}{" "}
                {offering.class.year_level}-{offering.class.section}) Roster
              </span>
            ) : (
              "Subject Student Roster"
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage regular student cohort and irregular cross-enrollees for this subject.
          </p>
        </div>

        {offering && (
          <Button
            onClick={() => setFormOpen(true)}
            disabled={isConcluded}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {isConcluded ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isConcluded ? "Term Concluded" : "Enroll Student / Irregular"}</span>
          </Button>
        )}
      </div>

      {isConcluded && (
        <div className="p-3 bg-muted/70 border border-border rounded-lg flex items-center gap-2.5 text-xs text-muted-foreground">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          <span>
            This semester term has concluded. Course subject enrollments are in{" "}
            <strong>read-only mode</strong>.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search student by name or ID..."
            className="pl-9 bg-card border-border text-xs h-9 shadow-2xs"
          />
        </div>

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

      <div
        className={
          isPlaceholderData ? "opacity-60 transition-opacity" : "opacity-100 transition-opacity"
        }
      >
        {isLoading || isLoadingOffering ? (
          viewMode === "table" ? (
            <StudentClassTableSkeleton rows={6} />
          ) : (
            <StudentClassGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <StudentClassTableView
            students={students}
            isArchivedView={isArchived}
            isConcluded={isConcluded}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <StudentClassGridView
            students={students}
            isArchivedView={isArchived}
            isConcluded={isConcluded}
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
                {students.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * limit, pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> student(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{students.length}</strong>{" "}
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

      {offering && (
        <StudentClassFormDialog open={formOpen} onOpenChange={setFormOpen} offering={offering} />
      )}

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Unenroll Student from Subject?`}
        description={
          <span>
            Are you sure you want to unenroll{" "}
            <strong>
              {archiveTarget?.student.details.first_name} {archiveTarget?.student.details.last_name}
            </strong>{" "}
            from <strong>{archiveTarget?.offering.course_curriculum.course.initialism}</strong>?
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
        title={`Re-enroll Student into Subject?`}
        description={
          <span>
            This will reactivate enrollment for{" "}
            <strong>
              {restoreTarget?.student.details.first_name} {restoreTarget?.student.details.last_name}
            </strong>{" "}
            in this course offering.
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
