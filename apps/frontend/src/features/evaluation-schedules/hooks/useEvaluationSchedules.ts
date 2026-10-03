import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toQuery } from "@/lib/query.lib";
import type {
  IStudentScheduleInsert,
  IStudentScheduleUpdate,
  ISupervisorScheduleInsert,
  ISupervisorScheduleUpdate,
} from "@my-app/shared";
import { EvaluationScheduleAPI } from "../api/evaluation-schedule.api";

const scheduleApi = new EvaluationScheduleAPI();

export const SCHEDULE_KEYS = {
  all: ["evaluation-schedules"] as const,
  studentLists: () => [...SCHEDULE_KEYS.all, "student", "list"] as const,
  studentList: (query?: unknown) => [...SCHEDULE_KEYS.studentLists(), query] as const,
  studentActive: (semesterId?: number) =>
    [...SCHEDULE_KEYS.all, "student", "active", semesterId] as const,
  studentDetail: (id: number) => [...SCHEDULE_KEYS.all, "student", "detail", id] as const,

  supervisorLists: () => [...SCHEDULE_KEYS.all, "supervisor", "list"] as const,
  supervisorList: (query?: unknown) => [...SCHEDULE_KEYS.supervisorLists(), query] as const,
  supervisorActive: (semesterId?: number) =>
    [...SCHEDULE_KEYS.all, "supervisor", "active", semesterId] as const,
  supervisorDetail: (id: number) => [...SCHEDULE_KEYS.all, "supervisor", "detail", id] as const,
};

// ── Student Schedules (SET) ──
export const useStudentSchedules = (query?: unknown) => {
  return useQuery({
    queryKey: SCHEDULE_KEYS.studentList(query),
    queryFn: () => toQuery(scheduleApi.getStudentSchedules(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useActiveStudentSchedule = (semesterId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: SCHEDULE_KEYS.studentActive(semesterId),
    queryFn: () => toQuery(scheduleApi.getActiveStudentSchedule(semesterId)),
    enabled: Boolean(semesterId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateStudentSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (info: IStudentScheduleInsert) => toQuery(scheduleApi.createStudentSchedule(info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.studentLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useUpdateStudentSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IStudentScheduleUpdate }) =>
      toQuery(scheduleApi.updateStudentSchedule(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.studentLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.studentDetail(id) });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useDeleteStudentSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(scheduleApi.deleteStudentSchedule(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.studentLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useRestoreStudentSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(scheduleApi.restoreStudentSchedule(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.studentLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useForceStopStudentSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(scheduleApi.forceStopStudentSchedule(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.studentLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

// ── Supervisor Schedules (SEF) ──
export const useSupervisorSchedules = (query?: unknown) => {
  return useQuery({
    queryKey: SCHEDULE_KEYS.supervisorList(query),
    queryFn: () => toQuery(scheduleApi.getSupervisorSchedules(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useActiveSupervisorSchedule = (semesterId?: number) => {
  return useQuery({
    queryKey: SCHEDULE_KEYS.supervisorActive(semesterId),
    queryFn: () => toQuery(scheduleApi.getActiveSupervisorSchedule(semesterId)),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSupervisorSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (info: ISupervisorScheduleInsert) =>
      toQuery(scheduleApi.createSupervisorSchedule(info)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.supervisorLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useUpdateSupervisorSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: ISupervisorScheduleUpdate }) =>
      toQuery(scheduleApi.updateSupervisorSchedule(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.supervisorLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.supervisorDetail(id) });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useDeleteSupervisorSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(scheduleApi.deleteSupervisorSchedule(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.supervisorLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useRestoreSupervisorSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(scheduleApi.restoreSupervisorSchedule(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.supervisorLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};

export const useForceStopSupervisorSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toQuery(scheduleApi.forceStopSupervisorSchedule(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.supervisorLists() });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.all });
    },
  });
};
