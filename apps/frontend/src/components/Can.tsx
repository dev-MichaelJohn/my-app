import { type ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permission, RoleName } from "@my-app/shared";

interface CanProps {
  children: ReactNode;
  fallback?: ReactNode;

  // Single checks
  role?: RoleName;
  permission?: Permission;

  // Multi-checks
  anyRole?: RoleName[];
  allRoles?: RoleName[];
  anyPermission?: Permission[];
  allPermissions?: Permission[];

  // Office checks
  isDean?: boolean;
  isChair?: boolean;

  // Invert condition (e.g. not student)
  not?: boolean;
}

export function Can({
  children,
  fallback = null,
  role,
  permission,
  anyRole,
  allRoles,
  anyPermission,
  allPermissions,
  isDean,
  isChair,
  not = false,
}: CanProps) {
  const perms = usePermissions();

  if (perms.isLoading) return null;

  let allowed = true;

  if (role && !perms.hasRole(role)) allowed = false;
  if (permission && !perms.hasPermission(permission)) allowed = false;
  if (anyRole && !perms.hasAnyRole(anyRole)) allowed = false;
  if (allRoles && !allRoles.every((r) => perms.hasRole(r))) allowed = false;
  if (anyPermission && !perms.hasAnyPermission(anyPermission)) allowed = false;
  if (allPermissions && !perms.hasAllPermissions(allPermissions)) allowed = false;
  if (isDean !== undefined && perms.isDean !== isDean) allowed = false;
  if (isChair !== undefined && perms.isChair !== isChair) allowed = false;

  const finalCheck = not ? !allowed : allowed;

  return finalCheck ? <>{children}</> : <>{fallback}</>;
}
