import { Accounts, PersonalDetails, SystemRoles } from "../schemas/auth.schema.js";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import z from "zod";

export const AccountSelect = createSelectSchema(Accounts, {
  email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format")),
  password: (schema) =>
    schema
      .trim()
      .min(8, "Password must be at least 8 characters long.")
      .max(72, "Password cannot exceed 72 characters.")
      .refine((password) => /[A-Z]/.test(password), {
        error: "Password must have at least one uppercase letter.",
      })
      .refine((password) => /[a-z]/.test(password), {
        error: "Password must have at least one lowercase letter.",
      })
      .refine((password) => /[0-9]/.test(password), {
        error: "Password must have at least one number character.",
      })
      .refine((password) => /[!@#$%^&*_-]/.test(password), {
        error: 'Password must have at least one of these special characters. ("!@#$%^&*_-.")',
      }),
  personal_details_id: (schema) =>
    schema.int("Personal details ID must be an integer.").positive("Invalid personal details ID."),
});

export const AccountInsert = createInsertSchema(Accounts, {
  email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format")),
  password: (schema) =>
    schema
      .trim()
      .min(8, "Password must be at least 8 characters long.")
      .max(72, "Password cannot exceed 72 characters.")
      .refine((password) => /[A-Z]/.test(password), {
        error: "Password must have at least one uppercase letter.",
      })
      .refine((password) => /[a-z]/.test(password), {
        error: "Password must have at least one lowercase letter.",
      })
      .refine((password) => /[0-9]/.test(password), {
        error: "Password must have at least one number character.",
      })
      .refine((password) => /[!@#$%^&*_-]/.test(password), {
        error: 'Password must have at least one of these special characters. ("!@#$%^&*_-.")',
      }),
  personal_details_id: (schema) =>
    schema.int("Personal details ID must be an integer.").positive("Invalid personal details ID."),
});

export const AccountUpdate = createUpdateSchema(Accounts, {
  email: (schema) => schema.trim().toLowerCase().pipe(z.email("Invalid email address format")),
  password: (schema) =>
    schema
      .trim()
      .min(8, "Password must be at least 8 characters long.")
      .max(72, "Password cannot exceed 72 characters.")
      .refine((password) => /[A-Z]/.test(password), {
        error: "Password must have at least one uppercase letter.",
      })
      .refine((password) => /[a-z]/.test(password), {
        error: "Password must have at least one lowercase letter.",
      })
      .refine((password) => /[0-9]/.test(password), {
        error: "Password must have at least one number character.",
      })
      .refine((password) => /[!@#$%^&*_-]/.test(password), {
        error: 'Password must have at least one of these special characters. ("!@#$%^&*_-.")',
      }),
  personal_details_id: (schema) =>
    schema.int("Personal details ID must be an integer.").positive("Invalid personal details ID."),
});

export const PersonalDetailsSelect = createSelectSchema(PersonalDetails);

export const PersonalDetailsInsert = createInsertSchema(PersonalDetails, {
  institutional_id: (schema) =>
    schema
      .trim()
      .min(5, "Institutional ID must be at least 5 characters.")
      .max(32, "Institutional ID cannot exceed 32 characters.")
      .regex(
        /^[A-Za-z0-9-]+$/,
        "Institutional ID can only contain letters, numbers, and hyphens (e.g. 26-1042-001).",
      )
      .optional()
      .nullable()
      .or(z.literal("")),
  first_name: (schema) => schema.trim().min(2, "First name is required."),
  last_name: (schema) => schema.trim().min(2, "Last name is required."),
  middle_name: () => z.string().trim().optional().nullable(),
  suffix: () => z.string().trim().optional().nullable(),
});

export const PersonalDetailsUpdate = createUpdateSchema(PersonalDetails, {
  institutional_id: (schema) =>
    schema
      .trim()
      .min(5, "Institutional ID must be at least 5 characters.")
      .max(32, "Institutional ID cannot exceed 32 characters.")
      .regex(
        /^[A-Za-z0-9-]+$/,
        "Institutional ID can only contain letters, numbers, and hyphens (e.g. STU-26-1042-001).",
      )
      .optional()
      .nullable()
      .or(z.literal("")),
  first_name: (schema) => schema.trim().min(2, "First name is required."),
  last_name: (schema) => schema.trim().min(2, "Last name is required."),
  middle_name: () => z.string().trim().optional().nullable(),
  suffix: () => z.string().trim().optional().nullable(),
});

export type IAccountSelect = z.infer<typeof AccountSelect>;
export type IAccountInsert = z.infer<typeof AccountInsert>;
export type IAccountUpdate = z.infer<typeof AccountUpdate>;

export type IPersonaDetailsSelect = z.infer<typeof PersonalDetailsSelect>;
export type IPersonaDetailsInsert = z.infer<typeof PersonalDetailsInsert>;
export type IPersonaDetailsUpdate = z.infer<typeof PersonalDetailsUpdate>;

export const LoginAccountSchema = z.object({
  institutional_id: PersonalDetailsSelect.shape.institutional_id,
  password: z.string().min(1, "Password is required"),
});

export const GetUserSchema = z.object({
  account: AccountSelect.omit({
    password: true,
    created_at: true,
    deleted_at: true,
    updated_at: true,
  }),
  details: PersonalDetailsSelect.omit({
    created_at: true,
    deleted_at: true,
    updated_at: true,
  }),
  roles: z.array(z.enum(SystemRoles.enumValues)),
});

export const UserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  role: z.enum(SystemRoles.enumValues).optional(),
  is_verified: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  sort_by: z
    .enum(["created_at", "email", "first_name", "last_name", "institutional_id"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const CreateUserSchema = z.object({
  account: AccountInsert.omit({
    personal_details_id: true,
    created_at: true,
    deleted_at: true,
    updated_at: true,
  }).extend({
    password: AccountInsert.shape.password.optional(),
  }),
  details: PersonalDetailsSelect.omit({
    created_at: true,
    deleted_at: true,
    updated_at: true,
  }),
  role: z.enum(SystemRoles.enumValues),
});

export type LoginAccount = z.infer<typeof LoginAccountSchema>;
export type GetUser = z.infer<typeof GetUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
