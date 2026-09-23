import {
  ONE_MINUTE,
  type CollegeQuery,
  type CreateCollege,
  type UpdateCollege,
} from "@my-app/shared";
import { CollegeAPI } from "../api/college.api";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/query.lib";

export const COLLEGE_KEYS = {
  all: ["colleges"] as const,
  lists: () => [...COLLEGE_KEYS.all, "list"] as const,
  list: (query: CollegeQuery) => [...COLLEGE_KEYS.lists(), query] as const,
  details: () => [...COLLEGE_KEYS.all, "detail"] as const,
  detail: (id: number) => [...COLLEGE_KEYS.details(), id] as const,
};

const collegeAPI = new CollegeAPI();

export const useColleges = (query: CollegeQuery) => {
  return useQuery({
    queryKey: COLLEGE_KEYS.list(query),
    queryFn: () => toQuery(collegeAPI.getColleges(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * ONE_MINUTE,
  });
};

export const useCreateCollege = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (info: CreateCollege) => toQuery(collegeAPI.createCollege(info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLEGE_KEYS.all });
    },
  });
};

export const useUpdateCollege = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: UpdateCollege }) =>
      toQuery(collegeAPI.updateCollege(id, info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLEGE_KEYS.all });
    },
  });
};

export const useDeleteCollege = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(collegeAPI.deleteCollege(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLEGE_KEYS.all });
    },
  });
};

export const useRestoreCollege = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(collegeAPI.restoreCollege(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLEGE_KEYS.all });
    },
  });
};
