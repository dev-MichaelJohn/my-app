import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import {
  CreateUserSchema,
  UpdateUserSchema,
  SystemRoles,
  type CreateUser,
  type GetUser,
  type SystemRole,
} from "@my-app/shared";
import { useCreateUser, useUpdateUser } from "../hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/error.lib";
import { Lock } from "lucide-react";
import type { ApiError } from "@/lib/api.lib";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: GetUser | null;
}

export function UserFormDialog({ open, onOpenChange, userToEdit }: Props) {
  const formKey = open ? (userToEdit ? `edit-${userToEdit.account.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground">
        {open && (
          <FormInner key={formKey} userToEdit={userToEdit} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormInner({ userToEdit, onClose }: { userToEdit?: GetUser | null; onClose: () => void }) {
  const isEditing = Boolean(userToEdit);
  const { hasRole } = usePermissions();
  const isSysAdmin = hasRole("SYS_ADMIN");

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateUser | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Check active offices held
  const deanships = userToEdit?.offices?.deanships || [];
  const chairships = userToEdit?.offices?.chairships || [];
  const isHoldingOffice = deanships.length > 0 || chairships.length > 0;

  const officeNames = [
    ...deanships.map((d) => `Dean of ${d.initialism}`),
    ...chairships.map((c) => `Chair of ${c.initialism}`),
  ].join(" & ");

  const availableRoles = isSysAdmin
    ? SystemRoles.enumValues
    : SystemRoles.enumValues.filter((r) => r !== "ADMIN" && r !== "SYS_ADMIN");

  const [defaultValues] = useState<CreateUser>(() => ({
    account: {
      email: userToEdit?.account.email || "",
      password: "",
    },
    details: {
      institutional_id: userToEdit?.details.institutional_id || "",
      first_name: userToEdit?.details.first_name || "",
      last_name: userToEdit?.details.last_name || "",
      middle_name: userToEdit?.details.middle_name || "",
      suffix: userToEdit?.details.suffix || "",
    },
    role: (userToEdit?.roles?.[0] as SystemRole) || "STUDENT",
  }));

  const form = useForm({
    defaultValues,
    validators: {
      onChange: ({ value }) => {
        const schema = isEditing ? UpdateUserSchema : CreateUserSchema;
        const result = schema.safeParse(value);
        if (!result.success) {
          return result.error.issues[0]?.message;
        }
        return undefined;
      },
    },
    onSubmit: ({ value }) => {
      const sanitizedPayload: CreateUser = {
        account: {
          email: value.account.email,
          password: value.account.password?.trim() ? value.account.password.trim() : undefined,
        },
        details: {
          institutional_id: value.details.institutional_id,
          first_name: value.details.first_name,
          last_name: value.details.last_name,
          middle_name: value.details.middle_name?.trim() || null,
          suffix: value.details.suffix?.trim() || null,
        },
        role: value.role,
      };

      setPendingValues(sanitizedPayload);
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && userToEdit) {
        await updateMutation.mutateAsync({
          id: userToEdit.account.id,
          data: {
            account: {
              email: pendingValues.account.email,
              password: pendingValues.account.password || undefined,
            },
            details: pendingValues.details,
            role: pendingValues.role,
          },
        });
        toast.success(
          `User "${pendingValues.details.first_name} ${pendingValues.details.last_name}" updated.`,
        );
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success(
          `User "${pendingValues.details.first_name} ${pendingValues.details.last_name}" provisioned.`,
        );
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save user account.");
      toast.error(apiErr.message || "Failed to save user account.");
      setConfirmSaveOpen(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {isEditing ? "Edit User Account" : "Provision New User Account"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Update user profile details, email address, or primary role."
            : "Register a new student, faculty member, or supervisor. Credentials will be emailed automatically."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4 py-2"
      >
        {generalError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg font-medium">
            {generalError}
          </div>
        )}

        {isHoldingOffice && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2 text-xs text-foreground">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <span>
              This user currently holds office as <strong>{officeNames}</strong>. Primary role is
              locked to <strong>SUPERVISOR</strong>.
            </span>
          </div>
        )}

        {/* Institutional ID & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <form.Field name="details.institutional_id">
            {(field) => {
              const hasError =
                (field.state.meta.isTouched || form.state.isSubmitted) &&
                field.state.meta.errors.length > 0;
              return (
                <div className="space-y-1.5">
                  <Label className="text-foreground">Institutional ID</Label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. 26-1042-001"
                    className={cn("bg-background font-mono", hasError && "border-destructive")}
                  />
                  {hasError && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Primary Role</Label>
                <Select
                  value={field.state.value}
                  disabled={isHoldingOffice}
                  onValueChange={(val) => field.handleChange(val as SystemRole)}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-sm">
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <form.Field name="details.first_name">
            {(field) => {
              const hasError =
                (field.state.meta.isTouched || form.state.isSubmitted) &&
                field.state.meta.errors.length > 0;
              return (
                <div className="space-y-1.5">
                  <Label className="text-foreground">First Name</Label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Juan"
                    className={cn("bg-background", hasError && "border-destructive")}
                  />
                  {hasError && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <form.Field name="details.last_name">
            {(field) => {
              const hasError =
                (field.state.meta.isTouched || form.state.isSubmitted) &&
                field.state.meta.errors.length > 0;
              return (
                <div className="space-y-1.5">
                  <Label className="text-foreground">Last Name</Label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Dela Cruz"
                    className={cn("bg-background", hasError && "border-destructive")}
                  />
                  {hasError && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <form.Field name="details.middle_name">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Middle Name (Optional)</Label>
                <Input
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Santos"
                  className="bg-background"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="details.suffix">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Suffix (Optional)</Label>
                <Input
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Jr., III"
                  className="bg-background"
                />
              </div>
            )}
          </form.Field>
        </div>

        {/* Account Email & Password */}
        <form.Field name="account.email">
          {(field) => {
            const hasError =
              (field.state.meta.isTouched || form.state.isSubmitted) &&
              field.state.meta.errors.length > 0;
            return (
              <div className="space-y-1.5">
                <Label className="text-foreground">Email Address</Label>
                <Input
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="user@pit.edu.ph"
                  className={cn("bg-background", hasError && "border-destructive")}
                />
                {hasError && (
                  <p className="text-destructive text-xs">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="account.password">
          {(field) => {
            const hasError =
              (field.state.meta.isTouched || form.state.isSubmitted) &&
              field.state.meta.errors.length > 0;
            return (
              <div className="space-y-1.5">
                <Label className="text-foreground">
                  {isEditing
                    ? "New Password (Leave blank to keep current)"
                    : "Initial Password (Optional)"}
                </Label>
                <Input
                  type="password"
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={
                    isEditing
                      ? "Leave blank to keep unchanged"
                      : "Leave blank to auto-generate password"
                  }
                  className={cn("bg-background", hasError && "border-destructive")}
                />
                {hasError && (
                  <p className="text-destructive text-xs">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        <DialogFooter className="pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (form.state.isDirty) setConfirmDiscardOpen(true);
              else onClose();
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-white" />
                <span>Saving...</span>
              </div>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Provision User"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Save Account Changes?" : "Provision New User Account?"}
        description={
          <span>
            Are you sure you want to {isEditing ? "update" : "create"} the account for{" "}
            <strong>
              {pendingValues?.details.first_name} {pendingValues?.details.last_name} (
              {pendingValues?.account.email})
            </strong>
            ?
          </span>
        }
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Create Account"}
        variant="primary"
        isLoading={isPending}
        onConfirm={handleConfirmedSave}
      />

      <ConfirmActionDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits in this form. Are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        cancelLabel="Continue Editing"
        variant="destructive"
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}
