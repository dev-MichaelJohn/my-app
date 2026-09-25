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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import {
  ClassStudentInsert,
  type GetClass,
  type GetClassStudent,
  type IClassStudentInsert,
  type ISemesterSelect,
} from "@my-app/shared";
import { useCreateClassStudent, useUpdateClassStudent } from "../hooks/useClassStudents";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { ApiError } from "@/lib/api.lib";
import { Check, ChevronsUpDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassStudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentToEdit?: GetClassStudent | null;
  semesters: ISemesterSelect[];
  classes: GetClass[];
  defaultClassId?: number;
  defaultSemesterId?: number;
}

export function ClassStudentFormDialog({
  open,
  onOpenChange,
  enrollmentToEdit,
  semesters,
  classes,
  defaultClassId,
  defaultSemesterId,
}: ClassStudentFormDialogProps) {
  const formKey = open ? (enrollmentToEdit ? `edit-${enrollmentToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <ClassStudentFormInner
            key={formKey}
            enrollmentToEdit={enrollmentToEdit}
            semesters={semesters}
            classes={classes}
            defaultClassId={defaultClassId}
            defaultSemesterId={defaultSemesterId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClassStudentFormInner({
  enrollmentToEdit,
  semesters,
  classes,
  defaultClassId,
  defaultSemesterId,
  onClose,
}: {
  enrollmentToEdit?: GetClassStudent | null;
  semesters: ISemesterSelect[];
  classes: GetClass[];
  defaultClassId?: number;
  defaultSemesterId?: number;
  onClose: () => void;
}) {
  const isEditing = Boolean(enrollmentToEdit);
  const createMutation = useCreateClassStudent();
  const updateMutation = useUpdateClassStudent();

  const { data: usersResponse, isLoading: isLoadingStudents } = useUsers({
    role: "STUDENT",
    paginate: false,
  });
  const studentsList = usersResponse?.data ?? [];

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<IClassStudentInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [studentComboboxOpen, setStudentComboboxOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      semester_id: enrollmentToEdit?.semester.id || defaultSemesterId || semesters[0]?.id || 0,
      class_id: enrollmentToEdit?.class.id || defaultClassId || classes[0]?.id || 0,
      student_account_id: enrollmentToEdit?.student?.account.id || 0,
    } as IClassStudentInsert,
    validators: {
      onChange: ClassStudentInsert,
    },
    onSubmit: ({ value }) => {
      setPendingValues({
        semester_id: Number(value.semester_id),
        class_id: Number(value.class_id),
        student_account_id: Number(value.student_account_id),
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && enrollmentToEdit) {
        await updateMutation.mutateAsync({
          id: enrollmentToEdit.id,
          info: pendingValues,
        });
        toast.success("Student enrollment updated successfully.");
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success("Student enrolled in class roster successfully.");
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to enroll student.");
      toast.error(apiErr.message || "Failed to enroll student.");
      setConfirmSaveOpen(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {isEditing ? "Edit Student Enrollment" : "Enroll Student into Class"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Reassign this student to a different class section or semester term."
            : "Add a student to this class section roster for the semester."}
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
            Enrolling a student automatically assigns them to all scheduled course offerings for
            this class section.
          </span>
        </div>

        <form.Field name="semester_id">
          {(field) => {
            const selectedSem = semesters.find((s) => s.id === Number(field.state.value));

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Academic Semester</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm text-foreground">
                    <SelectValue placeholder="Select semester...">
                      {selectedSem ? (
                        <span className="truncate block text-left">
                          <strong>{selectedSem.semester_term} Sem</strong> (A.Y.{" "}
                          {selectedSem.school_year_start}-{selectedSem.school_year_end})
                        </span>
                      ) : (
                        "Select semester..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                    {semesters.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>

        <form.Field name="class_id">
          {(field) => {
            const selectedClass = classes.find((c) => c.id === Number(field.state.value));

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Class Cohort / Section</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm text-foreground">
                    <SelectValue placeholder="Select class...">
                      {selectedClass ? (
                        <span className="truncate block text-left">
                          <strong className="font-mono text-primary mr-1.5">
                            {selectedClass.program.initialism}
                          </strong>
                          {selectedClass.year_level}-{selectedClass.section} (
                          {selectedClass.program.name})
                        </span>
                      ) : (
                        "Select class..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="font-bold font-mono text-primary mr-1.5">
                          {c.program.initialism}
                        </span>
                        {c.year_level}-{c.section} - {c.program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>

        <form.Field name="student_account_id">
          {(field) => {
            const selectedStudent = studentsList.find(
              (u) => u.account.id === Number(field.state.value),
            );

            return (
              <div className="w-full space-y-1.5 pt-1">
                <Label className="text-foreground">Enrolled Student</Label>

                <Popover open={studentComboboxOpen} onOpenChange={setStudentComboboxOpen}>
                  <PopoverTrigger>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={studentComboboxOpen}
                      disabled={isLoadingStudents || isEditing}
                      className="w-full h-10 px-3 flex items-center justify-between bg-background border-input text-foreground font-normal text-sm"
                    >
                      {selectedStudent ? (
                        <span className="truncate font-medium text-foreground">
                          {selectedStudent.details.last_name}, {selectedStudent.details.first_name}{" "}
                          ({selectedStudent.details.institutional_id})
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
                        placeholder="Search student by name or ID..."
                        className="h-9 text-xs"
                      />
                      <CommandList className="max-h-56 w-full">
                        <CommandEmpty className="p-3 text-xs text-center text-muted-foreground">
                          No matching student accounts found.
                        </CommandEmpty>
                        <CommandGroup heading="Student Accounts" className="p-1">
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

        <DialogFooter className="pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (form.state.isDirty) setConfirmDiscardOpen(true);
              else onClose();
            }}
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
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Enroll Student"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Update Class Enrollment?" : "Confirm Student Enrollment?"}
        description="Are you sure you want to enroll this student in the selected class section? They will automatically be enrolled in all scheduled course offerings."
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Enroll Student"}
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
