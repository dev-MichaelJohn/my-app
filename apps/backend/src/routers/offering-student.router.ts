import { AuthController } from "@/controllers/auth.controller.js";
import { OfferingStudentController } from "@/controllers/offering-student.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const OfferingStudentRouter: IRouter = Router();
const offeringStudentController = new OfferingStudentController();
const authController = new AuthController();

OfferingStudentRouter.use(authController.verifyJWT);
OfferingStudentRouter.use(standardApiLimiter);

OfferingStudentRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.OFFERING_STUDENT_READ),
  offeringStudentController.getOfferingStudentById,
);

OfferingStudentRouter.get(
  "/",
  RequirePermission(PERMISSIONS.OFFERING_STUDENT_READ),
  offeringStudentController.getOfferingStudents,
);

OfferingStudentRouter.post(
  "/",
  RequirePermission(PERMISSIONS.OFFERING_STUDENT_CREATE),
  offeringStudentController.createOfferingStudent,
);

OfferingStudentRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.OFFERING_STUDENT_UPDATE),
  offeringStudentController.updateOfferingStudent,
);

OfferingStudentRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.OFFERING_STUDENT_DELETE),
  offeringStudentController.deleteOfferingStudent,
);

OfferingStudentRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.OFFERING_STUDENT_UPDATE),
  offeringStudentController.restoreOfferingStudent,
);

export default OfferingStudentRouter;
