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

    // ── Overall Separate Ratings (NO 60/40 ratio) ──
    overall_set_rating: decimal("overall_set_rating", { precision: 5, scale: 2 }).notNull(),
    overall_sef_rating: decimal("overall_sef_rating", { precision: 5, scale: 2 }), // Nullable if no supervisor rating

    // ── Totals for Annex C ──
    total_students_evaluated: integer("total_students_evaluated").notNull().default(0),
    total_classes: integer("total_classes").notNull().default(0),
    total_weighted_score: decimal("total_weighted_score", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),

    // ── Plug-and-play formula identifier ──
    calculation_formula: varchar("calculation_formula", { length: 64 })
      .notNull()
      .default("ANNEX_C_WEIGHTED"),

    // ── Annex C Section B Table (Class breakdown array) ──
    class_breakdown: jsonb("class_breakdown").notNull().default([]),

    // ── Top 5 Curated Anonymous Comments (2 Positive, 2 Negative, 1 Neutral) ──
    top_comments: jsonb("top_comments").notNull().default([]),

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
