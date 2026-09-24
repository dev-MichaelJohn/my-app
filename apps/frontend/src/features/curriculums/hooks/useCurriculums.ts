import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { ICurriculumInsert, ICurriculumUpdate } from "@my-app/shared";
import { toQuery } from "@/lib/query.lib";
import { CurriculumAPI } from "../api/curriculum.api";

const curriculumAPI = new CurriculumAPI();

export const CURRICULUM_KEYS = {
  all: ["curriculums"] as const,
  lists: () => [...CURRICULUM_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...CURRICULUM_KEYS.lists(), query] as const,
  details: () => [...CURRICULUM_KEYS.all, "detail"] as const,
  detail: (id: number) => [...CURRICULUM_KEYS.details(), id] as const,
};

export const useCurriculums = (query?: unknown) => {
  return useQuery({
    queryKey: CURRICULUM_KEYS.list(query),
    queryFn: () => toQuery(curriculumAPI.getCurriculums(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCurriculum = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: CURRICULUM_KEYS.detail(id),
    queryFn: () => toQuery(curriculumAPI.getCurriculum(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCurriculum = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCurriculum: ICurriculumInsert) =>
      toQuery(curriculumAPI.createCurriculum(newCurriculum)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRICULUM_KEYS.all });
    },
  });
};

export const useUpdateCurriculum = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: ICurriculumUpdate }) =>
      toQuery(curriculumAPI.updateCurriculum(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: CURRICULUM_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CURRICULUM_KEYS.detail(id) });
    },
  });
};

export const useDeleteCurriculum = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(curriculumAPI.deleteCurriculum(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRICULUM_KEYS.all });
    },
  });
};

export const useRestoreCurriculum = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(curriculumAPI.restoreCurriculum(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRICULUM_KEYS.all });
    },
  });
};
