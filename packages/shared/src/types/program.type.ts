import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { ProgramChairs, Programs } from "../schemas/institution.schema.js";
import z from "zod";
import { CreateUserSchema, GetUserSchema } from "./user.type.js";

export const ProgramSelect = createSelectSchema(Programs, {
  name: (schema) =>
    schema
      .trim()
      .min(3, "Program name must be at least 3 characters.")
      .max(255, "Program name cannot exceed 255 characters."),
  initialism: (schema) =>
    schema
      .trim()
      .min(2, "Initialism must be at least 2 characters (e.g., BSIT, BSEE).")
      .max(10, "Initialism cannot exceed 10 characters.")
      .transform((val) => val.toUpperCase()),
  college_id: (schema) =>
    schema.int("College ID must be an integer.").positive("Invalid College ID."),
});

export const ProgramInsert = createInsertSchema(Programs, {
  name: (schema) =>
    schema
      .trim()
      .min(3, "Program name must be at least 3 characters.")
      .max(255, "Program name cannot exceed 255 characters."),
  initialism: (schema) =>
    schema
      .trim()
      .min(2, "Initialism must be at least 2 characters (e.g., BSIT, BSEE).")
      .max(10, "Initialism cannot exceed 10 characters.")
      .transform((val) => val.toUpperCase()),
  college_id: (schema) =>
    schema.int("College ID must be an integer.").positive("Invalid College ID."),
});

export const ProgramUpdate = createUpdateSchema(Programs, {
  name: (schema) =>
    schema
      .trim()
      .min(3, "Program name must be at least 3 characters.")
      .max(255, "Program name cannot exceed 255 characters."),
  initialism: (schema) =>
    schema
      .trim()
      .min(2, "Initialism must be at least 2 characters (e.g., BSIT, BSEE).")
      .max(10, "Initialism cannot exceed 10 characters.")
      .transform((val) => val.toUpperCase()),
  college_id: (schema) =>
    schema.int("College ID must be an integer.").positive("Invalid College ID."),
});

export const ProgramChairSelect = createSelectSchema(ProgramChairs, {
  program_id: (schema) =>
    schema.int("Program ID must be an integer.").positive("Invaild Program ID."),
  chair_id: (schema) => schema.int("Chair ID must be an integer.").positive("Invaild Chair ID."),
});

export const ProgramChairInsert = createInsertSchema(ProgramChairs, {
  program_id: (schema) =>
    schema.int("Program ID must be an integer.").positive("Invaild Program ID."),
  chair_id: (schema) => schema.int("Chair ID must be an integer.").positive("Invaild Chair ID."),
});

export const ProgramChairUpdate = createUpdateSchema(ProgramChairs, {
  program_id: (schema) =>
    schema.int("Program ID must be an integer.").positive("Invaild Program ID."),
  chair_id: (schema) => schema.int("Chair ID must be an integer.").positive("Invaild Chair ID."),
});

export type IProgramSelect = z.infer<typeof ProgramSelect>;
export type IProgramInsert = z.infer<typeof ProgramInsert>;
export type IProgramUpdate = z.infer<typeof ProgramUpdate>;

export type IProgramChairSelect = z.infer<typeof ProgramChairSelect>;
export type IProgramChairInsert = z.infer<typeof ProgramChairInsert>;
export type IProgramChairUpdate = z.infer<typeof ProgramChairUpdate>;

export const GetProgramSchema = z.object({
  program: ProgramSelect.omit({
    created_at: true,
    deleted_at: true,
    updated_at: true,
  }),
  chair: GetUserSchema.nullable(),
});

export const ProgramQuerySchema = z.object({
  paginate: z
    .preprocess((val) => {
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return true;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  sort_by: z.enum(["created_at", "name", "initialism"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const CreateProgramChairSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("existing"),
      account_id: z.number().int().positive(),
    }),
    z.object({
      type: z.literal("new"),
      info: CreateUserSchema.omit({
        role: true,
      }),
    }),
  ])
  .optional();

export const CreateProgramSchema = z.object({
  program: ProgramInsert.omit({
    created_at: true,
    deleted_at: true,
    updated_at: true,
  }),
  chair: CreateProgramChairSchema,
});

export const UpdateProgramSchema = z.object({
  program: ProgramUpdate.omit({
    created_at: true,
    deleted_at: true,
    updated_at: true,
  }),
  chair: CreateProgramChairSchema,
});

export type GetProgram = z.infer<typeof GetProgramSchema>;
export type ProgramQuery = z.infer<typeof ProgramQuerySchema>;
export type CreateProgramChair = z.infer<typeof CreateProgramChairSchema>;
export type CreateProgram = z.infer<typeof CreateProgramSchema>;
export type UpdateProgram = z.infer<typeof UpdateProgramSchema>;
