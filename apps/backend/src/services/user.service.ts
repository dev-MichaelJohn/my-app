import db from "@/configs/db.config.js";
import { AppError } from "@/libs/error.lib.js";
import { FromDbPromise, ValidateSchema } from "@/libs/result.lib.js";
import {
  AccountRoles,
  Accounts,
  LoginAccountSchema,
  PersonalDetails,
  Roles,
  UserQuerySchema,
  type GetUser,
  type LoginAccount,
  type PaginatedData,
} from "@my-app/shared";
import { and, asc, countDistinct, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import bcrypt from "bcryptjs";
import { createPaginatedData } from "@/libs/response.lib.js";

export interface IUserService {
  getUserById(id: number): ResultAsync<GetUser, AppError>;
  getUserForLogin({ institutional_id, password }: LoginAccount): ResultAsync<GetUser, AppError>;
  getUsers(rawQuery: unknown): ResultAsync<PaginatedData<GetUser[]>, AppError>;
  getUserByEmail(email: string): ResultAsync<GetUser, AppError>;
}

export class UserService implements IUserService {
  getUserById(id: number): ResultAsync<GetUser, AppError> {
    return FromDbPromise(
      db
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
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', ${Roles.id},
                  'name', ${Roles.system_role}
                )
              ) FILTER (WHERE ${Roles.id} IS NOT NULL),
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
        .leftJoin(Roles, eq(AccountRoles.role_id, Roles.id))
        .where(and(eq(Accounts.id, id), isNull(Accounts.deleted_at)))
        .groupBy(Accounts.id, PersonalDetails.id),
    ).andThen(([user]) => {
      return user ? okAsync(user) : errAsync(new AppError(404, "User account was not found."));
    });
  }

  getUserByEmail(email: string): ResultAsync<GetUser, AppError> {
    return FromDbPromise(
      db
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
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'id', ${Roles.id},
                  'name', ${Roles.system_role}
                )
              ) FILTER (WHERE ${Roles.id} IS NOT NULL),
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
        .leftJoin(Roles, eq(AccountRoles.role_id, Roles.id))
        .where(and(eq(Accounts.email, email), isNull(Accounts.deleted_at)))
        .groupBy(Accounts.id, PersonalDetails.id),
    ).andThen(([user]) => {
      return user ? okAsync(user) : errAsync(new AppError(404, "User account was not found."));
    });
  }

  getUserForLogin({ institutional_id, password }: LoginAccount): ResultAsync<GetUser, AppError> {
    return ValidateSchema(LoginAccountSchema, { institutional_id, password }).asyncAndThen(
      (parsed) => {
        return FromDbPromise(
          db
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
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ${Roles.id},
                      'name', ${Roles.system_role}
                    )
                  ) FILTER (WHERE ${Roles.id} IS NOT NULL),
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
            .leftJoin(Roles, eq(AccountRoles.role_id, Roles.id))
            .where(
              and(
                eq(PersonalDetails.institutional_id, parsed.institutional_id),
                isNull(PersonalDetails.deleted_at),
              ),
            )
            .groupBy(Accounts.id, PersonalDetails.id),
        ).andThen(([user]) => {
          if (!user) return errAsync(new AppError(401, "Invalid institutional ID or password."));
          return ResultAsync.fromPromise(
            bcrypt.compare(parsed.password, user.account.password),
            () => new AppError(500, "Failed to verify credentials."),
          ).andThen((isPasswordValid) => {
            if (!isPasswordValid)
              return errAsync(new AppError(401, "Invalid institutional ID or password."));

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

  getUsers(rawQuery: unknown): ResultAsync<PaginatedData<GetUser[]>, AppError> {
    return ValidateSchema(UserQuerySchema, rawQuery).asyncAndThen((parsed) => {
      const { page, limit, search, role, is_verified, sort_by, order } = parsed;
      const offset = (page - 1) * limit;

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

      return FromDbPromise(
        Promise.all([
          db
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
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ${Roles.id},
                      'name', ${Roles.system_role}
                    )
                  ) FILTER (WHERE ${Roles.id} IS NOT NULL),
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
            .limit(limit)
            .offset(offset),
          db
            .select({
              total: countDistinct(Accounts.id),
            })
            .from(Accounts)
            .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
            .leftJoin(
              AccountRoles,
              and(eq(Accounts.id, AccountRoles.account_id), isNull(AccountRoles.deleted_at)),
            )
            .leftJoin(Roles, and(eq(AccountRoles.role_id, Roles.id), isNull(Roles.deleted_at)))
            .where(whereCondition),
        ]),
      ).map(([users, countResult]) => {
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
}
