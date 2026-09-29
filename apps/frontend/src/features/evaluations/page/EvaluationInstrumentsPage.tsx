import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  useStudentForms,
  useDeleteStudentForm,
  useRestoreStudentForm,
  useSupervisorForms,
  useDeleteSupervisorForm,
  useRestoreSupervisorForm,
} from "../hooks/useEvaluationInstruments";
import { EvaluationInstrumentTableView } from "../components/EvaluationInstrumentTableView";
import { EvaluationInstrumentGridView } from "../components/EvaluationInstrumentGridView";
import {
  InstrumentTableSkeleton,
  InstrumentGridSkeleton,
} from "../components/EvaluationInstrumentSkeletons";
import { EvaluationInstrumentFormDialog } from "../components/EvaluationInstrumentFormDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import type {
  EvaluationFormQuery,
  IStudentEvalFormSelect,
  ISupervisorEvalFormSelect,
} from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";

export default function EvaluationInstrumentsPage() {
  // 1. Instrument Type: 'student' (SET) | 'supervisor' (SEF)
  const [formType, setFormType] = useState<"student" | "supervisor">("student");

  // 2. View Mode
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("instruments_view_mode") as "table" | "grid") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("instruments_view_mode", viewMode);
  }, [viewMode]);

  // 3. Query State
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

  const query: EvaluationFormQuery = {
    paginate,
    page,
    limit,
    search: debouncedSearch,
    is_archived: isArchived,
    sort_by: "created_at",
    order: "desc",
  };

  // Queries
  const studentQuery = useStudentForms(query);
  const supervisorQuery = useSupervisorForms(query);

  const activeResponse = formType === "student" ? studentQuery.data : supervisorQuery.data;
  const isLoading = formType === "student" ? studentQuery.isLoading : supervisorQuery.isLoading;
  const isPlaceholderData =
    formType === "student" ? studentQuery.isPlaceholderData : supervisorQuery.isPlaceholderData;

  const forms = activeResponse?.data ?? [];
  const pagination = activeResponse?.pagination;

  // Mutations
  const deleteStudent = useDeleteStudentForm();
  const restoreStudent = useRestoreStudentForm();
  const deleteSupervisor = useDeleteSupervisorForm();
  const restoreSupervisor = useRestoreSupervisorForm();

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formToEdit, setFormToEdit] = useState<
    IStudentEvalFormSelect | ISupervisorEvalFormSelect | null
  >(null);
  const [archiveTarget, setArchiveTarget] = useState<
    IStudentEvalFormSelect | ISupervisorEvalFormSelect | null
  >(null);
  const [restoreTarget, setRestoreTarget] = useState<
    IStudentEvalFormSelect | ISupervisorEvalFormSelect | null
  >(null);

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      if (formType === "student") await deleteStudent.mutateAsync(archiveTarget.id);
      else await deleteSupervisor.mutateAsync(archiveTarget.id);
      toast.success("Evaluation instrument template archived.");
      setArchiveTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to archive.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      if (formType === "student") await restoreStudent.mutateAsync(restoreTarget.id);
      else await restoreSupervisor.mutateAsync(restoreTarget.id);
      toast.success("Evaluation instrument template restored.");
      setRestoreTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to restore.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Evaluation Instruments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design, version, and manage SET and SEF evaluation questionnaires.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormToEdit(null);
            setFormOpen(true);
          }}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Questionnaire</span>
        </Button>
      </div>

      {/* ── 🚀 Instrument Type Selector Tabs (Student SET vs Supervisor SEF) ── */}
      <div className="flex border-b border-border">
        <button
          onClick={() => {
            setFormType("student");
            setPage(1);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            formType === "student"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Student Instruments (SET)</span>
        </button>
        <button
          onClick={() => {
            setFormType("supervisor");
            setPage(1);
          }}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            formType === "supervisor"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Supervisor Instruments (SEF)</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search questionnaire title..."
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
            <InstrumentTableSkeleton rows={6} />
          ) : (
            <InstrumentGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <EvaluationInstrumentTableView
            forms={forms}
            formType={formType}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setFormToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
          />
        ) : (
          <EvaluationInstrumentGridView
            forms={forms}
            formType={formType}
            isArchivedView={isArchived}
            onEdit={(item) => {
              setFormToEdit(item);
              setFormOpen(true);
            }}
            onDelete={(item) => setArchiveTarget(item)}
            onRestore={(item) => setRestoreTarget(item)}
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
                {forms.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * limit, pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> template(s)
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{forms.length}</strong> template(s)
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

      {/* Template Create/Edit Modal */}
      <EvaluationInstrumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        formType={formType}
        formToEdit={formToEdit}
      />

      {/* Friction Modals */}
      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive Questionnaire "${archiveTarget?.title}"?`}
        description="Are you sure you want to archive this questionnaire template?"
        confirmLabel="Archive Template"
        variant="destructive"
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title={`Restore Questionnaire "${restoreTarget?.title}"?`}
        description="This will reactivate this questionnaire template."
        confirmLabel="Restore Template"
        variant="primary"
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
