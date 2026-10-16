import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { FacultyService, type IFacultyService } from "@/services/faculty.service.js";
import z from "zod";

export class FacultyController {
  constructor(private facultyService: IFacultyService = new FacultyService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Faculty ID.");

  getFacultyById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.facultyService.getFacultyById(id).map((data) => ({
        status: 200,
        message: "Faculty details retrieved.",
        data,
      }));
    });
  });

  getFaculties = runAsync((req) => {
    return this.facultyService.getFaculties(req.query, undefined, req.user).map((data) => ({
      status: 200,
      message: "Department faculty roster retrieved.",
      data,
    }));
  });

  createFaculty = runAsync((req) => {
    return this.facultyService.createFaculty(req.body, undefined, req.user, req).map((data) => ({
      status: 201,
      message: "Instructor appointed to academic program successfully.",
      data,
    }));
  });

  updateFaculty = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.facultyService
        .updateFaculty(id, req.body, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Faculty appointment updated.",
          data,
        }));
    });
  });

  deleteFaculty = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.facultyService.deleteFaculty(id, undefined, req.user, req).map(() => ({
        status: 200,
        message: "Faculty appointment archived.",
        data: null,
      }));
    });
  });

  restoreFaculty = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.facultyService.restoreFaculty(id, undefined, req.user, req).map((data) => ({
        status: 200,
        message: "Faculty appointment restored.",
        data,
      }));
    });
  });
}
