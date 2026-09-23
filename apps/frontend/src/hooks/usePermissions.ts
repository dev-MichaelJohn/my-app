import { useMe } from "@/features/auth/hooks/useAuth";
import { ROLE_PERMISSION_MATRIX, type Permission, type RoleName } from "@my-app/shared";

export const usePermissions = () => {
  const { data: user, isLoading } = useMe();
  const { roles } = user;

  const userPermissions = new Set<Permission>();
  for (const role of roles) {
    const permissions = ROLE_PERMISSION_MATRIX[role] || [];
    for (const permission of permissions) {
      userPermissions.add(permission);
    }
  }

  const hasPermission = (permission: Permission): boolean => userPermissions.has(permission);
  const hasAnyPermission = (permissions: Permission[]): boolean =>
    permissions.some((permission) => userPermissions.has(permission));
  const hasRole = (role: RoleName): boolean => roles.includes(role);

  return {
    user,
    roles,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasRole,
  };
};
