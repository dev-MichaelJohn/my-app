import db, { type PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  AuditLogs,
  Colleges,
  Programs,
  Courses,
  Classes,
  CourseCurriculums,
  Faculties,
  CourseOfferings,
  Accounts,
  PersonalDetails,
  AuditLogQuerySchema,
  type IAuditLogSelect,
  type PaginatedData,
  type RecordAuditInput,
  type GetUser,
} from "@my-app/shared";
import { and, desc, eq, ilike, or, gte, lte, countDistinct, type SQL } from "drizzle-orm";
import { type ResultAsync } from "neverthrow";

export interface IAuditService {
  record(input: RecordAuditInput, client?: DbClient): ResultAsync<IAuditLogSelect, AppError>;
  getAuditLogs(query: unknown): ResultAsync<PaginatedData<IAuditLogSelect[]>, AppError>;
  rollback(
    auditLogId: number,
    actorUser: GetUser,
    client?: DbClient,
  ): ResultAsync<{ message: string; restoredEntity: string }, AppError>;
}

export class AuditService implements IAuditService {
  record(input: RecordAuditInput, client: DbClient = db): ResultAsync<IAuditLogSelect, AppError> {
    return WithTransaction(client, async (tx) => {
      const [inserted] = await tx
        .insert(AuditLogs)
        .values({
          actor_id: input.actorId ?? null,
          actor_email: input.actorEmail,
          actor_name: input.actorName,
          action: input.action,
          entity: input.entity,
          entity_id: input.entityId,
          entity_name: input.entityName,
          diff: input.diff ?? null,
          ip_address: input.ipAddress ?? null,
          user_agent: input.userAgent ?? null,
          is_rollbackable: input.isRollbackable ?? true,
        })
        .returning();

      return inserted!;
    });
  }

