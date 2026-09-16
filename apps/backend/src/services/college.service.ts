import db, { type PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  AccountRoles,
  Accounts,
  CollegeDeans,
  CollegeQuerySchema,
  Colleges,
  CreateCollegeSchema,
  PersonalDetails,
  ProgramChairs,
  Programs,
  Roles,
  UpdateCollegeSchema,
  type CreateCollege,
  type CreateCollegeDean,
  type CreateUser,
  type GetCollege,
  type GetUser,
  type ICollegeSelect,
  type PaginatedData,
  type UpdateCollege,
} from "@my-app/shared";
import { and, asc, countDistinct, desc, eq, ilike, isNull, or, SQL, sql } from "drizzle-orm";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { createPaginatedData } from "@/libs/response.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { UserService, type IUserService } from "./user.service.js";

export interface ICollegeService {
  getCollegeById(id: number, client?: DbClient): ResultAsync<GetCollege, AppError>;
  getColleges(
    rawQuery: unknown,
    client?: DbClient,
  ): ResultAsync<PaginatedData<GetCollege[]>, AppError>;
  createCollege(collegeInfo: CreateCollege, client?: DbClient): ResultAsync<GetCollege, AppError>;
  updateCollege(
    id: number,
    collegeInfo: UpdateCollege,
    client?: DbClient,
  ): ResultAsync<GetCollege, AppError>;
  deleteCollege(id: number, client?: DbClient): ResultAsync<void, AppError>;
}

export class CollegeService implements ICollegeService {
  constructor(private userService: IUserService = new UserService()) {}

