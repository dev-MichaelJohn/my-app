import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toQuery } from "@/lib/query.lib";
import type { IFacultyInsert, IFacultyUpdate } from "@my-app/shared";
import { FacultyAPI } from "../api/faculty.api";

const facultyApi = new FacultyAPI();

// ── Query Keys Factory ──
export const FACULTY_KEYS = {
  all: ["faculties"] as const,
  lists: () => [...FACULTY_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...FACULTY_KEYS.lists(), query] as const,
  details: () => [...FACULTY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...FACULTY_KEYS.details(), id] as const,
};

// ── 1. Get Paginated / Filtered Faculties List ──
export const useFaculties = (query?: unknown, enabled = true) => {
  return useQuery({
    queryKey: FACULTY_KEYS.list(query),
    queryFn: () => toQuery(facultyApi.getFaculties(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
};

// ── 2. Get Single Faculty by ID ──
export const useFaculty = (id: number, enabled = true) => {
  return useQuery({
    queryKey: FACULTY_KEYS.detail(id),
    queryFn: () => toQuery(facultyApi.getFacultyById(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// ── 3. Appoint Faculty to an Academic Program ──
export const useCreateFaculty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (info: IFacultyInsert) => toQuery(facultyApi.createFaculty(info)),
    onSuccess: () => {
      // Invalidate all faculty listings
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      // Invalidate offerings so the assigned instructor dropdown picks up the new faculty
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
      // Invalidate programs so department counts refresh
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
};

// ── 4. Update / Transfer Faculty Department ──
export const useUpdateFaculty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IFacultyUpdate }) =>
      toQuery(facultyApi.updateFaculty(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["evaluation-reports"] });
    },
  });
};

// ── 5. Archive / Remove Faculty Department Appointment ──
export const useDeleteFaculty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(facultyApi.deleteFaculty(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
};

// ── 6. Restore Faculty Department Appointment ──
export const useRestoreFaculty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(facultyApi.restoreFaculty(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["offerings"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
};
