import { AuthController } from "@/controllers/auth.controller.js";
import { authLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const AuthRouter: IRouter = Router();
const authController = new AuthController();

AuthRouter.post("/logout", authController.logout);

AuthRouter.use(authController.verifyJWT);

AuthRouter.get("/me", authController.me);
AuthRouter.get(
  "/verification-status",
  RequirePermission(PERMISSIONS.ACCOUNT_UPDATE_OWN),
  authController.getVerificationStatus,
);

AuthRouter.use(authLimiter);
AuthRouter.post("/login", authController.login);
AuthRouter.post("/verify-otp", authController.verifyOTP);

export default AuthRouter;
