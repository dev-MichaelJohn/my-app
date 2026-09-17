import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { ProgramService, type IProgramService } from "@/services/program.service.js";
import z from "zod";

export class ProgramController {
  constructor(private programService: IProgramService = new ProgramService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Program ID provided.");

  getProgramById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((programId) => {
      return this.programService.getProgramById(programId).map((data) => ({
        status: 200,
        message: "Program details retrieved successfully.",
        data,
      }));
    });
  });

  getPrograms = runAsync((req, _res) => {
    return this.programService.getPrograms(req.query).map((data) => ({
      status: 200,
      message: "Programs retrieved successfully.",
      data,
    }));
  });

  createProgram = runAsync((req, _res) => {
    return this.programService.createProgram(req.body).map((data) => ({
      status: 201,
      message: "Program created successfully.",
      data,
    }));
  });

  updateProgram = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((programId) => {
      return this.programService.updateProgram(programId, req.body).map((data) => ({
        status: 200,
        message: "Program updated successfully.",
        data,
      }));
    });
  });

  deleteProgram = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((programId) => {
      return this.programService.deleteProgram(programId).map(() => ({
        status: 200,
        message: "College archived successfully.",
        data: null,
      }));
    });
  });

  restoreProgram = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((programId) => {
      return this.programService.restoreProgram(programId).map((data) => ({
        status: 200,
        message: "College restored successfully.",
        data,
      }));
    });
  });
}
