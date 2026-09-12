import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { CreateUserSchema, type CreateUser } from "@my-app/shared";
import { errAsync, type ResultAsync } from "neverthrow";
import { UserService, type IUserService } from "./user.service.js";

export interface ISeederService {
  seedRolesAndPermission(): ResultAsync<void, AppError>;
  seedSystemAdmin(info: CreateUser): ResultAsync<void, AppError>;
}

export class SeederService implements ISeederService {
  constructor(private userService: IUserService = new UserService()) {}

  private isSeedingSysAdminAllowed() {
    return this.userService
      .getUsers({ page: 1, limit: 1, role: "SYS_ADMIN", sort_by: "created_at", order: "asc" })
      .map((users) => {
        return users.pagination.totalItems > 0;
      });
  }

  seedSystemAdmin(info: CreateUser): ResultAsync<void, AppError> {
    return this.isSeedingSysAdminAllowed().andThen((isAllowed) => {
      if (!isAllowed) return errAsync(new AppError(403, "A System Administrator already exists."));
    });
  }
}
