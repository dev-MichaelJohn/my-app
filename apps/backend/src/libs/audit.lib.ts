import type { Request } from "express";
import { AuditLogs } from "@my-app/shared";
import type { DbClient } from "./transaction.lib.js";
import type { AuditAction, AuditDiff, GetUser } from "@my-app/shared";
import crypto from "node:crypto";

export interface LogAuditParams {
  actor?: GetUser | null | undefined;
  req?: Request | undefined;
  action: AuditAction;
  entity: string;
  entityId: number;
  entityName: string;
  oldRecord?: Record<string, any> | null | undefined;
  newRecord?: Record<string, any> | null | undefined;
  isRollbackable?: boolean | undefined;
  transactionId?: string | undefined;
  tx: DbClient;
}

export async function logAuditEvent({
  actor,
  req,
  action,
  entity,
  entityId,
  entityName,
  oldRecord,
  newRecord,
  isRollbackable = true,
  transactionId,
  tx,
}: LogAuditParams): Promise<void> {
  const currentActor = actor ?? req?.user;

  const actorId = currentActor?.account.id ?? null;
  const actorEmail = currentActor?.account.email ?? "system@pit.edu.ph";
  const actorName = currentActor
    ? `${currentActor.details.first_name} ${currentActor.details.last_name}`.trim()
    : "System";

  let diff: AuditDiff | null = null;

  if (oldRecord || newRecord) {
    const changedFields: string[] = [];
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    const cleanObj = (obj: any) => {
      if (!obj || typeof obj !== "object") return {};
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k !== "updated_at" && k !== "created_at" && typeof v !== "function") {
          res[k] = v;
        }
      }
      return res;
    };

    const cleanOld = cleanObj(oldRecord);
    const cleanNew = cleanObj(newRecord);

    const allKeys = Array.from(new Set([...Object.keys(cleanOld), ...Object.keys(cleanNew)]));

    for (const key of allKeys) {
      const oldVal = cleanOld[key];
      const newVal = cleanNew[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields.push(key);
        if (oldVal !== undefined) oldValues[key] = oldVal;
        if (newVal !== undefined) newValues[key] = newVal;
      }
    }

    diff = {
      oldValues: Object.keys(oldValues).length > 0 ? oldValues : (cleanOld ?? undefined),
      newValues: Object.keys(newValues).length > 0 ? newValues : (cleanNew ?? undefined),
      changedFields,
    };
  }

  // Bind or reuse existing request-scoped transaction UUID
  const reqWithTx = req as (Request & { __auditTxId?: string }) | undefined;
  const finalTransactionId = transactionId || reqWithTx?.__auditTxId || crypto.randomUUID();
  if (reqWithTx && !reqWithTx.__auditTxId) {
    reqWithTx.__auditTxId = finalTransactionId;
  }

  const ipAddress = (req?.headers?.["x-forwarded-for"] as string) || req?.ip || null;
  const userAgent = req?.get ? req.get("user-agent") || null : null;

  await tx.insert(AuditLogs).values({
    actor_id: actorId,
    actor_email: actorEmail,
    actor_name: actorName,
    action,
    entity,
    entity_id: entityId,
    entity_name: entityName,
    diff,
    transaction_id: finalTransactionId,
    ip_address: ipAddress,
    user_agent: userAgent,
    is_rollbackable: isRollbackable,
  });
}
