import { z } from "zod";
import type { ClassConsolidationInput } from "./consolidation-formula.type.js";

export interface AnonymousFeedbackComment {
  comment: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  score: number;
}

export interface AnnexCFacultyReport {
  id: number;
  faculty_id: number;
  semester_id: number;
  faculty_name: string;
  faculty_rank: string;
  department_college: string;
  semester_term: string;
  school_year: string;
  overall_set_rating: number;
  overall_sef_rating: number | null;
  total_students_evaluated: number;
  total_classes: number;
  total_weighted_score: number;
  calculation_formula: string;
  class_breakdown: ClassConsolidationInput[];
  top_comments: AnonymousFeedbackComment[];
  status: "DRAFT" | "FINALIZED" | "PUBLISHED";
  created_at: string;
  updated_at: string;
}

export const GenerateReportQuerySchema = z.object({
  faculty_id: z.coerce.number().int().positive().optional(),
  semester_id: z.coerce.number().int().positive().optional(),
  formula: z.string().default("ANNEX_C_WEIGHTED"),
});
