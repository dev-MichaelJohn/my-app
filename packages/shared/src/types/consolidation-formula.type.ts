export interface ClassConsolidationInput {
  seq: number;
  offeringId: number;
  courseCode: string;
  courseName: string;
  yearSection: string;
  programId?: number | null | undefined;
  programCode?: string | null | undefined;
  collegeId?: number | null | undefined;
  collegeCode?: string | null | undefined;
  noOfStudents: number | null | undefined;
  averageSetRating: number;
  weightedScore: number;
}

export interface ConsolidationContext {
  classes: ClassConsolidationInput[];
  totalStudents: number;
  totalWeightedScore: number;
}

export type ConsolidationCalculator = (ctx: ConsolidationContext) => number;

export interface ConsolidationFormulaDefinition {
  id: string;
  name: string;
  description: string;
  formulaDisplay: string;
  calculate: ConsolidationCalculator;
}

export const CONSOLIDATION_FORMULAS: Record<string, ConsolidationFormulaDefinition> = {
  ANNEX_C_WEIGHTED: {
    id: "ANNEX_C_WEIGHTED",
    name: "Annex C: Weighted by Student Population",
    description: "Divides Total Weighted SET Score by Total Number of Students across all classes",
    formulaDisplay: "Total Weighted SET Score / Total Students",
    calculate: ({ totalStudents, totalWeightedScore }) => {
      if (totalStudents <= 0) return 0;
      const result = totalWeightedScore / totalStudents;
      return Number(result.toFixed(2));
    },
  },

  SIMPLE_CLASS_MEAN: {
    id: "SIMPLE_CLASS_MEAN",
    name: "Simple Unweighted Class Average",
    description: "Averages the SET rating of all classes equally regardless of class size",
    formulaDisplay: "Sum of Class Averages / Number of Classes",
    calculate: ({ classes }) => {
      if (classes.length === 0) return 0;
      const sum = classes.reduce((acc, c: ClassConsolidationInput) => acc + c.averageSetRating, 0);
      return Number((sum / classes.length).toFixed(2));
    },
  },
};

export const DEFAULT_CONSOLIDATION_FORMULA = "ANNEX_C_WEIGHTED";

export const getConsolidationFormulaById = (id?: string | null): ConsolidationFormulaDefinition => {
  if (id && CONSOLIDATION_FORMULAS[id]) {
    return CONSOLIDATION_FORMULAS[id]!;
  }
  return CONSOLIDATION_FORMULAS[DEFAULT_CONSOLIDATION_FORMULA]!;
};
