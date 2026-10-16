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
    mutationFn: ({
      id,
      rollbackEntireTransaction = true,
    }: {
      id: number;
      rollbackEntireTransaction?: boolean;
    }) => toQuery(auditApi.rollback(id, rollbackEntireTransaction)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
      queryClient.invalidateQueries({ queryKey: ["faculties"] });
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
      queryClient.invalidateQueries({ queryKey: ["class-students"] });
      queryClient.invalidateQueries({ queryKey: ["student-classes"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      queryClient.invalidateQueries({ queryKey: ["evaluation-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["evaluation-instruments"] });
      queryClient.invalidateQueries({ queryKey: ["evaluation-reports"] });
    },
  });
};
