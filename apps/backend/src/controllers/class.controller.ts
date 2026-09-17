import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { ClassService, type IClassService } from "@/services/class.service.js";
import z from "zod";

export class ClassController {
  constructor(private classService: IClassService = new ClassService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Class ID provided.");

  getCourseById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classId) => {
      return this.classService.getClassById(classId).map((data) => ({
        status: 200,
        message: "Class details retrieved successfully.",
        data,
      }));
    });
  });

  getClasses = runAsync((req, _res) => {
    return this.classService.getClasses(req.query).map((data) => ({
      status: 200,
      message: "Classes retrieved successfully.",
      data,
    }));
  });

  createClass = runAsync((req, _res) => {
    return this.classService.createClass(req.body).map((data) => ({
      status: 201,
      message: "Class created successfully.",
      data,
    }));
  });

  updateClass = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classId) => {
      return this.classService.updateClass(classId, req.body).map((data) => ({
        status: 200,
        message: "Class updated successfully.",
        data,
      }));
    });
  });

  deleteClass = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classId) => {
      return this.classService.deleteClass(classId).map(() => ({
        status: 200,
        message: "Class deleted successfully.",
        data: null,
      }));
    });
  });

  restoreClass = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((classId) => {
      return this.classService.restoreClass(classId).map((data) => ({
        status: 200,
        message: "Class restored successfully.",
        data,
      }));
    });
  });
}
