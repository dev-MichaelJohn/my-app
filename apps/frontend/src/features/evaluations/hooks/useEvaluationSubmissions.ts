import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/query.lib";
import type { SubmitStudentEvaluation, SubmitSupervisorEvaluation } from "@my-app/shared";
import { EvaluationSubmissionAPI } from "../api/evaluation-submission.api";

const submissionApi = new EvaluationSubmissionAPI();

export const SUBMISSION_KEYS = {
  all: ["evaluation-submissions"] as const,
  studentSubjects: () => [...SUBMISSION_KEYS.all, "student", "subjects"] as const,
  studentFormView: (id: number) => [...SUBMISSION_KEYS.all, "student", "form", id] as const,
  supervisorOfferings: () => [...SUBMISSION_KEYS.all, "supervisor", "offerings"] as const,
  supervisorFormView: (id: number) => [...SUBMISSION_KEYS.all, "supervisor", "form", id] as const,
};

// ── Student SET Hooks ──
export const useStudentSubjects = () => {
  return useQuery({
    queryKey: SUBMISSION_KEYS.studentSubjects(),
    queryFn: () => toQuery(submissionApi.getStudentSubjects()),
    staleTime: 60 * 1000,
  });
};

export const useStudentFormView = (studentClassId: number, enabled: boolean = true) => {
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

export const useSupervisorFormView = (offeringId: number, enabled: boolean = true) => {
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
