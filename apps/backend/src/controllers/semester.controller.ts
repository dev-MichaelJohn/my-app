import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { SemesterService, type ISemesterService } from "@/services/semester.service.js";
import z from "zod";

export class SemesterController {
  constructor(private semesterService: ISemesterService = new SemesterService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Semester ID provided.");

  getSemesterById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((semesterId) => {
      return this.semesterService.getSemesterById(semesterId).map((data) => ({
        status: 200,
        message: "Semester details retrieved successfully.",
        data,
      }));
    });
  });

  getActiveSemester = runAsync(() => {
    return this.semesterService.getActiveSemester().map((data) => ({
      status: 200,
      message: data ? "Active semester retrieved." : "No active semester currently ongoing.",
      data,
    }));
  });

  getSemesters = runAsync((req) => {
    return this.semesterService.getSemesters(req.query).map((data) => ({
      status: 200,
      message: "Semesters retrieved successfully.",
      data,
    }));
  });

  createSemester = runAsync((req) => {
    return this.semesterService.createSemester(req.body).map((data) => ({
      status: 201,
      message: "Academic semester created successfully.",
      data,
    }));
  });

  updateSemester = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((semesterId) => {
      return this.semesterService.updateSemester(semesterId, req.body).map((data) => ({
        status: 200,
        message: "Semester updated successfully.",
        data,
      }));
    });
  });

  deleteSemester = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((semesterId) => {
      return this.semesterService.deleteSemester(semesterId).map(() => ({
        status: 200,
        message: "Semester archived successfully.",
        data: null,
      }));
    });
  });

  restoreSemester = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((semesterId) => {
      return this.semesterService.restoreSemester(semesterId).map((data) => ({
        status: 200,
        message: "Semester restored successfully.",
        data,
      }));
    });
  });
}
