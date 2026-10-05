import {
  decimal,
  index,
  integer,
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
import { StudentClasses } from "./institution.schema.js";
import { Accounts } from "./auth.schema.js";

export const SentimentClassificationEnum = pgEnum("sentiment_classification", [
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
  "MIXED",
]);

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
    comment_score: decimal("comment_score", { precision: 5, scale: 2 }), // Normalized polarity (-1.00 to 1.00)
    comment_sentiment: SentimentClassificationEnum("comment_sentiment"), // POSITIVE | NEUTRAL | NEGATIVE | MIXED
    set_rating: decimal("set_rating", { precision: 5, scale: 2 }), // Computed Rating Mean
    submitted_at: timestamp("submitted_at"), // NULL = Draft
  },
  (t) => [
    index("idx_student_eval_schedule_id").on(t.schedule_id),
    index("idx_student_eval_student_class_id").on(t.student_class_id),
    index("idx_student_eval_sentiment").on(t.comment_sentiment),
    uniqueIndex("uidx_unique_student_submission").on(t.schedule_id, t.student_class_id),
    index("idx_student_eval_submitted").on(t.student_class_id, t.submitted_at),
    index("idx_student_eval_schedule_submitted").on(t.schedule_id, t.submitted_at),
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
    uniqueIndex("uidx_unique_student_question_rating").on(t.evaluation_id, t.question_id),
  ],
);

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
    comment_score: decimal("comment_score", { precision: 5, scale: 2 }), // Normalized polarity (-1.00 to 1.00)
    comment_sentiment: SentimentClassificationEnum("comment_sentiment"), // POSITIVE | NEUTRAL | NEGATIVE | MIXED
    set_rating: decimal("set_rating", { precision: 5, scale: 2 }), // Computed Rating Mean
    submitted_at: timestamp("submitted_at"), // NULL = Draft
  },
  (t) => [
    index("idx_supervisor_eval_schedule_id").on(t.schedule_id),
    index("idx_supervisor_eval_evaluator_id").on(t.evaluator_id),
    index("idx_supervisor_eval_faculty_id").on(t.faculty_id),
    index("idx_supervisor_eval_sentiment").on(t.comment_sentiment),
    uniqueIndex("uidx_unique_supervisor_submission").on(
      t.schedule_id,
      t.evaluator_id,
      t.faculty_id,
    ),
    index("idx_supervisor_eval_offering_submitted").on(t.faculty_id, t.submitted_at),
    index("idx_supervisor_eval_evaluator_schedule").on(t.evaluator_id, t.schedule_id),
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
