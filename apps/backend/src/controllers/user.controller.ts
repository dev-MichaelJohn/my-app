import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { UserService, type IUserService } from "@/services/user.service.js";
import z from "zod";

export class UserController {
  constructor(private userService: IUserService = new UserService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid User ID provided.");

  getUserById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.getUserById(userId).map((data) => ({
        status: 200,
        message: "User details retrieved successfully.",
        data,
      }));
    });
  });

  getUsers = runAsync((req, _res) => {
    return this.userService.getUsers(req.query).map((data) => ({
      status: 200,
      message: "Users list retrieved successfully.",
      data,
    }));
  });

  createUser = runAsync((req, _res) => {
    return this.userService.createUser(req.body).map((data) => ({
      status: 201,
      message: "User created successfully.",
      data,
    }));
  });

  updateUser = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.updateUser(userId, req.body).map((data) => ({
        status: 200,
        message: "User updated successfully.",
        data,
      }));
    });
  });

  deleteUser = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.deleteUser(userId).map(() => ({
        status: 200,
        message: "User deleted successfully.",
        data: null,
      }));
    });
  });

  restoreUser = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((userId) => {
      return this.userService.restoreUser(userId).map((data) => ({
        status: 200,
        message: "User restored successfully.",
        data,
      }));
    });
  });
}
