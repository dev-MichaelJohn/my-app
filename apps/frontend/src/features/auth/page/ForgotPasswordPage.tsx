import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-background text-foreground px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <ForgotPasswordForm />
      </div>
      <div className="mt-12 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Palompon Institute of Technology. All rights reserved.
      </div>
    </div>
  );
}
