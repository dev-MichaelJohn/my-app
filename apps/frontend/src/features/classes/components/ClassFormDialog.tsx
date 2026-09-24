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
  ClassInsert,
  SectionEnum,
  YearLevelEnum,
  type GetClass,
  type GetProgram,
  type IClassInsert,
} from "@my-app/shared";
import { useCreateClass, useUpdateClass } from "../hooks/useClasses";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classToEdit?: GetClass | null;
  programs: GetProgram[];
}

export function ClassFormDialog({
  open,
  onOpenChange,
  classToEdit,
  programs,
}: ClassFormDialogProps) {
  const formKey = open ? (classToEdit ? `edit-${classToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <ClassFormInner
            key={formKey}
            classToEdit={classToEdit}
            programs={programs}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClassFormInner({
  classToEdit,
  programs,
  onClose,
}: {
  classToEdit?: GetClass | null;
  programs: GetProgram[];
  onClose: () => void;
}) {
  const isEditing = Boolean(classToEdit);
  const createMutation = useCreateClass();
  const updateMutation = useUpdateClass();

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<IClassInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      program_id: classToEdit?.program.id || programs[0]?.program.id || 0,
      year_level: classToEdit?.year_level || "I",
      section: classToEdit?.section || "A",
    } as IClassInsert,
    validators: {
      onChange: ClassInsert,
    },
    onSubmit: ({ value }) => {
      setPendingValues({
        ...value,
        program_id: Number(value.program_id),
        section: value.section.toUpperCase(),
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && classToEdit) {
        await updateMutation.mutateAsync({
          id: classToEdit.id,
          info: pendingValues,
        });
        toast.success("Class section updated successfully.");
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success("Class section created successfully.");
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save class section.");
      toast.error(apiErr.message || "Failed to save class section.");
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
          {isEditing ? "Edit Class Section" : "Add New Class Section"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Update degree program, year level, or section assignment."
            : "Create a cohort/section for student enrollment and course scheduling."}
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

          <form.Field name="section">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Section</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val!.toUpperCase())}
                >
                  <SelectTrigger className="bg-background border-input text-sm h-10 font-bold">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-sm max-h-52 font-mono">
                    {SectionEnum.enumValues.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        Section {sec}
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
                <Spinner size="sm" className="text-white" />
                <span>Saving...</span>
              </div>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Section"
            )}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Update Class Section?" : "Confirm Class Creation?"}
        description="Are you sure you want to create/update this class section cohort?"
        confirmLabel={isEditing ? "Yes, Update" : "Yes, Create Section"}
        variant="primary"
        isLoading={isPending}
        onConfirm={handleConfirmedSave}
      />

      <ConfirmActionDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        title="Discard Unsaved Changes?"
        description="You have unsaved changes in this form. Are you sure you want to discard them?"
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
