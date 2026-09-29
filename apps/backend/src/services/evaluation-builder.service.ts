import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { type ResultAsync } from "neverthrow";
import db from "@/configs/db.config.js";
import {
  StudentEvaluationCategories,
  StudentEvaluationForms,
  StudentEvaluationQuestions,
  SupervisorEvaluationCategories,
  SupervisorEvaluationForms,
  SupervisorEvaluationMeans,
  SupervisorEvaluationQuestions,
} from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import {
  StudentEvalCategoryInsert,
  StudentEvalCategoryUpdate,
  StudentEvalQuestionInsert,
  StudentEvalQuestionUpdate,
  SupervisorEvalCategoryInsert,
  SupervisorEvalCategoryUpdate,
  SupervisorEvalMeansInsert,
  SupervisorEvalMeansUpdate,
  SupervisorEvalQuestionInsert,
  SupervisorEvalQuestionUpdate,
  type IStudentEvalCategoryInsert,
  type IStudentEvalCategorySelect,
  type IStudentEvalCategoryUpdate,
  type IStudentEvalQuestionInsert,
  type IStudentEvalQuestionSelect,
  type IStudentEvalQuestionUpdate,
  type ISupervisorEvalCategoryInsert,
  type ISupervisorEvalCategorySelect,
  type ISupervisorEvalCategoryUpdate,
  type ISupervisorEvalMeansInsert,
  type ISupervisorEvalMeansSelect,
  type ISupervisorEvalMeansUpdate,
  type ISupervisorEvalQuestionInsert,
  type ISupervisorEvalQuestionSelect,
  type ISupervisorEvalQuestionUpdate,
} from "@my-app/shared";

