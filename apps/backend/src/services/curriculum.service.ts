import type { DbClient } from "@/libs/transaction.lib.js";
import { CourseService, type ICourseService } from "./course.service.js";
import { ProgramService, type IProgramService } from "./program.service.js";
import type { ResultAsync } from "neverthrow";
import { AppError } from "@/libs/error.lib.js";
import type { GetCurriculum } from "@my-app/shared";

export interface ICurriculumService {
  getCurriculumById(id: number, client?: DbClient): ResultAsync<GetCurriculum, AppError>;
}

export class CurriculumService implements ICurriculumService {
  constructor(
    private programService: IProgramService = new ProgramService(),
    private courseService: ICourseService = new CourseService(),
  ) {}
}
