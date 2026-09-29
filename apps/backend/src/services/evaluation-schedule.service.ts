import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  type SQL,
} from "drizzle-orm";
import { errAsync, type ResultAsync } from "neverthrow";
import db from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import {
  Semesters,
  StudentEvaluationForms,
  StudentEvaluationSchedules,
  SupervisorEvaluationForms,
  SupervisorEvaluationSchedules,
  EvaluationScheduleQuerySchema,
  StudentScheduleInsert,
  StudentScheduleUpdate,
  SupervisorScheduleInsert,
  SupervisorScheduleUpdate,
  type GetStudentSchedule,
  type GetSupervisorSchedule,
  type IStudentScheduleInsert,
  type IStudentScheduleUpdate,
  type ISupervisorScheduleInsert,
  type ISupervisorScheduleUpdate,
  type PaginatedData,
} from "@my-app/shared";

export interface IEvaluationScheduleService {
  // Student Schedules (SET)
  getStudentScheduleById(
    id: number,
    includeArchived?: boolean,
    client?: DbClient,
  ): ResultAsync<GetStudentSchedule, AppError>;
  getActiveStudentSchedule(
    semesterId?: number,
    client?: DbClient,
  ): ResultAsync<GetStudentSchedule | null, AppError>;
  getStudentSchedules(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetStudentSchedule[]>, AppError>;
  createStudentSchedule(
    info: IStudentScheduleInsert,
    client?: DbClient,
  ): ResultAsync<GetStudentSchedule, AppError>;
  updateStudentSchedule(
    id: number,
    info: IStudentScheduleUpdate,
    client?: DbClient,
  ): ResultAsync<GetStudentSchedule, AppError>;
  deleteStudentSchedule(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreStudentSchedule(id: number, client?: DbClient): ResultAsync<GetStudentSchedule, AppError>;

  // Supervisor Schedules (SEF)
  getSupervisorScheduleById(
    id: number,
    includeArchived?: boolean,
    client?: DbClient,
  ): ResultAsync<GetSupervisorSchedule, AppError>;
  getActiveSupervisorSchedule(
    semesterId?: number,
    client?: DbClient,
  ): ResultAsync<GetSupervisorSchedule | null, AppError>;
  getSupervisorSchedules(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetSupervisorSchedule[]>, AppError>;
  createSupervisorSchedule(
    info: ISupervisorScheduleInsert,
    client?: DbClient,
  ): ResultAsync<GetSupervisorSchedule, AppError>;
  updateSupervisorSchedule(
    id: number,
    info: ISupervisorScheduleUpdate,
    client?: DbClient,
  ): ResultAsync<GetSupervisorSchedule, AppError>;
  deleteSupervisorSchedule(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreSupervisorSchedule(
    id: number,
    client?: DbClient,
  ): ResultAsync<GetSupervisorSchedule, AppError>;
}

export class EvaluationScheduleService implements IEvaluationScheduleService {
  // =========================================================================
  // 1. STUDENT EVALUATION SCHEDULES (SET)
  // =========================================================================

  getStudentScheduleById(
    id: number,
    includeArchived = false,
    client: DbClient = db,
  ): ResultAsync<GetStudentSchedule, AppError> {
    return WithTransaction(client, async (tx) => {
      const [record] = await tx
        .select({
          id: StudentEvaluationSchedules.id,
          open_at: StudentEvaluationSchedules.open_at,
          close_at: StudentEvaluationSchedules.close_at,
          created_at: StudentEvaluationSchedules.created_at,
          updated_at: StudentEvaluationSchedules.updated_at,
          deleted_at: StudentEvaluationSchedules.deleted_at,
          semester: Semesters,
          form: StudentEvaluationForms,
        })
        .from(StudentEvaluationSchedules)
        .innerJoin(Semesters, eq(StudentEvaluationSchedules.semester_id, Semesters.id))
        .innerJoin(
          StudentEvaluationForms,
          eq(StudentEvaluationSchedules.form_id, StudentEvaluationForms.id),
        )
        .where(
          and(
            eq(StudentEvaluationSchedules.id, id),
            includeArchived ? undefined : isNull(StudentEvaluationSchedules.deleted_at),
          ),
        );

      if (!record) {
        throw new AppError(404, "Student evaluation schedule was not found.");
      }

      return record;
    });
  }

  getActiveStudentSchedule(
    semesterId?: number,
    client: DbClient = db,
  ): ResultAsync<GetStudentSchedule | null, AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

      const [activeSchedule] = await tx
        .select({
          id: StudentEvaluationSchedules.id,
          open_at: StudentEvaluationSchedules.open_at,
          close_at: StudentEvaluationSchedules.close_at,
          created_at: StudentEvaluationSchedules.created_at,
          updated_at: StudentEvaluationSchedules.updated_at,
          deleted_at: StudentEvaluationSchedules.deleted_at,
          semester: Semesters,
          form: StudentEvaluationForms,
        })
        .from(StudentEvaluationSchedules)
        .innerJoin(Semesters, eq(StudentEvaluationSchedules.semester_id, Semesters.id))
        .innerJoin(
          StudentEvaluationForms,
          eq(StudentEvaluationSchedules.form_id, StudentEvaluationForms.id),
        )
        .where(
          and(
            semesterId ? eq(StudentEvaluationSchedules.semester_id, semesterId) : undefined,
            lte(StudentEvaluationSchedules.open_at, now),
            gte(StudentEvaluationSchedules.close_at, now),
            isNull(StudentEvaluationSchedules.deleted_at),
            isNull(Semesters.deleted_at),
            isNull(StudentEvaluationForms.deleted_at),
          ),
        )
        .orderBy(desc(StudentEvaluationSchedules.open_at))
        .limit(1);

      return activeSchedule ?? null;
    });
  }

  getStudentSchedules(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetStudentSchedule[]>, AppError> {
    return ValidateSchema(EvaluationScheduleQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, semester_id, form_id, is_archived, sort_by, order } =
        parsed;

      const filters: SQL[] = [
        is_archived
          ? isNotNull(StudentEvaluationSchedules.deleted_at)
          : isNull(StudentEvaluationSchedules.deleted_at),
        isNull(Semesters.deleted_at),
        isNull(StudentEvaluationForms.deleted_at),
      ];

      if (search) {
        filters.push(ilike(StudentEvaluationForms.title, `%${search}%`));
      }

      if (semester_id) filters.push(eq(StudentEvaluationSchedules.semester_id, semester_id));
      if (form_id) filters.push(eq(StudentEvaluationSchedules.form_id, form_id));

      const whereCondition = and(...filters);
      const orderByClause =
        order === "asc"
          ? asc(StudentEvaluationSchedules[sort_by])
          : desc(StudentEvaluationSchedules[sort_by]);

      return WithTransaction(client, async (tx) => {
        const baseQuery = tx
          .select({
            id: StudentEvaluationSchedules.id,
            open_at: StudentEvaluationSchedules.open_at,
            close_at: StudentEvaluationSchedules.close_at,
            created_at: StudentEvaluationSchedules.created_at,
            updated_at: StudentEvaluationSchedules.updated_at,
            deleted_at: StudentEvaluationSchedules.deleted_at,
            semester: Semesters,
            form: StudentEvaluationForms,
          })
          .from(StudentEvaluationSchedules)
          .innerJoin(Semesters, eq(StudentEvaluationSchedules.semester_id, Semesters.id))
          .innerJoin(
            StudentEvaluationForms,
            eq(StudentEvaluationSchedules.form_id, StudentEvaluationForms.id),
          )
          .where(whereCondition)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const results = await baseQuery;
          return createPaginatedData({
            data: results,
            currentPage: 1,
            pageSize: results.length,
            totalItems: results.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedQuery = baseQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(StudentEvaluationSchedules.id) })
          .from(StudentEvaluationSchedules)
          .innerJoin(Semesters, eq(StudentEvaluationSchedules.semester_id, Semesters.id))
          .innerJoin(
            StudentEvaluationForms,
            eq(StudentEvaluationSchedules.form_id, StudentEvaluationForms.id),
          )
          .where(whereCondition);

        const [results, countResult] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        return createPaginatedData({
          data: results,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createStudentSchedule(
    info: IStudentScheduleInsert,
    client: DbClient = db,
  ): ResultAsync<GetStudentSchedule, AppError> {
    return ValidateSchema(StudentScheduleInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        // A. Verify Semester is active
        const [semester] = await tx
          .select({ id: Semesters.id })
          .from(Semesters)
          .where(and(eq(Semesters.id, parsed.semester_id), isNull(Semesters.deleted_at)));
        if (!semester) throw new AppError(404, "Academic semester was not found or is inactive.");

        // B. Verify Form is active
        const [form] = await tx
          .select({ id: StudentEvaluationForms.id })
          .from(StudentEvaluationForms)
          .where(
            and(
              eq(StudentEvaluationForms.id, parsed.form_id),
              isNull(StudentEvaluationForms.deleted_at),
            ),
          );
        if (!form) throw new AppError(404, "Student evaluation form was not found or is inactive.");

        // C. Check unique constraint (semester_id, form_id)
        const [conflict] = await tx
          .select({ id: StudentEvaluationSchedules.id })
          .from(StudentEvaluationSchedules)
          .where(
            and(
              eq(StudentEvaluationSchedules.semester_id, parsed.semester_id),
              eq(StudentEvaluationSchedules.form_id, parsed.form_id),
              isNull(StudentEvaluationSchedules.deleted_at),
            ),
          );

        if (conflict) {
          throw new AppError(
            409,
            "A schedule for this evaluation form and semester already exists.",
          );
        }

        const [created] = await tx.insert(StudentEvaluationSchedules).values(parsed).returning();
        if (!created) throw new AppError(500, "Failed to schedule student evaluation.");

        const fullRecord = await this.getStudentScheduleById(created.id, false, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  updateStudentSchedule(
    id: number,
    info: IStudentScheduleUpdate,
    client: DbClient = db,
  ): ResultAsync<GetStudentSchedule, AppError> {
    return ValidateSchema(StudentScheduleUpdate, info).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) return errAsync(new AppError(400, "No update parameters were provided."));

      return WithTransaction(client, async (tx) => {
        const existing = await this.getStudentScheduleById(id, false, tx);
        if (existing.isErr()) throw existing.error;

        const [updated] = await tx
          .update(StudentEvaluationSchedules)
          .set(parsed)
          .where(
            and(
              eq(StudentEvaluationSchedules.id, id),
              isNull(StudentEvaluationSchedules.deleted_at),
            ),
          )
          .returning();

        if (!updated) throw new AppError(500, "Failed to update evaluation schedule.");

        const fullRecord = await this.getStudentScheduleById(id, false, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  deleteStudentSchedule(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getStudentScheduleById(id, false, tx);
      if (existing.isErr()) throw existing.error;

      const [deleted] = await tx
        .update(StudentEvaluationSchedules)
        .set({ deleted_at: new Date() })
        .where(
          and(eq(StudentEvaluationSchedules.id, id), isNull(StudentEvaluationSchedules.deleted_at)),
        )
        .returning({ id: StudentEvaluationSchedules.id });

      if (!deleted) throw new AppError(404, "Schedule not found or already archived.");
    });
  }

  restoreStudentSchedule(
    id: number,
    client: DbClient = db,
  ): ResultAsync<GetStudentSchedule, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getStudentScheduleById(id, true, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at) throw new AppError(400, "This schedule is already active.");

      const [restored] = await tx
        .update(StudentEvaluationSchedules)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(StudentEvaluationSchedules.id, id))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore evaluation schedule.");

      const fullRecord = await this.getStudentScheduleById(id, false, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      return fullRecord.value;
    });
  }

  // =========================================================================
  // 2. SUPERVISOR EVALUATION SCHEDULES (SEF)
  // =========================================================================

  getSupervisorScheduleById(
    id: number,
    includeArchived = false,
    client: DbClient = db,
  ): ResultAsync<GetSupervisorSchedule, AppError> {
    return WithTransaction(client, async (tx) => {
      const [record] = await tx
        .select({
          id: SupervisorEvaluationSchedules.id,
          open_at: SupervisorEvaluationSchedules.open_at,
          close_at: SupervisorEvaluationSchedules.close_at,
          created_at: SupervisorEvaluationSchedules.created_at,
          updated_at: SupervisorEvaluationSchedules.updated_at,
          deleted_at: SupervisorEvaluationSchedules.deleted_at,
          semester: Semesters,
          form: SupervisorEvaluationForms,
        })
        .from(SupervisorEvaluationSchedules)
        .innerJoin(Semesters, eq(SupervisorEvaluationSchedules.semester_id, Semesters.id))
        .innerJoin(
          SupervisorEvaluationForms,
          eq(SupervisorEvaluationSchedules.form_id, SupervisorEvaluationForms.id),
        )
        .where(
          and(
            eq(SupervisorEvaluationSchedules.id, id),
            includeArchived ? undefined : isNull(SupervisorEvaluationSchedules.deleted_at),
          ),
        );

      if (!record) {
        throw new AppError(404, "Supervisor evaluation schedule was not found.");
      }

      return record;
    });
  }

  getActiveSupervisorSchedule(
    semesterId?: number,
    client: DbClient = db,
  ): ResultAsync<GetSupervisorSchedule | null, AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

      const [activeSchedule] = await tx
        .select({
          id: SupervisorEvaluationSchedules.id,
          open_at: SupervisorEvaluationSchedules.open_at,
          close_at: SupervisorEvaluationSchedules.close_at,
          created_at: SupervisorEvaluationSchedules.created_at,
          updated_at: SupervisorEvaluationSchedules.updated_at,
          deleted_at: SupervisorEvaluationSchedules.deleted_at,
          semester: Semesters,
          form: SupervisorEvaluationForms,
        })
        .from(SupervisorEvaluationSchedules)
        .innerJoin(Semesters, eq(SupervisorEvaluationSchedules.semester_id, Semesters.id))
        .innerJoin(
          SupervisorEvaluationForms,
          eq(SupervisorEvaluationSchedules.form_id, SupervisorEvaluationForms.id),
        )
        .where(
          and(
            semesterId ? eq(SupervisorEvaluationSchedules.semester_id, semesterId) : undefined,
            lte(SupervisorEvaluationSchedules.open_at, now),
            gte(SupervisorEvaluationSchedules.close_at, now),
            isNull(SupervisorEvaluationSchedules.deleted_at),
            isNull(Semesters.deleted_at),
            isNull(SupervisorEvaluationForms.deleted_at),
          ),
        )
        .orderBy(desc(SupervisorEvaluationSchedules.open_at))
        .limit(1);

      return activeSchedule ?? null;
    });
  }

  getSupervisorSchedules(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetSupervisorSchedule[]>, AppError> {
    return ValidateSchema(EvaluationScheduleQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, semester_id, form_id, is_archived, sort_by, order } =
        parsed;

      const filters: SQL[] = [
        is_archived
          ? isNotNull(SupervisorEvaluationSchedules.deleted_at)
          : isNull(SupervisorEvaluationSchedules.deleted_at),
        isNull(Semesters.deleted_at),
        isNull(SupervisorEvaluationForms.deleted_at),
      ];

      if (search) {
        filters.push(ilike(SupervisorEvaluationForms.title, `%${search}%`));
      }

      if (semester_id) filters.push(eq(SupervisorEvaluationSchedules.semester_id, semester_id));
      if (form_id) filters.push(eq(SupervisorEvaluationSchedules.form_id, form_id));

      const whereCondition = and(...filters);
      const orderByClause =
        order === "asc"
          ? asc(SupervisorEvaluationSchedules[sort_by])
          : desc(SupervisorEvaluationSchedules[sort_by]);

      return WithTransaction(client, async (tx) => {
        const baseQuery = tx
          .select({
            id: SupervisorEvaluationSchedules.id,
            open_at: SupervisorEvaluationSchedules.open_at,
            close_at: SupervisorEvaluationSchedules.close_at,
            created_at: SupervisorEvaluationSchedules.created_at,
            updated_at: SupervisorEvaluationSchedules.updated_at,
            deleted_at: SupervisorEvaluationSchedules.deleted_at,
            semester: Semesters,
            form: SupervisorEvaluationForms,
          })
          .from(SupervisorEvaluationSchedules)
          .innerJoin(Semesters, eq(SupervisorEvaluationSchedules.semester_id, Semesters.id))
          .innerJoin(
            SupervisorEvaluationForms,
            eq(SupervisorEvaluationSchedules.form_id, SupervisorEvaluationForms.id),
          )
          .where(whereCondition)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const results = await baseQuery;
          return createPaginatedData({
            data: results,
            currentPage: 1,
            pageSize: results.length,
            totalItems: results.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedQuery = baseQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(SupervisorEvaluationSchedules.id) })
          .from(SupervisorEvaluationSchedules)
          .innerJoin(Semesters, eq(SupervisorEvaluationSchedules.semester_id, Semesters.id))
          .innerJoin(
            SupervisorEvaluationForms,
            eq(SupervisorEvaluationSchedules.form_id, SupervisorEvaluationForms.id),
          )
          .where(whereCondition);

        const [results, countResult] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        return createPaginatedData({
          data: results,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createSupervisorSchedule(
    info: ISupervisorScheduleInsert,
    client: DbClient = db,
  ): ResultAsync<GetSupervisorSchedule, AppError> {
    return ValidateSchema(SupervisorScheduleInsert, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [semester] = await tx
          .select({ id: Semesters.id })
          .from(Semesters)
          .where(and(eq(Semesters.id, parsed.semester_id), isNull(Semesters.deleted_at)));
        if (!semester) throw new AppError(404, "Academic semester not found or is inactive.");

        const [form] = await tx
          .select({ id: SupervisorEvaluationForms.id })
          .from(SupervisorEvaluationForms)
          .where(
            and(
              eq(SupervisorEvaluationForms.id, parsed.form_id),
              isNull(SupervisorEvaluationForms.deleted_at),
            ),
          );
        if (!form) throw new AppError(404, "Supervisor evaluation form not found or is inactive.");

        const [conflict] = await tx
          .select({ id: SupervisorEvaluationSchedules.id })
          .from(SupervisorEvaluationSchedules)
          .where(
            and(
              eq(SupervisorEvaluationSchedules.semester_id, parsed.semester_id),
              eq(SupervisorEvaluationSchedules.form_id, parsed.form_id),
              isNull(SupervisorEvaluationSchedules.deleted_at),
            ),
          );

        if (conflict) {
          throw new AppError(
            409,
            "A schedule for this supervisor form and semester already exists.",
          );
        }

        const [created] = await tx.insert(SupervisorEvaluationSchedules).values(parsed).returning();
        if (!created) throw new AppError(500, "Failed to schedule supervisor evaluation.");

        const fullRecord = await this.getSupervisorScheduleById(created.id, false, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  updateSupervisorSchedule(
    id: number,
    info: ISupervisorScheduleUpdate,
    client: DbClient = db,
  ): ResultAsync<GetSupervisorSchedule, AppError> {
    return ValidateSchema(SupervisorScheduleUpdate, info).asyncAndThen((parsed) => {
      const hasUpdates = Boolean(parsed && Object.keys(parsed).length > 0);
      if (!hasUpdates) return errAsync(new AppError(400, "No update parameters were provided."));

      return WithTransaction(client, async (tx) => {
        const existing = await this.getSupervisorScheduleById(id, false, tx);
        if (existing.isErr()) throw existing.error;

        const [updated] = await tx
          .update(SupervisorEvaluationSchedules)
          .set(parsed)
          .where(
            and(
              eq(SupervisorEvaluationSchedules.id, id),
              isNull(SupervisorEvaluationSchedules.deleted_at),
            ),
          )
          .returning();

        if (!updated) throw new AppError(500, "Failed to update supervisor schedule.");

        const fullRecord = await this.getSupervisorScheduleById(id, false, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        return fullRecord.value;
      });
    });
  }

  deleteSupervisorSchedule(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getSupervisorScheduleById(id, false, tx);
      if (existing.isErr()) throw existing.error;

      const [deleted] = await tx
        .update(SupervisorEvaluationSchedules)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(SupervisorEvaluationSchedules.id, id),
            isNull(SupervisorEvaluationSchedules.deleted_at),
          ),
        )
        .returning({ id: SupervisorEvaluationSchedules.id });

      if (!deleted) throw new AppError(404, "Schedule not found or already archived.");
    });
  }

  restoreSupervisorSchedule(
    id: number,
    client: DbClient = db,
  ): ResultAsync<GetSupervisorSchedule, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getSupervisorScheduleById(id, true, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.deleted_at) throw new AppError(400, "This schedule is already active.");

      const [restored] = await tx
        .update(SupervisorEvaluationSchedules)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(SupervisorEvaluationSchedules.id, id))
        .returning();

      if (!restored) throw new AppError(500, "Failed to restore supervisor schedule.");

      const fullRecord = await this.getSupervisorScheduleById(id, false, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      return fullRecord.value;
    });
  }
}
