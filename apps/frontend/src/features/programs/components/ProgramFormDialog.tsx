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
  CreateProgramSchema,
  type CreateProgram,
  type GetCollege,
  type GetProgram,
} from "@my-app/shared";
import { useCreateProgram, useUpdateProgram } from "../hooks/usePrograms";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { ApiError } from "@/lib/api.lib";
import { Check, ChevronsUpDown, UserCheck, UserPlus, UserX } from "lucide-react";
import { getErrorMessage } from "@/lib/error.lib";
import { cn } from "@/lib/utils";

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programToEdit?: GetProgram | null;
  colleges: GetCollege[];
}

export function ProgramFormDialog({
  open,
  onOpenChange,
  programToEdit,
  colleges,
}: ProgramFormDialogProps) {
  const formKey = open ? (programToEdit ? `edit-${programToEdit.program.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground">
        {open && (
          <ProgramFormInner
            key={formKey}
            programToEdit={programToEdit}
            colleges={colleges}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProgramFormInner({
  programToEdit,
  colleges,
  onClose,
}: {
  programToEdit?: GetProgram | null;
  colleges: GetCollege[];
  onClose: () => void;
}) {
  const isEditing = Boolean(programToEdit);
  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();

  const { data: usersResponse, isLoading: isLoadingFaculty } = useUsers({
    role: "FACULTY",
    paginate: false,
  });
  const facultyUsers = usersResponse?.data ?? [];

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateProgram | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [chairComboboxOpen, setChairComboboxOpen] = useState(false);

  const [chairMode, setChairMode] = useState<"none" | "existing" | "new">(() => {
    if (programToEdit?.chair) return "existing";
    return "none";
  });

  const form = useForm({
    defaultValues: {
      program: {
        name: programToEdit?.program.name || "",
        initialism: programToEdit?.program.initialism || "",
        college_id: programToEdit?.program.college_id || colleges[0]?.college.id || 0,
      },
      chair: programToEdit?.chair
        ? {
            type: "existing",
            account_id: programToEdit.chair.account.id,
          }
        : undefined,
    } as CreateProgram,
    validators: {
      onChange: CreateProgramSchema,
    },
    onSubmit: ({ value }) => {
      const sanitizedPayload: CreateProgram = {
        program: {
          ...value.program,
          college_id: Number(value.program.college_id),
        },
        chair: chairMode === "none" ? undefined : value.chair,
      };

      setPendingValues(sanitizedPayload);
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && programToEdit) {
        await updateMutation.mutateAsync({
          id: programToEdit.program.id,
          info: {
            program: pendingValues.program,
            chair: pendingValues.chair,
          },
        });
        toast.success(`Program "${pendingValues.program.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success(`Program "${pendingValues.program.name}" created successfully.`);
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save program.");
      toast.error(apiErr.message || "Failed to save program.");
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
          {isEditing ? "Edit Academic Program" : "Add New Academic Program"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Update academic program details, college assignment, or program chair."
            : "Register a new degree program under an institutional college."}
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

        <form.Field name="program.college_id">
          {(field) => {
            const selectedCollege = colleges.find(
              (c) => c.college.id === Number(field.state.value),
            );

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Parent College</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                >
                  {/* 🚀 w-full + h-10 ensures standard full-width alignment */}
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm text-foreground">
                    <SelectValue placeholder="Select a college...">
                      {selectedCollege ? (
                        <span className="truncate block text-left pr-2">
                          <strong className="font-mono text-primary mr-1.5">
                            {selectedCollege.college.initialism}
                          </strong>
                          <span className="text-muted-foreground">
                            ({selectedCollege.college.name})
                          </span>
                        </span>
                      ) : (
                        "Select a college..."
                      )}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                    {colleges.map((c) => (
                      <SelectItem key={c.college.id} value={String(c.college.id)}>
                        <div className="flex items-center gap-2 truncate text-left">
                          <span className="font-bold font-mono text-primary shrink-0">
                            {c.college.initialism}
                          </span>
                          <span className="text-muted-foreground truncate">- {c.college.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                  <p className="text-destructive text-xs mt-1">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="program.name">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="program-name" className="text-foreground">
                Program Name
              </Label>
              <Input
                id="program-name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Bachelor of Science in Information Technology"
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

        <form.Field name="program.initialism">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="program-code" className="text-foreground">
                Code / Initialism
              </Label>
              <Input
                id="program-code"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                placeholder="e.g. BSIT"
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

        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">Program Chair</Label>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>

          <Tabs
            value={chairMode}
            onValueChange={(val) => {
              const mode = val as "none" | "existing" | "new";
              setChairMode(mode);

              if (mode === "none") {
                form.setFieldValue("chair", undefined);
              } else if (mode === "existing") {
                form.setFieldValue("chair", {
                  type: "existing",
                  account_id: facultyUsers[0]?.account.id || 0,
                });
              } else if (mode === "new") {
                form.setFieldValue("chair", {
                  type: "new",
                  info: {
                    account: { email: "" },
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
                <span>No Chair</span>
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

          {chairMode === "existing" && (
            <form.Field name="chair">
              {(field) => {
                const selectedAccountId =
                  field.state.value?.type === "existing" ? field.state.value.account_id : undefined;

                const selectedUser = facultyUsers.find((u) => u.account.id === selectedAccountId);

                return (
                  <div className="w-full space-y-1.5 pt-1">
                    <Label className="text-xs text-muted-foreground">
                      Search & Select Faculty Member
                    </Label>

                    <Popover open={chairComboboxOpen} onOpenChange={setChairComboboxOpen}>
                      <PopoverTrigger>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={chairComboboxOpen}
                          disabled={isLoadingFaculty}
                          className="w-full h-10 px-3 flex items-center justify-between bg-background border-input text-foreground font-normal text-sm shadow-xs hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isLoadingFaculty ? (
                            <span className="text-muted-foreground">Loading faculty...</span>
                          ) : selectedUser ? (
                            <span className="truncate font-medium text-foreground">
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

                      <PopoverContent
                        align="start"
                        className="w-(--radix-popover-trigger-width) p-0 border-border bg-popover text-popover-foreground shadow-lg"
                      >
                        <Command
                          filter={(value, search) => {
                            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                          }}
                          className="w-full"
                        >
                          <CommandInput
                            placeholder="Type faculty name or ID..."
                            className="h-9 text-xs"
                          />
                          <CommandList className="max-h-56 w-full">
                            <CommandEmpty className="p-3 text-xs text-center text-muted-foreground">
                              No matching faculty members found.
                            </CommandEmpty>
                            <CommandGroup heading="Available Faculty" className="p-1">
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
                                      setChairComboboxOpen(false);
                                    }}
                                    className="cursor-pointer text-xs flex items-center justify-between px-2.5 py-2 rounded-md"
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

          {chairMode === "new" && (
            <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border">
              <p className="text-xs font-semibold text-foreground">New Faculty Chair Details</p>

              <div className="grid grid-cols-2 gap-2">
                <form.Field name="chair.info.details.first_name">
                  {(field) => (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">First Name</Label>
                      <Input
                        value={field.state.value || ""}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Jane"
                        className="h-8 text-xs bg-background"
                      />
                      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                        <p className="text-destructive text-[10px] mt-0.5">
                          {field.state.meta.errors.map(getErrorMessage).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>

                <form.Field name="chair.info.details.last_name">
                  {(field) => (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Last Name</Label>
                      <Input
                        value={field.state.value || ""}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Smith"
                        className="h-8 text-xs bg-background"
                      />
                      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                        <p className="text-destructive text-[10px] mt-0.5">
                          {field.state.meta.errors.map(getErrorMessage).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="chair.info.details.institutional_id">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Institutional ID</Label>
                    <Input
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g. 26-2055-001"
                      className="h-8 text-xs bg-background"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                      <p className="text-destructive text-[10px] mt-0.5">
                        {field.state.meta.errors.map(getErrorMessage).join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field name="chair.info.account.email">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Email Address</Label>
                    <Input
                      type="email"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="chair@pit.edu.ph"
                      className="h-8 text-xs bg-background"
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                      <p className="text-destructive text-[10px] mt-0.5">
                        {field.state.meta.errors.map(getErrorMessage).join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>
          )}
        </div>

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
              "Create Program"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Save Changes to Program?" : "Create New Program?"}
        description={
          <span>
            Are you sure you want to {isEditing ? "update" : "create"}{" "}
            <strong>
              {pendingValues?.program.name} ({pendingValues?.program.initialism})
            </strong>
            ?
            {pendingValues?.chair?.type === "new" && (
              <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400">
                A new faculty account will be created and appointed as{" "}
                <strong>SUPERVISOR (Program Chair)</strong>.
              </span>
            )}
          </span>
        }
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Create Program"}
        variant="primary"
        isLoading={isPending}
        onConfirm={handleConfirmedSave}
      />

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
