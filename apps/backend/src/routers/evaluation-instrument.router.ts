import { Router, type IRouter } from "express";
import { EvaluationInstrumentController } from "@/controllers/evaluation-instrument.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const InstrumentRouter: IRouter = Router();
const controller = new EvaluationInstrumentController();
const authController = new AuthController();

InstrumentRouter.use(authController.verifyJWT);
InstrumentRouter.use(standardApiLimiter);

// ── Student Forms (SET) ──
InstrumentRouter.get(
  "/student",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_READ),
  controller.getStudentForms,
);
InstrumentRouter.get(
  "/student/:id",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_READ),
  controller.getStudentFormById,
);
InstrumentRouter.post(
  "/student",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.createStudentForm,
);
InstrumentRouter.put(
  "/student/:id",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.updateStudentForm,
);
InstrumentRouter.delete(
  "/student/:id",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.deleteStudentForm,
);
InstrumentRouter.put(
  "/student/:id/restore",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.restoreStudentForm,
);

// ── Supervisor Forms (SEF) ──
InstrumentRouter.get(
  "/supervisor",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_READ),
  controller.getSupervisorForms,
);
InstrumentRouter.get(
  "/supervisor/:id",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_READ),
  controller.getSupervisorFormById,
);
InstrumentRouter.post(
  "/supervisor",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.createSupervisorForm,
);
InstrumentRouter.put(
  "/supervisor/:id",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.updateSupervisorForm,
);
InstrumentRouter.delete(
  "/supervisor/:id",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.deleteSupervisorForm,
);
InstrumentRouter.put(
  "/supervisor/:id/restore",
  RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE),
  controller.restoreSupervisorForm,
);

export default InstrumentRouter;
