import db, { type PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import {
  CreateFacultyPayloadSchema,
  type CreateFacultyPayload,
  type CreateUser,
  Accounts,
  CourseOfferings,
  Faculties,
  FacultyQuerySchema,
  FacultyUpdate,
  PersonalDetails,
  Programs,
  Roles,
  AccountRoles,
  type GetFaculty,
  type GetUser,
  type IFacultyUpdate,
  type PaginatedData,
} from "@my-app/shared";
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { okAsync, type ResultAsync } from "neverthrow";
import { UserService, type IUserService } from "./user.service.js";
import { logAuditEvent } from "@/libs/audit.lib.js";
import type { Request } from "express";

export interface IFacultyService {
  createFaculty(
    info: CreateFacultyPayload,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetFaculty, AppError>;
  getFacultyById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
    actorUser?: GetUser,
  ): ResultAsync<GetFaculty, AppError>;
  getFacultyByAccountId(
    accountId: number,
    client?: DbClient,
  ): ResultAsync<GetFaculty | null, AppError>;
  getFaculties(
    rawQuery: unknown,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<PaginatedData<GetFaculty[]>, AppError>;
  updateFaculty(
    id: number,
    info: IFacultyUpdate,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetFaculty, AppError>;
  deleteFaculty(
    id: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError>;
  restoreFaculty(
    id: number,
    client?: DbClient,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetFaculty, AppError>;
}

export class FacultyService implements IFacultyService {
  constructor(private userService: IUserService = new UserService()) {}

  private selectFields = {
    id: Faculties.id,
    account_id: Faculties.account_id,
    program_id: Faculties.program_id,
    is_home: Faculties.is_home,
    created_at: Faculties.created_at,
    updated_at: Faculties.updated_at,
    deleted_at: Faculties.deleted_at,

    user: sql<GetFaculty["user"]>`
      JSON_BUILD_OBJECT(
        'account', JSON_BUILD_OBJECT(
          'id', ${Accounts.id},
          'personal_details_id', ${Accounts.personal_details_id},
          'email', ${Accounts.email},
          'is_verified', ${Accounts.is_verified}
        ),
        'details', JSON_BUILD_OBJECT(
          'id', ${PersonalDetails.id},
          'institutional_id', ${PersonalDetails.institutional_id},
          'first_name', ${PersonalDetails.first_name},
          'last_name', ${PersonalDetails.last_name},
          'middle_name', ${PersonalDetails.middle_name},
          'suffix', ${PersonalDetails.suffix}
        ),
        'roles', COALESCE(
          (
            SELECT JSON_AGG(${Roles.system_role}::text)
            FROM ${AccountRoles}
            INNER JOIN ${Roles} ON ${AccountRoles.role_id} = ${Roles.id}
            WHERE ${AccountRoles.account_id} = ${Accounts.id}
              AND ${AccountRoles.deleted_at} IS NULL
              AND ${Roles.deleted_at} IS NULL
          ),
          '[]'::json
        )
      )
    `,

    program: sql<GetFaculty["program"]>`
      JSON_BUILD_OBJECT(
        'id', ${Programs.id},
        'college_id', ${Programs.college_id},
        'name', ${Programs.name},
        'initialism', ${Programs.initialism},
        'created_at', ${Programs.created_at},
        'updated_at', ${Programs.updated_at},
        'deleted_at', ${Programs.deleted_at}
      )
    `,
  };

  private async assertSupervisoryProgramScope(
    programId: number,
    actorUser: GetUser | undefined,
    tx: PgTransaction,
    mode: "read" | "write" = "write",
  ): Promise<void> {
    const [targetProgram] = await tx
      .select()
      .from(Programs)
      .where(and(eq(Programs.id, programId), isNull(Programs.deleted_at)));

    if (!targetProgram) {
      throw new AppError(404, "Target academic program not found.");
    }

    if (!actorUser) return;

    const actorRoles = actorUser.roles ?? [];
    if (actorRoles.includes("VPAA") || actorRoles.includes("CLERK")) return;

    const deanships = actorUser.offices?.deanships || [];
    const chairships = actorUser.offices?.chairships || [];

    if (chairships.some((c) => c.id === targetProgram.id)) return;

    if (mode === "read" && deanships.some((d) => d.id === targetProgram.college_id)) {
      return;
    }

    throw new AppError(
      403,
      "Access denied: You can only manage faculty within your authorized program scope.",
    );
  }

  getFacultyById(
    id: number,
    client: DbClient = db,
    includeArchived = false,
    actorUser?: GetUser,
  ): ResultAsync<GetFaculty, AppError> {
    return WithTransaction(client, async (tx) => {
      const [record] = await tx
        .select(this.selectFields)
        .from(Faculties)
        .innerJoin(Accounts, eq(Faculties.account_id, Accounts.id))
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .innerJoin(Programs, eq(Faculties.program_id, Programs.id))
        .where(
          and(eq(Faculties.id, id), includeArchived ? undefined : isNull(Faculties.deleted_at)),
        )
        .groupBy(Faculties.id, Accounts.id, PersonalDetails.id, Programs.id);

      if (!record) throw new AppError(404, "Faculty appointment record not found.");

      await this.assertSupervisoryProgramScope(record.program_id, actorUser, tx, "read");

      return record;
    });
  }

  getFacultyByAccountId(
    accountId: number,
    client: DbClient = db,
  ): ResultAsync<GetFaculty | null, AppError> {
    return WithTransaction(client, async (tx) => {
      const [record] = await tx
        .select(this.selectFields)
        .from(Faculties)
        .innerJoin(Accounts, eq(Faculties.account_id, Accounts.id))
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .innerJoin(Programs, eq(Faculties.program_id, Programs.id))
        .where(and(eq(Faculties.account_id, accountId), isNull(Faculties.deleted_at)))
        .orderBy(desc(Faculties.is_home))
        .groupBy(Faculties.id, Accounts.id, PersonalDetails.id, Programs.id)
        .limit(1);

      return record ?? null;
    });
  }

  getFaculties(
    rawQuery: unknown,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<PaginatedData<GetFaculty[]>, AppError> {
    return ValidateSchema(FacultyQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, program_id, college_id, is_archived, unscoped } =
        parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(Faculties.deleted_at) : isNull(Faculties.deleted_at),
        isNull(Accounts.deleted_at),
        isNull(Programs.deleted_at),
      ];

      const roles = actorUser?.roles ?? [];
      const isPrivileged = roles.includes("VPAA") || roles.includes("CLERK");

      if (!isPrivileged && actorUser && !unscoped) {
        const deanships = actorUser.offices?.deanships || [];
        const chairships = actorUser.offices?.chairships || [];

        if (chairships.length > 0) {
          const chairProgramIds = chairships.map((c) => c.id);
          filters.push(inArray(Programs.id, chairProgramIds));
        } else if (deanships.length > 0) {
          const deanCollegeIds = deanships.map((d) => d.id);
          filters.push(inArray(Programs.college_id, deanCollegeIds));
        } else {
          return okAsync(
            createPaginatedData({ data: [], currentPage: 1, pageSize: limit, totalItems: 0 }),
          );
        }
      }

      if (search) {
        const term = `%${search}%`;
        filters.push(
          or(
            ilike(PersonalDetails.first_name, term),
            ilike(PersonalDetails.last_name, term),
            ilike(PersonalDetails.institutional_id, term),
            ilike(Accounts.email, term),
            ilike(Programs.name, term),
            ilike(Programs.initialism, term),
          )!,
        );
      }

      if (program_id !== undefined) filters.push(eq(Faculties.program_id, program_id));
      if (college_id !== undefined) filters.push(eq(Programs.college_id, college_id));

      const whereCondition = and(...filters);

      return WithTransaction(client, async (tx) => {
        const baseQuery = tx
          .select(this.selectFields)
          .from(Faculties)
          .innerJoin(Accounts, eq(Faculties.account_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .innerJoin(Programs, eq(Faculties.program_id, Programs.id))
          .where(whereCondition)
          .groupBy(Faculties.id, Accounts.id, PersonalDetails.id, Programs.id)
          .orderBy(desc(Faculties.created_at))
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
          .select({ total: countDistinct(Faculties.id) })
          .from(Faculties)
          .innerJoin(Accounts, eq(Faculties.account_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .innerJoin(Programs, eq(Faculties.program_id, Programs.id))
          .where(whereCondition);

        const [results, countRes] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countRes[0]?.total ?? 0;

        return createPaginatedData({
          data: results,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createFaculty(
    info: CreateFacultyPayload,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetFaculty, AppError> {
    return ValidateSchema(CreateFacultyPayloadSchema, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        await this.assertSupervisoryProgramScope(parsed.program_id, actorUser, tx, "write");

        let accountId: number;

        if ("new_user" in parsed) {
          const newFacultyInfo: CreateUser = {
            ...parsed.new_user,
            role: "FACULTY",
          };
          const createdUser = await this.userService.createUser(newFacultyInfo, tx, actorUser, req);
          if (createdUser.isErr()) throw createdUser.error;
          accountId = createdUser.value.account.id;
        } else {
          accountId = parsed.account_id;
          const [account] = await tx
            .select({ id: Accounts.id })
            .from(Accounts)
            .where(and(eq(Accounts.id, accountId), isNull(Accounts.deleted_at)));
          if (!account) throw new AppError(404, "User account not found.");

          const isStudent = await this.userService.hasRole(accountId, "STUDENT", tx);
          if (isStudent.isOk() && isStudent.value) {
            throw new AppError(
              400,
              "Student accounts cannot be appointed as departmental faculty.",
            );
          }

          const grantRes = await this.userService.grantRole(accountId, "FACULTY", tx);
          if (grantRes.isErr()) throw grantRes.error;
        }

        const [activeSameProgram] = await tx
          .select({ id: Faculties.id })
          .from(Faculties)
          .where(
            and(
              eq(Faculties.account_id, accountId),
              eq(Faculties.program_id, parsed.program_id),
              isNull(Faculties.deleted_at),
            ),
          );

        if (activeSameProgram) {
          throw new AppError(
            409,
            "This instructor is already appointed to this academic department.",
          );
        }

        const [anyHome] = await tx
          .select({ id: Faculties.id })
          .from(Faculties)
          .where(
            and(
              eq(Faculties.account_id, accountId),
              eq(Faculties.is_home, true),
              isNull(Faculties.deleted_at),
            ),
          );
        const shouldBeHome = !anyHome;

        const [existingDeleted] = await tx
          .select()
          .from(Faculties)
          .where(
            and(
              eq(Faculties.account_id, accountId),
              eq(Faculties.program_id, parsed.program_id),
              isNotNull(Faculties.deleted_at),
            ),
          );

        let facultyId: number;

        if (existingDeleted) {
          const [restored] = await tx
            .update(Faculties)
            .set({ deleted_at: null, is_home: shouldBeHome, updated_at: new Date() })
            .where(eq(Faculties.id, existingDeleted.id))
            .returning({ id: Faculties.id });
          facultyId = restored!.id;
        } else {
          const [created] = await tx
            .insert(Faculties)
            .values({
              account_id: accountId,
              program_id: parsed.program_id,
              is_home: shouldBeHome,
            })
            .returning({ id: Faculties.id });
          facultyId = created!.id;
        }

        const fullRecord = await this.getFacultyById(facultyId, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "CREATE",
          entity: "faculties",
          entityId: fullRecord.value.id,
          entityName: `${fullRecord.value.user.details.first_name} ${fullRecord.value.user.details.last_name} (${fullRecord.value.program.initialism})`,
          newRecord: fullRecord.value,
          tx,
        });

        return fullRecord.value;
      });
    });
  }

  updateFaculty(
    id: number,
    info: IFacultyUpdate,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetFaculty, AppError> {
    return ValidateSchema(FacultyUpdate, info).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const existing = await this.getFacultyById(id, tx);
        if (existing.isErr()) throw existing.error;

        const actorRoles = actorUser?.roles ?? [];
        const isPrivilegedAdmin = actorRoles.includes("VPAA") || actorRoles.includes("CLERK");

        if (!isPrivilegedAdmin && actorUser && existing.value.account_id === actorUser.account.id) {
          throw new AppError(
            403,
            "You cannot transfer or modify your own departmental faculty appointment.",
          );
        }

        await this.assertSupervisoryProgramScope(existing.value.program_id, actorUser, tx, "write");

        if (parsed.program_id && parsed.program_id !== existing.value.program_id) {
          await this.assertSupervisoryProgramScope(parsed.program_id, actorUser, tx, "write");

          const [conflict] = await tx
            .select({ id: Faculties.id })
            .from(Faculties)
            .where(
              and(
                ne(Faculties.id, id),
                eq(Faculties.account_id, existing.value.account_id),
                eq(Faculties.program_id, parsed.program_id),
                isNull(Faculties.deleted_at),
              ),
            );
          if (conflict) {
            throw new AppError(409, "Instructor already has an appointment in the target program.");
          }
        }

        const [updated] = await tx
          .update(Faculties)
          .set({ ...parsed, updated_at: new Date() })
          .where(and(eq(Faculties.id, id), isNull(Faculties.deleted_at)))
          .returning({ id: Faculties.id });

        if (!updated) throw new AppError(500, "Failed to update faculty appointment.");

        const fullRecord = await this.getFacultyById(id, tx);
        if (fullRecord.isErr()) throw fullRecord.error;

        await logAuditEvent({
          actor: actorUser,
          req,
          action: "UPDATE",
          entity: "faculties",
          entityId: fullRecord.value.id,
          entityName: `${fullRecord.value.user.details.first_name} ${fullRecord.value.user.details.last_name} (${fullRecord.value.program.initialism})`,
          oldRecord: existing.value,
          newRecord: fullRecord.value,
          tx,
        });

        return fullRecord.value;
      });
    });
  }

  deleteFaculty(
    id: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getFacultyById(id, tx);
      if (existing.isErr()) throw existing.error;

      const actorRoles = actorUser?.roles ?? [];
      const isPrivilegedAdmin = actorRoles.includes("VPAA") || actorRoles.includes("CLERK");

      if (!isPrivilegedAdmin && actorUser && existing.value.account_id === actorUser.account.id) {
        throw new AppError(403, "You cannot remove your own departmental faculty appointment.");
      }

      await this.assertSupervisoryProgramScope(existing.value.program_id, actorUser, tx, "write");

      const [activeOfferings] = await tx
        .select({ total: count(CourseOfferings.id) })
        .from(CourseOfferings)
        .where(and(eq(CourseOfferings.faculty_id, id), isNull(CourseOfferings.deleted_at)));

      if ((activeOfferings?.total ?? 0) > 0) {
        throw new AppError(
          409,
          `Cannot remove faculty appointment: Instructor is currently assigned to ${activeOfferings?.total} active course offering(s). Please unassign them first.`,
        );
      }

      await tx
        .update(Faculties)
        .set({ deleted_at: new Date() })
        .where(and(eq(Faculties.id, id), isNull(Faculties.deleted_at)));

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "DELETE",
        entity: "faculties",
        entityId: existing.value.id,
        entityName: `${existing.value.user.details.first_name} ${existing.value.user.details.last_name} (${existing.value.program.initialism})`,
        oldRecord: existing.value,
        tx,
      });

      return undefined;
    });
  }

  restoreFaculty(
    id: number,
    client: DbClient = db,
    actorUser?: GetUser,
    req?: Request,
  ): ResultAsync<GetFaculty, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getFacultyById(id, tx, true);
      if (existing.isErr()) throw existing.error;

      await this.assertSupervisoryProgramScope(existing.value.program_id, actorUser, tx, "write");
      const current = existing.value;

      if (!current.deleted_at) throw new AppError(400, "Faculty appointment is already active.");

      const [conflict] = await tx
        .select()
        .from(Faculties)
        .where(
          and(
            ne(Faculties.id, id),
            eq(Faculties.account_id, current.account_id),
            eq(Faculties.program_id, current.program_id),
            isNull(Faculties.deleted_at),
          ),
        );

      if (conflict) {
        throw new AppError(
          409,
          "Cannot restore appointment: This instructor already has an active appointment in this department.",
        );
      }

      await tx
        .update(Faculties)
        .set({ deleted_at: null, updated_at: new Date() })
        .where(eq(Faculties.id, id));

      const fullRecord = await this.getFacultyById(id, tx);
      if (fullRecord.isErr()) throw fullRecord.error;

      await logAuditEvent({
        actor: actorUser,
        req,
        action: "RESTORE",
        entity: "faculties",
        entityId: fullRecord.value.id,
        entityName: `${fullRecord.value.user.details.first_name} ${fullRecord.value.user.details.last_name} (${fullRecord.value.program.initialism})`,
        newRecord: fullRecord.value,
        tx,
      });

      return fullRecord.value;
    });
  }
}
