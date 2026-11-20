import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { OfferingStudents } from "../schemas/institution.schema.js";
import z from "zod";
import { CreateUserSchema, GetUserSchema } from "./user.type.js";
import { GetOfferingSchema } from "./offering.type.js";

const studentIdField = (schema: z.ZodNumber) =>
  schema.int("Student ID must be an integer.").positive("Please select a valid student.");

const offeringIdField = (schema: z.ZodNumber) =>
  schema
    .int("Course offering ID must be an integer.")
    .positive("Please select a valid course offering.");

export const OfferingStudentSelect = createSelectSchema(OfferingStudents, {
  student_account_id: studentIdField,
  course_offering_id: offeringIdField,
});

export const OfferingStudentInsert = createInsertSchema(OfferingStudents, {
  student_account_id: studentIdField,
  course_offering_id: offeringIdField,
});

export const CreateOfferingStudentNewUserSchema = z.object({
  course_offering_id: z.number().int().positive("Please select a valid course offering."),
  new_user: CreateUserSchema.pick({ account: true, details: true }),
});

export const CreateOfferingStudentPayloadSchema = z.union([
  OfferingStudentInsert,
  CreateOfferingStudentNewUserSchema,
]);

export const OfferingStudentUpdate = createUpdateSchema(OfferingStudents, {
  student_account_id: studentIdField,
  course_offering_id: offeringIdField,
});

export type IOfferingStudentSelect = z.infer<typeof OfferingStudentSelect>;
export type IOfferingStudentInsert = z.infer<typeof OfferingStudentInsert>;
export type ICreateOfferingStudentNewUser = z.infer<typeof CreateOfferingStudentNewUserSchema>;
export type CreateOfferingStudentPayload = z.infer<typeof CreateOfferingStudentPayloadSchema>;
export type IOfferingStudentUpdate = z.infer<typeof OfferingStudentUpdate>;

export const GetOfferingStudentSchema = OfferingStudentSelect.extend({
  student: GetUserSchema.omit({ roles: true }),
  offering: GetOfferingSchema,
}).omit({
  student_account_id: true,
  course_offering_id: true,
});

export const OfferingStudentQuerySchema = z.object({
  paginate: z
    .preprocess((val) => {
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return true;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  student_account_id: z.coerce.number().int().positive().optional(),
  course_offering_id: z.coerce.number().int().positive().optional(),
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z.enum(["created_at", "student_account_id", "course_offering_id"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type GetOfferingStudent = z.infer<typeof GetOfferingStudentSchema>;
export type OfferingStudentQuery = z.infer<typeof OfferingStudentQuerySchema>;
