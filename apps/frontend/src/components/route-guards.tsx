import { Navigate, Outlet, useLocation } from "react-router";
import { useMe } from "@/features/auth/hooks/useAuth";
import { PageLoader } from "./ui/spinner";

export function AuthGuard() {
  const { data: user, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function GuestGuard() {
  const { data: user, isLoading } = useMe();

  if (isLoading) {
    return <PageLoader text="Authenticating..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
