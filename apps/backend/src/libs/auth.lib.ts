import { AuthService } from "@/services/auth.service.js";
import { Strategy as LocalStrategy } from "passport-local";

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
