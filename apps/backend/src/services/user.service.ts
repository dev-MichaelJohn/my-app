import db, { type PgTransaction } from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { createPaginatedData } from "@/libs/response.lib.js";
import {
  AccountRoles,
  Accounts,
  CreateUserSchema,
  LoginAccountSchema,
  PersonalDetails,
  Roles,
  UserQuerySchema,
  ChangePasswordSchema,
  ManageUserRolesSchema,
  type CreateUser,
  type GetUser,
  type UpdateUser,
  type LoginAccount,
  type PaginatedData,
  type SystemRole,
  type WelcomeEmailOpts,
  UpdateUserSchema,
  type UpdateEmailOpts,
  CollegeDeans,
  ProgramChairs,
  CourseOfferings,
  ClassStudents,
  StudentClasses,
  Colleges,
  Programs,
  type ChangePassword,
} from "@my-app/shared";
import {
  and,
  asc,
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
  sql,
  type SQL,
} from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { EmailService, type IEmailService } from "./email.service.js";
import {
  UpdateEmailTemplate,
  UpdateTextTemplate,
  WelcomeEmailTemplate,
  WelcomeTextTemplate,
} from "@/libs/email.lib.js";
import env from "@/configs/env.config.js";

// Helper to guarantee roles is always a valid JavaScript array
const toRolesArray = (roles: unknown): SystemRole[] => {
  if (Array.isArray(roles)) return roles as SystemRole[];
  if (typeof roles === "string") {
    try {
      const parsed = JSON.parse(roles);
      if (Array.isArray(parsed)) return parsed as SystemRole[];
    } catch {
      // Handles raw string role, e.g. "SYS_ADMIN" or "FACULTY"
      return [roles as SystemRole];
    }
  }
  return [];
};

