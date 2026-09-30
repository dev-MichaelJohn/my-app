import { runAsync } from "@/libs/express-adapter.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { EvaluationReportService } from "@/services/evaluation-report.service.js";
import { errAsync } from "neverthrow";
import z from "zod";

export class EvaluationReportController {
  constructor(private reportService = new EvaluationReportService()) {}

  private querySchema = z.object({
    faculty_id: z.coerce.number().int().positive().optional(),
    semester_id: z.coerce.number().int().positive(),
    formula: z.string().optional(),
  });

  getFacultyReport = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    const parsed = this.querySchema.safeParse(req.query);
    if (!parsed.success) {
      return errAsync(new AppError(400, "Semester ID is required."));
    }

    // If faculty, lock to self. If admin/supervisor, allow querying other faculty
    const isPrivileged =
      req.user.roles.includes("SYS_ADMIN") ||
      req.user.roles.includes("ADMIN") ||
      req.user.roles.includes("SUPERVISOR");
    const targetFacultyId =
      isPrivileged && parsed.data.faculty_id ? parsed.data.faculty_id : req.user.account.id;

    return this.reportService
      .getFacultyReport(targetFacultyId, parsed.data.semester_id)
      .map((data) => ({
        status: 200,
        message: "Annex C Evaluation Report retrieved.",
        data,
      }));
  });

  generateFacultyReport = runAsync((req) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    const parsed = this.querySchema.safeParse(req.body);
    if (!parsed.success) {
      return errAsync(new AppError(400, "Invalid generation parameters."));
    }

    const isPrivileged =
      req.user.roles.includes("SYS_ADMIN") ||
      req.user.roles.includes("ADMIN") ||
      req.user.roles.includes("SUPERVISOR");
    const targetFacultyId =
      isPrivileged && parsed.data.faculty_id ? parsed.data.faculty_id : req.user.account.id;

    return this.reportService
      .generateFacultyReport(targetFacultyId, parsed.data.semester_id, parsed.data.formula)
      .map((data) => ({
        status: 200,
        message: "Annex C Evaluation Report calculated and persisted.",
        data,
      }));
  });
}
