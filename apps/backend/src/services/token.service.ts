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
import crypto from "node:crypto";
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
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

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
      path: "/",
    };
  }

  storeRefreshToken(
    user: Pick<IAccountSelect, "id" | "email">,
    token: string,
  ): ResultAsync<IRefreshTokenSelect, AppError> {
    return ValidateSchema(AccountSelect.pick({ id: true, email: true }), user).asyncAndThen(
      (parsedUser) => {
        const expires_at = new Date(Date.now() + REFRESH_COOKIE_LIFETIME);
        const token_hash = this.hashToken(token);

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
            const oldHash = this.hashToken(oldRefreshToken);

            // Fast O(1) indexed lookup by SHA-256 hash
            let [matchedToken] = await tx
              .select()
              .from(RefreshToken)
              .where(
                and(
                  eq(RefreshToken.account_id, parsedUser.id),
                  eq(RefreshToken.token_hash, oldHash),
                  eq(RefreshToken.is_revoked, false),
                  gt(RefreshToken.expires_at, new Date()),
                ),
              );

            // Backwards-compatibility for existing bcrypt hashes
            if (!matchedToken) {
              const legacyTokens = await tx
                .select()
                .from(RefreshToken)
                .where(
                  and(
                    eq(RefreshToken.account_id, parsedUser.id),
                    eq(RefreshToken.is_revoked, false),
                    gt(RefreshToken.expires_at, new Date()),
                  ),
                );

              matchedToken = legacyTokens.find((t) => {
                if (t.token_hash.startsWith("$2")) {
                  return bcrypt.compareSync(oldRefreshToken, t.token_hash);
                }
                return false;
              });
            }

            if (!matchedToken) {
              throw new AppError(401, "Refresh token is invalid, expired, or already revoked.");
            }

            // Revoke old token
            await tx.delete(RefreshToken).where(eq(RefreshToken.id, matchedToken.id));

            // Store new token using SHA-256
            const expires_at = new Date(Date.now() + REFRESH_COOKIE_LIFETIME);
            const token_hash = this.hashToken(newRefreshToken);

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
      const tokenHash = this.hashToken(token);

      return FromDbPromise(
        db
          .select()
          .from(RefreshToken)
          .where(
            and(
              eq(RefreshToken.account_id, decodedToken.id),
              eq(RefreshToken.token_hash, tokenHash),
              eq(RefreshToken.is_revoked, false),
              gt(RefreshToken.expires_at, new Date()),
            ),
          )
          .limit(1),
      ).andThen(([matchedToken]) => {
        if (matchedToken) {
          return okAsync(matchedToken);
        }

        // Backwards compatibility check for bcrypt
        return FromDbPromise(
          db
            .select()
            .from(RefreshToken)
            .where(
              and(
                eq(RefreshToken.account_id, decodedToken.id),
                eq(RefreshToken.is_revoked, false),
                gt(RefreshToken.expires_at, new Date()),
              ),
            ),
        ).andThen((legacyTokens) => {
          const legacyMatch = legacyTokens.find(
            (rt) => rt.token_hash.startsWith("$2") && bcrypt.compareSync(token, rt.token_hash),
          );

          if (!legacyMatch) {
            return errAsync(new AppError(401, "Refresh token has been revoked or expired."));
          }

          return okAsync(legacyMatch);
        });
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
      const tokenHash = this.hashToken(token);

      return FromDbPromise(
        db.transaction(async (tx) => {
          // Fast delete by hash
          const [deleted] = await tx
            .delete(RefreshToken)
            .where(
              and(
                eq(RefreshToken.account_id, decodedToken.id),
                eq(RefreshToken.token_hash, tokenHash),
              ),
            )
            .returning({ id: RefreshToken.id });

          if (!deleted) {
            // Check legacy bcrypt hashes
            const legacyTokens = await tx
              .select()
              .from(RefreshToken)
              .where(eq(RefreshToken.account_id, decodedToken.id));

            const matched = legacyTokens.find(
              (rt) => rt.token_hash.startsWith("$2") && bcrypt.compareSync(token, rt.token_hash),
            );

            if (matched) {
              await tx.delete(RefreshToken).where(eq(RefreshToken.id, matched.id));
            }
          }

          return undefined;
        }),
      );
    });
  }
}
