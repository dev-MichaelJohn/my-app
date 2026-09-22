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
  type CreateUser,
  type GetUser,
  type UpdateUser,
  type IAccountInsert,
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
} from "@my-app/shared";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
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

export interface IUserService {
  getUserById(id: number, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUserByEmail(email: string, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUserForLogin(credentials: LoginAccount, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUsers(rawQuery: unknown, client?: DbClient): ResultAsync<PaginatedData<GetUser[]>, AppError>;
  createUser(info: CreateUser, client?: DbClient): ResultAsync<GetUser, AppError>;
  grantRole(accountId: number, role: SystemRole, client: DbClient): ResultAsync<void, AppError>;
  updateUser(id: number, info: UpdateUser, client?: DbClient): ResultAsync<GetUser, AppError>;
  deleteUser(id: number, client?: DbClient): ResultAsync<void, AppError>;
  restoreUser(id: number, client?: DbClient): ResultAsync<GetUser, AppError>;
  revokeRole(accountId: number, role: SystemRole, client: DbClient): ResultAsync<void, AppError>;
  hasRole(accountId: number, role: SystemRole, client: DbClient): ResultAsync<boolean, AppError>;
}

export class UserService implements IUserService {
  constructor(private emailService: IEmailService = new EmailService()) {}

  getUserById(id: number, client: DbClient = db): ResultAsync<GetUser, AppError> {
    return WithTransaction(client, async (tx) => {
      const [user] = await tx
        .select({
          account: {
            id: Accounts.id,
            personal_details_id: Accounts.personal_details_id,
            email: Accounts.email,
            is_verified: Accounts.is_verified,
            deleted_at: Accounts.deleted_at,
          },
          details: {
            id: PersonalDetails.id,
            institutional_id: PersonalDetails.institutional_id,
            first_name: PersonalDetails.first_name,
            last_name: PersonalDetails.last_name,
            middle_name: PersonalDetails.middle_name,
            suffix: PersonalDetails.suffix,
            deleted_at: PersonalDetails.deleted_at,
          },
          roles: sql<GetUser["roles"]>`
            COALESCE(
              JSON_AGG(${Roles.system_role}) FILTER (WHERE ${Roles.id} IS NOT NULL),
              '[]'
            )
          `,
        })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .leftJoin(
          AccountRoles,
          and(eq(Accounts.id, AccountRoles.account_id), isNull(AccountRoles.deleted_at)),
        )
        .leftJoin(Roles, and(eq(AccountRoles.role_id, Roles.id), isNull(Roles.deleted_at)))
        .where(and(eq(Accounts.id, id), isNull(Accounts.deleted_at)))
        .groupBy(Accounts.id, PersonalDetails.id);

      return user ?? null;
    }).andThen((user) => {
      return user ? okAsync(user) : errAsync(new AppError(404, "User account was not found."));
    });
  }

  getUserByEmail(email: string, client: DbClient = db): ResultAsync<GetUser, AppError> {
    return WithTransaction(client, async (tx) => {
      const [user] = await tx
        .select({
          account: {
            id: Accounts.id,
            personal_details_id: Accounts.personal_details_id,
            email: Accounts.email,
            is_verified: Accounts.is_verified,
            deleted_at: Accounts.deleted_at,
          },
          details: {
            id: PersonalDetails.id,
            institutional_id: PersonalDetails.institutional_id,
            first_name: PersonalDetails.first_name,
            last_name: PersonalDetails.last_name,
            middle_name: PersonalDetails.middle_name,
            suffix: PersonalDetails.suffix,
            deleted_at: PersonalDetails.deleted_at,
          },
          roles: sql<GetUser["roles"]>`
            COALESCE(
              JSON_AGG(${Roles.system_role}) FILTER (WHERE ${Roles.id} IS NOT NULL),
              '[]'
            )
          `,
        })
        .from(Accounts)
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .leftJoin(
          AccountRoles,
          and(eq(Accounts.id, AccountRoles.account_id), isNull(AccountRoles.deleted_at)),
        )
        .leftJoin(Roles, and(eq(AccountRoles.role_id, Roles.id), isNull(Roles.deleted_at)))
        .where(and(eq(Accounts.email, email), isNull(Accounts.deleted_at)))
        .groupBy(Accounts.id, PersonalDetails.id);

      return user ?? null;
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
              account: {
                id: Accounts.id,
                personal_details_id: Accounts.personal_details_id,
                email: Accounts.email,
                password: Accounts.password,
                is_verified: Accounts.is_verified,
                deleted_at: Accounts.deleted_at,
              },
              details: {
                id: PersonalDetails.id,
                institutional_id: PersonalDetails.institutional_id,
                first_name: PersonalDetails.first_name,
                last_name: PersonalDetails.last_name,
                middle_name: PersonalDetails.middle_name,
                suffix: PersonalDetails.suffix,
                deleted_at: PersonalDetails.deleted_at,
              },
              roles: sql<GetUser["roles"]>`
                COALESCE(
                  JSON_AGG(${Roles.system_role}) FILTER (WHERE ${Roles.id} IS NOT NULL),
                  '[]'
                )
              `,
            })
            .from(PersonalDetails)
            .innerJoin(
              Accounts,
              and(
                eq(Accounts.personal_details_id, PersonalDetails.id),
                isNull(Accounts.deleted_at),
              ),
            )
            .leftJoin(
              AccountRoles,
              and(eq(Accounts.id, AccountRoles.account_id), isNull(AccountRoles.deleted_at)),
            )
            .leftJoin(Roles, and(eq(AccountRoles.role_id, Roles.id), isNull(Roles.deleted_at)))
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
              roles: user.roles,
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
      const { paginate, page, limit, search, role, is_verified, sort_by, order } = parsed;

      const filters: SQL[] = [isNull(Accounts.deleted_at), isNull(PersonalDetails.deleted_at)];

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
      if (role) filters.push(and(eq(Roles.system_role, role), isNull(AccountRoles.deleted_at))!);

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
          .select({
            account: {
              id: Accounts.id,
              personal_details_id: Accounts.personal_details_id,
              email: Accounts.email,
              is_verified: Accounts.is_verified,
              deleted_at: Accounts.deleted_at,
            },
            details: {
              id: PersonalDetails.id,
              institutional_id: PersonalDetails.institutional_id,
              first_name: PersonalDetails.first_name,
              last_name: PersonalDetails.last_name,
              middle_name: PersonalDetails.middle_name,
              suffix: PersonalDetails.suffix,
              deleted_at: PersonalDetails.deleted_at,
            },
            roles: sql<GetUser["roles"]>`
              COALESCE(
                JSON_AGG(${Roles.system_role}) FILTER (WHERE ${Roles.id} IS NOT NULL),
                '[]'
              )
            `,
          })
          .from(Accounts)
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .leftJoin(
            AccountRoles,
            and(eq(Accounts.id, AccountRoles.account_id), isNull(AccountRoles.deleted_at)),
          )
          .leftJoin(Roles, and(eq(AccountRoles.role_id, Roles.id), isNull(Roles.deleted_at)))
          .where(whereCondition)
          .groupBy(Accounts.id, PersonalDetails.id)
          .orderBy(orderByClause)
          .$dynamic();

        if (!paginate) {
          const users = await baseQuery;
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
          .leftJoin(
            AccountRoles,
            and(eq(Accounts.id, AccountRoles.account_id), isNull(AccountRoles.deleted_at)),
          )
          .leftJoin(Roles, and(eq(AccountRoles.role_id, Roles.id), isNull(Roles.deleted_at)))
          .where(whereCondition);

        const [users, countResult] = await Promise.all([paginatedQuery, countQuery]);
        const totalItems = countResult[0]?.total ?? 0;

        return createPaginatedData({
          data: users,
          currentPage: page,
          pageSize: limit,
          totalItems,
        });
      });
    });
  }

