import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { CollegeDeans, Colleges } from "../schemas/institution.schema.js";
import z from "zod";
import { CreateUserSchema, GetUserSchema } from "./user.type.js";

export const CollegeSelect = createSelectSchema(Colleges, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "College name is required.")
      .max(128, "College name cannot exceed 128 characters."),
  initialism: (schema) =>
    schema
      .trim()
      .min(1, "Initialism is required.")
      .max(16, "Initialism cannot exceed 16 characters.")
      .transform((val) => val.toUpperCase()), // 👈 Fixed
});

export const CollegeInsert = createInsertSchema(Colleges, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "College name is required.")
      .max(128, "College name cannot exceed 128 characters."),
  initialism: (schema) =>
    schema
      .trim()
      .min(1, "Initialism is required.")
      .max(16, "Initialism cannot exceed 16 characters."),
});

export const CollegeUpdate = createUpdateSchema(Colleges, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "College name is required.")
      .max(128, "College name cannot exceed 128 characters."),
  initialism: (schema) =>
    schema
      .trim()
      .min(1, "Initialism is required.")
      .max(16, "Initialism cannot exceed 16 characters."),
});

export const CollegeDeanSelect = createSelectSchema(CollegeDeans, {
  college_id: (schema) =>
    schema.int("College ID must be an integer.").positive("Invalid college ID."),
  dean_id: (schema) => schema.int("Dean ID must be an integer.").positive("Invalid dean ID."),
});

export const CollegeDeanInsert = createInsertSchema(CollegeDeans, {
  college_id: (schema) =>
    schema.int("College ID must be an integer.").positive("Invalid college ID."),
  dean_id: (schema) => schema.int("Dean ID must be an integer.").positive("Invalid dean ID."),
});

export const CollegeDeanUpdate = createUpdateSchema(CollegeDeans, {
  college_id: (schema) =>
    schema.int("College ID must be an integer.").positive("Invalid college ID."),
  dean_id: (schema) => schema.int("Dean ID must be an integer.").positive("Invalid dean ID."),
});

export type ICollegeSelect = z.infer<typeof CollegeSelect>;
export type ICollegeInsert = z.infer<typeof CollegeInsert>;
export type ICollegeUpdate = z.infer<typeof CollegeUpdate>;

export type ICollegeDeanSelect = z.infer<typeof CollegeDeanSelect>;
export type ICollegeDeanInsert = z.infer<typeof CollegeDeanInsert>;
export type ICollegeDeanUpdate = z.infer<typeof CollegeDeanUpdate>;

export const GetCollegeSchema = z.object({
  college: CollegeSelect,
  dean: GetUserSchema.nullable(),
});

export const CollegeQuerySchema = z.object({
  paginate: z
    .preprocess((val) => {
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return true;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  has_dean: z.preprocess((val) => {
    if (val === "true" || val === true || val === "1" || val === 1) return true;
    if (val === "false" || val === false || val === "0" || val === 0) return false;
    return undefined;
  }, z.boolean().optional()),
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z.enum(["created_at", "name", "initialism"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const CreateCollegeDeanSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("existing"),
      account_id: z.number().int().positive("Please select a valid account."),
    }),
    z.object({
      type: z.literal("new"),
      info: CreateUserSchema.omit({
        role: true,
      }),
    }),
  ])
  .nullable() // 👈 Added nullable
  .optional();

export const CreateCollegeSchema = z.object({
  college: CollegeInsert.pick({
    name: true,
    initialism: true,
  }),
  dean: CreateCollegeDeanSchema,
});

export const UpdateCollegeSchema = z.object({
  college: CollegeUpdate.pick({
    name: true,
    initialism: true,
  }).optional(),
  dean: CreateCollegeDeanSchema,
});

export type GetCollege = z.infer<typeof GetCollegeSchema>;
export type CollegeQuery = z.infer<typeof CollegeQuerySchema>;
export type CreateCollegeDean = z.infer<typeof CreateCollegeDeanSchema>;
export type CreateCollege = z.infer<typeof CreateCollegeSchema>;
export type UpdateCollege = z.infer<typeof UpdateCollegeSchema>;
