import { type GetUser, type LoginAccount } from "@my-app/shared";
import { UserService, type IUserService } from "./user.service.js";
import type { ResultAsync } from "neverthrow";
import type { AppError } from "@/libs/error.lib.js";

export class AuthService {
  constructor(private userService: IUserService = new UserService()) {}

  authenticateUserCredentials({
    institutional_id,
    password,
  }: LoginAccount): ResultAsync<{ success: boolean; user: GetUser }, AppError> {
    return this.userService
      .getUserForLogin({ institutional_id, password })
      .map((user) => ({ success: true, user }));
  }
}
