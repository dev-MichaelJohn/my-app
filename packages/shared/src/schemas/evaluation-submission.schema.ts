import {
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  StudentEvaluationSchedules,
  SupervisorEvaluationSchedules,
} from "./evaluation-schedule.schema.js";
import {
  StudentEvaluationQuestions,
  SupervisorEvaluationQuestions,
} from "./evaluation-instrument.schema.js";
import { CourseOfferings, StudentClasses } from "./institution.schema.js";
import { Accounts } from "./auth.schema.js";

export const SentimentClassificationEnum = pgEnum("sentiment_classification", [
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
  "MIXED",
]);

export const StudentEvaluationTurnout = pgTable(
  "student_evaluation_turnout",
  {
    id: serial("id").primaryKey(),
    schedule_id: integer("schedule_id")
      .notNull()
      .references(() => StudentEvaluationSchedules.id),
    student_account_id: integer("student_account_id")
      .notNull()
      .references(() => Accounts.id),
    course_offering_id: integer("course_offering_id")
      .notNull()
      .references(() => CourseOfferings.id),
    submitted_at: timestamp("submitted_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uidx_turnout_student_offering_sched").on(
      t.schedule_id,
      t.student_account_id,
      t.course_offering_id,
    ),
    index("idx_turnout_offering_sched").on(t.course_offering_id, t.schedule_id),
    index("idx_turnout_student").on(t.student_account_id),
  ],
);

export const StudentEvaluationDrafts = pgTable(
  "student_evaluation_drafts",
  {
    id: serial("id").primaryKey(),
    schedule_id: integer("schedule_id")
      .notNull()
      .references(() => StudentEvaluationSchedules.id),
    student_class_id: integer("student_class_id")
      .notNull()
      .references(() => StudentClasses.id),
    saved_ratings: jsonb("saved_ratings").notNull().default({}),
    saved_comment: text("saved_comment"),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("uidx_student_draft").on(t.schedule_id, t.student_class_id)],
);

export const StudentBallots = pgTable(
  "student_ballots",
  {
    id: serial("id").primaryKey(),
    schedule_id: integer("schedule_id")
      .notNull()
      .references(() => StudentEvaluationSchedules.id),
    course_offering_id: integer("course_offering_id")
      .notNull()
      .references(() => CourseOfferings.id),
    set_rating: decimal("set_rating", { precision: 5, scale: 2 }).notNull(),
    comment: text("comment"),
    comment_score: decimal("comment_score", { precision: 5, scale: 2 }),
    comment_sentiment: SentimentClassificationEnum("comment_sentiment"),
    cast_at: timestamp("cast_at").notNull().defaultNow(),
  },
  (t) => [index("idx_ballots_offering_schedule").on(t.course_offering_id, t.schedule_id)],
);

export const StudentBallotRatings = pgTable(
  "student_ballot_ratings",
  {
    id: serial("id").primaryKey(),
    ballot_id: integer("ballot_id")
      .notNull()
      .references(() => StudentBallots.id, { onDelete: "cascade" }),
    question_id: integer("question_id")
      .notNull()
      .references(() => StudentEvaluationQuestions.id),
    rating: integer("rating").notNull(),
  },
  (t) => [
    index("idx_ballot_ratings_ballot").on(t.ballot_id),
    index("idx_ballot_ratings_question").on(t.question_id),
    uniqueIndex("uidx_unique_ballot_question_rating").on(t.ballot_id, t.question_id),
  ],
);

export const StudentEvaluations = pgTable(
  "student_evaluations",
  {
    id: serial("id").primaryKey(),
    schedule_id: integer("schedule_id")
      .notNull()
      .references(() => StudentEvaluationSchedules.id),
    student_class_id: integer("student_class_id")
      .notNull()
      .references(() => StudentClasses.id),
    comment: text("comment"),
    comment_score: decimal("comment_score", { precision: 5, scale: 2 }),
    comment_sentiment: SentimentClassificationEnum("comment_sentiment"),
    set_rating: decimal("set_rating", { precision: 5, scale: 2 }),
    submitted_at: timestamp("submitted_at"),
  },
  (t) => [
    index("idx_student_eval_schedule_id").on(t.schedule_id),
    index("idx_student_eval_student_class_id").on(t.student_class_id),
    uniqueIndex("uidx_unique_student_submission").on(t.schedule_id, t.student_class_id),
  ],
);

export const StudentEvaluationRatings = pgTable(
  "student_evaluation_ratings",
  {
    id: serial("id").primaryKey(),
    evaluation_id: integer("evaluation_id")
      .notNull()
      .references(() => StudentEvaluations.id, { onDelete: "cascade" }),
    question_id: integer("question_id")
      .notNull()
      .references(() => StudentEvaluationQuestions.id),
    rating: integer("rating").notNull(),
  },
  (t) => [
    index("idx_student_eval_ratings_evaluation_id").on(t.evaluation_id),
    index("idx_student_eval_ratings_question_id").on(t.question_id),
  ],
);

// ── 6. Supervisor Evaluations (SEF remains unchanged as it is not an anonymous secret ballot) ──
export const SupervisorEvaluations = pgTable(
  "supervisor_evaluations",
  {
    id: serial("id").primaryKey(),
    schedule_id: integer("schedule_id")
      .notNull()
      .references(() => SupervisorEvaluationSchedules.id),
    evaluator_id: integer("evaluator_id")
      .notNull()
      .references(() => Accounts.id),
    faculty_id: integer("faculty_id")
      .notNull()
      .references(() => Accounts.id),
    comment: text("comment"),
    comment_score: decimal("comment_score", { precision: 5, scale: 2 }),
    comment_sentiment: SentimentClassificationEnum("comment_sentiment"),
    set_rating: decimal("set_rating", { precision: 5, scale: 2 }),
    submitted_at: timestamp("submitted_at"),
  },
  (t) => [
    index("idx_supervisor_eval_schedule_id").on(t.schedule_id),
    index("idx_supervisor_eval_evaluator_id").on(t.evaluator_id),
    index("idx_supervisor_eval_faculty_id").on(t.faculty_id),
    uniqueIndex("uidx_unique_supervisor_submission").on(
      t.schedule_id,
      t.evaluator_id,
      t.faculty_id,
    ),
  ],
);

export const SupervisorEvaluationRatings = pgTable(
  "supervisor_evaluation_ratings",
  {
    id: serial("id").primaryKey(),
    evaluation_id: integer("evaluation_id")
      .notNull()
      .references(() => SupervisorEvaluations.id, { onDelete: "cascade" }),
    question_id: integer("question_id")
      .notNull()
      .references(() => SupervisorEvaluationQuestions.id),
    rating: integer("rating").notNull(),
  },
  (t) => [
    index("idx_supervisor_eval_ratings_evaluation_id").on(t.evaluation_id),
    index("idx_supervisor_eval_ratings_question_id").on(t.question_id),
    uniqueIndex("uidx_unique_supervisor_question_rating").on(t.evaluation_id, t.question_id),
  ],
);
