import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  StudentClassService,
  type IStudentClassService,
} from "@/services/student-class.service.js";
import z from "zod";

export class StudentClassController {
  constructor(private studentClassService: IStudentClassService = new StudentClassService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Student-class ID provided.");

  getStudentClassById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((studentClassId) => {
      return this.studentClassService.getStudentClassById(studentClassId).map((data) => ({
        status: 200,
        message: "Student-class details retrieved successfully.",
        data,
      }));
    });
  });

  getStudentClasses = runAsync((req, _res) => {
    return this.studentClassService.getStudentClasses(req.query).map((data) => ({
      status: 200,
      message: "Student-classes retrieved successfully.",
      data,
    }));
  });

  createStudentClass = runAsync((req, _res) => {
    return this.studentClassService.createStudentClass(req.body).map((data) => ({
      status: 200,
      message: "Student-class created successfully.",
      data,
    }));
  });

  updateStudentClass = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((studentClassId) => {
      return this.studentClassService.updateStudentClass(studentClassId, req.body).map((data) => ({
        status: 200,
        message: "Student-class updated successfully.",
        data,
      }));
    });
  });

  deleteStudentClass = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((studentClassId) => {
      return this.studentClassService.deleteStudentClass(studentClassId).map(() => ({
        status: 200,
        message: "Student-class updated successfully.",
        data: null,
      }));
    });
  });

  restoreStudentClass = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((studentClassId) => {
      return this.studentClassService.restoreStudentClass(studentClassId).map((data) => ({
        status: 200,
        message: "Student-class updated successfully.",
        data,
      }));
    });
  });
}
