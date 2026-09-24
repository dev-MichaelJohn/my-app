import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { ISemesterInsert, ISemesterUpdate } from "@my-app/shared";
import { SemesterAPI } from "../api/semester.api";
import { toQuery } from "@/lib/query.lib";

const semesterAPI = new SemesterAPI();

export const SEMESTER_KEYS = {
  all: ["semesters"] as const,
  lists: () => [...SEMESTER_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...SEMESTER_KEYS.lists(), query] as const,
  active: () => [...SEMESTER_KEYS.all, "active"] as const,
  details: () => [...SEMESTER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...SEMESTER_KEYS.details(), id] as const,
};

export const useSemesters = (query?: unknown) => {
  return useQuery({
    queryKey: SEMESTER_KEYS.list(query),
    queryFn: () => toQuery(semesterAPI.getSemesters(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useActiveSemester = () => {
  return useQuery({
    queryKey: SEMESTER_KEYS.active(),
    queryFn: () => toQuery(semesterAPI.getActiveSemester()),
    staleTime: 10 * 60 * 1000,
  });
};

export const useSemester = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: SEMESTER_KEYS.detail(id),
    queryFn: () => toQuery(semesterAPI.getSemester(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSemester: ISemesterInsert) => toQuery(semesterAPI.createSemester(newSemester)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.active() });
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.all });
    },
  });
};

export const useUpdateSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: ISemesterUpdate }) =>
      toQuery(semesterAPI.updateSemester(id, info)),
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.active() });
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.all });
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.detail(id) });
    },
  });
};

export const useDeleteSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(semesterAPI.deleteSemester(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.active() });
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.all });
    },
  });
};

export const useRestoreSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(semesterAPI.restoreSemester(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.active() });
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.all });
    },
  });
};

export const useForceStopSemester = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(semesterAPI.forceStopSemester(id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.active() });
      await queryClient.invalidateQueries({ queryKey: SEMESTER_KEYS.all });
    },
  });
};
