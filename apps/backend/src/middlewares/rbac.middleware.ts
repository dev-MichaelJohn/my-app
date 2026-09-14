import { and, eq, isNull } from "drizzle-orm";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import db from "@/configs/db.config.js";
import { Permissions, RolePermissions, Roles } from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { runMiddleware } from "@/libs/express-adapter.lib.js";
import { FromDbPromise } from "@/libs/result.lib.js";
import type { Permission } from "@my-app/shared";

let rolePermissionsCache: Map<string, Set<string>> | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const invalidateRolePermissionsCache = () => {
  rolePermissionsCache = null;
  lastCacheTime = 0;
};

const getRolePermissionsMap = (): ResultAsync<Map<string, Set<string>>, AppError> => {
  const now = Date.now();

  if (rolePermissionsCache && now - lastCacheTime < CACHE_TTL_MS) {
    return okAsync(rolePermissionsCache);
  }

  return FromDbPromise(
    db
      .select({
        role_name: Roles.system_role,
        key: Permissions.permission_key,
      })
      .from(RolePermissions)
      .innerJoin(Permissions, eq(RolePermissions.permission_id, Permissions.id))
      .innerJoin(Roles, eq(RolePermissions.role_id, Roles.id))
      .where(
        and(
          isNull(RolePermissions.deleted_at),
          isNull(Roles.deleted_at),
          isNull(Permissions.deleted_at),
        ),
      ),
  ).map((grants) => {
    const map = new Map<string, Set<string>>();

    for (const g of grants) {
      if (!map.has(g.role_name)) {
        map.set(g.role_name, new Set());
      }
      map.get(g.role_name)!.add(g.key);
    }

    rolePermissionsCache = map;
    lastCacheTime = now;

    return map;
  });
};

const getRoleName = (role: string | { name: string }): string => {
  return typeof role === "string" ? role : role.name;
};

export const RequirePermission = (...requiredPermissions: Permission[]) => {
  return runMiddleware((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    const userRoles = user.roles ?? [];
    if (userRoles.length === 0)
      return errAsync(new AppError(403, "Missing required permission(s): no roles assigned."));

    return getRolePermissionsMap().andThen((permissionsMap) => {
      const roleNames = userRoles.map(getRoleName);

      const missing = requiredPermissions.filter((required) => {
        return !roleNames.some((roleName) => permissionsMap.get(roleName)?.has(required));
      });

      if (missing.length > 0)
        return errAsync(new AppError(403, `Missing required permission(s): ${missing.join(", ")}`));

      return okAsync(undefined);
    });
  });
};

export const RequireAnyPermission = (...allowedPermissions: Permission[]) => {
  return runMiddleware((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    const userRoles = user.roles ?? [];
    if (userRoles.length === 0)
      return errAsync(new AppError(403, "Access denied: no roles assigned."));

    return getRolePermissionsMap().andThen((permissionsMap) => {
      const roleNames = userRoles.map(getRoleName);

      const hasAny = allowedPermissions.some((allowed) => {
        return roleNames.some((roleName) => permissionsMap.get(roleName)?.has(allowed));
      });

      if (!hasAny) {
        return errAsync(
          new AppError(
            403,
            `Access denied: requires at least one permission from [${allowedPermissions.join(", ")}]`,
          ),
        );
      }

      return okAsync(undefined);
    });
  });
};
