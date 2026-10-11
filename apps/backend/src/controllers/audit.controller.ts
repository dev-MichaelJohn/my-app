import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { AuditService, type IAuditService } from "@/services/audit.service.js";
import { errAsync } from "neverthrow";
import z from "zod";

export class AuditController {
  constructor(private auditService: IAuditService = new AuditService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Audit Log ID.");

  getAuditLogs = runAsync((req) => {
    return this.auditService.getAuditLogs(req.query).map((data) => ({
      status: 200,
      message: "Audit logs retrieved.",
      data,
    }));
  });

  rollback = runAsync((req) => {
    const user = req.user;
    if (!user) return errAsync(new AppError(401, "Authentication required."));

    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((auditId) => {
      return this.auditService.rollback(auditId, user).map((result) => ({
        status: 200,
        message: result.message,
        data: result,
      }));
    });
  });
}
