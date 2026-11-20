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
import {
  CreateOfferingStudentPayloadSchema,
  type CreateOfferingStudentPayload,
  type GetOffering,
} from "@my-app/shared";
import { useCreateOfferingStudent } from "../hooks/useOfferingStudents";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";
import { Check, ChevronsUpDown, UserCheck, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfferingStudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offering: GetOffering;
}

export function OfferingStudentFormDialog({
  open,
  onOpenChange,
  offering,
}: OfferingStudentFormDialogProps) {
  const createMutation = useCreateOfferingStudent();

  const { data: usersResponse, isLoading: isLoadingStudents } = useUsers(
    { role: "STUDENT", paginate: false },
    open,
  );
  const studentsList = usersResponse?.data ?? [];

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<CreateOfferingStudentPayload | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [studentComboboxOpen, setStudentComboboxOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      course_offering_id: offering.id,
      student_account_id: 0,
      new_user: {
        account: { email: "" },
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

      const payload: CreateOfferingStudentPayload =
        mode === "new"
          ? {
              course_offering_id: offering.id,
              new_user: {
                account: { email: value.new_user.account.email.trim() },
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
              course_offering_id: offering.id,
              student_account_id: Number(value.student_account_id),
            };

      const validation = CreateOfferingStudentPayloadSchema.safeParse(payload);
      if (!validation.success) {
        setGeneralError(
          validation.error.issues[0]?.message || "Please complete all required fields.",
        );
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
      await createMutation.mutateAsync(pendingValues);
      toast.success(
        "new_user" in pendingValues
          ? "New student account created and enrolled in this offering."
          : "Student enrolled in course offering successfully.",
      );
      setConfirmSaveOpen(false);
      onOpenChange(false);
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to enroll student.");
      toast.error(apiErr.message || "Failed to enroll student.");
      setConfirmSaveOpen(false);
    }
  };

  const isPending = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Enroll Student in Offering
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enroll an existing student or create a new student account strictly for this course
            offering (e.g., irregular/cross-enrollee).
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

          <div className="p-3 bg-muted/50 border border-border/80 rounded-lg space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Course:</span>
              <span className="font-bold text-foreground">
                {offering.course_curriculum.course.initialism} -{" "}
                {offering.course_curriculum.course.name}
              </span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-muted-foreground font-medium">Class Section:</span>
              <span className="font-semibold text-foreground">
                {offering.class.program.initialism} {offering.class.year_level}-
                {offering.class.section}
              </span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-muted-foreground font-medium">Semester:</span>
              <span className="text-foreground font-medium">
                {offering.semester.semester_term} Sem ({offering.semester.school_year_start}-
                {offering.semester.school_year_end})
              </span>
            </div>
          </div>

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
                <span>Existing Student</span>
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Student Account</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "existing" && (
            <form.Field name="student_account_id">
              {(field) => {
                const selectedStudent = studentsList.find(
                  (u) => u.account.id === Number(field.state.value),
                );

                return (
                  <div className="w-full space-y-1.5 pt-1">
                    <Label className="text-foreground">Student (Regular or Irregular)</Label>

                    <Popover open={studentComboboxOpen} onOpenChange={setStudentComboboxOpen}>
                      <PopoverTrigger>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={studentComboboxOpen}
                          disabled={isLoadingStudents}
                          className="w-full h-10 px-3 flex items-center justify-between bg-background border-input text-foreground font-normal text-sm"
                        >
                          {selectedStudent ? (
                            <span className="truncate font-medium text-foreground">
                              {selectedStudent.details.last_name},{" "}
                              {selectedStudent.details.first_name} (
                              {selectedStudent.details.institutional_id})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Search student by name or ID...
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
                          filter={(value, search) =>
                            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                          }
                          className="w-full"
                        >
                          <CommandInput
                            placeholder="Search student name or ID..."
                            className="h-9 text-xs"
                          />
                          <CommandList className="max-h-56 w-full">
                            <CommandEmpty className="p-3 text-xs text-center text-muted-foreground">
                              No matching student accounts found.
                            </CommandEmpty>
                            <CommandGroup heading="All Student Accounts" className="p-1">
                              {studentsList.map((u) => {
                                const searchableText = `${u.details.last_name}, ${u.details.first_name} ${u.details.institutional_id} ${u.account.email}`;
                                const isSelected = u.account.id === Number(field.state.value);

                                return (
                                  <CommandItem
                                    key={u.account.id}
                                    value={searchableText}
                                    onSelect={() => {
                                      field.handleChange(u.account.id);
                                      setStudentComboboxOpen(false);
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

          {mode === "new" && (
            <div className="space-y-3 p-3.5 bg-muted/40 rounded-xl border border-border">
              <p className="text-xs font-semibold text-foreground">
                New Student Account Details (Enrolled only in this offering)
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
                      placeholder="e.g. 26-1042-003"
                      className="h-8 text-xs bg-background font-mono"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="new_user.account.email">
                {(field) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Institutional Email *
                    </Label>
                    <Input
                      type="email"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="student@pit.edu.ph"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </form.Field>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
                  <span>Enrolling...</span>
                </div>
              ) : mode === "new" ? (
                "Create & Enroll in Subject"
              ) : (
                "Enroll in Subject"
              )}
            </Button>
          </DialogFooter>
        </form>

        <ConfirmActionDialog
          open={confirmSaveOpen}
          onOpenChange={setConfirmSaveOpen}
          title="Confirm Offering Enrollment?"
          description={
            pendingValues && "new_user" in pendingValues ? (
              <span>
                This will create a new <strong>STUDENT</strong> account for{" "}
                <strong>
                  {pendingValues.new_user.details.first_name}{" "}
                  {pendingValues.new_user.details.last_name}
                </strong>{" "}
                and enroll them ONLY in{" "}
                <strong>{offering.course_curriculum.course.initialism}</strong>.
              </span>
            ) : (
              "Are you sure you want to enroll this student into this course offering?"
            )
          }
          confirmLabel="Yes, Enroll Student"
          variant="primary"
          isLoading={isPending}
          onConfirm={handleConfirmedSave}
        />
      </DialogContent>
    </Dialog>
  );
}
