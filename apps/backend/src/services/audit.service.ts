import db, { type PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  AuditLogs,
  Colleges,
  CollegeDeans,
  Programs,
  ProgramChairs,
  Courses,
  Classes,
  CourseCurriculums,
  Faculties,
  CourseOfferings,
  ClassStudents,
  StudentClasses,
  Accounts,
  PersonalDetails,
  AccountRoles,
  Roles,
  Semesters,
  StudentEvaluationForms,
  StudentEvaluationCategories,
  StudentEvaluationQuestions,
  SupervisorEvaluationForms,
  SupervisorEvaluationCategories,
  SupervisorEvaluationQuestions,
  SupervisorEvaluationMeans,
  StudentEvaluationSchedules,
  SupervisorEvaluationSchedules,
  IndividualFacultyReports,
  AuditLogQuerySchema,
  type IAuditLogSelect,
  type PaginatedData,
  type RecordAuditInput,
  type GetUser,
} from "@my-app/shared";
import {
  and,
  desc,
  eq,
  ilike,
  or,
  gte,
  lte,
  countDistinct,
  inArray,
  notInArray,
  isNull,
  ne,
  type SQL,
} from "drizzle-orm";
import { type ResultAsync } from "neverthrow";
import crypto from "node:crypto";

export interface IAuditService {
  record(input: RecordAuditInput, client?: DbClient): ResultAsync<IAuditLogSelect, AppError>;
  getAuditLogs(query: unknown): ResultAsync<PaginatedData<IAuditLogSelect[]>, AppError>;
  rollback(
    auditLogId: number,
    actorUser: GetUser,
    client?: DbClient,
    rollbackEntireTx?: boolean,
  ): ResultAsync<{ message: string; restoredEntity: string; revertedCount: number }, AppError>;
}

export class AuditService implements IAuditService {
  private tableMap: Record<string, any> = {
    colleges: Colleges,
    college_deans: CollegeDeans,
    programs: Programs,
    program_chairs: ProgramChairs,
    courses: Courses,
    classes: Classes,
    curriculums: CourseCurriculums,
    course_curriculums: CourseCurriculums,
    faculties: Faculties,
    offerings: CourseOfferings,
    course_offerings: CourseOfferings,
    class_students: ClassStudents,
    student_classes: StudentClasses,
    semesters: Semesters,
    accounts: Accounts,
    users: Accounts,
    personal_details: PersonalDetails,
    account_roles: AccountRoles,
    student_evaluation_forms: StudentEvaluationForms,
    student_evaluation_categories: StudentEvaluationCategories,
    student_evaluation_questions: StudentEvaluationQuestions,
    supervisor_evaluation_forms: SupervisorEvaluationForms,
    supervisor_evaluation_categories: SupervisorEvaluationCategories,
    supervisor_evaluation_questions: SupervisorEvaluationQuestions,
    supervisor_evaluation_means: SupervisorEvaluationMeans,
    student_evaluation_schedules: StudentEvaluationSchedules,
    supervisor_evaluation_schedules: SupervisorEvaluationSchedules,
    individual_faculty_reports: IndividualFacultyReports,
    evaluation_reports: IndividualFacultyReports,
  };

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
          transaction_id: input.transactionId ?? crypto.randomUUID(),
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
      const {
        paginate,
        page,
        limit,
        search,
        entity,
        action,
        actor_id,
        transaction_id,
        start_date,
        end_date,
      } = query;

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
      if (transaction_id) filters.push(eq(AuditLogs.transaction_id, transaction_id));
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
  // ATOMIC DATABASE TRANSACTION ROLLBACK
  // ══════════════════════════════════════════════════════════════════════════
  rollback(
    auditLogId: number,
    actorUser: GetUser,
    client: DbClient = db,
    rollbackEntireTx = true,
  ): ResultAsync<{ message: string; restoredEntity: string; revertedCount: number }, AppError> {
    return WithTransaction(client, async (tx) => {
      const [targetLog] = await tx.select().from(AuditLogs).where(eq(AuditLogs.id, auditLogId));

      if (!targetLog) throw new AppError(404, "Audit log record not found.");
      if (targetLog.rolled_back_at) {
        throw new AppError(400, "This action has already been rolled back.");
      }
      if (!targetLog.is_rollbackable) {
        throw new AppError(400, "This action cannot be rolled back.");
      }

      // Collect transaction cohort: reverse chronological order protects child dependencies
      let logsToRevert: (typeof AuditLogs.$inferSelect)[] = [targetLog];

      if (rollbackEntireTx && targetLog.transaction_id) {
        logsToRevert = await tx
          .select()
          .from(AuditLogs)
          .where(
            and(
              eq(AuditLogs.transaction_id, targetLog.transaction_id),
              isNull(AuditLogs.rolled_back_at),
              ne(AuditLogs.action, "ROLLBACK"),
            ),
          )
          .orderBy(desc(AuditLogs.id));
      }

      const now = new Date();
      const rollbackTxId = crypto.randomUUID();

      for (const log of logsToRevert) {
        const { entity, entity_id, action, diff } = log;
        const oldVals = diff?.oldValues;

        switch (action) {
          case "UPDATE":
          case "STATUS_CHANGE": {
            if (!oldVals) {
              throw new AppError(
                400,
                `Cannot rollback: No previous values captured for ${log.entity_name}.`,
              );
            }
            await this.revertUpdate(entity, entity_id, oldVals, tx);
            break;
          }

          case "DELETE": {
            await this.revertDelete(entity, entity_id, tx);
            break;
          }

          case "CREATE":
          case "RESTORE": {
            await this.revertCreate(entity, entity_id, tx);
            break;
          }

          case "ROLE_CHANGE": {
            if (!oldVals?.roles || !Array.isArray(oldVals.roles)) {
              throw new AppError(400, "Cannot rollback role change: Previous roles missing.");
            }
            await this.revertRoleChange(entity_id, oldVals.roles, tx);
            break;
          }

          case "PASSWORD_RESET": {
            if (oldVals?.password) {
              await tx
                .update(Accounts)
                .set({ password: oldVals.password, updated_at: now })
                .where(eq(Accounts.id, entity_id));
            }
            break;
          }

          default:
            throw new AppError(400, `Rollback is not supported for action type "${action}".`);
        }

        // Mark original audit log as rolled back
        await tx
          .update(AuditLogs)
          .set({
            rolled_back_at: now,
            rolled_back_by: actorUser.account.id,
          })
          .where(eq(AuditLogs.id, log.id));

        // Insert non-rollbackable audit record documenting the rollback
        await tx.insert(AuditLogs).values({
          actor_id: actorUser.account.id,
          actor_email: actorUser.account.email,
          actor_name: `${actorUser.details.first_name} ${actorUser.details.last_name}`,
          action: "ROLLBACK",
          entity: log.entity,
          entity_id: log.entity_id,
          entity_name: log.entity_name,
          diff: {
            oldValues: log.diff?.newValues,
            newValues: log.diff?.oldValues,
          },
          transaction_id: rollbackTxId,
          is_rollbackable: false,
        });
      }

      return {
        message: `Successfully rolled back ${logsToRevert.length} operation(s) in transaction ${targetLog.transaction_id || targetLog.id}.`,
        restoredEntity: targetLog.entity_name,
        revertedCount: logsToRevert.length,
      };
    });
  }

