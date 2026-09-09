import passport from "passport";
import { LocalAuthStrategy } from "@/libs/auth.lib.js";

passport.use("local", LocalAuthStrategy);