export interface IEvaluationBuilderService {
  addStudentCategory(
    formId: number,
    info: IStudentEvalCategoryInsert,
    client?: DbClient,
  ): ResultAsync<IStudentEvalCategorySelect, AppError>;
  updateStudentCategory(
    categoryId: number,
    info: IStudentEvalCategoryUpdate,
    client?: DbClient,
  ): ResultAsync<IStudentEvalCategorySelect, AppError>;
  deleteStudentCategory(categoryId: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreStudentCategory(
    categoryId: number,
    restoreQuestions?: boolean,
    client?: DbClient,
  ): ResultAsync<IStudentEvalCategorySelect, AppError>;

  addStudentQuestion(
    categoryId: number,
    info: IStudentEvalQuestionInsert,
    client?: DbClient,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError>;
  updateStudentQuestion(
    questionId: number,
    info: IStudentEvalQuestionUpdate,
    client?: DbClient,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError>;
  deleteStudentQuestion(questionId: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreStudentQuestion(
    questionId: number,
    client?: DbClient,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError>;

  reorderStudentQuestions(
    categoryId: number,
    orderedQuestionIds: number[],
    client?: DbClient,
  ): ResultAsync<void, AppError>;

  addSupervisorCategory(
    formId: number,
    info: ISupervisorEvalCategoryInsert,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError>;
  updateSupervisorCategory(
    categoryId: number,
    info: ISupervisorEvalCategoryUpdate,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError>;
  deleteSupervisorCategory(categoryId: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreSupervisorCategory(
    categoryId: number,
    restoreChildren?: boolean,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError>;

  addSupervisorQuestion(
    categoryId: number,
    info: ISupervisorEvalQuestionInsert,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError>;
  updateSupervisorQuestion(
    questionId: number,
    info: ISupervisorEvalQuestionUpdate,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError>;
  deleteSupervisorQuestion(questionId: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreSupervisorQuestion(
    questionId: number,
    restoreMeans?: boolean,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError>;

  addMeansDescriptor(
    questionId: number,
    info: ISupervisorEvalMeansInsert,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError>;
  updateMeansDescriptor(
    meansId: number,
    info: ISupervisorEvalMeansUpdate,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError>;
  deleteMeansDescriptor(meansId: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreMeansDescriptor(
    meansId: number,
    client: DbClient,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError>;
}

export class EvaluationBuilderService implements IEvaluationBuilderService {
  // =========================================================================
  // 1. STUDENT INSTRUMENT (SET) BUILDER
  // =========================================================================

  addStudentCategory(
    formId: number,
    info: IStudentEvalCategoryInsert,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalCategorySelect, AppError> {
    return ValidateSchema(StudentEvalCategoryInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        // A. Verify parent form is active
        const [form] = await tx
          .select({ id: StudentEvaluationForms.id })
          .from(StudentEvaluationForms)
          .where(
            and(eq(StudentEvaluationForms.id, formId), isNull(StudentEvaluationForms.deleted_at)),
          );

        if (!form) throw new AppError(404, "Parent evaluation form was not found or is archived.");

        // B. Check for existing category with same name under this form
        const [existing] = await tx
          .select()
          .from(StudentEvaluationCategories)
          .where(
            and(
              eq(StudentEvaluationCategories.form_id, formId),
              eq(StudentEvaluationCategories.name, parsed.name),
            ),
          );

        if (existing) {
          if (existing.deleted_at === null) {
            throw new AppError(
              409,
              `Category "${parsed.name}" already exists in this evaluation form.`,
            );
          }

          // 🚀 Reactivate previously archived category with new details
          const [reactivated] = await tx
            .update(StudentEvaluationCategories)
            .set({
              description: parsed.description,
              order: parsed.order,
              deleted_at: null,
              updated_at: new Date(),
            })
            .where(eq(StudentEvaluationCategories.id, existing.id))
            .returning();

          if (!reactivated) throw new AppError(500, "Failed to reactivate category.");
          return reactivated;
        }

        // C. Insert brand new category
        const [created] = await tx
          .insert(StudentEvaluationCategories)
          .values({ ...parsed, form_id: formId })
          .returning();

        if (!created) throw new AppError(500, "Failed to add category.");
        return created;
      });
    });
  }

  updateStudentCategory(
    categoryId: number,
    info: IStudentEvalCategoryUpdate,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalCategorySelect, AppError> {
    return ValidateSchema(StudentEvalCategoryUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [existing] = await tx
          .select()
          .from(StudentEvaluationCategories)
          .where(
            and(
              eq(StudentEvaluationCategories.id, categoryId),
              isNull(StudentEvaluationCategories.deleted_at),
            ),
          );

        if (!existing) throw new AppError(404, "Category was not found.");

        if (parsed.name && parsed.name !== existing.name) {
          const [conflict] = await tx
            .select({ id: StudentEvaluationCategories.id })
            .from(StudentEvaluationCategories)
            .where(
              and(
                ne(StudentEvaluationCategories.id, categoryId),
                eq(StudentEvaluationCategories.form_id, existing.form_id),
                eq(StudentEvaluationCategories.name, parsed.name),
                isNull(StudentEvaluationCategories.deleted_at),
              ),
            );

          if (conflict) {
            throw new AppError(
              409,
              `A category named "${parsed.name}" already exists in this form.`,
            );
          }
        }

        const [updated] = await tx
          .update(StudentEvaluationCategories)
          .set({ ...parsed, updated_at: new Date() })
          .where(eq(StudentEvaluationCategories.id, categoryId))
          .returning();

        if (!updated) throw new AppError(500, "Failed to update category.");
        return updated;
      });
    });
  }

  deleteStudentCategory(categoryId: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const deleteTime = new Date();

      const [deleted] = await tx
        .update(StudentEvaluationCategories)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(StudentEvaluationCategories.id, categoryId),
            isNull(StudentEvaluationCategories.deleted_at),
          ),
        )
        .returning({ id: StudentEvaluationCategories.id });

      if (!deleted) throw new AppError(404, "Category was not found or already archived.");

      // Cascade soft-delete to questions
      await tx
        .update(StudentEvaluationQuestions)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(StudentEvaluationQuestions.category_id, categoryId),
            isNull(StudentEvaluationQuestions.deleted_at),
          ),
        );

      return undefined;
    });
  }

  restoreStudentCategory(
    categoryId: number,
    restoreQuestions = true,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalCategorySelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [category] = await tx
        .select()
        .from(StudentEvaluationCategories)
        .where(eq(StudentEvaluationCategories.id, categoryId));

      if (!category) throw new AppError(404, "Category not found.");
      if (!category.deleted_at) throw new AppError(400, "Category is already active.");

      // A. Verify parent form is active
      const [form] = await tx
        .select({ id: StudentEvaluationForms.id })
        .from(StudentEvaluationForms)
        .where(
          and(
            eq(StudentEvaluationForms.id, category.form_id),
            isNull(StudentEvaluationForms.deleted_at),
          ),
        );

      if (!form) {
        throw new AppError(
          400,
          "Cannot restore category: Parent evaluation form is archived or deleted.",
        );
      }

      // B. Conflict check on name under same form
      const [conflict] = await tx
        .select({ id: StudentEvaluationCategories.id })
        .from(StudentEvaluationCategories)
        .where(
          and(
            ne(StudentEvaluationCategories.id, categoryId),
            eq(StudentEvaluationCategories.form_id, category.form_id),
            eq(StudentEvaluationCategories.name, category.name),
            isNull(StudentEvaluationCategories.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(
          409,
          `Cannot restore: An active category named "${category.name}" already exists in this form.`,
        );
      }

      // C. Restore category
      const [restored] = await tx
        .update(StudentEvaluationCategories)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentEvaluationCategories.id, categoryId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore category.");

      // D. Optionally restore its child questions
      if (restoreQuestions) {
        await tx
          .update(StudentEvaluationQuestions)
          .set({ deleted_at: null, updated_at: new Date() })
          .where(eq(StudentEvaluationQuestions.category_id, categoryId));
      }

      return restored;
    });
  }

  addStudentQuestion(
    categoryId: number,
    info: IStudentEvalQuestionInsert,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError> {
    return ValidateSchema(StudentEvalQuestionInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        // Verify parent category is active
        const [category] = await tx
          .select({ id: StudentEvaluationCategories.id })
          .from(StudentEvaluationCategories)
          .where(
            and(
              eq(StudentEvaluationCategories.id, categoryId),
              isNull(StudentEvaluationCategories.deleted_at),
            ),
          );

        if (!category) throw new AppError(404, "Parent category not found or is archived.");

        const [created] = await tx
          .insert(StudentEvaluationQuestions)
          .values({ ...parsed, category_id: categoryId })
          .returning();

        if (!created) throw new AppError(500, "Failed to add question.");
        return created;
      });
    });
  }

  updateStudentQuestion(
    questionId: number,
    info: IStudentEvalQuestionUpdate,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError> {
    return ValidateSchema(StudentEvalQuestionUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [updated] = await tx
          .update(StudentEvaluationQuestions)
          .set({ ...parsed, updated_at: new Date() })
          .where(
            and(
              eq(StudentEvaluationQuestions.id, questionId),
              isNull(StudentEvaluationQuestions.deleted_at),
            ),
          )
          .returning();

        if (!updated) throw new AppError(404, "Question was not found or is archived.");
        return updated;
      });
    });
  }

  deleteStudentQuestion(questionId: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const [deleted] = await tx
        .update(StudentEvaluationQuestions)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(StudentEvaluationQuestions.id, questionId),
            isNull(StudentEvaluationQuestions.deleted_at),
          ),
        )
        .returning({ id: StudentEvaluationQuestions.id });

      if (!deleted) throw new AppError(404, "Question was not found or already archived.");
      return undefined;
    });
  }

  restoreStudentQuestion(
    questionId: number,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [question] = await tx
        .select()
        .from(StudentEvaluationQuestions)
        .where(eq(StudentEvaluationQuestions.id, questionId));

      if (!question) throw new AppError(404, "Question not found.");
      if (!question.deleted_at) throw new AppError(400, "Question is already active.");

      // Verify parent category is active
      const [category] = await tx
        .select({ id: StudentEvaluationCategories.id })
        .from(StudentEvaluationCategories)
        .where(
          and(
            eq(StudentEvaluationCategories.id, question.category_id),
            isNull(StudentEvaluationCategories.deleted_at),
          ),
        );

      if (!category) {
        throw new AppError(400, "Cannot restore question: Parent category is archived or deleted.");
      }

      const [restored] = await tx
        .update(StudentEvaluationQuestions)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentEvaluationQuestions.id, questionId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore question.");
      return restored;
    });
  }

  reorderStudentQuestions(
    categoryId: number,
    orderedQuestionIds: number[],
    client: DbClient = db,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      for (let i = 0; i < orderedQuestionIds.length; i++) {
        const questionId = orderedQuestionIds[i]!;
        await tx
          .update(StudentEvaluationQuestions)
          .set({ order: i + 1, updated_at: new Date() })
          .where(
            and(
              eq(StudentEvaluationQuestions.id, questionId),
              eq(StudentEvaluationQuestions.category_id, categoryId),
            ),
          );
      }
      return undefined;
    });
  }

  // =========================================================================
  // 2. SUPERVISOR INSTRUMENT (SEF) BUILDER + MOVs / MEANS
  // =========================================================================

  addSupervisorCategory(
    formId: number,
    info: ISupervisorEvalCategoryInsert,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError> {
    return ValidateSchema(SupervisorEvalCategoryInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [form] = await tx
          .select({ id: SupervisorEvaluationForms.id })
          .from(SupervisorEvaluationForms)
          .where(
            and(
              eq(SupervisorEvaluationForms.id, formId),
              isNull(SupervisorEvaluationForms.deleted_at),
            ),
          );

        if (!form) throw new AppError(404, "Parent evaluation form was not found or is archived.");

        const [existing] = await tx
          .select()
          .from(SupervisorEvaluationCategories)
          .where(
            and(
              eq(SupervisorEvaluationCategories.form_id, formId),
              eq(SupervisorEvaluationCategories.name, parsed.name),
            ),
          );

        if (existing) {
          if (existing.deleted_at === null) {
            throw new AppError(409, `Category "${parsed.name}" already exists in this form.`);
          }

          const [reactivated] = await tx
            .update(SupervisorEvaluationCategories)
            .set({
              description: parsed.description,
              order: parsed.order,
              deleted_at: null,
              updated_at: new Date(),
            })
            .where(eq(SupervisorEvaluationCategories.id, existing.id))
            .returning();

          if (!reactivated) throw new AppError(500, "Failed to reactivate category.");
          return reactivated;
        }

        const [created] = await tx
          .insert(SupervisorEvaluationCategories)
          .values({ ...parsed, form_id: formId })
          .returning();

        if (!created) throw new AppError(500, "Failed to add supervisor category.");
        return created;
      });
    });
  }

  updateSupervisorCategory(
    categoryId: number,
    info: ISupervisorEvalCategoryUpdate,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError> {
    return ValidateSchema(SupervisorEvalCategoryUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [existing] = await tx
          .select()
          .from(SupervisorEvaluationCategories)
          .where(
            and(
              eq(SupervisorEvaluationCategories.id, categoryId),
              isNull(SupervisorEvaluationCategories.deleted_at),
            ),
          );

        if (!existing) throw new AppError(404, "Category was not found.");

        if (parsed.name && parsed.name !== existing.name) {
          const [conflict] = await tx
            .select({ id: SupervisorEvaluationCategories.id })
            .from(SupervisorEvaluationCategories)
            .where(
              and(
                ne(SupervisorEvaluationCategories.id, categoryId),
                eq(SupervisorEvaluationCategories.form_id, existing.form_id),
                eq(SupervisorEvaluationCategories.name, parsed.name),
                isNull(SupervisorEvaluationCategories.deleted_at),
              ),
            );

          if (conflict) {
            throw new AppError(409, `Category "${parsed.name}" already exists in this form.`);
          }
        }

        const [updated] = await tx
          .update(SupervisorEvaluationCategories)
          .set({ ...parsed, updated_at: new Date() })
          .where(eq(SupervisorEvaluationCategories.id, categoryId))
          .returning();

        if (!updated) throw new AppError(500, "Failed to update category.");
        return updated;
      });
    });
  }

  deleteSupervisorCategory(categoryId: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const deleteTime = new Date();

      const [deleted] = await tx
        .update(SupervisorEvaluationCategories)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(SupervisorEvaluationCategories.id, categoryId),
            isNull(SupervisorEvaluationCategories.deleted_at),
          ),
        )
        .returning({ id: SupervisorEvaluationCategories.id });

      if (!deleted) throw new AppError(404, "Category not found or already deleted.");

      const questions = await tx
        .select({ id: SupervisorEvaluationQuestions.id })
        .from(SupervisorEvaluationQuestions)
        .where(
          and(
            eq(SupervisorEvaluationQuestions.category_id, categoryId),
            isNull(SupervisorEvaluationQuestions.deleted_at),
          ),
        );

      if (questions.length > 0) {
        const qIds = questions.map((q) => q.id);
        await tx
          .update(SupervisorEvaluationQuestions)
          .set({ deleted_at: deleteTime })
          .where(inArray(SupervisorEvaluationQuestions.id, qIds));
        await tx
          .update(SupervisorEvaluationMeans)
          .set({ deleted_at: deleteTime })
          .where(inArray(SupervisorEvaluationMeans.question_id, qIds));
      }

      return undefined;
    });
  }

  restoreSupervisorCategory(
    categoryId: number,
    restoreChildren = true,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [category] = await tx
        .select()
        .from(SupervisorEvaluationCategories)
        .where(eq(SupervisorEvaluationCategories.id, categoryId));

      if (!category) throw new AppError(404, "Category not found.");
      if (!category.deleted_at) throw new AppError(400, "Category is already active.");

      const [form] = await tx
        .select({ id: SupervisorEvaluationForms.id })
        .from(SupervisorEvaluationForms)
        .where(
          and(
            eq(SupervisorEvaluationForms.id, category.form_id),
            isNull(SupervisorEvaluationForms.deleted_at),
          ),
        );

      if (!form)
        throw new AppError(400, "Cannot restore category: Parent evaluation form is archived.");

      const [conflict] = await tx
        .select({ id: SupervisorEvaluationCategories.id })
        .from(SupervisorEvaluationCategories)
        .where(
          and(
            ne(SupervisorEvaluationCategories.id, categoryId),
            eq(SupervisorEvaluationCategories.form_id, category.form_id),
            eq(SupervisorEvaluationCategories.name, category.name),
            isNull(SupervisorEvaluationCategories.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(409, `Category "${category.name}" already exists in this form.`);
      }

      const [restored] = await tx
        .update(SupervisorEvaluationCategories)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationCategories.id, categoryId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore category.");

      if (restoreChildren) {
        const questions = await tx
          .select({ id: SupervisorEvaluationQuestions.id })
          .from(SupervisorEvaluationQuestions)
          .where(eq(SupervisorEvaluationQuestions.category_id, categoryId));

        if (questions.length > 0) {
          const qIds = questions.map((q) => q.id);
          await tx
            .update(SupervisorEvaluationQuestions)
            .set({ deleted_at: null, updated_at: new Date() })
            .where(inArray(SupervisorEvaluationQuestions.id, qIds));
          await tx
            .update(SupervisorEvaluationMeans)
            .set({ deleted_at: null, updated_at: new Date() })
            .where(inArray(SupervisorEvaluationMeans.question_id, qIds));
        }
      }

      return restored;
    });
  }

  addSupervisorQuestion(
    categoryId: number,
    info: ISupervisorEvalQuestionInsert,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError> {
    return ValidateSchema(SupervisorEvalQuestionInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [category] = await tx
          .select({ id: SupervisorEvaluationCategories.id })
          .from(SupervisorEvaluationCategories)
          .where(
            and(
              eq(SupervisorEvaluationCategories.id, categoryId),
              isNull(SupervisorEvaluationCategories.deleted_at),
            ),
          );

        if (!category) throw new AppError(404, "Parent category not found or is archived.");

        const [created] = await tx
          .insert(SupervisorEvaluationQuestions)
          .values({ ...parsed, category_id: categoryId })
          .returning();

        if (!created) throw new AppError(500, "Failed to add question.");
        return created;
      });
    });
  }

  updateSupervisorQuestion(
    questionId: number,
    info: ISupervisorEvalQuestionUpdate,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError> {
    return ValidateSchema(SupervisorEvalQuestionUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [updated] = await tx
          .update(SupervisorEvaluationQuestions)
          .set({ ...parsed, updated_at: new Date() })
          .where(
            and(
              eq(SupervisorEvaluationQuestions.id, questionId),
              isNull(SupervisorEvaluationQuestions.deleted_at),
            ),
          )
          .returning();

        if (!updated) throw new AppError(404, "Question was not found.");
        return updated;
      });
    });
  }

  deleteSupervisorQuestion(questionId: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const deleteTime = new Date();
      const [deleted] = await tx
        .update(SupervisorEvaluationQuestions)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(SupervisorEvaluationQuestions.id, questionId),
            isNull(SupervisorEvaluationQuestions.deleted_at),
          ),
        )
        .returning({ id: SupervisorEvaluationQuestions.id });

      if (!deleted) throw new AppError(404, "Question was not found.");

      await tx
        .update(SupervisorEvaluationMeans)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(SupervisorEvaluationMeans.question_id, questionId),
            isNull(SupervisorEvaluationMeans.deleted_at),
          ),
        );

      return undefined;
    });
  }

  restoreSupervisorQuestion(
    questionId: number,
    restoreMeans = true,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [question] = await tx
        .select()
        .from(SupervisorEvaluationQuestions)
        .where(eq(SupervisorEvaluationQuestions.id, questionId));

      if (!question) throw new AppError(404, "Question not found.");
      if (!question.deleted_at) throw new AppError(400, "Question is already active.");

      const [category] = await tx
        .select({ id: SupervisorEvaluationCategories.id })
        .from(SupervisorEvaluationCategories)
        .where(
          and(
            eq(SupervisorEvaluationCategories.id, question.category_id),
            isNull(SupervisorEvaluationCategories.deleted_at),
          ),
        );

      if (!category)
        throw new AppError(400, "Cannot restore question: Parent category is archived.");

      const [restored] = await tx
        .update(SupervisorEvaluationQuestions)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationQuestions.id, questionId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore question.");

      if (restoreMeans) {
        await tx
          .update(SupervisorEvaluationMeans)
          .set({ deleted_at: null, updated_at: new Date() })
          .where(eq(SupervisorEvaluationMeans.question_id, questionId));
      }

      return restored;
    });
  }

  addMeansDescriptor(
    questionId: number,
    info: ISupervisorEvalMeansInsert,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError> {
    return ValidateSchema(SupervisorEvalMeansInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [question] = await tx
          .select({ id: SupervisorEvaluationQuestions.id })
          .from(SupervisorEvaluationQuestions)
          .where(
            and(
              eq(SupervisorEvaluationQuestions.id, questionId),
              isNull(SupervisorEvaluationQuestions.deleted_at),
            ),
          );

        if (!question) throw new AppError(404, "Parent question not found or is archived.");

        const [created] = await tx
          .insert(SupervisorEvaluationMeans)
          .values({ ...parsed, question_id: questionId })
          .returning();

        if (!created) throw new AppError(500, "Failed to add MOV descriptor.");
        return created;
      });
    });
  }

  updateMeansDescriptor(
    meansId: number,
    info: ISupervisorEvalMeansUpdate,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError> {
    return ValidateSchema(SupervisorEvalMeansUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [updated] = await tx
          .update(SupervisorEvaluationMeans)
          .set({ ...parsed, updated_at: new Date() })
          .where(
            and(
              eq(SupervisorEvaluationMeans.id, meansId),
              isNull(SupervisorEvaluationMeans.deleted_at),
            ),
          )
          .returning();

        if (!updated) throw new AppError(404, "MOV descriptor not found.");
        return updated;
      });
    });
  }

  deleteMeansDescriptor(meansId: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const [deleted] = await tx
        .update(SupervisorEvaluationMeans)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(SupervisorEvaluationMeans.id, meansId),
            isNull(SupervisorEvaluationMeans.deleted_at),
          ),
        )
        .returning({ id: SupervisorEvaluationMeans.id });

      if (!deleted) throw new AppError(404, "MOV descriptor not found.");
      return undefined;
    });
  }

  restoreMeansDescriptor(
    meansId: number,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [means] = await tx
        .select()
        .from(SupervisorEvaluationMeans)
        .where(eq(SupervisorEvaluationMeans.id, meansId));

      if (!means) throw new AppError(404, "MOV descriptor not found.");
      if (!means.deleted_at) throw new AppError(400, "MOV descriptor is already active.");

      const [question] = await tx
        .select({ id: SupervisorEvaluationQuestions.id })
        .from(SupervisorEvaluationQuestions)
        .where(
          and(
            eq(SupervisorEvaluationQuestions.id, means.question_id),
            isNull(SupervisorEvaluationQuestions.deleted_at),
          ),
        );

      if (!question) throw new AppError(400, "Cannot restore MOV: Parent question is archived.");

      const [restored] = await tx
        .update(SupervisorEvaluationMeans)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationMeans.id, meansId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore MOV descriptor.");
      return restored;
    });
  }
}
