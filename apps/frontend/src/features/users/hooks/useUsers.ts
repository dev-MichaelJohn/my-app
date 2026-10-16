import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserAPI } from "../api/user.api";
import { toQuery } from "@/lib/query.lib";
import type { ChangePassword, CreateUser, SystemRole, UpdateUser } from "@my-app/shared";

const userApi = new UserAPI();

export const USER_KEYS = {
  all: ["users"] as const,
  lists: () => [...USER_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...USER_KEYS.lists(), query] as const,
  details: () => [...USER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...USER_KEYS.details(), id] as const,
};

export const useUsers = (query?: unknown, enabled = true) => {
  return useQuery({
    queryKey: USER_KEYS.list(query),
    queryFn: () => toQuery(userApi.getUsers(query)),
    placeholderData: keepPreviousData,
    staleTime: 0,
    enabled,
  });
};

export const useUser = (id: number, enabled = true) => {
  return useQuery({
    queryKey: USER_KEYS.detail(id),
    queryFn: () => toQuery(userApi.getUser(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 0,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newUser: CreateUser) => toQuery(userApi.createUser(newUser)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_KEYS.all, refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["faculties"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["colleges"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["programs"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["class-students"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["student-classes"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"], refetchType: "all" }),
      ]);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUser }) =>
      toQuery(userApi.updateUser(id, data)),
    onSuccess: async (_, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_KEYS.all, refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["faculties"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["colleges"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["programs"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"], refetchType: "all" }),
      ]);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(userApi.deleteUser(id)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_KEYS.all, refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["faculties"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["colleges"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["programs"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"], refetchType: "all" }),
      ]);
    },
  });
};

export const useRestoreUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(userApi.restoreUser(id)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_KEYS.all, refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["faculties"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"], refetchType: "all" }),
      ]);
    },
  });
};

export const useManageRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: SystemRole[] }) =>
      toQuery(userApi.manageRoles(id, roles)),
    onSuccess: async (_, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_KEYS.all, refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["faculties"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"], refetchType: "all" }),
      ]);
    },
  });
};

export const useResetPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(userApi.resetPassword(id)),
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"], refetchType: "all" }),
      ]);
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ChangePassword }) =>
      toQuery(userApi.changePassword(id, payload)),
  });
};

export const useResendWelcomeEmail = () => {
  return useMutation({
    mutationFn: (id: number) => toQuery(userApi.resendWelcomeEmail(id)),
  });
};

export const useChangeSelfPassword = () => {
  return useMutation({
    mutationFn: (payload: ChangePassword) => toQuery(userApi.changeSelfPassword(payload)),
  });
};
