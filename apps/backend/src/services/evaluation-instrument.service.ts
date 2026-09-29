import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
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
import { createPaginatedData } from "@/libs/response.lib.js";
import {
  EvaluationFormQuerySchema,
  StudentEvalFormInsert,
  StudentEvalFormUpdate,
  SupervisorEvalFormInsert,
  SupervisorEvalFormUpdate,
  type GetStudentEvaluationForm,
  type GetSupervisorEvaluationForm,
  type IStudentEvalFormInsert,
  type IStudentEvalFormSelect,
  type IStudentEvalFormUpdate,
  type ISupervisorEvalFormInsert,
  type ISupervisorEvalFormSelect,
  type ISupervisorEvalFormUpdate,
  type PaginatedData,
} from "@my-app/shared";

export interface IEvaluationInstrumentService {
  createStudentForm(
    info: IStudentEvalFormInsert,
    client?: DbClient,
  ): ResultAsync<IStudentEvalFormSelect, AppError>;
  getStudentFormById(
    id: number,
    includeArchived?: boolean,
    client?: DbClient,
  ): ResultAsync<GetStudentEvaluationForm, AppError>;
  getStudentForms(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<IStudentEvalFormSelect[]>, AppError>;
  updateStudentForm(
    id: number,
    info: IStudentEvalFormUpdate,
    client?: DbClient,
  ): ResultAsync<IStudentEvalFormSelect, AppError>;
  deleteStudentForm(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreStudentForm(
    id: number,
    client?: DbClient,
  ): ResultAsync<GetStudentEvaluationForm, AppError>;

  createSupervisorForm(
    info: ISupervisorEvalFormInsert,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalFormSelect, AppError>;
  getSupervisorFormById(
    id: number,
    includeArchived?: boolean,
    client?: DbClient,
  ): ResultAsync<GetSupervisorEvaluationForm, AppError>;
  getSupervisorForms(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<ISupervisorEvalFormSelect[]>, AppError>;
  updateSupervisorForm(
    id: number,
    info: ISupervisorEvalFormUpdate,
    client?: DbClient,
  ): ResultAsync<ISupervisorEvalFormSelect, AppError>;
  deleteSupervisorForm(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreSupervisorForm(
    id: number,
    client?: DbClient,
  ): ResultAsync<GetSupervisorEvaluationForm, AppError>;
}

export class EvaluationInstrumentService implements IEvaluationInstrumentService {
  // =========================================================================
  // 1. STUDENT INSTRUMENTS (SET)
  // =========================================================================

  createStudentForm(
    info: IStudentEvalFormInsert,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalFormSelect, AppError> {
    return ValidateSchema(StudentEvalFormInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [existing] = await tx
          .select()
          .from(StudentEvaluationForms)
          .where(eq(StudentEvaluationForms.title, parsed.title));

        if (existing) {
          if (existing.deleted_at === null) {
            throw new AppError(
              409,
              `A student evaluation form titled "${parsed.title}" already exists.`,
            );
          }

          // Reactivate archived form
          const [reactivated] = await tx
            .update(StudentEvaluationForms)
            .set({
              description: parsed.description,
              min_rating: parsed.min_rating,
              max_rating: parsed.max_rating,
              deleted_at: null,
              updated_at: new Date(),
            })
            .where(eq(StudentEvaluationForms.id, existing.id))
            .returning();

          if (!reactivated) throw new AppError(500, "Failed to reactivate evaluation form.");
          return reactivated;
        }

        const [created] = await tx.insert(StudentEvaluationForms).values(parsed).returning();

        if (!created) throw new AppError(500, "Failed to create evaluation form.");
        return created;
      });
    });
  }

  getStudentFormById(
    id: number,
    includeArchived = false,
    client: DbClient = db,
  ): ResultAsync<GetStudentEvaluationForm, AppError> {
    return WithTransaction(client, async (tx) => {
      const [form] = await tx
        .select({
          id: StudentEvaluationForms.id,
          title: StudentEvaluationForms.title,
          description: StudentEvaluationForms.description,
          min_rating: StudentEvaluationForms.min_rating,
          max_rating: StudentEvaluationForms.max_rating,
          created_at: StudentEvaluationForms.created_at,
          updated_at: StudentEvaluationForms.updated_at,
          deleted_at: StudentEvaluationForms.deleted_at,
          categories: sql<GetStudentEvaluationForm["categories"]>`
            COALESCE(
              (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', ${StudentEvaluationCategories.id},
                    'form_id', ${StudentEvaluationCategories.form_id},
                    'parent_id', ${StudentEvaluationCategories.parent_id},
                    'name', ${StudentEvaluationCategories.name},
                    'description', ${StudentEvaluationCategories.description},
                    'order', ${StudentEvaluationCategories.order},
                    'version', ${StudentEvaluationCategories.version},
                    'created_at', ${StudentEvaluationCategories.created_at},
                    'updated_at', ${StudentEvaluationCategories.updated_at},
                    'deleted_at', ${StudentEvaluationCategories.deleted_at},
                    'questions', COALESCE(
                      (
                        SELECT JSON_AGG(
                          JSON_BUILD_OBJECT(
                            'id', ${StudentEvaluationQuestions.id},
                            'category_id', ${StudentEvaluationQuestions.category_id},
                            'parent_id', ${StudentEvaluationQuestions.parent_id},
                            'question', ${StudentEvaluationQuestions.question},
                            'max_rating', ${StudentEvaluationQuestions.max_rating},
                            'order', ${StudentEvaluationQuestions.order},
                            'version', ${StudentEvaluationQuestions.version},
                            'created_at', ${StudentEvaluationQuestions.created_at},
                            'updated_at', ${StudentEvaluationQuestions.updated_at},
                            'deleted_at', ${StudentEvaluationQuestions.deleted_at}
                          )
                          ORDER BY ${StudentEvaluationQuestions.order} ASC
                        )
                        FROM ${StudentEvaluationQuestions}
                        WHERE ${StudentEvaluationQuestions.category_id} = ${StudentEvaluationCategories.id}
                          AND ${StudentEvaluationQuestions.deleted_at} IS NULL
                      ),
                      '[]'::json
                    )
                  )
                  ORDER BY ${StudentEvaluationCategories.order} ASC
                )
                FROM ${StudentEvaluationCategories}
                WHERE ${StudentEvaluationCategories.form_id} = ${StudentEvaluationForms.id}
                  AND ${StudentEvaluationCategories.deleted_at} IS NULL
              ),
              '[]'::json
            )
          `,
        })
        .from(StudentEvaluationForms)
        .where(
          and(
            eq(StudentEvaluationForms.id, id),
            includeArchived ? undefined : isNull(StudentEvaluationForms.deleted_at),
          ),
        );

      if (!form) throw new AppError(404, "Student evaluation form not found.");
      return form;
    });
  }

  getStudentForms(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<IStudentEvalFormSelect[]>, AppError> {
    return ValidateSchema(EvaluationFormQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, is_archived, sort_by, order } = parsed;

      const filters: SQL[] = [
        is_archived
          ? isNotNull(StudentEvaluationForms.deleted_at)
          : isNull(StudentEvaluationForms.deleted_at),
      ];

      if (search) {
        filters.push(ilike(StudentEvaluationForms.title, `%${search}%`));
      }

      const whereCondition = and(...filters);
      const orderByClause =
        order === "asc"
          ? asc(StudentEvaluationForms[sort_by])
          : desc(StudentEvaluationForms[sort_by]);

      return WithTransaction(client, async (tx) => {
        const baseQuery = tx
          .select()
          .from(StudentEvaluationForms)
          .where(whereCondition)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const forms = await baseQuery;
          return createPaginatedData({
            data: forms,
            currentPage: 1,
            pageSize: forms.length,
            totalItems: forms.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedQuery = baseQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(StudentEvaluationForms.id) })
          .from(StudentEvaluationForms)
          .where(whereCondition);

        const [forms, countResult] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        return createPaginatedData({
          data: forms,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  updateStudentForm(
    id: number,
    info: IStudentEvalFormUpdate,
    client: DbClient = db,
  ): ResultAsync<IStudentEvalFormSelect, AppError> {
    return ValidateSchema(StudentEvalFormUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const existing = await this.getStudentFormById(id, false, tx);
        if (existing.isErr()) throw existing.error;

        if (parsed.title && parsed.title !== existing.value.title) {
          const [conflict] = await tx
            .select({ id: StudentEvaluationForms.id })
            .from(StudentEvaluationForms)
            .where(
              and(
                ne(StudentEvaluationForms.id, id),
                eq(StudentEvaluationForms.title, parsed.title),
                isNull(StudentEvaluationForms.deleted_at),
              ),
            );

          if (conflict) {
            throw new AppError(
              409,
              `A student evaluation form titled "${parsed.title}" already exists.`,
            );
          }
        }

        const [updated] = await tx
          .update(StudentEvaluationForms)
          .set({ ...parsed, updated_at: new Date() })
          .where(eq(StudentEvaluationForms.id, id))
          .returning();

        if (!updated) throw new AppError(404, "Student evaluation form not found.");
        return updated;
      });
    });
  }

  deleteStudentForm(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getStudentFormById(id, false, tx);
      if (existing.isErr()) throw existing.error;

      const deleteTime = new Date();

      const [deleted] = await tx
        .update(StudentEvaluationForms)
        .set({ deleted_at: deleteTime })
        .where(and(eq(StudentEvaluationForms.id, id), isNull(StudentEvaluationForms.deleted_at)))
        .returning({ id: StudentEvaluationForms.id });

      if (!deleted) throw new AppError(404, "Form not found or already archived.");

      // Cascade soft-delete
      await tx
        .update(StudentEvaluationCategories)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(StudentEvaluationCategories.form_id, id),
            isNull(StudentEvaluationCategories.deleted_at),
          ),
        );

      return undefined;
    });
  }

  restoreStudentForm(
    id: number,
    client: DbClient = db,
  ): ResultAsync<GetStudentEvaluationForm, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getStudentFormById(id, true, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at) {
        throw new AppError(400, "This evaluation form is already active.");
      }

      // Conflict check on active form title
      const [conflict] = await tx
        .select({ id: StudentEvaluationForms.id })
        .from(StudentEvaluationForms)
        .where(
          and(
            ne(StudentEvaluationForms.id, id),
            eq(StudentEvaluationForms.title, current.title),
            isNull(StudentEvaluationForms.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(
          409,
          `Cannot restore: An active form titled "${current.title}" already exists.`,
        );
      }

      // Restore form & categories
      await tx
        .update(StudentEvaluationForms)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentEvaluationForms.id, id));

      await tx
        .update(StudentEvaluationCategories)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentEvaluationCategories.form_id, id));

