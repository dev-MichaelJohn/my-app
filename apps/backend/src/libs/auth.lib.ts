import { AuthService } from "@/services/auth.service.js";
import { Strategy as LocalStrategy, type IVerifyOptions } from "passport-local";
import { Strategy as CustomStrategy } from "passport-custom";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import type { Request } from "express";
import env from "@/configs/env.config.js";
import type { GetUser } from "@my-app/shared";

const authService = new AuthService();

export const LocalAuthStrategy = new LocalStrategy(
  {
    usernameField: "institutional_id",
    passwordField: "password",
  },
  async (institutional_id, password, done) => {
    authService.authenticateUserCredentials({ institutional_id, password }).match(
      (data) => done(null, data.user),
      (err) => {
        if (err.status === 401 || err.status === 400)
          return done(null, false, { message: err.message });

        return done(err);
      },
    );
  },
);

export const OTPAuthStrategy = new CustomStrategy(
  async (
    req: Request,
    done: (error?: any, user?: Express.User | false, options?: IVerifyOptions) => void,
  ) => {
    authService.authenticateVerificationCode(req.body).match(
      (data) => done(null, data.user),
      (err) => {
        if (err.status === 401 || err.status === 400)
          return done(null, false, { message: err.message });

        return done(err);
      },
    );
  },
);

export const JWTAuthStrategy = new JWTStrategy(
  {
    jwtFromRequest: ExtractJwt.fromExtractors([
      ExtractJwt.fromAuthHeaderAsBearerToken(),
      ExtractJwt.fromUrlQueryParameter("token"),
    ]),
    secretOrKey: env.JWT_SECRET,
  },
  async (
    payload,
    done: (error?: any, user?: GetUser | false, options?: IVerifyOptions) => void,
  ) => {
    authService.authenticateAccessToken(payload).match(
      (data) => done(null, data.user),
      (err) => {
        if (err.status === 401 || err.status === 400)
          return done(null, false, { message: err.message });

        return done(err);
      },
    );
  },
);
