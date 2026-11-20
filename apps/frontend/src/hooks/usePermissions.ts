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

  const deanCollegeIds = user?.offices?.deanships?.map((d) => d.id) ?? [];
  const chairProgramIds = user?.offices?.chairships?.map((c) => c.id) ?? [];

  const isVpaa = hasRole("VPAA");
  const isClerk = hasRole("CLERK");
  const isCollegeDean = hasRole("COLLEGE_DEAN");
  const isDepartmentChair = hasRole("DEPARTMENT_CHAIR");
  const isFaculty = hasRole("FACULTY");
  const isStudent = hasRole("STUDENT");

  const isDean = Boolean(isCollegeDean || deanCollegeIds.length > 0);
  const isChair = Boolean(isDepartmentChair || chairProgramIds.length > 0);

  return {
    user,
    roles,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isVpaa,
    isClerk,
    isCollegeDean,
    isDepartmentChair,
    isFaculty,
    isStudent,
    isDean,
    isChair,
    deanCollegeIds,
    chairProgramIds,
  };
};
