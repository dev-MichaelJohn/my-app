import { Router, type IRouter } from "express";
import { EvaluationScheduleController } from "@/controllers/evaluation-schedule.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const ScheduleRouter: IRouter = Router();
const controller = new EvaluationScheduleController();
const authController = new AuthController();

ScheduleRouter.use(authController.verifyJWT);
ScheduleRouter.use(standardApiLimiter);

const canRead = RequirePermission(PERMISSIONS.EVALUATION_PERIOD_READ);
const canManage = RequirePermission(PERMISSIONS.EVALUATION_PERIOD_MANAGE);

// ── SET (Student Evaluation Windows) ──
ScheduleRouter.get("/student/active", canRead, controller.getActiveStudentSchedule);
ScheduleRouter.get("/student", canRead, controller.getStudentSchedules);
ScheduleRouter.get("/student/:id", canRead, controller.getStudentScheduleById);
ScheduleRouter.post("/student", canManage, controller.createStudentSchedule);
ScheduleRouter.put("/student/:id", canManage, controller.updateStudentSchedule);
ScheduleRouter.delete("/student/:id", canManage, controller.deleteStudentSchedule);
ScheduleRouter.put("/student/:id/restore", canManage, controller.restoreStudentSchedule);
ScheduleRouter.put("/student/:id/force-stop", canManage, controller.forceStopStudentSchedule);

// ── SEF (Supervisor Evaluation Windows) ──
ScheduleRouter.get("/supervisor/active", canRead, controller.getActiveSupervisorSchedule);
ScheduleRouter.get("/supervisor", canRead, controller.getSupervisorSchedules);
ScheduleRouter.get("/supervisor/:id", canRead, controller.getSupervisorScheduleById);
ScheduleRouter.post("/supervisor", canManage, controller.createSupervisorSchedule);
ScheduleRouter.put("/supervisor/:id", canManage, controller.updateSupervisorSchedule);
ScheduleRouter.delete("/supervisor/:id", canManage, controller.deleteSupervisorSchedule);
ScheduleRouter.put("/supervisor/:id/restore", canManage, controller.restoreSupervisorSchedule);
ScheduleRouter.put("/supervisor/:id/force-stop", canManage, controller.forceStopSupervisorSchedule);

export default ScheduleRouter;
