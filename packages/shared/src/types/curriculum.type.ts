import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  CourseCurriculums,
  SemeterTermEnum,
  YearLevelEnum,
} from "../schemas/institution.schema.js";
import z from "zod";
import { ProgramSelect } from "./program.type.js";
import { CourseSelect } from "./course.type.js";

export const CurriculumSelect = createSelectSchema(CourseCurriculums, {
  course_id: (schema) =>
    schema.int("Course ID must be an integer").positive("Please select a valid course."),
  program_id: (schema) =>
    schema.int("Program ID must be an integer").positive("Please select a valid program."),
  year_level: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid year level.",
    }),
  semester_term: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid semester term.",
    }),
});

export const CurriculumInsert = createInsertSchema(CourseCurriculums, {
  course_id: (schema) =>
    schema.int("Course ID must be an integer").positive("Please select a valid course."),
  program_id: (schema) =>
    schema.int("Program ID must be an integer").positive("Please select a valid program."),
  year_level: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid year level.",
    }),
  semester_term: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid semester term.",
    }),
});

export const CurriculumUpdate = createUpdateSchema(CourseCurriculums, {
  course_id: (schema) =>
    schema.int("Course ID must be an integer").positive("Please select a valid course."),
  program_id: (schema) =>
    schema.int("Program ID must be an integer").positive("Please select a valid program."),
  year_level: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid year level.",
    }),
  semester_term: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid semester term.",
    }),
});

export type ICurriculumSelect = z.infer<typeof CurriculumSelect>;
export type ICurriculumInsert = z.infer<typeof CurriculumInsert>;
export type ICurriculumUpdate = z.infer<typeof CurriculumUpdate>;

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

export const GetCurriculumSchema = CurriculumSelect.extend({
  course: CourseSelect.pick({
    name: true,
    initialism: true,
  }),
  program: ProgramSelect.pick({
    name: true,
    initialism: true,
  }),
}).omit({
  course_id: true,
  program_id: true,
});

export type CurriculumQuery = z.infer<typeof CurriculumQuerySchema>;
export type GetCurriculum = z.infer<typeof GetCurriculumSchema>;
