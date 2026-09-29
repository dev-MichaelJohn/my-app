import { AuthController } from "@/controllers/auth.controller.js";
import { UserController } from "@/controllers/user.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequireAnyPermission, RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const UserRouter: IRouter = Router();
const userController = new UserController();
const authController = new AuthController();

UserRouter.use(authController.verifyJWT);
UserRouter.use(standardApiLimiter);

// ── Read & Query ──
UserRouter.get(
  "/:id",
  RequireAnyPermission(
    PERMISSIONS.ACCOUNT_READ,
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.FACULTY_READ,
  ),
  userController.getUserById,
);
UserRouter.get(
  "/",
  RequireAnyPermission(
    PERMISSIONS.ACCOUNT_READ,
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.FACULTY_READ,
  ),
  userController.getUsers,
);

// ── Create & Provision ──
UserRouter.post("/", RequirePermission(PERMISSIONS.ACCOUNT_CREATE), userController.createUser);

// ── Update ──
UserRouter.put("/:id", RequirePermission(PERMISSIONS.ACCOUNT_UPDATE), userController.updateUser);

// ── Roles & Security ──
UserRouter.put(
  "/:id/roles",
  RequirePermission(PERMISSIONS.ACCOUNT_MANAGE_ROLES),
  userController.manageRoles,
);
UserRouter.put(
  "/:id/reset-password",
  RequirePermission(PERMISSIONS.ACCOUNT_UPDATE),
  userController.resetUserPassword,
);
UserRouter.post(
  "/:id/resend-welcome",
  RequirePermission(PERMISSIONS.ACCOUNT_UPDATE),
  userController.resendWelcomeEmail,
);

// ── Self Password Change ──
UserRouter.put(
  "/self/change-password",
  RequirePermission(PERMISSIONS.ACCOUNT_UPDATE_OWN),
  userController.changePassword,
);

// ── Archive & Restore ──
UserRouter.delete("/:id", RequirePermission(PERMISSIONS.ACCOUNT_DELETE), userController.deleteUser);
UserRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.ACCOUNT_UPDATE),
  userController.restoreUser,
);

export default UserRouter;
