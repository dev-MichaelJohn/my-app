import { useState, useEffect } from "react";
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
import { useCurriculums, useDeleteCurriculum, useRestoreCurriculum } from "../hooks/useCurriculums";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { CurriculumTableView } from "../components/CurriculumTableView";
import { CurriculumGridView } from "../components/CurriculumGridView";
import { CurriculumTableSkeleton, CurriculumGridSkeleton } from "../components/CurriculumSkeletons";
import { CurriculumFormDialog } from "../components/CurriculumFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { YearLevelEnum, type CurriculumQuery, type GetCurriculum } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function CurriculumPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const programIdParam = searchParams.get("program_id");

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("curriculums_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("curriculums_view_mode", viewMode);
  }, [viewMode]);

  const [query, setQuery] = useState<CurriculumQuery>(() => ({
    paginate: true,
    page: 1,
    limit: 10,
    search: "",
    program_id: programIdParam ? Number(programIdParam) : undefined,
    year_level: undefined,
    semester_term: undefined,
    is_archived: false,
    sort_by: "year_level",
    order: "asc",
  }));

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: response, isLoading, isPlaceholderData } = useCurriculums(query);
  const { data: programsResponse } = usePrograms({ paginate: false });
  const { data: coursesResponse } = useCourses({ paginate: false });

  const deleteMutation = useDeleteCurriculum();
  const restoreMutation = useRestoreCurriculum();

  const curriculums = response?.data ?? [];
  const pagination = response?.pagination;
  const programsList = programsResponse?.data ?? [];
  const coursesList = coursesResponse?.data ?? [];

  const selectedProgram = programsList.find((p) => p.program.id === query.program_id);

  const [formOpen, setFormOpen] = useState(false);
  const [curriculumToEdit, setCurriculumToEdit] = useState<GetCurriculum | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GetCurriculum | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetCurriculum | null>(null);

  const handleProgramFilterChange = (val: string | null) => {
    const newProgramId = val === "all" ? undefined : Number(val);
    setQuery((prev) => ({ ...prev, program_id: newProgramId, page: 1 }));

    if (newProgramId) {
      setSearchParams({ program_id: String(newProgramId) });
    } else {
      setSearchParams({});
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.id);
      toast.success(`Curriculum mapping for "${archiveTarget.course.initialism}" was archived.`);
      setArchiveTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to archive curriculum mapping.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.id);
      toast.success(
        `Curriculum mapping for "${restoreTarget.course.initialism}" has been restored.`,
      );
      setRestoreTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to restore curriculum mapping.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Course Curriculums</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage degree program prospectuses and syllabus schedules across year levels.
          </p>
        </div>

        <Button
          onClick={() => {
            setCurriculumToEdit(null);
            setFormOpen(true);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Curriculum</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search subject or course..."
              className="pl-9 bg-card border-border text-sm shadow-2xs"
            />
          </div>

          <Select
            value={query.program_id ? String(query.program_id) : "all"}
            onValueChange={handleProgramFilterChange}
          >
            <SelectTrigger className="w-full sm:w-60 bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All Programs">
                {selectedProgram ? (
                  <span className="truncate block max-w-[180px] text-left">
                    <strong className="font-mono text-primary mr-1.5">
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
            value={query.year_level || "all"}
            onValueChange={(val) =>
              setQuery((prev) => ({
                ...prev,
                year_level: val === "all" ? undefined : (val as any),
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-full sm:w-32 bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="Year Level" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              <SelectItem value="all">All Years</SelectItem>
              {YearLevelEnum.enumValues.map((level, idx) => (
                <SelectItem key={idx} value={level}>
                  Year {level}
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
                setQuery((prev) => ({
                  ...prev,
                  paginate: checked,
                  page: 1,
                }))
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
            <CurriculumTableSkeleton rows={6} />
          ) : (
            <CurriculumGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <CurriculumTableView
            curriculums={curriculums}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setCurriculumToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <CurriculumGridView
            curriculums={curriculums}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setCurriculumToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <div>
          {query.paginate && pagination ? (
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {curriculums.length > 0
                  ? (pagination.currentPage - 1) * (query.limit ?? 10) + 1
                  : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * (query.limit ?? 10), pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> mapping(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{curriculums.length}</strong>{" "}
              {query.is_archived ? "archived" : "active"} curriculum mapping(s)
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

      <CurriculumFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        curriculumToEdit={curriculumToEdit}
        programs={programsList}
        courses={coursesList}
      />

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive Curriculum Mapping?`}
        description={
          <span>
            Are you sure you want to archive{" "}
            <strong>
              {archiveTarget?.course.name} ({archiveTarget?.course.initialism})
            </strong>{" "}
            from the <strong>{archiveTarget?.program.initialism}</strong> curriculum?
          </span>
        }
        confirmLabel="Archive Mapping"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={`Restore Curriculum Mapping?`}
        description={
          <span>
            This will reactivate{" "}
            <strong>
              {restoreTarget?.course.name} ({restoreTarget?.course.initialism})
            </strong>{" "}
            in the <strong>{restoreTarget?.program.initialism}</strong> syllabus.
          </span>
        }
        confirmLabel="Restore Mapping"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
