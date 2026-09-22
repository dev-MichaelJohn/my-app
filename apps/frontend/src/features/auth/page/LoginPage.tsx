import { useState } from "react";
import { useNavigate } from "react-router";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { VerifyOTPForm } from "@/features/auth/components/VerifyOTPForm";
import type { LoginAccount } from "@my-app/shared";

export default function LoginPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");

  const [credentials, _setCredentials] = useState<LoginAccount>({
    institutional_id: "",
    password: "",
  });

  const [authData, setAuthData] = useState<{
    email: string;
    resendAt: number;
  }>({
    email: "",
    resendAt: 0,
  });

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-background text-foreground px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {step === "credentials" ? (
          <LoginForm
            initialValues={credentials}
            onSuccess={(data) => {
              setAuthData({
                email: data.email,
                resendAt: data.resendAt,
              });
              setStep("otp");
            }}
          />
        ) : (
          <VerifyOTPForm
            email={authData.email}
            resendAt={authData.resendAt}
            credentials={credentials}
            onSuccess={() => {
              navigate("/dashboard", { replace: true });
            }}
            onBackToLogin={() => {
              setStep("credentials");
            }}
          />
        )}
      </div>

      <div className="mt-12 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Palompon Institute of Technology. All rights reserved.
      </div>
    </div>
  );
}
