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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { CreateCollegeSchema, type CreateCollege, type GetCollege } from "@my-app/shared";
import { useCreateCollege, useUpdateCollege } from "../hooks/useColleges";
import type { ApiError } from "@/lib/api.lib";

interface CollegeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeToEdit?: GetCollege | null; // null = Create Mode, populated = Edit Mode
}

export function CollegeFormDialog({ open, onOpenChange, collegeToEdit }: CollegeFormDialogProps) {
  const isEditing = Boolean(collegeToEdit);
  const createMutation = useCreateCollege();
  const updateMutation = useUpdateCollege();

  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      college: {
        name: collegeToEdit?.college.name || "",
        initialism: collegeToEdit?.college.initialism || "",
      },
      dean: null,
    } as CreateCollege,
    validators: {
      onChange: CreateCollegeSchema,
    },
    onSubmit: async ({ value }) => {
      setGeneralError(null);
      try {
        if (isEditing && collegeToEdit) {
          await updateMutation.mutateAsync({
            id: collegeToEdit.college.id,
            info: { college: value.college },
          });
          toast.success("College updated successfully.");
        } else {
          await createMutation.mutateAsync(value);
          toast.success("College created successfully.");
        }
        onOpenChange(false);
      } catch (err) {
        const apiErr = err as ApiError;
        setGeneralError(apiErr.message || "Failed to save college.");
        toast.error(apiErr.message || "Failed to save college.");
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {isEditing ? "Edit College" : "Add New College"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing
              ? "Update college details. Changes will be reflected across all academic programs."
              : "Register a new institutional college. You can assign a dean now or later."}
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

          {/* College Name Field */}
          <form.Field name="college.name">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="college-name" className="text-foreground">
                  College Name
                </Label>
                <Input
                  id="college-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. College of Technology"
                  className="bg-background border-input"
                />
                {field.state.meta.errors ? (
                  <p className="text-destructive text-xs mt-1">
                    {field.state.meta.errors.join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          {/* Initialism / Code Field */}
          <form.Field name="college.initialism">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="college-code" className="text-foreground">
                  Code / Initialism
                </Label>
                <Input
                  id="college-code"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                  placeholder="e.g. COT"
                  maxLength={10}
                  className="bg-background border-input font-mono uppercase"
                />
                {field.state.meta.errors ? (
                  <p className="text-destructive text-xs mt-1">
                    {field.state.meta.errors.join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          <DialogFooter className="pt-4">
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
                  <span>Saving...</span>
                </div>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create College"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
