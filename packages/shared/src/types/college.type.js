import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { CollegeDeans, Colleges } from "../schemas/institution.schema.js";
import z from "zod";
import { CreateUserSchema, GetUserSchema } from "./user.type.js";
const nameField = (schema) => schema
    .trim()
    .min(1, "College name is required.")
    .max(128, "College name cannot exceed 128 characters.");
const initialismField = (schema) => schema
    .trim()
    .min(1, "Initialism is required.")
    .max(16, "Initialism cannot exceed 16 characters.");
const collegeIdField = (schema) => schema.int("College ID must be an integer.").positive("Invalid college ID.");
const deanIdField = (schema) => schema.int("Dean ID must be an integer.").positive("Invalid dean ID.");
export const CollegeSelect = createSelectSchema(Colleges, {
    name: nameField,
    initialism: initialismField,
});
export const CollegeInsert = createInsertSchema(Colleges, {
    name: nameField,
    initialism: initialismField,
});
export const CollegeUpdate = createUpdateSchema(Colleges, {
    name: nameField,
    initialism: initialismField,
});
export const CollegeDeanSelect = createSelectSchema(CollegeDeans, {
    college_id: collegeIdField,
    dean_id: deanIdField,
});
export const CollegeDeanInsert = createInsertSchema(CollegeDeans, {
    college_id: collegeIdField,
    dean_id: deanIdField,
});
export const CollegeDeanUpdate = createUpdateSchema(CollegeDeans, {
    college_id: collegeIdField,
    dean_id: deanIdField,
});
export const GetCollegeSchema = z.object({
    college: CollegeSelect,
    dean: GetUserSchema.nullable(),
});
export const CollegeQuerySchema = z.object({
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
    has_dean: z.preprocess((val) => {
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
        info: CreateUserSchema.pick({ account: true, details: true }),
    }),
])
    .nullable()
    .optional();
export const CreateCollegeSchema = z.object({
    college: CollegeInsert,
    dean: CreateCollegeDeanSchema,
});
export const UpdateCollegeSchema = z.object({
    college: CollegeUpdate.optional(),
    dean: CreateCollegeDeanSchema,
});