  private async revertUpdate(
    entity: string,
    entityId: number,
    oldValues: Record<string, any>,
    tx: PgTransaction,
  ) {
    const targetTable = this.tableMap[entity];
    if (!targetTable) {
      throw new AppError(400, `Entity "${entity}" is not supported for automated rollback.`);
    }

    const cleanValues = { ...oldValues };
    delete cleanValues.id;
    delete cleanValues.created_at;
    delete cleanValues.roles;
    delete cleanValues.offices;
    delete cleanValues.program;
    delete cleanValues.college;
    delete cleanValues.user;
    delete cleanValues.details;
    delete cleanValues.account;

    if (Object.keys(cleanValues).length > 0) {
      const updatePayload: Record<string, any> = { ...cleanValues };
      if ("updated_at" in targetTable) {
        updatePayload.updated_at = new Date();
      }
      await tx.update(targetTable).set(updatePayload).where(eq(targetTable.id, entityId));
    }
  }

  private async revertDelete(entity: string, entityId: number, tx: PgTransaction) {
    const targetTable = this.tableMap[entity];
    if (!targetTable) throw new AppError(400, `Entity "${entity}" is not supported for rollback.`);

    const setPayload: Record<string, any> = { deleted_at: null };
    if ("updated_at" in targetTable) {
      setPayload.updated_at = new Date();
    }

    await tx.update(targetTable).set(setPayload).where(eq(targetTable.id, entityId));
  }

  private async revertCreate(entity: string, entityId: number, tx: PgTransaction) {
    const targetTable = this.tableMap[entity];
    if (!targetTable) throw new AppError(400, `Entity "${entity}" is not supported for rollback.`);

    await tx
      .update(targetTable)
      .set({ deleted_at: new Date() })
      .where(eq(targetTable.id, entityId));
  }

  private async revertRoleChange(accountId: number, targetRoles: string[], tx: PgTransaction) {
    const sysRoles = await tx
      .select()
      .from(Roles)
      .where(and(inArray(Roles.system_role, targetRoles as any), isNull(Roles.deleted_at)));
    const roleIds = sysRoles.map((r) => r.id);

    if (roleIds.length > 0) {
      await tx
        .update(AccountRoles)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(AccountRoles.account_id, accountId),
            notInArray(AccountRoles.role_id, roleIds),
            isNull(AccountRoles.deleted_at),
          ),
        );
    } else {
      await tx
        .update(AccountRoles)
        .set({ deleted_at: new Date() })
        .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));
    }

    for (const rId of roleIds) {
      const [existing] = await tx
        .select()
        .from(AccountRoles)
        .where(and(eq(AccountRoles.account_id, accountId), eq(AccountRoles.role_id, rId)));

      if (existing) {
        await tx
          .update(AccountRoles)
          .set({ deleted_at: null })
          .where(eq(AccountRoles.id, existing.id));
      } else {
        await tx.insert(AccountRoles).values({ account_id: accountId, role_id: rId });
      }
    }
  }
}
