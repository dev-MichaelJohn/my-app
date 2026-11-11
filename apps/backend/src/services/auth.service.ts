import {
  Accounts,
  AccountSelect,
  PersonalDetails,
  type ForgotPasswordRequest,
  type GetUser,
  type LoginAccount,
  type ResetPasswordWithOtp,
  type VerifyOTP,
} from "@my-app/shared";
import { UserService, type IUserService } from "./user.service.js";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { AppError } from "@/libs/error.lib.js";
import { OTPService, type IOTPService } from "./otp.service.js";
import { FromDbPromise, ValidateSchema } from "@/libs/result.lib.js";
import db from "@/configs/db.config.js";
import { and, eq, isNull } from "drizzle-orm";
import type { DbClient } from "@/libs/transaction.lib.js";
import env from "@/configs/env.config.js";
import { logger } from "@/libs/logger.lib.js";
import { EmailService, type IEmailService } from "./email.service.js";
import { PasswordResetEmailTemplate, PasswordResetTextTemplate } from "@/libs/email.lib.js";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "@/libs/audit.lib.js";

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
  requestPasswordReset(
    payload: ForgotPasswordRequest,
    client?: DbClient,
  ): ResultAsync<{ email: string; resendAt: number }, AppError>;
  resetPasswordWithOtp(
    payload: ResetPasswordWithOtp,
    req: any,
    client?: DbClient,
  ): ResultAsync<void, AppError>;
}

export class AuthService implements IAuthService {
  constructor(
    private userService: IUserService = new UserService(),
    private otpService: IOTPService = new OTPService(),
    private emailService: IEmailService = new EmailService(),
  ) {}

  private generateResendTime(expiresAt: Date): number {
    const totalDurationMs = 15 * 60 * 1000;
    const remainingMs = expiresAt.getTime() - Date.now();
    const elapsedMs = totalDurationMs - remainingMs;
    const cooldownMs = 2 * 60 * 1000;
    const nextAllowedTime =
      expiresAt.getTime() - remainingMs + (cooldownMs - (elapsedMs % cooldownMs));
    return Math.max(Date.now() + 30 * 1000, nextAllowedTime);
  }

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

  requestPasswordReset(
    payload: ForgotPasswordRequest,
    client: DbClient = db,
  ): ResultAsync<{ email: string; resendAt: number }, AppError> {
    return FromDbPromise(
      client
        .select({
          accountId: Accounts.id,
          email: Accounts.email,
          firstName: PersonalDetails.first_name,
          lastName: PersonalDetails.last_name,
        })
        .from(PersonalDetails)
        .innerJoin(Accounts, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(PersonalDetails.institutional_id, payload.institutional_id),
            isNull(Accounts.deleted_at),
            isNull(PersonalDetails.deleted_at),
          ),
        )
        .limit(1),
    ).andThen(([user]) => {
      if (!user) {
        // Return generic success to avoid institutional account enumeration
        return okAsync({ email: "", resendAt: Date.now() + 5 * 60 * 1000 });
      }

      const { email } = user;

      return this.otpService.findActiveOTP(email).andThen((otpFlag) => {
        if (otpFlag.hasActive && otpFlag.otp) {
          const resendAt = this.generateResendTime(otpFlag.otp.expires_at);
          return okAsync({ email, resendAt });
        }

        return this.otpService.generateOTP(email).andThen((otpCode) => {
          if (!otpCode) {
            return errAsync(new AppError(500, "Failed to generate security code."));
          }

          if (env.NODE_ENV !== "production") {
            logger.info(`🔑 [DEV ONLY] Password Reset OTP for ${email}: ${otpCode.code}`);
          }

          return this.emailService
            .sendEmail({
              to: email,
              options: {
                subject: "Password Reset Verification Code",
                text: PasswordResetTextTemplate(otpCode.code),
                html: PasswordResetEmailTemplate(otpCode.code),
              },
            })
            .orElse((err) => {
              return this.otpService.deleteOTP(otpCode.id, email).andThen(() => {
                if (env.BYPASS_OTP) return okAsync(undefined);
                logger.error(`Reset OTP delivery failed for ${email}: ${err.message}`);
                return errAsync(new AppError(500, "Failed to send reset code to your email."));
              });
            })
            .map(() => {
              const resendAt = this.generateResendTime(otpCode.expires_at);
              return { email, resendAt };
            });
        });
      });
    });
  }

  resetPasswordWithOtp(
    payload: ResetPasswordWithOtp,
    req: any,
    client: DbClient = db,
  ): ResultAsync<void, AppError> {
    return this.otpService
      .verifyOTP({ email: payload.email, code: payload.code })
      .andThen((otpData) => {
        return this.otpService.deleteOTP(otpData.id, otpData.email);
      })
      .andThen(() => {
        return FromDbPromise(
          client
            .select({
              id: Accounts.id,
              email: Accounts.email,
              firstName: PersonalDetails.first_name,
              lastName: PersonalDetails.last_name,
            })
            .from(Accounts)
            .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
            .where(and(eq(Accounts.email, payload.email), isNull(Accounts.deleted_at)))
            .limit(1),
        );
      })
      .andThen(([account]) => {
        if (!account) return errAsync(new AppError(404, "Account not found."));

        return ResultAsync.fromPromise(
          bcrypt.hash(payload.new_password, 10),
          () => new AppError(500, "Failed to hash password."),
        ).andThen((newHash) => {
          return FromDbPromise(
            client.transaction(async (tx) => {
              await tx
                .update(Accounts)
                .set({ password: newHash, is_verified: true, updated_at: new Date() })
                .where(eq(Accounts.id, account.id));

              await logAuditEvent({
                req,
                action: "PASSWORD_RESET",
                entity: "accounts",
                entityId: account.id,
                entityName: `${account.firstName} ${account.lastName} (${account.email})`,
                isRollbackable: false,
                tx,
              });
            }),
          ).map(() => undefined);
        });
      });
  }
}
