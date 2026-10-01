import {
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { Accounts } from "./auth.schema.js";
import { Semesters } from "./institution.schema.js";

export const ReportStatusEnum = pgEnum("report_status", ["DRAFT", "FINALIZED", "PUBLISHED"]);

export const IndividualFacultyReports = pgTable(
  "individual_faculty_reports",
  {
    id: serial("id").primaryKey(),
    faculty_id: integer("faculty_id")
      .notNull()
      .references(() => Accounts.id),
    semester_id: integer("semester_id")
      .notNull()
      .references(() => Semesters.id),

    // ── Separate Overall Ratings (NO 60/40 ratio) ──
    overall_set_rating: decimal("overall_set_rating", { precision: 5, scale: 2 }).notNull(),
    overall_sef_rating: decimal("overall_sef_rating", { precision: 5, scale: 2 }),

    // ── Totals ──
    total_students_evaluated: integer("total_students_evaluated").notNull().default(0),
    total_classes: integer("total_classes").notNull().default(0),
    total_weighted_score: decimal("total_weighted_score", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),

    // ── Plug-and-Play Formula ──
    calculation_formula: varchar("calculation_formula", { length: 64 })
      .notNull()
      .default("ANNEX_C_WEIGHTED"),

    // ── Anonymized Class Breakdown (Courses and Sections masked for ALL roles) ──
    class_breakdown: jsonb("class_breakdown").notNull().default([]),

    // ── Qualitative Feedback Excerpts ──
    student_comments: jsonb("student_comments").notNull().default([]), // Top 5 curated comments
    supervisor_comments: jsonb("supervisor_comments").notNull().default([]), // Supervisory remarks

    // ── Granular Faculty Development Analytics ──
    set_category_analytics: jsonb("set_category_analytics").notNull().default([]),
    set_indicator_analytics: jsonb("set_indicator_analytics").notNull().default([]),
    sef_category_analytics: jsonb("sef_category_analytics").notNull().default([]),
    sef_indicator_analytics: jsonb("sef_indicator_analytics").notNull().default([]),
    analytics_summary: jsonb("analytics_summary").notNull().default({}),

    // ── Annex D (FEDAF Development Plan) ──
    fedaf_plan: jsonb("fedaf_plan").notNull().default({
      areas_for_improvement: "",
      proposed_activities: "",
      action_plan: "",
      supervisor_name: "",
      supervisor_signed_at: null,
      faculty_signed_at: null,
    }),

    status: ReportStatusEnum("status").notNull().default("DRAFT"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uidx_faculty_semester_report").on(t.faculty_id, t.semester_id),
    index("idx_reports_faculty_id").on(t.faculty_id),
    index("idx_reports_semester_id").on(t.semester_id),
    index("idx_reports_status").on(t.status),
  ],
);
