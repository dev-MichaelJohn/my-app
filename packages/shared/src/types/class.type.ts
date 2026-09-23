import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { Classes, SectionEnum, YearLevelEnum } from "../schemas/institution.schema.js";
import z from "zod";
import { ProgramSelect } from "./program.type.js";

export const ClassSelect = createSelectSchema(Classes, {
  program_id: (schema) =>
    schema.int("Program ID must be an integer").positive("Please select a valid program."),
  year_level: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid year level.",
    }),
  section: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a section.",
    }),
});

export const ClassInsert = createInsertSchema(Classes, {
  program_id: (schema) =>
    schema.int("Program ID must be an integer").positive("Please select a valid program."),
  year_level: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid year level.",
    }),
  section: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a section.",
    }),
});

export const ClassUpdate = createUpdateSchema(Classes, {
  program_id: (schema) =>
    schema.int("Program ID must be an integer").positive("Please select a valid program."),
  year_level: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a valid year level.",
    }),
  section: (schema) =>
    schema.refine((val) => val != null && String(val).trim() !== "", {
      message: "Please select a section.",
    }),
});

export type IClassSelect = z.infer<typeof ClassSelect>;
export type IClassInsert = z.infer<typeof ClassInsert>;
export type IClassUpdate = z.infer<typeof ClassUpdate>;

export const ClassQuerySchema = z.object({
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
  year_level: z.enum(YearLevelEnum.enumValues).optional(),
  section: z.enum(SectionEnum.enumValues).optional(),
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z.enum(["created_at", "year_level", "section", "program_id"]).default("year_level"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const GetClassSchema = ClassSelect.extend({
  program: ProgramSelect.pick({
    id: true,
    name: true,
    initialism: true,
  }),
}).omit({
  program_id: true,
});

export type ClassQuery = z.infer<typeof ClassQuerySchema>;
export type GetClass = z.infer<typeof GetClassSchema>;
