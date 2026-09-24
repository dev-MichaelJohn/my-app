import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserAPI } from "../api/user.api";
import { toQuery } from "@/lib/query.lib";
import type { CreateUser, UpdateUser } from "@my-app/shared";

export const userApi = new UserAPI();

export const USER_KEYS = {
  all: ["users"] as const,
  lists: () => [...USER_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...USER_KEYS.lists(), query] as const,
  details: () => [...USER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...USER_KEYS.details(), id] as const,
};

export const useUsers = (query?: unknown) => {
  return useQuery({
    queryKey: USER_KEYS.list(query),
    queryFn: () => toQuery(userApi.getUsers(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUser = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: USER_KEYS.detail(id),
    queryFn: () => toQuery(userApi.getUser(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newUser: CreateUser) => toQuery(userApi.createUser(newUser)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUser }) =>
      toQuery(userApi.updateUser(id, data)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(id) });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(userApi.deleteUser(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
};

export const useRestoreUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(userApi.restoreUser(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });
};
