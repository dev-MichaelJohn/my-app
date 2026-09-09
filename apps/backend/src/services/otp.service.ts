import db from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { FromDbPromise, ValidateSchema } from "@/libs/result.lib.js";
import {
  AccountSelect,
  OTP_EXPIRY_TIME,
  OTP_LENGTH,
  OTPCodes,
  VerifyOTPSchema,
  type IOTPCodeSelect,
  type VerifyOTP,
} from "@my-app/shared";
import { and, eq, gt } from "drizzle-orm";
import { okAsync, errAsync, ResultAsync } from "neverthrow";
import { generate } from "otp-generator";

export interface IOTPService {
  findActiveOTP(email: string): ResultAsync<{ hasActive: boolean; otp?: IOTPCodeSelect }, AppError>;
  generateOTP(email: string): ResultAsync<IOTPCodeSelect, AppError>;
  verifyOTP(credentials: VerifyOTP): ResultAsync<IOTPCodeSelect, AppError>;
  deactivateOTP(id: number): ResultAsync<void, AppError>;
}

export class OTPService implements IOTPService {
  findActiveOTP(
    email: string,
  ): ResultAsync<{ hasActive: boolean; otp?: IOTPCodeSelect }, AppError> {
    return ValidateSchema(AccountSelect.shape.email, email).asyncAndThen((parsed) => {
      return FromDbPromise(
        db
          .select()
          .from(OTPCodes)
          .where(and(eq(OTPCodes.email, parsed), eq(OTPCodes.is_active, true))),
      ).andThen(([otpData]) => {
        if (!otpData) return okAsync({ hasActive: false });
        const isExpired = otpData.expires_at <= new Date();

        if (isExpired) {
          return FromDbPromise(
            db.transaction(async (tx) => {
              const [updatedOTP] = await tx
                .update(OTPCodes)
                .set({ is_active: false })
                .where(eq(OTPCodes.id, otpData.id))
                .returning();
              if (!updatedOTP) throw new AppError(500, "Failed to update OTP record.");
            }),
          ).map(() => ({ hasActive: false }));
        }

        return okAsync({
          hasActive: true,
          otp: otpData,
        });
      });
    });
  }

  generateOTP(email: string): ResultAsync<IOTPCodeSelect, AppError> {
    return ValidateSchema(AccountSelect.shape.email, email).asyncAndThen((parsed) => {
      const generatedCode = generate(OTP_LENGTH, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      const expiry_time = new Date(Date.now() + OTP_EXPIRY_TIME);

      return FromDbPromise(
        db.transaction(async (tx) => {
          const [generatedOTP] = await tx
            .insert(OTPCodes)
            .values({ email: parsed, code: generatedCode, expires_at: expiry_time })
            .returning();

          if (!generatedOTP) throw new AppError(500, "Failed to create OTP record.");
          return generatedOTP;
        }),
      );
    });
  }

  verifyOTP(credentials: VerifyOTP): ResultAsync<IOTPCodeSelect, AppError> {
    return ValidateSchema(VerifyOTPSchema, credentials).asyncAndThen(({ email, code }) => {
      return FromDbPromise(
        db
          .select()
          .from(OTPCodes)
          .where(
            and(
              eq(OTPCodes.email, email),
              eq(OTPCodes.code, code),
              gt(OTPCodes.expires_at, new Date()),
            ),
          )
          .limit(1),
      ).andThen(([otpData]) => {
        return otpData ? okAsync(otpData) : errAsync(new AppError(404, "OTP code was not found."));
      });
    });
  }

  deactivateOTP(id: number): ResultAsync<void, AppError> {
    return FromDbPromise(
      db
        .select()
        .from(OTPCodes)
        .where(and(eq(OTPCodes.id, id), eq(OTPCodes.is_active, true)))
        .limit(1),
    ).andThen(([otpData]) => {
      if (!otpData) return errAsync(new AppError(500, "Failed to update OTP record."));
      return FromDbPromise(
        db.transaction(async (tx) => {
          const [updatedOTP] = await tx
            .update(OTPCodes)
            .set({ is_active: false })
            .where(eq(OTPCodes.id, otpData.id))
            .returning();
          if (!updatedOTP) throw new AppError(500, "Failed to update OTP record.");
        }),
      );
    });
  }
}
