import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toQuery } from "@/lib/query.lib";
import type {
  FacultyReportQuery,
  ReportStatus,
  SubmitStudentEvaluation,
  SubmitSupervisorEvaluation,
  UpdateFedafPlan,
} from "@my-app/shared";
import { EvaluationSubmissionAPI } from "../api/evaluation-submission.api";

const submissionApi = new EvaluationSubmissionAPI();

export const SUBMISSION_KEYS = {
  all: ["evaluation-submissions"] as const,
  studentSubjects: () => [...SUBMISSION_KEYS.all, "student", "subjects"] as const,
  studentFormView: (id: number) => [...SUBMISSION_KEYS.all, "student", "form", id] as const,
  supervisorOfferings: () => [...SUBMISSION_KEYS.all, "supervisor", "offerings"] as const,
  supervisorFormView: (id: number) => [...SUBMISSION_KEYS.all, "supervisor", "form", id] as const,
  reportsList: (query?: unknown) => ["evaluation-reports", "list", query] as const,
  reportDetail: (semesterId?: number, facultyId?: number) =>
    ["evaluation-reports", "annex-c", semesterId, facultyId] as const,
  institutionalFER: (semesterId: number) =>
    ["evaluation-reports", "institutional-fer", semesterId] as const,
};

// ── Student SET Hooks ──
export const useStudentSubjects = () => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.studentSubjects(),
    queryFn: () => toQuery(submissionApi.getStudentSubjects()),
    staleTime: 60 * 1000,
  });
};

export const useStudentFormView = (studentClassId: number, enabled = true) => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.studentFormView(studentClassId),
    queryFn: () => toQuery(submissionApi.getStudentFormView(studentClassId)),
    enabled: Boolean(studentClassId) && enabled,
    staleTime: 60 * 1000,
  });
};

export const useSubmitStudentEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitStudentEvaluation) =>
      toQuery(submissionApi.submitStudentEvaluation(payload)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.studentSubjects() });
      queryClient.invalidateQueries({
        queryKey: SUBMISSION_KEYS.studentFormView(variables.student_class_id),
      });
    },
  });
};

// ── Supervisor SEF Hooks ──
export const useSupervisorOfferings = () => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.supervisorOfferings(),
    queryFn: () => toQuery(submissionApi.getSupervisorOfferings()),
    staleTime: 60 * 1000,
  });
};

export const useSupervisorFormView = (offeringId: number, enabled = true) => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.supervisorFormView(offeringId),
    queryFn: () => toQuery(submissionApi.getSupervisorFormView(offeringId)),
    enabled: Boolean(offeringId) && enabled,
    staleTime: 60 * 1000,
  });
};

export const useSubmitSupervisorEvaluation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitSupervisorEvaluation) =>
      toQuery(submissionApi.submitSupervisorEvaluation(payload)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SUBMISSION_KEYS.supervisorOfferings() });
      queryClient.invalidateQueries({
        queryKey: SUBMISSION_KEYS.supervisorFormView(variables.course_offering_id),
      });
    },
  });
};

export const useFacultyTeachingOfferings = (semesterId?: number) => {
  return useQuery({
    queryKey: ["evaluation-submissions", "faculty", "teaching-classes", semesterId],
    queryFn: () => toQuery(submissionApi.getFacultyTeachingOfferings(semesterId)),
    staleTime: 60 * 1000,
  });
};

// ── Reports Suite Hooks ──
export const useFacultyReportsList = (query: FacultyReportQuery) => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.reportsList(query),
    queryFn: () => toQuery(submissionApi.getReportsList(query)),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
};

export const useAnnexCReport = (semesterId?: number, facultyId?: number) => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.reportDetail(semesterId, facultyId),
    queryFn: () => toQuery(submissionApi.getAnnexCReport(semesterId!, facultyId)),
    enabled: Boolean(semesterId),
    staleTime: 60 * 1000,
  });
};

export const useRecalculateAnnexCReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { semester_id: number; faculty_id?: number; formula?: string }) =>
      toQuery(submissionApi.recalculateAnnexCReport(payload)),
    onSuccess: (data) => {
      queryClient.setQueryData(
        SUBMISSION_KEYS.reportDetail(data.semester_id, data.faculty_id),
        data,
      );
      queryClient.invalidateQueries({ queryKey: ["evaluation-reports", "list"] });
    },
  });
};

export const useBatchConsolidateReports = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { semester_id: number; formula?: string }) =>
      toQuery(submissionApi.batchConsolidateReports(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-reports"] });
    },
  });
};

export const useUpdateReportStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, status }: { reportId: number; status: ReportStatus }) =>
      toQuery(submissionApi.updateReportStatus(reportId, status)),
    onSuccess: (data) => {
      queryClient.setQueryData(
        SUBMISSION_KEYS.reportDetail(data.semester_id, data.faculty_id),
        data,
      );
      queryClient.invalidateQueries({ queryKey: ["evaluation-reports", "list"] });
    },
  });
};

export const useUpdateFedafPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, plan }: { reportId: number; plan: UpdateFedafPlan }) =>
      toQuery(submissionApi.updateFedafPlan(reportId, plan)),
    onSuccess: (data) => {
      queryClient.setQueryData(
        SUBMISSION_KEYS.reportDetail(data.semester_id, data.faculty_id),
        data,
      );
    },
  });
};

export const useSignFedaf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      signatureRole,
    }: {
      reportId: number;
      signatureRole: "FACULTY" | "SUPERVISOR";
    }) => toQuery(submissionApi.signFedaf(reportId, signatureRole)),
    onSuccess: (data) => {
      queryClient.setQueryData(
        SUBMISSION_KEYS.reportDetail(data.semester_id, data.faculty_id),
        data,
      );
    },
  });
};

export const useInstitutionalFER = (semesterId: number) => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.institutionalFER(semesterId),
    queryFn: () => toQuery(submissionApi.getInstitutionalFER(semesterId)),
    enabled: Boolean(semesterId),
    staleTime: 5 * 60 * 1000,
  });
};
