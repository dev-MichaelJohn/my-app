import { useMe } from "@/features/auth/hooks/useAuth";
import { ROLE_PERMISSION_MATRIX, type Permission, type RoleName } from "@my-app/shared";

export const usePermissions = () => {
  const { data: user, isLoading } = useMe();
  const roles = user?.roles ?? [];

  const userPermissions = new Set<Permission>();
  for (const role of roles) {
    const permissions = ROLE_PERMISSION_MATRIX[role] || [];
    for (const permission of permissions) {
      userPermissions.add(permission);
    }
  }

  const hasPermission = (permission: Permission): boolean => userPermissions.has(permission);

  const hasAnyPermission = (permissions: Permission[]): boolean =>
    permissions.some((p) => userPermissions.has(p));

  const hasAllPermissions = (permissions: Permission[]): boolean =>
    permissions.every((p) => userPermissions.has(p));

  const hasRole = (role: RoleName): boolean => roles.includes(role);

  const hasAnyRole = (targetRoles: RoleName[]): boolean =>
    targetRoles.some((r) => roles.includes(r));

  // Academic office checks
  const isDean = Boolean(user?.offices?.deanships && user.offices.deanships.length > 0);
  const isChair = Boolean(user?.offices?.chairships && user.offices.chairships.length > 0);

  // Role quick flags
  const isSysAdmin = hasRole("SYS_ADMIN");
  const isAdmin = hasRole("ADMIN");
  const isSupervisor = hasRole("SUPERVISOR");
  const isFaculty = hasRole("FACULTY");
  const isStudent = hasRole("STUDENT");

  return {
    user,
    roles,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isSysAdmin,
    isAdmin,
    isSupervisor,
    isFaculty,
    isStudent,
    isDean,
    isChair,
  };
};
