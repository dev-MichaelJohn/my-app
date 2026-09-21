import { ClassStudentController } from "@/controllers/class-student.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const ClassStudentRouter: IRouter = Router();
const classStudentController = new ClassStudentController();

ClassStudentRouter.use(standardApiLimiter);

ClassStudentRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.CLASS_STUDENT_READ),
  classStudentController.getClassStudentById,
);

ClassStudentRouter.get(
  "/",
  RequirePermission(PERMISSIONS.CLASS_STUDENT_READ),
  classStudentController.getClassStudents,
);

ClassStudentRouter.post(
  "/",
  RequirePermission(PERMISSIONS.CLASS_STUDENT_CREATE),
  classStudentController.createClassStudent,
);

ClassStudentRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.CLASS_STUDENT_UPDATE),
  classStudentController.updateClassStudent,
);

ClassStudentRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.CLASS_STUDENT_DELETE),
  classStudentController.deleteClassStudent,
);

ClassStudentRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.CLASS_STUDENT_UPDATE),
  classStudentController.updateClassStudent,
);

export default ClassStudentRouter;
