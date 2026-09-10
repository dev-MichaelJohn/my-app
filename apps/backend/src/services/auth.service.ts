import { AccountSelect, type GetUser, type LoginAccount, type VerifyOTP } from "@my-app/shared";
import { UserService, type IUserService } from "./user.service.js";
import type { ResultAsync } from "neverthrow";
import type { AppError } from "@/libs/error.lib.js";
import { OTPService, type IOTPService } from "./otp.service.js";
import { ValidateSchema } from "@/libs/result.lib.js";

export interface IAuthService {
  authenticateUserCredentials({
    institutional_id,
    password,
  }: LoginAccount): ResultAsync<{ success: boolean; user: GetUser }, AppError>;
  authenticateVerificationCode({
    email,
    code,
  }: VerifyOTP): ResultAsync<{ success: boolean; user: GetUser }, AppError>;
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
}
