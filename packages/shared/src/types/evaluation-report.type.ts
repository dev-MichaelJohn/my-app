import { z } from "zod";
import type { ClassConsolidationInput } from "./consolidation-formula.type.js";

export type ReportStatus = "DRAFT" | "FINALIZED" | "PUBLISHED";

export interface AnonymousFeedbackComment {
  comment: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  score: number;
}

export interface SupervisorFeedbackComment {
  evaluator_name: string;
  evaluator_role: string;
  comment: string;
  submitted_at: string;
}

export interface FedafPlan {
  areas_for_improvement: string;
  proposed_activities: string;
  action_plan: string;
  supervisor_name: string;
  supervisor_signed_at: string | null;
  faculty_signed_at: string | null;
}

// ── Analytics Models (Dynamic Scale Bounds & Length) ──
export interface CategoryAnalytics {
  categoryId: number;
  categoryName: string;
  order: number;
  averageRating: number;
  totalResponses: number;
  percentageScore: number;
  qualitativeInterpretation: string;
  maxRating?: number | undefined;
}

export interface IndicatorAnalytics {
  questionId: number;
  categoryId: number;
  categoryName: string;
  order: number;
  indicatorText: string;
  averageRating: number;
  totalResponses: number;
  ratingDistribution: Record<number, number>; // Dynamic keys from minRating to maxRating
  qualitativeInterpretation: string;
  minRating?: number | undefined;
  maxRating?: number | undefined;
  means?: string[] | undefined; // Suggested MOVs for SEF
}

export interface EvaluationAnalyticsSummary {
  highestIndicators: {
    questionId: number;
    indicatorText: string;
    categoryName: string;
    type: "SET" | "SEF";
    averageRating: number;
  }[];
  lowestIndicators: {
    questionId: number;
    indicatorText: string;
    categoryName: string;
    type: "SET" | "SEF";
    averageRating: number;
  }[];
  categoryComparison: {
    categoryName: string;
    setAverage: number | null;
    sefAverage: number | null;
    gap: number | null; // sef - set difference
  }[];
}

export interface AnnexCFacultyReport {
  id: number;
  faculty_id: number;
  semester_id: number;
  faculty_name: string;
  faculty_rank: string;
  department_college: string;
  college_id?: number | null | undefined;
  college_name?: string | null | undefined;
  college_code?: string | null | undefined;
  program_id?: number | null | undefined;
  program_name?: string | null | undefined;
  program_code?: string | null | undefined;
  semester_term: string;
  school_year: string;
  overall_set_rating: number;
  overall_sef_rating: number | null;
  min_rating?: number | null | undefined;
  max_rating?: number | null | undefined;
  total_students_evaluated: number;
  total_classes: number;
  total_weighted_score: number;
  calculation_formula: string;
  class_breakdown: ClassConsolidationInput[];
  student_comments: AnonymousFeedbackComment[];
  supervisor_comments: SupervisorFeedbackComment[];

  // Granular analytics
  set_category_analytics: CategoryAnalytics[];
  set_indicator_analytics: IndicatorAnalytics[];
  sef_category_analytics: CategoryAnalytics[];
  sef_indicator_analytics: IndicatorAnalytics[];
  analytics_summary: EvaluationAnalyticsSummary;

  fedaf_plan: FedafPlan;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export const GenerateReportQuerySchema = z.object({
  faculty_id: z.coerce.number().int().positive().optional(),
  semester_id: z.coerce.number().int().positive("Semester ID is required."),
  formula: z.string().default("ANNEX_C_WEIGHTED"),
});

export const RecalculateReportSchema = z.object({
  semester_id: z.coerce.number().int().positive("Semester ID is required."),
  faculty_id: z.coerce.number().int().positive().optional(),
  formula: z.string().default("ANNEX_C_WEIGHTED"),
});

export const UpdateReportStatusSchema = z.object({
  status: z.enum(["DRAFT", "FINALIZED", "PUBLISHED"]),
});

export const UpdateFedafPlanSchema = z.object({
  areas_for_improvement: z.string().max(3000).default(""),
  proposed_activities: z.string().max(3000).default(""),
  action_plan: z.string().max(3000).default(""),
});

export const SignFedafSchema = z.object({
  signatureRole: z.enum(["FACULTY", "SUPERVISOR"]),
});

export const FacultyReportQuerySchema = z.object({
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
  faculty_id: z.coerce.number().int().positive().optional(),
  college_id: z.coerce.number().int().positive().optional(),
  program_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["DRAFT", "FINALIZED", "PUBLISHED"]).optional(),
  sort_by: z
    .enum(["created_at", "faculty_name", "overall_set_rating", "status"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export interface BatchConsolidationSummary {
  semester_id: number;
  semester_term: string;
  school_year: string;
  total_faculty_processed: number;
  reports_generated: number;
  calculation_formula: string;
  processed_at: string;
  message: string;
}

export const BatchConsolidationSchema = z.object({
  semester_id: z.coerce.number().int().positive("Semester ID is required."),
  formula: z.string().default("ANNEX_C_WEIGHTED"),
});

export interface InstitutionalFERReport {
  semester_id: number;
  semester_term: string;
  school_year: string;
  total_faculty_evaluated: number;
  average_institution_set: number;
  average_institution_sef: number;
  college_breakdown: {
    college_id: number;
    college_name: string;
    college_code: string;
    total_faculty: number;
    average_set: number;
    average_sef: number;
  }[];
  rating_distribution: {
    outstanding: number;
    very_satisfactory: number;
    satisfactory: number;
    fair: number;
    poor: number;
  };
}

export type RecalculateReport = z.infer<typeof RecalculateReportSchema>;
export type UpdateReportStatus = z.infer<typeof UpdateReportStatusSchema>;
export type UpdateFedafPlan = z.infer<typeof UpdateFedafPlanSchema>;
export type SignFedaf = z.infer<typeof SignFedafSchema>;
export type FacultyReportQuery = z.infer<typeof FacultyReportQuerySchema>;
