import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { ProgramChairs, Programs } from "../schemas/institution.schema.js";
import z from "zod";
import { CreateUserSchema, GetUserSchema } from "./user.type.js";
const nameField = (schema) => schema
    .trim()
    .min(3, "Program name must be at least 3 characters.")
    .max(255, "Program name cannot exceed 255 characters.");
const initialismField = (schema) => schema
    .trim()
    .min(2, "Initialism must be at least 2 characters (e.g., BSIT, BSEE).")
    .max(10, "Initialism cannot exceed 10 characters.");
const collegeIdField = (schema) => schema.int("College ID must be an integer.").positive("Invalid College ID.");
const programIdField = (schema) => schema.int("Program ID must be an integer.").positive("Invalid Program ID.");
const chairIdField = (schema) => schema.int("Chair ID must be an integer.").positive("Invalid Chair ID.");
export const ProgramSelect = createSelectSchema(Programs, {
    name: nameField,
    initialism: initialismField,
    college_id: collegeIdField,
});
export const ProgramInsert = createInsertSchema(Programs, {
    name: nameField,
    initialism: initialismField,
    college_id: collegeIdField,
});
export const ProgramUpdate = createUpdateSchema(Programs, {
    name: nameField,
    initialism: initialismField,
    college_id: collegeIdField,
});
export const ProgramChairSelect = createSelectSchema(ProgramChairs, {
    program_id: programIdField,
    chair_id: chairIdField,
});
export const ProgramChairInsert = createInsertSchema(ProgramChairs, {
    program_id: programIdField,
    chair_id: chairIdField,
});
export const ProgramChairUpdate = createUpdateSchema(ProgramChairs, {
    program_id: programIdField,
    chair_id: chairIdField,
});
export const GetProgramSchema = z.object({
    program: ProgramSelect,
    chair: GetUserSchema.nullable(),
});
export const ProgramQuerySchema = z.object({
    paginate: z
        .preprocess((val) => {
        if (val === "false" || val === false || val === "0" || val === 0)
            return false;
        return true;
    }, z.boolean())
        .default(true),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().trim().optional(),
    college_id: z.coerce.number().int().positive().optional(),
    has_chair: z.preprocess((val) => {
        if (val === "true" || val === true || val === "1" || val === 1)
            return true;
        if (val === "false" || val === false || val === "0" || val === 0)
            return false;
        return undefined;
    }, z.boolean().optional()),
    is_archived: z
        .preprocess((val) => {
        if (val === "true" || val === true || val === "1" || val === 1)
            return true;
        if (val === "false" || val === false || val === "0" || val === 0)
            return false;
        return false;
    }, z.boolean())
        .default(false),
    sort_by: z.enum(["created_at", "name", "initialism", "college_id"]).default("created_at"),
    order: z.enum(["asc", "desc"]).default("desc"),
});
export const CreateProgramChairSchema = z
    .discriminatedUnion("type", [
    z.object({
        type: z.literal("existing"),
        account_id: z.number().int().positive("Please select a valid account."),
    }),
    z.object({
        type: z.literal("new"),
        info: CreateUserSchema.pick({ account: true, details: true }),
    }),
])
    .nullable()
    .optional();
export const CreateProgramSchema = z.object({
    program: ProgramInsert,
    chair: CreateProgramChairSchema,
});
export const UpdateProgramSchema = z.object({
    program: ProgramUpdate.optional(),
    chair: CreateProgramChairSchema,
});
