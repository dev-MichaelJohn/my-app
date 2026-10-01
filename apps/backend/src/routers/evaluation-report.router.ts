import { Router, type IRouter } from "express";
import { EvaluationReportController } from "@/controllers/evaluation-report.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequireAnyPermission, RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const ReportRouter: IRouter = Router();
const controller = new EvaluationReportController();
const authController = new AuthController();

ReportRouter.use(authController.verifyJWT);
ReportRouter.use(standardApiLimiter);

// ── Read Reports (List & Details) ──
ReportRouter.get(
  "/list",
  RequireAnyPermission(
    PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
    PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
  ),
  controller.getReportsList,
);

ReportRouter.get(
  "/annex-c",
  RequireAnyPermission(
    PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
    PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
  ),
  controller.getAnnexCReport,
);

ReportRouter.get(
  "/institutional-fer",
  RequirePermission(PERMISSIONS.EVALUATION_REPORT_VIEW_ALL),
  controller.getInstitutionalFER,
);

// ── Calculations & Consolidations ──
ReportRouter.post(
  "/annex-c/calculate",
  RequireAnyPermission(
    PERMISSIONS.EVALUATION_REPORT_GENERATE,
    PERMISSIONS.EVALUATION_REPORT_BATCH_GENERATE,
  ),
  controller.recalculateFacultyReport,
);

ReportRouter.post(
  "/batch-consolidate",
  RequirePermission(PERMISSIONS.EVALUATION_REPORT_BATCH_GENERATE),
  controller.batchConsolidateReports,
);

// ── Lifecycle & FEDAF Acknowledgment ──
ReportRouter.put(
  "/:id/status",
  RequirePermission(PERMISSIONS.EVALUATION_REPORT_MANAGE_STATUS),
  controller.updateReportStatus,
);

ReportRouter.put(
  "/:id/fedaf",
  RequireAnyPermission(
    PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
    PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
  ),
  controller.updateFedafPlan,
);

ReportRouter.post(
  "/:id/fedaf/sign",
  RequireAnyPermission(
    PERMISSIONS.EVALUATION_REPORT_VIEW_ALL,
    PERMISSIONS.EVALUATION_REPORT_VIEW_SELF,
  ),
  controller.signFedaf,
);

export default ReportRouter;
