import { Router, type IRouter } from "express";
import { SemesterController } from "@/controllers/semester.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const SemesterRouter: IRouter = Router();
const semesterController = new SemesterController();
const authController = new AuthController();

SemesterRouter.use(authController.verifyJWT);
SemesterRouter.use(standardApiLimiter);

SemesterRouter.get(
  "/active",
  RequirePermission(PERMISSIONS.SEMESTER_READ),
  semesterController.getActiveSemester,
);

SemesterRouter.get(
  "/",
  RequirePermission(PERMISSIONS.SEMESTER_READ),
  semesterController.getSemesters,
);

SemesterRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.SEMESTER_READ),
  semesterController.getSemesterById,
);

SemesterRouter.post(
  "/",
  RequirePermission(PERMISSIONS.SEMESTER_CREATE),
  semesterController.createSemester,
);

SemesterRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.SEMESTER_UPDATE),
  semesterController.updateSemester,
);

SemesterRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.SEMESTER_DELETE),
  semesterController.deleteSemester,
);

SemesterRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.SEMESTER_UPDATE),
  semesterController.restoreSemester,
);

SemesterRouter.put(
  "/:id/force-stop",
  RequirePermission(PERMISSIONS.SEMESTER_UPDATE),
  semesterController.forceStopSemester,
);

export default SemesterRouter;
