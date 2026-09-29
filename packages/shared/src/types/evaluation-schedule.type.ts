import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import z from "zod";
import {
  StudentEvaluationSchedules,
  SupervisorEvaluationSchedules,
} from "../schemas/evaluation-schedule.schema.js";
import { SemesterSelect } from "./semester.type.js";
import { StudentEvalFormSelect, SupervisorEvalFormSelect } from "./evaluation-instrument.type.js";

const dateField = () => z.coerce.date();

// ==========================================
// 1. STUDENT SCHEDULE (SET) SCHEMAS
// ==========================================

export const StudentScheduleSelect = createSelectSchema(StudentEvaluationSchedules, {
  open_at: dateField,
  close_at: dateField,
});

export const StudentScheduleInsert = createInsertSchema(StudentEvaluationSchedules, {
  semester_id: (s) => s.int().positive("Semester ID is required."),
  form_id: (s) => s.int().positive("Form ID is required."),
  open_at: dateField,
  close_at: dateField,
})
  .omit({ id: true, created_at: true, updated_at: true, deleted_at: true })
  .refine((d) => new Date(d.open_at) < new Date(d.close_at), {
    message: "Evaluation opening date must be chronologically before closing date.",
    path: ["close_at"],
  });

export const StudentScheduleUpdate = createUpdateSchema(StudentEvaluationSchedules, {
  open_at: dateField,
  close_at: dateField,
})
  .omit({ id: true, created_at: true, updated_at: true, deleted_at: true })
  .refine(
    (d) => {
      if (d.open_at && d.close_at) {
        return new Date(d.open_at) < new Date(d.close_at);
      }
      return true;
    },
    {
      message: "Evaluation opening date must be chronologically before closing date.",
      path: ["close_at"],
    },
  );

export const GetStudentScheduleSchema = StudentScheduleSelect.extend({
  semester: SemesterSelect,
  form: StudentEvalFormSelect,
}).omit({
  semester_id: true,
  form_id: true,
});

// ==========================================
// 2. SUPERVISOR SCHEDULE (SEF) SCHEMAS
// ==========================================

export const SupervisorScheduleSelect = createSelectSchema(SupervisorEvaluationSchedules, {
  open_at: dateField,
  close_at: dateField,
});

export const SupervisorScheduleInsert = createInsertSchema(SupervisorEvaluationSchedules, {
  semester_id: (s) => s.int().positive("Semester ID is required."),
  form_id: (s) => s.int().positive("Form ID is required."),
  open_at: dateField,
  close_at: dateField,
})
  .omit({ id: true, created_at: true, updated_at: true, deleted_at: true })
  .refine((d) => new Date(d.open_at) < new Date(d.close_at), {
    message: "Evaluation opening date must be chronologically before closing date.",
    path: ["close_at"],
  });

export const SupervisorScheduleUpdate = createUpdateSchema(SupervisorEvaluationSchedules, {
  open_at: dateField,
  close_at: dateField,
})
  .omit({ id: true, created_at: true, updated_at: true, deleted_at: true })
  .refine(
    (d) => {
      if (d.open_at && d.close_at) {
        return new Date(d.open_at) < new Date(d.close_at);
      }
      return true;
    },
    {
      message: "Evaluation opening date must be chronologically before closing date.",
      path: ["close_at"],
    },
  );

// ── Hydrated Return Type ──
export const GetSupervisorScheduleSchema = SupervisorScheduleSelect.extend({
  semester: SemesterSelect,
  form: SupervisorEvalFormSelect,
}).omit({
  semester_id: true,
  form_id: true,
});

// ==========================================
// 3. QUERY SCHEMA
// ==========================================

export const EvaluationScheduleQuerySchema = z.object({
  paginate: z
    .preprocess((val) => {
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return true;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  semester_id: z.coerce.number().int().positive().optional(),
  form_id: z.coerce.number().int().positive().optional(),
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z.enum(["created_at", "open_at", "close_at"]).default("open_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type IStudentScheduleSelect = z.infer<typeof StudentScheduleSelect>;
export type IStudentScheduleInsert = z.infer<typeof StudentScheduleInsert>;
export type IStudentScheduleUpdate = z.infer<typeof StudentScheduleUpdate>;
export type GetStudentSchedule = z.infer<typeof GetStudentScheduleSchema>;

export type ISupervisorScheduleSelect = z.infer<typeof SupervisorScheduleSelect>;
export type ISupervisorScheduleInsert = z.infer<typeof SupervisorScheduleInsert>;
export type ISupervisorScheduleUpdate = z.infer<typeof SupervisorScheduleUpdate>;
export type GetSupervisorSchedule = z.infer<typeof GetSupervisorScheduleSchema>;

export type EvaluationScheduleQuery = z.infer<typeof EvaluationScheduleQuerySchema>;
