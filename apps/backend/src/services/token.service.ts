import { AppError } from "@/libs/error.lib.js";
import { FromDbPromise, ValidateSchema } from "@/libs/result.lib.js";
import {
  ACCESS_TOKEN_LIFETIME,
  AccountSelect,
  GetUserSchema,
  REFRESH_COOKIE_LIFETIME,
  REFRESH_TOKEN_LIFETIME,
  RefreshToken,
  type GetUser,
  type IAccountSelect,
  type IRefreshTokenSelect,
  type RefreshCookieOptions,
} from "@my-app/shared";
import { Result, ResultAsync, errAsync, okAsync } from "neverthrow";
import jwt from "jsonwebtoken";
import env from "@/configs/env.config.js";
import bcrypt from "bcryptjs";
import db from "@/configs/db.config.js";
import { and, eq, gt } from "drizzle-orm";

export interface ITokenService {
  generateAccessToken(user: GetUser): ResultAsync<string, AppError>;
  generateRefreshToken(id: number, email: string): ResultAsync<string, AppError>;
  generateCookieOptions(): RefreshCookieOptions;
  storeRefreshToken(
    user: Pick<IAccountSelect, "id" | "email">,
    token: string,
  ): ResultAsync<IRefreshTokenSelect, AppError>;
  rotateRefreshToken(
    user: Pick<IAccountSelect, "id" | "email">,
    oldRefreshToken: string,
    newRefreshToken: string,
  ): ResultAsync<IRefreshTokenSelect, AppError>;
  verifyRefreshToken(token: string): ResultAsync<IRefreshTokenSelect, AppError>;
  deleteRefreshToken(token: string): ResultAsync<void, AppError>;
}

export class TokenService implements ITokenService {
  generateAccessToken(user: GetUser): ResultAsync<string, AppError> {
    return ValidateSchema(GetUserSchema, user).asyncAndThen((parsedUser) => {
      return okAsync(
        jwt.sign(parsedUser, env.JWT_SECRET, {
          expiresIn: ACCESS_TOKEN_LIFETIME,
        }),
      );
    });
  }

  generateRefreshToken(id: number, email: string): ResultAsync<string, AppError> {
    return ValidateSchema(AccountSelect.pick({ id: true, email: true }), {
      id,
      email,
    }).asyncAndThen((parsedUser) => {
      return okAsync(
        jwt.sign(parsedUser, env.REFRESH_SECRET, {
          expiresIn: REFRESH_TOKEN_LIFETIME,
        }),
      );
    });
  }

