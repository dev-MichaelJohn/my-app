import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  CourseCurriculums,
  SemeterTermEnum,
  YearLevelEnum,
} from "../schemas/institution.schema.js";
import z from "zod";
import { ProgramSelect } from "./program.type.js";
import { CourseSelect } from "./course.type.js";

const courseIdField = (schema: z.ZodNumber) =>
  schema.int("Course ID must be an integer.").positive("Please select a valid course.");

const programIdField = (schema: z.ZodNumber) =>
  schema.int("Program ID must be an integer.").positive("Please select a valid program.");

export const CurriculumSelect = createSelectSchema(CourseCurriculums, {
  course_id: courseIdField,
  program_id: programIdField,
});

export const CurriculumInsert = createInsertSchema(CourseCurriculums, {
  course_id: courseIdField,
  program_id: programIdField,
});

export const CurriculumUpdate = createUpdateSchema(CourseCurriculums, {
  course_id: courseIdField,
  program_id: programIdField,
});

export type ICurriculumSelect = z.infer<typeof CurriculumSelect>;
export type ICurriculumInsert = z.infer<typeof CurriculumInsert>;
export type ICurriculumUpdate = z.infer<typeof CurriculumUpdate>;

export const GetCurriculumSchema = CurriculumSelect.extend({
  course: CourseSelect.pick({ id: true, name: true, initialism: true }),
  program: ProgramSelect.pick({ id: true, name: true, initialism: true }),
}).omit({ course_id: true, program_id: true });

export const CurriculumQuerySchema = z.object({
  paginate: z
    .preprocess((val) => {
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return true;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  program_id: z.coerce.number().int().positive().optional(),
  course_id: z.coerce.number().int().positive().optional(),
  year_level: z.enum(YearLevelEnum.enumValues).optional(),
  semester_term: z.enum(SemeterTermEnum.enumValues).optional(),
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z
    .enum(["created_at", "year_level", "semester_term", "program_id", "course_id"])
    .default("year_level"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type GetCurriculum = z.infer<typeof GetCurriculumSchema>;
export type CurriculumQuery = z.infer<typeof CurriculumQuerySchema>;
