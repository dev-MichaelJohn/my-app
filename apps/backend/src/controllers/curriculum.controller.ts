import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { CurriculumService, type ICurriculumService } from "@/services/curriculum.service.js";
import z from "zod";

export class CurriculumController {
  constructor(private curriculumService: ICurriculumService = new CurriculumService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Curriculum ID provided.");

  getCurriculumById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((curriculumId) => {
      return this.curriculumService.getCurriculumById(curriculumId).map((data) => ({
        status: 200,
        message: "Curriculum details retrieved successfully.",
        data,
      }));
    });
  });

  getCurriculums = runAsync((req, _res) => {
    return this.curriculumService.getCurriculums(req.query).map((data) => ({
      status: 200,
      message: "Curriculums retrieved successfully.",
      data,
    }));
  });

  createCurriculum = runAsync((req, _res) => {
    return this.curriculumService.createCurriculum(req.body).map((data) => ({
      status: 201,
      message: "Curriculum created successfully.",
      data,
    }));
  });

  updateCurriculum = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((curriculumId) => {
      return this.curriculumService.updateCurriculum(curriculumId, req.body).map((data) => ({
        status: 200,
        message: "Curriculum updated successfully.",
        data,
      }));
    });
  });

  deleteCurriculum = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((curriculumId) => {
      return this.curriculumService.deleteCurriculum(curriculumId).map(() => ({
        status: 200,
        message: "Curriculum archived successfully.",
        data: null,
      }));
    });
  });

  restoreCurriculum = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((curriculumId) => {
      return this.curriculumService.restoreCurriculum(curriculumId).map(() => ({
        status: 200,
        message: "Curriculum restored successfully.",
        data: null,
      }));
    });
  });
}
