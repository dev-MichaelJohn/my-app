import { Navigate, Outlet, useLocation } from "react-router";
import { useMe } from "@/features/auth/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PageLoader } from "./ui/spinner";
import type { Permission, RoleName } from "@my-app/shared";

export function AuthGuard() {
  const { data: user, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader text="Verifying session..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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

export function RoleGuard({
  allowedRoles,
  redirectTo = "/dashboard",
}: {
  allowedRoles: RoleName[];
  redirectTo?: string;
}) {
  const { hasAnyRole, isLoading } = usePermissions();

  if (isLoading) {
    return <PageLoader text="Verifying authorization..." />;
  }

  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export function PermissionGuard({
  permission,
  permissions,
  redirectTo = "/dashboard",
}: {
  permission?: Permission;
  permissions?: Permission[];
  redirectTo?: string;
}) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <PageLoader text="Verifying permissions..." />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  if (permissions && !hasAnyPermission(permissions)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
