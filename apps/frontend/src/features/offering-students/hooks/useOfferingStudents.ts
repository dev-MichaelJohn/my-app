import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { CreateOfferingStudentPayload, IOfferingStudentUpdate } from "@my-app/shared";
import { OfferingStudentAPI } from "../api/offering-student.api";
import { toQuery } from "@/lib/query.lib";

const offeringStudentAPI = new OfferingStudentAPI();

export const OFFERING_STUDENT_KEYS = {
  all: ["offering-students"] as const,
  lists: () => [...OFFERING_STUDENT_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...OFFERING_STUDENT_KEYS.lists(), query] as const,
  details: () => [...OFFERING_STUDENT_KEYS.all, "detail"] as const,
  detail: (id: number) => [...OFFERING_STUDENT_KEYS.details(), id] as const,
};

export const useOfferingStudents = (query?: unknown) => {
  return useQuery({
    queryKey: OFFERING_STUDENT_KEYS.list(query),
    queryFn: () => toQuery(offeringStudentAPI.getOfferingStudents(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOfferingStudent = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: OFFERING_STUDENT_KEYS.detail(id),
    queryFn: () => toQuery(offeringStudentAPI.getOfferingStudent(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateOfferingStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newEnrollment: CreateOfferingStudentPayload) =>
      toQuery(offeringStudentAPI.createOfferingStudent(newEnrollment)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERING_STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateOfferingStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IOfferingStudentUpdate }) =>
      toQuery(offeringStudentAPI.updateOfferingStudent(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: OFFERING_STUDENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: OFFERING_STUDENT_KEYS.detail(id) });
    },
  });
};

export const useDeleteOfferingStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(offeringStudentAPI.deleteOfferingStudent(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERING_STUDENT_KEYS.all });
    },
  });
};

export const useRestoreOfferingStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(offeringStudentAPI.restoreOfferingStudent(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERING_STUDENT_KEYS.all });
    },
  });
};
