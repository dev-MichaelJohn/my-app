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
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { toast } from "sonner";
import {
  StudentEvalFormInsert,
  SupervisorEvalFormInsert,
  type IStudentEvalFormInsert,
  type IStudentEvalFormSelect,
  type ISupervisorEvalFormSelect,
  EVALUATION_FORMULAS,
  DEFAULT_FORMULA_ID,
} from "@my-app/shared";
import {
  useCreateStudentForm,
  useUpdateStudentForm,
  useCreateSupervisorForm,
  useUpdateSupervisorForm,
} from "../hooks/useEvaluationInstruments";
import { getErrorMessage } from "@/lib/error.lib";
import type { ApiError } from "@/lib/api.lib";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formType: "student" | "supervisor";
  formToEdit?: IStudentEvalFormSelect | ISupervisorEvalFormSelect | null;
}

export function EvaluationInstrumentFormDialog({
  open,
  onOpenChange,
  formType,
  formToEdit,
}: Props) {
  const formKey = open ? (formToEdit ? `edit-${formToEdit.id}` : "new") : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card text-card-foreground overflow-hidden">
        {open && (
          <FormInner
            key={formKey}
            formType={formType}
            formToEdit={formToEdit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormInner({
  formType,
  formToEdit,
  onClose,
}: {
  formType: "student" | "supervisor";
  formToEdit?: IStudentEvalFormSelect | ISupervisorEvalFormSelect | null;
  onClose: () => void;
}) {
  const isEditing = Boolean(formToEdit);

  // SET Mutations
  const createStudentMutation = useCreateStudentForm();
  const updateStudentMutation = useUpdateStudentForm();

  // SEF Mutations
  const createSupervisorMutation = useCreateSupervisorForm();
  const updateSupervisorMutation = useUpdateSupervisorForm();

  // ── 🛡️ Friction States ──
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<IStudentEvalFormInsert | null>(null);

  const form = useForm({
    defaultValues: {
      title: formToEdit?.title || "",
      description: formToEdit?.description || "",
      min_rating: formToEdit?.min_rating ?? 1,
      max_rating: formToEdit?.max_rating ?? 5,
      calculation_formula: (formToEdit as any)?.calculation_formula || DEFAULT_FORMULA_ID,
    } as IStudentEvalFormInsert,
    validators: {
      onChange: ({ value }) => {
        const schema = formType === "student" ? StudentEvalFormInsert : SupervisorEvalFormInsert;
        const result = schema.safeParse(value);
        if (!result.success) {
          return result.error.issues[0]?.message;
        }
        return undefined;
      },
    },
    // Intercept form submit and trigger save friction modal
    onSubmit: ({ value }) => {
      setPendingValues(value);
      setConfirmSaveOpen(true);
    },
  });

  // Handle actual mutation after confirming
  const handleConfirmedSave = async () => {
    if (!pendingValues) return;

    try {
      if (formType === "student") {
        if (isEditing && formToEdit) {
          await updateStudentMutation.mutateAsync({ id: formToEdit.id, info: pendingValues });
          toast.success("Student evaluation template updated.");
        } else {
          await createStudentMutation.mutateAsync(pendingValues);
          toast.success("Student evaluation template created.");
        }
      } else {
        if (isEditing && formToEdit) {
          await updateSupervisorMutation.mutateAsync({ id: formToEdit.id, info: pendingValues });
          toast.success("Supervisor evaluation template updated.");
        } else {
          await createSupervisorMutation.mutateAsync(pendingValues);
          toast.success("Supervisor evaluation template created.");
        }
      }

      setConfirmSaveOpen(false);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Failed to save form template.");
      setConfirmSaveOpen(false);
    }
  };

  // Intercept cancel and check if dirty
  const handleCancel = () => {
    if (form.state.isDirty) {
      setConfirmDiscardOpen(true);
    } else {
      onClose();
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
          {isEditing ? "Edit Form Template" : "Create Evaluation Form Template"}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Set up questionnaire title, rating bounds, and calculation formula (
          {formType.toUpperCase()}).
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
        {/* Title */}
        <form.Field name="title">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-foreground">Form Title</Label>
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Student Evaluation of Teachers (SET)"
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

        {/* Description */}
        <form.Field name="description">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-foreground">Description (Optional)</Label>
              <Textarea
                value={field.state.value || ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Brief instructions for respondents..."
                className="bg-background border-input min-h-[80px]"
              />
            </div>
          )}
        </form.Field>

        {/* Min / Max Ratings Grid */}
        <div className="grid grid-cols-2 gap-3">
          <form.Field name="min_rating">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Min Rating Scale</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  className="bg-background border-input font-mono"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="max_rating">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-foreground">Max Rating Scale</Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  className="bg-background border-input font-mono"
                />
              </div>
            )}
          </form.Field>
        </div>

        {/* Formula Selector */}
        <form.Field name="calculation_formula">
          {(field) => {
            const selectedFormula =
              EVALUATION_FORMULAS[field.state.value] || EVALUATION_FORMULAS[DEFAULT_FORMULA_ID];

            return (
              <div className="space-y-1.5">
                <Label className="text-foreground">Rating Calculation Formula</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val as string)}
                >
                  <SelectTrigger className="w-full h-10 px-3 bg-background border-input text-xs">
                    <SelectValue placeholder="Select Calculation Formula">
                      {selectedFormula ? (
                        <span className="truncate block text-left">
                          <strong className="text-foreground mr-1.5">{selectedFormula.name}</strong>
                          <span className="text-primary font-mono text-[11px]">
                            ({selectedFormula.formulaDisplay})
                          </span>
                        </span>
                      ) : (
                        "Select Calculation Formula"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-xs max-w-md">
                    {Object.values(EVALUATION_FORMULAS).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <div className="flex flex-col py-1 text-left">
                          <span className="font-semibold text-foreground">{f.name}</span>
                          <span className="text-[11px] font-mono text-primary">
                            {f.formulaDisplay}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{f.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }}
        </form.Field>

        <DialogFooter className="pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
            {isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-white" />
                <span>Processing...</span>
              </div>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create & Build"
            )}
          </Button>
        </DialogFooter>
      </form>

      {/* ── 🛡️ Friction 1: Confirm Save ── */}
      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={isEditing ? "Save Changes to Questionnaire?" : "Create New Questionnaire Template?"}
        description={
          <span>
            Are you sure you want to {isEditing ? "update" : "create"} the questionnaire template{" "}
            <strong>"{pendingValues?.title}"</strong>?
          </span>
        }
        confirmLabel={isEditing ? "Yes, Save Changes" : "Yes, Create Template"}
        variant="primary"
        isLoading={isPending}
        onConfirm={handleConfirmedSave}
      />

      {/* ── 🛡️ Friction 2: Confirm Discard ── */}
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
