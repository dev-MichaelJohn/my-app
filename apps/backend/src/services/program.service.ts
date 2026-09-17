import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { UserService, type IUserService } from "./user.service.js";
import { errAsync, type ResultAsync } from "neverthrow";
import {
  AccountRoles,
  Accounts,
  Classes,
  CourseCurriculums,
  Courses,
  CreateProgramSchema,
  PersonalDetails,
  ProgramChairs,
  ProgramQuerySchema,
  Programs,
  Roles,
  UpdateProgramSchema,
  type CreateProgram,
  type CreateProgramChair,
  type CreateUser,
  type GetProgram,
  type GetUser,
  type PaginatedData,
  type UpdateProgram,
} from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import db, { type PgTransaction } from "@/configs/db.config.js";
import { CollegeService, type ICollegeService } from "./college.service.js";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { ValidateSchema } from "@/libs/result.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";

export interface IProgramService {
  getProgramById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<GetProgram, AppError>;
  getPrograms(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetProgram[]>, AppError>;
  createProgram(programInfo: CreateProgram, client?: DbClient): ResultAsync<GetProgram, AppError>;
  updateProgram(
    id: number,
    programInfo: UpdateProgram,
    client?: DbClient,
  ): ResultAsync<GetProgram, AppError>;
  deleteProgram(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreProgram(id: number, client?: DbClient): ResultAsync<GetProgram, AppError>;
}

export class ProgramService implements IProgramService {
  constructor(
    private userService: IUserService = new UserService(),
    private collegeService: ICollegeService = new CollegeService(),
  ) {}

  getProgramById(
    id: number,
    client: DbClient = db,
    includeArchived: boolean = false,
  ): ResultAsync<GetProgram, AppError> {
    return WithTransaction(client, async (tx) => {
      const [program] = await tx
        .select({
          program: {
            id: Programs.id,
            college_id: Programs.college_id,
            name: Programs.name,
            initialism: Programs.initialism,
            created_at: Programs.created_at,
            updated_at: Programs.updated_at,
            deleted_at: Programs.deleted_at,
          },
          chair: sql<GetUser | null>`
            CASE
              WHEN ${Accounts.id} IS NULL THEN NULL
              ELSE JSON_BUILD_OBJECT(
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
            END
          `,
        })
        .from(Programs)
        .leftJoin(
          ProgramChairs,
          and(eq(Programs.id, ProgramChairs.program_id), isNull(ProgramChairs.deleted_at)),
        )
        .leftJoin(
          Accounts,
          and(eq(ProgramChairs.chair_id, Accounts.id), isNull(Accounts.deleted_at)),
        )
        .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(and(eq(Programs.id, id), includeArchived ? undefined : isNull(Programs.deleted_at)))
        .groupBy(Programs.id, Accounts.id, PersonalDetails.id);

      if (!program) throw new AppError(404, "No program record found.");
      return program;
    });
  }

  getPrograms(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetProgram[]>, AppError> {
    return ValidateSchema(ProgramQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, college_id, has_chair, is_archived, sort_by, order } =
        parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(Programs.deleted_at) : isNull(Programs.deleted_at),
      ];

      if (search) {
        const term = `%${search}%`;
        filters.push(or(ilike(Programs.name, term), ilike(Programs.initialism, term))!);
      }

      if (college_id !== undefined) {
        filters.push(eq(Programs.college_id, college_id));
      }

      if (has_chair !== undefined) {
        if (has_chair) {
          filters.push(and(isNotNull(ProgramChairs.id), isNull(ProgramChairs.deleted_at))!);
        } else {
          filters.push(isNull(ProgramChairs.id));
        }
      }

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: Programs.created_at,
        name: Programs.name,
        initialism: Programs.initialism,
        college_id: Programs.college_id,
      };

      const sortColumn = sortColumnMap[sort_by] ?? Programs.name;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select({
            program: {
              id: Programs.id,
              college_id: Programs.college_id,
              name: Programs.name,
              initialism: Programs.initialism,
              created_at: Programs.created_at,
              updated_at: Programs.updated_at,
              deleted_at: Programs.deleted_at,
            },
            chair: sql<GetUser | null>`
            CASE
              WHEN ${Accounts.id} IS NULL THEN NULL
              ELSE JSON_BUILD_OBJECT(
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
            END
          `,
          })
          .from(Programs)
          .leftJoin(
            ProgramChairs,
            and(eq(Programs.id, ProgramChairs.program_id), isNull(ProgramChairs.deleted_at)),
          )
          .leftJoin(
            Accounts,
            and(eq(ProgramChairs.chair_id, Accounts.id), isNull(Accounts.deleted_at)),
          )
          .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition)
          .groupBy(Programs.id, Accounts.id, PersonalDetails.id)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const programs = await baseDataQuery;
          return createPaginatedData({
            data: programs,
            currentPage: 1,
            pageSize: programs.length,
            totalItems: programs.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedDataQuery = baseDataQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(Programs.id) })
          .from(Programs)
          .where(whereCondition);

        const [programs, countResult] = await Promise.all([paginatedDataQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;
        return createPaginatedData({
          data: programs,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createProgram(
    programInfo: CreateProgram,
    client: DbClient = db,
  ): ResultAsync<GetProgram, AppError> {
    return ValidateSchema(CreateProgramSchema, programInfo).asyncAndThen(({ program, chair }) => {
      return WithTransaction(client, async (tx) => {
        const collegeResult = await this.collegeService.getCollegeById(program.college_id, tx);
        if (collegeResult.isErr()) throw collegeResult.error;

        const [programRecord] = await tx.insert(Programs).values(program).returning();
        if (!programRecord) throw new AppError(500, "Failed to create program record.");

        if (!chair)
          return {
            program: programRecord,
            chair: null,
          };

        let chairUser: GetUser | null = null;
        let account_id: number;

        if (chair.type === "existing") {
          await this.validChairCandidate(chair.account_id, tx);
          account_id = chair.account_id;

          const userRecord = await this.userService.getUserById(account_id, tx);
          if (userRecord.isErr()) throw userRecord.error;
          chairUser = userRecord.value;
        } else {
          const { info } = chair;
          const newChairInfo: CreateUser = { ...info, role: "FACULTY" };
          const userRecord = await this.userService.createUser(newChairInfo, tx);
          if (userRecord.isErr()) throw userRecord.error;

          chairUser = userRecord.value;
          account_id = chairUser.account.id;
        }

        await this.userService.grantRole(account_id, "SUPERVISOR", tx);

        const [chairAssignment] = await tx
          .insert(ProgramChairs)
          .values({
            program_id: programRecord.id,
            chair_id: account_id,
          })
          .returning();
        if (!chairAssignment) throw new AppError(500, "Failed to assign dean to the college.");

        return {
          program: programRecord,
          chair: chairUser,
        };
      });
    });
  }

  updateProgram(
    id: number,
    programInfo: UpdateProgram,
    client: DbClient = db,
  ): ResultAsync<GetProgram, AppError> {
    return ValidateSchema(UpdateProgramSchema, programInfo).asyncAndThen(({ program, chair }) => {
      const hasProgramInfo = Boolean(program && Object.keys(program).length > 0);
      const hasChairInfo = Boolean(chair && Object.keys(chair).length > 0);

      if (!hasProgramInfo && !hasChairInfo)
        return errAsync(new AppError(400, "No update parameters were provided."));

      return WithTransaction(client, async (tx) => {
        const getProgram = await this.getProgramById(id, tx);
        if (getProgram.isErr()) throw getProgram.error;
        const existingProgram = getProgram.value;

        let updatedProgramRecord = existingProgram.program;
        let finalChairUser: GetUser | null = existingProgram.chair;

        if (hasProgramInfo && program) {
          if (program.college_id && program.college_id !== existingProgram.program.college_id) {
            const collegeResult = await this.collegeService.getCollegeById(program.college_id, tx);
            if (collegeResult.isErr()) throw collegeResult.error;
          }

          const [updated] = await tx
            .update(Programs)
            .set(program)
            .where(and(eq(Programs.id, existingProgram.program.id), isNull(Programs.deleted_at)))
            .returning();
          if (!updated) throw new AppError(500, "Failed to update program record.");

          updatedProgramRecord = updated;
        }

        if (hasChairInfo && chair) {
          const isSameChair = this.sameChairInfo(chair, existingProgram);

          if (!isSameChair) {
            let account_id: number;

            if (chair.type === "existing") {
              await this.validChairCandidate(chair.account_id, tx);
              account_id = chair.account_id;

              const userRecord = await this.userService.getUserById(account_id, tx);
              if (userRecord.isErr()) throw userRecord.error;
              finalChairUser = userRecord.value;
            } else {
              const newChairInfo: CreateUser = { ...chair.info, role: "FACULTY" };
              const userRecord = await this.userService.createUser(newChairInfo, tx);
              if (userRecord.isErr()) throw userRecord.error;

              finalChairUser = userRecord.value;
              account_id = finalChairUser.account.id;
            }

            if (existingProgram.chair) {
              const oldChairId = existingProgram.chair.account.id;

              const hasOtherChairs = await this.collegeService.hasProgramChairRecords(
                oldChairId,
                tx,
                existingProgram.program.id,
              );
              const hasDeanships = await this.collegeService.hasDeanships(oldChairId, tx);

              if (!hasOtherChairs && !hasDeanships) {
                const revokeRes = await this.userService.revokeRole(oldChairId, "SUPERVISOR", tx);
                if (revokeRes.isErr()) throw revokeRes.error;
              }

              const [deleteChairRecord] = await tx
                .update(ProgramChairs)
                .set({ deleted_at: new Date() })
                .where(
                  and(
                    eq(ProgramChairs.chair_id, oldChairId),
                    eq(ProgramChairs.program_id, existingProgram.program.id),
                    isNull(ProgramChairs.deleted_at),
                  ),
                )
                .returning();

              if (!deleteChairRecord) {
                throw new AppError(500, "Failed to remove previous chair assignment.");
              }
            }

            const grantRes = await this.userService.grantRole(account_id, "SUPERVISOR", tx);
            if (grantRes.isErr()) throw grantRes.error;

            const [newChairRecord] = await tx
              .insert(ProgramChairs)
              .values({
                chair_id: account_id,
                program_id: existingProgram.program.id,
              })
              .returning();

            if (!newChairRecord) {
              throw new AppError(500, "Failed to assign new chair to program.");
            }
          }
        }

        return {
          program: updatedProgramRecord,
          chair: finalChairUser,
        };
      });
    });
  }

  deleteProgram(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const getProgram = await this.getProgramById(id, tx);
      if (getProgram.isErr()) throw getProgram.error;
      const existingProgram = getProgram.value;

      await this.checkProgramDependencies(existingProgram.program.id, tx);

      if (existingProgram.chair) {
        const chairId = existingProgram.chair.account.id;

        await tx
          .update(ProgramChairs)
          .set({ deleted_at: new Date() })
          .where(
            and(
              eq(ProgramChairs.program_id, id),
              eq(ProgramChairs.chair_id, chairId),
              isNull(ProgramChairs.deleted_at),
            ),
          );

        const hasOtherChairs = await this.collegeService.hasProgramChairRecords(chairId, tx, id);
        const hasDeanships = await this.collegeService.hasDeanships(chairId, tx);

        if (!hasOtherChairs && !hasDeanships) {
          const revokeRes = await this.userService.revokeRole(chairId, "SUPERVISOR", tx);
          if (revokeRes.isErr()) throw revokeRes.error;
        }
      }

      const [deletedProgram] = await tx
        .update(Programs)
        .set({ deleted_at: new Date() })
        .where(and(eq(Programs.id, existingProgram.program.id), isNull(Programs.deleted_at)))
        .returning();

      if (!deletedProgram)
        throw new AppError(404, "Program record was not found or has already been deleted.");
    });
  }

  restoreProgram(id: number, client: DbClient = db): ResultAsync<GetProgram, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getProgramById(id, tx, true);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.program.deleted_at) {
        throw new AppError(400, "This program is already active and not archived.");
      }

      const collegeResult = await this.collegeService.getCollegeById(
        current.program.college_id,
        tx,
      );
      if (collegeResult.isErr()) {
        throw new AppError(400, "Cannot restore program: Parent college is archived or deleted.");
      }

      const [restored] = await tx
        .update(Programs)
        .set({ deleted_at: null })
        .where(eq(Programs.id, id))
        .returning();

      if (!restored) {
        throw new AppError(500, "Failed to restore program.");
      }

      return {
        program: restored,
        chair: current.chair,
      };
    });
  }

  private async validChairCandidate(accountId: number, tx: PgTransaction) {
    const [account] = await tx
      .select()
      .from(Accounts)
      .where(and(eq(Accounts.id, accountId), isNull(Accounts.deleted_at)));
    if (!account) throw new AppError(404, "Chair account not found.");

    const roles = await tx
      .select({ system_role: Roles.system_role })
      .from(AccountRoles)
      .innerJoin(Roles, and(eq(Roles.id, AccountRoles.role_id), isNull(Roles.deleted_at)))
      .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));
    const nonAssignableRoles = ["SYS_ADMIN", "ADMIN", "STUDENT"];
    if (roles.some((r) => nonAssignableRoles.includes(r.system_role)))
      throw new AppError(400, "This account's role is not eligible to be assigned as a chair.");
  }

  private sameChairInfo(info: CreateProgramChair, existingProgram: GetProgram): boolean {
    if (!info) return false;
    if (!existingProgram.chair) return false;

    if (info.type === "existing") {
      return info.account_id === existingProgram.chair.account.id;
    }

    return info.info.details.institutional_id === existingProgram.chair.details.institutional_id;
  }

  private async checkProgramDependencies(programId: number, tx: PgTransaction): Promise<void> {
    const [activeClasses, activeCourses, activeCurriculums] = await Promise.all([
      tx
        .select({ total: count(Classes.id) })
        .from(Classes)
        .where(and(eq(Classes.program_id, programId), isNull(Classes.deleted_at))),
      tx
        .select({ total: count(Courses.id) })
        .from(Courses)
        .where(and(eq(Courses.program_id, programId), isNull(Courses.deleted_at))),
      tx
        .select({ total: count(CourseCurriculums.id) })
        .from(CourseCurriculums)
        .where(
          and(eq(CourseCurriculums.program_id, programId), isNull(CourseCurriculums.deleted_at)),
        ),
    ]);

    const classCount = activeClasses[0]?.total ?? 0;
    const courseCount = activeCourses[0]?.total ?? 0;
    const curriculumCount = activeCurriculums[0]?.total ?? 0;

    if (classCount > 0 || courseCount > 0 || curriculumCount > 0) {
      const activeDependencies: string[] = [];

      if (classCount > 0) activeDependencies.push(`${classCount} active class(es)`);
      if (courseCount > 0) activeDependencies.push(`${courseCount} active course(s)`);
      if (curriculumCount > 0)
        activeDependencies.push(`${curriculumCount} curriculum entry/entries`);

      throw new AppError(
        409,
        `Cannot delete program because it still has active dependencies: ${activeDependencies.join(
          ", ",
        )}. Please delete or reassign them first.`,
      );
    }
  }
}
