import { z } from "zod";

export const AnalyticsScopeEnum = z.enum(["INSTITUTION", "COLLEGE", "PROGRAM", "SELF"]);
export type AnalyticsScope = z.infer<typeof AnalyticsScopeEnum>;

export const AnalyticsQuerySchema = z.object({
  scope: AnalyticsScopeEnum.default("INSTITUTION"),
  semesterId: z.coerce.number().int().positive().optional(),
  collegeId: z.coerce.number().int().positive().optional(),
  programId: z.coerce.number().int().positive().optional(),
  facultyId: z.coerce.number().int().positive().optional(),
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

export interface LongitudinalPoint {
  semesterId: number;
  semesterTerm: string;
  schoolYear: string;
  setRating: number;
  sefRating: number | null;
  benchmarkSetRating: number;
  benchmarkSefRating: number | null;
  totalRespondents: number;
  totalFaculty: number;
}

export interface DomainCompetencyMetric {
  categoryName: string;
  setScore: number;
  sefScore: number | null;
  institutionBenchmark: number;
  deltaFromBenchmark: number;
  perceptionGap: number | null;
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

export interface EntityBarComparison {
  entityId: number;
  entityName: string;
  entityCode: string;
  setRating: number;
  sefRating: number | null;
  perceptionGap: number | null;
  totalFaculty: number;
  totalEvaluations: number;
  rank?: number | undefined;
  ratingDistribution: {
    outstanding: number;
    verySatisfactory: number;
    satisfactory: number;
    fair: number;
    poor: number;
  };
}

export interface ComprehensiveAnalyticsReport {
  scope: AnalyticsScope;
  scopeEntityId?: number | null | undefined;
  scopeEntityName?: string | undefined;
  activeSemester: {
    id: number;
    term: string;
    schoolYear: string;
  };
  kpis: {
    overallSet: number;
    overallSef: number | null;
    perceptionGap: number | null;
    setChangePercentage: number;
    sefChangePercentage: number;
    totalEvaluations: number;
    totalFacultyEvaluated: number;
    satisfactionRate: number;
  };
  historicalTrends: LongitudinalPoint[];
  domainCompetencies: DomainCompetencyMetric[];
  diagnostics: {
    topIndicators: IndicatorDiagnosis[];
    lowestIndicators: IndicatorDiagnosis[];
  };
  comparisons: EntityBarComparison[];
}
