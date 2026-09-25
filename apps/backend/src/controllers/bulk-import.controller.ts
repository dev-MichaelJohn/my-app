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
            return this.bulkImportService.importColleges(csvContent);

          case "programs":
            return this.bulkImportService.importPrograms(csvContent);

          case "courses":
            return this.bulkImportService.importCourses(csvContent);

          case "curriculums":
            return this.bulkImportService.importCurriculums(csvContent);

          case "classes":
            return this.bulkImportService.importClasses(csvContent);

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

  importColleges = runAsync((req) => {
    return this.getCsvContent(req).andThen((csv) =>
      this.bulkImportService.importColleges(csv).map((data) => ({
        status: 200,
        message: "Colleges bulk imported successfully.",
        data,
      })),
    );
  });

  importPrograms = runAsync((req) => {
    return this.getCsvContent(req).andThen((csv) =>
      this.bulkImportService.importPrograms(csv).map((data) => ({
        status: 200,
        message: "Academic programs bulk imported successfully.",
        data,
      })),
    );
  });

  importCourses = runAsync((req) => {
    return this.getCsvContent(req).andThen((csv) =>
      this.bulkImportService.importCourses(csv).map((data) => ({
        status: 200,
        message: "Courses bulk imported successfully.",
        data,
      })),
    );
  });

  importCurriculums = runAsync((req) => {
    return this.getCsvContent(req).andThen((csv) =>
      this.bulkImportService.importCurriculums(csv).map((data) => ({
        status: 200,
        message: "Course curriculums bulk imported successfully.",
        data,
      })),
    );
  });

  importClasses = runAsync((req) => {
    return this.getCsvContent(req).andThen((csv) =>
      this.bulkImportService.importClasses(csv).map((data) => ({
        status: 200,
        message: "Academic classes bulk imported successfully.",
        data,
      })),
    );
  });
}
