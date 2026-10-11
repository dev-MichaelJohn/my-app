import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { AuditLogAPI } from "../api/audit-log.api";
import { toQuery } from "@/lib/query.lib";

const auditApi = new AuditLogAPI();

export const useAuditLogs = (query?: unknown) => {
  return useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () => toQuery(auditApi.getAuditLogs(query)),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
};

export const useRollbackAudit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(auditApi.rollback(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      // Invalidate relevant entities
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
      queryClient.invalidateQueries({ queryKey: ["faculties"] });
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
