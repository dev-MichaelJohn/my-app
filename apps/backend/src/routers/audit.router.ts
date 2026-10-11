import { Router, type IRouter } from "express";
import { AuditController } from "@/controllers/audit.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const AuditRouter: IRouter = Router();
const controller = new AuditController();
const authController = new AuthController();

AuditRouter.use(authController.verifyJWT);
AuditRouter.use(standardApiLimiter);

AuditRouter.get("/", RequirePermission(PERMISSIONS.AUDIT_LOG_READ), controller.getAuditLogs);

AuditRouter.post(
  "/:id/rollback",
  RequirePermission(PERMISSIONS.AUDIT_LOG_ROLLBACK),
  controller.rollback,
);

export default AuditRouter;
