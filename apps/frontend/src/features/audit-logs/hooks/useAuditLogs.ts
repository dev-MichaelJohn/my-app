import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { AuditLogAPI } from "../api/audit-log.api";
import { toQuery } from "@/lib/query.lib";

const auditApi = new AuditLogAPI();

export const useAuditLogs = (query?: unknown) => {
  return useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () => toQuery(auditApi.getAuditLogs(query)),
    placeholderData: keepPreviousData,
    staleTime: 0, // Immediately show fresh events
  });
};

export const useRollbackAudit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["audit-rollback"],
    mutationFn: ({
      id,
      rollbackEntireTransaction = true,
    }: {
      id: number;
      rollbackEntireTransaction?: boolean;
    }) => toQuery(auditApi.rollback(id, rollbackEntireTransaction)),
    onSuccess: async () => {
      // Invalidate the entire application cache across all active and inactive queries
      await queryClient.invalidateQueries({ refetchType: "all" });
    },
  });
};
