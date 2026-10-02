import { Router, type IRouter } from "express";
import { AnalyticsController } from "@/controllers/analytics.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequireAnyPermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const AnalyticsRouter: IRouter = Router();
const controller = new AnalyticsController();
const authController = new AuthController();

AnalyticsRouter.use(authController.verifyJWT);
AnalyticsRouter.use(standardApiLimiter);

AnalyticsRouter.get(
  "/",
  RequireAnyPermission(
    PERMISSIONS.ANALYTICS_VIEW_INSTITUTION,
    PERMISSIONS.ANALYTICS_VIEW_COLLEGE,
    PERMISSIONS.ANALYTICS_VIEW_PROGRAM,
    PERMISSIONS.ANALYTICS_VIEW_SELF,
    PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
    PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
  ),
  controller.getAnalytics,
);

export default AnalyticsRouter;
