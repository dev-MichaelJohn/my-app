import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { IStudentClassInsert, IStudentClassUpdate } from "@my-app/shared";
import { StudentClassAPI } from "../api/student-class.api";
import { toQuery } from "@/lib/query.lib";

const studentClassAPI = new StudentClassAPI();

export const STUDENT_CLASS_KEYS = {
  all: ["student-classes"] as const,
  lists: () => [...STUDENT_CLASS_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...STUDENT_CLASS_KEYS.lists(), query] as const,
  details: () => [...STUDENT_CLASS_KEYS.all, "detail"] as const,
  detail: (id: number) => [...STUDENT_CLASS_KEYS.details(), id] as const,
};

export const useStudentClasses = (query?: unknown) => {
  return useQuery({
    queryKey: STUDENT_CLASS_KEYS.list(query),
    queryFn: () => toQuery(studentClassAPI.getStudentClasses(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentClass = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: STUDENT_CLASS_KEYS.detail(id),
    queryFn: () => toQuery(studentClassAPI.getStudentClass(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateStudentClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newEnrollment: IStudentClassInsert) =>
      toQuery(studentClassAPI.createStudentClass(newEnrollment)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_CLASS_KEYS.all });
    },
  });
};

export const useUpdateStudentClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IStudentClassUpdate }) =>
      toQuery(studentClassAPI.updateStudentClass(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_CLASS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDENT_CLASS_KEYS.detail(id) });
    },
  });
};

export const useDeleteStudentClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(studentClassAPI.deleteStudentClass(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_CLASS_KEYS.all });
    },
  });
};

export const useRestoreStudentClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(studentClassAPI.restoreStudentClass(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_CLASS_KEYS.all });
    },
  });
};