export interface IUserService {
  getUserById(
    id: number,
    client?: DbClient,
    includeArchived?: boolean,
  ): ResultAsync<GetUser, AppError>;
  getUserByEmail(email: string, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUserForLogin(credentials: LoginAccount, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUsers(rawQuery: unknown, client?: DbClient): ResultAsync<PaginatedData<GetUser[]>, AppError>;
  createUser(
    info: CreateUser,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<GetUser, AppError>;
  updateUser(
    id: number,
    info: UpdateUser,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<GetUser, AppError>;
  deleteUser(id: number, client?: DbClient, actorUser?: GetUser): ResultAsync<void, AppError>;
  restoreUser(id: number, client?: DbClient, actorUser?: GetUser): ResultAsync<GetUser, AppError>;
  grantRole(accountId: number, role: SystemRole, client?: DbClient): ResultAsync<void, AppError>;
  revokeRole(accountId: number, role: SystemRole, client?: DbClient): ResultAsync<void, AppError>;
  hasRole(accountId: number, role: SystemRole, client?: DbClient): ResultAsync<boolean, AppError>;
  manageRoles(
    accountId: number,
    roles: SystemRole[],
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<GetUser, AppError>;
  resetUserPassword(
    accountId: number,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<{ temporaryPassword: string }, AppError>;
  changePassword(
    accountId: number,
    payload: ChangePassword,
    client?: DbClient,
    isSelfService?: boolean,
  ): ResultAsync<void, AppError>;
  resendWelcomeEmail(
    accountId: number,
    client?: DbClient,
    actorUser?: GetUser,
  ): ResultAsync<void, AppError>;
}

export class UserService implements IUserService {
  constructor(private emailService: IEmailService = new EmailService()) {}

  private selectFields = {
    account: {
      id: Accounts.id,
      personal_details_id: Accounts.personal_details_id,
      email: Accounts.email,
      is_verified: Accounts.is_verified,
      deleted_at: Accounts.deleted_at,
      created_at: Accounts.created_at,
      updated_at: Accounts.updated_at,
    },
    details: {
      id: PersonalDetails.id,
      institutional_id: PersonalDetails.institutional_id,
      first_name: PersonalDetails.first_name,
      last_name: PersonalDetails.last_name,
      middle_name: PersonalDetails.middle_name,
      suffix: PersonalDetails.suffix,
      deleted_at: PersonalDetails.deleted_at,
      created_at: PersonalDetails.created_at,
      updated_at: PersonalDetails.updated_at,
    },
    roles: sql<GetUser["roles"]>`
      COALESCE(
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
    `,
    offices: sql<GetUser["offices"]>`
      JSON_BUILD_OBJECT(
        'deanships', COALESCE(
          (
            SELECT JSON_AGG(JSON_BUILD_OBJECT('id', ${Colleges.id}, 'name', ${Colleges.name}, 'initialism', ${Colleges.initialism}))
            FROM ${CollegeDeans}
            INNER JOIN ${Colleges} ON ${CollegeDeans.college_id} = ${Colleges.id}
            WHERE ${CollegeDeans.dean_id} = ${Accounts.id}
              AND ${CollegeDeans.deleted_at} IS NULL
              AND ${Colleges.deleted_at} IS NULL
          ),
          '[]'::json
        ),
        'chairships', COALESCE(
          (
            SELECT JSON_AGG(JSON_BUILD_OBJECT('id', ${Programs.id}, 'name', ${Programs.name}, 'initialism', ${Programs.initialism}))
            FROM ${ProgramChairs}
            INNER JOIN ${Programs} ON ${ProgramChairs.program_id} = ${Programs.id}
            WHERE ${ProgramChairs.chair_id} = ${Accounts.id}
              AND ${ProgramChairs.deleted_at} IS NULL
              AND ${Programs.deleted_at} IS NULL
          ),
          '[]'::json
        )
      )
    `,
  };

  getUserById(
    id: number,
    client: DbClient = db,
    includeArchived = false,
  ): ResultAsync<GetUser, AppError> {
    return WithTransaction(client, async (tx) => {
      const [user] = await tx
        .select(this.selectFields)
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(and(eq(Accounts.id, id), includeArchived ? undefined : isNull(Accounts.deleted_at)))
        .groupBy(Accounts.id, PersonalDetails.id);

      if (!user) return null;

      return {
        ...user,
        roles: toRolesArray(user.roles),
        offices: user.offices || { deanships: [], chairships: [] },
      };
    }).andThen((user) => {
      return user ? okAsync(user) : errAsync(new AppError(404, "User account was not found."));
    });
  }

  getUserByEmail(email: string, client: DbClient = db): ResultAsync<GetUser, AppError> {
    return WithTransaction(client, async (tx) => {
      const [user] = await tx
        .select(this.selectFields)
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(and(eq(Accounts.email, email), isNull(Accounts.deleted_at)))
        .groupBy(Accounts.id, PersonalDetails.id);

      if (!user) return null;

      return {
        ...user,
        roles: toRolesArray(user.roles),
        offices: user.offices || { deanships: [], chairships: [] },
      };
    }).andThen((user) => {
      return user ? okAsync(user) : errAsync(new AppError(404, "User account was not found."));
    });
  }

  getUserForLogin(
    { institutional_id, password }: LoginAccount,
    client: DbClient = db,
  ): ResultAsync<GetUser, AppError> {
    return ValidateSchema(LoginAccountSchema, { institutional_id, password }).asyncAndThen(
      (parsed) => {
        return WithTransaction(client, async (tx) => {
          const [user] = await tx
            .select({
              ...this.selectFields,
              account: {
                ...this.selectFields.account,
                password: Accounts.password,
              },
            })
            .from(PersonalDetails)
            .innerJoin(
              Accounts,
              and(
                eq(Accounts.personal_details_id, PersonalDetails.id),
                isNull(Accounts.deleted_at),
              ),
            )
            .where(
              and(
                eq(PersonalDetails.institutional_id, parsed.institutional_id),
                isNull(PersonalDetails.deleted_at),
              ),
            )
            .groupBy(Accounts.id, PersonalDetails.id);

          return user ?? null;
        }).andThen((user) => {
          if (!user) {
            return errAsync(new AppError(401, "Invalid institutional ID or password."));
          }

          return ResultAsync.fromPromise(
            bcrypt.compare(parsed.password, user.account.password),
            () => new AppError(500, "Failed to verify credentials."),
          ).andThen((isPasswordValid) => {
            if (!isPasswordValid) {
              return errAsync(new AppError(401, "Invalid institutional ID or password."));
            }

            const { password: _, ...accountWithoutPassword } = user.account;

            const authenticatedUser: GetUser = {
              account: accountWithoutPassword,
              details: user.details,
              roles: toRolesArray(user.roles),
              offices: user.offices || { deanships: [], chairships: [] },
            };

            return okAsync(authenticatedUser);
          });
        });
      },
    );
  }

  getUsers(
    rawQuery: unknown,
    client: DbClient = db,
  ): ResultAsync<PaginatedData<GetUser[]>, AppError> {
    return ValidateSchema(UserQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { paginate, page, limit, search, role, is_verified, is_archived, sort_by, order } =
        parsed;

      const filters: SQL[] = [
        is_archived ? isNotNull(Accounts.deleted_at) : isNull(Accounts.deleted_at),
      ];

      if (search) {
        const term = `%${search}%`;
        filters.push(
          or(
            ilike(PersonalDetails.first_name, term),
            ilike(PersonalDetails.last_name, term),
            ilike(PersonalDetails.institutional_id, term),
            ilike(Accounts.email, term),
          )!,
        );
      }

      if (is_verified !== undefined) filters.push(eq(Accounts.is_verified, is_verified));
      if (role) {
        filters.push(
          sql`EXISTS (
            SELECT 1 FROM ${AccountRoles}
            INNER JOIN ${Roles} ON ${AccountRoles.role_id} = ${Roles.id}
            WHERE ${AccountRoles.account_id} = ${Accounts.id}
              AND ${Roles.system_role} = ${role}
              AND ${AccountRoles.deleted_at} IS NULL
              AND ${Roles.deleted_at} IS NULL
          )`,
        );
      }

      const whereCondition = and(...filters);

      const sortColumnMap = {
        created_at: Accounts.created_at,
        email: Accounts.email,
        first_name: PersonalDetails.first_name,
        last_name: PersonalDetails.last_name,
        institutional_id: PersonalDetails.institutional_id,
      };

      const sortColumn = sortColumnMap[sort_by] ?? Accounts.created_at;
      const orderByClause = order === "asc" ? asc(sortColumn) : desc(sortColumn);

      return WithTransaction(client, async (tx) => {
        const baseQuery = tx
          .select(this.selectFields)
          .from(Accounts)
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition)
          .groupBy(Accounts.id, PersonalDetails.id)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const rawUsers = await baseQuery;
          const users = rawUsers.map((u) => ({
            ...u,
            roles: toRolesArray(u.roles),
            offices: u.offices || { deanships: [], chairships: [] },
          }));
          return createPaginatedData({
            data: users,
            currentPage: 1,
            pageSize: users.length,
            totalItems: users.length,
          });
        }

        const offset = (page - 1) * limit;
        const paginatedQuery = baseQuery.limit(limit).offset(offset);

        const countQuery = tx
          .select({ total: countDistinct(Accounts.id) })
          .from(Accounts)
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(whereCondition);

        const [rawUsers, countResult] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        const users = rawUsers.map((u) => ({
          ...u,
          roles: toRolesArray(u.roles),
          offices: u.offices || { deanships: [], chairships: [] },
        }));

        return createPaginatedData({
          data: users,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createUser(
    info: CreateUser,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<GetUser, AppError> {
    return ValidateSchema(CreateUserSchema, info).asyncAndThen((parsedInfo) => {
      const actorRoles = toRolesArray(actorUser?.roles);
      const isSysAdmin = actorRoles.includes("SYS_ADMIN");

      // If actorUser is provided via HTTP, enforce that only SYS_ADMIN can provision ADMIN/SYS_ADMIN
      if (
        (parsedInfo.role === "ADMIN" || parsedInfo.role === "SYS_ADMIN") &&
        (!actorUser || !isSysAdmin)
      ) {
        return errAsync(
          new AppError(403, "Only System Administrators can provision administrative accounts."),
        );
      }

      let plainPassword = info.account.password;
      if (!plainPassword || plainPassword.trim().length === 0) {
        plainPassword = this.generatePassword();
      }

      return WithTransaction(client, async (tx) => {
        const [emailConflict] = await tx
          .select({ id: Accounts.id })
          .from(Accounts)
          .where(and(eq(Accounts.email, parsedInfo.account.email), isNull(Accounts.deleted_at)));

        if (emailConflict) {
          throw new AppError(
            409,
            `An active account with email "${parsedInfo.account.email}" already exists.`,
          );
        }

        const [idConflict] = await tx
          .select({ id: PersonalDetails.id })
          .from(PersonalDetails)
          .where(
            and(
              eq(PersonalDetails.institutional_id, parsedInfo.details.institutional_id),
              isNull(PersonalDetails.deleted_at),
            ),
          );

        if (idConflict) {
          throw new AppError(
            409,
            `An active person with Institutional ID "${parsedInfo.details.institutional_id}" already exists.`,
          );
        }

        const [userDetails] = await tx
          .insert(PersonalDetails)
          .values(parsedInfo.details)
          .returning();

        if (!userDetails) {
          throw new AppError(500, "Failed to create personal details record.");
        }

        const hash = bcrypt.hashSync(plainPassword, 10);

        const [userAccount] = await tx
          .insert(Accounts)
          .values({
            email: parsedInfo.account.email,
            password: hash,
            personal_details_id: userDetails.id,
            is_verified: false,
          })
          .returning();

        if (!userAccount) {
          throw new AppError(500, "Failed to create account record.");
        }

        const [systemRole] = await tx
          .select()
          .from(Roles)
          .where(eq(Roles.system_role, parsedInfo.role));

        if (!systemRole) {
          throw new AppError(400, `System role "${parsedInfo.role}" not found.`);
        }

        await tx
          .insert(AccountRoles)
          .values({ account_id: userAccount.id, role_id: systemRole.id });

        const { password: _password, ...filteredAccount } = userAccount;

        return {
          account: filteredAccount,
          details: userDetails,
          roles: [systemRole.system_role],
          offices: { deanships: [], chairships: [] },
        };
      }).andThen((newUser) => {
        const fullName = this.formatFullName(newUser.details);

        const emailPayload: WelcomeEmailOpts = {
          recipientName: fullName,
          email: newUser.account.email,
          generatedPassword: plainPassword,
          url: env.CLIENT_URL,
        };

        return this.emailService
          .sendEmail({
            to: newUser.account.email,
            options: {
              subject: "PIT-FES Account Credentials Notice",
              text: WelcomeTextTemplate(emailPayload),
              html: WelcomeEmailTemplate(emailPayload),
            },
          })
          .map(() => newUser)
          .orElse((err) => {
            console.warn("⚠️ Welcome email failed to send:", err.message);
            return okAsync(newUser);
          });
      });
    });
  }

  updateUser(
    id: number,
    info: UpdateUser,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<GetUser, AppError> {
    return ValidateSchema(UpdateUserSchema, info).asyncAndThen((parsed) => {
      const hasAccountInfo = Boolean(parsed.account && Object.keys(parsed.account).length > 0);
      const hasDetailsInfo = Boolean(parsed.details && Object.keys(parsed.details).length > 0);
      const hasRoleInfo = Boolean(parsed.role);

      if (!hasAccountInfo && !hasDetailsInfo && !hasRoleInfo) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      const actorRoles = actorUser
        ? typeof actorUser === "object" && "roles" in actorUser
          ? toRolesArray(actorUser.roles)
          : toRolesArray(actorUser)
        : [];
      const isSysAdmin = actorRoles.includes("SYS_ADMIN");
      const isSelf = typeof actorUser === "object" && actorUser?.account?.id === id;

      const updatedFieldsList: UpdateEmailOpts["updatedFields"] = [];

      return WithTransaction(client, async (tx) => {
        const existing = await this.getUserById(id, tx);
        if (existing.isErr()) throw existing.error;
        const target = existing.value;
        const targetRoles = toRolesArray(target.roles);

        if (targetRoles.includes("SYS_ADMIN") && !isSysAdmin) {
          throw new AppError(
            403,
            "Only System Administrators can modify a System Administrator account.",
          );
        }
        if (targetRoles.includes("ADMIN") && !isSysAdmin && !isSelf) {
          throw new AppError(403, "Only System Administrators can modify Administrator accounts.");
        }
        // Prevent non-SYS_ADMIN from promoting any account to ADMIN or SYS_ADMIN
        if (
          parsed.role &&
          (parsed.role === "ADMIN" || parsed.role === "SYS_ADMIN") &&
          !isSysAdmin
        ) {
          throw new AppError(403, "Only System Administrators can assign administrative roles.");
        }

        // Security check 4: Protect Active Office Holders from Demotion
        if (hasRoleInfo && parsed.role) {
          const deanships = target.offices?.deanships ?? [];
          const chairships = target.offices?.chairships ?? [];
          const isHoldingOffice = deanships.length > 0 || chairships.length > 0;

          if (isHoldingOffice && parsed.role !== "SUPERVISOR") {
            const deanStr = deanships.map((d) => d.initialism).join(", ");
            const chairStr = chairships.map((c) => c.initialism).join(", ");
            const officeDetails = [
              deanStr ? `Dean of (${deanStr})` : null,
              chairStr ? `Chair of (${chairStr})` : null,
            ]
              .filter(Boolean)
              .join(" and ");

            throw new AppError(
              409,
              `Cannot change primary role: User currently holds office as ${officeDetails}. The office must be vacated or reassigned before modifying their supervisory status.`,
            );
          }
        }

        // 1. Details
        if (hasDetailsInfo && parsed.details) {
          const d = parsed.details;

          if (d.first_name && d.first_name !== target.details.first_name) {
            updatedFieldsList.push({
              label: "First Name",
              oldValue: target.details.first_name,
              newValue: d.first_name,
            });
          }
          if (d.last_name && d.last_name !== target.details.last_name) {
            updatedFieldsList.push({
              label: "Last Name",
              oldValue: target.details.last_name,
              newValue: d.last_name,
            });
          }
          if (d.institutional_id && d.institutional_id !== target.details.institutional_id) {
            const [idConflict] = await tx
              .select({ id: PersonalDetails.id })
              .from(PersonalDetails)
              .where(
                and(
                  ne(PersonalDetails.id, target.details.id),
                  eq(PersonalDetails.institutional_id, d.institutional_id),
                  isNull(PersonalDetails.deleted_at),
                ),
              );

            if (idConflict) {
              throw new AppError(
                409,
                `Institutional ID "${d.institutional_id}" is already used by another active person.`,
              );
            }

            updatedFieldsList.push({
              label: "Institutional ID",
              oldValue: target.details.institutional_id,
              newValue: d.institutional_id,
            });
          }

          await tx
            .update(PersonalDetails)
            .set(parsed.details)
            .where(eq(PersonalDetails.id, target.details.id));
        }

        // 2. Account
        if (hasAccountInfo && parsed.account) {
          const a = parsed.account;
          const accountUpdateData: Record<string, any> = { ...a };

          if (a.email && a.email !== target.account.email) {
            const [emailConflict] = await tx
              .select({ id: Accounts.id })
              .from(Accounts)
              .where(
                and(ne(Accounts.id, id), eq(Accounts.email, a.email), isNull(Accounts.deleted_at)),
              );

            if (emailConflict) {
              throw new AppError(
                409,
                `Email "${a.email}" is already used by another active account.`,
              );
            }

            updatedFieldsList.push({
              label: "Email Address",
              oldValue: target.account.email,
              newValue: a.email,
            });
          }

          if (a.password) {
            accountUpdateData.password = bcrypt.hashSync(a.password, 10);
            updatedFieldsList.push({
              label: "Password",
              oldValue: "••••••••",
              newValue: "•••••••• (Updated)",
            });
          }

          await tx
            .update(Accounts)
            .set(accountUpdateData)
            .where(eq(Accounts.id, target.account.id));
        }

        // 3. Role
        if (hasRoleInfo && parsed.role) {
          const hasTargetRole = targetRoles.includes(parsed.role);
          if (!hasTargetRole) {
            const grantRes = await this.grantRole(id, parsed.role, tx);
            if (grantRes.isErr()) throw grantRes.error;

            updatedFieldsList.push({
              label: "Assigned Role",
              oldValue: targetRoles.join(", ") || "None",
              newValue: parsed.role,
            });
          }
        }

        const fullUser = await this.getUserById(id, tx);
        if (fullUser.isErr()) throw fullUser.error;

        return fullUser.value;
      }).andThen((updatedUser) => {
        if (updatedFieldsList.length === 0) {
          return okAsync(updatedUser);
        }

        const fullName = this.formatFullName(updatedUser.details);
        const emailPayload: UpdateEmailOpts = {
          recipientName: fullName,
          updatedFields: updatedFieldsList,
          updatedAt: new Date(),
        };

        return this.emailService
          .sendEmail({
            to: updatedUser.account.email,
            options: {
              subject: "PIT-FES Account Information Updated",
              text: UpdateTextTemplate(emailPayload),
              html: UpdateEmailTemplate(emailPayload),
            },
          })
          .map(() => updatedUser)
          .orElse((emailErr) => {
            console.warn("⚠️ Account update notice email failed to send:", emailErr.message);
            return okAsync(updatedUser);
          });
      });
    });
  }

  deleteUser(id: number, client: DbClient = db, actorUser?: GetUser): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      if (actorUser && actorUser.account?.id === id) {
        throw new AppError(403, "You cannot archive your own account.");
      }

      const existing = await this.getUserById(id, tx);
      if (existing.isErr()) throw existing.error;
      const target = existing.value;
      const targetRoles = toRolesArray(target.roles);
      const isSysAdmin = Boolean(toRolesArray(actorUser?.roles).includes("SYS_ADMIN"));

      if (targetRoles.includes("SYS_ADMIN")) {
        throw new AppError(403, "System Administrator accounts cannot be archived.");
      }
      if (targetRoles.includes("ADMIN") && !isSysAdmin) {
        throw new AppError(403, "Only System Administrators can archive Administrator accounts.");
      }

      await this.checkUserDependencies(id, tx);

      const deleteTime = new Date();

      await tx
        .update(Accounts)
        .set({ deleted_at: deleteTime })
        .where(and(eq(Accounts.id, id), isNull(Accounts.deleted_at)));

      await tx
        .update(PersonalDetails)
        .set({ deleted_at: deleteTime })
        .where(and(eq(PersonalDetails.id, target.details.id), isNull(PersonalDetails.deleted_at)));

      await tx
        .update(AccountRoles)
        .set({ deleted_at: deleteTime })
        .where(and(eq(AccountRoles.account_id, id), isNull(AccountRoles.deleted_at)));
    });
  }

  restoreUser(
    id: number,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<GetUser, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getUserById(id, tx, true);
      if (existing.isErr()) throw existing.error;
      const target = existing.value;
      const targetRoles = toRolesArray(target.roles);

      const isSysAdmin = Boolean(toRolesArray(actorUser?.roles).includes("SYS_ADMIN"));

      if ((targetRoles.includes("ADMIN") || targetRoles.includes("SYS_ADMIN")) && !isSysAdmin) {
        throw new AppError(403, "Only System Administrators can restore administrative accounts.");
      }

      if (!target.account.deleted_at) {
        throw new AppError(400, "This user account is already active and not archived.");
      }

      const [emailConflict] = await tx
        .select({ id: Accounts.id })
        .from(Accounts)
        .where(
          and(
            ne(Accounts.id, id),
            eq(Accounts.email, target.account.email),
            isNull(Accounts.deleted_at),
          ),
        );

      if (emailConflict) {
        throw new AppError(
          409,
          `Cannot restore: Email "${target.account.email}" has been taken by another active account.`,
        );
      }

      const [idConflict] = await tx
        .select({ id: PersonalDetails.id })
        .from(PersonalDetails)
        .where(
          and(
            ne(PersonalDetails.id, target.details.id),
            eq(PersonalDetails.institutional_id, target.details.institutional_id),
            isNull(PersonalDetails.deleted_at),
          ),
        );

      if (idConflict) {
        throw new AppError(
          409,
          `Cannot restore: Institutional ID "${target.details.institutional_id}" is currently in use.`,
        );
      }

      await tx.update(Accounts).set({ deleted_at: null }).where(eq(Accounts.id, id));
      await tx
        .update(PersonalDetails)
        .set({ deleted_at: null })
        .where(eq(PersonalDetails.id, target.details.id));
      await tx
        .update(AccountRoles)
        .set({ deleted_at: null })
        .where(eq(AccountRoles.account_id, id));

      const fullUser = await this.getUserById(id, tx);
      if (fullUser.isErr()) throw fullUser.error;

      return fullUser.value;
    });
  }

  grantRole(
    accountId: number,
    role: SystemRole,
    client: DbClient = db,
  ): ResultAsync<void, AppError> {
    return this.hasRole(accountId, role, client).andThen((alreadyHasRole) => {
      if (alreadyHasRole) {
        return okAsync(undefined);
      }

      return WithTransaction(client, async (tx) => {
        if (role === "STUDENT") {
          const user = await this.getUserById(accountId, tx);
          if (user.isErr()) throw user.error;
          const currentRoles = toRolesArray(user.value.roles);
          const otherRoles = currentRoles.filter((r) => r !== "STUDENT");
          if (otherRoles.length > 0) {
            throw new AppError(
              400,
              "Cannot grant STUDENT role: Account already has employee or administrative roles.",
            );
          }
        } else {
          const hasStudentRole = await this.hasRole(accountId, "STUDENT", tx);
          if (hasStudentRole.isOk() && hasStudentRole.value) {
            throw new AppError(
              400,
              `Cannot grant ${role} role: Account is designated as a STUDENT.`,
            );
          }
        }

        const [systemRole] = await tx
          .select()
          .from(Roles)
          .where(and(eq(Roles.system_role, role), isNull(Roles.deleted_at)));

        if (!systemRole) {
          throw new AppError(404, `Role "${role}" was not found in the system.`);
        }

        const [existingMapping] = await tx
          .select()
          .from(AccountRoles)
          .where(
            and(eq(AccountRoles.account_id, accountId), eq(AccountRoles.role_id, systemRole.id)),
          );

        if (existingMapping) {
          await tx
            .update(AccountRoles)
            .set({ deleted_at: null })
            .where(eq(AccountRoles.id, existingMapping.id));
        } else {
          await tx.insert(AccountRoles).values({
            account_id: accountId,
            role_id: systemRole.id,
          });
        }

        return undefined;
      });
    });
  }

  revokeRole(
    accountId: number,
    role: SystemRole,
    client: DbClient = db,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      if (role === "SUPERVISOR") {
        const user = await this.getUserById(accountId, tx);
        if (user.isErr()) throw user.error;
        const current = user.value;

        const deanships = current.offices?.deanships ?? [];
        const chairships = current.offices?.chairships ?? [];
        const isHoldingOffice = deanships.length > 0 || chairships.length > 0;

        if (isHoldingOffice) {
          const deanStr = deanships.map((d) => d.initialism).join(", ");
          const chairStr = chairships.map((c) => c.initialism).join(", ");
          const officeDetails = [
            deanStr ? `Dean of (${deanStr})` : null,
            chairStr ? `Chair of (${chairStr})` : null,
          ]
            .filter(Boolean)
            .join(" and ");

          throw new AppError(
            409,
            `Cannot revoke SUPERVISOR role: User is currently an active ${officeDetails}. The office must be vacated or reassigned first.`,
          );
        }
      }

      const [systemRole] = await tx.select().from(Roles).where(eq(Roles.system_role, role));
      if (!systemRole) return undefined;

      await tx
        .update(AccountRoles)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(AccountRoles.account_id, accountId),
            eq(AccountRoles.role_id, systemRole.id),
            isNull(AccountRoles.deleted_at),
          ),
        );

      return undefined;
    });
  }

  hasRole(
    accountId: number,
    role: SystemRole,
    client: DbClient = db,
  ): ResultAsync<boolean, AppError> {
    return WithTransaction(client, async (tx) => {
      const userRecord = await this.getUserById(accountId, tx);
      if (userRecord.isErr()) throw userRecord.error;

      const roles = toRolesArray(userRecord.value.roles);
      return roles.includes(role);
    });
  }

  manageRoles(
    accountId: number,
    roles: SystemRole[],
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<GetUser, AppError> {
    return ValidateSchema(ManageUserRolesSchema, { roles }).asyncAndThen((parsed) => {
      const isSysAdmin = Boolean(toRolesArray(actorUser?.roles).includes("SYS_ADMIN"));

      return WithTransaction(client, async (tx) => {
        const user = await this.getUserById(accountId, tx);
        if (user.isErr()) throw user.error;
        const target = user.value;
        const targetRoles = toRolesArray(target.roles);

        if ((targetRoles.includes("ADMIN") || targetRoles.includes("SYS_ADMIN")) && !isSysAdmin) {
          throw new AppError(
            403,
            "Only System Administrators can manage roles for administrative accounts.",
          );
        }
        if ((parsed.roles.includes("ADMIN") || parsed.roles.includes("SYS_ADMIN")) && !isSysAdmin) {
          throw new AppError(403, "Only System Administrators can grant administrative roles.");
        }

        const deanships = target.offices?.deanships ?? [];
        const chairships = target.offices?.chairships ?? [];
        const isHoldingOffice = deanships.length > 0 || chairships.length > 0;

        if (isHoldingOffice && !parsed.roles.includes("SUPERVISOR")) {
          const deanStr = deanships.map((d) => d.initialism).join(", ");
          const chairStr = chairships.map((c) => c.initialism).join(", ");
          const officeDetails = [
            deanStr ? `Dean of (${deanStr})` : null,
            chairStr ? `Chair of (${chairStr})` : null,
          ]
            .filter(Boolean)
            .join(" and ");

          throw new AppError(
            409,
            `Cannot remove SUPERVISOR role: User is currently an active ${officeDetails}. The office must be vacated or reassigned first.`,
          );
        }

        const systemRoles = await tx
          .select()
          .from(Roles)
          .where(and(inArray(Roles.system_role, parsed.roles), isNull(Roles.deleted_at)));

        if (systemRoles.length !== parsed.roles.length) {
          throw new AppError(400, "One or more specified roles do not exist.");
        }

        const roleIdMap = new Map(systemRoles.map((r) => [r.system_role, r.id]));

        await tx
          .update(AccountRoles)
          .set({ deleted_at: new Date() })
          .where(and(eq(AccountRoles.account_id, accountId), isNull(AccountRoles.deleted_at)));

        for (const roleName of parsed.roles) {
          const roleId = roleIdMap.get(roleName)!;

          const [existing] = await tx
            .select()
            .from(AccountRoles)
            .where(and(eq(AccountRoles.account_id, accountId), eq(AccountRoles.role_id, roleId)));

          if (existing) {
            await tx
              .update(AccountRoles)
              .set({ deleted_at: null })
              .where(eq(AccountRoles.id, existing.id));
          } else {
            await tx.insert(AccountRoles).values({
              account_id: accountId,
              role_id: roleId,
            });
          }
        }

        const updatedUser = await this.getUserById(accountId, tx);
        if (updatedUser.isErr()) throw updatedUser.error;

        return updatedUser.value;
      });
    });
  }

  resetUserPassword(
    accountId: number,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<{ temporaryPassword: string }, AppError> {
    return WithTransaction(client, async (tx) => {
      const user = await this.getUserById(accountId, tx);
      if (user.isErr()) throw user.error;
      const targetUser = user.value;
      const targetRoles = toRolesArray(targetUser.roles);

      const isSysAdmin = Boolean(toRolesArray(actorUser?.roles).includes("SYS_ADMIN"));
      const isSelf = actorUser?.account?.id === accountId;

      if (targetRoles.includes("SYS_ADMIN") && !isSysAdmin) {
        throw new AppError(
          403,
          "You do not have permission to reset a System Administrator's password.",
        );
      }

      if (targetRoles.includes("ADMIN") && !isSysAdmin && !isSelf) {
        throw new AppError(
          403,
          "Administrators cannot reset passwords for other Administrator accounts.",
        );
      }

      const temporaryPassword = this.generatePassword(12);
      const hash = bcrypt.hashSync(temporaryPassword, 10);

      await tx
        .update(Accounts)
        .set({ password: hash, is_verified: false, updated_at: new Date() })
        .where(eq(Accounts.id, accountId));

      return { targetUser, temporaryPassword };
    }).andThen(({ targetUser, temporaryPassword }) => {
      const fullName = this.formatFullName(targetUser.details);

      const emailPayload: WelcomeEmailOpts = {
        recipientName: fullName,
        email: targetUser.account.email,
        generatedPassword: temporaryPassword,
        url: env.CLIENT_URL,
      };

      return this.emailService
        .sendEmail({
          to: targetUser.account.email,
          options: {
            subject: "PIT-FES Password Reset Notice",
            text: WelcomeTextTemplate(emailPayload),
            html: WelcomeEmailTemplate(emailPayload),
          },
        })
        .map(() => ({ temporaryPassword }))
        .orElse((err) => {
          console.warn("⚠️ Password reset email delivery failed:", err.message);
          return okAsync({ temporaryPassword });
        });
    });
  }

  changePassword(
    accountId: number,
    payload: ChangePassword,
    client: DbClient = db,
    isSelfService = false,
  ): ResultAsync<void, AppError> {
    return ValidateSchema(ChangePasswordSchema, payload).asyncAndThen((parsed) => {
      return WithTransaction(client, async (tx) => {
        const [account] = await tx
          .select()
          .from(Accounts)
          .where(and(eq(Accounts.id, accountId), isNull(Accounts.deleted_at)));

        if (!account) throw new AppError(404, "User account not found.");

        if (isSelfService) {
          if (!parsed.current_password) {
            throw new AppError(400, "Current password is required to change your password.");
          }

          const isMatch = bcrypt.compareSync(parsed.current_password, account.password);
          if (!isMatch) {
            throw new AppError(400, "Incorrect current password provided.");
          }
        }

        const newHash = bcrypt.hashSync(parsed.new_password, 10);

        await tx
          .update(Accounts)
          .set({ password: newHash, is_verified: true, updated_at: new Date() })
          .where(eq(Accounts.id, accountId));

        return undefined;
      });
    });
  }

  resendWelcomeEmail(
    accountId: number,
    client: DbClient = db,
    actorUser?: GetUser,
  ): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const user = await this.getUserById(accountId, tx);
      if (user.isErr()) throw user.error;
      const targetUser = user.value;
      const targetRoles = toRolesArray(targetUser.roles);

      const isSysAdmin = Boolean(toRolesArray(actorUser?.roles).includes("SYS_ADMIN"));
      const isSelf = actorUser?.account?.id === accountId;

      if (targetRoles.includes("SYS_ADMIN") && !isSysAdmin) {
        throw new AppError(
          403,
          "You do not have permission to resend credentials for a System Administrator.",
        );
      }

      if (targetRoles.includes("ADMIN") && !isSysAdmin && !isSelf) {
        throw new AppError(
          403,
          "Administrators cannot resend credentials for other Administrator accounts.",
        );
      }

      const temporaryPassword = this.generatePassword(12);
      const hash = bcrypt.hashSync(temporaryPassword, 10);

      await tx
        .update(Accounts)
        .set({ password: hash, is_verified: false, updated_at: new Date() })
        .where(eq(Accounts.id, accountId));

      return { targetUser, temporaryPassword };
    }).andThen(({ targetUser, temporaryPassword }) => {
      const fullName = this.formatFullName(targetUser.details);

      const emailPayload: WelcomeEmailOpts = {
        recipientName: fullName,
        email: targetUser.account.email,
        generatedPassword: temporaryPassword,
        url: env.CLIENT_URL,
      };

      return this.emailService.sendEmail({
        to: targetUser.account.email,
        options: {
          subject: "PIT-FES Account Credentials",
          text: WelcomeTextTemplate(emailPayload),
          html: WelcomeEmailTemplate(emailPayload),
        },
      });
    });
  }

  private generatePassword(length = 12): string {
    const minLength = Math.max(8, length);
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
    const allChars = uppercase + lowercase + numbers + symbols;

    const passwordArray: string[] = [
      uppercase[crypto.randomInt(0, uppercase.length)]!,
      lowercase[crypto.randomInt(0, lowercase.length)]!,
      numbers[crypto.randomInt(0, numbers.length)]!,
      symbols[crypto.randomInt(0, symbols.length)]!,
    ];

    for (let i = passwordArray.length; i < minLength; i++) {
      passwordArray.push(allChars[crypto.randomInt(0, allChars.length)]!);
    }

    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const temp = passwordArray[i]!;
      passwordArray[i] = passwordArray[j]!;
      passwordArray[j] = temp;
    }

    return passwordArray.join("");
  }

  private formatFullName(
    person?:
      | {
          first_name?: string | null | undefined;
          last_name?: string | null | undefined;
          middle_name?: string | null | undefined;
          suffix?: string | null | undefined;
        }
      | null
      | undefined,
  ): string {
    if (!person) return "";
    const isValid = (val?: string | null | undefined): val is string =>
      Boolean(val && val.trim().length > 0);
    const { last_name, first_name, middle_name, suffix } = person;

    if (!isValid(last_name) && !isValid(first_name)) return "";
    const validLastName = isValid(last_name) ? last_name.trim() : "";
    const validFirstName = isValid(first_name) ? first_name.trim() : "";

    const baseName =
      validLastName && validFirstName
        ? `${validLastName}, ${validFirstName}`
        : validLastName || validFirstName;

    const extraParts = [middle_name, suffix].filter(isValid).map((str) => str.trim());
    const extraFormatted = extraParts.length > 0 ? ` ${extraParts.join(" ")}` : "";

    return `${baseName}${extraFormatted}`;
  }

  private async checkUserDependencies(accountId: number, tx: PgTransaction): Promise<void> {
    const [
      activeDeanships,
      activeChairs,
      activeOfferings,
      activeClassStudents,
      activeStudentClasses,
    ] = await Promise.all([
      tx
        .select({ total: count(CollegeDeans.id) })
        .from(CollegeDeans)
        .where(and(eq(CollegeDeans.dean_id, accountId), isNull(CollegeDeans.deleted_at))),
      tx
        .select({ total: count(ProgramChairs.id) })
        .from(ProgramChairs)
        .where(and(eq(ProgramChairs.chair_id, accountId), isNull(ProgramChairs.deleted_at))),
      tx
        .select({ total: count(CourseOfferings.id) })
        .from(CourseOfferings)
        .where(and(eq(CourseOfferings.faculty_id, accountId), isNull(CourseOfferings.deleted_at))),
      tx
        .select({ total: count(ClassStudents.id) })
        .from(ClassStudents)
        .where(
          and(eq(ClassStudents.student_account_id, accountId), isNull(ClassStudents.deleted_at)),
        ),
      tx
        .select({ total: count(StudentClasses.id) })
        .from(StudentClasses)
        .where(
          and(eq(StudentClasses.student_account_id, accountId), isNull(StudentClasses.deleted_at)),
        ),
    ]);

    const deanshipCount = activeDeanships[0]?.total ?? 0;
    const chairCount = activeChairs[0]?.total ?? 0;
    const offeringCount = activeOfferings[0]?.total ?? 0;
    const classStudentCount = activeClassStudents[0]?.total ?? 0;
    const studentClassCount = activeStudentClasses[0]?.total ?? 0;

    if (
      deanshipCount > 0 ||
      chairCount > 0 ||
      offeringCount > 0 ||
      classStudentCount > 0 ||
      studentClassCount > 0
    ) {
      const reasons: string[] = [];
      if (deanshipCount > 0) reasons.push(`Dean of ${deanshipCount} college(s)`);
      if (chairCount > 0) reasons.push(`Program Chair of ${chairCount} program(s)`);
      if (offeringCount > 0)
        reasons.push(`assigned Faculty to ${offeringCount} course offering(s)`);
      if (classStudentCount > 0 || studentClassCount > 0)
        reasons.push(`enrolled in academic class(es)`);

      throw new AppError(
        409,
        `Cannot delete user account because it has active assignments: ${reasons.join(", ")}. Please reassign or unenroll them first.`,
      );
    }
  }
}
