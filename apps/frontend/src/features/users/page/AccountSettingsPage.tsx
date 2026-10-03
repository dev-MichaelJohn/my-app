import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useChangeSelfPassword } from "../hooks/useUsers";
import { toast } from "sonner";
import { User, KeyRound, Shield, Building2, GraduationCap, CheckCircle2 } from "lucide-react";
import { ChangePasswordSchema, type ChangePassword } from "@my-app/shared";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";

export default function AccountSettingsPage() {
  const { user } = usePermissions();
  const changePasswordMutation = useChangeSelfPassword();

  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [pendingPassword, setPendingPassword] = useState<ChangePassword | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      current_password: "",
      new_password: "",
    } as ChangePassword,
    validators: {
      onChange: ChangePasswordSchema,
    },
    onSubmit: ({ value }) => {
      setPasswordError(null);
      setPendingPassword(value);
      setConfirmPasswordOpen(true);
    },
  });

  const handleConfirmedPasswordChange = async () => {
    if (!pendingPassword) return;

    try {
      await changePasswordMutation.mutateAsync(pendingPassword);
      toast.success("Your password has been changed successfully.");
      form.reset();
      setConfirmPasswordOpen(false);
    } catch (err) {
      const apiErr = err as ApiError;
      setPasswordError(apiErr.message || "Failed to update password.");
      toast.error(apiErr.message || "Failed to update password.");
      setConfirmPasswordOpen(false);
    }
  };

  if (!user) return null;

  const fullName = `${user.details.first_name} ${user.details.middle_name ? `${user.details.middle_name} ` : ""}${user.details.last_name}${user.details.suffix ? ` ${user.details.suffix}` : ""}`;
  const deanships = user.offices?.deanships || [];
  const chairships = user.offices?.chairships || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Account & Security Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal institutional profile, system roles, and account security.
        </p>
      </div>

      {/* ── Profile Information ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <User className="w-4 h-4 text-primary" />
            <span>Institutional Profile</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Your official academic credentials recorded in the PIT-FES registry.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Full Name</span>
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Institutional ID</span>
              <p className="text-sm font-mono font-bold text-primary">
                {user.details.institutional_id}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Official Email Address</span>
              <p className="text-sm font-mono text-foreground">{user.account.email}</p>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Verification Status</span>
              <div>
                {user.account.is_verified ? (
                  <Badge className="bg-success/15 text-success border-success/30 text-[11px] gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Account
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning/30 text-[11px]">
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Roles & Academic Offices */}
          <div className="pt-3 border-t border-border/50 space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Assigned System Roles & Offices
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {user.roles.map((role) => (
                <Badge key={role} variant="secondary" className="font-bold text-xs px-2.5 py-0.5">
                  <Shield className="w-3 h-3 mr-1 text-primary" />
                  {role}
                </Badge>
              ))}

              {deanships.map((d) => (
                <Badge
                  key={d.id}
                  className="bg-success/15 text-success border-success/30 font-bold text-xs px-2.5 py-0.5 gap-1"
                >
                  <Building2 className="w-3 h-3" /> Dean of {d.initialism} ({d.name})
                </Badge>
              ))}

              {chairships.map((c) => (
                <Badge
                  key={c.id}
                  className="bg-info/15 text-info border-info/30 font-bold text-xs px-2.5 py-0.5 gap-1"
                >
                  <GraduationCap className="w-3 h-3" /> Chair of {c.initialism} ({c.name})
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Change Password Form ── */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <KeyRound className="w-4 h-4 text-primary" />
            <span>Update Account Password</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Change your portal login password. Password must be at least 8 characters and include
            uppercase, lowercase, numbers, and special characters.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4 max-w-md"
          >
            {passwordError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium">
                {passwordError}
              </div>
            )}

            {/* Current Password */}
            <form.Field name="current_password">
              {(field) => {
                const hasError =
                  (field.state.meta.isTouched || form.state.isSubmitted) &&
                  field.state.meta.errors.length > 0;

                return (
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-xs">Current Password</Label>
                    <Input
                      type="password"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      className="bg-background border-input text-xs h-9"
                    />
                    {hasError && (
                      <p className="text-destructive text-xs">
                        {field.state.meta.errors.map(getErrorMessage).join(", ")}
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>

            {/* New Password */}
            <form.Field name="new_password">
              {(field) => {
                const hasError =
                  (field.state.meta.isTouched || form.state.isSubmitted) &&
                  field.state.meta.errors.length > 0;

                return (
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-xs">New Password</Label>
                    <Input
                      type="password"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      className="bg-background border-input text-xs h-9"
                    />
                    {hasError && (
                      <p className="text-destructive text-xs">
                        {field.state.meta.errors.map(getErrorMessage).join(", ")}
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9"
              >
                {changePasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" className="text-white" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <ConfirmActionDialog
        open={confirmPasswordOpen}
        onOpenChange={setConfirmPasswordOpen}
        title="Confirm Password Change?"
        description="Are you sure you want to change your password? You will need to use this new password the next time you log in."
        confirmLabel="Yes, Update Password"
        variant="primary"
        isLoading={changePasswordMutation.isPending}
        onConfirm={handleConfirmedPasswordChange}
      />
    </div>
  );
}
