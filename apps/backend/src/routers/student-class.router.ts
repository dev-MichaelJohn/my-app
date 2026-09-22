import { StudentClassController } from "@/controllers/student-class.service.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const StudentClassRouter: IRouter = Router();
const studentClassController = new StudentClassController();

StudentClassRouter.use(standardApiLimiter);

StudentClassRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.STUDENT_CLASS_READ),
  studentClassController.getStudentClassById,
);

StudentClassRouter.get(
  "/",
  RequirePermission(PERMISSIONS.STUDENT_CLASS_READ),
  studentClassController.getStudentClasses,
);

StudentClassRouter.post(
  "/",
  RequirePermission(PERMISSIONS.STUDENT_CLASS_CREATE),
  studentClassController.createStudentClass,
);

StudentClassRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.STUDENT_CLASS_UPDATE),
  studentClassController.updateStudentClass,
);

StudentClassRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.STUDENT_CLASS_DELETE),
  studentClassController.deleteStudentClass,
);

StudentClassRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.STUDENT_CLASS_UPDATE),
  studentClassController.restoreStudentClass,
);

export default StudentClassRouter;
