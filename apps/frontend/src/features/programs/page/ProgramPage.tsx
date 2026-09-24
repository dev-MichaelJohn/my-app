import { useState, useEffect, useMemo } from "react";
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
import { usePrograms, useDeleteProgram, useRestoreProgram } from "../hooks/usePrograms";
import { useColleges } from "@/features/colleges/hooks/useColleges";
import { ProgramTableView } from "../components/ProgramTableView";
import { ProgramGridView } from "../components/ProgramGridView";
import { ProgramTableSkeleton, ProgramGridSkeleton } from "../components/ProgramSkeletons";
import { ProgramFormDialog } from "../components/ProgramFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import type { GetCollege, GetProgram, ProgramQuery } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";
import { useSearchParams } from "react-router";

export default function ProgramsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const collegeIdParam = searchParams.get("college_id");

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("programs_view_mode") as "table" | "grid") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("programs_view_mode", viewMode);
  }, [viewMode]);

  const [query, setQuery] = useState<ProgramQuery>({
    paginate: true,
    page: 1,
    limit: 10,
    search: "",
    college_id: collegeIdParam ? Number(collegeIdParam) : undefined,
    is_archived: false,
    sort_by: "created_at",
    order: "desc",
  });

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: response, isLoading, isPlaceholderData } = usePrograms(query);
  const { data: collegesResponse } = useColleges({
    paginate: false,
    page: 1,
    limit: 100,
    is_archived: false,
    sort_by: "created_at",
    order: "desc",
  });

  const deleteMutation = useDeleteProgram();
  const restoreMutation = useRestoreProgram();

  const programs = response?.data ?? [];
  const pagination = response?.pagination;
  const collegesList = useMemo(() => collegesResponse?.data ?? [], [collegesResponse]);

  const collegesMap = useMemo(() => {
    const map = new Map<number, GetCollege>();
    for (const c of collegesList) {
      map.set(c.college.id, c);
    }
    return map;
  }, [collegesList]);

  const selectedCollege = query.college_id ? collegesMap.get(query.college_id) : undefined;

  const [formOpen, setFormOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<GetProgram | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GetProgram | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetProgram | null>(null);

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.program.id);
      toast.success(`Program "${archiveTarget.program.initialism}" was archived.`);
      setArchiveTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to archive program.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.program.id);
      toast.success(`Program "${restoreTarget.program.initialism}" has been restored.`);
      setRestoreTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to restore program.");
    }
  };

  const handleCollegeChange = (val: string | null) => {
    const newCollegeId = !val || val === "all" ? undefined : Number(val);

    setQuery((prev) => ({
      ...prev,
      college_id: newCollegeId,
      page: 1,
    }));

    // Update browser URL bar cleanly
    if (newCollegeId) {
      setSearchParams({ college_id: String(newCollegeId) });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Academic Programs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage degree programs and appointed program chairs across colleges.
          </p>
        </div>

        <Button
          onClick={() => {
            setProgramToEdit(null);
            setFormOpen(true);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Program</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search program or code..."
              className="pl-9 bg-card border-border text-sm"
            />
          </div>

          <Select
            value={query.college_id ? String(query.college_id) : "all"}
            onValueChange={handleCollegeChange}
          >
            <SelectTrigger className="w-full sm:w-64 md:w-72 bg-card border-border text-xs h-9">
              <SelectValue placeholder="All Colleges">
                {selectedCollege ? (
                  <span className="truncate block max-w-[200px] md:max-w-[230px] text-left">
                    <strong className="font-mono text-primary">
                      {selectedCollege.college.initialism}
                    </strong>
                    <span className="text-muted-foreground ml-1.5">
                      ({selectedCollege.college.name})
                    </span>
                  </span>
                ) : (
                  "All Colleges"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-w-sm">
              <SelectItem value="all">All Colleges</SelectItem>
              {collegesList.map((c) => (
                <SelectItem key={c.college.id} value={String(c.college.id)}>
                  <span className="font-bold font-mono mr-1.5 text-primary">
                    {c.college.initialism}
                  </span>{" "}
                  - {c.college.name}
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

          <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-card">
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
                className="w-16 h-8 text-xs bg-card border-border text-center font-medium"
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
            <ProgramTableSkeleton rows={6} />
          ) : (
            <ProgramGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <ProgramTableView
            programs={programs}
            collegesMap={collegesMap}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setProgramToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <ProgramGridView
            programs={programs}
            collegesMap={collegesMap}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setProgramToEdit(item);
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
                {programs.length > 0 ? (pagination.currentPage - 1) * (query.limit ?? 10) + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * (query.limit ?? 10), pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> programs
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{programs.length}</strong>{" "}
              {query.is_archived ? "archived" : "active"} academic program(s)
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

      <ProgramFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        programToEdit={programToEdit}
        colleges={collegesList}
      />

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive "${archiveTarget?.program.name}"?`}
        description={
          <span>
            Are you sure you want to archive{" "}
            <strong>
              {archiveTarget?.program.name} ({archiveTarget?.program.initialism})
            </strong>
            ?
          </span>
        }
        confirmLabel="Archive Program"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={`Restore "${restoreTarget?.program.name}"?`}
        description={
          <span>
            This will reactivate{" "}
            <strong>
              {restoreTarget?.program.name} ({restoreTarget?.program.initialism})
            </strong>
            .
          </span>
        }
        confirmLabel="Restore Program"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
