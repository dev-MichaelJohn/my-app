export interface RatingContext {
  ratings: { question_id: number; rating: number; max_rating?: number }[];
  totalScore: number;
  questionCount: number;
  maxPossibleScore: number;
  minRating: number;
  maxRating: number;
}

export type FormulaCalculator = (ctx: RatingContext) => number;

export interface FormulaDefinition {
  id: string;
  name: string;
  description: string;
  formulaDisplay: string;
  calculate: FormulaCalculator;
}

/**
 * PLUG-AND-PLAY FORMULA REGISTRY
 * To add a new formula in the future, simply add a new entry here
 */
export const EVALUATION_FORMULAS: Record<string, FormulaDefinition> = {
  PERCENTAGE_75: {
    id: "PERCENTAGE_75",
    name: "CHED CMO 19 S. 2025",
    description: "CHED Formula: scales total score against 75 points to 100%",
    formulaDisplay: "(Total Score / 75) × 100",
    calculate: ({ totalScore, maxPossibleScore }) => {
      if (totalScore <= 0) return 0;
      const divisor = maxPossibleScore > 0 ? maxPossibleScore : 75;
      const result = (totalScore / divisor) * 100;
      return Number(Math.min(100, Math.max(0, result)).toFixed(2));
    },
  },

  PERCENTAGE_MAX_POSSIBLE: {
    id: "PERCENTAGE_MAX_POSSIBLE",
    name: "Percentage of Max Possible Score",
    description:
      "Scales total score against the dynamic maximum possible score of all questions to 100%",
    formulaDisplay: "(Total Score / Max Possible) × 100",
    calculate: ({ totalScore, maxPossibleScore }) => {
      if (maxPossibleScore <= 0 || totalScore <= 0) return 0;
      const result = (totalScore / maxPossibleScore) * 100;
      return Number(Math.min(100, Math.max(0, result)).toFixed(2));
    },
  },

  SIMPLE_MEAN: {
    id: "SIMPLE_MEAN",
    name: "Arithmetic Mean (Average)",
    description: "Standard average score ranging from min_rating to max_rating",
    formulaDisplay: "Total Score / Number of Questions",
    calculate: ({ totalScore, questionCount }) => {
      if (questionCount <= 0) return 0;
      const result = totalScore / questionCount;
      return Number(result.toFixed(2));
    },
  },
};

export const DEFAULT_FORMULA_ID = "PERCENTAGE_75";

export const getFormulaById = (id?: string | null): FormulaDefinition => {
  if (id && EVALUATION_FORMULAS[id]) {
    return EVALUATION_FORMULAS[id]!;
  }
  return EVALUATION_FORMULAS[DEFAULT_FORMULA_ID]!;
};
