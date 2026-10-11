import { Router, type IRouter } from "express";
import { FacultyController } from "@/controllers/faculty.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const FacultyRouter: IRouter = Router();
const controller = new FacultyController();
const authController = new AuthController();

FacultyRouter.use(authController.verifyJWT);
FacultyRouter.use(standardApiLimiter);

FacultyRouter.get("/:id", RequirePermission(PERMISSIONS.FACULTY_READ), controller.getFacultyById);
FacultyRouter.get("/", RequirePermission(PERMISSIONS.FACULTY_READ), controller.getFaculties);
FacultyRouter.post("/", RequirePermission(PERMISSIONS.FACULTY_CREATE), controller.createFaculty);
FacultyRouter.put("/:id", RequirePermission(PERMISSIONS.FACULTY_UPDATE), controller.updateFaculty);
FacultyRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.FACULTY_DELETE),
  controller.deleteFaculty,
);
FacultyRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.FACULTY_UPDATE),
  controller.restoreFaculty,
);

export default FacultyRouter;
