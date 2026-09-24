import { AuthController } from "@/controllers/auth.controller.js";
import { UserController } from "@/controllers/user.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const UserRouter: IRouter = Router();
const userController = new UserController();
const authController = new AuthController();

UserRouter.use(authController.verifyJWT);
UserRouter.use(standardApiLimiter);

UserRouter.get("/:id", RequirePermission(PERMISSIONS.ACCOUNT_READ), userController.getUserById);

UserRouter.get("/", RequirePermission(PERMISSIONS.ACCOUNT_READ), userController.getUsers);

UserRouter.post("/", RequirePermission(PERMISSIONS.ACCOUNT_CREATE), userController.createUser);

UserRouter.put("/:id", RequirePermission(PERMISSIONS.ACCOUNT_UPDATE), userController.updateUser);

UserRouter.delete("/:id", RequirePermission(PERMISSIONS.ACCOUNT_DELETE), userController.deleteUser);

UserRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.ACCOUNT_UPDATE),
  userController.restoreUser,
);

export default UserRouter;
