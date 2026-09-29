import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { AppError } from "@/libs/error.lib.js";
import {
  EvaluationSubmissionService,
  type IEvaluationSubmissionService,
} from "@/services/evaluation-submission.service.js";
import { errAsync } from "neverthrow";
import z from "zod";

export class EvaluationSubmissionController {
  constructor(
    private submissionService: IEvaluationSubmissionService = new EvaluationSubmissionService(),
  ) {}

  private idSchema = z.coerce.number().int().positive("Invalid ID provided.");

  // ── Student (SET) ──
  getEvaluableStudentSubjects = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return this.submissionService.getEvaluableStudentSubjects(req.user.account.id).map((data) => ({
      status: 200,
      message: "Student evaluable subjects retrieved.",
      data,
    }));
  });

  getStudentEvaluationFormView = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return ValidateSchema(this.idSchema, req.params.student_class_id).asyncAndThen((scId) => {
      return this.submissionService
        .getStudentEvaluationFormView(req.user!.account.id, scId)
        .map((data) => ({
          status: 200,
          message: "Evaluation questionnaire retrieved.",
          data,
        }));
    });
  });

  submitStudentEvaluation = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return this.submissionService
      .submitStudentEvaluation(req.user.account.id, req.body)
      .map((data) => ({
        status: 200,
        message: req.body.is_draft
          ? "Draft saved successfully."
          : "Evaluation submitted successfully.",
        data,
      }));
  });

  // ── Supervisor (SEF) ──
  getEvaluableSupervisorOfferings = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return this.submissionService
      .getEvaluableSupervisorOfferings(req.user.account.id)
      .map((data) => ({
        status: 200,
        message: "Supervisor evaluable faculty offerings retrieved.",
        data,
      }));
  });

  getSupervisorEvaluationFormView = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return ValidateSchema(this.idSchema, req.params.offering_id).asyncAndThen((offeringId) => {
      return this.submissionService
        .getSupervisorEvaluationFormView(req.user!.account.id, offeringId)
        .map((data) => ({
          status: 200,
          message: "Supervisor evaluation form retrieved.",
          data,
        }));
    });
  });

  submitSupervisorEvaluation = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return this.submissionService
      .submitSupervisorEvaluation(req.user.account.id, req.body)
      .map((data) => ({
        status: 200,
        message: req.body.is_draft
          ? "Draft saved successfully."
          : "Supervisor evaluation submitted successfully.",
        data,
      }));
  });

  getFacultyTeachingClasses = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return this.submissionService.getFacultyTeachingClasses(req.user.account.id).map((data) => ({
      status: 200,
      message: "Course-offerings retrieved successfully.",
      data,
    }));
  });
}
