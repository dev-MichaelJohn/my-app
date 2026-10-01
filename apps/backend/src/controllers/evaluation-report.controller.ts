import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { AppError } from "@/libs/error.lib.js";
import {
  EvaluationReportService,
  type IEvaluationReportService,
} from "@/services/evaluation-report.service.js";
import {
  GenerateReportQuerySchema,
  RecalculateReportSchema,
  BatchConsolidationSchema,
  UpdateReportStatusSchema,
  UpdateFedafPlanSchema,
  SignFedafSchema,
} from "@my-app/shared";
import { errAsync } from "neverthrow";
import z from "zod";

export class EvaluationReportController {
  constructor(private reportService: IEvaluationReportService = new EvaluationReportService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid ID provided.");

  getAnnexCReport = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(GenerateReportQuerySchema, req.query).asyncAndThen((query) => {
      const targetFacultyId = query.faculty_id ?? user.account.id;

      return this.reportService
        .getAnnexCReport(query.semester_id, targetFacultyId, user)
        .map((data) => ({
          status: 200,
          message: "Annex C evaluation report retrieved successfully.",
          data,
        }));
    });
  });

  recalculateFacultyReport = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(RecalculateReportSchema, req.body).asyncAndThen((body) => {
      const targetFacultyId = body.faculty_id ?? user.account.id;

      return this.reportService
        .recalculateFacultyReport(body.semester_id, targetFacultyId, body.formula)
        .map((data) => ({
          status: 200,
          message: "Report recalculated and persisted.",
          data,
        }));
    });
  });

  batchConsolidateReports = runAsync((req) => {
    return ValidateSchema(BatchConsolidationSchema, req.body).asyncAndThen(
      ({ semester_id, formula }) => {
        return this.reportService.batchConsolidateSemester(semester_id, formula).map((data) => ({
          status: 200,
          message: data.message,
          data,
        }));
      },
    );
  });

  getReportsList = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return this.reportService.getReportsList(req.query, user).map((data) => ({
      status: 200,
      message: "Faculty reports retrieved successfully.",
      data,
    }));
  });

  updateReportStatus = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((reportId) => {
      return ValidateSchema(UpdateReportStatusSchema, req.body).asyncAndThen(({ status }) => {
        return this.reportService.updateReportStatus(reportId, status, user).map((data) => ({
          status: 200,
          message: `Report status updated to ${status}.`,
          data,
        }));
      });
    });
  });

  updateFedafPlan = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((reportId) => {
      return ValidateSchema(UpdateFedafPlanSchema, req.body).asyncAndThen((plan) => {
        return this.reportService.updateFedafPlan(reportId, plan, user).map((data) => ({
          status: 200,
          message: "FEDAF development plan updated successfully.",
          data,
        }));
      });
    });
  });

  signFedaf = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((reportId) => {
      return ValidateSchema(SignFedafSchema, req.body).asyncAndThen(({ signatureRole }) => {
        return this.reportService.signFedaf(reportId, signatureRole, user).map((data) => ({
          status: 200,
          message: `Acknowledgment successfully signed as ${signatureRole}.`,
          data,
        }));
      });
    });
  });

  getInstitutionalFER = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(this.idSchema, req.query.semester_id).asyncAndThen((semesterId) => {
      return this.reportService.getInstitutionalFER(semesterId, user).map((data) => ({
        status: 200,
        message: "Institutional Faculty Evaluation Report retrieved.",
        data,
      }));
    });
  });
}
