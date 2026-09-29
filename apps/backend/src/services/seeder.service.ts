import { AppError } from "@/libs/error.lib.js";
import {
  PERMISSIONS,
  Permissions,
  ROLE_PERMISSION_MATRIX,
  RolePermissions,
  Roles,
  SystemRoles,
  type CreateUser,
  type Permission,
  type RoleName,
} from "@my-app/shared";
import { errAsync, type ResultAsync } from "neverthrow";
import { UserService, type IUserService } from "./user.service.js";
import db from "@/configs/db.config.js";
import { WithTransaction } from "@/libs/transaction.lib.js";
import { logger } from "@/libs/logger.lib.js";
import { invalidateRolePermissionsCache } from "@/middlewares/rbac.middleware.js";
import { eq, isNull } from "drizzle-orm";

export interface ISeederService {
  seedRolesAndPermission(): ResultAsync<void, AppError>;
  seedSystemAdmin(info: CreateUser): ResultAsync<void, AppError>;
}

export class SeederService implements ISeederService {
  constructor(private userService: IUserService = new UserService()) {}

  seedRolesAndPermission(): ResultAsync<void, AppError> {
    return WithTransaction(db, async (tx) => {
      // 1. Fetch current database states
      const existingRoles = await tx.select().from(Roles).where(isNull(Roles.deleted_at));

      const existingPermissions = await tx
        .select()
        .from(Permissions)
        .where(isNull(Permissions.deleted_at));

      const existingRolePermissions = await tx
        .select()
        .from(RolePermissions)
        .where(isNull(RolePermissions.deleted_at));

      const roleMap = new Map<string, number>(existingRoles.map((r) => [r.system_role, r.id]));
      const permissionMap = new Map<string, number>(
        existingPermissions.map((p) => [p.permission_key, p.id]),
      );

      // 2. Ensure all enum roles exist in Roles table
      for (const role of SystemRoles.enumValues) {
        if (!roleMap.has(role)) {
          const [created] = await tx.insert(Roles).values({ system_role: role }).returning();

          if (!created) {
            throw new AppError(
              500,
              "An unexpected database error occurred while creating system role.",
            );
          }
          roleMap.set(role, created.id);
        }
      }

      // 3. Ensure all PERMISSIONS keys exist in Permissions table
      for (const permission of Object.values(PERMISSIONS)) {
        if (!permissionMap.has(permission)) {
          const [created] = await tx
            .insert(Permissions)
            .values({ permission_key: permission })
            .returning();

          if (!created) {
            throw new AppError(
              500,
              "An unexpected database error occurred while creating permission key.",
            );
          }
          permissionMap.set(permission, created.id);
        }
      }

      // 4. Construct the target valid mappings from current ROLE_PERMISSION_MATRIX
      const validRolePermissionKeys = new Set<string>();

      for (const [roleName, permissions] of Object.entries(ROLE_PERMISSION_MATRIX) as [
        RoleName,
        readonly Permission[],
      ][]) {
        const roleId = roleMap.get(roleName);
        if (!roleId) continue;

        for (const permissionKey of permissions) {
          const permissionId = permissionMap.get(permissionKey);
          if (!permissionId) continue;

          validRolePermissionKeys.add(`${roleId}:${permissionId}`);
        }
      }

      // 5. 🧹 Clean up / Revoke obsolete permissions no longer in the matrix
      // (e.g. Removes EVALUATION_SUBMIT_SET & EVALUATION_SUBMIT_SEF from SYS_ADMIN/ADMIN)
      let revokedCount = 0;
      for (const rp of existingRolePermissions) {
        const key = `${rp.role_id}:${rp.permission_id}`;
        if (!validRolePermissionKeys.has(key)) {
          await tx.delete(RolePermissions).where(eq(RolePermissions.id, rp.id));
          revokedCount++;
        }
      }

      if (revokedCount > 0) {
        logger.info(`Revoked ${revokedCount} obsolete permission grant(s) from database.`);
      }

      // 6. ✨ Insert missing valid role-permission grants
      const existingRPSet = new Set(
        existingRolePermissions.map((rp) => `${rp.role_id}:${rp.permission_id}`),
      );

      let grantedCount = 0;
      for (const key of validRolePermissionKeys) {
        if (!existingRPSet.has(key)) {
          const [roleId, permissionId] = key.split(":").map(Number);
          const [created] = await tx
            .insert(RolePermissions)
            .values({ role_id: roleId!, permission_id: permissionId! })
            .returning();

          if (!created) {
            throw new AppError(
              500,
              "An unexpected database error occurred while granting role permission.",
            );
          }
          grantedCount++;
        }
      }

      if (grantedCount > 0) {
        logger.info(`Granted ${grantedCount} new permission mapping(s) in database.`);
      }

      // 7. 🔄 Invalidate in-memory RBAC cache so middleware immediately recognizes updates
      invalidateRolePermissionsCache();

      logger.info("Roles, permissions, and matrix synced successfully!");
    });
  }

  seedSystemAdmin(info: CreateUser): ResultAsync<void, AppError> {
    return this.isSeedingSysAdminAllowed().andThen((isAllowed) => {
      if (!isAllowed) return errAsync(new AppError(409, "A System Administrator already exists."));
      return this.userService.createUser(info, db).map(() => undefined);
    });
  }

  private isSeedingSysAdminAllowed() {
    return this.userService
      .getUsers({ page: 1, limit: 1, role: "SYS_ADMIN", sort_by: "created_at", order: "asc" })
      .map((users) => {
        return users.pagination.totalItems === 0;
      });
  }
}
