import db from "@/configs/db.config.js";
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
  type IAccountInsert,
  type LoginAccount,
  type PaginatedData,
  type SystemRole,
  type UserQuery,
  type WelcomeEmailOpts,
} from "@my-app/shared";
import { and, asc, countDistinct, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { EmailService, type IEmailService } from "./email.service.js";
import { WelcomeEmailTemplate, WelcomeTextTemplate } from "@/libs/email.lib.js";
import env from "@/configs/env.config.js";

export interface IUserService {
  getUserById(id: number, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUserByEmail(email: string, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUserForLogin(credentials: LoginAccount, client?: DbClient): ResultAsync<GetUser, AppError>;
  getUsers(rawQuery: UserQuery, client?: DbClient): ResultAsync<PaginatedData<GetUser[]>, AppError>;
  createUser(info: CreateUser, client?: DbClient): ResultAsync<GetUser, AppError>;
  grantRole(accountId: number, role: SystemRole, client: DbClient): ResultAsync<void, AppError>;
  revokeRole(accountId: number, role: SystemRole, client: DbClient): ResultAsync<void, AppError>;
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
          },
          details: {
            id: PersonalDetails.id,
            institutional_id: PersonalDetails.institutional_id,
            first_name: PersonalDetails.first_name,
            last_name: PersonalDetails.last_name,
            middle_name: PersonalDetails.middle_name,
            suffix: PersonalDetails.suffix,
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
          },
          details: {
            id: PersonalDetails.id,
            institutional_id: PersonalDetails.institutional_id,
            first_name: PersonalDetails.first_name,
            last_name: PersonalDetails.last_name,
            middle_name: PersonalDetails.middle_name,
            suffix: PersonalDetails.suffix,
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
              },
              details: {
                id: PersonalDetails.id,
                institutional_id: PersonalDetails.institutional_id,
                first_name: PersonalDetails.first_name,
                last_name: PersonalDetails.last_name,
                middle_name: PersonalDetails.middle_name,
                suffix: PersonalDetails.suffix,
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
    rawQuery: UserQuery,
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
            },
            details: {
              id: PersonalDetails.id,
              institutional_id: PersonalDetails.institutional_id,
              first_name: PersonalDetails.first_name,
              last_name: PersonalDetails.last_name,
              middle_name: PersonalDetails.middle_name,
              suffix: PersonalDetails.suffix,
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

  private hasRole(accountId: number, role: SystemRole, client: DbClient = db) {
    return WithTransaction(client, async (tx) => {
      const userRecord = await this.getUserById(accountId, tx);
      if (userRecord.isErr()) throw userRecord.error;

      return userRecord.value.roles.includes(role);
    });
  }
}
