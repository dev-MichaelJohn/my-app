import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { CalendarIcon, AlertCircle } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import {
  StudentScheduleInsert,
  SupervisorScheduleInsert,
  type GetStudentSchedule,
  type GetSupervisorSchedule,
  type IStudentEvalFormSelect,
  type IStudentScheduleInsert,
  type ISemesterSelect,
  type ISupervisorEvalFormSelect,
} from "@my-app/shared";
import {
  useCreateStudentSchedule,
  useUpdateStudentSchedule,
  useCreateSupervisorSchedule,
  useUpdateSupervisorSchedule,
} from "../hooks/useEvaluationSchedules";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "student" | "supervisor";
  scheduleToEdit?: GetStudentSchedule | GetSupervisorSchedule | null;
  semesters: ISemesterSelect[];
  forms: (IStudentEvalFormSelect | ISupervisorEvalFormSelect)[];
  defaultSemesterId?: number;
}

export function EvaluationScheduleFormDialog({
  open,
  onOpenChange,
  type,
  scheduleToEdit,
  semesters,
  forms,
  defaultSemesterId,
}: Props) {
  const formKey = open
    ? scheduleToEdit
      ? `edit-${scheduleToEdit.id}`
      : `new-${type}-${defaultSemesterId ?? "default"}`
    : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <FormInner
            key={formKey}
            type={type}
            scheduleToEdit={scheduleToEdit}
            semesters={semesters}
            forms={forms}
            defaultSemesterId={defaultSemesterId}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormInner({
  type,
  scheduleToEdit,
  semesters,
  forms,
  defaultSemesterId,
  onClose,
}: {
  type: "student" | "supervisor";
  scheduleToEdit?: GetStudentSchedule | GetSupervisorSchedule | null;
  semesters: ISemesterSelect[];
  forms: (IStudentEvalFormSelect | ISupervisorEvalFormSelect)[];
  defaultSemesterId?: number;
  onClose: () => void;
}) {
  const isEditing = Boolean(scheduleToEdit);

  const createStudentMutation = useCreateStudentSchedule();
  const updateStudentMutation = useUpdateStudentSchedule();
  const createSupervisorMutation = useCreateSupervisorSchedule();
  const updateSupervisorMutation = useUpdateSupervisorSchedule();

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<IStudentScheduleInsert | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [defaultValues] = useState(() => {
    const now = new Date();
    const defaultClose = new Date(now);
    defaultClose.setDate(defaultClose.getDate() + 14);

    return {
      semester_id: scheduleToEdit?.semester.id || defaultSemesterId || semesters[0]?.id || 0,
      form_id: scheduleToEdit?.form.id || forms[0]?.id || 0,
      open_at: scheduleToEdit?.open_at ? new Date(scheduleToEdit.open_at) : now,
      close_at: scheduleToEdit?.close_at ? new Date(scheduleToEdit.close_at) : defaultClose,
    };
  });

  const form = useForm({
    defaultValues,
    validators: {
      onChange: ({ value }) => {
        const schema = type === "student" ? StudentScheduleInsert : SupervisorScheduleInsert;
        const result = schema.safeParse(value);
        if (!result.success) {
          return result.error.issues[0]?.message;
        }
        return undefined;
      },
    },
    onSubmit: ({ value }) => {
      const schema = type === "student" ? StudentScheduleInsert : SupervisorScheduleInsert;
      const parsed = schema.safeParse(value);

      if (!parsed.success) {
        setGeneralError(parsed.error.issues[0]?.message || "Invalid schedule data.");
        return;
      }

      setPendingValues({
        semester_id: Number(parsed.data.semester_id),
        form_id: Number(parsed.data.form_id),
        open_at: parsed.data.open_at,
        close_at: parsed.data.close_at,
      });
      setConfirmSaveOpen(true);
    },
  });

  const handleConfirmedSave = async () => {
    if (!pendingValues) return;
    setGeneralError(null);

    try {
      if (type === "student") {
        if (isEditing && scheduleToEdit) {
          await updateStudentMutation.mutateAsync({ id: scheduleToEdit.id, info: pendingValues });
          toast.success("Student evaluation schedule updated.");
        } else {
          await createStudentMutation.mutateAsync(pendingValues);
          toast.success("Student evaluation period scheduled successfully.");
        }
      } else {
        if (isEditing && scheduleToEdit) {
          await updateSupervisorMutation.mutateAsync({
            id: scheduleToEdit.id,
            info: pendingValues,
          });
          toast.success("Supervisor evaluation schedule updated.");
        } else {
          await createSupervisorMutation.mutateAsync(pendingValues);
          toast.success("Supervisor evaluation period scheduled successfully.");
        }
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to schedule evaluation.");
      toast.error(apiErr.message || "Failed to schedule evaluation.");
      setConfirmSaveOpen(false);
    }
  };

  const isPending =
    createStudentMutation.isPending ||
    updateStudentMutation.isPending ||
    createSupervisorMutation.isPending ||
    updateSupervisorMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">
          {isEditing ? "Edit Evaluation Schedule" : "Schedule Evaluation Period"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Set the submission timeline for{" "}
          {type === "student" ? "Student (SET)" : "Supervisor (SEF)"} evaluations.
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

        {/* ── Academic Semester ── */}
        <form.Field name="semester_id">
          {(field) => {
            const selectedSem =
              semesters.find((s) => s.id === Number(field.state.value)) ||
              (scheduleToEdit?.semester.id === Number(field.state.value)
                ? scheduleToEdit.semester
                : undefined);

            const hasError =
              (field.state.meta.isTouched || form.state.isSubmitted) &&
              field.state.meta.errors.length > 0;

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Academic Semester</Label>
                <Select
                  value={field.state.value ? String(field.state.value) : ""}
                  onValueChange={(val) => field.handleChange(Number(val))}
                  disabled={isEditing}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm">
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
                  <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border text-sm">
                    {semesters.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.semester_term} Semester (A.Y. {s.school_year_start}-{s.school_year_end})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasError && (
                  <p className="text-destructive text-xs mt-1 font-medium">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        {/* ── Questionnaire Template ── */}
        <form.Field name="form_id">
          {(field) => {
            const selectedForm =
              forms.find((f) => f.id === Number(field.state.value)) ||
              (scheduleToEdit?.form.id === Number(field.state.value)
                ? scheduleToEdit.form
                : undefined);

            const hasError =
              (field.state.meta.isTouched || form.state.isSubmitted) &&
              field.state.meta.errors.length > 0;

            return (
              <div className="w-full space-y-1.5">
                <Label className="text-foreground">Questionnaire Template</Label>
                {forms.length === 0 && !selectedForm ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-lg font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      No active {type === "student" ? "Student (SET)" : "Supervisor (SEF)"}{" "}
                      questionnaire templates found. Please create one in{" "}
                      <strong>Evaluation Instruments</strong> first.
                    </span>
                  </div>
                ) : (
                  <Select
                    value={field.state.value ? String(field.state.value) : ""}
                    onValueChange={(val) => field.handleChange(Number(val))}
                    disabled={isEditing}
                  >
                    <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-sm">
                      <SelectValue placeholder="Select evaluation questionnaire...">
                        {selectedForm ? (
                          <span className="truncate block text-left">
                            <strong>{selectedForm.title}</strong> ({selectedForm.min_rating}-
                            {selectedForm.max_rating} Rating)
                          </span>
                        ) : (
                          "Select questionnaire..."
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-(--radix-select-trigger-width) bg-popover border-border max-h-56 text-sm">
                      {forms.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.title} ({f.min_rating}-{f.max_rating} Scale)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {hasError && (
                  <p className="text-destructive text-xs mt-1 font-medium">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                )}
              </div>
            );
          }}
        </form.Field>

        {/* ── Open At & Close At Calendar Pickers ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Open Date */}
          <form.Field name="open_at">
            {(field) => {
              const selectedDate = field.state.value ? new Date(field.state.value) : undefined;

              return (
                <div className="space-y-1.5">
                  <Label className="text-foreground">Opens On</Label>
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal text-xs bg-background border-input",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick opening date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-border bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) field.handleChange(date);
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

          {/* Close Date */}
          <form.Field name="close_at">
            {(field) => {
              const selectedDate = field.state.value ? new Date(field.state.value) : undefined;

              return (
                <div className="space-y-1.5">
                  <Label className="text-foreground">Closes On</Label>
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal text-xs bg-background border-input",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick closing date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-border bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) field.handleChange(date);
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
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || (!isEditing && forms.length === 0)}
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
              "Schedule Window"
            )}
          </Button>
        </DialogFooter>
      </form>

      {/* Confirm Save Dialog */}
      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Update Evaluation Schedule?" : "Open Evaluation Schedule?"}
        description={
          <span>
            Are you sure you want to schedule this evaluation period for{" "}
            <strong>{type === "student" ? "Student (SET)" : "Supervisor (SEF)"}</strong>{" "}
            submissions?
          </span>
        }
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Schedule Window"}
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
