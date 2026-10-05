import { Router, type IRouter } from "express";
import { EvaluationSubmissionController } from "@/controllers/evaluation-submission.controller.js";
import { AuthController } from "@/controllers/auth.controller.js";
import { evaluationExecutionLimiter } from "@/libs/limiter.lib.js";
import { RequireAnyPermission, RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const SubmissionRouter: IRouter = Router();
const controller = new EvaluationSubmissionController();
const authController = new AuthController();

SubmissionRouter.use(authController.verifyJWT);
SubmissionRouter.use(evaluationExecutionLimiter);

// ── Student (SET) Routes ──
SubmissionRouter.get(
  "/student/subjects",
  RequirePermission(PERMISSIONS.EVALUATION_SUBMIT_SET),
  controller.getEvaluableStudentSubjects,
);

SubmissionRouter.get(
  "/student/form/:student_class_id",
  RequirePermission(PERMISSIONS.EVALUATION_SUBMIT_SET),
  controller.getStudentEvaluationFormView,
);

SubmissionRouter.post(
  "/student/submit",
  RequirePermission(PERMISSIONS.EVALUATION_SUBMIT_SET),
  controller.submitStudentEvaluation,
);

// ── Supervisor (SEF) Routes ──
SubmissionRouter.get(
  "/supervisor/faculty",
  RequirePermission(PERMISSIONS.EVALUATION_SUBMIT_SEF),
  controller.getEvaluableSupervisorFaculty,
);

SubmissionRouter.get(
  "/supervisor/offerings",
  RequirePermission(PERMISSIONS.EVALUATION_SUBMIT_SEF),
  controller.getEvaluableSupervisorFaculty,
);

SubmissionRouter.get(
  "/supervisor/form/:faculty_id",
  RequirePermission(PERMISSIONS.EVALUATION_SUBMIT_SEF),
  controller.getSupervisorEvaluationFormView,
);

SubmissionRouter.post(
  "/supervisor/submit",
  RequirePermission(PERMISSIONS.EVALUATION_SUBMIT_SEF),
  controller.submitSupervisorEvaluation,
);

SubmissionRouter.get(
  "/faculty/teaching-classes",
  RequireAnyPermission(PERMISSIONS.COURSE_OFFERING_READ, PERMISSIONS.EVALUATION_REPORT_VIEW_SELF),
  controller.getFacultyTeachingOfferings,
);

export default SubmissionRouter;
