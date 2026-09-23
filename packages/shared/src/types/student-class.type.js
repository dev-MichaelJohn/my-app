import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { StudentClasses } from "../schemas/institution.schema.js";
import z from "zod";
import { GetUserSchema } from "./user.type.js";
import { GetOfferingSchema } from "./offering.type.js";
const studentIdField = (schema) => schema.int("Student ID must be an integer.").positive("Please select a valid student.");
const offeringIdField = (schema) => schema
    .int("Course offering ID must be an integer.")
    .positive("Please select a valid course offering.");
export const StudentClassSelect = createSelectSchema(StudentClasses, {
    student_account_id: studentIdField,
    course_offering_id: offeringIdField,
});
export const StudentClassInsert = createInsertSchema(StudentClasses, {
    student_account_id: studentIdField,
    course_offering_id: offeringIdField,
});
export const StudentClassUpdate = createUpdateSchema(StudentClasses, {
    student_account_id: studentIdField,
    course_offering_id: offeringIdField,
});
export const GetStudentClassSchema = StudentClassSelect.extend({
    student: GetUserSchema.omit({ roles: true }),
    offering: GetOfferingSchema,
}).omit({
    student_account_id: true,
    course_offering_id: true,
});
export const StudentClassQuerySchema = z.object({
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
    student_account_id: z.coerce.number().int().positive().optional(),
    course_offering_id: z.coerce.number().int().positive().optional(),
    is_archived: z
        .preprocess((val) => {
        if (val === "true" || val === true || val === "1" || val === 1)
            return true;
        if (val === "false" || val === false || val === "0" || val === 0)
            return false;
        return false;
    }, z.boolean())
        .default(false),
    sort_by: z.enum(["created_at", "student_account_id", "course_offering_id"]).default("created_at"),
    order: z.enum(["asc", "desc"]).default("asc"),
});
