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
  faculty_id: z.number().int().positive("Faculty ID is required."),
  ratings: z.array(EvaluationRatingItemSchema).min(1, "At least one rating is required."),
  comment: z.string().trim().max(1000, "Comment cannot exceed 1000 characters.").optional(),
  is_draft: z.boolean().default(false),
});

export type SubmitStudentEvaluation = z.infer<typeof SubmitStudentEvaluationSchema>;
export type SubmitSupervisorEvaluation = z.infer<typeof SubmitSupervisorEvaluationSchema>;

// ── Sentiment Analysis Models ──
export type SentimentClassification = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";

export interface AspectBreakdown {
  aspect: "PEDAGOGY" | "PUNCTUALITY" | "GRADING" | "ATTITUDE" | "WORKLOAD";
  score: number;
  classification: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
}

export interface SentimentAnalysisResult {
  score: number; // Normalized score strictly between -1.00 and 1.00 (fits decimal(5, 2))
  rawScore: number;
  comparative: number;
  classification: SentimentClassification;
  primaryAspects: AspectBreakdown[];
  detectedIdioms: string[];
  positiveWords: string[];
  negativeWords: string[];
  summary: string;
}

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

export interface TeachingStudentItem {
  student_account_id: number;
  institutional_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  suffix: string | null;
  email: string;
  has_evaluated: boolean; // 🔒 Status only! Anonymity preserved (scores & comments hidden)
  evaluated_at: Date | string | null;
}

export interface FacultyTeachingOffering {
  offering: GetOffering;
  total_students: number;
  total_evaluated: number;
  completion_rate: number; // e.g. 85.5%
  students: TeachingStudentItem[];
}
