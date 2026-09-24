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
import { CreateCollegeSchema, type CreateCollege, type GetCollege } from "@my-app/shared";
import { useCreateCollege, useUpdateCollege } from "../hooks/useColleges";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { ApiError } from "@/lib/api.lib";
import { Check, ChevronsUpDown, UserCheck, UserPlus, UserX } from "lucide-react";
import { getErrorMessage } from "@/lib/error.lib";
import { cn } from "@/lib/utils";

interface CollegeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeToEdit?: GetCollege | null;
}

export function CollegeFormDialog({ open, onOpenChange, collegeToEdit }: CollegeFormDialogProps) {
  const formKey = open ? (collegeToEdit ? `edit-${collegeToEdit.college.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground">
        {open && (
          <CollegeFormInner
            key={formKey}
            collegeToEdit={collegeToEdit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CollegeFormInner({
  collegeToEdit,
  onClose,
}: {
  collegeToEdit?: GetCollege | null;
  onClose: () => void;
}) {
  const isEditing = Boolean(collegeToEdit);
  const createMutation = useCreateCollege();
  const updateMutation = useUpdateCollege();

  const { data: usersResponse, isLoading: isLoadingFaculty } = useUsers({
    role: "FACULTY",
    paginate: false,
  });
  const facultyUsers = usersResponse?.data ?? [];

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateCollege | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [facultyComboboxOpen, setFacultyComboboxOpen] = useState(false);

  const [deanMode, setDeanMode] = useState<"none" | "existing" | "new">(() => {
    if (collegeToEdit?.dean) return "existing";
    return "none";
  });

  const form = useForm({
    defaultValues: {
      college: {
        name: collegeToEdit?.college.name || "",
        initialism: collegeToEdit?.college.initialism || "",
      },
      dean: collegeToEdit?.dean
        ? {
            type: "existing",
            account_id: collegeToEdit.dean.account.id,
          }
        : undefined,
    } as CreateCollege,
    validators: {
      onChange: CreateCollegeSchema,
    },
    onSubmit: ({ value }) => {
      setPendingValues(value);
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && collegeToEdit) {
        await updateMutation.mutateAsync({
          id: collegeToEdit.college.id,
          info: {
            college: pendingValues.college,
            dean: pendingValues.dean,
          },
        });
        toast.success(`College "${pendingValues.college.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success(`College "${pendingValues.college.name}" created successfully.`);
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save college.");
      toast.error(apiErr.message || "Failed to save college.");
      setConfirmSaveOpen(false);
    }
  };

  const handleCancel = () => {
    if (form.state.isDirty) {
      setConfirmDiscardOpen(true);
    } else {
      onClose();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {isEditing ? "Edit College" : "Add New College"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Update institutional college details and dean appointments."
            : "Register a new college. You can assign an existing faculty or register a new dean."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5 py-3"
      >
        {generalError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md font-medium">
            {generalError}
          </div>
        )}

        {/* ── College Name ── */}
        <form.Field name="college.name">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="college-name" className="text-foreground">
                College Name
              </Label>
              <Input
                id="college-name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. College of Technology"
                className="bg-background border-input"
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-xs mt-1">
                  {field.state.meta.errors.map(getErrorMessage).join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        {/* ── College Initialism ── */}
        <form.Field name="college.initialism">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="college-code" className="text-foreground">
                Code / Initialism
              </Label>
              <Input
                id="college-code"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                placeholder="e.g. COT"
                maxLength={10}
                className="bg-background border-input font-mono uppercase"
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                <p className="text-destructive text-xs mt-1">
                  {field.state.meta.errors.map(getErrorMessage).join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        {/* ── Dean Appointment Modes ── */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">Appointed Dean</Label>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>

          <Tabs
            value={deanMode}
            onValueChange={(val) => {
              const mode = val as "none" | "existing" | "new";
              setDeanMode(mode);

              if (mode === "none") {
                form.setFieldValue("dean", undefined);
              } else if (mode === "existing") {
                form.setFieldValue("dean", {
                  type: "existing",
                  account_id: facultyUsers[0]?.account.id || 0,
                });
              } else if (mode === "new") {
                form.setFieldValue("dean", {
                  type: "new",
                  info: {
                    account: { personal_details_id: 0, email: "", password: "" },
                    details: {
                      institutional_id: "",
                      first_name: "",
                      last_name: "",
                      middle_name: null,
                      suffix: null,
                    },
                  },
                });
              }
            }}
          >
            <TabsList className="grid grid-cols-3 w-full bg-muted border border-border">
              <TabsTrigger value="none" className="text-xs gap-1.5">
                <UserX className="w-3.5 h-3.5" />
                <span>No Dean</span>
              </TabsTrigger>
              <TabsTrigger value="existing" className="text-xs gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Existing</span>
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Faculty</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 🚀 MODE A: Searchable Combobox for Existing Faculty */}
          {deanMode === "existing" && (
            <form.Field name="dean">
              {(field) => {
                const selectedAccountId =
                  field.state.value?.type === "existing" ? field.state.value.account_id : undefined;

                const selectedUser = facultyUsers.find((u) => u.account.id === selectedAccountId);

                return (
                  <div className="w-full space-y-1.5 pt-1">
                    <Label className="text-xs text-muted-foreground">
                      Search & Select Faculty Member
                    </Label>

                    <Popover open={facultyComboboxOpen} onOpenChange={setFacultyComboboxOpen}>
                      <PopoverTrigger>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={facultyComboboxOpen}
                          disabled={isLoadingFaculty}
                          className="w-full justify-between bg-background border-input font-normal text-sm"
                        >
                          {isLoadingFaculty ? (
                            <span className="text-muted-foreground">Loading faculty...</span>
                          ) : selectedUser ? (
                            <span className="truncate">
                              {selectedUser.details.last_name}, {selectedUser.details.first_name} (
                              {selectedUser.details.institutional_id})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Search by name or institutional ID...
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent className="w-[490px] p-0 border-border bg-popover text-popover-foreground">
                        <Command
                          filter={(value, search) => {
                            // Searches name, ID, or email
                            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                          }}
                        >
                          <CommandInput
                            placeholder="Type faculty name or ID (e.g. 04-0204-20)..."
                            className="h-9 text-xs"
                          />
                          <CommandList className="max-h-56">
                            <CommandEmpty className="p-3 text-xs text-center text-muted-foreground">
                              No matching faculty members found.
                            </CommandEmpty>
                            <CommandGroup heading="Available Faculty">
                              {facultyUsers.map((u) => {
                                const searchableText = `${u.details.last_name}, ${u.details.first_name} ${u.details.institutional_id} ${u.account.email}`;
                                const isSelected = u.account.id === selectedAccountId;

                                return (
                                  <CommandItem
                                    key={u.account.id}
                                    value={searchableText}
                                    onSelect={() => {
                                      field.handleChange({
                                        type: "existing",
                                        account_id: u.account.id,
                                      });
                                      setFacultyComboboxOpen(false);
                                    }}
                                    className="cursor-pointer text-xs flex items-center justify-between"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-foreground">
                                        {u.details.last_name}, {u.details.first_name}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">
                                        ID: {u.details.institutional_id} • {u.account.email}
                                      </span>
                                    </div>
                                    <Check
                                      className={cn(
                                        "h-4 w-4 text-primary",
                                        isSelected ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              }}
            </form.Field>
          )}

          {/* ── MODE B: Register New Faculty Dean ── */}
          {deanMode === "new" && (
            <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border">
              <p className="text-xs font-semibold text-foreground">New Faculty Dean Details</p>

              <div className="grid grid-cols-2 gap-2">
                <form.Field name="dean.info.details.first_name">
                  {(field) => (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">First Name</Label>
                      <Input
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="John"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="dean.info.details.last_name">
                  {(field) => (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Last Name</Label>
                      <Input
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Doe"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="dean.info.details.institutional_id">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Institutional ID</Label>
                    <Input
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. 26-1042-001"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="dean.info.account.email">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Email Address</Label>
                    <Input
                      type="email"
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="dean@pit.edu.ph"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </form.Field>
            </div>
          )}
        </div>

        {/* ── Dialog Actions ── */}
        <DialogFooter className="pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
            className="border-border text-foreground hover:bg-muted"
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
              "Create College"
            )}
          </Button>
        </DialogFooter>
      </form>

      {/* ── Confirm Save Dialog ── */}
      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Save Changes to College?" : "Create New College?"}
        description={
          <span>
            Are you sure you want to {isEditing ? "update" : "create"}{" "}
            <strong>
              {pendingValues?.college.name} ({pendingValues?.college.initialism})
            </strong>
            ?
            {pendingValues?.dean?.type === "new" && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ A new user account will be created and assigned the <strong>SUPERVISOR</strong>{" "}
                role.
              </p>
            )}
          </span>
        }
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Create College"}
        variant="primary"
        isLoading={isPending}
        onConfirm={handleConfirmedSave}
      />

      {/* ── Confirm Discard Dialog ── */}
      <ConfirmActionDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits in this form. Are you sure you want to discard them? Any changes will be lost."
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
