import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  StudentEvalFormInsert,
  type IStudentEvalFormInsert,
  type IStudentEvalFormSelect,
  type ISupervisorEvalFormSelect,
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
      <DialogContent className="sm:max-w-[480px] border-border bg-card text-card-foreground overflow-hidden">
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

  const form = useForm({
    defaultValues: {
      title: formToEdit?.title || "",
      description: formToEdit?.description || "",
      min_rating: formToEdit?.min_rating ?? 1,
      max_rating: formToEdit?.max_rating ?? 5,
    } as IStudentEvalFormInsert,
    validators: {
      onChange: StudentEvalFormInsert,
    },
    onSubmit: async ({ value }) => {
      try {
        if (formType === "student") {
          if (isEditing && formToEdit) {
            await updateStudentMutation.mutateAsync({ id: formToEdit.id, info: value });
            toast.success("Student evaluation template updated.");
          } else {
            await createStudentMutation.mutateAsync(value);
            toast.success("Student evaluation template created. You can now build questions.");
          }
        } else {
          if (isEditing && formToEdit) {
            await updateSupervisorMutation.mutateAsync({ id: formToEdit.id, info: value });
            toast.success("Supervisor evaluation template updated.");
          } else {
            await createSupervisorMutation.mutateAsync(value);
            toast.success("Supervisor evaluation template created.");
          }
        }
        onClose();
      } catch (err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.message || "Failed to save form template.");
      }
    },
  });

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
          Set up the questionnaire container and rating bounds ({formType.toUpperCase()}).
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

        <DialogFooter className="pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
            {isPending ? (
              <Spinner size="sm" className="text-white" />
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create & Build"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
