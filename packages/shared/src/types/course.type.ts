import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { Courses } from "../schemas/institution.schema.js";
import z from "zod";

export const CourseSelect = createSelectSchema(Courses, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Course name is required.")
      .max(128, "Course name must be 128 characters or fewer."),
  initialism: (schema) =>
    schema
      .trim()
      .min(1, "Initialism is required.")
      .max(16, "Initialism must be 16 characters or fewer.")
      .transform((val) => val.toUpperCase()),
});

export const CourseInsert = createInsertSchema(Courses, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Course name is required.")
      .max(128, "Course name must be 128 characters or fewer."),
  initialism: (schema) =>
    schema
      .trim()
      .min(1, "Initialism is required.")
      .max(16, "Initialism must be 16 characters or fewer.")
      .transform((val) => val.toUpperCase()),
});

export const CourseUpdate = createUpdateSchema(Courses, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Course name is required.")
      .max(128, "Course name must be 128 characters or fewer."),
  initialism: (schema) =>
    schema
      .trim()
      .min(1, "Initialism is required.")
      .max(16, "Initialism must be 16 characters or fewer.")
      .transform((val) => val.toUpperCase()),
});

export type ICourseSelect = z.infer<typeof CourseSelect>;
export type ICourseInsert = z.infer<typeof CourseInsert>;
export type ICourseUpdate = z.infer<typeof CourseUpdate>;

export const CourseQuerySchema = z.object({
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
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z.enum(["created_at", "name", "initialism", "program_id"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CourseQuery = z.infer<typeof CourseQuerySchema>;
