import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import z from "zod";
import {
  StudentEvaluationForms,
  StudentEvaluationCategories,
  StudentEvaluationQuestions,
  SupervisorEvaluationForms,
  SupervisorEvaluationCategories,
  SupervisorEvaluationQuestions,
  SupervisorEvaluationMeans,
} from "../schemas/evaluation-instrument.schema.js";
import { DEFAULT_FORMULA_ID } from "./evaluation-formula.type.js";

export const StudentEvalFormSelect = createSelectSchema(StudentEvaluationForms);

export const StudentEvalFormInsert = createInsertSchema(StudentEvaluationForms, {
  title: (s) => s.trim().min(3, "Form title must be at least 3 characters."),
  min_rating: (s) => s.int().min(1),
  max_rating: (s) => s.int().min(2),
  calculation_formula: z.string().default(DEFAULT_FORMULA_ID),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const StudentEvalFormUpdate = createUpdateSchema(StudentEvaluationForms, {
  title: (s) => s.trim().min(3, "Form title must be at least 3 characters."),
  min_rating: (s) => s.int().min(1),
  max_rating: (s) => s.int().min(2),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const StudentEvalCategorySelect = createSelectSchema(StudentEvaluationCategories);

export const StudentEvalCategoryInsert = createInsertSchema(StudentEvaluationCategories, {
  name: (s) => s.trim().min(2, "Category name is required."),
  order: (s) => s.int().min(1),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const StudentEvalCategoryUpdate = createUpdateSchema(StudentEvaluationCategories, {
  name: (s) => s.trim().min(2, "Category name is required."),
  order: (s) => s.int().min(1),
}).omit({ id: true, form_id: true, created_at: true, updated_at: true, deleted_at: true });

export const StudentEvalQuestionSelect = createSelectSchema(StudentEvaluationQuestions);

export const StudentEvalQuestionInsert = createInsertSchema(StudentEvaluationQuestions, {
  question: (s) => s.trim().min(5, "Question text is required."),
  max_rating: (s) => s.int().min(2),
  order: (s) => s.int().min(1),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const StudentEvalQuestionUpdate = createUpdateSchema(StudentEvaluationQuestions, {
  question: (s) => s.trim().min(5, "Question text is required."),
  max_rating: (s) => s.int().min(2),
  order: (s) => s.int().min(1),
}).omit({ id: true, category_id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalFormSelect = createSelectSchema(SupervisorEvaluationForms);

export const SupervisorEvalFormInsert = createInsertSchema(SupervisorEvaluationForms, {
  title: (s) => s.trim().min(3, "Form title must be at least 3 characters."),
  min_rating: (s) => s.int().min(1),
  max_rating: (s) => s.int().min(2),
  calculation_formula: z.string().default(DEFAULT_FORMULA_ID),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalFormUpdate = createUpdateSchema(SupervisorEvaluationForms, {
  title: (s) => s.trim().min(3, "Form title must be at least 3 characters."),
  min_rating: (s) => s.int().min(1),
  max_rating: (s) => s.int().min(2),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalCategorySelect = createSelectSchema(SupervisorEvaluationCategories);

export const SupervisorEvalCategoryInsert = createInsertSchema(SupervisorEvaluationCategories, {
  name: (s) => s.trim().min(2, "Category name is required."),
  order: (s) => s.int().min(1),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalCategoryUpdate = createUpdateSchema(SupervisorEvaluationCategories, {
  name: (s) => s.trim().min(2, "Category name is required."),
  order: (s) => s.int().min(1),
}).omit({ id: true, form_id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalQuestionSelect = createSelectSchema(SupervisorEvaluationQuestions);

export const SupervisorEvalQuestionInsert = createInsertSchema(SupervisorEvaluationQuestions, {
  question: (s) => s.trim().min(5, "Question text is required."),
  max_rating: (s) => s.int().min(2),
  order: (s) => s.int().min(1),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalQuestionUpdate = createUpdateSchema(SupervisorEvaluationQuestions, {
  question: (s) => s.trim().min(5, "Question text is required."),
  max_rating: (s) => s.int().min(2),
  order: (s) => s.int().min(1),
}).omit({ id: true, category_id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalMeansSelect = createSelectSchema(SupervisorEvaluationMeans);

export const SupervisorEvalMeansInsert = createInsertSchema(SupervisorEvaluationMeans, {
  descriptor: (s) => s.trim().min(3, "Descriptor is required."),
  order: (s) => s.int().min(1),
}).omit({ id: true, created_at: true, updated_at: true, deleted_at: true });

export const SupervisorEvalMeansUpdate = createUpdateSchema(SupervisorEvaluationMeans, {
  descriptor: (s) => s.trim().min(3, "Descriptor is required."),
  order: (s) => s.int().min(1),
}).omit({ id: true, question_id: true, created_at: true, updated_at: true, deleted_at: true });

export type IStudentEvalFormSelect = z.infer<typeof StudentEvalFormSelect>;
export type IStudentEvalFormInsert = z.infer<typeof StudentEvalFormInsert>;
export type IStudentEvalFormUpdate = z.infer<typeof StudentEvalFormUpdate>;

export type IStudentEvalCategorySelect = z.infer<typeof StudentEvalCategorySelect>;
export type IStudentEvalCategoryInsert = z.infer<typeof StudentEvalCategoryInsert>;
export type IStudentEvalCategoryUpdate = z.infer<typeof StudentEvalCategoryUpdate>;

export type IStudentEvalQuestionSelect = z.infer<typeof StudentEvalQuestionSelect>;
export type IStudentEvalQuestionInsert = z.infer<typeof StudentEvalQuestionInsert>;
export type IStudentEvalQuestionUpdate = z.infer<typeof StudentEvalQuestionUpdate>;

export type ISupervisorEvalFormSelect = z.infer<typeof SupervisorEvalFormSelect>;
export type ISupervisorEvalFormInsert = z.infer<typeof SupervisorEvalFormInsert>;
export type ISupervisorEvalFormUpdate = z.infer<typeof SupervisorEvalFormUpdate>;

export type ISupervisorEvalCategorySelect = z.infer<typeof SupervisorEvalCategorySelect>;
export type ISupervisorEvalCategoryInsert = z.infer<typeof SupervisorEvalCategoryInsert>;
export type ISupervisorEvalCategoryUpdate = z.infer<typeof SupervisorEvalCategoryUpdate>;

export type ISupervisorEvalQuestionSelect = z.infer<typeof SupervisorEvalQuestionSelect>;
export type ISupervisorEvalQuestionInsert = z.infer<typeof SupervisorEvalQuestionInsert>;
export type ISupervisorEvalQuestionUpdate = z.infer<typeof SupervisorEvalQuestionUpdate>;

export type ISupervisorEvalMeansSelect = z.infer<typeof SupervisorEvalMeansSelect>;
export type ISupervisorEvalMeansInsert = z.infer<typeof SupervisorEvalMeansInsert>;
export type ISupervisorEvalMeansUpdate = z.infer<typeof SupervisorEvalMeansUpdate>;

export const GetStudentEvaluationFormSchema = StudentEvalFormSelect.extend({
  categories: z.array(
    StudentEvalCategorySelect.extend({
      questions: z.array(StudentEvalQuestionSelect),
    }),
  ),
});

export const GetSupervisorEvaluationFormSchema = SupervisorEvalFormSelect.extend({
  categories: z.array(
    SupervisorEvalCategorySelect.extend({
      questions: z.array(
        SupervisorEvalQuestionSelect.extend({
          means: z.array(SupervisorEvalMeansSelect),
        }),
      ),
    }),
  ),
});

export const SaveStudentFormStructureSchema = z.object({
  title: z.string().trim().min(3, "Form title is required."),
  description: z.string().trim().optional(),
  min_rating: z.number().int().default(1),
  max_rating: z.number().int().default(5),
  categories: z.array(
    z.object({
      name: z.string().trim().min(2, "Category name is required."),
      description: z.string().trim().optional(),
      order: z.number().int().default(1),
      questions: z.array(
        z.object({
          question: z.string().trim().min(5, "Question is required."),
          max_rating: z.number().int().default(5),
          order: z.number().int().default(1),
        }),
      ),
    }),
  ),
});

export const SaveSupervisorFormStructureSchema = z.object({
  title: z.string().trim().min(3, "Form title is required."),
  description: z.string().trim().optional(),
  min_rating: z.number().int().default(1),
  max_rating: z.number().int().default(5),
  categories: z.array(
    z.object({
      name: z.string().trim().min(2, "Category name is required."),
      description: z.string().trim().optional(),
      order: z.number().int().default(1),
      questions: z.array(
        z.object({
          question: z.string().trim().min(5, "Question is required."),
          max_rating: z.number().int().default(5),
          order: z.number().int().default(1),
          means: z
            .array(
              z.object({
                descriptor: z.string().trim().min(3, "Descriptor is required."),
                order: z.number().int().default(1),
              }),
            )
            .default([]),
        }),
      ),
    }),
  ),
});

export const EvaluationFormQuerySchema = z.object({
  paginate: z
    .preprocess((val) => {
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return true;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  is_archived: z
    .preprocess((val) => {
      if (val === "true" || val === true || val === "1" || val === 1) return true;
      if (val === "false" || val === false || val === "0" || val === 0) return false;
      return false;
    }, z.boolean())
    .default(false),
  sort_by: z.enum(["created_at", "title"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type GetStudentEvaluationForm = z.infer<typeof GetStudentEvaluationFormSchema>;
export type SaveStudentFormStructure = z.infer<typeof SaveStudentFormStructureSchema>;
export type GetSupervisorEvaluationForm = z.infer<typeof GetSupervisorEvaluationFormSchema>;
export type SaveSupervisorFormStructure = z.infer<typeof SaveSupervisorFormStructureSchema>;
export type EvaluationFormQuery = z.infer<typeof EvaluationFormQuerySchema>;
