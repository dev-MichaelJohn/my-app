import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const StudentEvaluationForms = pgTable(
  "student_evaluation_forms",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    min_rating: integer("min_rating").notNull().default(1),
    max_rating: integer("max_rating").notNull().default(5),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_student_eval_form_title")
      .on(t.title)
      .where(sql`deleted_at IS NULL`),
    check("chk_student_eval_rating_bounds", sql`${t.min_rating} < ${t.max_rating}`),
  ],
);

export const StudentEvaluationCategories = pgTable(
  "student_evaluation_categories",
  {
    id: serial("id").primaryKey(),
    form_id: integer("form_id")
      .notNull()
      .references(() => StudentEvaluationForms.id, { onDelete: "cascade" }),
    parent_id: integer("parent_id").references((): AnyPgColumn => StudentEvaluationCategories.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    order: integer("order").notNull().default(1),
    version: integer("version").notNull().default(1),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_student_eval_categories_form_id").on(t.form_id),
    uniqueIndex("uidx_active_student_eval_category_name")
      .on(t.form_id, t.name)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const StudentEvaluationQuestions = pgTable(
  "student_evaluation_questions",
  {
    id: serial("id").primaryKey(),
    category_id: integer("category_id")
      .notNull()
      .references(() => StudentEvaluationCategories.id, { onDelete: "cascade" }),
    parent_id: integer("parent_id").references((): AnyPgColumn => StudentEvaluationQuestions.id, {
      onDelete: "set null",
    }),
    question: text("question").notNull(),
    max_rating: integer("max_rating").notNull().default(5),
    order: integer("order").notNull().default(1),
    version: integer("version").notNull().default(1),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [index("idx_student_eval_questions_category_id").on(t.category_id)],
);

export const SupervisorEvaluationForms = pgTable(
  "supervisor_evaluation_forms",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    min_rating: integer("min_rating").notNull().default(1),
    max_rating: integer("max_rating").notNull().default(5),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_supervisor_eval_form_title")
      .on(t.title)
      .where(sql`deleted_at IS NULL`),
    check("chk_supervisor_eval_rating_bounds", sql`${t.min_rating} < ${t.max_rating}`),
  ],
);

export const SupervisorEvaluationCategories = pgTable(
  "supervisor_evaluation_categories",
  {
    id: serial("id").primaryKey(),
    form_id: integer("form_id")
      .notNull()
      .references(() => SupervisorEvaluationForms.id, { onDelete: "cascade" }),
    parent_id: integer("parent_id").references(
      (): AnyPgColumn => SupervisorEvaluationCategories.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    order: integer("order").notNull().default(1),
    version: integer("version").notNull().default(1),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_supervisor_eval_categories_form_id").on(t.form_id),
    uniqueIndex("uidx_active_supervisor_eval_category_name")
      .on(t.form_id, t.name)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const SupervisorEvaluationQuestions = pgTable(
  "supervisor_evaluation_questions",
  {
    id: serial("id").primaryKey(),
    category_id: integer("category_id")
      .notNull()
      .references(() => SupervisorEvaluationCategories.id, { onDelete: "cascade" }),
    parent_id: integer("parent_id").references(
      (): AnyPgColumn => SupervisorEvaluationQuestions.id,
      { onDelete: "set null" },
    ),
    question: text("question").notNull(),
    max_rating: integer("max_rating").notNull().default(5),
    order: integer("order").notNull().default(1),
    version: integer("version").notNull().default(1),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [index("idx_supervisor_eval_questions_category_id").on(t.category_id)],
);

export const SupervisorEvaluationMeans = pgTable(
  "supervisor_evaluation_means",
  {
    id: serial("id").primaryKey(),
    question_id: integer("question_id")
      .notNull()
      .references(() => SupervisorEvaluationQuestions.id, { onDelete: "cascade" }),
    parent_id: integer("parent_id").references((): AnyPgColumn => SupervisorEvaluationMeans.id, {
      onDelete: "set null",
    }),
    descriptor: varchar("descriptor", { length: 255 }).notNull(),
    order: integer("order").notNull().default(1),
    version: integer("version").notNull().default(1),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [index("idx_supervisor_eval_means_question_id").on(t.question_id)],
);
