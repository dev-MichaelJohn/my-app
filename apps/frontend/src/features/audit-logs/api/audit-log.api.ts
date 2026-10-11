import { http, type ApiError } from "@/lib/api.lib";
import type { IAuditLogSelect, PaginatedData } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export class AuditLogAPI {
  getAuditLogs(query?: unknown): ResultAsync<PaginatedData<IAuditLogSelect[]>, ApiError> {
    return http.get<PaginatedData<IAuditLogSelect[]>>("/audit-logs", query);
  }

  rollback(id: number): ResultAsync<{ message: string; restoredEntity: string }, ApiError> {
    return http.post<{ message: string; restoredEntity: string }>(`/audit-logs/${id}/rollback`);
  }
}
