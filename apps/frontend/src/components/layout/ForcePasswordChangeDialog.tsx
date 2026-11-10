import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/usePermissions";
import { useChangeSelfPassword } from "@/features/users/hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import { AUTH_QUERY_KEY } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";
import { ShieldAlert, KeyRound } from "lucide-react";
import { ChangePasswordSchema, type ChangePassword } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";
import { PasswordInput } from "../ui/password-input";

export function ForcePasswordChangeDialog() {
  const { user } = usePermissions();
  const queryClient = useQueryClient();
  const changePasswordMutation = useChangeSelfPassword();
  const [error, setError] = useState<string | null>(null);

  // Active only if user is logged in and is_verified is false
  const isOpen = Boolean(user && !user.account.is_verified);

  const form = useForm({
    defaultValues: {
      current_password: "",
      new_password: "",
    } as ChangePassword,
    validators: {
      onChange: ChangePasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await changePasswordMutation.mutateAsync(value);
        toast.success("Password set successfully! Your account is now activated.");
        // Refetches session so is_verified becomes true
        await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.message || "Failed to set new password.");
      }
    },
  });

  if (!isOpen) return null;

  return (
    // Controlled dialog with no-op onOpenChange prevents closing on Escape or Backdrop click
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[460px] border-border bg-card text-card-foreground shadow-2xl"
      >
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-warning/15 text-warning flex items-center justify-center mb-2">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Activate Your Account
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            You are currently logged in with a temporary password. For security compliance, please
            create a personal password before continuing.
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
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <form.Field name="current_password">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground">Temporary Password</Label>
                <PasswordInput
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter the password from your email"
                  className="bg-background text-xs h-9"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="new_password">
            {(field) => {
              const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
              return (
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground">New Permanent Password</Label>
                  <PasswordInput
                    value={field.state.value || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="At least 8 chars (uppercase, lowercase, number, symbol)"
                    className="bg-background text-xs h-9"
                  />
                  {hasError && (
                    <p className="text-destructive text-[11px] mt-1 font-medium">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 gap-2 mt-2"
          >
            {changePasswordMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-white" />
                <span>Activating Account...</span>
              </div>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Save New Password & Continue</span>
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
