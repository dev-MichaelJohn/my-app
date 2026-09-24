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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import {
  CurriculumInsert,
  SemeterTermEnum,
  YearLevelEnum,
  type GetCurriculum,
  type GetProgram,
  type ICourseSelect,
  type ICurriculumInsert,
} from "@my-app/shared";
import { useCreateCurriculum, useUpdateCurriculum } from "../hooks/useCurriculums";
import type { ApiError } from "@/lib/api.lib";

interface CurriculumFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculumToEdit?: GetCurriculum | null;
  programs: GetProgram[];
  courses: ICourseSelect[];
}

export function CurriculumFormDialog({
  open,
  onOpenChange,
  curriculumToEdit,
  programs,
  courses,
}: CurriculumFormDialogProps) {
  const formKey = open ? (curriculumToEdit ? `edit-${curriculumToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <CurriculumFormInner
            key={formKey}
            curriculumToEdit={curriculumToEdit}
            programs={programs}
            courses={courses}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CurriculumFormInner({
  curriculumToEdit,
  programs,
  courses,
  onClose,
}: {
  curriculumToEdit?: GetCurriculum | null;
  programs: GetProgram[];
  courses: ICourseSelect[];
  onClose: () => void;
}) {
  const isEditing = Boolean(curriculumToEdit);
  const createMutation = useCreateCurriculum();
  const updateMutation = useUpdateCurriculum();

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ICurriculumInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      program_id: curriculumToEdit?.program.id || programs[0]?.program.id || 0,
      course_id: curriculumToEdit?.course.id || courses[0]?.id || 0,
      year_level: curriculumToEdit?.year_level || "I",
      semester_term: curriculumToEdit?.semester_term || "1st",
    } as ICurriculumInsert,
    validators: {
      onChange: CurriculumInsert,
    },
    onSubmit: ({ value }) => {
      setPendingValues({
        ...value,
        program_id: Number(value.program_id),
        course_id: Number(value.course_id),
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && curriculumToEdit) {
        await updateMutation.mutateAsync({
          id: curriculumToEdit.id,
          info: pendingValues,
        });
        toast.success("Curriculum mapping updated successfully.");
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success("Course mapped to curriculum successfully.");
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save curriculum mapping.");
      toast.error(apiErr.message || "Failed to save curriculum mapping.");
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
          {isEditing ? "Edit Curriculum Mapping" : "Map Course to Curriculum"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Update the academic year level or semester term for this course."
            : "Assign a subject/course to a degree program's academic syllabus slot."}
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

        <form.Field name="program_id">
          {(field) => {
            const selectedProgram = programs.find(
              (p) => p.program.id === Number(field.state.value),
            );

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Degree Program</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm text-foreground">
                    <SelectValue placeholder="Select program...">
                      {selectedProgram ? (
                        <span className="truncate block text-left pr-2">
                          <strong className="font-mono text-primary mr-1.5">
                            {selectedProgram.program.initialism}
                          </strong>
                          <span className="text-muted-foreground">
                            ({selectedProgram.program.name})
                          </span>
                        </span>
                      ) : (
                        "Select program..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                    {programs.map((p) => (
                      <SelectItem key={p.program.id} value={String(p.program.id)}>
                        <div className="flex items-center gap-2 truncate text-left">
                          <span className="font-bold font-mono text-primary shrink-0">
                            {p.program.initialism}
                          </span>
                          <span className="text-muted-foreground truncate">- {p.program.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>

        <form.Field name="course_id">
          {(field) => {
            const selectedCourse = courses.find((c) => c.id === Number(field.state.value));

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Course / Subject</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm text-foreground">
                    <SelectValue placeholder="Select course...">
                      {selectedCourse ? (
                        <span className="truncate block text-left pr-2">
                          <strong className="font-mono text-primary mr-1.5">
                            {selectedCourse.initialism}
                          </strong>
                          <span className="text-muted-foreground">({selectedCourse.name})</span>
                        </span>
                      ) : (
                        "Select course..."
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <div className="flex items-center gap-2 truncate text-left">
                          <span className="font-bold font-mono text-primary shrink-0">
                            {c.initialism}
                          </span>
                          <span className="text-muted-foreground truncate">- {c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="year_level">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Year Level</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val as any)}
                >
                  <SelectTrigger className="bg-background border-input text-sm h-10">
                    <SelectValue placeholder="Year Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-sm">
                    {YearLevelEnum.enumValues.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        Year {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field name="semester_term">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Semester Term</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val as any)}
                >
                  <SelectTrigger className="bg-background border-input text-sm h-10">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-sm">
                    {SemeterTermEnum.enumValues.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term} Semester
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
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
                <Spinner size="sm" className="text-primary-foreground" />
                <span>Saving...</span>
              </div>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Add to Curriculum"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Update Curriculum Mapping?" : "Confirm Curriculum Assignment?"}
        description="Are you sure you want to map this course to the selected degree program, year level, and semester term?"
        confirmLabel={isEditing ? "Yes, Update" : "Yes, Assign Course"}
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
