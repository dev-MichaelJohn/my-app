import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  OfferingStudentService,
  type IOfferingStudentService,
} from "@/services/offering-student.service.js";
import z from "zod";

export class OfferingStudentController {
  constructor(
    private offeringStudentService: IOfferingStudentService = new OfferingStudentService(),
  ) {}

  private idSchema = z.coerce.number().int().positive("Invalid Offering-student ID provided.");

  getOfferingStudentById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringStudentId) => {
      return this.offeringStudentService
        .getOfferingStudentById(offeringStudentId, undefined, false, req.user)
        .map((data) => ({
          status: 200,
          message: "Offering-student details retrieved successfully.",
          data,
        }));
    });
  });

  getOfferingStudents = runAsync((req) => {
    return this.offeringStudentService
      .getOfferingStudents(req.query, undefined, req.user)
      .map((data) => ({
        status: 200,
        message: "Offering-students retrieved successfully.",
        data,
      }));
  });

  createOfferingStudent = runAsync((req) => {
    return this.offeringStudentService
      .createOfferingStudent(req.body, undefined, req.user, req)
      .map((data) => ({
        status: 200,
        message: "Offering-student created successfully.",
        data,
      }));
  });

  updateOfferingStudent = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringStudentId) => {
      return this.offeringStudentService
        .updateOfferingStudent(offeringStudentId, req.body, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Offering-student updated successfully.",
          data,
        }));
    });
  });

  deleteOfferingStudent = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringStudentId) => {
      return this.offeringStudentService
        .deleteOfferingStudent(offeringStudentId, undefined, req.user, req)
        .map(() => ({
          status: 200,
          message: "Offering-student removed successfully.",
          data: null,
        }));
    });
  });

  restoreOfferingStudent = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((offeringStudentId) => {
      return this.offeringStudentService
        .restoreOfferingStudent(offeringStudentId, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Offering-student restored successfully.",
          data,
        }));
    });
  });
}
