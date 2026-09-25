import { useState, useEffect } from "react";
import {
  LayoutGrid,
  List,
  Search,
  Plus,
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
  useSemesters,
  useDeleteSemester,
  useRestoreSemester,
  useForceStopSemester,
} from "../hooks/useSemesters";
import { SemesterTableView } from "../components/SemesterTableView";
import { SemesterGridView } from "../components/SemesterGridView";
import { SemesterTableSkeleton, SemesterGridSkeleton } from "../components/SemesterSkeletons";
import { SemesterFormDialog } from "../components/SemesterFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { SemeterTermEnum, type ISemesterSelect, type SemesterQuery } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function SemesterPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("semesters_view_mode") as "table" | "grid") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("semesters_view_mode", viewMode);
  }, [viewMode]);

  const [query, setQuery] = useState<SemesterQuery>({
    paginate: true,
    page: 1,
    limit: 10,
    search: "",
    semester_term: undefined,
    is_archived: false,
    sort_by: "start_date",
    order: "desc",
  });

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: response, isLoading, isPlaceholderData } = useSemesters(query);
  const deleteMutation = useDeleteSemester();
  const restoreMutation = useRestoreSemester();

  const semesters = response?.data ?? [];
  const pagination = response?.pagination;

  const [forceStopTarget, setForceStopTarget] = useState<ISemesterSelect | null>(null);
  const forceStopMutation = useForceStopSemester();

  const handleForceStopConfirm = async () => {
    if (!forceStopTarget) return;
    try {
      await forceStopMutation.mutateAsync(forceStopTarget.id);
      toast.success(`The ${forceStopTarget.semester_term} Semester was concluded successfully.`);
      setForceStopTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to stop semester.");
    }
  };

  const [formOpen, setFormOpen] = useState(false);
  const [semesterToEdit, setSemesterToEdit] = useState<ISemesterSelect | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ISemesterSelect | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ISemesterSelect | null>(null);

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.id);
      toast.success(
        `The ${archiveTarget.semester_term} Semester (A.Y. ${archiveTarget.school_year_start}-${archiveTarget.school_year_end}) was archived.`,
      );
      setArchiveTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to archive semester.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.id);
      toast.success(
        `The ${restoreTarget.semester_term} Semester (A.Y. ${restoreTarget.school_year_start}-${restoreTarget.school_year_end}) has been restored.`,
      );
      setRestoreTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to restore semester.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Academic Semesters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage institutional terms, academic calendar bounds, and timelines.
          </p>
        </div>

        <Button
          onClick={() => {
            setSemesterToEdit(null);
            setFormOpen(true);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Semester</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search year or dates..."
              className="pl-9 bg-card border-border text-sm shadow-2xs"
            />
          </div>

          <Select
            value={query.semester_term || "all"}
            onValueChange={(val) =>
              setQuery((prev) => ({
                ...prev,
                semester_term: val === "all" ? undefined : (val as any),
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-full sm:w-36 bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Terms" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              <SelectItem value="all">All Terms</SelectItem>
              {SemeterTermEnum.enumValues.map((term, idx) => (
                <SelectItem key={idx} value={term}>
                  {term} Term
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-3">
          <Tabs
            value={query.is_archived ? "archived" : "active"}
            onValueChange={(val) =>
              setQuery((prev) => ({ ...prev, is_archived: val === "archived", page: 1 }))
            }
          >
            <TabsList className="bg-muted border border-border">
              <TabsTrigger value="active" className="text-xs">
                Active
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs">
                Archived
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-card shadow-2xs">
            <Switch
              id="paginate-switch"
              checked={Boolean(query.paginate)}
              onCheckedChange={(checked) =>
                setQuery((prev) => ({ ...prev, paginate: checked, page: 1 }))
              }
            />
            <Label
              htmlFor="paginate-switch"
              className="text-xs font-medium cursor-pointer select-none text-foreground"
            >
              Pagination
            </Label>
          </div>

          {query.paginate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Per page:</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={query.limit ?? 10}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setQuery((prev) => ({
                    ...prev,
                    limit: val > 0 ? Math.min(val, 100) : 10,
                    page: 1,
                  }));
                }}
                className="w-16 h-8 text-xs bg-card border-border text-center font-medium shadow-2xs"
              />
            </div>
          )}

          <div className="flex items-center border border-border rounded-lg bg-muted p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4" />
            </Button>
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
            <SemesterTableSkeleton rows={6} />
          ) : (
            <SemesterGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <SemesterTableView
            semesters={semesters}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setSemesterToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
            onForceStop={(item) => setForceStopTarget(item)}
          />
        ) : (
          <SemesterGridView
            semesters={semesters}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setSemesterToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
            onForceStop={(item) => setForceStopTarget(item)}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <div>
          {query.paginate && pagination ? (
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {semesters.length > 0 ? (pagination.currentPage - 1) * (query.limit ?? 10) + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * (query.limit ?? 10), pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> semester(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{semesters.length}</strong>{" "}
              {query.is_archived ? "archived" : "active"} academic semester(s)
            </span>
          )}
        </div>

        {query.paginate && pagination && (
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
              onClick={() => setQuery((prev) => ({ ...prev, page: 1 }))}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1"
              disabled={!pagination.hasPrev}
              onClick={() =>
                setQuery((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))
              }
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1"
              disabled={!pagination.hasNext}
              onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!pagination.hasNext}
              onClick={() => setQuery((prev) => ({ ...prev, page: pagination.totalPage }))}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <SemesterFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        semesterToEdit={semesterToEdit}
      />

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive Academic Semester?`}
        description={
          <span>
            Are you sure you want to archive the{" "}
            <strong>
              {archiveTarget?.semester_term} Semester (A.Y. {archiveTarget?.school_year_start}-
              {archiveTarget?.school_year_end})
            </strong>
            ?
          </span>
        }
        confirmLabel="Archive Semester"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={`Restore Academic Semester?`}
        description={
          <span>
            This will reactivate the{" "}
            <strong>
              {restoreTarget?.semester_term} Semester (A.Y. {restoreTarget?.school_year_start}-
              {restoreTarget?.school_year_end})
            </strong>
            .
          </span>
        }
        confirmLabel="Restore Semester"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(forceStopTarget)}
        onOpenChange={(open) => !open && setForceStopTarget(null)}
        title={`Force Stop ${forceStopTarget?.semester_term} Semester?`}
        description={
          <span>
            Are you sure you want to prematurely conclude the{" "}
            <strong>
              {forceStopTarget?.semester_term} Semester (A.Y. {forceStopTarget?.school_year_start}-
              {forceStopTarget?.school_year_end})
            </strong>
            ?
            <span className="block mt-2 text-xs font-semibold text-destructive">
              This will immediately halt all ongoing student evaluations, course scheduling, and
              class enrollments for this term.
            </span>
          </span>
        }
        confirmLabel="Force Stop Semester"
        variant="destructive"
        isLoading={forceStopMutation.isPending}
        onConfirm={handleForceStopConfirm}
      />
    </div>
  );
}
