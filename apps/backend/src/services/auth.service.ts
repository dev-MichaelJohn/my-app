import {
  Accounts,
  AccountSelect,
  type GetUser,
  type LoginAccount,
  type VerifyOTP,
} from "@my-app/shared";
import { UserService, type IUserService } from "./user.service.js";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { AppError } from "@/libs/error.lib.js";
import { OTPService, type IOTPService } from "./otp.service.js";
import { FromDbPromise, ValidateSchema } from "@/libs/result.lib.js";
import db from "@/configs/db.config.js";
import { and, eq, isNull } from "drizzle-orm";

export interface IAuthService {
  authenticateUserCredentials({
    institutional_id,
    password,
  }: LoginAccount): ResultAsync<{ success: boolean; user: GetUser }, AppError>;
  authenticateVerificationCode({
    email,
    code,
  }: VerifyOTP): ResultAsync<{ success: boolean; user: GetUser }, AppError>;
  checkVerificationStatus(user: GetUser): ResultAsync<boolean, AppError>;
}

export class AuthService implements IAuthService {
  constructor(
    private userService: IUserService = new UserService(),
    private otpService: IOTPService = new OTPService(),
  ) {}

  authenticateUserCredentials({
    institutional_id,
    password,
  }: LoginAccount): ResultAsync<{ success: boolean; user: GetUser }, AppError> {
    return this.userService
      .getUserForLogin({ institutional_id, password })
      .map((user) => ({ success: true, user }));
  }

  authenticateVerificationCode({
    email,
    code,
  }: VerifyOTP): ResultAsync<{ success: boolean; user: GetUser }, AppError> {
    return this.otpService.verifyOTP({ email, code }).andThen((otpData) => {
      return this.otpService.deleteOTP(otpData.id, otpData.email).andThen(() => {
        return ValidateSchema(AccountSelect.shape.email, otpData.email).asyncAndThen((parsed) => {
          return this.userService.getUserByEmail(parsed).map((user) => ({ success: true, user }));
        });
      });
    });
  }

  authenticateAccessToken(
    user: GetUser,
  ): ResultAsync<{ success: boolean; user: GetUser }, AppError> {
    return this.userService.getUserById(user.account.id).map((user) => {
      return { success: true, user };
    });
  }

  checkVerificationStatus(user: GetUser): ResultAsync<boolean, AppError> {
    return FromDbPromise(
      db
        .select()
        .from(Accounts)
        .where(
          and(
            eq(Accounts.id, user.account.id),
            eq(Accounts.email, user.account.email),
            isNull(Accounts.deleted_at),
          ),
        ),
    ).andThen(([account]) => {
      if (!account) return errAsync(new AppError(404, "Account not found."));
      return okAsync(account.is_verified);
    });
  }
}
