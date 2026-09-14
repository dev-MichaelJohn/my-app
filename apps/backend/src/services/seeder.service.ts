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

export interface ISeederService {
  seedRolesAndPermission(): ResultAsync<void, AppError>;
  seedSystemAdmin(info: CreateUser): ResultAsync<void, AppError>;
}

export class SeederService implements ISeederService {
  constructor(private userService: IUserService = new UserService()) {}

  seedRolesAndPermission(): ResultAsync<void, AppError> {
    return WithTransaction(db, async (tx) => {
      const existingRoles = await tx.select().from(Roles);
      const existingPermissions = await tx.select().from(Permissions);
      const existingRolePermissions = await tx.select().from(RolePermissions);

      const roleMap = new Map<string, number>(existingRoles.map((r) => [r.system_role, r.id]));
      const permissionMap = new Map<string, number>(
        existingPermissions.map((p) => [p.permission_key, p.id]),
      );

      for (const role of SystemRoles.enumValues) {
        if (!roleMap.has(role)) {
          const [created] = await tx.insert(Roles).values({ system_role: role }).returning();
          if (!created)
            throw new AppError(
              500,
              "An unexpected database error occurred during syncing permissions.",
            );
          roleMap.set(role, created.id);
        }
      }

      for (const permission of Object.values(PERMISSIONS)) {
        if (!permissionMap.has(permission)) {
          const [created] = await tx
            .insert(Permissions)
            .values({ permission_key: permission })
            .returning();
          if (!created)
            throw new AppError(
              500,
              "An unexpected database error occurred during syncing permissions.",
            );
          permissionMap.set(permission, created.id);
        }
      }

      const existingRPSet = new Set(
        existingRolePermissions.map((rp) => `${rp.role_id}:${rp.permission_id}`),
      );

      for (const [roleName, permissions] of Object.entries(ROLE_PERMISSION_MATRIX) as [
        RoleName,
        Permission[],
      ][]) {
        const roleId = roleMap.get(roleName);
        if (!roleId) continue;

        for (const permissionKey of permissions) {
          const permissionId = permissionMap.get(permissionKey);
          if (!permissionId) continue;

          const key = `${roleId}:${permissionId}`;
          if (!existingRPSet.has(key)) {
            const [created] = await tx
              .insert(RolePermissions)
              .values({ role_id: roleId, permission_id: permissionId })
              .returning();
            if (!created)
              throw new AppError(
                500,
                "An unexpected database error occurred during syncing permissions.",
              );
            existingRPSet.add(key);
          }
        }
      }

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
