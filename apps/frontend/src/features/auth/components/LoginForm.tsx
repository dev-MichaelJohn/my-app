import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { LoginAccountSchema, type LoginAccount } from "@my-app/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLogin } from "../hooks/useAuth";
import type { ApiError } from "@/lib/api.lib";
import { Link } from "react-router";
import { getErrorMessage } from "@/lib/error.lib";
import { Spinner } from "@/components/ui/spinner";

interface LoginFormProps {
  initialValues?: LoginAccount;
  onSuccess: (data: { email: string; resendAt: number }, credentials: LoginAccount) => void;
}

export const LoginForm = ({ initialValues, onSuccess }: LoginFormProps) => {
  const loginMutation = useLogin();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm({
    defaultValues:
      initialValues ||
      ({
        institutional_id: "",
        password: "",
      } as LoginAccount),
    validators: {
      onChange: LoginAccountSchema,
    },
    onSubmit: async ({ value }) => {
      setGeneralError(null);
      try {
        const response = await loginMutation.mutateAsync(value);
        onSuccess(response, value);
      } catch (err) {
        const apiErr = err as ApiError;
        setGeneralError(apiErr.message || "Invalid credentials. Please try again.");
      }
    },
  });

  return (
    <Card className="w-full max-w-md shadow-lg border-border bg-card text-card-foreground">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back to PIT-FES
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your institutional credentials to continue.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {generalError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md font-medium">
              {generalError}
            </div>
          )}

          <form.Field name="institutional_id">
            {(field) => (
              <div className="space-y-1.5 text-left">
                <label className="block text-sm font-medium text-foreground">
                  Institutional ID
                </label>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. 26-1042-001"
                  autoComplete="username"
                  className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
                />
                {field.state.meta.errors.length > 0 && field.state.meta.isTouched ? (
                  <p className="text-destructive text-xs font-medium mt-1">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="space-y-1.5 text-left">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
                />
                {field.state.meta.errors.length > 0 && field.state.meta.isTouched ? (
                  <p className="text-destructive text-xs font-medium mt-1">
                    {field.state.meta.errors.map(getErrorMessage).join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full mt-2 inline-flex justify-center items-center px-4 py-2.5 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
          >
            {loginMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-primary-foreground" />
                <span>Sending code...</span>
              </div>
            ) : (
              "Next"
            )}
          </button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-2">
        <div className="flex w-full justify-between text-xs pt-1">
          <Link
            to="/auth/forgot-password"
            className="text-primary underline-offset-4 hover:underline font-medium"
          >
            Forgot password?
          </Link>
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition"
          >
            Back to home
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
