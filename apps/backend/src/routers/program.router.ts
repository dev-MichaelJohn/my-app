import { ProgramController } from "@/controllers/program.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const ProgramRouter: IRouter = Router();
const programController = new ProgramController();

ProgramRouter.use(standardApiLimiter);

ProgramRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.PROGRAM_READ),
  programController.getProgramById,
);

ProgramRouter.get("/", RequirePermission(PERMISSIONS.PROGRAM_READ), programController.getPrograms);

ProgramRouter.post(
  "/",
  RequirePermission(PERMISSIONS.PROGRAM_CREATE),
  programController.createProgram,
);

ProgramRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.PROGRAM_UPDATE),
  programController.updateProgram,
);

ProgramRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.PROGRAM_DELETE),
  programController.deleteProgram,
);

ProgramRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.PROGRAM_UPDATE),
  programController.restoreProgram,
);

export default ProgramRouter;
