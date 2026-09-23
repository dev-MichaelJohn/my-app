import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { CourseOfferings } from "../schemas/institution.schema.js";
import z from "zod";
import { GetCurriculumSchema } from "./curriculum.type.js";
import { GetClassSchema } from "./class.type.js";
import { SemesterSelect } from "./semester.type.js";
import { GetUserSchema } from "./user.type.js";
const curriculumIdField = (schema) => schema.int("Curriculum ID must be an integer.").positive("Please select a valid course.");
const classIdField = (schema) => schema.int("Class ID must be an integer.").positive("Please select a valid class.");
const semesterIdField = (schema) => schema.int("Semester ID must be an integer.").positive("Please select a valid semester.");
const facultyIdField = (schema) => schema
    .int("Faculty ID must be an integer.")
    .positive("Please select a valid faculty.")
    .nullable()
    .optional();
export const OfferingSelect = createSelectSchema(CourseOfferings, {
    course_curriculum_id: curriculumIdField,
    class_id: classIdField,
    semester_id: semesterIdField,
    faculty_id: facultyIdField,
});
export const OfferingInsert = createInsertSchema(CourseOfferings, {
    course_curriculum_id: curriculumIdField,
    class_id: classIdField,
    semester_id: semesterIdField,
    faculty_id: facultyIdField,
});
export const OfferingUpdate = createUpdateSchema(CourseOfferings, {
    course_curriculum_id: curriculumIdField,
    class_id: classIdField,
    semester_id: semesterIdField,
    faculty_id: facultyIdField,
});
export const GetOfferingSchema = OfferingSelect.extend({
    course_curriculum: GetCurriculumSchema.pick({ id: true, course: true }),
    class: GetClassSchema.pick({ id: true, year_level: true, section: true, program: true }),
    semester: SemesterSelect,
    faculty: GetUserSchema.omit({ roles: true }).nullable(),
}).omit({
    course_curriculum_id: true,
    class_id: true,
    semester_id: true,
    faculty_id: true,
});
export const OfferingQuerySchema = z.object({
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
    course_curriculum_id: z.coerce.number().int().positive().optional(),
    class_id: z.coerce.number().int().positive().optional(),
    semester_id: z.coerce.number().int().positive().optional(),
    faculty_id: z.coerce.number().int().positive().optional(),
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
        .enum(["created_at", "course_curriculum_id", "class_id", "semester_id", "faculty_id"])
        .default("created_at"),
    order: z.enum(["asc", "desc"]).default("asc"),
});
