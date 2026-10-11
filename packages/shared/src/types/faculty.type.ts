import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { Faculties } from "../schemas/institution.schema.js";
import { GetUserSchema } from "./user.type.js";
import { ProgramSelect } from "./program.type.js";
import z from "zod";

export const FacultySelect = createSelectSchema(Faculties);
export const FacultyInsert = createInsertSchema(Faculties, {
  account_id: z.coerce.number().int().positive("Please select a valid user account."),
  program_id: z.coerce.number().int().positive("Please select a valid program."),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const FacultyUpdate = createUpdateSchema(Faculties).omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export const GetFacultySchema = FacultySelect.extend({
  user: GetUserSchema,
  program: ProgramSelect,
});

export const FacultyQuerySchema = z.object({
  paginate: z.preprocess((val) => val !== "false" && val !== false, z.boolean()).default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  program_id: z.coerce.number().int().positive().optional(),
  college_id: z.coerce.number().int().positive().optional(),
  is_archived: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
});

export type IFacultySelect = z.infer<typeof FacultySelect>;
export type IFacultyInsert = z.infer<typeof FacultyInsert>;
export type IFacultyUpdate = z.infer<typeof FacultyUpdate>;
export type GetFaculty = z.infer<typeof GetFacultySchema>;
export type FacultyQuery = z.infer<typeof FacultyQuerySchema>;
