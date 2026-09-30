import { Router, type IRouter } from "express";
import { EvaluationReportController } from "@/controllers/evaluation-report.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequireAnyPermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const ReportRouter: IRouter = Router();
const controller = new EvaluationReportController();
const authController = new AuthController();

ReportRouter.use(authController.verifyJWT);
ReportRouter.use(standardApiLimiter);

ReportRouter.get(
  "/annex-c",
  RequireAnyPermission(
    PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
    PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
  ),
  controller.getFacultyReport,
);

ReportRouter.post(
  "/annex-c/calculate",
  RequireAnyPermission(
    PERMISSIONS.EVALUATION_REPORT_GENERATE,
    PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
  ),
  controller.generateFacultyReport,
);

export default ReportRouter;