  generateCookieOptions(): RefreshCookieOptions {
    const isProduction = env.NODE_ENV === "production";

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: REFRESH_COOKIE_LIFETIME,
    };
  }

  storeRefreshToken(
    user: Pick<IAccountSelect, "id" | "email">,
    token: string,
  ): ResultAsync<IRefreshTokenSelect, AppError> {
    return ValidateSchema(AccountSelect.pick({ id: true, email: true }), user).asyncAndThen(
      (parsedUser) => {
        const expires_at = new Date(Date.now() + REFRESH_TOKEN_LIFETIME);
        const token_hash = bcrypt.hashSync(token, 10);

        return FromDbPromise(
          db.transaction(async (tx) => {
            const [newRefreshToken] = await tx
              .insert(RefreshToken)
              .values({
                account_id: parsedUser.id,
                email: parsedUser.email,
                token_hash,
                expires_at,
              })
              .returning();

            if (!newRefreshToken) {
              throw new AppError(500, "Failed to save refresh token.");
            }

            return newRefreshToken;
          }),
        );
      },
    );
  }

  rotateRefreshToken(
    user: Pick<IAccountSelect, "id" | "email">,
    oldRefreshToken: string,
    newRefreshToken: string,
  ): ResultAsync<IRefreshTokenSelect, AppError> {
    return ValidateSchema(AccountSelect.pick({ id: true, email: true }), user).asyncAndThen(
      (parsedUser) => {
        return FromDbPromise(
          db.transaction(async (tx) => {
            const tokens = await tx
              .select()
              .from(RefreshToken)
              .where(
                and(
                  eq(RefreshToken.account_id, parsedUser.id),
                  eq(RefreshToken.email, parsedUser.email),
                  eq(RefreshToken.is_revoked, false),
                  gt(RefreshToken.expires_at, new Date()),
                ),
              );

            const matchedToken = tokens.find((t) =>
              bcrypt.compareSync(oldRefreshToken, t.token_hash),
            );

            if (!matchedToken) {
              throw new AppError(401, "Refresh token is invalid, expired, or already revoked.");
            }

            const [deletedToken] = await tx
              .delete(RefreshToken)
              .where(eq(RefreshToken.id, matchedToken.id))
              .returning({ id: RefreshToken.id });

            if (!deletedToken) {
              throw new AppError(500, "Failed to revoke old token.");
            }

            const expires_at = new Date(Date.now() + REFRESH_TOKEN_LIFETIME);
            const token_hash = bcrypt.hashSync(newRefreshToken, 10);

            const [insertedToken] = await tx
              .insert(RefreshToken)
              .values({
                account_id: parsedUser.id,
                email: parsedUser.email,
                token_hash,
                expires_at,
              })
              .returning();

            if (!insertedToken) {
              throw new AppError(500, "Failed to store rotated token.");
            }

            return insertedToken;
          }),
        );
      },
    );
  }

  verifyRefreshToken(token: string): ResultAsync<IRefreshTokenSelect, AppError> {
    if (!token) {
      return errAsync(new AppError(401, "No refresh token provided."));
    }

    const verifyResult = Result.fromThrowable(
      () => jwt.verify(token, env.REFRESH_SECRET) as Pick<IAccountSelect, "id" | "email">,
      () => new AppError(401, "Invalid or expired refresh token."),
    )();

    return verifyResult.asyncAndThen((decodedToken) => {
      return FromDbPromise(
        db
          .select()
          .from(RefreshToken)
          .where(
            and(
              eq(RefreshToken.account_id, decodedToken.id),
              eq(RefreshToken.email, decodedToken.email),
              eq(RefreshToken.is_revoked, false),
              gt(RefreshToken.expires_at, new Date()),
            ),
          ),
      ).andThen((tokens) => {
        const matchedToken = tokens.find((rt) => bcrypt.compareSync(token, rt.token_hash));

        if (!matchedToken) {
          return errAsync(new AppError(401, "Refresh token has been revoked or expired."));
        }

        return okAsync(matchedToken);
      });
    });
  }

  deleteRefreshToken(token: string): ResultAsync<void, AppError> {
    if (!token) {
      return okAsync(undefined);
    }

    const verifyResult = Result.fromThrowable(
      () => jwt.verify(token, env.REFRESH_SECRET) as Pick<IAccountSelect, "id" | "email">,
      () => new AppError(401, "Invalid or expired refresh token."),
    )();

    return verifyResult.asyncAndThen((decodedToken) => {
      return FromDbPromise(
        db.transaction(async (tx) => {
          const tokens = await tx
            .select()
            .from(RefreshToken)
            .where(
              and(
                eq(RefreshToken.account_id, decodedToken.id),
                eq(RefreshToken.email, decodedToken.email),
                eq(RefreshToken.is_revoked, false),
              ),
            );

          const matchedToken = tokens.find((rt) => bcrypt.compareSync(token, rt.token_hash));

          if (matchedToken) {
            const [deletedToken] = await tx
              .delete(RefreshToken)
              .where(eq(RefreshToken.id, matchedToken.id))
              .returning({ id: RefreshToken.id });

            if (!deletedToken) {
              throw new AppError(500, "Failed to revoke token.");
            }
          }

          return undefined;
        }),
      );
    });
  }
}