  getAuditLogs(rawQuery: unknown): ResultAsync<PaginatedData<IAuditLogSelect[]>, AppError> {
    return ValidateSchema(AuditLogQuerySchema, rawQuery).asyncAndThen((query) => {
      const { paginate, page, limit, search, entity, action, actor_id, start_date, end_date } =
        query;

      const filters: SQL[] = [];

      if (search) {
        const term = `%${search}%`;
        filters.push(
          or(
            ilike(AuditLogs.actor_name, term),
            ilike(AuditLogs.actor_email, term),
            ilike(AuditLogs.entity_name, term),
            ilike(AuditLogs.entity, term),
          )!,
        );
      }

      if (entity) filters.push(eq(AuditLogs.entity, entity));
      if (action) filters.push(eq(AuditLogs.action, action));
      if (actor_id) filters.push(eq(AuditLogs.actor_id, actor_id));
      if (start_date) filters.push(gte(AuditLogs.created_at, new Date(start_date)));
      if (end_date) filters.push(lte(AuditLogs.created_at, new Date(end_date)));

      const whereCondition = filters.length > 0 ? and(...filters) : undefined;

      return WithTransaction(db, async (tx) => {
        const baseQuery = tx
          .select()
          .from(AuditLogs)
          .where(whereCondition)
          .orderBy(desc(AuditLogs.created_at))
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
        const [results, countRes] = await Promise.all([
          baseQuery.limit(limit).offset(offset),
          tx
            .select({ total: countDistinct(AuditLogs.id) })
            .from(AuditLogs)
            .where(whereCondition),
        ]);

        return createPaginatedData({
          data: results,
          currentPage: page,
          pageSize: limit,
          totalItems: countRes[0]?.total ?? 0,
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POINT-IN-TIME ROLLBACK HANDLER
  // ══════════════════════════════════════════════════════════════════════════
  rollback(
    auditLogId: number,
    actorUser: GetUser,
    client: DbClient = db,
  ): ResultAsync<{ message: string; restoredEntity: string }, AppError> {
    return WithTransaction(client, async (tx) => {
      const [targetLog] = await tx.select().from(AuditLogs).where(eq(AuditLogs.id, auditLogId));

      if (!targetLog) throw new AppError(404, "Audit log record not found.");
      if (targetLog.rolled_back_at) {
        throw new AppError(400, "This action has already been rolled back.");
      }
      if (!targetLog.is_rollbackable) {
        throw new AppError(400, "This action cannot be rolled back.");
      }

      const { entity, entity_id, action, diff } = targetLog;
      const oldVals = diff?.oldValues;

      // ── Revert based on action ──
      switch (action) {
        case "UPDATE": {
          if (!oldVals) throw new AppError(400, "Cannot rollback: No previous values captured.");
          await this.revertUpdate(entity, entity_id, oldVals, tx);
          break;
        }

        case "DELETE": {
          // Reverting deletion means restoring the record
          await this.revertDelete(entity, entity_id, tx);
          break;
        }

        case "CREATE": {
          // Reverting creation means soft-deleting the newly created record
          await this.revertCreate(entity, entity_id, tx);
          break;
        }

        case "RESTORE": {
          // Reverting a restore means soft-deleting the record again
          await this.revertCreate(entity, entity_id, tx);
          break;
        }

        default:
          throw new AppError(400, `Rollback is not supported for action type "${action}".`);
      }

      // Mark original audit log as rolled back
      const now = new Date();
      await tx
        .update(AuditLogs)
        .set({
          rolled_back_at: now,
          rolled_back_by: actorUser.account.id,
        })
        .where(eq(AuditLogs.id, auditLogId));

      // Append new rollback audit entry
      await tx.insert(AuditLogs).values({
        actor_id: actorUser.account.id,
        actor_email: actorUser.account.email,
        actor_name: `${actorUser.details.first_name} ${actorUser.details.last_name}`,
        action: "ROLLBACK",
        entity: targetLog.entity,
        entity_id: targetLog.entity_id,
        entity_name: targetLog.entity_name,
        diff: {
          oldValues: diff?.newValues,
          newValues: diff?.oldValues,
        },
        is_rollbackable: false,
      });

      return {
        message: `Successfully rolled back ${action.toLowerCase()} on ${targetLog.entity_name}.`,
        restoredEntity: targetLog.entity_name,
      };
    });
  }

  private async revertUpdate(
    entity: string,
    entityId: number,
    oldValues: Record<string, any>,
    tx: PgTransaction,
  ) {
    const tableMap: Record<string, any> = {
      colleges: Colleges,
      programs: Programs,
      courses: Courses,
      classes: Classes,
      curriculums: CourseCurriculums,
      faculties: Faculties,
      offerings: CourseOfferings,
      personal_details: PersonalDetails,
      accounts: Accounts,
    };

    const targetTable = tableMap[entity];
    if (!targetTable)
      throw new AppError(400, `Entity "${entity}" is not supported for automated rollback.`);

    await tx
      .update(targetTable)
      .set({ ...oldValues, updated_at: new Date() })
      .where(eq(targetTable.id, entityId));
  }

  private async revertDelete(entity: string, entityId: number, tx: PgTransaction) {
    const tableMap: Record<string, any> = {
      colleges: Colleges,
      programs: Programs,
      courses: Courses,
      classes: Classes,
      curriculums: CourseCurriculums,
      faculties: Faculties,
      offerings: CourseOfferings,
    };

    const targetTable = tableMap[entity];
    if (!targetTable) throw new AppError(400, `Entity "${entity}" is not supported for rollback.`);

    await tx
      .update(targetTable)
      .set({ deleted_at: null, updated_at: new Date() })
      .where(eq(targetTable.id, entityId));
  }

  private async revertCreate(entity: string, entityId: number, tx: PgTransaction) {
    const tableMap: Record<string, any> = {
      colleges: Colleges,
      programs: Programs,
      courses: Courses,
      classes: Classes,
      curriculums: CourseCurriculums,
      faculties: Faculties,
      offerings: CourseOfferings,
    };

    const targetTable = tableMap[entity];
    if (!targetTable) throw new AppError(400, `Entity "${entity}" is not supported for rollback.`);

    await tx
      .update(targetTable)
      .set({ deleted_at: new Date() })
      .where(eq(targetTable.id, entityId));
  }
}
