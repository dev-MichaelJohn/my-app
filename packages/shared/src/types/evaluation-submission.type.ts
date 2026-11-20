import { z } from "zod";
import type { GetOffering } from "./offering.type.js";
import type { GetUser } from "./user.type.js";
import type {
  GetStudentEvaluationForm,
  GetSupervisorEvaluationForm,
} from "./evaluation-instrument.type.js";

export const EvaluationRatingItemSchema = z.object({
  question_id: z.number().int().positive("Question ID is required."),
  rating: z.number().int().min(1, "Rating must be at least 1."),
});

export const SubmitStudentEvaluationSchema = z.object({
  schedule_id: z.number().int().positive("Schedule ID is required."),
  offering_student_id: z.number().int().positive("Offering student enrollment ID is required."),
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

export type SentimentClassification = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";

export interface AspectBreakdown {
  aspect: "PEDAGOGY" | "PUNCTUALITY" | "GRADING" | "ATTITUDE" | "WORKLOAD";
  score: number;
  classification: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
}

export interface SentimentAnalysisResult {
  score: number;
  rawScore: number;
  comparative: number;
  classification: SentimentClassification;
  primaryAspects: AspectBreakdown[];
  detectedIdioms: string[];
  positiveWords: string[];
  negativeWords: string[];
  summary: string;
}

export interface EvaluableStudentSubject {
  offering_student_id: number;
  offering: GetOffering;
  has_submitted: boolean;
  is_draft: boolean;
  submitted_at: Date | string | null;
  computed_rating: number | null;
  evaluation_id: number | null;
}

export interface SupervisorTeachingLoadItem {
  offering_id: number;
  course_code: string;
  course_name: string;
  course_type: "PROFESSIONAL" | "GENERAL_EDUCATION";
  year_level: string;
  section: string;
  program_code: string;
}

export interface EvaluableSupervisorFaculty {
  faculty: GetUser;
  has_submitted: boolean;
  is_draft: boolean;
  submitted_at: Date | string | null;
  computed_rating: number | null;
  evaluation_id: number | null;
  teaching_classes: SupervisorTeachingLoadItem[];
}

export interface StudentEvaluationFormView {
  schedule_id: number;
  offering_student_id: number;
  form: GetStudentEvaluationForm;
  offering: GetOffering;
  saved_ratings: Record<number, number>;
  saved_comment: string | null;
  is_submitted: boolean;
  submitted_at: Date | string | null;
}

export interface SupervisorEvaluationFormView {
  schedule_id: number;
  faculty_id: number;
  faculty: GetUser;
  teaching_classes: SupervisorTeachingLoadItem[];
  form: GetSupervisorEvaluationForm;
  saved_ratings: Record<number, number>;
  saved_comment: string | null;
  is_submitted: boolean;
  submitted_at: Date | string | null;
}

export interface TeachingStudentItem {
  offering_student_id: number;
  student_account_id: number;
  institutional_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  suffix: string | null;
  email: string;
  has_evaluated: boolean;
  evaluated_at: Date | string | null;
}

export interface FacultyTeachingOffering {
  offering: GetOffering;
  total_students: number;
  total_evaluated: number;
  completion_rate: number;
  students: TeachingStudentItem[];
}
