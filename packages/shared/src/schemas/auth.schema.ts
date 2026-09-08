import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
  boolean,
  uniqueIndex,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const PersonalDetails = pgTable(
  "personal_details",
  {
    id: serial("id").primaryKey(),
    institutional_id: varchar("institutional_id", { length: 32 }).notNull(),
    last_name: varchar("last_name", { length: 64 }).notNull(),
    first_name: varchar("first_name", { length: 64 }).notNull(),
    middle_name: varchar("middle_name", { length: 64 }),
    suffix: varchar("suffix", { length: 8 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_institution_id")
      .on(t.institutional_id)
      .where(sql`deleted_at IS NULL`),
    uniqueIndex("uidx_active_personal_details_composite")
      .on(
        sql`${t.institutional_id}, ${t.last_name}, ${t.first_name}, COALESCE(${t.middle_name}, ''), COALESCE(${t.suffix}, '')`,
      )
      .where(sql`deleted_at IS NULL`),
  ],
);

export const Accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    personal_details_id: integer("personal_details_id")
      .notNull()
      .references(() => PersonalDetails.id),
    email: varchar("email", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    is_verified: boolean("is_verified").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_accounts_email")
      .on(t.email)
      .where(sql`deleted_at IS NULL`),
    uniqueIndex("uidx_active_accounts_personal_details")
      .on(t.personal_details_id)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const OTPCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 8 }).notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    expires_at: timestamp("expires_at").notNull(),
    is_active: boolean("is_active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("uidx_otp_email")
      .on(t.email)
      .where(sql`${t.is_active} = true`),
  ],
);

export const SystemRoles = pgEnum("system_role", [
  "SYS_ADMIN",
  "ADMIN",
  "SUPERVISOR",
  "FACULTY",
  "STUDENT",
]);
export const Roles = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    system_role: SystemRoles().notNull(),
    description: varchar("description", { length: 128 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_roles_system_role")
      .on(t.system_role)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const Permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    permission_key: varchar("permission_key", { length: 64 }).notNull(),
    description: varchar("description", { length: 128 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_permissions_permission_key")
      .on(t.permission_key)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const RolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    role_id: integer("role_id")
      .notNull()
      .references(() => Roles.id),
    permission_id: integer("permission_id")
      .notNull()
      .references(() => Permissions.id),
    created_at: timestamp("created_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_role_permissions_role_id_permission_id")
      .on(t.role_id, t.permission_id)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const AccountRoles = pgTable(
  "account_roles",
  {
    id: serial("id").primaryKey(),
    account_id: integer("account_id")
      .notNull()
      .references(() => Accounts.id),
    role_id: integer("role_id")
      .notNull()
      .references(() => Roles.id),
    created_at: timestamp("created_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("uidx_active_accountrole_account_role")
      .on(t.account_id, t.role_id)
      .where(sql`deleted_at IS NULL`),
    index("idx_account_roles_role_id").on(t.role_id),
  ],
);

export const RefreshToken = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    account_id: integer("account_id")
      .notNull()
      .references(() => Accounts.id),
    email: varchar("email", { length: 255 }).notNull(),
    token_hash: varchar("token_hash", { length: 255 }).notNull(),
    is_revoked: boolean("is_revoked").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
    expires_at: timestamp("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_refresh_tokens_hash").on(t.token_hash),
    index("idx_refresh_tokens_account_id").on(t.account_id),
  ],
);