      const fullRecord = await this.getStudentFormById(id, false, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      return fullRecord.value;
    });
  }

  // =========================================================================
  // 2. SUPERVISOR INSTRUMENTS (SEF)
  // =========================================================================

  createSupervisorForm(
    info: ISupervisorEvalFormInsert,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalFormSelect, AppError> {
    return ValidateSchema(SupervisorEvalFormInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [existing] = await tx
          .select()
          .from(SupervisorEvaluationForms)
          .where(eq(SupervisorEvaluationForms.title, parsed.title));

        if (existing) {
          if (existing.deleted_at === null) {
            throw new AppError(409, `A supervisor form titled "${parsed.title}" already exists.`);
          }

          const [reactivated] = await tx
            .update(SupervisorEvaluationForms)
            .set({
              description: parsed.description,
              min_rating: parsed.min_rating,
              max_rating: parsed.max_rating,
              deleted_at: null,
              updated_at: new Date(),
            })
            .where(eq(SupervisorEvaluationForms.id, existing.id))
            .returning();

          if (!reactivated)
            throw new AppError(500, "Failed to reactivate supervisor evaluation form.");
          return reactivated;
        }

        const [created] = await tx.insert(SupervisorEvaluationForms).values(parsed).returning();

        if (!created) throw new AppError(500, "Failed to create supervisor evaluation form.");
        return created;
      });
    });
  }

  getSupervisorFormById(
    id: number,
    includeArchived = false,
    client: DbClient = db,
  ): ResultAsync<GetSupervisorEvaluationForm, AppError> {
    return WithTransaction(client, async (tx) => {
      const [form] = await tx
        .select({
          id: SupervisorEvaluationForms.id,
          title: SupervisorEvaluationForms.title,
          description: SupervisorEvaluationForms.description,
          min_rating: SupervisorEvaluationForms.min_rating,
          max_rating: SupervisorEvaluationForms.max_rating,
          created_at: SupervisorEvaluationForms.created_at,
          updated_at: SupervisorEvaluationForms.updated_at,
          deleted_at: SupervisorEvaluationForms.deleted_at,
          categories: sql<GetSupervisorEvaluationForm["categories"]>`
            COALESCE(
              (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', ${SupervisorEvaluationCategories.id},
                    'form_id', ${SupervisorEvaluationCategories.form_id},
                    'parent_id', ${SupervisorEvaluationCategories.parent_id},
                    'name', ${SupervisorEvaluationCategories.name},
                    'description', ${SupervisorEvaluationCategories.description},
                    'order', ${SupervisorEvaluationCategories.order},
                    'version', ${SupervisorEvaluationCategories.version},
                    'created_at', ${SupervisorEvaluationCategories.created_at},
                    'updated_at', ${SupervisorEvaluationCategories.updated_at},
                    'deleted_at', ${SupervisorEvaluationCategories.deleted_at},
                    'questions', COALESCE(
                      (
                        SELECT JSON_AGG(
                          JSON_BUILD_OBJECT(
                            'id', ${SupervisorEvaluationQuestions.id},
                            'category_id', ${SupervisorEvaluationQuestions.category_id},
                            'parent_id', ${SupervisorEvaluationQuestions.parent_id},
                            'question', ${SupervisorEvaluationQuestions.question},
                            'max_rating', ${SupervisorEvaluationQuestions.max_rating},
                            'order', ${SupervisorEvaluationQuestions.order},
                            'version', ${SupervisorEvaluationQuestions.version},
                            'created_at', ${SupervisorEvaluationQuestions.created_at},
                            'updated_at', ${SupervisorEvaluationQuestions.updated_at},
                            'deleted_at', ${SupervisorEvaluationQuestions.deleted_at},
                            'means', COALESCE(
                              (
                                SELECT JSON_AGG(
                                  JSON_BUILD_OBJECT(
                                    'id', ${SupervisorEvaluationMeans.id},
                                    'question_id', ${SupervisorEvaluationMeans.question_id},
                                    'parent_id', ${SupervisorEvaluationMeans.parent_id},
                                    'descriptor', ${SupervisorEvaluationMeans.descriptor},
                                    'order', ${SupervisorEvaluationMeans.order},
                                    'version', ${SupervisorEvaluationMeans.version},
                                    'created_at', ${SupervisorEvaluationMeans.created_at},
                                    'updated_at', ${SupervisorEvaluationMeans.updated_at},
                                    'deleted_at', ${SupervisorEvaluationMeans.deleted_at}
                                  )
                                  ORDER BY ${SupervisorEvaluationMeans.order} ASC
                                )
                                FROM ${SupervisorEvaluationMeans}
                                WHERE ${SupervisorEvaluationMeans.question_id} = ${SupervisorEvaluationQuestions.id}
                                  AND ${SupervisorEvaluationMeans.deleted_at} IS NULL
                              ),
                              '[]'::json
                            )
                          )
                          ORDER BY ${SupervisorEvaluationQuestions.order} ASC
                        )
                        FROM ${SupervisorEvaluationQuestions}
                        WHERE ${SupervisorEvaluationQuestions.category_id} = ${SupervisorEvaluationCategories.id}
                          AND ${SupervisorEvaluationQuestions.deleted_at} IS NULL
                      ),
                      '[]'::json
                    )
                  )
                  ORDER BY ${SupervisorEvaluationCategories.order} ASC
                )
                FROM ${SupervisorEvaluationCategories}
                WHERE ${SupervisorEvaluationCategories.form_id} = ${SupervisorEvaluationForms.id}
                  AND ${SupervisorEvaluationCategories.deleted_at} IS NULL
              ),
              '[]'::json
            )
          `,
        })
        .from(SupervisorEvaluationForms)
        .where(
          and(
            eq(SupervisorEvaluationForms.id, id),
            includeArchived ? undefined : isNull(SupervisorEvaluationForms.deleted_at),
          ),
        );

      if (!form) throw new AppError(404, "Supervisor evaluation form not found.");
      return form;
    });
  }

  getSupervisorForms(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<ISupervisorEvalFormSelect[]>, AppError> {
    return ValidateSchema(EvaluationFormQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, is_archived, sort_by, order } = parsed;

      const filters: SQL[] = [
        is_archived
          ? isNotNull(SupervisorEvaluationForms.deleted_at)
          : isNull(SupervisorEvaluationForms.deleted_at),
      ];

      if (search) {
        filters.push(ilike(SupervisorEvaluationForms.title, `%${search}%`));
      }

      const whereCondition = and(...filters);
      const orderByClause =
        order === "asc"
          ? asc(SupervisorEvaluationForms[sort_by])
          : desc(SupervisorEvaluationForms[sort_by]);

      return WithTransaction(client, async (tx) => {
        const baseQuery = tx
          .select()
          .from(SupervisorEvaluationForms)
          .where(whereCondition)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const forms = await baseQuery;
          return createPaginatedData({
            data: forms,
            currentPage: 1,
            pageSize: forms.length,
            totalItems: forms.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedQuery = baseQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(SupervisorEvaluationForms.id) })
          .from(SupervisorEvaluationForms)
          .where(whereCondition);

        const [forms, countResult] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        return createPaginatedData({
          data: forms,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  updateSupervisorForm(
    id: number,
    info: ISupervisorEvalFormUpdate,
    client: DbClient = db,
  ): ResultAsync<ISupervisorEvalFormSelect, AppError> {
    return ValidateSchema(SupervisorEvalFormUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const existing = await this.getSupervisorFormById(id, false, tx);
        if (existing.isErr()) throw existing.error;

        if (parsed.title && parsed.title !== existing.value.title) {
          const [conflict] = await tx
            .select({ id: SupervisorEvaluationForms.id })
            .from(SupervisorEvaluationForms)
            .where(
              and(
                ne(SupervisorEvaluationForms.id, id),
                eq(SupervisorEvaluationForms.title, parsed.title),
                isNull(SupervisorEvaluationForms.deleted_at),
              ),
            );

          if (conflict) {
            throw new AppError(409, `A supervisor form titled "${parsed.title}" already exists.`);
          }
        }

        const [updated] = await tx
          .update(SupervisorEvaluationForms)
          .set({ ...parsed, updated_at: new Date() })
          .where(eq(SupervisorEvaluationForms.id, id))
          .returning();

        if (!updated) throw new AppError(404, "Supervisor evaluation form not found.");
        return updated;
      });
    });
  }

  deleteSupervisorForm(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getSupervisorFormById(id, false, tx);
      if (existing.isErr()) throw existing.error;

      const deleteTime = new Date();

      const [deleted] = await tx
        .update(SupervisorEvaluationForms)
        .set({ deleted_at: deleteTime })
        .where(
          and(eq(SupervisorEvaluationForms.id, id), isNull(SupervisorEvaluationForms.deleted_at)),
        )
        .returning({ id: SupervisorEvaluationForms.id });

      if (!deleted) throw new AppError(404, "Form not found or already archived.");

      await tx
        .update(SupervisorEvaluationCategories)
        .set({ deleted_at: deleteTime })
        .where(
          and(
            eq(SupervisorEvaluationCategories.form_id, id),
            isNull(SupervisorEvaluationCategories.deleted_at),
          ),
        );

      return undefined;
    });
  }

  restoreSupervisorForm(
    id: number,
    client: DbClient = db,
  ): ResultAsync<GetSupervisorEvaluationForm, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getSupervisorFormById(id, true, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at) {
        throw new AppError(400, "This evaluation form is already active.");
      }

      const [conflict] = await tx
        .select({ id: SupervisorEvaluationForms.id })
        .from(SupervisorEvaluationForms)
        .where(
          and(
            ne(SupervisorEvaluationForms.id, id),
            eq(SupervisorEvaluationForms.title, current.title),
            isNull(SupervisorEvaluationForms.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(
          409,
          `Cannot restore: An active supervisor form titled "${current.title}" already exists.`,
        );
      }

      await tx
        .update(SupervisorEvaluationForms)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationForms.id, id));

      await tx
        .update(SupervisorEvaluationCategories)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationCategories.form_id, id));

      const fullRecord = await this.getSupervisorFormById(id, false, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      return fullRecord.value;
    });
  }
}
