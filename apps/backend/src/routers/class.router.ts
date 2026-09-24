import { AuthController } from "@/controllers/auth.controller.js";
import { ClassController } from "@/controllers/class.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const ClassRouter: IRouter = Router();
const classController = new ClassController();
const authController = new AuthController();

ClassRouter.use(authController.verifyJWT);
ClassRouter.use(standardApiLimiter);

ClassRouter.get("/:id", RequirePermission(PERMISSIONS.CLASS_READ), classController.getClassById);

ClassRouter.get("/", RequirePermission(PERMISSIONS.CLASS_READ), classController.getClasses);

ClassRouter.post("/", RequirePermission(PERMISSIONS.CLASS_CREATE), classController.createClass);

ClassRouter.put("/:id", RequirePermission(PERMISSIONS.CLASS_UPDATE), classController.updateClass);

ClassRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.CLASS_DELETE),
  classController.deleteClass,
);

ClassRouter.post(
  "/:id/restore",
  RequirePermission(PERMISSIONS.CLASS_UPDATE),
  classController.restoreClass,
);

export default ClassRouter;
