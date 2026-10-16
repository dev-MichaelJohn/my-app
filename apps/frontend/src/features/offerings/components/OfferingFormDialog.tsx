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
  OfferingInsert,
  type GetClass,
  type GetCurriculum,
  type GetOffering,
  type IOfferingInsert,
  type ISemesterSelect,
} from "@my-app/shared";
import { useCreateOffering, useUpdateOffering } from "../hooks/useOfferings";
import { useFaculties } from "@/features/faculties/hooks/useFaculties";
import type { ApiError } from "@/lib/api.lib";
import { Check, ChevronsUpDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfferingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringToEdit?: GetOffering | null;
  semesters: ISemesterSelect[];
  classes: GetClass[];
  curriculums: GetCurriculum[];
}

export function OfferingFormDialog({
  open,
  onOpenChange,
  offeringToEdit,
  semesters,
  classes,
  curriculums,
}: OfferingFormDialogProps) {
  const formKey = open ? (offeringToEdit ? `edit-${offeringToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <OfferingFormInner
            key={formKey}
            offeringToEdit={offeringToEdit}
            semesters={semesters}
            classes={classes}
            curriculums={curriculums}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OfferingFormInner({
  offeringToEdit,
  semesters,
  classes,
  curriculums,
  onClose,
}: {
  offeringToEdit?: GetOffering | null;
  semesters: ISemesterSelect[];
  classes: GetClass[];
  curriculums: GetCurriculum[];
  onClose: () => void;
}) {
  const isEditing = Boolean(offeringToEdit);
  const createMutation = useCreateOffering();
  const updateMutation = useUpdateOffering();

  // Load all appointed department faculty
  const { data: facultiesResponse, isLoading: isLoadingFaculty } = useFaculties({
    paginate: false,
    unscoped: true,
  });
  const facultiesList = facultiesResponse?.data ?? [];

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<IOfferingInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [facultyComboboxOpen, setFacultyComboboxOpen] = useState(false);

  // Type-safe resolution of initial faculty appointment ID
  const initialFacultyId = offeringToEdit?.faculty
    ? ((offeringToEdit.faculty as { faculty_id?: number }).faculty_id ??
      offeringToEdit.faculty.account.id)
    : null;

  const form = useForm({
    defaultValues: {
      semester_id: offeringToEdit?.semester.id || semesters[0]?.id || 0,
      class_id: offeringToEdit?.class.id || classes[0]?.id || 0,
      course_curriculum_id: offeringToEdit?.course_curriculum.id || curriculums[0]?.id || 0,
      faculty_id: initialFacultyId,
    } as IOfferingInsert,
    validators: {
      onChange: OfferingInsert,
    },
    onSubmit: ({ value }) => {
      setPendingValues({
        ...value,
        semester_id: Number(value.semester_id),
        class_id: Number(value.class_id),
        course_curriculum_id: Number(value.course_curriculum_id),
        faculty_id: value.faculty_id ? Number(value.faculty_id) : null,
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && offeringToEdit) {
        await updateMutation.mutateAsync({
          id: offeringToEdit.id,
          info: pendingValues,
        });
        toast.success("Course offering updated successfully.");
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success("Course offering scheduled successfully.");
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save course offering.");
      toast.error(apiErr.message || "Failed to save course offering.");
      setConfirmSaveOpen(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {isEditing ? "Assign Instructor & Edit Offering" : "Schedule Course Offering"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Assign or change the faculty instructor for this class offering."
            : "Manually schedule a course subject for a class in an active semester."}
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

        {/* Academic Semester */}
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
                          <strong>{selectedSem.semester_term} Semester</strong> (A.Y.{" "}
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

        {/* Class Cohort */}
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

        {/* Course Subject */}
        <form.Field name="course_curriculum_id">
          {(field) => {
            const selectedCurr = curriculums.find((curr) => curr.id === Number(field.state.value));

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Course Subject</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm text-foreground">
                    <SelectValue placeholder="Select subject...">
                      {selectedCurr ? (
                        <span className="truncate block text-left">
                          <strong className="font-mono text-primary mr-1.5">
                            {selectedCurr.course.initialism}
                          </strong>
                          {selectedCurr.course.name} ({selectedCurr.program.initialism})
                        </span>
                      ) : (
                        "Select subject..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                    {curriculums.map((curr) => (
                      <SelectItem key={curr.id} value={String(curr.id)}>
                        <span className="font-bold font-mono text-primary mr-1.5">
                          {curr.course.initialism}
                        </span>
                        {curr.course.name} - Year {curr.year_level} ({curr.semester_term})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>

        {/* Faculty Combobox */}
        <form.Field name="faculty_id">
          {(field) => {
            const selectedFaculty = facultiesList.find(
              (f) =>
                f.id === Number(field.state.value) || f.account_id === Number(field.state.value),
            );

            return (
              <div className="w-full space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <Label className="text-foreground">Assigned Faculty Instructor</Label>
                  {field.state.value && (
                    <button
                      type="button"
                      onClick={() => field.handleChange(null)}
                      className="text-[11px] text-destructive hover:underline cursor-pointer"
                    >
                      Clear / Unassign
                    </button>
                  )}
                </div>

                <Popover open={facultyComboboxOpen} onOpenChange={setFacultyComboboxOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={facultyComboboxOpen}
                        disabled={isLoadingFaculty}
                        className="w-full h-10 px-3 flex items-center justify-between bg-background border-input text-foreground font-normal text-sm"
                      >
                        {selectedFaculty ? (
                          <span className="truncate font-medium text-foreground">
                            {selectedFaculty.user.details.last_name},{" "}
                            {selectedFaculty.user.details.first_name} (
                            {selectedFaculty.user.details.institutional_id}) —{" "}
                            <span className="font-mono text-primary font-bold">
                              {selectedFaculty.program.initialism}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Search and assign appointed instructor...
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    }
                  />

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
                        placeholder="Search instructor by name or ID..."
                        className="h-9 text-xs"
                      />
                      <CommandList className="max-h-56 w-full">
                        <CommandEmpty className="p-3 text-xs text-center text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">
                            No appointed instructors found.
                          </p>
                          <p className="text-[11px]">
                            Instructors must first be appointed in{" "}
                            <strong>Department Faculty</strong>.
                          </p>
                        </CommandEmpty>
                        <CommandGroup heading="Appointed Faculty Members" className="p-1">
                          {facultiesList.map((f) => {
                            const searchableText = `${f.user.details.last_name}, ${f.user.details.first_name} ${f.user.details.institutional_id} ${f.program.name} ${f.program.initialism}`;
                            const isSelected =
                              f.id === Number(field.state.value) ||
                              f.account_id === Number(field.state.value);

                            return (
                              <CommandItem
                                key={f.id}
                                value={searchableText}
                                onSelect={() => {
                                  field.handleChange(f.id); // Canonical Faculties.id
                                  setFacultyComboboxOpen(false);
                                }}
                                className="cursor-pointer text-xs flex items-center justify-between px-2.5 py-2 rounded-md"
                              >
                                <div className="flex flex-col truncate pr-2">
                                  <span className="font-semibold text-foreground truncate">
                                    {f.user.details.last_name}, {f.user.details.first_name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    ID: {f.user.details.institutional_id} • Dept:{" "}
                                    <strong className="text-primary">{f.program.initialism}</strong>
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

                {facultiesList.length === 0 && !isLoadingFaculty && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      No instructors appointed yet. Go to <strong>Department Faculty</strong> to
                      appoint instructors to an academic program.
                    </span>
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
                <Spinner size="sm" className="text-primary-foreground" />
                <span>Saving...</span>
              </div>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Schedule Offering"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Update Course Offering?" : "Confirm Course Offering?"}
        description="Are you sure you want to schedule this course offering with the selected instructor?"
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Schedule"}
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
