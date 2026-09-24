import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { OTP_LENGTH, VerifyOTPSchema, type LoginAccount, type VerifyOTP } from "@my-app/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useVerifyOTP, useLogin } from "../hooks/useAuth";
import type { ApiError } from "@/lib/api.lib";
import { getErrorMessage } from "@/lib/error.lib";
import { maskEmail } from "@/lib/format.lib";
import { Spinner } from "@/components/ui/spinner";

interface VerifyOTPFormProps {
  email: string;
  resendAt: number;
  credentials: LoginAccount;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const VerifyOTPForm = ({
  email,
  resendAt: initialResendAt,
  credentials,
  onSuccess,
  onBackToLogin,
}: VerifyOTPFormProps) => {
  const verifyMutation = useVerifyOTP();
  const resendMutation = useLogin();

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number>(initialResendAt);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
      setSecondsLeft(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resendAt]);

  const handleResend = async () => {
    if (secondsLeft > 0 || resendMutation.isPending) return;
    setGeneralError(null);

    try {
      const response = await resendMutation.mutateAsync(credentials);
      if (response.resendAt) {
        setResendAt(response.resendAt);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setGeneralError(apiErr.message || "Failed to resend code.");
    }
  };

  const form = useForm({
    defaultValues: {
      email,
      code: "",
    } as VerifyOTP,
    validators: {
      onChange: VerifyOTPSchema,
    },
    onSubmit: async ({ value }) => {
      setGeneralError(null);
      try {
        await verifyMutation.mutateAsync({ email: value.email, code: value.code });
        onSuccess();
      } catch (err) {
        const apiErr = err as ApiError;
        setGeneralError(apiErr.message || "Invalid or expired verification code.");
      }
    },
  });

  return (
    <Card className="w-full max-w-md shadow-lg border-border bg-card text-card-foreground">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Two-Step Verification
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter the {OTP_LENGTH}-digit code sent to{" "}
          <strong className="text-foreground font-medium">{maskEmail(email)}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          {generalError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md font-medium text-center">
              {generalError}
            </div>
          )}

          <form.Field name="code">
            {(field) => (
              <div className="flex flex-col items-center space-y-2">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={field.state.value}
                  onChange={(val) => field.handleChange(val)}
                  onBlur={field.handleBlur}
                  disabled={verifyMutation.isPending}
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="w-12 h-14 text-xl font-bold rounded-md border-input bg-background text-foreground shadow-xs focus:border-ring focus:ring-2 focus:ring-ring transition"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                {field.state.meta.errors.length > 0 && field.state.meta.isTouched ? (
                  <p className="text-destructive text-xs font-medium mt-1">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={verifyMutation.isPending || form.state.values.code.length !== OTP_LENGTH}
            className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
          >
            {verifyMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-primary-foreground" />
                <span>Verifying code...</span>
              </div>
            ) : (
              "Verify & Log In"
            )}
          </button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <div className="text-center text-xs text-muted-foreground">
          Didn't receive the code?{" "}
          {secondsLeft > 0 ? (
            <span className="font-medium text-foreground">Resend available in {secondsLeft}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="font-medium text-primary hover:underline focus-visible:outline-none inline-flex items-center gap-1.5 ml-1"
            >
              {resendMutation.isPending && <Spinner size="xs" />}
              <span>{resendMutation.isPending ? "Resending..." : "Resend Code"}</span>
            </button>
          )}
        </div>

        {/* Back Link */}
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition"
        >
          ← Use a different account
        </button>
      </CardFooter>
    </Card>
  );
};
