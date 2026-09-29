import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { EvaluationInstrumentAPI } from "../api/evaluation-instument.api";
import { toQuery } from "@/lib/query.lib";
import type {
  EvaluationFormQuery,
  IStudentEvalFormInsert,
  IStudentEvalFormUpdate,
  ISupervisorEvalFormInsert,
  ISupervisorEvalFormUpdate,
} from "@my-app/shared";

const instrumentApi = new EvaluationInstrumentAPI();

export const INSTRUMENT_KEYS = {
  all: ["evaluation-instruments"] as const,
  studentLists: () => [...INSTRUMENT_KEYS.all, "student", "list"] as const,
  studentList: (query?: unknown) => [...INSTRUMENT_KEYS.studentLists(), query] as const,
  studentDetail: (id: number) => [...INSTRUMENT_KEYS.all, "student", "detail", id] as const,

  supervisorLists: () => [...INSTRUMENT_KEYS.all, "supervisor", "list"] as const,
  supervisorList: (query?: EvaluationFormQuery) =>
    [...INSTRUMENT_KEYS.supervisorLists(), query] as const,
  supervisorDetail: (id: number) => [...INSTRUMENT_KEYS.all, "supervisor", "detail", id] as const,
};

// ── Student Forms (SET) ──
export const useStudentForms = (query?: EvaluationFormQuery) => {
  return useQuery({
    queryKey: INSTRUMENT_KEYS.studentList(query),
    queryFn: () => toQuery(instrumentApi.getStudentForms(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentForm = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: INSTRUMENT_KEYS.studentDetail(id),
    queryFn: () => toQuery(instrumentApi.getStudentFormById(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateStudentForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (info: IStudentEvalFormInsert) => toQuery(instrumentApi.createStudentForm(info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentLists() });
    },
  });
};

export const useUpdateStudentForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IStudentEvalFormUpdate }) =>
      toQuery(instrumentApi.updateStudentForm(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentLists() });
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentDetail(id) });
    },
  });
};

export const useDeleteStudentForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(instrumentApi.deleteStudentForm(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentLists() });
    },
  });
};

export const useRestoreStudentForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(instrumentApi.restoreStudentForm(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.studentLists() });
    },
  });
};

// ── Supervisor Forms (SEF) ──
export const useSupervisorForms = (query?: EvaluationFormQuery) => {
  return useQuery({
    queryKey: INSTRUMENT_KEYS.supervisorList(query),
    queryFn: () => toQuery(instrumentApi.getSupervisorForms(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSupervisorForm = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: INSTRUMENT_KEYS.supervisorDetail(id),
    queryFn: () => toQuery(instrumentApi.getSupervisorFormById(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSupervisorForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (info: ISupervisorEvalFormInsert) =>
      toQuery(instrumentApi.createSupervisorForm(info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorLists() });
    },
  });
};

export const useUpdateSupervisorForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: ISupervisorEvalFormUpdate }) =>
      toQuery(instrumentApi.updateSupervisorForm(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorLists() });
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorDetail(id) });
    },
  });
};

export const useDeleteSupervisorForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(instrumentApi.deleteSupervisorForm(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorLists() });
    },
  });
};

export const useRestoreSupervisorForm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(instrumentApi.restoreSupervisorForm(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUMENT_KEYS.supervisorLists() });
    },
  });
};
