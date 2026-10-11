import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { Accounts } from "./auth.schema.js";

export const AuditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "RESTORE",
  "ROLLBACK",
  "STATUS_CHANGE",
  "ROLE_CHANGE",
  "PASSWORD_RESET",
  "BULK_IMPORT",
]);

export interface AuditDiff {
  oldValues?: Record<string, any> | undefined;
  newValues?: Record<string, any> | undefined;
  changedFields?: string[] | undefined;
}

export const AuditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actor_id: integer("actor_id").references(() => Accounts.id, { onDelete: "set null" }),
    actor_email: varchar("actor_email", { length: 255 }).notNull(),
    actor_name: varchar("actor_name", { length: 255 }).notNull(),
    action: AuditActionEnum("action").notNull(),
    entity: varchar("entity", { length: 64 }).notNull(),
    entity_id: integer("entity_id").notNull(),
    entity_name: varchar("entity_name", { length: 255 }).notNull(),

    // 🚀 Added | undefined | null to satisfy exactOptionalPropertyTypes
    diff: jsonb("diff").$type<AuditDiff | null | undefined>(),

    ip_address: varchar("ip_address", { length: 64 }),
    user_agent: text("user_agent"),

    is_rollbackable: boolean("is_rollbackable").notNull().default(true),
    rolled_back_at: timestamp("rolled_back_at"),
    rolled_back_by: integer("rolled_back_by").references(() => Accounts.id, {
      onDelete: "set null",
    }),

    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_audit_logs_entity").on(t.entity, t.entity_id),
    index("idx_audit_logs_actor_id").on(t.actor_id),
    index("idx_audit_logs_action").on(t.action),
    index("idx_audit_logs_created_at").on(t.created_at),
  ],
);
