import { z } from "zod";

export const AnalyticsScopeEnum = z.enum(["INSTITUTION", "COLLEGE", "PROGRAM", "SELF"]);
export type AnalyticsScope = z.infer<typeof AnalyticsScopeEnum>;

export const AnalyticsQuerySchema = z.object({
  scope: AnalyticsScopeEnum.default("INSTITUTION"),
  semesterId: z.coerce.number().int().positive().optional(),
  entityId: z.coerce.number().int().positive().optional(), // collegeId for COLLEGE, programId for PROGRAM, facultyId for SELF
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

export interface LongitudinalPoint {
  semesterId: number;
  semesterTerm: string;
  schoolYear: string;
  setRating: number;
  sefRating: number | null;
  benchmarkSetRating: number; // Institutional benchmark for comparison
  totalRespondents: number;
}

export interface DomainCompetencyMetric {
  categoryName: string;
  score: number;
  institutionBenchmark: number;
  deltaFromBenchmark: number;
}

export interface IndicatorDiagnosis {
  indicatorId: number;
  indicatorCode: string;
  questionText: string;
  categoryName: string;
  averageRating: number;
  benchmarkRating: number;
  delta: number;
}

export interface EntityComparisonRow {
  entityId: number;
  entityName: string;
  entityCode: string;
  setRating: number;
  sefRating: number | null;
  totalFaculty: number;
  totalEvaluations: number;
  variance: number;
  ratingDistribution: {
    outstanding: number; // 4.50 - 5.00
    verySatisfactory: number; // 3.50 - 4.49
    satisfactory: number; // 2.50 - 3.49
    fair: number; // 1.50 - 2.49
    poor: number; // 1.00 - 1.49
  };
}

export interface ComprehensiveAnalyticsReport {
  scope: AnalyticsScope;
  scopeEntityId?: number | null;
  scopeEntityName?: string;
  activeSemester: {
    id: number;
    term: string;
    schoolYear: string;
  };
  kpis: {
    overallSet: number;
    overallSef: number | null;
    sefSetVariance: number | null;
    setChangePercentage: number; // % change vs previous semester
    totalEvaluations: number;
    totalFacultyEvaluated: number;
    satisfactionRate: number; // % of evaluations >= 3.50 (Very Satisfactory or higher)
  };
  historicalTrends: LongitudinalPoint[];
  domainCompetencies: DomainCompetencyMetric[];
  diagnostics: {
    topIndicators: IndicatorDiagnosis[];
    lowestIndicators: IndicatorDiagnosis[];
  };
  breakdown: EntityComparisonRow[];
}
