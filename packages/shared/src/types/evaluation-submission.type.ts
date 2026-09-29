import { z } from "zod";
import type { GetOffering } from "./offering.type.js";
import type {
  GetStudentEvaluationForm,
  GetSupervisorEvaluationForm,
} from "./evaluation-instrument.type.js";

// ── Rating Submission Payload ──
export const EvaluationRatingItemSchema = z.object({
  question_id: z.number().int().positive("Question ID is required."),
  rating: z.number().int().min(1, "Rating must be at least 1."),
});

export const SubmitStudentEvaluationSchema = z.object({
  schedule_id: z.number().int().positive("Schedule ID is required."),
  student_class_id: z.number().int().positive("Student class enrollment ID is required."),
  ratings: z.array(EvaluationRatingItemSchema).min(1, "At least one rating is required."),
  comment: z.string().trim().max(1000, "Comment cannot exceed 1000 characters.").optional(),
  is_draft: z.boolean().default(false),
});

export const SubmitSupervisorEvaluationSchema = z.object({
  schedule_id: z.number().int().positive("Schedule ID is required."),
  course_offering_id: z.number().int().positive("Course offering ID is required."),
  ratings: z.array(EvaluationRatingItemSchema).min(1, "At least one rating is required."),
  comment: z.string().trim().max(1000, "Comment cannot exceed 1000 characters.").optional(),
  is_draft: z.boolean().default(false),
});

export type SubmitStudentEvaluation = z.infer<typeof SubmitStudentEvaluationSchema>;
export type SubmitSupervisorEvaluation = z.infer<typeof SubmitSupervisorEvaluationSchema>;

// ── Evaluable Item Models ──
export interface EvaluableStudentSubject {
  student_class_id: number;
  offering: GetOffering;
  has_submitted: boolean;
  is_draft: boolean;
  submitted_at: Date | string | null;
  computed_rating: number | null;
  evaluation_id: number | null;
}

export interface EvaluableSupervisorOffering {
  offering: GetOffering;
  has_submitted: boolean;
  is_draft: boolean;
  submitted_at: Date | string | null;
  computed_rating: number | null;
  evaluation_id: number | null;
}

export interface StudentEvaluationFormView {
  schedule_id: number;
  student_class_id: number;
  form: GetStudentEvaluationForm;
  offering: GetOffering;
  saved_ratings: Record<number, number>;
  saved_comment: string | null;
  is_submitted: boolean;
  submitted_at: Date | string | null;
}

export interface SupervisorEvaluationFormView {
  schedule_id: number;
  course_offering_id: number;
  form: GetSupervisorEvaluationForm;
  offering: GetOffering;
  saved_ratings: Record<number, number>;
  saved_comment: string | null;
  is_submitted: boolean;
  submitted_at: Date | string | null;
}
