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
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useColleges,
  useDeleteCollege,
  useRestoreCollege,
} from "@/features/colleges/hooks/useColleges";
import { CollegeTableView } from "@/features/colleges/components/CollegeTableView";
import { CollegeGridView } from "@/features/colleges/components/CollegeGridView";
import {
  CollegeTableSkeleton,
  CollegeGridSkeleton,
} from "@/features/colleges/components/CollegeSkeletons";
import { CollegeFormDialog } from "@/features/colleges/components/CollegeFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import type { CollegeQuery, GetCollege } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";
import { useQueryClient } from "@tanstack/react-query";
import { CsvImportDialog } from "@/components/ui/csv-import-dialog";

export default function CollegesPage() {
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("colleges_view_mode") as "table" | "grid") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("colleges_view_mode", viewMode);
  }, [viewMode]);

  const [query, setQuery] = useState<CollegeQuery>({
    paginate: true,
    page: 1,
    limit: 10,
    search: "",
    is_archived: false,
    sort_by: "name",
    order: "asc",
  });

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [formOpen, setFormOpen] = useState(false);
  const [collegeToEdit, setCollegeToEdit] = useState<GetCollege | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GetCollege | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetCollege | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useColleges(query);
  const deleteMutation = useDeleteCollege();
  const restoreMutation = useRestoreCollege();

  const colleges = response?.data ?? [];
  const pagination = response?.pagination;

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.college.id);
      toast.success(`College "${archiveTarget.college.initialism}" was archived.`);
      setArchiveTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to archive college.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.college.id);
      toast.success(`College "${restoreTarget.college.initialism}" has been restored.`);
      setRestoreTarget(null);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to restore college.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Colleges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage institutional colleges and appointed academic deans.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => {
              setImportOpen(true);
            }}
            className="gap-2 h-9 text-xs border-border shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </Button>
          <Button
            onClick={() => {
              setCollegeToEdit(null);
              setFormOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add College</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or code..."
            className="pl-9 bg-card border-border shadow-2xs"
          />
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
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setViewMode("table")}
              title="Table View"
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
            <CollegeTableSkeleton rows={6} />
          ) : (
            <CollegeGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <CollegeTableView
            colleges={colleges}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setCollegeToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <CollegeGridView
            colleges={colleges}
            isArchivedView={Boolean(query.is_archived)}
            onEdit={(item) => {
              setCollegeToEdit(item);
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
                {colleges.length > 0 ? (pagination.currentPage - 1) * (query.limit ?? 10) + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * (query.limit ?? 10), pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> colleges
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{colleges.length}</strong>{" "}
              {query.is_archived ? "archived" : "active"} college(s) (Unpaginated)
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
              className="h-8 w-8 border-border"
              disabled={!pagination.hasPrev}
              onClick={() => setQuery((prev) => ({ ...prev, page: 1 }))}
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1 border-border"
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
              className="h-8 px-2.5 gap-1 border-border"
              disabled={!pagination.hasNext}
              onClick={() => setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border"
              disabled={!pagination.hasNext}
              onClick={() => setQuery((prev) => ({ ...prev, page: pagination.totalPage }))}
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <CollegeFormDialog open={formOpen} onOpenChange={setFormOpen} collegeToEdit={collegeToEdit} />

      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive "${archiveTarget?.college.name}"?`}
        description={
          <span>
            Are you sure you want to archive{" "}
            <strong>
              {archiveTarget?.college.name} ({archiveTarget?.college.initialism})
            </strong>
            ?
          </span>
        }
        confirmLabel="Archive College"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={`Restore "${restoreTarget?.college.name}"?`}
        description={
          <span>
            This will reactivate{" "}
            <strong>
              {restoreTarget?.college.name} ({restoreTarget?.college.initialism})
            </strong>
            .
          </span>
        }
        confirmLabel="Restore College"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="colleges"
        entityTitle="Colleges"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["colleges"] })}
      />
    </div>
  );
}
