import type { Request } from "express";
import { runAsync } from "@/libs/express-adapter.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { BulkImportService, type IBulkImportService } from "@/services/bulk-import.service.js";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";

export class BulkImportController {
  constructor(private bulkImportService: IBulkImportService = new BulkImportService()) {}

  private getCsvContent(req: Request): ResultAsync<string, AppError> {
    const file = (req as Request & { file?: { buffer?: Buffer } }).file;

    if (!file || !file.buffer) {
      return errAsync(new AppError(400, "Please upload a valid CSV file."));
    }

    return okAsync(file.buffer.toString("utf-8"));
  }

  importEntity = runAsync((req) => {
    const entity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity;
    const normalizedEntity = entity?.toLowerCase();

    return this.getCsvContent(req)
      .andThen((csvContent) => {
        switch (normalizedEntity) {
          case "colleges":
            return this.bulkImportService.importColleges(csvContent, undefined, req.user);

          case "programs":
            return this.bulkImportService.importPrograms(csvContent, undefined, req.user);

          case "courses":
            return this.bulkImportService.importCourses(csvContent, undefined, req.user);

          case "curriculums":
            return this.bulkImportService.importCurriculums(csvContent, undefined, req.user);

          case "classes":
            return this.bulkImportService.importClasses(csvContent, undefined, req.user);

          case "users":
            return this.bulkImportService.importUsers(csvContent, undefined, req.user);

          case "faculties":
            return this.bulkImportService.importFaculties(csvContent, undefined, req.user);

          case "class-students":
            return this.bulkImportService.importClassStudents(
              csvContent,
              req.query.semester_id ? Number(req.query.semester_id) : undefined,
              undefined,
              req.user,
            );

          case "offering-students":
            return this.bulkImportService.importOfferingStudents(
              csvContent,
              req.query.course_offering_id ? Number(req.query.course_offering_id) : undefined,
              undefined,
              req.user,
            );

          default:
            return errAsync(new AppError(400, `Unknown import entity "${normalizedEntity}".`));
        }
      })
      .map((summary) => ({
        status: 200,
        message: `Bulk import completed for ${summary.entity}.`,
        data: summary,
      }));
  });
}
