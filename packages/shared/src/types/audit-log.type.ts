import { createSelectSchema } from "drizzle-orm/zod";
import { AuditLogs, AuditActionEnum } from "../schemas/audit-log.schema.js";
import z from "zod";

export const AuditActionSchema = z.enum(AuditActionEnum.enumValues);
export type AuditAction = (typeof AuditActionEnum.enumValues)[number];

export const AuditDiffSchema = z.object({
  oldValues: z.record(z.string(), z.any()).optional(),
  newValues: z.record(z.string(), z.any()).optional(),
  changedFields: z.array(z.string()).optional(),
});
export type AuditDiff = z.infer<typeof AuditDiffSchema>;

export const AuditLogSelect = createSelectSchema(AuditLogs, {
  diff: () => AuditDiffSchema.optional().nullable(),
});
export type IAuditLogSelect = z.infer<typeof AuditLogSelect>;

export const AuditLogQuerySchema = z.object({
  paginate: z.preprocess((val) => val !== "false" && val !== false, z.boolean()).default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  action: AuditActionSchema.optional(),
  actor_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export interface RecordAuditInput {
  actorId?: number | null;
  actorEmail: string;
  actorName: string;
  action: AuditAction;
  entity: string;
  entityId: number;
  entityName: string;
  diff?: AuditDiff;
  ipAddress?: string;
  userAgent?: string;
  isRollbackable?: boolean;
}
