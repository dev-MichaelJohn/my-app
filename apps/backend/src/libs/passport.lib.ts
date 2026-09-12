import type { GetUser } from "@my-app/shared";
import type { Request, Response } from "express";
import { ResultAsync } from "neverthrow";
import { AppError } from "./error.lib.js";
import passport from "passport";

export const AuthenticateLocal = (req: Request, res: Response): ResultAsync<GetUser, AppError> => {
  return ResultAsync.fromPromise(
    new Promise<GetUser>((resolve, reject) => {
      passport.authenticate(
        "local",
        { session: false },
        (err: unknown, user: GetUser | false, info?: { message?: string }) => {
          if (err)
            return reject(
              err instanceof AppError ? err : new AppError(500, "Authentication error occured."),
            );
          if (!user) return reject(new AppError(401, info?.message || "Invalid credentials."));
          resolve(user);
        },
      )(req, res);
    }),
    (err) => (err instanceof AppError ? err : new AppError(500, "Authentication error occured.")),
  );
};

export const AuthenticateOTP = (req: Request, res: Response): ResultAsync<GetUser, AppError> => {
  return ResultAsync.fromPromise(
    new Promise<GetUser>((resolve, reject) => {
      passport.authenticate(
        "otp",
        { session: false },
        (err: unknown, user: GetUser | false, info?: { message?: string }) => {
          if (err)
            return reject(
              err instanceof AppError ? err : new AppError(500, "Authentication error occured."),
            );
          if (!user)
            return reject(new AppError(401, info?.message || "Invalid email or expired OTP."));
          resolve(user);
        },
      )(req, res);
    }),
    (err) => (err instanceof AppError ? err : new AppError(500, "Authentication error occured.")),
  );
};

export const AuthenticateJWT = (
  req: Request,
  res: Response,
): ResultAsync<GetUser | false, AppError> => {
  return ResultAsync.fromPromise(
    new Promise<GetUser | false>((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        (err: unknown, user: GetUser | false, info?: { message: string }) => {
          if (err)
            return reject(
              err instanceof AppError ? err : new AppError(500, "Authentication error occured."),
            );

          resolve(user);
        },
      )(req, res);
    }),
    (err) => (err instanceof AppError ? err : new AppError(500, "Authentication error occured.")),
  );
};
