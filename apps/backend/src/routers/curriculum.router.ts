import { CurriculumController } from "@/controllers/curriculum.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const CurriculumRouter: IRouter = Router();
const curriculumController = new CurriculumController();

CurriculumRouter.use(standardApiLimiter);

CurriculumRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_CURRICULUM_READ),
  curriculumController.getCurriculumById,
);

CurriculumRouter.get(
  "/",
  RequirePermission(PERMISSIONS.COURSE_CURRICULUM_READ),
  curriculumController.getCurriculums,
);

CurriculumRouter.post(
  "/",
  RequirePermission(PERMISSIONS.COURSE_CURRICULUM_CREATE),
  curriculumController.createCurriculum,
);

CurriculumRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_CURRICULUM_UPDATE),
  curriculumController.updateCurriculum,
);

CurriculumRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_CURRICULUM_DELETE),
  curriculumController.deleteCurriculum,
);

CurriculumRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.COURSE_CURRICULUM_UPDATE),
  curriculumController.restoreCurriculum,
);

export default CurriculumRouter;
