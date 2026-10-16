import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  ClassStudentService,
  type IClassStudentService,
} from "@/services/class-student.service.js";
import z from "zod";

export class ClassStudentController {
  constructor(private classStudentService: IClassStudentService = new ClassStudentService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Class-student ID provided.");

  getClassStudentById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classStudentId) => {
      return this.classStudentService.getClassStudentById(classStudentId).map((data) => ({
        status: 200,
        message: "Class-student details retrieved successfully.",
        data,
      }));
    });
  });

  getClassStudents = runAsync((req) => {
    return this.classStudentService
      .getClassStudents(req.query, undefined, req.user)
      .map((data) => ({
        status: 200,
        message: "Class-students retrieved successfully.",
        data,
      }));
  });

  createClassStudent = runAsync((req) => {
    return this.classStudentService
      .createClassStudent(req.body, undefined, req.user, req)
      .map((data) => ({
        status: 200,
        message: "Class-student created successfully.",
        data,
      }));
  });

  updateClassStudent = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classStudentId) => {
      return this.classStudentService
        .updateClassStudent(classStudentId, req.body, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Class-student updated successfully.",
          data,
        }));
    });
  });

  deleteClassStudent = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classStudentId) => {
      return this.classStudentService
        .deleteClassStudent(classStudentId, undefined, req.user, req)
        .map(() => ({
          status: 200,
          message: "Class-student archived successfully.",
          data: null,
        }));
    });
  });

  restoreClassStudent = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classStudentId) => {
      return this.classStudentService
        .restoreClassStudent(classStudentId, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Class-student restored successfully.",
          data,
        }));
    });
  });
}
