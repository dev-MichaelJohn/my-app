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
  CourseInsert,
  type GetProgram,
  type ICourseInsert,
  type ICourseSelect,
} from "@my-app/shared";
import { useCreateCourse, useUpdateCourse } from "../hooks/useCourses";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseToEdit?: ICourseSelect | null;
  programs: GetProgram[];
}

export function CourseFormDialog({
  open,
  onOpenChange,
  courseToEdit,
  programs,
}: CourseFormDialogProps) {
  const formKey = open ? (courseToEdit ? `edit-${courseToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <CourseFormInner
            key={formKey}
            courseToEdit={courseToEdit}
            programs={programs}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CourseFormInner({
  courseToEdit,
  programs,
  onClose,
}: {
  courseToEdit?: ICourseSelect | null;
  programs: GetProgram[];
  onClose: () => void;
}) {
  const isEditing = Boolean(courseToEdit);
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ICourseInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: courseToEdit?.name || "",
      initialism: courseToEdit?.initialism || "",
      program_id: courseToEdit?.program_id || programs[0]?.program.id || 0,
    } as ICourseInsert,
    validators: {
      onChange: CourseInsert,
    },
    onSubmit: ({ value }) => {
      setPendingValues({
        ...value,
        program_id: Number(value.program_id),
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && courseToEdit) {
        await updateMutation.mutateAsync({
          id: courseToEdit.id,
          info: pendingValues,
        });
        toast.success(`Course "${pendingValues.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success(`Course "${pendingValues.name}" created successfully.`);
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save course.");
      toast.error(apiErr.message || "Failed to save course.");
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
          {isEditing ? "Edit Course" : "Add New Course"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Update course details or assign it to a different degree program."
            : "Register a new academic course / subject under a degree program."}
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
                    <SelectValue placeholder="Select a program...">
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
                        "Select a program..."
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

        <form.Field name="name">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="course-name" className="text-foreground">
                Course Title
              </Label>
              <Input
                id="course-name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Data Structures and Algorithms"
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

        <form.Field name="initialism">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="course-code" className="text-foreground">
                Course Code
              </Label>
              <Input
                id="course-code"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                placeholder="e.g. IT 102"
                maxLength={16}
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
              "Create Course"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Save Changes to Course?" : "Create New Course?"}
        description={
          <span>
            Are you sure you want to {isEditing ? "update" : "create"}{" "}
            <strong>
              {pendingValues?.name} ({pendingValues?.initialism})
            </strong>
            ?
          </span>
        }
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Create Course"}
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
