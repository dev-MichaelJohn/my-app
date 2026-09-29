import { index, integer, pgTable, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { Semesters } from "./institution.schema.js";
import {
  StudentEvaluationForms,
  SupervisorEvaluationForms,
} from "./evaluation-instrument.schema.js";
import { sql } from "drizzle-orm";

export const StudentEvaluationSchedules = pgTable(
  "student_evaluation_schedules",
  {
    id: serial("id").primaryKey(),
    semester_id: integer("semester_id")
      .notNull()
      .references(() => Semesters.id),
    form_id: integer("form_id")
      .notNull()
      .references(() => StudentEvaluationForms.id),
    open_at: timestamp("open_at").notNull(),
    close_at: timestamp("close_at").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_student_eval_schedule_semester_id").on(t.semester_id),
    index("idx_student_eval_schedule_form_id").on(t.form_id),
    uniqueIndex("uidx_active_student_schedule")
      .on(t.semester_id, t.form_id)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const SupervisorEvaluationSchedules = pgTable(
  "supervisor_evaluation_schedules",
  {
    id: serial("id").primaryKey(),
    semester_id: integer("semester_id")
      .notNull()
      .references(() => Semesters.id),
    form_id: integer("form_id")
      .notNull()
      .references(() => SupervisorEvaluationForms.id),
    open_at: timestamp("open_at").notNull(),
    close_at: timestamp("close_at").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_supervisor_eval_schedule_semester_id").on(t.semester_id),
    index("idx_supervisor_eval_schedule_form_id").on(t.form_id),
    uniqueIndex("uidx_active_supervisor_schedule")
      .on(t.semester_id, t.form_id)
      .where(sql`deleted_at IS NULL`),
  ],
);
