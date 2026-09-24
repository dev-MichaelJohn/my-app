import { useState, useEffect } from "react";
import { LayoutGrid, List, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner"; // 👈 Sonner
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

export default function CollegesPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("colleges_view_mode") as "table" | "grid") || "grid";
  });

  const [query, setQuery] = useState<CollegeQuery>({
    paginate: true,
    page: 1,
    limit: 9,
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
            Manage academic colleges and appointed deans.
          </p>
        </div>

        <Button
          onClick={() => {
            setCollegeToEdit(null);
            setFormOpen(true);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add College</span>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or code..."
            className="pl-9 bg-card border-border"
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

          <Select
            value={!query.paginate ? "all" : String(query.limit ?? 9)}
            onValueChange={(val) => {
              setQuery((prev) => ({
                ...prev,
                paginate: val !== "all",
                limit: val === "all" ? (prev.limit ?? 9) : Number(val),
                page: 1,
              }));
            }}
          >
            <SelectTrigger className="w-[110px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Page Size" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              <SelectItem value="9">9 per page</SelectItem>
              <SelectItem value="18">18 per page</SelectItem>
              <SelectItem value="36">36 per page</SelectItem>
              <SelectItem value="all">Show All</SelectItem>
            </SelectContent>
          </Select>

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
            ? This will hide the college from academic listings.
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
            </strong>{" "}
            and make it available for academic programs again.
          </span>
        }
        confirmLabel="Restore College"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
