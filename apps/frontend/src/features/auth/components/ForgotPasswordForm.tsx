import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import {
  ForgotPasswordRequestSchema,
  ResetPasswordWithOtpSchema,
  OTP_LENGTH,
  type ForgotPasswordRequest,
  type ResetPasswordWithOtp,
} from "@my-app/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useRequestPasswordReset, useResetPasswordWithOtp } from "../hooks/useAuth";
import { maskEmail } from "@/lib/format.lib";
import { getErrorMessage } from "@/lib/error.lib";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import type { ApiError } from "@/lib/api.lib";
import { KeyRound, ShieldCheck } from "lucide-react";

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const requestMutation = useRequestPasswordReset();
  const resetMutation = useResetPasswordWithOtp();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [resendAt, setResendAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Countdown timer for code resend
  useEffect(() => {
    if (!resendAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendAt]);

  // Form 1: Request Reset
  const requestForm = useForm({
    defaultValues: { institutional_id: "" } as ForgotPasswordRequest,
    validators: { onChange: ForgotPasswordRequestSchema },
    onSubmit: async ({ value }) => {
      setGeneralError(null);
      try {
        const res = await requestMutation.mutateAsync(value);
        if (res.email) {
          setResolvedEmail(res.email);
          setResendAt(res.resendAt);
          setStep("verify");
        } else {
          toast.info(
            "If an account is associated with this ID, a reset code was sent to the registered email.",
          );
        }
      } catch (err) {
        setGeneralError((err as ApiError).message || "Failed to process request.");
      }
    },
  });

  // Form 2: Verify & Set New Password
  const resetForm = useForm({
    defaultValues: {
      email: resolvedEmail,
      code: "",
      new_password: "",
    } as ResetPasswordWithOtp,
    validators: { onChange: ResetPasswordWithOtpSchema },
    onSubmit: async ({ value }) => {
      setGeneralError(null);
      try {
        await resetMutation.mutateAsync({
          email: resolvedEmail,
          code: value.code,
          new_password: value.new_password,
        });
        toast.success("Password reset successfully! You can now log in.");
        navigate("/login");
      } catch (err) {
        setGeneralError((err as ApiError).message || "Failed to reset password.");
      }
    },
  });

  const handleResend = async () => {
    if (secondsLeft > 0 || requestMutation.isPending) return;
    setGeneralError(null);
    try {
      const res = await requestMutation.mutateAsync({
        institutional_id: requestForm.state.values.institutional_id,
      });
      setResendAt(res.resendAt);
      toast.success("A new verification code was sent to your email.");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to resend code.");
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border bg-card text-card-foreground">
      <CardHeader className="space-y-1 text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1">
          <KeyRound className="w-5 h-5" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          {step === "request" ? "Reset Account Password" : "Set New Password"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {step === "request"
            ? "Enter your institutional ID to receive a verification code."
            : `Enter the code sent to ${maskEmail(resolvedEmail)} and choose a new password.`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {generalError && (
          <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md font-medium">
            {generalError}
          </div>
        )}

        {step === "request" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              requestForm.handleSubmit();
            }}
            className="space-y-4"
          >
            <requestForm.Field name="institutional_id">
              {(field) => (
                <div className="space-y-1.5 text-left">
                  <label className="block text-sm font-medium text-foreground">
                    Institutional ID
                  </label>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. 26-1042-001"
                    className="font-mono text-sm bg-background text-foreground"
                  />
                  {field.state.meta.errors.length > 0 && field.state.meta.isTouched && (
                    <p className="text-destructive text-xs font-medium">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </requestForm.Field>

            <button
              type="submit"
              disabled={requestMutation.isPending}
              className="w-full mt-2 inline-flex justify-center items-center px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md shadow-sm disabled:opacity-50 transition"
            >
              {requestMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" className="text-primary-foreground" />
                  <span>Looking up account...</span>
                </div>
              ) : (
                "Send Verification Code"
              )}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              resetForm.handleSubmit();
            }}
            className="space-y-4"
          >
            <resetForm.Field name="code">
              {(field) => (
                <div className="flex flex-col items-center space-y-2">
                  <label className="text-xs font-semibold text-foreground">Verification Code</label>
                  <InputOTP
                    maxLength={OTP_LENGTH}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={field.state.value}
                    onChange={(val) => field.handleChange(val)}
                    onBlur={field.handleBlur}
                    disabled={resetMutation.isPending}
                  >
                    <InputOTPGroup className="gap-2">
                      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="w-11 h-12 text-lg font-bold rounded-md bg-background"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {field.state.meta.errors.length > 0 && field.state.meta.isTouched && (
                    <p className="text-destructive text-xs font-medium">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </resetForm.Field>

            <resetForm.Field name="new_password">
              {(field) => (
                <div className="space-y-1.5 text-left">
                  <label className="block text-sm font-medium text-foreground">
                    New Permanent Password
                  </label>
                  <PasswordInput
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Min. 8 chars (upper, lower, digit, symbol)"
                    className="bg-background text-foreground"
                  />
                  {field.state.meta.errors.length > 0 && field.state.meta.isTouched && (
                    <p className="text-destructive text-xs font-medium">
                      {field.state.meta.errors.map(getErrorMessage).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </resetForm.Field>

            <button
              type="submit"
              disabled={
                resetMutation.isPending || resetForm.state.values.code.length !== OTP_LENGTH
              }
              className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md shadow-sm disabled:opacity-50 transition"
            >
              {resetMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" className="text-primary-foreground" />
                  <span>Updating password...</span>
                </div>
              ) : (
                "Update Password & Log In"
              )}
            </button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2 pt-2">
        {step === "verify" && (
          <div className="text-center text-xs text-muted-foreground mb-1">
            Didn't receive code?{" "}
            {secondsLeft > 0 ? (
              <span className="font-semibold text-foreground">Resend in {secondsLeft}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={requestMutation.isPending}
                className="font-semibold text-primary hover:underline ml-1"
              >
                Resend
              </button>
            )}
          </div>
        )}

        <div className="flex w-full justify-between text-xs pt-1 border-t border-border/50">
          <button
            type="button"
            onClick={() => {
              if (step === "verify") setStep("request");
              else navigate("/login");
            }}
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            ← {step === "verify" ? "Use different ID" : "Back to login"}
          </button>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> PIT-FES Secure
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
