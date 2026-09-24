import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  Sparkles,
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
  useOfferings,
  useDeleteOffering,
  useRestoreOffering,
  useGenerateOfferings,
} from "../hooks/useOfferings";
import { useSemesters, useActiveSemester } from "@/features/semesters/hooks/useSemesters";
import { usePrograms } from "@/features/programs/hooks/usePrograms";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useCurriculums } from "@/features/curriculums/hooks/useCurriculums";
import { OfferingTableView } from "../components/OfferingTableView";
import { OfferingGridView } from "../components/OfferingGridView";
import { OfferingTableSkeleton, OfferingGridSkeleton } from "../components/OfferingSkeletons";
import { OfferingFormDialog } from "../components/OfferingFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import type { GetOffering, OfferingQuery } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function OfferingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const semesterIdParam = searchParams.get("semester_id");
  const classIdParam = searchParams.get("class_id");

  const { data: activeSemester } = useActiveSemester();

  const { data: semestersResponse } = useSemesters({ paginate: false });
  const { data: programsResponse } = usePrograms({ paginate: false });
  const { data: classesResponse } = useClasses({ paginate: false });
  const { data: curriculumsResponse } = useCurriculums({ paginate: false });

  const semestersList = useMemo(() => semestersResponse?.data ?? [], [semestersResponse?.data]);
  const programsList = useMemo(() => programsResponse?.data ?? [], [programsResponse?.data]);
  const classesList = useMemo(() => classesResponse?.data ?? [], [classesResponse?.data]);
  const curriculumsList = useMemo(
    () => curriculumsResponse?.data ?? [],
    [curriculumsResponse?.data],
  );

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("offerings_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("offerings_view_mode", viewMode);
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

  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(undefined);

  const activeProgramId = useMemo(() => {
    if (selectedProgramId) return selectedProgramId;
    if (effectiveClassId && classesList.length > 0) {
      const targetClass = classesList.find((c) => c.id === effectiveClassId);
      return targetClass?.program.id;
    }
    return undefined;
  }, [selectedProgramId, effectiveClassId, classesList]);

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

  const query: OfferingQuery = useMemo(
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

  const { data: response, isLoading, isPlaceholderData } = useOfferings(query);

  const deleteMutation = useDeleteOffering();
  const restoreMutation = useRestoreOffering();
  const generateMutation = useGenerateOfferings();

  const offerings = response?.data ?? [];
  const pagination = response?.pagination;

  const selectedSemester = semestersList.find((s) => s.id === effectiveSemesterId);
  const selectedProgram = programsList.find((p) => p.program.id === activeProgramId);
  const selectedClass = classesList.find((c) => c.id === effectiveClassId);

  const [formOpen, setFormOpen] = useState(false);
  const [offeringToEdit, setOfferingToEdit] = useState<GetOffering | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GetOffering | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetOffering | null>(null);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);

  const handleSemesterFilterChange = (val: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (val === "all") {
      params.set("semester_id", "all");
    } else {
      params.set("semester_id", String(val));
    }
    setSearchParams(params);
    setPage(1);
  };

  const handleProgramFilterChange = (val: string | null) => {
    const newProgId = val === "all" ? undefined : Number(val);
    setSelectedProgramId(newProgId);

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
      if (target) setSelectedProgramId(target.program.id);
    }
    setSearchParams(params);
    setPage(1);
  };

  const handleGenerateConfirm = async () => {
    if (!effectiveSemesterId) return;
    try {
      const result = await generateMutation.mutateAsync(effectiveSemesterId);
      toast.success(result.message);
      setConfirmGenerateOpen(false);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to generate offerings.");
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.id);
      toast.success("Course offering was archived.");
      setArchiveTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to archive course offering.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.id);
      toast.success("Course offering has been restored.");
      setRestoreTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to restore course offering.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Course Offerings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage scheduled courses and faculty assignments per class section.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {effectiveSemesterId && (
            <Button
              variant="outline"
              onClick={() => setConfirmGenerateOpen(true)}
              className="gap-2 h-9 text-xs border-primary/40 text-primary hover:bg-primary/10 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Auto-Generate</span>
            </Button>
          )}

          <Button
            onClick={() => {
              setOfferingToEdit(null);
              setFormOpen(true);
            }}
            className="gap-2 h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Offering</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search course or instructor..."
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
                  <span className="truncate block text-left">
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
                  <span className="truncate block text-left font-mono">
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
            <OfferingTableSkeleton rows={6} />
          ) : (
            <OfferingGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <OfferingTableView
            offerings={offerings}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setOfferingToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <OfferingGridView
            offerings={offerings}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setOfferingToEdit(item);
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
                {offerings.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * limit, pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> offering(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{offerings.length}</strong>{" "}
              {isArchived ? "archived" : "active"} course offering(s)
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

      <OfferingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        offeringToEdit={offeringToEdit}
        semesters={semestersList}
        classes={classesList}
        curriculums={curriculumsList}
      />

      <ConfirmActionDialog
        open={confirmGenerateOpen}
        onOpenChange={setConfirmGenerateOpen}
        title="Auto-Generate Offerings for Semester?"
        description={
          <span>
            This will scan all active classes and automatically schedule missing course offerings
            based on the <strong>{selectedSemester?.semester_term} Semester</strong> curriculum.
          </span>
        }
        confirmLabel="Generate Now"
        variant="primary"
        isLoading={generateMutation.isPending}
        onConfirm={handleGenerateConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive Course Offering?`}
        description={
          <span>
            Are you sure you want to archive the offering for{" "}
            <strong>{archiveTarget?.course_curriculum.course.name}</strong> for section{" "}
            <strong>
              {archiveTarget?.class.program.initialism} {archiveTarget?.class.year_level}-
              {archiveTarget?.class.section}
            </strong>
            ?
          </span>
        }
        confirmLabel="Archive Offering"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={`Restore Course Offering?`}
        description={
          <span>
            This will reactivate the offering for{" "}
            <strong>{restoreTarget?.course_curriculum.course.name}</strong>.
          </span>
        }
        confirmLabel="Restore Offering"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
