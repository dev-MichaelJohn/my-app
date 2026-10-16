import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
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
  type GetUser,
} from "@my-app/shared";
import { logAuditEvent } from "@/libs/audit.lib.js";
import type { Request } from "express";

export interface IEvaluationBuilderService {
  addStudentCategory(
    formId: number,
    info: IStudentEvalCategoryInsert,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalCategorySelect, AppError>;
  updateStudentCategory(
    categoryId: number,
    info: IStudentEvalCategoryUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalCategorySelect, AppError>;
  deleteStudentCategory(
    categoryId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreStudentCategory(
    categoryId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalCategorySelect, AppError>;
  getStudentCategoryHistory(
    categoryId: number,
    client?: DbClient,
  ): ResultAsync<IStudentEvalCategorySelect[], AppError>;
  reorderStudentCategories(
    formId: number,
    orderedCategoryIds: number[],
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;

  addStudentQuestion(
    categoryId: number,
    info: IStudentEvalQuestionInsert,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError>;
  updateStudentQuestion(
    questionId: number,
    info: IStudentEvalQuestionUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError>;
  deleteStudentQuestion(
    questionId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreStudentQuestion(
    questionId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError>;
  getStudentQuestionHistory(
    questionId: number,
    client?: DbClient,
  ): ResultAsync<IStudentEvalQuestionSelect[], AppError>;
  reorderStudentQuestions(
    categoryId: number,
    orderedQuestionIds: number[],
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;

  addSupervisorCategory(
    formId: number,
    info: ISupervisorEvalCategoryInsert,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError>;
  updateSupervisorCategory(
    categoryId: number,
    info: ISupervisorEvalCategoryUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError>;
  deleteSupervisorCategory(
    categoryId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreSupervisorCategory(
    categoryId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError>;
  getSupervisorCategoryHistory(
    categoryId: number,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalCategorySelect[], AppError>;
  reorderSupervisorCategories(
    formId: number,
    orderedCategoryIds: number[],
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;

  addSupervisorQuestion(
    categoryId: number,
    info: ISupervisorEvalQuestionInsert,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError>;
  updateSupervisorQuestion(
    questionId: number,
    info: ISupervisorEvalQuestionUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError>;
  deleteSupervisorQuestion(
    questionId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreSupervisorQuestion(
    questionId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError>;
  getSupervisorQuestionHistory(
    questionId: number,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalQuestionSelect[], AppError>;
  reorderSupervisorQuestions(
    categoryId: number,
    orderedQuestionIds: number[],
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;

  addMeansDescriptor(
    questionId: number,
    info: ISupervisorEvalMeansInsert,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError>;
  updateMeansDescriptor(
    meansId: number,
    info: ISupervisorEvalMeansUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError>;
  deleteMeansDescriptor(
    meansId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreMeansDescriptor(
    meansId: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError>;
  getMeansDescriptorHistory(
    meansId: number,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalMeansSelect[], AppError>;
  reorderMeansDescriptors(
    questionId: number,
    orderedMeansIds: number[],
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
}

export class EvaluationBuilderService implements IEvaluationBuilderService {
  // =========================================================================
  // 1. SET (STUDENT EVALUATION INSTRUMENT)
  // =========================================================================

  addStudentCategory(
    formId: number,
    info: IStudentEvalCategoryInsert,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalCategorySelect, AppError> {
    return ValidateSchema(StudentEvalCategoryInsert, { ...info, form_id: formId }).asyncAndThen(
      (parsed) => {
        return WithTransaction(client, async (tx) => {
          const [created] = await tx
            .insert(StudentEvaluationCategories)
            .values({
              ...parsed,
              form_id: parsed.form_id,
              version: 1,
              parent_id: null,
            })
            .returning();

          if (!created) throw new AppError(500, "Failed to add category.");

          await logAuditEvent({
            actor: actorUser,
            req,
            action: "CREATE",
            entity: "student_evaluation_categories",
            entityId: created.id,
            entityName: created.name,
            newRecord: created,
            tx,
          });

          return created;
        });
      },
    );
  }

  updateStudentCategory(
    categoryId: number,
    info: IStudentEvalCategoryUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalCategorySelect, AppError> {
    return ValidateSchema(StudentEvalCategoryUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [current] = await tx
          .select()
          .from(StudentEvaluationCategories)
          .where(
            and(
              eq(StudentEvaluationCategories.id, categoryId),
              isNull(StudentEvaluationCategories.deleted_at),
            ),
          );

        if (!current) throw new AppError(404, "Active category was not found.");

        const rootParentId = current.parent_id || current.id;
        const nextVersion = current.version + 1;
        const archiveTime = new Date();

        await tx
          .update(StudentEvaluationCategories)
          .set({ deleted_at: archiveTime })
          .where(eq(StudentEvaluationCategories.id, current.id));

        const [newVersion] = await tx
          .insert(StudentEvaluationCategories)
          .values({
            form_id: current.form_id,
            parent_id: rootParentId,
            version: nextVersion,
            name: parsed.name ?? current.name,
            description: parsed.description ?? current.description,
            order: parsed.order ?? current.order,
          })
          .returning();

        if (!newVersion) throw new AppError(500, "Failed to create new category version.");

        await tx
          .update(StudentEvaluationQuestions)
          .set({ category_id: newVersion.id })
          .where(
            and(
              eq(StudentEvaluationQuestions.category_id, current.id),
              isNull(StudentEvaluationQuestions.deleted_at),
            ),
          );

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "student_evaluation_categories",
          entityId: newVersion.id,
          entityName: `${newVersion.name} (v${newVersion.version})`,
          oldRecord: current,
          newRecord: newVersion,
          tx,
        });

        return newVersion;
      });
    });
  }

  deleteStudentCategory(
    categoryId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const [category] = await tx
        .select()
        .from(StudentEvaluationCategories)
        .where(eq(StudentEvaluationCategories.id, categoryId));

      if (!category) throw new AppError(404, "Category not found.");

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
        .returning();

      if (!deleted) throw new AppError(404, "Category not found or already deleted.");

      await tx
        .update(StudentEvaluationQuestions)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(StudentEvaluationQuestions.category_id, categoryId),
            isNull(StudentEvaluationQuestions.deleted_at),
          ),
        );

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "student_evaluation_categories",
        entityId: category.id,
        entityName: category.name,
        oldRecord: category,
        tx,
      });

      return undefined;
    });
  }

  restoreStudentCategory(
    categoryId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalCategorySelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [category] = await tx
        .select()
        .from(StudentEvaluationCategories)
        .where(eq(StudentEvaluationCategories.id, categoryId));

      if (!category) throw new AppError(404, "Category not found.");
      if (!category.deleted_at) throw new AppError(400, "Category is already active.");

      const [form] = await tx
        .select({ id: StudentEvaluationForms.id })
        .from(StudentEvaluationForms)
        .where(
          and(
            eq(StudentEvaluationForms.id, category.form_id),
            isNull(StudentEvaluationForms.deleted_at),
          ),
        );

      if (!form) throw new AppError(400, "Cannot restore: Parent evaluation form is archived.");

      const [restored] = await tx
        .update(StudentEvaluationCategories)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentEvaluationCategories.id, categoryId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore category.");

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "student_evaluation_categories",
        entityId: restored.id,
        entityName: restored.name,
        newRecord: restored,
        tx,
      });

      return restored;
    });
  }

  getStudentCategoryHistory(
    categoryId: number,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalCategorySelect[], AppError> {
    return WithTransaction(client, async (tx) => {
      const [target] = await tx
        .select()
        .from(StudentEvaluationCategories)
        .where(eq(StudentEvaluationCategories.id, categoryId));

      if (!target) throw new AppError(404, "Category not found.");

      const rootId = target.parent_id || target.id;

      return tx
        .select()
        .from(StudentEvaluationCategories)
        .where(
          or(
            eq(StudentEvaluationCategories.id, rootId),
            eq(StudentEvaluationCategories.parent_id, rootId),
          ),
        )
        .orderBy(desc(StudentEvaluationCategories.version));
    });
  }

  reorderStudentCategories(
    formId: number,
    orderedCategoryIds: number[],
    client: DbClient = db,
    _actorUser?: GetUser,
    _req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      for (let i = 0; i < orderedCategoryIds.length; i++) {
        const categoryId = orderedCategoryIds[i]!;
        await tx
          .update(StudentEvaluationCategories)
          .set({ order: i + 1, updated_at: new Date() })
          .where(
            and(
              eq(StudentEvaluationCategories.id, categoryId),
              eq(StudentEvaluationCategories.form_id, formId),
              isNull(StudentEvaluationCategories.deleted_at),
            ),
          );
      }
      return undefined;
    });
  }

  addStudentQuestion(
    categoryId: number,
    info: IStudentEvalQuestionInsert,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError> {
    return ValidateSchema(StudentEvalQuestionInsert, {
      ...info,
      category_id: categoryId,
    }).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [created] = await tx
          .insert(StudentEvaluationQuestions)
          .values({
            ...parsed,
            category_id: parsed.category_id,
            version: 1,
            parent_id: null,
          })
          .returning();

        if (!created) throw new AppError(500, "Failed to add question.");

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "CREATE",
          entity: "student_evaluation_questions",
          entityId: created.id,
          entityName: created.question.slice(0, 80),
          newRecord: created,
          tx,
        });

        return created;
      });
    });
  }

  updateStudentQuestion(
    questionId: number,
    info: IStudentEvalQuestionUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError> {
    return ValidateSchema(StudentEvalQuestionUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [current] = await tx
          .select()
          .from(StudentEvaluationQuestions)
          .where(
            and(
              eq(StudentEvaluationQuestions.id, questionId),
              isNull(StudentEvaluationQuestions.deleted_at),
            ),
          );

        if (!current) throw new AppError(404, "Active question was not found.");

        const rootParentId = current.parent_id || current.id;
        const nextVersion = current.version + 1;
        const archiveTime = new Date();

        await tx
          .update(StudentEvaluationQuestions)
          .set({ deleted_at: archiveTime })
          .where(eq(StudentEvaluationQuestions.id, current.id));

        const [newVersion] = await tx
          .insert(StudentEvaluationQuestions)
          .values({
            category_id: current.category_id,
            parent_id: rootParentId,
            version: nextVersion,
            question: parsed.question ?? current.question,
            max_rating: parsed.max_rating ?? current.max_rating,
            order: parsed.order ?? current.order,
          })
          .returning();

        if (!newVersion) throw new AppError(500, "Failed to create new question version.");

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "student_evaluation_questions",
          entityId: newVersion.id,
          entityName: `${newVersion.question.slice(0, 60)} (v${newVersion.version})`,
          oldRecord: current,
          newRecord: newVersion,
          tx,
        });

        return newVersion;
      });
    });
  }

  deleteStudentQuestion(
    questionId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const [question] = await tx
        .select()
        .from(StudentEvaluationQuestions)
        .where(eq(StudentEvaluationQuestions.id, questionId));

      if (!question) throw new AppError(404, "Question not found.");

      const [deleted] = await tx
        .update(StudentEvaluationQuestions)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(StudentEvaluationQuestions.id, questionId),
            isNull(StudentEvaluationQuestions.deleted_at),
          ),
        )
        .returning();

      if (!deleted) throw new AppError(404, "Question not found.");

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "student_evaluation_questions",
        entityId: question.id,
        entityName: question.question.slice(0, 80),
        oldRecord: question,
        tx,
      });

      return undefined;
    });
  }

  restoreStudentQuestion(
    questionId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<IStudentEvalQuestionSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [question] = await tx
        .select()
        .from(StudentEvaluationQuestions)
        .where(eq(StudentEvaluationQuestions.id, questionId));

      if (!question) throw new AppError(404, "Question not found.");
      if (!question.deleted_at) throw new AppError(400, "Question is already active.");

      const [category] = await tx
        .select({ id: StudentEvaluationCategories.id })
        .from(StudentEvaluationCategories)
        .where(
          and(
            eq(StudentEvaluationCategories.id, question.category_id),
            isNull(StudentEvaluationCategories.deleted_at),
          ),
        );

      if (!category) throw new AppError(400, "Cannot restore: Parent category is archived.");

      const [restored] = await tx
        .update(StudentEvaluationQuestions)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentEvaluationQuestions.id, questionId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore question.");

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "student_evaluation_questions",
        entityId: restored.id,
        entityName: restored.question.slice(0, 80),
        newRecord: restored,
        tx,
      });

      return restored;
    });
  }

  getStudentQuestionHistory(
    questionId: number,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalQuestionSelect[], AppError> {
    return WithTransaction(client, async (tx) => {
      const [target] = await tx
        .select()
        .from(StudentEvaluationQuestions)
        .where(eq(StudentEvaluationQuestions.id, questionId));

      if (!target) throw new AppError(404, "Question not found.");

      const rootId = target.parent_id || target.id;

      return tx
        .select()
        .from(StudentEvaluationQuestions)
        .where(
          or(
            eq(StudentEvaluationQuestions.id, rootId),
            eq(StudentEvaluationQuestions.parent_id, rootId),
          ),
        )
        .orderBy(desc(StudentEvaluationQuestions.version));
    });
  }

  reorderStudentQuestions(
    categoryId: number,
    orderedQuestionIds: number[],
    client: DbClient = db,
    _actorUser?: GetUser,
    _req?: Request,
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
              isNull(StudentEvaluationQuestions.deleted_at),
            ),
          );
      }
      return undefined;
    });
  }

  // =========================================================================
  // 2. SEF (SUPERVISOR EVALUATION INSTRUMENT)
  // =========================================================================

  addSupervisorCategory(
    formId: number,
    info: ISupervisorEvalCategoryInsert,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError> {
    return ValidateSchema(SupervisorEvalCategoryInsert, { ...info, form_id: formId }).asyncAndThen(
      (parsed) => {
        return WithTransaction(client, async (tx) => {
          const [created] = await tx
            .insert(SupervisorEvaluationCategories)
            .values({ ...parsed, form_id: parsed.form_id, version: 1, parent_id: null })
            .returning();

          if (!created) throw new AppError(500, "Failed to add supervisor category.");

          await logAuditEvent({
            actor: actorUser,
            req,
            action: "CREATE",
            entity: "supervisor_evaluation_categories",
            entityId: created.id,
            entityName: created.name,
            newRecord: created,
            tx,
          });

          return created;
        });
      },
    );
  }

  updateSupervisorCategory(
    categoryId: number,
    info: ISupervisorEvalCategoryUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError> {
    return ValidateSchema(SupervisorEvalCategoryUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [current] = await tx
          .select()
          .from(SupervisorEvaluationCategories)
          .where(
            and(
              eq(SupervisorEvaluationCategories.id, categoryId),
              isNull(SupervisorEvaluationCategories.deleted_at),
            ),
          );

        if (!current) throw new AppError(404, "Active category was not found.");

        const rootParentId = current.parent_id || current.id;
        const nextVersion = current.version + 1;
        const archiveTime = new Date();

        await tx
          .update(SupervisorEvaluationCategories)
          .set({ deleted_at: archiveTime })
          .where(eq(SupervisorEvaluationCategories.id, current.id));

        const [newVersion] = await tx
          .insert(SupervisorEvaluationCategories)
          .values({
            form_id: current.form_id,
            parent_id: rootParentId,
            version: nextVersion,
            name: parsed.name ?? current.name,
            description: parsed.description ?? current.description,
            order: parsed.order ?? current.order,
          })
          .returning();

        if (!newVersion) throw new AppError(500, "Failed to create new category version.");

        await tx
          .update(SupervisorEvaluationQuestions)
          .set({ category_id: newVersion.id })
          .where(
            and(
              eq(SupervisorEvaluationQuestions.category_id, current.id),
              isNull(SupervisorEvaluationQuestions.deleted_at),
            ),
          );

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "supervisor_evaluation_categories",
          entityId: newVersion.id,
          entityName: `${newVersion.name} (v${newVersion.version})`,
          oldRecord: current,
          newRecord: newVersion,
          tx,
        });

        return newVersion;
      });
    });
  }

  deleteSupervisorCategory(
    categoryId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const [category] = await tx
        .select()
        .from(SupervisorEvaluationCategories)
        .where(eq(SupervisorEvaluationCategories.id, categoryId));

      if (!category) throw new AppError(404, "Category not found.");

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
        .returning();

      if (!deleted) throw new AppError(404, "Category not found.");

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

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "supervisor_evaluation_categories",
        entityId: category.id,
        entityName: category.name,
        oldRecord: category,
        tx,
      });

      return undefined;
    });
  }

  restoreSupervisorCategory(
    categoryId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalCategorySelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [category] = await tx
        .select()
        .from(SupervisorEvaluationCategories)
        .where(eq(SupervisorEvaluationCategories.id, categoryId));

      if (!category) throw new AppError(404, "Supervisor category not found.");
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

      if (!form) throw new AppError(400, "Cannot restore: Parent form is archived.");

      const [restored] = await tx
        .update(SupervisorEvaluationCategories)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationCategories.id, categoryId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore category.");

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "supervisor_evaluation_categories",
        entityId: restored.id,
        entityName: restored.name,
        newRecord: restored,
        tx,
      });

      return restored;
    });
  }

  getSupervisorCategoryHistory(
    categoryId: number,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalCategorySelect[], AppError> {
    return WithTransaction(client, async (tx) => {
      const [target] = await tx
        .select()
        .from(SupervisorEvaluationCategories)
        .where(eq(SupervisorEvaluationCategories.id, categoryId));

      if (!target) throw new AppError(404, "Category not found.");
      const rootId = target.parent_id || target.id;

      return tx
        .select()
        .from(SupervisorEvaluationCategories)
        .where(
          or(
            eq(SupervisorEvaluationCategories.id, rootId),
            eq(SupervisorEvaluationCategories.parent_id, rootId),
          ),
        )
        .orderBy(desc(SupervisorEvaluationCategories.version));
    });
  }

  reorderSupervisorCategories(
    formId: number,
    orderedCategoryIds: number[],
    client: DbClient = db,
    _actorUser?: GetUser,
    _req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      for (let i = 0; i < orderedCategoryIds.length; i++) {
        const categoryId = orderedCategoryIds[i]!;
        await tx
          .update(SupervisorEvaluationCategories)
          .set({ order: i + 1, updated_at: new Date() })
          .where(
            and(
              eq(SupervisorEvaluationCategories.id, categoryId),
              eq(SupervisorEvaluationCategories.form_id, formId),
              isNull(SupervisorEvaluationCategories.deleted_at),
            ),
          );
      }
      return undefined;
    });
  }

  addSupervisorQuestion(
    categoryId: number,
    info: ISupervisorEvalQuestionInsert,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError> {
    return ValidateSchema(SupervisorEvalQuestionInsert, {
      ...info,
      category_id: categoryId,
    }).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [created] = await tx
          .insert(SupervisorEvaluationQuestions)
          .values({ ...parsed, category_id: parsed.category_id, version: 1, parent_id: null })
          .returning();

        if (!created) throw new AppError(500, "Failed to add question.");

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "CREATE",
          entity: "supervisor_evaluation_questions",
          entityId: created.id,
          entityName: created.question.slice(0, 80),
          newRecord: created,
          tx,
        });

        return created;
      });
    });
  }

  updateSupervisorQuestion(
    questionId: number,
    info: ISupervisorEvalQuestionUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalQuestionSelect, AppError> {
    return ValidateSchema(SupervisorEvalQuestionUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [current] = await tx
          .select()
          .from(SupervisorEvaluationQuestions)
          .where(
            and(
              eq(SupervisorEvaluationQuestions.id, questionId),
              isNull(SupervisorEvaluationQuestions.deleted_at),
            ),
          );

        if (!current) throw new AppError(404, "Active question was not found.");

        const rootParentId = current.parent_id || current.id;
        const nextVersion = current.version + 1;
        const archiveTime = new Date();

        await tx
          .update(SupervisorEvaluationQuestions)
          .set({ deleted_at: archiveTime })
          .where(eq(SupervisorEvaluationQuestions.id, current.id));

        const [newVersion] = await tx
          .insert(SupervisorEvaluationQuestions)
          .values({
            category_id: current.category_id,
            parent_id: rootParentId,
            version: nextVersion,
            question: parsed.question ?? current.question,
            max_rating: parsed.max_rating ?? current.max_rating,
            order: parsed.order ?? current.order,
          })
          .returning();

        if (!newVersion) throw new AppError(500, "Failed to create new question version.");

        await tx
          .update(SupervisorEvaluationMeans)
          .set({ question_id: newVersion.id })
          .where(
            and(
              eq(SupervisorEvaluationMeans.question_id, current.id),
              isNull(SupervisorEvaluationMeans.deleted_at),
            ),
          );

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "supervisor_evaluation_questions",
          entityId: newVersion.id,
          entityName: `${newVersion.question.slice(0, 60)} (v${newVersion.version})`,
          oldRecord: current,
          newRecord: newVersion,
          tx,
        });

        return newVersion;
      });
    });
  }

  deleteSupervisorQuestion(
    questionId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const [question] = await tx
        .select()
        .from(SupervisorEvaluationQuestions)
        .where(eq(SupervisorEvaluationQuestions.id, questionId));

      if (!question) throw new AppError(404, "Question not found.");

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
        .returning();

      if (!deleted) throw new AppError(404, "Question not found.");

      await tx
        .update(SupervisorEvaluationMeans)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(SupervisorEvaluationMeans.question_id, questionId),
            isNull(SupervisorEvaluationMeans.deleted_at),
          ),
        );

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "supervisor_evaluation_questions",
        entityId: question.id,
        entityName: question.question.slice(0, 80),
        oldRecord: question,
        tx,
      });

      return undefined;
    });
  }

  restoreSupervisorQuestion(
    questionId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
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

      if (!category) throw new AppError(400, "Cannot restore: Parent category is archived.");

      const [restored] = await tx
        .update(SupervisorEvaluationQuestions)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationQuestions.id, questionId))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore question.");

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "supervisor_evaluation_questions",
        entityId: restored.id,
        entityName: restored.question.slice(0, 80),
        newRecord: restored,
        tx,
      });

      return restored;
    });
  }

  getSupervisorQuestionHistory(
    questionId: number,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalQuestionSelect[], AppError> {
    return WithTransaction(client, async (tx) => {
      const [target] = await tx
        .select()
        .from(SupervisorEvaluationQuestions)
        .where(eq(SupervisorEvaluationQuestions.id, questionId));

      if (!target) throw new AppError(404, "Question not found.");
      const rootId = target.parent_id || target.id;

      return tx
        .select()
        .from(SupervisorEvaluationQuestions)
        .where(
          or(
            eq(SupervisorEvaluationQuestions.id, rootId),
            eq(SupervisorEvaluationQuestions.parent_id, rootId),
          ),
        )
        .orderBy(desc(SupervisorEvaluationQuestions.version));
    });
  }

  reorderSupervisorQuestions(
    categoryId: number,
    orderedQuestionIds: number[],
    client: DbClient = db,
    _actorUser?: GetUser,
    _req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      for (let i = 0; i < orderedQuestionIds.length; i++) {
        const questionId = orderedQuestionIds[i]!;
        await tx
          .update(SupervisorEvaluationQuestions)
          .set({ order: i + 1, updated_at: new Date() })
          .where(
            and(
              eq(SupervisorEvaluationQuestions.id, questionId),
              eq(SupervisorEvaluationQuestions.category_id, categoryId),
              isNull(SupervisorEvaluationQuestions.deleted_at),
            ),
          );
      }
      return undefined;
    });
  }

  addMeansDescriptor(
    questionId: number,
    info: ISupervisorEvalMeansInsert,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError> {
    return ValidateSchema(SupervisorEvalMeansInsert, {
      ...info,
      question_id: questionId,
    }).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [created] = await tx
          .insert(SupervisorEvaluationMeans)
          .values({ ...parsed, question_id: parsed.question_id, version: 1, parent_id: null })
          .returning();

        if (!created) throw new AppError(500, "Failed to add MOV descriptor.");

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "CREATE",
          entity: "supervisor_evaluation_means",
          entityId: created.id,
          entityName: created.descriptor,
          newRecord: created,
          tx,
        });

        return created;
      });
    });
  }

  updateMeansDescriptor(
    meansId: number,
    info: ISupervisorEvalMeansUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<ISupervisorEvalMeansSelect, AppError> {
    return ValidateSchema(SupervisorEvalMeansUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [current] = await tx
          .select()
          .from(SupervisorEvaluationMeans)
          .where(
            and(
              eq(SupervisorEvaluationMeans.id, meansId),
              isNull(SupervisorEvaluationMeans.deleted_at),
            ),
          );

        if (!current) throw new AppError(404, "Active MOV descriptor was not found.");

        const rootParentId = current.parent_id || current.id;
        const nextVersion = current.version + 1;
        const archiveTime = new Date();

        await tx
          .update(SupervisorEvaluationMeans)
          .set({ deleted_at: archiveTime })
          .where(eq(SupervisorEvaluationMeans.id, current.id));

        const [newVersion] = await tx
          .insert(SupervisorEvaluationMeans)
          .values({
            question_id: current.question_id,
            parent_id: rootParentId,
            version: nextVersion,
            descriptor: parsed.descriptor ?? current.descriptor,
            order: parsed.order ?? current.order,
          })
          .returning();

        if (!newVersion) throw new AppError(500, "Failed to create new MOV descriptor version.");

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "supervisor_evaluation_means",
          entityId: newVersion.id,
          entityName: `${newVersion.descriptor} (v${newVersion.version})`,
          oldRecord: current,
          newRecord: newVersion,
          tx,
        });

        return newVersion;
      });
    });
  }

  deleteMeansDescriptor(
    meansId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const [means] = await tx
        .select()
        .from(SupervisorEvaluationMeans)
        .where(eq(SupervisorEvaluationMeans.id, meansId));

      if (!means) throw new AppError(404, "MOV descriptor not found.");

      const [deleted] = await tx
        .update(SupervisorEvaluationMeans)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(SupervisorEvaluationMeans.id, meansId),
            isNull(SupervisorEvaluationMeans.deleted_at),
          ),
        )
        .returning();

      if (!deleted) throw new AppError(404, "MOV descriptor not found.");

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "supervisor_evaluation_means",
        entityId: means.id,
        entityName: means.descriptor,
        oldRecord: means,
        tx,
      });

      return undefined;
    });
  }

  restoreMeansDescriptor(
    meansId: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
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

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "supervisor_evaluation_means",
        entityId: restored.id,
        entityName: restored.descriptor,
        newRecord: restored,
        tx,
      });

      return restored;
    });
  }

  getMeansDescriptorHistory(
    meansId: number,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalMeansSelect[], AppError> {
    return WithTransaction(client, async (tx) => {
      const [target] = await tx
        .select()
        .from(SupervisorEvaluationMeans)
        .where(eq(SupervisorEvaluationMeans.id, meansId));

      if (!target) throw new AppError(404, "MOV descriptor not found.");
      const rootId = target.parent_id || target.id;

      return tx
        .select()
        .from(SupervisorEvaluationMeans)
        .where(
          or(
            eq(SupervisorEvaluationMeans.id, rootId),
            eq(SupervisorEvaluationMeans.parent_id, rootId),
          ),
        )
        .orderBy(desc(SupervisorEvaluationMeans.version));
    });
  }

  reorderMeansDescriptors(
    questionId: number,
    orderedMeansIds: number[],
    client: DbClient = db,
    _actorUser?: GetUser,
    _req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      for (let i = 0; i < orderedMeansIds.length; i++) {
        const meansId = orderedMeansIds[i]!;
        await tx
          .update(SupervisorEvaluationMeans)
          .set({ order: i + 1, updated_at: new Date() })
          .where(
            and(
              eq(SupervisorEvaluationMeans.id, meansId),
              eq(SupervisorEvaluationMeans.question_id, questionId),
              isNull(SupervisorEvaluationMeans.deleted_at),
            ),
          );
      }
      return undefined;
    });
  }
}
