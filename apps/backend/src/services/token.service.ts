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
import { ResultAsync, errAsync, okAsync } from "neverthrow";
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
}

export class TokenService {
  generateAccessToken(user: GetUser): ResultAsync<string, AppError> {
    return ValidateSchema(GetUserSchema, user).asyncAndThen((parsedUser) => {
      return okAsync(jwt.sign(parsedUser, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_LIFETIME }));
    });
  }

  generateRefreshToken(id: number, email: string): ResultAsync<string, AppError> {
    return ValidateSchema(AccountSelect.pick({ id: true, email: true }), {
      id,
      email,
    }).asyncAndThen((parsedUser) => {
      return okAsync(
        jwt.sign(parsedUser, env.REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_LIFETIME }),
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
            if (!newRefreshToken) throw new AppError(500, "Failed to save refresh token.");

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
          db
            .select()
            .from(RefreshToken)
            .where(
              and(
                eq(RefreshToken.account_id, parsedUser.id),
                eq(RefreshToken.email, parsedUser.email),
                eq(RefreshToken.is_revoked, false),
                gt(RefreshToken.expires_at, new Date()),
              ),
            ),
        ).andThen((tokens) => {
          let matchedToken = null;
          for (const token of tokens) {
            const isMatch = bcrypt.compareSync(oldRefreshToken, token.token_hash);
            if (isMatch) {
              matchedToken = token;
              break;
            }
          }

          if (!matchedToken)
            return errAsync(
              new AppError(500, "Refresh token is invalid, expired, or already revoked."),
            );

          return FromDbPromise(
            db.transaction(async (tx) => {
              const [deletedToken] = await tx
                .delete(RefreshToken)
                .where(eq(RefreshToken.id, matchedToken.id))
                .returning({ id: RefreshToken.id });
              if (!deletedToken) throw new AppError(500, "Failed to revoke old token.");

              return deletedToken;
            }),
          ).andThen(() => {
            return this.storeRefreshToken(parsedUser, newRefreshToken);
          });
        });
      },
    );
  }

  verifyRefreshToken(token: string): ResultAsync<IRefreshTokenSelect, AppError> {
    const decodedToken = jwt.verify(token, env.REFRESH_SECRET) as Pick<
      IAccountSelect,
      "id" | "email"
    >;
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
    ).andThen(([refreshToken]) => {
      if (!refreshToken)
        return errAsync(new AppError(400, "Refresh token has been revoked or expired."));

      const isMatch = bcrypt.compareSync(token, refreshToken.token_hash);
      if (!isMatch)
        return errAsync(new AppError(400, "Refresh token has been revoked or expired."));

      return okAsync(refreshToken);
    });
  }
}