  getCollegeById(id: number, client: DbClient = db): ResultAsync<GetCollege, AppError> {
    return WithTransaction(client, async (tx) => {
      const [college] = await tx
        .select({
          college: {
            id: Colleges.id,
            name: Colleges.name,
            initialism: Colleges.initialism,
          },
          dean: sql<GetUser | null>`
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
        .from(Colleges)
        .leftJoin(
          CollegeDeans,
          and(eq(Colleges.id, CollegeDeans.college_id), isNull(CollegeDeans.deleted_at)),
        )
        .leftJoin(Accounts, and(eq(CollegeDeans.dean_id, Accounts.id), isNull(Accounts.deleted_at)))
        .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(and(eq(Colleges.id, id), isNull(Colleges.deleted_at)))
        .groupBy(Colleges.id, Accounts.id, PersonalDetails.id);

      return college;
    }).andThen((college) => {
      if (!college) {
        return errAsync(new AppError(404, "No college record found."));
      }

      return okAsync(college);
    });
  }

  getColleges(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetCollege[]>, AppError> {
    return ValidateSchema(CollegeQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, sort_by, order } = parsed;

      const filters: SQL[] = [isNull(Colleges.deleted_at)];

      if (search) {
        const term = `%${search}%`;
        filters.push(or(ilike(Colleges.name, term), ilike(Colleges.initialism, term))!);
      }

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: Colleges.created_at,
        name: Colleges.name,
        initialism: Colleges.initialism,
      };

      const sortColumn = sortColumnMap[sort_by] ?? Colleges.name;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseDataQuery = tx
          .select({
            college: {
              id: Colleges.id,
              name: Colleges.name,
              initialism: Colleges.initialism,
            },
            dean: sql<GetUser | null>`
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
          .from(Colleges)
          .leftJoin(
            CollegeDeans,
            and(eq(Colleges.id, CollegeDeans.college_id), isNull(CollegeDeans.deleted_at)),
          )
          .leftJoin(
            Accounts,
            and(eq(CollegeDeans.dean_id, Accounts.id), isNull(Accounts.deleted_at)),
          )
          .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition)
          .groupBy(Colleges.id, Accounts.id, PersonalDetails.id)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const colleges = await baseDataQuery;
          return createPaginatedData({
            data: colleges,
            currentPage: 1,
            pageSize: colleges.length,
            totalItems: colleges.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedDataQuery = baseDataQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(Colleges.id) })
          .from(Colleges)
          .where(whereCondition);

        const [colleges, countResult] = await Promise.all([paginatedDataQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;
        return createPaginatedData({
          data: colleges,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createCollege(
    collegeInfo: CreateCollege,
    client: DbClient = db,
  ): ResultAsync<GetCollege, AppError> {
    return ValidateSchema(CreateCollegeSchema, collegeInfo).asyncAndThen(({ college, dean }) => {
      return WithTransaction(client, async (tx) => {
        const [collegeRecord] = await tx.insert(Colleges).values(college).returning();
        if (!collegeRecord) throw new AppError(500, "Failed to create college record.");

        if (!dean)
          return {
            college: collegeRecord,
            dean: null,
          };

        let deanUser: GetUser | null = null;
        let account_id: number;
        if (dean.type === "existing") {
          await this.validDeanCandidate(dean.account_id, tx);
          account_id = dean.account_id;

          const userRecord = await this.userService.getUserById(account_id, tx);
          if (userRecord.isErr()) throw userRecord.error;
          deanUser = userRecord.value;
        } else {
          const { info } = dean;
          const newDeanInfo: CreateUser = { ...info, role: "FACULTY" };
          const userRecord = await this.userService.createUser(newDeanInfo, tx);
          if (userRecord.isErr()) throw userRecord.error;

          deanUser = userRecord.value;
          account_id = deanUser.account.id;
        }

        await this.userService.grantRole(account_id, "SUPERVISOR", tx);

        const [deanAssignment] = await tx
          .insert(CollegeDeans)
          .values({
            college_id: collegeRecord.id,
            dean_id: account_id,
          })
          .returning();
        if (!deanAssignment) throw new AppError(500, "Failed to assign dean to the college.");

        return {
          college: collegeRecord,
          dean: deanUser,
        };
      });
    });
  }

  updateCollege(
    id: number,
    collegeInfo: UpdateCollege,
    client: DbClient = db,
  ): ResultAsync<GetCollege, AppError> {
    return ValidateSchema(UpdateCollegeSchema, collegeInfo).asyncAndThen(({ college, dean }) => {
      const hasCollegeInfo = Boolean(college && Object.keys(college).length > 0);
      const hasDeanInfo = Boolean(dean && Object.keys(dean).length > 0);

      if (!hasCollegeInfo && !hasDeanInfo) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      return WithTransaction(client, async (tx) => {
        const getCollege = await this.getCollegeById(id, tx);
        if (getCollege.isErr()) throw getCollege.error;
        const existingCollege = getCollege.value;

        let updatedCollegeRecord: Pick<ICollegeSelect, "id" | "name" | "initialism"> =
          existingCollege.college;
        let finalDeanUser: GetUser | null = existingCollege.dean;

        if (hasCollegeInfo && college) {
          const [updated] = await tx
            .update(Colleges)
            .set(college)
            .where(and(eq(Colleges.id, existingCollege.college.id), isNull(Colleges.deleted_at)))
            .returning();

          if (!updated) throw new AppError(500, "Failed to update college record.");
          updatedCollegeRecord = updated;
        }

        if (hasDeanInfo && dean) {
          const isSameDean = this.sameDeanInfo(dean, existingCollege);

          if (!isSameDean) {
            let account_id: number;

            if (dean.type === "existing") {
              await this.validDeanCandidate(dean.account_id, tx);
              account_id = dean.account_id;

              const userRecord = await this.userService.getUserById(account_id, tx);
              if (userRecord.isErr()) throw userRecord.error;
              finalDeanUser = userRecord.value;
            } else {
              const newDeanInfo: CreateUser = { ...dean.info, role: "FACULTY" };
              const userRecord = await this.userService.createUser(newDeanInfo, tx);
              if (userRecord.isErr()) throw userRecord.error;

              finalDeanUser = userRecord.value;
              account_id = finalDeanUser.account.id;
            }

            if (existingCollege.dean) {
              const oldDeanId = existingCollege.dean.account.id;

              const hasOtherDeanships = await this.hasDeanships(
                oldDeanId,
                tx,
                existingCollege.college.id,
              );
              const hasProgramChair = await this.hasProgramChairRecords(oldDeanId, tx);

              if (!hasOtherDeanships && !hasProgramChair) {
                const revokeRes = await this.userService.revokeRole(oldDeanId, "SUPERVISOR", tx);
                if (revokeRes.isErr()) throw revokeRes.error;
              }

              const [deletedDeanRecord] = await tx
                .update(CollegeDeans)
                .set({ deleted_at: new Date() })
                .where(
                  and(
                    eq(CollegeDeans.dean_id, oldDeanId),
                    eq(CollegeDeans.college_id, existingCollege.college.id),
                    isNull(CollegeDeans.deleted_at),
                  ),
                )
                .returning();

              if (!deletedDeanRecord)
                throw new AppError(500, "Failed to remove previous dean assignment.");
            }

            const grantRes = await this.userService.grantRole(account_id, "SUPERVISOR", tx);
            if (grantRes.isErr()) throw grantRes.error;

            const [newDeanRecord] = await tx
              .insert(CollegeDeans)
              .values({
                dean_id: account_id,
                college_id: existingCollege.college.id,
              })
              .returning();

            if (!newDeanRecord) throw new AppError(500, "Failed to assign new dean to college.");
          }
        }

        return {
          college: updatedCollegeRecord,
          dean: finalDeanUser,
        };
      });
    });
  }

  deleteCollege(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const result = await this.getCollegeById(id, tx);
      if (result.isErr()) throw result.error;
      const existingCollege = result.value;

      const programs = await tx
        .select()
        .from(Programs)
        .where(
          and(eq(Programs.college_id, existingCollege.college.id), isNull(Programs.deleted_at)),
        );
      if (programs.length > 0)
        throw new AppError(
          400,
          `This college record cannot be deleted. ${programs.length} program/s are under this college.`,
        );

      if (existingCollege.dean) {
        const hasOtherDeanships = await this.hasDeanships(
          existingCollege.dean.account.id,
          tx,
          existingCollege.college.id,
        );
        const hasProgramChair = await this.hasProgramChairRecords(
          existingCollege.dean.account.id,
          tx,
        );

        if (!hasOtherDeanships && !hasProgramChair) {
          const revokeRes = await this.userService.revokeRole(
            existingCollege.dean.account.id,
            "SUPERVISOR",
            tx,
          );
          if (revokeRes.isErr()) throw revokeRes.error;
        }

        const [deletedDeanRecord] = await tx
          .update(CollegeDeans)
          .set({ deleted_at: new Date() })
          .where(
            and(
              eq(CollegeDeans.dean_id, existingCollege.dean.account.id),
              eq(CollegeDeans.college_id, existingCollege.college.id),
              isNull(CollegeDeans.deleted_at),
            ),
          )
          .returning();

        if (!deletedDeanRecord)
          throw new AppError(500, "Failed to remove previous dean assignment.");
      }

      const [deletedCollege] = await tx
        .update(Colleges)
        .set({ deleted_at: new Date() })
        .returning();
      if (!deletedCollege) throw new AppError(500, "Failed to remove college record.");
    });
  }

  private async validDeanCandidate(
    accountId: number,
    tx: PgTransaction,
    excludeCollegeId?: number,
  ) {
    const [account] = await tx
      .select()
      .from(Accounts)
      .where(and(eq(Accounts.id, accountId), isNull(Accounts.deleted_at)));
    if (!account) throw new AppError(404, "Dean account not found.");

    const roles = await tx
      .select({ system_role: Roles.system_role })
      .from(AccountRoles)
      .innerJoin(Roles, and(eq(Roles.id, AccountRoles.role_id), isNull(Roles.deleted_at)))
      .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));
    const nonAssignableRoles = ["SYS_ADMIN", "ADMIN", "STUDENT"];
    if (roles.some((r) => nonAssignableRoles.includes(r.system_role)))
      throw new AppError(400, "This account's role is not eligible to be assigned as a dean.");

    const hasDeanships = await this.hasDeanships(accountId, tx, excludeCollegeId);
    if (hasDeanships)
      throw new AppError(409, "This account is already assigned as the dean of a college.");
  }

  private async hasDeanships(accountId: number, tx: PgTransaction, excludeCollegeId?: number) {
    const deanships = await tx
      .select()
      .from(CollegeDeans)
      .where(
        and(
          eq(CollegeDeans.dean_id, accountId),
          excludeCollegeId ? sql`${CollegeDeans.college_id} != ${excludeCollegeId}` : undefined,
          isNull(CollegeDeans.deleted_at),
        ),
      );

    return deanships.length > 0;
  }

  private async hasProgramChairRecords(accountId: number, tx: PgTransaction) {
    const chairs = await tx
      .select()
      .from(ProgramChairs)
      .where(and(eq(ProgramChairs.chair_id, accountId), isNull(ProgramChairs.deleted_at)));

    return chairs.length > 0;
  }

  private sameDeanInfo(info: CreateCollegeDean, existingCollege: GetCollege) {
    if (!info) throw new AppError(400, "Dean information must not be empty.");

    if (!existingCollege.dean) return false;

    if (info.type === "existing") return info.account_id === existingCollege.dean.account.id;
    return info.info.details.institutional_id === existingCollege.dean.details.institutional_id;
  }
}
