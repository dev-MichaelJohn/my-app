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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import {
  CreateFacultyPayloadSchema,
  type CreateFacultyPayload,
  type GetFaculty,
  type GetProgram,
} from "@my-app/shared";
import { useCreateFaculty, useUpdateFaculty } from "../hooks/useFaculties";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";
import { Check, ChevronsUpDown, Info, UserCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facultyToEdit?: GetFaculty | null;
  programs: GetProgram[];
  defaultProgramId?: number;
}

export function FacultyFormDialog({
  open,
  onOpenChange,
  facultyToEdit,
  programs,
  defaultProgramId,
}: Props) {
  const formKey = open ? (facultyToEdit ? `edit-${facultyToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground">
        {open && (
          <FormInner
            key={formKey}
            facultyToEdit={facultyToEdit}
            programs={programs}
            defaultProgramId={defaultProgramId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormInner({
  facultyToEdit,
  programs,
  defaultProgramId,
  onClose,
}: {
  facultyToEdit?: GetFaculty | null;
  programs: GetProgram[];
  defaultProgramId?: number;
  onClose: () => void;
}) {
  const isEditing = Boolean(facultyToEdit);
  const createMutation = useCreateFaculty();
  const updateMutation = useUpdateFaculty();

  const { data: usersResponse, isLoading: isLoadingUsers } = useUsers(
    { role: "FACULTY", paginate: false },
    !isEditing,
  );
  const facultyUsers = usersResponse?.data ?? [];

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateFacultyPayload | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [userComboboxOpen, setUserComboboxOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      account_id: facultyToEdit?.account_id || 0,
      program_id: facultyToEdit?.program_id || defaultProgramId || programs[0]?.program.id || 0,
      new_user: {
        account: {
          email: "",
        },
        details: {
          institutional_id: "",
          first_name: "",
          last_name: "",
          middle_name: "",
          suffix: "",
        },
      },
    },
    onSubmit: ({ value }) => {
      setGeneralError(null);

      if (isEditing) {
        setPendingValues({
          account_id: facultyToEdit!.account_id,
          program_id: Number(value.program_id),
        });
        setConfirmSaveOpen(true);
        return;
      }

      const payload: CreateFacultyPayload =
        mode === "new"
          ? {
              program_id: Number(value.program_id),
              new_user: {
                account: {
                  email: value.new_user.account.email.trim(),
                },
                details: {
                  institutional_id: value.new_user.details.institutional_id.trim(),
                  first_name: value.new_user.details.first_name.trim(),
                  last_name: value.new_user.details.last_name.trim(),
                  middle_name: value.new_user.details.middle_name?.trim() || null,
                  suffix: value.new_user.details.suffix?.trim() || null,
                },
              },
            }
          : {
              account_id: Number(value.account_id),
              program_id: Number(value.program_id),
            };

      const validation = CreateFacultyPayloadSchema.safeParse(payload);
      if (!validation.success) {
        const msg = validation.error.issues[0]?.message || "Please complete all required fields.";
        setGeneralError(msg);
        return;
      }

      setPendingValues(validation.data);
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && facultyToEdit) {
        await updateMutation.mutateAsync({
          id: facultyToEdit.id,
          info: { program_id: pendingValues.program_id },
        });
        toast.success("Faculty department assignment updated.");
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success(
          "new_user" in pendingValues
            ? "New faculty account provisioned and appointed successfully."
            : "Instructor appointed to department successfully.",
        );
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to appoint faculty member.");
      toast.error(apiErr.message || "Failed to appoint faculty member.");
      setConfirmSaveOpen(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {isEditing ? "Transfer / Edit Department Appointment" : "Add / Appoint Faculty"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Reassign this faculty member to another academic department / program."
            : "Appoint an existing instructor or register a new faculty member under your department."}
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
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md font-medium">
            {generalError}
          </div>
        )}

        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2.5 text-xs text-foreground">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            The appointed program becomes the teacher's official <strong>Home Department</strong>.
            Their Program Chair conducts their semester supervisory evaluations (SEF).
          </span>
        </div>

        {/* ── Mode Switcher (Only when creating) ── */}
        {!isEditing && (
          <Tabs
            value={mode}
            onValueChange={(val) => {
              setMode(val as "existing" | "new");
              setGeneralError(null);
            }}
          >
            <TabsList className="grid grid-cols-2 w-full bg-muted border border-border">
              <TabsTrigger value="existing" className="text-xs gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Existing Account</span>
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Faculty Member</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* ── Existing Account Selector OR Edit Readonly Banner ── */}
        {(isEditing || mode === "existing") && (
          <form.Field name="account_id">
            {(field) => {
              const selectedUser = isEditing
                ? facultyToEdit?.user
                : facultyUsers.find((u) => u.account.id === Number(field.state.value));

              return (
                <div className="w-full space-y-1.5 pt-1">
                  <Label className="text-foreground">Faculty Member</Label>

                  {isEditing ? (
                    <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs font-semibold text-foreground">
                      {facultyToEdit?.user.details.last_name},{" "}
                      {facultyToEdit?.user.details.first_name} (
                      {facultyToEdit?.user.details.institutional_id})
                    </div>
                  ) : (
                    <Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}>
                      <PopoverTrigger>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          disabled={isLoadingUsers}
                          className="w-full h-10 px-3 flex items-center justify-between bg-background border-input text-foreground font-normal text-sm"
                        >
                          {selectedUser ? (
                            <span className="truncate font-medium text-foreground">
                              {selectedUser.details.last_name}, {selectedUser.details.first_name} (
                              {selectedUser.details.institutional_id})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Search faculty by name or ID...
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        align="start"
                        className="w-(--radix-popover-trigger-width) p-0 border-border bg-popover text-popover-foreground shadow-lg"
                      >
                        <Command
                          filter={(val, search) =>
                            val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                          }
                        >
                          <CommandInput
                            placeholder="Search instructor name or ID..."
                            className="h-9 text-xs"
                          />
                          <CommandList className="max-h-56">
                            <CommandEmpty className="p-3 text-xs text-center text-muted-foreground">
                              No matching faculty accounts found. Switch to "New Faculty Member" to
                              register one.
                            </CommandEmpty>
                            <CommandGroup heading="Faculty Accounts" className="p-1">
                              {facultyUsers.map((u) => (
                                <CommandItem
                                  key={u.account.id}
                                  value={`${u.details.last_name}, ${u.details.first_name} ${u.details.institutional_id} ${u.account.email}`}
                                  onSelect={() => {
                                    field.handleChange(u.account.id);
                                    setUserComboboxOpen(false);
                                  }}
                                  className="cursor-pointer text-xs flex items-center justify-between px-2.5 py-2"
                                >
                                  <div className="flex flex-col truncate pr-2">
                                    <span className="font-semibold text-foreground truncate">
                                      {u.details.last_name}, {u.details.first_name}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground truncate">
                                      ID: {u.details.institutional_id} • {u.account.email}
                                    </span>
                                  </div>
                                  <Check
                                    className={cn(
                                      "h-4 w-4 text-primary shrink-0",
                                      u.account.id === Number(field.state.value)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              );
            }}
          </form.Field>
        )}

        {/* ── New Faculty Member Fields ── */}
        {!isEditing && mode === "new" && (
          <div className="space-y-3 p-3.5 bg-muted/40 rounded-xl border border-border">
            <p className="text-xs font-semibold text-foreground">
              New Faculty Account Details (Temporary password will be emailed)
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <form.Field name="new_user.details.first_name">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">First Name *</Label>
                    <Input
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Juan"
                      className="h-8 text-xs bg-background"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-[10px]">
                        {field.state.meta.errors.map(getErrorMessage).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="new_user.details.last_name">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Last Name *</Label>
                    <Input
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Dela Cruz"
                      className="h-8 text-xs bg-background"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p className="text-destructive text-[10px]">
                        {field.state.meta.errors.map(getErrorMessage).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <form.Field name="new_user.details.middle_name">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Middle Name (Optional)
                    </Label>
                    <Input
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Santos"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="new_user.details.suffix">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Suffix (Optional)</Label>
                    <Input
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Jr., III"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="new_user.details.institutional_id">
              {(field) => (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Institutional ID *</Label>
                  <Input
                    value={field.state.value || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. 04-0204-33"
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="new_user.account.email">
              {(field) => (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Institutional Email *</Label>
                  <Input
                    type="email"
                    value={field.state.value || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="faculty@pit.edu.ph"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              )}
            </form.Field>
          </div>
        )}

        {/* ── Academic Program / Department ── */}
        <form.Field name="program_id">
          {(field) => {
            const selectedProgram = programs.find(
              (p) => p.program.id === Number(field.state.value),
            );

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Appointed Home Program / Department</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => val && field.handleChange(Number(val))}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm text-foreground">
                    <SelectValue placeholder="Select program...">
                      {selectedProgram ? (
                        <span className="truncate block text-left">
                          <strong className="font-mono text-primary mr-1.5">
                            {selectedProgram.program.initialism}
                          </strong>
                          {selectedProgram.program.name}
                        </span>
                      ) : (
                        "Select program..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                    {programs.map((p) => (
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
            ) : mode === "new" ? (
              "Create & Appoint Faculty"
            ) : (
              "Appoint Faculty"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={
          isEditing
            ? "Transfer Department Appointment?"
            : pendingValues && "new_user" in pendingValues
              ? "Create Account & Appoint Faculty?"
              : "Confirm Faculty Appointment?"
        }
        description={
          pendingValues && "new_user" in pendingValues ? (
            <span>
              This will create a new <strong>FACULTY</strong> user account for{" "}
              <strong>
                {pendingValues.new_user.details.first_name}{" "}
                {pendingValues.new_user.details.last_name}
              </strong>{" "}
              (emailing their temporary credentials) and appoint them to the selected program.
            </span>
          ) : (
            "Are you sure you want to appoint this faculty member to the selected academic program?"
          )
        }
        confirmLabel="Yes, Confirm"
        variant="primary"
        isLoading={isPending}
        onConfirm={handleConfirmedSave}
      />

      <ConfirmActionDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        title="Discard Unsaved Changes?"
        description="You have unsaved selections in this form. Are you sure you want to discard them?"
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
