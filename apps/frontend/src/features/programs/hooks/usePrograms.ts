import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProgramAPI } from "../api/program.api";
import { toQuery } from "@/lib/query.lib";
import type { CreateProgram, UpdateProgram } from "@my-app/shared";

const programAPI = new ProgramAPI();

export const PROGRAM_KEYS = {
  all: ["programs"] as const,
  lists: () => [...PROGRAM_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...PROGRAM_KEYS.lists(), query] as const,
  details: () => [...PROGRAM_KEYS.all, "detail"] as const,
  detail: (id: number) => [...PROGRAM_KEYS.details(), id] as const,
};

export const usePrograms = (query?: unknown) => {
  return useQuery({
    queryKey: PROGRAM_KEYS.list(query),
    queryFn: () => toQuery(programAPI.getPrograms(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useProgram = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: PROGRAM_KEYS.detail(id),
    queryFn: () => toQuery(programAPI.getProgram(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newProgram: CreateProgram) => toQuery(programAPI.createProgram(newProgram)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.all });
    },
  });
};

export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: UpdateProgram }) =>
      toQuery(programAPI.updateProgram(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.detail(id) });
    },
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(programAPI.deleteProgram(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.all });
    },
  });
};

export const useRestoreProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(programAPI.restoreProgram(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.all });
    },
  });
};
