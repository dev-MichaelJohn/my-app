import { Router, type IRouter } from "express";
import { EvaluationBuilderController } from "@/controllers/evaluation-builder.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const BuilderRouter: IRouter = Router();
const controller = new EvaluationBuilderController();
const authController = new AuthController();

BuilderRouter.use(authController.verifyJWT);
BuilderRouter.use(standardApiLimiter);

const canRead = RequirePermission(PERMISSIONS.EVALUATION_FORM_READ);

const canManage = RequirePermission(PERMISSIONS.EVALUATION_FORM_MANAGE);

// =========================================================================
// 1. SET (STUDENT EVALUATION INSTRUMENT) ROUTES
// =========================================================================

// Categories
BuilderRouter.post("/student/forms/:form_id/categories", canManage, controller.addStudentCategory);
BuilderRouter.put(
  "/student/forms/:form_id/categories/reorder",
  canManage,
  controller.reorderStudentCategories,
);
BuilderRouter.put("/student/categories/:category_id", canManage, controller.updateStudentCategory);
BuilderRouter.delete(
  "/student/categories/:category_id",
  canManage,
  controller.deleteStudentCategory,
);
BuilderRouter.put(
  "/student/categories/:category_id/restore",
  canManage,
  controller.restoreStudentCategory,
);
BuilderRouter.get(
  "/student/categories/:category_id/history",
  canRead,
  controller.getStudentCategoryHistory,
);

// Questions
BuilderRouter.post(
  "/student/categories/:category_id/questions",
  canManage,
  controller.addStudentQuestion,
);
BuilderRouter.put(
  "/student/categories/:category_id/questions/reorder",
  canManage,
  controller.reorderStudentQuestions,
);
BuilderRouter.put("/student/questions/:question_id", canManage, controller.updateStudentQuestion);
BuilderRouter.delete(
  "/student/questions/:question_id",
  canManage,
  controller.deleteStudentQuestion,
);
BuilderRouter.put(
  "/student/questions/:question_id/restore",
  canManage,
  controller.restoreStudentQuestion,
);
BuilderRouter.get(
  "/student/questions/:question_id/history",
  canRead,
  controller.getStudentQuestionHistory,
);

// =========================================================================
// 2. SEF (SUPERVISOR EVALUATION INSTRUMENT) ROUTES
// =========================================================================

// Categories
BuilderRouter.post(
  "/supervisor/forms/:form_id/categories",
  canManage,
  controller.addSupervisorCategory,
);
BuilderRouter.put(
  "/supervisor/forms/:form_id/categories/reorder",
  canManage,
  controller.reorderSupervisorCategories,
);
BuilderRouter.put(
  "/supervisor/categories/:category_id",
  canManage,
  controller.updateSupervisorCategory,
);
BuilderRouter.delete(
  "/supervisor/categories/:category_id",
  canManage,
  controller.deleteSupervisorCategory,
);
BuilderRouter.put(
  "/supervisor/categories/:category_id/restore",
  canManage,
  controller.restoreSupervisorCategory,
);
BuilderRouter.get(
  "/supervisor/categories/:category_id/history",
  canRead,
  controller.getSupervisorCategoryHistory,
);

// Questions
BuilderRouter.post(
  "/supervisor/categories/:category_id/questions",
  canManage,
  controller.addSupervisorQuestion,
);
BuilderRouter.put(
  "/supervisor/categories/:category_id/questions/reorder",
  canManage,
  controller.reorderSupervisorQuestions,
);
BuilderRouter.put(
  "/supervisor/questions/:question_id",
  canManage,
  controller.updateSupervisorQuestion,
);
BuilderRouter.delete(
  "/supervisor/questions/:question_id",
  canManage,
  controller.deleteSupervisorQuestion,
);
BuilderRouter.put(
  "/supervisor/questions/:question_id/restore",
  canManage,
  controller.restoreSupervisorQuestion,
);
BuilderRouter.get(
  "/supervisor/questions/:question_id/history",
  canRead,
  controller.getSupervisorQuestionHistory,
);

// MOVs / Means Descriptors
BuilderRouter.post(
  "/supervisor/questions/:question_id/means",
  canManage,
  controller.addMeansDescriptor,
);
BuilderRouter.put(
  "/supervisor/questions/:question_id/means/reorder",
  canManage,
  controller.reorderMeansDescriptors,
);
BuilderRouter.put("/supervisor/means/:means_id", canManage, controller.updateMeansDescriptor);
BuilderRouter.delete("/supervisor/means/:means_id", canManage, controller.deleteMeansDescriptor);
BuilderRouter.put(
  "/supervisor/means/:means_id/restore",
  canManage,
  controller.restoreMeansDescriptor,
);
BuilderRouter.get(
  "/supervisor/means/:means_id/history",
  canRead,
  controller.getMeansDescriptorHistory,
);

export default BuilderRouter;
