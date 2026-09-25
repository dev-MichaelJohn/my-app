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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import { StudentClassInsert, type GetOffering, type IStudentClassInsert } from "@my-app/shared";
import { useCreateStudentClass } from "../hooks/useStudentClasses";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { ApiError } from "@/lib/api.lib";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offering: GetOffering;
}

export function StudentClassFormDialog({
  open,
  onOpenChange,
  offering,
}: StudentClassFormDialogProps) {
  const createMutation = useCreateStudentClass();

  const { data: usersResponse, isLoading: isLoadingStudents } = useUsers({
    role: "STUDENT",
    paginate: false,
  });
  const studentsList = usersResponse?.data ?? [];

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<IStudentClassInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [studentComboboxOpen, setStudentComboboxOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      course_offering_id: offering.id,
      student_account_id: 0,
    } as IStudentClassInsert,
    validators: {
      onChange: StudentClassInsert,
    },
    onSubmit: ({ value }) => {
      setPendingValues({
        course_offering_id: Number(value.course_offering_id),
        student_account_id: Number(value.student_account_id),
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      await createMutation.mutateAsync(pendingValues);
      toast.success("Student enrolled in course offering successfully.");
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
      <DialogContent className="sm:max-w-[480px] border-border bg-card text-card-foreground overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Enroll Student / Irregular
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enroll a regular student or irregular cross-enrollee into this specific subject
            offering.
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
              ) : (
                "Enroll in Subject"
              )}
            </Button>
          </DialogFooter>
        </form>

        <ConfirmActionDialog
          open={confirmSaveOpen}
          onOpenChange={setConfirmSaveOpen}
          title="Confirm Subject Enrollment?"
          description="Are you sure you want to enroll this student into this course offering?"
          confirmLabel="Yes, Enroll Student"
          variant="primary"
          isLoading={isPending}
          onConfirm={handleConfirmedSave}
        />
      </DialogContent>
    </Dialog>
  );
}
