import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { CollegeService, type ICollegeService } from "@/services/college.service.js";
import z from "zod";

export class CollegeController {
  constructor(private collegeService: ICollegeService = new CollegeService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid College ID provided.");

  getCollegeById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((collegeId) => {
      return this.collegeService.getCollegeById(collegeId).map((data) => ({
        status: 200,
        message: "College details retrieved successfully.",
        data,
      }));
    });
  });

  getColleges = runAsync((req, _res) => {
    return this.collegeService.getColleges(req.query).map((data) => ({
      status: 200,
      message: "Colleges retrieved successfully.",
      data,
    }));
  });

  createCollege = runAsync((req, _res) => {
    return this.collegeService.createCollege(req.body).map((data) => ({
      status: 201,
      message: "College created successfully.",
      data,
    }));
  });

  updateCollege = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((collegeId) => {
      return this.collegeService.updateCollege(collegeId, req.body).map((data) => ({
        status: 200,
        message: "College updated successfully.",
        data,
      }));
    });
  });

  deleteCollege = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((collegeId) => {
      return this.collegeService.deleteCollege(collegeId).map(() => ({
        status: 200,
        message: "College archived successfully!",
        data: null,
      }));
    });
  });

  restoreCollege = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((collegeId) => {
      return this.collegeService.restoreCollege(collegeId).map((data) => ({
        status: 200,
        message: "College restored successfully!",
        data,
      }));
    });
  });
}
