import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  SemesterInsert,
  SemeterTermEnum,
  type ISemesterInsert,
  type ISemesterSelect,
} from "@my-app/shared";
import { useCreateSemester, useUpdateSemester } from "../hooks/useSemesters";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";
import { cn } from "@/lib/utils";

interface SemesterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesterToEdit?: ISemesterSelect | null;
}

export function SemesterFormDialog({
  open,
  onOpenChange,
  semesterToEdit,
}: SemesterFormDialogProps) {
  const formKey = open ? (semesterToEdit ? `edit-${semesterToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <SemesterFormInner
            key={formKey}
            semesterToEdit={semesterToEdit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SemesterFormInner({
  semesterToEdit,
  onClose,
}: {
  semesterToEdit?: ISemesterSelect | null;
  onClose: () => void;
}) {
  const isEditing = Boolean(semesterToEdit);
  const createMutation = useCreateSemester();
  const updateMutation = useUpdateSemester();

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<ISemesterInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [defaultValues] = useState<ISemesterInsert>(() => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 120);

    return {
      semester_term: semesterToEdit?.semester_term || "1st",
      school_year_start: semesterToEdit?.school_year_start || now.getFullYear(),
      start_date: semesterToEdit?.start_date || format(now, "yyyy-MM-dd"),
      end_date: semesterToEdit?.end_date || format(endDate, "yyyy-MM-dd"),
    };
  });

  const form = useForm({
    defaultValues,
    validators: {
      onChange: SemesterInsert,
    },
    onSubmit: ({ value }) => {
      setPendingValues({
        ...value,
        school_year_start: Number(value.school_year_start),
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (isEditing && semesterToEdit) {
        await updateMutation.mutateAsync({
          id: semesterToEdit.id,
          info: pendingValues,
        });
        toast.success("Semester updated successfully.");
      } else {
        await createMutation.mutateAsync(pendingValues);
        toast.success("Academic semester created successfully.");
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to save semester.");
      toast.error(apiErr.message || "Failed to save semester.");
      setConfirmSaveOpen(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {isEditing ? "Edit Academic Semester" : "Add Academic Semester"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {isEditing
            ? "Update semester timeline and calendar bounds."
            : "Define an academic term and calendar bounds."}
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

        {/* ── Term & School Year ── */}
        <div className="grid grid-cols-2 gap-3">
          <form.Field name="semester_term">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Semester Term</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val as any)}
                >
                  <SelectTrigger className="bg-background border-input text-sm h-10">
                    <SelectValue placeholder="Select Term" />
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

          <form.Field name="school_year_start">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">
                  A.Y. Start Year{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({field.state.value}-{Number(field.state.value) + 1})
                  </span>
                </Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  className="bg-background border-input font-medium"
                />
              </div>
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="start_date">
            {(field) => {
              const selectedDate = field.state.value ? new Date(field.state.value) : undefined;

              return (
                <div className="space-y-1.5">
                  <Label className="text-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal text-sm bg-background border-input",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-border bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) field.handleChange(format(date, "yyyy-MM-dd"));
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                    <p className="text-destructive text-xs mt-1">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {/* End Date */}
          <form.Field name="end_date">
            {(field) => {
              const selectedDate = field.state.value ? new Date(field.state.value) : undefined;

              return (
                <div className="space-y-1.5">
                  <Label className="text-foreground">End Date</Label>
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal text-sm bg-background border-input",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-border bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) field.handleChange(format(date, "yyyy-MM-dd"));
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                    <p className="text-destructive text-xs mt-1">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        </div>

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
                <span>Saving...</span>
              </div>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Semester"
            )}
          </Button>
        </DialogFooter>
      </form>

      {/* Confirm Save Dialog */}
      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Save Changes to Semester?" : "Create Academic Semester?"}
        description={
          <span>
            Are you sure you want to set the{" "}
            <strong>
              {pendingValues?.semester_term} Semester (A.Y. {pendingValues?.school_year_start}-
              {Number(pendingValues?.school_year_start) + 1})
            </strong>{" "}
            from {pendingValues?.start_date} to {pendingValues?.end_date}?
          </span>
        }
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Create Semester"}
        variant="primary"
        isLoading={isPending}
        onConfirm={handleConfirmedSave}
      />

      {/* Confirm Discard Dialog */}
      <ConfirmActionDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits in this form. Are you sure you want to discard them?"
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
