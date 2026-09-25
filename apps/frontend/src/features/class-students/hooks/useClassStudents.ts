import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { IClassStudentInsert, IClassStudentUpdate } from "@my-app/shared";
import { ClassStudentAPI } from "../api/class-student.api";
import { toQuery } from "@/lib/query.lib";

const classStudentAPI = new ClassStudentAPI();

export const CLASS_STUDENT_KEYS = {
  all: ["class-students"] as const,
  lists: () => [...CLASS_STUDENT_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...CLASS_STUDENT_KEYS.lists(), query] as const,
  details: () => [...CLASS_STUDENT_KEYS.all, "detail"] as const,
  detail: (id: number) => [...CLASS_STUDENT_KEYS.details(), id] as const,
};

export const useClassStudents = (query?: unknown) => {
  return useQuery({
    queryKey: CLASS_STUDENT_KEYS.list(query),
    queryFn: () => toQuery(classStudentAPI.getClassStudents(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useClassStudent = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: CLASS_STUDENT_KEYS.detail(id),
    queryFn: () => toQuery(classStudentAPI.getClassStudent(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateClassStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newStudent: IClassStudentInsert) =>
      toQuery(classStudentAPI.createClassStudent(newStudent)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["student-classes"] });
    },
  });
};

export const useUpdateClassStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IClassStudentUpdate }) =>
      toQuery(classStudentAPI.updateClassStudent(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: CLASS_STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: CLASS_STUDENT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["student-classes"] });
    },
  });
};

export const useDeleteClassStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(classStudentAPI.deleteClassStudent(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["student-classes"] });
    },
  });
};

export const useRestoreClassStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(classStudentAPI.restoreClassStudent(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["student-classes"] });
    },
  });
};
