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
  Upload,
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
  useUsers,
  useDeleteUser,
  useRestoreUser,
  useResetPassword,
  useResendWelcomeEmail,
} from "../hooks/useUsers";
import { UserTableView } from "../components/UserTableView";
import { UserGridView } from "../components/UserGridView";
import { UserTableSkeleton, UserGridSkeleton } from "../components/UserSkeletons";
import { UserFormDialog } from "../components/UserFormDialog";
import { ManageRolesDialog } from "../components/ManageRolesDialog";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { CsvImportDialog } from "@/components/ui/csv-import-dialog";
import { SystemRoles, type GetUser, type SystemRole, type UserQuery } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";
import { useQueryClient } from "@tanstack/react-query";

export default function UserPage() {
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    return (localStorage.getItem("users_view_mode") as "table" | "grid") || "table";
  });

  useEffect(() => {
    localStorage.setItem("users_view_mode", viewMode);
  }, [viewMode]);

  const [paginate, setPaginate] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [roleFilter, setRoleFilter] = useState<SystemRole | undefined>(undefined);
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

  const query: UserQuery = useMemo(
    () => ({
      paginate,
      page,
      limit,
      search: debouncedSearch,
      role: roleFilter,
      is_archived: isArchived,
      sort_by: "created_at",
      order: "desc",
    }),
    [paginate, page, limit, debouncedSearch, roleFilter, isArchived],
  );

  const { data: response, isLoading, isPlaceholderData } = useUsers(query);

  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();
  const resetPasswordMutation = useResetPassword();
  const resendWelcomeMutation = useResendWelcomeEmail();

  const users = response?.data ?? [];
  const pagination = response?.pagination;

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<GetUser | null>(null);

  const [rolesUser, setRolesUser] = useState<GetUser | null>(null);
  const [resetTarget, setResetTarget] = useState<GetUser | null>(null);
  const [resendTarget, setResendTarget] = useState<GetUser | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GetUser | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GetUser | null>(null);

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await deleteMutation.mutateAsync(archiveTarget.account.id);
      toast.success(
        `Account "${archiveTarget.details.first_name} ${archiveTarget.details.last_name}" was archived.`,
      );
      setArchiveTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to archive user.");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync(restoreTarget.account.id);
      toast.success(
        `Account "${restoreTarget.details.first_name} ${restoreTarget.details.last_name}" restored.`,
      );
      setRestoreTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to restore user.");
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetTarget) return;
    try {
      await resetPasswordMutation.mutateAsync(resetTarget.account.id);
      toast.success(
        `Password reset. New temporary password emailed to ${resetTarget.account.email}.`,
      );
      setResetTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to reset password.");
    }
  };

  const handleResendWelcomeConfirm = async () => {
    if (!resendTarget) return;
    try {
      await resendWelcomeMutation.mutateAsync(resendTarget.account.id);
      toast.success(`Account credentials re-sent to ${resendTarget.account.email}.`);
      setResendTarget(null);
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to resend credentials.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Provision, assign roles, manage credentials, and audit institutional user accounts.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2 h-9 text-xs border-border shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </Button>
          <Button
            onClick={() => {
              setUserToEdit(null);
              setFormOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Provision User</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, ID, or email..."
              className="pl-9 bg-card border-border text-sm shadow-2xs"
            />
          </div>

          <Select
            value={roleFilter || "all"}
            onValueChange={(val) => {
              setRoleFilter(val === "all" ? undefined : (val as SystemRole));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 bg-card border-border text-xs h-9 shadow-2xs">
              <SelectValue placeholder="All System Roles" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs">
              <SelectItem value="all">All Roles</SelectItem>
              {SystemRoles.enumValues.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-3">
          <Tabs
            value={isArchived ? "archived" : "active"}
            onValueChange={(val) => {
              setIsArchived(val === "archived");
              setPage(1);
            }}
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

      {/* Content View */}
      <div
        className={
          isPlaceholderData ? "opacity-60 transition-opacity" : "opacity-100 transition-opacity"
        }
      >
        {isLoading ? (
          viewMode === "table" ? (
            <UserTableSkeleton rows={6} />
          ) : (
            <UserGridSkeleton count={6} />
          )
        ) : viewMode === "table" ? (
          <UserTableView
            users={users}
            isArchivedView={isArchived}
            onEdit={(u) => {
              setUserToEdit(u);
              setFormOpen(true);
            }}
            onManageRoles={(u) => setRolesUser(u)}
            onResetPassword={(u) => setResetTarget(u)}
            onResendWelcome={(u) => setResendTarget(u)}
            onDelete={(u) => setArchiveTarget(u)}
            onRestore={(u) => setRestoreTarget(u)}
          />
        ) : (
          <UserGridView
            users={users}
            isArchivedView={isArchived}
            onEdit={(u) => {
              setUserToEdit(u);
              setFormOpen(true);
            }}
            onManageRoles={(u) => setRolesUser(u)}
            onResetPassword={(u) => setResetTarget(u)}
            onResendWelcome={(u) => setResendTarget(u)}
            onDelete={(u) => setArchiveTarget(u)}
            onRestore={(u) => setRestoreTarget(u)}
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
                {users.length > 0 ? (pagination.currentPage - 1) * limit + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pagination.currentPage * limit, pagination.totalItems)}
              </strong>{" "}
              of <strong className="text-foreground">{pagination.totalItems}</strong> user accounts
            </span>
          ) : (
            <span>
              Showing all <strong className="text-foreground">{users.length}</strong>{" "}
              {isArchived ? "archived" : "active"} user accounts
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

      {/* Provision & Edit Modal */}
      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} userToEdit={userToEdit} />

      {/* Multi-Role Modal */}
      {rolesUser && (
        <ManageRolesDialog
          open={Boolean(rolesUser)}
          onOpenChange={(open) => !open && setRolesUser(null)}
          user={rolesUser}
        />
      )}

      {/* Reset Password Modal */}
      <ConfirmActionDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="Reset User Password?"
        description={
          <span>
            Are you sure you want to reset the password for{" "}
            <strong>
              {resetTarget?.details.first_name} {resetTarget?.details.last_name}
            </strong>
            ? A new 12-character password will be auto-generated and emailed to{" "}
            <strong>{resetTarget?.account.email}</strong>.
          </span>
        }
        confirmLabel="Reset Password"
        variant="primary"
        isLoading={resetPasswordMutation.isPending}
        onConfirm={handleResetPasswordConfirm}
      />

      {/* Resend Credentials Modal */}
      <ConfirmActionDialog
        open={Boolean(resendTarget)}
        onOpenChange={(open) => !open && setResendTarget(null)}
        title="Re-send Account Credentials?"
        description={
          <span>
            This will generate a fresh temporary password and re-dispatch access instructions to{" "}
            <strong>{resendTarget?.account.email}</strong>.
          </span>
        }
        confirmLabel="Send Credentials"
        variant="primary"
        isLoading={resendWelcomeMutation.isPending}
        onConfirm={handleResendWelcomeConfirm}
      />

      {/* Archive Modal */}
      <ConfirmActionDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive User Account?"
        description={
          <span>
            Are you sure you want to archive{" "}
            <strong>
              {archiveTarget?.details.first_name} {archiveTarget?.details.last_name}
            </strong>
            ? They will no longer be able to log in or participate in evaluations.
          </span>
        }
        confirmLabel="Archive User"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      {/* Restore Modal */}
      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore User Account?"
        description={
          <span>
            This will reactivate access for{" "}
            <strong>
              {restoreTarget?.details.first_name} {restoreTarget?.details.last_name}
            </strong>
            .
          </span>
        }
        confirmLabel="Restore User"
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />

      {/* Bulk CSV Modal */}
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="users"
        entityTitle="User Accounts"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
      />
    </div>
  );
}
