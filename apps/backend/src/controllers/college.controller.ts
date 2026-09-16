import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { CollegeService, type ICollegeService } from "@/services/college.service.js";
import z from "zod";

export class CollegeController {
  constructor(private collegeService: ICollegeService = new CollegeService()) {}

  private idSchema = z.coerce.number().int().positive();

  getCollegeById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((collegeId) => {
      return this.collegeService.getCollegeById(collegeId).map((data) => ({
        status: 200,
        message: "College record found!",
        data,
      }));
    });
  });

  getColleges = runAsync((req, _res) => {
    return this.collegeService.getColleges(req.body);
  });
}
