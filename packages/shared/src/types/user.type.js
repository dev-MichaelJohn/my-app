import { Accounts, PersonalDetails, SystemRoles } from "../schemas/auth.schema.js";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import z from "zod";
const emailField = (schema) => schema.trim().toLowerCase().email("Invalid email address format.");
const passwordField = (schema) => schema
    .trim()
    .min(8, "Password must be at least 8 characters long.")
    .max(72, "Password cannot exceed 72 characters.")
    .refine((v) => /[A-Z]/.test(v), {
    message: "Password must have at least one uppercase letter.",
})
    .refine((v) => /[a-z]/.test(v), {
    message: "Password must have at least one lowercase letter.",
})
    .refine((v) => /[0-9]/.test(v), {
    message: "Password must have at least one number character.",
})
    .refine((v) => /[!@#$%^&*_-]/.test(v), {
    message: 'Password must have at least one special character ("!@#$%^&*_-").',
});
const personalDetailsIdField = (schema) => schema.int("Personal details ID must be an integer.").positive("Invalid personal details ID.");
const institutionalIdField = (schema) => schema
    .trim()
    .min(5, "Institutional ID must be at least 5 characters.")
    .max(32, "Institutional ID cannot exceed 32 characters.")
    .regex(/^[A-Za-z0-9-]+$/, "Institutional ID can only contain letters, numbers, and hyphens (e.g. 26-1042-001).");
export const AccountSelect = createSelectSchema(Accounts, {
    email: emailField,
    password: passwordField,
    personal_details_id: personalDetailsIdField,
});
export const AccountInsert = createInsertSchema(Accounts, {
    email: emailField,
    password: passwordField,
    personal_details_id: personalDetailsIdField,
});
export const AccountUpdate = createUpdateSchema(Accounts, {
    email: emailField,
    password: passwordField,
    personal_details_id: personalDetailsIdField,
});
export const PersonalDetailsSelect = createSelectSchema(PersonalDetails, {
    institutional_id: institutionalIdField,
    first_name: (schema) => schema.trim().min(2, "First name is required."),
    last_name: (schema) => schema.trim().min(2, "Last name is required."),
    middle_name: (schema) => schema.trim().nullable().optional(),
    suffix: (schema) => schema.trim().nullable().optional(),
});
export const PersonalDetailsInsert = createInsertSchema(PersonalDetails, {
    institutional_id: institutionalIdField,
    first_name: (schema) => schema.trim().min(2, "First name is required."),
    last_name: (schema) => schema.trim().min(2, "Last name is required."),
    middle_name: (schema) => schema.trim().nullable().optional(),
    suffix: (schema) => schema.trim().nullable().optional(),
});
export const PersonalDetailsUpdate = createUpdateSchema(PersonalDetails, {
    institutional_id: institutionalIdField,
    first_name: (schema) => schema.trim().min(2, "First name is required."),
    last_name: (schema) => schema.trim().min(2, "Last name is required."),
    middle_name: (schema) => schema.trim().nullable().optional(),
    suffix: (schema) => schema.trim().nullable().optional(),
});
export const LoginAccountSchema = z.object({
    institutional_id: institutionalIdField(z.string()),
    password: z.string().min(1, "Password is required."),
});
export const GetUserSchema = z.object({
    account: AccountSelect.omit({ password: true }),
    details: PersonalDetailsSelect,
    roles: z.array(z.enum(SystemRoles.enumValues)),
});
export const UserQuerySchema = z.object({
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
    role: z.enum(SystemRoles.enumValues).optional(),
    is_verified: z.preprocess((val) => {
        if (val === "true" || val === true)
            return true;
        if (val === "false" || val === false)
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
    sort_by: z
        .enum(["created_at", "email", "first_name", "last_name", "institutional_id"])
        .default("created_at"),
    order: z.enum(["asc", "desc"]).default("desc"),
});
export const CreateUserSchema = z.object({
    account: AccountInsert,
    details: PersonalDetailsInsert,
    role: z.enum(SystemRoles.enumValues),
});
export const UpdateUserSchema = z.object({
    account: AccountUpdate.optional(),
    details: PersonalDetailsUpdate.optional(),
    role: z.enum(SystemRoles.enumValues).optional(),
});
export const SystemRoleSchema = z.enum(SystemRoles.enumValues);
