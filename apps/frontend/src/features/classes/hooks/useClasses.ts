import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { IClassInsert, IClassUpdate } from "@my-app/shared";
import { ClassAPI } from "../api/class.api";
import { toQuery } from "@/lib/query.lib";

const classAPI = new ClassAPI();

export const CLASS_KEYS = {
  all: ["classes"] as const,
  lists: () => [...CLASS_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...CLASS_KEYS.lists(), query] as const,
  details: () => [...CLASS_KEYS.all, "detail"] as const,
  detail: (id: number) => [...CLASS_KEYS.details(), id] as const,
};

export const useClasses = (query?: unknown) => {
  return useQuery({
    queryKey: CLASS_KEYS.list(query),
    queryFn: () => toQuery(classAPI.getClasses(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useClass = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: CLASS_KEYS.detail(id),
    queryFn: () => toQuery(classAPI.getClass(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newClass: IClassInsert) => toQuery(classAPI.createClass(newClass)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_KEYS.all });
    },
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IClassUpdate }) =>
      toQuery(classAPI.updateClass(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: CLASS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CLASS_KEYS.detail(id) });
    },
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(classAPI.deleteClass(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_KEYS.all });
    },
  });
};

export const useRestoreClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(classAPI.restoreClass(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_KEYS.all });
    },
  });
};
