import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { ClassStudents } from "../schemas/institution.schema.js";
import z from "zod";
import { GetClassSchema } from "./class.type.js";
import { GetUserSchema } from "./user.type.js";
import { SemesterSelect } from "./semester.type.js";
const classIdField = (schema) => schema.int("Class ID must be an integer.").positive("Please select a valid class.");
const studentIdField = (schema) => schema.int("Student ID must be an integer.").positive("Please select a valid student.");
const semesterIdField = (schema) => schema.int("Semester ID must be an integer.").positive("Please select a valid semester.");
export const ClassStudentSelect = createSelectSchema(ClassStudents, {
    class_id: classIdField,
    student_account_id: studentIdField,
    semester_id: semesterIdField,
});
export const ClassStudentInsert = createInsertSchema(ClassStudents, {
    class_id: classIdField,
    student_account_id: studentIdField,
    semester_id: semesterIdField,
});
export const ClassStudentUpdate = createUpdateSchema(ClassStudents, {
    class_id: classIdField,
    student_account_id: studentIdField,
    semester_id: semesterIdField,
});
export const GetClassStudentSchema = ClassStudentSelect.extend({
    class: GetClassSchema,
    student: GetUserSchema.omit({ roles: true }),
    semester: SemesterSelect,
}).omit({
    class_id: true,
    student_account_id: true,
    semester_id: true,
});
export const ClassStudentQuerySchema = z.object({
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
    class_id: z.coerce.number().int().positive().optional(),
    student_id: z.coerce.number().int().positive().optional(),
    semester_id: z.coerce.number().int().positive().optional(),
    is_archived: z
        .preprocess((val) => {
        if (val === "true" || val === true || val === "1" || val === 1)
            return true;
        if (val === "false" || val === false || val === "0" || val === 0)
            return false;
        return false;
    }, z.boolean())
        .default(false),
    sort_by: z.enum(["created_at", "class_id", "semester_id", "student_id"]).default("created_at"),
    order: z.enum(["asc", "desc"]).default("asc"),
});
