import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { UserService, type IUserService } from "@/services/user.service.js";
import { errAsync } from "neverthrow";
import z from "zod";

export class UserController {
  constructor(private userService: IUserService = new UserService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid User ID provided.");

  getUserById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.getUserById(userId).map((data) => ({
        status: 200,
        message: "User details retrieved successfully.",
        data,
      }));
    });
  });

  getUsers = runAsync((req) => {
    return this.userService.getUsers(req.query).map((data) => ({
      status: 200,
      message: "Users list retrieved successfully.",
      data,
    }));
  });

  createUser = runAsync((req) => {
    const actorRole = req.user?.roles?.[0];
    return this.userService.createUser(req.body, undefined, actorRole).map((data) => ({
      status: 201,
      message: "User account created successfully.",
      data,
    }));
  });

  updateUser = runAsync((req) => {
    const actorRole = req.user?.roles?.[0];
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.updateUser(userId, req.body, undefined, actorRole).map((data) => ({
        status: 200,
        message: "User account updated successfully.",
        data,
      }));
    });
  });

  deleteUser = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.deleteUser(userId).map(() => ({
        status: 200,
        message: "User account archived successfully.",
        data: null,
      }));
    });
  });

  restoreUser = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.restoreUser(userId).map((data) => ({
        status: 200,
        message: "User account restored successfully.",
        data,
      }));
    });
  });

  manageRoles = runAsync((req) => {
    const actorRole = req.user?.roles?.[0];
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService
        .manageRoles(userId, req.body.roles, undefined, actorRole)
        .map((data) => ({
          status: 200,
          message: "User roles updated successfully.",
          data,
        }));
    });
  });

  resetUserPassword = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.resetUserPassword(userId).map((data) => ({
        status: 200,
        message: "Password reset. Temporary password sent to user's email.",
        data,
      }));
    });
  });

  changePassword = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    const isSelfService = req.params.id ? Number(req.params.id) === req.user.account.id : true;
    const targetUserId = req.params.id ? Number(req.params.id) : req.user.account.id;

    return this.userService
      .changePassword(targetUserId, req.body, undefined, isSelfService)
      .map(() => ({
        status: 200,
        message: "Password updated successfully.",
        data: null,
      }));
  });

  resendWelcomeEmail = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.resendWelcomeEmail(userId).map(() => ({
        status: 200,
        message: "Account credentials re-sent successfully.",
        data: null,
      }));
    });
  });
}
