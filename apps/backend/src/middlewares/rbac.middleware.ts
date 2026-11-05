import { and, eq, isNull, sql } from "drizzle-orm";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
import db from "@/configs/db.config.js";
import { Permissions, RolePermissions, Roles } from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { runMiddleware } from "@/libs/express-adapter.lib.js";
import { FromDbPromise } from "@/libs/result.lib.js";
import type { Permission } from "@my-app/shared";

let rolePermissionsCache: Map<string, Set<string>> | null = null;
let lastCacheTime = 0;
let lastStateSignature = "";

// Shortened TTL: even without explicit invalidation, nodes stay within 15 seconds of each other
const CACHE_TTL_MS = 15 * 1000;

export const invalidateRolePermissionsCache = () => {
  rolePermissionsCache = null;
  lastCacheTime = 0;
  lastStateSignature = "";
};

const getRolePermissionsMap = (): ResultAsync<Map<string, Set<string>>, AppError> => {
  const now = Date.now();

  // Fast-path: within 15-second TTL and cache exists
  if (rolePermissionsCache && now - lastCacheTime < CACHE_TTL_MS) {
    return okAsync(rolePermissionsCache);
  }

  // Cross-process validation: Check DB state signature (instant index-only scan)
  return FromDbPromise(
    db
      .select({
        signature: sql<string>`CONCAT(COUNT(*)::text, ':', COALESCE(MAX(${RolePermissions.id}), 0)::text)`,
      })
      .from(RolePermissions)
      .where(isNull(RolePermissions.deleted_at)),
  ).andThen(([state]) => {
    const currentSignature = state?.signature || "";

    // If cache exists and DB signature hasn't changed, reuse cache and update TTL
    if (rolePermissionsCache && currentSignature === lastStateSignature) {
      lastCacheTime = now;
      return okAsync(rolePermissionsCache);
    }

    // Refresh full map from database
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
      lastStateSignature = currentSignature;

      return map;
    });
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
