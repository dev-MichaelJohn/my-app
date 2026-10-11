import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
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
import { useFaculties, useDeleteFaculty, useRestoreFaculty } from "../hooks/useFaculties";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { useColleges } from "@/features/colleges/hooks/useColleges";
import { FacultyTableView } from "../components/FacultyTableView";
import { FacultyGridView } from "../components/FacultyGridView";
import { FacultyTableSkeleton, FacultyGridSkeleton } from "../components/FacultySkeletons";
import { FacultyFormDialog } from "../components/FacultyFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import type { FacultyQuery, GetFaculty } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";
import { Can } from "@/components/Can";
import { PERMISSIONS } from "@my-app/shared";

export default function FacultyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const programIdParam = searchParams.get("program_id");
  const collegeIdParam = searchParams.get("college_id");

  const { data: collegesResponse } = useColleges({ paginate: false });
  const { data: programsResponse } = usePrograms({ paginate: false });

  const collegesList = useMemo(() => collegesResponse?.data ?? [], [collegesResponse?.data]);
  const programsList = useMemo(() => programsResponse?.data ?? [], [programsResponse?.data]);

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("faculties_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("faculties_view_mode", viewMode);
  }, [viewMode]);

  const effectiveCollegeId = useMemo(() => {
    if (!collegeIdParam || collegeIdParam === "all") return undefined;
    return Number(collegeIdParam);
  }, [collegeIdParam]);

  const effectiveProgramId = useMemo(() => {
    if (!programIdParam || programIdParam === "all") return undefined;
    return Number(programIdParam);
  }, [programIdParam]);

  const availablePrograms = useMemo(() => {
    if (!effectiveCollegeId) return programsList;
    return programsList.filter((p) => p.program.college_id === effectiveCollegeId);
  }, [programsList, effectiveCollegeId]);

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

  const query: FacultyQuery = useMemo(
    () => ({
      paginate,
      page,
      limit,
      search: debouncedSearch,
      college_id: effectiveCollegeId,
      program_id: effectiveProgramId,
      is_archived: isArchived,
    }),
    [paginate, page, limit, debouncedSearch, effectiveCollegeId, effectiveProgramId, isArchived],
  );

  const { data: response, isLoading, isPlaceholderData } = useFaculties(query);

  const deleteMutation = useDeleteFaculty();
  const restoreMutation = useRestoreFaculty();

  const faculties = response?.data ?? [];
  const pagination = response?.pagination;

  const [formOpen, setFormOpen] = useState(false);
  const [facultyToEdit, setFacultyToEdit] = useState<GetFaculty | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GetFaculty | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetFaculty | null>(null);

  const handleCollegeFilterChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (val === "all") params.delete("college_id");
    else params.set("college_id", String(val));
    params.delete("program_id"); // Reset program filter when college changes
    setSearchParams(params);
    setPage(1);
  };

  const handleProgramFilterChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (val === "all") params.delete("program_id");
    else params.set("program_id", String(val));
    setSearchParams(params);
    setPage(1);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.id);
      toast.success(`${archiveTarget.user.details.last_name}'s appointment removed.`);
      setArchiveTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to remove appointment.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.id);
      toast.success(`${restoreTarget.user.details.last_name}'s appointment restored.`);
      setRestoreTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to restore appointment.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Department Faculty</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage official faculty appointments and home departmental affiliations.
          </p>
        </div>

        <Can permission={PERMISSIONS.FACULTY_CREATE}>
          <Button
            onClick={() => {
              setFacultyToEdit(null);
              setFormOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Appoint Faculty</span>
          </Button>
        </Can>
      </div>

      <div className="flex flex-col gap-3 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search faculty name or ID..."
              className="pl-9 bg-card border-border text-xs h-9 w-full shadow-2xs"
            />
          </div>

          <Select
            value={effectiveCollegeId ? String(effectiveCollegeId) : "all"}
            onValueChange={handleCollegeFilterChange}
          >
            <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Colleges" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              <SelectItem value="all">All Colleges</SelectItem>
              {collegesList.map((c) => (
                <SelectItem key={c.college.id} value={String(c.college.id)}>
                  <span className="font-bold font-mono text-primary mr-1.5">
                    {c.college.initialism}
                  </span>
                  - {c.college.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={effectiveProgramId ? String(effectiveProgramId) : "all"}
            onValueChange={handleProgramFilterChange}
          >
            <SelectTrigger className="w-full bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              <SelectItem value="all">All Programs</SelectItem>
              {availablePrograms.map((p) => (
                <SelectItem key={p.program.id} value={String(p.program.id)}>
                  <span className="font-bold font-mono text-primary mr-1.5">
                    {p.program.initialism}
                  </span>
                  - {p.program.name}
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
            <FacultyTableSkeleton rows={6} />
          ) : (
            <FacultyGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <FacultyTableView
            faculties={faculties}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setFacultyToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <FacultyGridView
            faculties={faculties}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setFacultyToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <div>
          {paginate && pagination ? (
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {faculties.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * limit, pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> faculty
              member(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{faculties.length}</strong>{" "}
              {isArchived ? "archived" : "active"} faculty appointment(s)
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

      <FacultyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        facultyToEdit={facultyToEdit}
        programs={programsList}
        defaultProgramId={effectiveProgramId}
      />

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Remove Department Appointment?"
        description={
          <span>
            Are you sure you want to remove{" "}
            <strong>
              {archiveTarget?.user.details.first_name} {archiveTarget?.user.details.last_name}
            </strong>{" "}
            from <strong>{archiveTarget?.program.name}</strong>?
          </span>
        }
        confirmLabel="Remove Appointment"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore Department Appointment?"
        description={
          <span>
            This will reactivate{" "}
            <strong>
              {restoreTarget?.user.details.first_name} {restoreTarget?.user.details.last_name}
            </strong>{" "}
            under <strong>{restoreTarget?.program.name}</strong>.
          </span>
        }
        confirmLabel="Restore Appointment"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
