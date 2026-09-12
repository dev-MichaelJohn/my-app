import passport from "passport";
import { JWTAuthStrategy, LocalAuthStrategy, OTPAuthStrategy } from "@/libs/auth.lib.js";

passport.use("local", LocalAuthStrategy);
passport.use("otp", OTPAuthStrategy);
passport.use("jwt", JWTAuthStrategy);
