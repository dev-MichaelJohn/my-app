import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CourseAPI } from "../api/course.api";
import { toQuery } from "@/lib/query.lib";
import type { ICourseInsert, ICourseUpdate } from "@my-app/shared";

const courseAPI = new CourseAPI();

export const COURSE_KEYS = {
  all: ["courses"] as const,
  lists: () => [...COURSE_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...COURSE_KEYS.lists(), query] as const,
  details: () => [...COURSE_KEYS.all, "detail"] as const,
  detail: (id: number) => [...COURSE_KEYS.details(), id] as const,
};

export const useCourses = (query?: unknown) => {
  return useQuery({
    queryKey: COURSE_KEYS.list(query),
    queryFn: () => toQuery(courseAPI.getCourses(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCourse = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: COURSE_KEYS.detail(id),
    queryFn: () => toQuery(courseAPI.getCourse(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCourse: ICourseInsert) => toQuery(courseAPI.createCourse(newCourse)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.all });
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: ICourseUpdate }) =>
      toQuery(courseAPI.updateCourse(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.detail(id) });
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(courseAPI.deleteCourse(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.all });
    },
  });
};

export const useRestoreCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(courseAPI.restoreCourse(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_KEYS.all });
    },
  });
};