  createUser(info: CreateUser, client: DbClient = db): ResultAsync<GetUser, AppError> {
    return ValidateSchema(CreateUserSchema, info).asyncAndThen((parsedInfo) => {
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
          throw new AppError(
            500,
            "Failed to create personal details record while registering user. User account was not created.",
          );
        }

        const hash = bcrypt.hashSync(plainPassword, 10);
        const accountDetails: IAccountInsert = {
          ...parsedInfo.account,
          password: hash,
          personal_details_id: userDetails.id,
        };

        const [userAccount] = await tx.insert(Accounts).values(accountDetails).returning();
        if (!userAccount) {
          throw new AppError(
            500,
            "Failed to create account record while registering user. Personal details record was rolled back.",
          );
        }

        const [systemRole] = await tx
          .select()
          .from(Roles)
          .where(eq(Roles.system_role, parsedInfo.role));

        if (!systemRole) {
          throw new AppError(
            400,
            "Given role has not been found. Changes during account creation were rolled back.",
          );
        }

        const [userRole] = await tx
          .insert(AccountRoles)
          .values({ account_id: userAccount.id, role_id: systemRole.id })
          .returning();

        if (!userRole) {
          throw new AppError(
            400,
            "Failed to map account record to a role. Changes during account creation were rolled back.",
          );
        }

        const { password: _password, ...filteredAccount } = userAccount;

        return {
          account: filteredAccount,
          details: userDetails,
          roles: [systemRole.system_role],
        };
      }).andThen((newUser) => {
        const fullName = this.formatFullName({
          first_name: newUser.details.first_name,
          last_name: newUser.details.last_name,
          middle_name: newUser.details.middle_name,
          suffix: newUser.details.suffix,
        });

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
              subject: "PIT-FES Account Creation Notice",
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

  updateUser(id: number, info: UpdateUser, client: DbClient = db): ResultAsync<GetUser, AppError> {
    return ValidateSchema(UpdateUserSchema, info).asyncAndThen((parsed) => {
      const hasAccountInfo = Boolean(parsed.account && Object.keys(parsed.account).length > 0);
      const hasDetailsInfo = Boolean(parsed.details && Object.keys(parsed.details).length > 0);
      const hasRoleInfo = Boolean(parsed.role);

      if (!hasAccountInfo && !hasDetailsInfo && !hasRoleInfo) {
        return errAsync(new AppError(400, "No update parameters were provided."));
      }

      const updatedFieldsList: UpdateEmailOpts["updatedFields"] = [];
      let rawNewPassword: string | undefined = undefined;

      return WithTransaction(client, async (tx) => {
        const existing = await this.getUserById(id, tx);
        if (existing.isErr()) throw existing.error;
        const current = existing.value;

        // ── 1. Track & Update Personal Details ──
        if (hasDetailsInfo && parsed.details) {
          const d = parsed.details;

          if (d.first_name && d.first_name !== current.details.first_name) {
            updatedFieldsList.push({
              label: "First Name",
              oldValue: current.details.first_name,
              newValue: d.first_name,
            });
          }

          if (d.last_name && d.last_name !== current.details.last_name) {
            updatedFieldsList.push({
              label: "Last Name",
              oldValue: current.details.last_name,
              newValue: d.last_name,
            });
          }

          if (d.middle_name !== undefined && d.middle_name !== current.details.middle_name) {
            updatedFieldsList.push({
              label: "Middle Name",
              oldValue: current.details.middle_name || "None",
              newValue: d.middle_name || "None",
            });
          }

          if (d.suffix !== undefined && d.suffix !== current.details.suffix) {
            updatedFieldsList.push({
              label: "Suffix",
              oldValue: current.details.suffix || "None",
              newValue: d.suffix || "None",
            });
          }

          if (d.institutional_id && d.institutional_id !== current.details.institutional_id) {
            const [idConflict] = await tx
              .select({ id: PersonalDetails.id })
              .from(PersonalDetails)
              .where(
                and(
                  ne(PersonalDetails.id, current.details.id),
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
              oldValue: current.details.institutional_id,
              newValue: d.institutional_id,
            });
          }

          await tx
            .update(PersonalDetails)
            .set(parsed.details)
            .where(eq(PersonalDetails.id, current.details.id));
        }

        if (hasAccountInfo && parsed.account) {
          const a = parsed.account;
          const accountUpdateData: Record<string, any> = { ...a };

          if (a.email && a.email !== current.account.email) {
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
              oldValue: current.account.email,
              newValue: a.email,
            });
          }

          if (a.password) {
            rawNewPassword = a.password;
            accountUpdateData.password = bcrypt.hashSync(a.password, 10);

            updatedFieldsList.push({
              label: "Password",
              oldValue: "••••••••",
              newValue: rawNewPassword,
            });
          }

          await tx
            .update(Accounts)
            .set(accountUpdateData)
            .where(eq(Accounts.id, current.account.id));
        }

        // ── 3. Track & Update Role Assignment ──
        if (hasRoleInfo && parsed.role) {
          const hasRole = current.roles.includes(parsed.role);
          if (!hasRole) {
            const grantRes = await this.grantRole(id, parsed.role, tx);
            if (grantRes.isErr()) throw grantRes.error;

            updatedFieldsList.push({
              label: "Assigned Role",
              oldValue: current.roles.join(", ") || "None",
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

        const fullName = this.formatFullName({
          first_name: updatedUser.details.first_name,
          last_name: updatedUser.details.last_name,
          middle_name: updatedUser.details.middle_name ?? null,
          suffix: updatedUser.details.suffix ?? null,
        });
        const recipientEmail = updatedUser.account.email;

        const emailPayload: UpdateEmailOpts = {
          recipientName: fullName,
          updatedFields: updatedFieldsList,
          updatedAt: new Date(),
        };

        return this.emailService
          .sendEmail({
            to: recipientEmail,
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

  deleteUser(id: number, client: DbClient = db): ResultAsync<void, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getUserById(id, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      await this.checkUserDependencies(id, tx);

      const deleteTime = new Date();

      await tx
        .update(Accounts)
        .set({ deleted_at: deleteTime })
        .where(and(eq(Accounts.id, id), isNull(Accounts.deleted_at)));

      await tx
        .update(PersonalDetails)
        .set({ deleted_at: deleteTime })
        .where(and(eq(PersonalDetails.id, current.details.id), isNull(PersonalDetails.deleted_at)));

      await tx
        .update(AccountRoles)
        .set({ deleted_at: deleteTime })
        .where(and(eq(AccountRoles.account_id, id), isNull(AccountRoles.deleted_at)));
    });
  }

  restoreUser(id: number, client: DbClient = db): ResultAsync<GetUser, AppError> {
    return WithTransaction(client, async (tx) => {
      const existing = await this.getUserById(id, tx);
      if (existing.isErr()) throw existing.error;
      const current = existing.value;

      if (!current.account.deleted_at) {
        throw new AppError(400, "This user account is already active and not archived.");
      }

      const [emailConflict] = await tx
        .select({ id: Accounts.id })
        .from(Accounts)
        .where(
          and(
            ne(Accounts.id, id),
            eq(Accounts.email, current.account.email),
            isNull(Accounts.deleted_at),
          ),
        );

      if (emailConflict) {
        throw new AppError(
          409,
          `Cannot restore: Email "${current.account.email}" has been taken by another active account.`,
        );
      }

      const [idConflict] = await tx
        .select({ id: PersonalDetails.id })
        .from(PersonalDetails)
        .where(
          and(
            ne(PersonalDetails.id, current.details.id),
            eq(PersonalDetails.institutional_id, current.details.institutional_id),
            isNull(PersonalDetails.deleted_at),
          ),
        );

      if (idConflict) {
        throw new AppError(
          409,
          `Cannot restore: Institutional ID "${current.details.institutional_id}" is currently in use.`,
        );
      }

      await tx.update(Accounts).set({ deleted_at: null }).where(eq(Accounts.id, id));
      await tx
        .update(PersonalDetails)
        .set({ deleted_at: null })
        .where(eq(PersonalDetails.id, current.details.id));
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
          const [created] = await tx
            .insert(AccountRoles)
            .values({
              account_id: accountId,
              role_id: systemRole.id,
            })
            .returning();

          if (!created) {
            throw new AppError(500, `Failed to grant role "${role}".`);
          }
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

  hasRole(accountId: number, role: SystemRole, client: DbClient = db) {
    return WithTransaction(client, async (tx) => {
      const userRecord = await this.getUserById(accountId, tx);
      if (userRecord.isErr()) throw userRecord.error;

      return userRecord.value.roles.includes(role);
    });
  }

  private generatePassword(length: number = 12) {
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
      const charI = passwordArray[i]!;
      const charJ = passwordArray[j]!;
      passwordArray[i] = charJ;
      passwordArray[j] = charI;
    }

    return passwordArray.join("");
  }

  private formatFullName = (
    person?: {
      first_name?: string | null;
      last_name?: string | null;
      middle_name?: string | null;
      suffix?: string | null;
    } | null,
  ) => {
    if (!person) return "";

    const isValid = (val?: string | null): val is string => Boolean(val && val.trim().length > 0);

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
  };

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
        reasons.push(`enrolled in active academic class(es)`);

      throw new AppError(
        409,
        `Cannot delete user account because it has active assignments: ${reasons.join(", ")}. Please reassign or unenroll them first.`,
      );
    }
  }
}
