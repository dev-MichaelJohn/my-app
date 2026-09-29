import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EvaluationBuilderAPI } from "../api/evaluation-builder.api";
import { toQuery } from "@/lib/query.lib";
import { INSTRUMENT_KEYS } from "./useEvaluationInstruments";
import type {
  IStudentEvalCategoryInsert,
  IStudentEvalCategoryUpdate,
  IStudentEvalQuestionInsert,
  IStudentEvalQuestionUpdate,
  ISupervisorEvalCategoryInsert,
  ISupervisorEvalCategoryUpdate,
  ISupervisorEvalMeansInsert,
  ISupervisorEvalMeansUpdate,
  ISupervisorEvalQuestionInsert,
  ISupervisorEvalQuestionUpdate,
} from "@my-app/shared";

const builderApi = new EvaluationBuilderAPI();

export const BUILDER_KEYS = {
  all: ["evaluation-builder"] as const,
  studentCategoryHistory: (id: number) =>
    [...BUILDER_KEYS.all, "student", "category-history", id] as const,
  studentQuestionHistory: (id: number) =>
    [...BUILDER_KEYS.all, "student", "question-history", id] as const,
  supervisorCategoryHistory: (id: number) =>
    [...BUILDER_KEYS.all, "supervisor", "category-history", id] as const,
  supervisorQuestionHistory: (id: number) =>
    [...BUILDER_KEYS.all, "supervisor", "question-history", id] as const,
  meansHistory: (id: number) => [...BUILDER_KEYS.all, "supervisor", "means-history", id] as const,
};

// =========================================================================
// 1. SET (STUDENT FORM BUILDER HOOKS)
// =========================================================================

export const useAddStudentCategory = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (info: IStudentEvalCategoryInsert) =>
      toQuery(builderApi.addStudentCategory(formId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(formId) });
    },
  });
};

export const useUpdateStudentCategory = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, info }: { categoryId: number; info: IStudentEvalCategoryUpdate }) =>
      toQuery(builderApi.updateStudentCategory(categoryId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(formId) });
    },
  });
};

export const useDeleteStudentCategory = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) => toQuery(builderApi.deleteStudentCategory(categoryId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(formId) });
    },
  });
};

export const useAddStudentQuestion = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, info }: { categoryId: number; info: IStudentEvalQuestionInsert }) =>
      toQuery(builderApi.addStudentQuestion(categoryId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(formId) });
    },
  });
};

export const useUpdateStudentQuestion = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, info }: { questionId: number; info: IStudentEvalQuestionUpdate }) =>
      toQuery(builderApi.updateStudentQuestion(questionId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(formId) });
    },
  });
};

export const useDeleteStudentQuestion = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => toQuery(builderApi.deleteStudentQuestion(questionId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(formId) });
    },
  });
};

export const useReorderStudentQuestions = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, orderedIds }: { categoryId: number; orderedIds: number[] }) =>
      toQuery(builderApi.reorderStudentQuestions(categoryId, orderedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(formId) });
    },
  });
};

// ── SET Version Histories ──
export const useStudentCategoryHistory = (categoryId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: BUILDER_KEYS.studentCategoryHistory(categoryId),
    queryFn: () => toQuery(builderApi.getStudentCategoryHistory(categoryId)),
    enabled: Boolean(categoryId) && enabled,
  });
};

export const useStudentQuestionHistory = (questionId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: BUILDER_KEYS.studentQuestionHistory(questionId),
    queryFn: () => toQuery(builderApi.getStudentQuestionHistory(questionId)),
    enabled: Boolean(questionId) && enabled,
  });
};

// =========================================================================
// 2. SEF (SUPERVISOR FORM BUILDER HOOKS)
// =========================================================================

export const useAddSupervisorCategory = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (info: ISupervisorEvalCategoryInsert) =>
      toQuery(builderApi.addSupervisorCategory(formId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

export const useUpdateSupervisorCategory = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      info,
    }: {
      categoryId: number;
      info: ISupervisorEvalCategoryUpdate;
    }) => toQuery(builderApi.updateSupervisorCategory(categoryId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

export const useDeleteSupervisorCategory = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) => toQuery(builderApi.deleteSupervisorCategory(categoryId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

export const useAddSupervisorQuestion = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      info,
    }: {
      categoryId: number;
      info: ISupervisorEvalQuestionInsert;
    }) => toQuery(builderApi.addSupervisorQuestion(categoryId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

export const useUpdateSupervisorQuestion = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      info,
    }: {
      questionId: number;
      info: ISupervisorEvalQuestionUpdate;
    }) => toQuery(builderApi.updateSupervisorQuestion(questionId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

export const useDeleteSupervisorQuestion = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => toQuery(builderApi.deleteSupervisorQuestion(questionId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

// ── SEF MOVs / Means Descriptors ──
export const useAddMeansDescriptor = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, info }: { questionId: number; info: ISupervisorEvalMeansInsert }) =>
      toQuery(builderApi.addMeansDescriptor(questionId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

export const useUpdateMeansDescriptor = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meansId, info }: { meansId: number; info: ISupervisorEvalMeansUpdate }) =>
      toQuery(builderApi.updateMeansDescriptor(meansId, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

export const useDeleteMeansDescriptor = (formId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meansId: number) => toQuery(builderApi.deleteMeansDescriptor(meansId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(formId) });
    },
  });
};

// ── SEF Version Histories ──
export const useSupervisorCategoryHistory = (categoryId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: BUILDER_KEYS.supervisorCategoryHistory(categoryId),
    queryFn: () => toQuery(builderApi.getSupervisorCategoryHistory(categoryId)),
    enabled: Boolean(categoryId) && enabled,
  });
};

export const useSupervisorQuestionHistory = (questionId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: BUILDER_KEYS.supervisorQuestionHistory(questionId),
    queryFn: () => toQuery(builderApi.getSupervisorQuestionHistory(questionId)),
    enabled: Boolean(questionId) && enabled,
  });
};

export const useMeansHistory = (meansId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: BUILDER_KEYS.meansHistory(meansId),
    queryFn: () => toQuery(builderApi.getMeansDescriptorHistory(meansId)),
    enabled: Boolean(meansId) && enabled,
  });
};
